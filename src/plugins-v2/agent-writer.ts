/**
 * Agent Writer
 *
 * Handles writing agent definitions to disk in Claude Code compatible format.
 *
 * Claude Code expects agents as Markdown files with YAML frontmatter in:
 * - Project-local: `.claude/agents/*.md`
 * - Global: `~/.claude/agents/*.md` (Claude Code compatible)
 *
 * Format:
 * ```markdown
 * ---
 * name: agent-name
 * description: Agent description for @mentions
 * tools: Tool1, Tool2, Tool3
 * color: blue
 * ---
 *
 * Agent instructions and persona here...
 * ```
 */

import type { AgentDefinition } from './types'
import { join } from 'pathe'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { CLAUDE_AGENTS_DIR, CCJK_CONFIG_DIR } from '../constants'

// Claude Code compatible location (project-local)
const getProjectAgentsDir = (projectDir?: string) => join(projectDir || process.cwd(), '.claude', 'agents')

// Global agents location - uses ~/.claude/agents for Claude Code compatibility
const GLOBAL_AGENTS_DIR = CLAUDE_AGENTS_DIR

// Legacy CCJK location (for backward compatibility during migration)
const LEGACY_AGENTS_DIR = join(CCJK_CONFIG_DIR, 'agents')

// Available colors for agents in Claude Code
const AGENT_COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'yellow', 'cyan', 'pink'] as const
type AgentColor = typeof AGENT_COLORS[number]

export interface AgentWriteOptions {
  /** Output format: 'markdown' for Claude Code, 'json' for legacy */
  format?: 'markdown' | 'json'
  /** Pretty print JSON (only for json format) */
  pretty?: boolean
  /** Project directory (for project-local agents) */
  projectDir?: string
  /** Write to global location instead of project-local */
  global?: boolean
  /** Agent color for Claude Code UI */
  color?: AgentColor
  /** Tools available to this agent */
  tools?: string[]
}

/**
 * Convert AgentDefinition to Claude Code Markdown format
 */
function agentToMarkdown(agent: AgentDefinition, options?: AgentWriteOptions): string {
  const name = generateAgentId(agent)
  const description = typeof agent.description === 'string'
    ? agent.description
    : (agent.description?.en || agent.description?.['zh-CN'] || '')

  // Determine tools from skills and MCP servers
  const tools: string[] = options?.tools || []
  if (agent.skills?.length) {
    tools.push(...agent.skills.map(s => s.skillId || s.pluginId))
  }
  if (agent.mcpServers?.length) {
    tools.push(...agent.mcpServers.map(m => `mcp__${m.serverName}`))
  }

  // Select a color based on agent capabilities or use provided color
  const color = options?.color || selectAgentColor(agent)

  // Build YAML frontmatter
  const frontmatter = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
  ]

  if (tools.length > 0) {
    frontmatter.push(`tools: ${tools.join(', ')}`)
  }

  frontmatter.push(`color: ${color}`)
  frontmatter.push('---')

  // Build body content
  const body: string[] = []

  // Add persona as main content
  if (agent.persona) {
    body.push('')
    body.push(agent.persona)
  }

  // Add instructions
  if (agent.instructions) {
    body.push('')
    body.push('## Instructions')
    body.push('')
    body.push(agent.instructions)
  }

  // Add capabilities section
  if (agent.capabilities?.length) {
    body.push('')
    body.push('## Capabilities')
    body.push('')
    for (const cap of agent.capabilities) {
      body.push(`- ${formatCapability(cap)}`)
    }
  }

  // Add triggers if present
  if (agent.triggers?.length) {
    body.push('')
    body.push('## Triggers')
    body.push('')
    for (const trigger of agent.triggers) {
      body.push(`- ${trigger}`)
    }
  }

  return frontmatter.join('\n') + body.join('\n') + '\n'
}

/**
 * Select an appropriate color based on agent capabilities
 */
function selectAgentColor(agent: AgentDefinition): AgentColor {
  const caps = agent.capabilities || []

  if (caps.includes('code-generation') || caps.includes('code-review')) return 'blue'
  if (caps.includes('testing')) return 'green'
  if (caps.includes('debugging')) return 'orange'
  if (caps.includes('deployment')) return 'purple'
  if (caps.includes('documentation')) return 'cyan'
  if (caps.includes('git-operations')) return 'yellow'
  if (caps.includes('web-search') || caps.includes('api-integration')) return 'pink'

  // Default color based on hash of agent id
  const hash = agent.id?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 0
  return AGENT_COLORS[hash % AGENT_COLORS.length]
}

/**
 * Format capability for display
 */
function formatCapability(cap: string): string {
  const labels: Record<string, string> = {
    'code-generation': 'Code Generation',
    'code-review': 'Code Review',
    'testing': 'Testing',
    'documentation': 'Documentation',
    'deployment': 'Deployment',
    'debugging': 'Debugging',
    'refactoring': 'Refactoring',
    'git-operations': 'Git Operations',
    'file-management': 'File Management',
    'web-search': 'Web Search',
    'api-integration': 'API Integration',
  }
  return labels[cap] || cap
}

/**
 * Write agent definition to file
 *
 * By default, writes to project-local `.claude/agents/` in Markdown format
 * for Claude Code compatibility.
 */
export async function writeAgentFile(
  agent: AgentDefinition,
  options?: AgentWriteOptions
): Promise<string> {
  const format = options?.format || 'markdown'
  const agentId = generateAgentId(agent)

  // Determine output directory
  const isGlobal = options?.global || false
  const agentsDir = isGlobal
    ? GLOBAL_AGENTS_DIR
    : getProjectAgentsDir(options?.projectDir)

  // Determine file extension based on format
  const ext = format === 'markdown' ? 'md' : 'json'
  const fileName = `${agentId}.${ext}`
  const filePath = join(agentsDir, fileName)

  // Ensure agents directory exists
  if (!existsSync(agentsDir)) {
    mkdirSync(agentsDir, { recursive: true })
  }

  // Convert to appropriate format
  let content: string
  if (format === 'markdown') {
    content = agentToMarkdown(agent, options)
  } else {
    content = JSON.stringify(agent, null, options?.pretty ? 2 : 0)
  }

  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

/**
 * Write multiple agents
 */
export async function writeMultipleAgents(
  agents: AgentDefinition[],
  options?: AgentWriteOptions
): Promise<string[]> {
  const results: string[] = []

  for (const agent of agents) {
    const path = await writeAgentFile(agent, options)
    results.push(path)
  }

  return results
}

/**
 * Update agent file
 */
export async function updateAgentFile(
  agentId: string,
  updates: Partial<AgentDefinition>,
  options?: { projectDir?: string; global?: boolean }
): Promise<boolean> {
  const isGlobal = options?.global || false
  const agentsDir = isGlobal
    ? GLOBAL_AGENTS_DIR
    : getProjectAgentsDir(options?.projectDir)

  // Try markdown first (Claude Code format), then JSON (legacy)
  const mdPath = join(agentsDir, `${agentId}.md`)
  const jsonPath = join(agentsDir, `${agentId}.json`)

  if (existsSync(mdPath)) {
    // For markdown files, we need to parse and rebuild
    try {
      const content = readFileSync(mdPath, 'utf-8')
      const existingAgent = parseMarkdownAgent(content)
      const updatedAgent = { ...existingAgent, ...updates } as AgentDefinition
      await writeAgentFile(updatedAgent, { format: 'markdown', projectDir: options?.projectDir, global: isGlobal })
      return true
    } catch {
      return false
    }
  }

  if (existsSync(jsonPath)) {
    try {
      const existingContent = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const updatedAgent = { ...existingContent, ...updates }
      writeFileSync(jsonPath, JSON.stringify(updatedAgent, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  }

  return false
}

/**
 * Parse a markdown agent file back to AgentDefinition (basic parsing)
 */
function parseMarkdownAgent(content: string): Partial<AgentDefinition> {
  const result: Partial<AgentDefinition> = {}

  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    const lines = frontmatter.split('\n')

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      const value = valueParts.join(':').trim()

      if (key === 'name') {
        result.id = value
        result.name = { en: value, 'zh-CN': value }
      } else if (key === 'description') {
        result.description = { en: value, 'zh-CN': value }
      }
    }
  }

  // Extract body as instructions
  const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  if (bodyMatch) {
    result.persona = bodyMatch[1].trim()
  }

  return result
}

/**
 * Delete agent file
 */
export async function deleteAgentFile(
  agentId: string,
  options?: { projectDir?: string; global?: boolean }
): Promise<boolean> {
  const { unlink } = await import('node:fs/promises')
  const isGlobal = options?.global || false
  const agentsDir = isGlobal
    ? GLOBAL_AGENTS_DIR
    : getProjectAgentsDir(options?.projectDir)

  // Try to delete both formats
  const mdPath = join(agentsDir, `${agentId}.md`)
  const jsonPath = join(agentsDir, `${agentId}.json`)

  let deleted = false

  try {
    if (existsSync(mdPath)) {
      await unlink(mdPath)
      deleted = true
    }
  } catch { /* ignore */ }

  try {
    if (existsSync(jsonPath)) {
      await unlink(jsonPath)
      deleted = true
    }
  } catch { /* ignore */ }

  return deleted
}

/**
 * Generate a valid agent ID from the agent definition
 */
function generateAgentId(agent: AgentDefinition): string {
  // Use agent.id if available, fallback to name extraction
  if (agent.id) {
    return agent.id.toLowerCase().replace(/\s+/g, '-')
  }
  // Fallback: extract from name (handle both string and multilingual object)
  const name = typeof agent.name === 'string'
    ? agent.name
    : (agent.name?.en || agent.name?.['zh-CN'] || 'unknown-agent')
  return name.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Get the project-local agents directory path
 */
export function getAgentsDir(projectDir?: string): string {
  return getProjectAgentsDir(projectDir)
}

/**
 * Get the legacy global agents directory path
 */
export function getLegacyAgentsDir(): string {
  return LEGACY_AGENTS_DIR
}
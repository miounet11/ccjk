/**
 * Agent Creator
 *
 * Creates intelligent agents by combining:
 * - Skills (SKILL.md based knowledge)
 * - MCP Servers (tool capabilities)
 * - Custom instructions
 *
 * Agents can:
 * - Auto-activate based on intent
 * - Execute scripts
 * - Use MCP tools
 * - Follow skill guidelines
 *
 * @module plugins-v2/agents/agent-creator
 */

import type {
  AgentCapability,
  AgentContext,
  AgentDefinition,
  AgentMcpRef,
  AgentSkillRef,
  ConversationMessage,
  LocalizedString,
  McpToolInfo,
  PluginPackage,
} from '../types'
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'pathe'
import { getPluginManager } from '../core/plugin-manager'
import { getMcpServerManager } from '../mcp/mcp-integration'
import { writeAgentFile, getAgentsDir, getLegacyAgentsDir } from '../agent-writer'
import { CLAUDE_AGENTS_DIR, CCJK_CONFIG_DIR } from '../../constants'

// ============================================================================
// Constants
// ============================================================================

// Claude Code compatible location (project-local)
const getProjectAgentsDir = (projectDir?: string) => join(projectDir || process.cwd(), '.claude', 'agents')

// Global agents location - uses ~/.claude/agents for Claude Code compatibility
const GLOBAL_AGENTS_DIR = CLAUDE_AGENTS_DIR
const AGENT_TEMPLATES_DIR = join(CCJK_CONFIG_DIR, 'agent-templates')

// ============================================================================
// Agent Builder
// ============================================================================

/**
 * Fluent builder for creating agents
 */
export class AgentBuilder {
  private definition: Partial<AgentDefinition> = {
    skills: [],
    mcpServers: [],
    capabilities: [],
  }

  /**
   * Set agent ID
   */
  id(id: string): this {
    this.definition.id = id
    return this
  }

  /**
   * Set agent name
   */
  name(name: string | LocalizedString): this {
    this.definition.name = typeof name === 'string'
      ? { 'en': name, 'zh-CN': name }
      : name
    return this
  }

  /**
   * Set agent description
   */
  description(desc: string | LocalizedString): this {
    this.definition.description = typeof desc === 'string'
      ? { 'en': desc, 'zh-CN': desc }
      : desc
    return this
  }

  /**
   * Set agent persona/role
   */
  persona(persona: string): this {
    this.definition.persona = persona
    return this
  }

  /**
   * Set agent instructions
   */
  instructions(instructions: string): this {
    this.definition.instructions = instructions
    return this
  }

  /**
   * Add a skill
   */
  addSkill(pluginId: string, options: Partial<AgentSkillRef> = {}): this {
    this.definition.skills!.push({
      pluginId,
      ...options,
    })
    return this
  }

  /**
   * Add multiple skills
   */
  addSkills(pluginIds: string[]): this {
    for (const id of pluginIds) {
      this.addSkill(id)
    }
    return this
  }

  /**
   * Add an MCP server
   */
  addMcpServer(serverName: string, options: Partial<AgentMcpRef> = {}): this {
    this.definition.mcpServers!.push({
      serverName,
      ...options,
    })
    return this
  }

  /**
   * Add multiple MCP servers
   */
  addMcpServers(serverNames: string[]): this {
    for (const name of serverNames) {
      this.addMcpServer(name)
    }
    return this
  }

  /**
   * Add capability
   */
  addCapability(capability: AgentCapability): this {
    if (!this.definition.capabilities!.includes(capability)) {
      this.definition.capabilities!.push(capability)
    }
    return this
  }

  /**
   * Add multiple capabilities
   */
  addCapabilities(capabilities: AgentCapability[]): this {
    for (const cap of capabilities) {
      this.addCapability(cap)
    }
    return this
  }

  /**
   * Set trigger patterns
   */
  triggers(patterns: string[]): this {
    this.definition.triggers = patterns
    return this
  }

  /**
   * Build the agent definition
   */
  build(): AgentDefinition {
    // Validate required fields
    if (!this.definition.id) {
      throw new Error('Agent ID is required')
    }
    if (!this.definition.name) {
      throw new Error('Agent name is required')
    }
    if (!this.definition.description) {
      throw new Error('Agent description is required')
    }
    if (!this.definition.persona) {
      this.definition.persona = 'You are a helpful AI assistant.'
    }
    if (!this.definition.instructions) {
      this.definition.instructions = ''
    }

    return this.definition as AgentDefinition
  }

  /**
   * Build and save the agent
   */
  async save(): Promise<AgentDefinition> {
    const definition = this.build()
    const manager = await getPluginManager()
    await manager.createAgent(definition)
    return definition
  }
}

// ============================================================================
// Agent Creator Class
// ============================================================================

/**
 * Agent Creator
 *
 * Factory for creating and managing agents
 */
export class AgentCreator {
  /**
   * Create a new agent builder
   */
  create(): AgentBuilder {
    return new AgentBuilder()
  }

  /**
   * Create agent from template
   */
  async fromTemplate(templateId: string, overrides: Partial<AgentDefinition> = {}): Promise<AgentDefinition> {
    const template = await this.loadTemplate(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const definition: AgentDefinition = {
      ...template,
      ...overrides,
      id: overrides.id || `${templateId}-${Date.now()}`,
      skills: [...(template.skills || []), ...(overrides.skills || [])],
      mcpServers: [...(template.mcpServers || []), ...(overrides.mcpServers || [])],
      capabilities: [...new Set([...(template.capabilities || []), ...(overrides.capabilities || [])])],
    }

    const manager = await getPluginManager()
    await manager.createAgent(definition)

    return definition
  }

  /**
   * Create agent from skills only
   */
  async fromSkills(
    id: string,
    name: string,
    skillIds: string[],
    options: {
      description?: string
      persona?: string
      instructions?: string
    } = {},
  ): Promise<AgentDefinition> {
    const builder = this.create()
      .id(id)
      .name(name)
      .description(options.description || `Agent using skills: ${skillIds.join(', ')}`)
      .addSkills(skillIds)

    if (options.persona) {
      builder.persona(options.persona)
    }
    if (options.instructions) {
      builder.instructions(options.instructions)
    }

    return builder.save()
  }

  /**
   * Create agent from MCP servers only
   */
  async fromMcpServers(
    id: string,
    name: string,
    serverNames: string[],
    options: {
      description?: string
      persona?: string
      instructions?: string
    } = {},
  ): Promise<AgentDefinition> {
    const builder = this.create()
      .id(id)
      .name(name)
      .description(options.description || `Agent using MCP servers: ${serverNames.join(', ')}`)
      .addMcpServers(serverNames)

    if (options.persona) {
      builder.persona(options.persona)
    }
    if (options.instructions) {
      builder.instructions(options.instructions)
    }

    return builder.save()
  }

  /**
   * Load a template
   */
  private async loadTemplate(templateId: string): Promise<Partial<AgentDefinition> | null> {
    // Check built-in templates
    const builtIn = BUILT_IN_TEMPLATES[templateId]
    if (builtIn) {
      return builtIn
    }

    // Check user templates
    const templatePath = join(AGENT_TEMPLATES_DIR, `${templateId}.json`)
    if (existsSync(templatePath)) {
      return JSON.parse(readFileSync(templatePath, 'utf-8'))
    }

    return null
  }

  /**
   * Save a template
   */
  async saveTemplate(templateId: string, template: Partial<AgentDefinition>): Promise<void> {
    // Ensure templates directory exists
    if (!existsSync(AGENT_TEMPLATES_DIR)) {
      mkdirSync(AGENT_TEMPLATES_DIR, { recursive: true })
    }
    const templatePath = join(AGENT_TEMPLATES_DIR, `${templateId}.json`)
    writeFileSync(templatePath, JSON.stringify(template, null, 2))
  }

  /**
   * List available templates
   */
  listTemplates(): string[] {
    const templates = Object.keys(BUILT_IN_TEMPLATES)

    if (existsSync(AGENT_TEMPLATES_DIR)) {
      const files = readdirSync(AGENT_TEMPLATES_DIR)
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.md')) {
          templates.push(file.replace(/\.(json|md)$/, ''))
        }
      }
    }

    return templates
  }

  /**
   * Write agent to Claude Code compatible location (project-local .claude/agents/)
   */
  async writeToClaudeCode(
    agent: AgentDefinition,
    options?: { projectDir?: string }
  ): Promise<string> {
    return writeAgentFile(agent, {
      format: 'markdown',
      projectDir: options?.projectDir,
      global: false,
    })
  }
}

// ============================================================================
// Agent Runtime
// ============================================================================

/**
 * Agent Runtime
 *
 * Executes agents with their skills and MCP tools
 */
export class AgentRuntime {
  private context: AgentContext

  constructor(context: AgentContext) {
    this.context = context
  }

  /**
   * Create runtime from agent ID
   */
  static async fromAgentId(agentId: string): Promise<AgentRuntime> {
    const manager = await getPluginManager()
    const agent = manager.getAgent(agentId)

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    // Load skills
    const skills: PluginPackage[] = []
    for (const skillRef of agent.skills) {
      const plugin = manager.getPlugin(skillRef.pluginId)
      if (plugin) {
        skills.push(plugin)
      }
    }

    // Load MCP tools from configured servers
    let mcpTools: McpToolInfo[] = []
    if (agent.mcpServers && agent.mcpServers.length > 0) {
      try {
        const mcpManager = await getMcpServerManager()
        mcpTools = await mcpManager.getToolsForAgent(agent.mcpServers)
      }
      catch (error) {
        // Log error but don't fail - MCP tools are optional
        console.warn('Failed to load MCP tools:', error instanceof Error ? error.message : String(error))
      }
    }

    return new AgentRuntime({
      agent,
      skills,
      mcpTools,
      task: '',
      history: [],
    })
  }

  /**
   * Get the system prompt for this agent
   */
  getSystemPrompt(): string {
    const parts: string[] = []

    // Persona
    parts.push(this.context.agent.persona)
    parts.push('')

    // Instructions
    if (this.context.agent.instructions) {
      parts.push('## Instructions')
      parts.push(this.context.agent.instructions)
      parts.push('')
    }

    // Skills
    if (this.context.skills.length > 0) {
      parts.push('## Available Skills')
      parts.push('')

      for (const skill of this.context.skills) {
        if (skill.skill) {
          parts.push(`### ${skill.skill.title}`)
          parts.push(skill.skill.description)
          parts.push('')

          // Add applicability
          if (skill.skill.applicability.taskTypes.length > 0) {
            parts.push('**When to use:**')
            for (const task of skill.skill.applicability.taskTypes) {
              parts.push(`- ${task}`)
            }
            parts.push('')
          }

          // Add key rules
          if (skill.skill.rules && skill.skill.rules.length > 0) {
            parts.push('**Key Rules:**')
            const criticalRules = skill.skill.rules.filter(r => r.priority === 'critical' || r.priority === 'high')
            for (const rule of criticalRules.slice(0, 5)) {
              parts.push(`- **${rule.id}**: ${rule.title}`)
            }
            parts.push('')
          }
        }
      }
    }

    // MCP Tools
    if (this.context.mcpTools.length > 0) {
      parts.push('## Available MCP Tools')
      parts.push('')

      // Group tools by server
      const byServer = new Map<string, McpToolInfo[]>()
      for (const tool of this.context.mcpTools) {
        const serverTools = byServer.get(tool.server) || []
        serverTools.push(tool)
        byServer.set(tool.server, serverTools)
      }

      for (const [server, serverTools] of byServer) {
        parts.push(`### ${server}`)
        parts.push('')

        for (const tool of serverTools) {
          parts.push(`**${tool.name}**: ${tool.description}`)

          // Add parameter info
          const schema = tool.inputSchema as { properties?: Record<string, { type: string, description?: string }>, required?: string[] }
          if (schema.properties) {
            const params = Object.entries(schema.properties)
            if (params.length > 0) {
              parts.push('Parameters:')
              for (const [name, prop] of params) {
                const required = schema.required?.includes(name) ? ' (required)' : ''
                parts.push(`  - \`${name}\`: ${prop.description || prop.type}${required}`)
              }
            }
          }
          parts.push('')
        }
      }
    }

    // Capabilities
    if (this.context.agent.capabilities.length > 0) {
      parts.push('## Capabilities')
      parts.push('')
      for (const cap of this.context.agent.capabilities) {
        parts.push(`- ${this.formatCapability(cap)}`)
      }
      parts.push('')
    }

    return parts.join('\n')
  }

  /**
   * Get full skill content for context
   */
  getSkillContent(): string {
    const parts: string[] = []

    for (const skill of this.context.skills) {
      if (skill.skill) {
        parts.push(`# ${skill.skill.title}`)
        parts.push('')
        parts.push(skill.skill.rawContent)
        parts.push('')
        parts.push('---')
        parts.push('')
      }
    }

    return parts.join('\n')
  }

  /**
   * Add message to history
   */
  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.context.history = this.context.history || []
    this.context.history.push({
      role,
      content,
      timestamp: Date.now(),
    })
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return this.context.history || []
  }

  /**
   * Set current task
   */
  setTask(task: string): void {
    this.context.task = task
  }

  /**
   * Format capability for display
   */
  private formatCapability(cap: AgentCapability): string {
    const labels: Record<AgentCapability, string> = {
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
}

// ============================================================================
// Built-in Templates
// ============================================================================

const BUILT_IN_TEMPLATES: Record<string, Partial<AgentDefinition>> = {
  'code-assistant': {
    name: { 'en': 'Code Assistant', 'zh-CN': '代码助手' },
    description: { 'en': 'General-purpose coding assistant', 'zh-CN': '通用编程助手' },
    persona: `You are an expert software engineer with deep knowledge of multiple programming languages and frameworks. You write clean, efficient, and well-documented code. You follow best practices and design patterns.`,
    capabilities: ['code-generation', 'code-review', 'debugging', 'refactoring'],
    instructions: `
- Always explain your reasoning before writing code
- Follow the project's existing code style
- Write comprehensive error handling
- Add helpful comments for complex logic
- Suggest tests for new functionality
`,
  },

  'git-master': {
    name: { 'en': 'Git Master', 'zh-CN': 'Git 大师' },
    description: { 'en': 'Expert Git operations assistant', 'zh-CN': 'Git 操作专家' },
    persona: `You are a Git expert who helps with version control operations. You write clear, conventional commit messages and help manage branches effectively.`,
    capabilities: ['git-operations'],
    instructions: `
- Use conventional commit format (feat:, fix:, docs:, etc.)
- Suggest appropriate branch names
- Help resolve merge conflicts
- Explain Git concepts when needed
`,
  },

  'test-engineer': {
    name: { 'en': 'Test Engineer', 'zh-CN': '测试工程师' },
    description: { 'en': 'Testing and quality assurance specialist', 'zh-CN': '测试和质量保证专家' },
    persona: `You are a QA engineer specializing in software testing. You write comprehensive test cases and help ensure code quality.`,
    capabilities: ['testing', 'code-review'],
    instructions: `
- Write tests that cover edge cases
- Use appropriate testing frameworks (Jest, Vitest, etc.)
- Follow AAA pattern (Arrange, Act, Assert)
- Aim for high test coverage
- Include both unit and integration tests
`,
  },

  'devops-engineer': {
    name: { 'en': 'DevOps Engineer', 'zh-CN': 'DevOps 工程师' },
    description: { 'en': 'DevOps and deployment specialist', 'zh-CN': 'DevOps 和部署专家' },
    persona: `You are a DevOps engineer who helps with CI/CD, containerization, and deployment. You write efficient Dockerfiles and deployment configurations.`,
    capabilities: ['deployment', 'file-management'],
    instructions: `
- Write optimized Dockerfiles with multi-stage builds
- Create comprehensive CI/CD pipelines
- Follow security best practices
- Use environment variables for configuration
- Document deployment procedures
`,
  },

  'full-stack': {
    name: { 'en': 'Full Stack Developer', 'zh-CN': '全栈开发者' },
    description: { 'en': 'Full stack development assistant', 'zh-CN': '全栈开发助手' },
    persona: `You are a full-stack developer proficient in both frontend and backend development. You build complete, production-ready applications.`,
    capabilities: ['code-generation', 'code-review', 'testing', 'documentation', 'deployment'],
    instructions: `
- Consider both frontend and backend implications
- Write responsive and accessible UI
- Design RESTful APIs
- Implement proper authentication and authorization
- Optimize for performance
`,
  },
}

// ============================================================================
// Singleton Instances
// ============================================================================

let creatorInstance: AgentCreator | null = null

/**
 * Get the singleton AgentCreator instance
 */
export function getAgentCreator(): AgentCreator {
  if (!creatorInstance) {
    creatorInstance = new AgentCreator()
  }
  return creatorInstance
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a new agent builder
 */
export function createAgent(): AgentBuilder {
  return new AgentBuilder()
}

/**
 * Create agent from template
 */
export async function createAgentFromTemplate(
  templateId: string,
  overrides: Partial<AgentDefinition> = {},
): Promise<AgentDefinition> {
  const creator = getAgentCreator()
  return creator.fromTemplate(templateId, overrides)
}

/**
 * Get agent runtime
 */
export async function getAgentRuntime(agentId: string): Promise<AgentRuntime> {
  return AgentRuntime.fromAgentId(agentId)
}

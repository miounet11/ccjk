/**
 * Smart Generation Writer
 *
 * Writes generated agents and skills to Claude Code compatible format
 */

import type { GeneratedAgent, GeneratedSkill, GenerationResult } from './types'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import consola from 'consola'

const logger = consola.withTag('generation-writer')

// ============================================================================
// Agent Writer
// ============================================================================

/**
 * Write agent to Claude Code compatible Markdown format
 */
export function agentToMarkdown(agent: GeneratedAgent): string {
  const lines: string[] = []

  // Header
  lines.push(`# ${agent.name}`)
  lines.push('')
  lines.push(`**Model**: ${agent.model}`)
  lines.push(`**Version**: 1.0.0`)
  lines.push(`**Specialization**: ${agent.specialization}`)
  lines.push('')

  // Role
  lines.push('## Role')
  lines.push('')
  lines.push(agent.description)
  lines.push('')

  // Core Competencies
  if (agent.competencies && agent.competencies.length > 0) {
    lines.push('## Core Competencies')
    lines.push('')
    for (const comp of agent.competencies) {
      lines.push(`### ${comp.name}`)
      lines.push('')
      lines.push(comp.description)
      lines.push('')
      if (comp.skills && comp.skills.length > 0) {
        lines.push('**Skills:**')
        for (const skill of comp.skills) {
          lines.push(`- ${skill}`)
        }
        lines.push('')
      }
    }
  }

  // Workflow
  if (agent.workflow && agent.workflow.length > 0) {
    lines.push('## Workflow')
    lines.push('')
    for (const step of agent.workflow) {
      lines.push(`### Step ${step.step}: ${step.name}`)
      lines.push('')
      lines.push(step.description)
      lines.push('')
      if (step.inputs && step.inputs.length > 0) {
        lines.push(`**Inputs:** ${step.inputs.join(', ')}`)
      }
      if (step.outputs && step.outputs.length > 0) {
        lines.push(`**Outputs:** ${step.outputs.join(', ')}`)
      }
      lines.push('')
    }
  }

  // Output Format
  if (agent.outputFormat) {
    lines.push('## Output Format')
    lines.push('')
    lines.push(`**Type:** ${agent.outputFormat.type}`)
    lines.push('')
    if (agent.outputFormat.example) {
      lines.push('**Example:**')
      lines.push('```')
      lines.push(agent.outputFormat.example)
      lines.push('```')
      lines.push('')
    }
  }

  // Best Practices
  if (agent.bestPractices && agent.bestPractices.length > 0) {
    lines.push('## Best Practices')
    lines.push('')
    for (const practice of agent.bestPractices) {
      lines.push(`- ${practice}`)
    }
    lines.push('')
  }

  // Quality Standards
  if (agent.qualityStandards && agent.qualityStandards.length > 0) {
    lines.push('## Quality Standards')
    lines.push('')
    for (const standard of agent.qualityStandards) {
      lines.push(`- **${standard.name}**: ${standard.measurement} (threshold: ${standard.threshold})`)
    }
    lines.push('')
  }

  // Integration Points
  if (agent.integrationPoints && agent.integrationPoints.length > 0) {
    lines.push('## Integration Points')
    lines.push('')
    for (const point of agent.integrationPoints) {
      lines.push(`- **${point.agentId}** (${point.type}): ${point.dataFlow}`)
    }
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push(`**Category:** ${agent.category}`)
  lines.push(`**Tags:** ${agent.tags.join(', ')}`)
  lines.push(`**Source:** ${agent.source}`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Write agent file to disk
 */
export async function writeAgentFile(
  agent: GeneratedAgent,
  options: { targetDir?: string, global?: boolean } = {},
): Promise<string> {
  const agentsDir = options.global
    ? join(homedir(), '.claude', 'agents')
    : join(options.targetDir || process.cwd(), '.claude', 'agents')

  // Ensure directory exists
  if (!existsSync(agentsDir)) {
    mkdirSync(agentsDir, { recursive: true })
  }

  const fileName = `${agent.id}.md`
  const filePath = join(agentsDir, fileName)
  const content = agentToMarkdown(agent)

  writeFileSync(filePath, content, 'utf-8')
  logger.success(`Written agent: ${filePath}`)

  return filePath
}

// ============================================================================
// Skill Writer
// ============================================================================

/**
 * Write skill to Claude Code compatible Markdown format
 */
export function skillToMarkdown(skill: GeneratedSkill, lang: 'en' | 'zh-CN' = 'en'): string {
  const lines: string[] = []
  const name = skill.name[lang] || skill.name.en
  const description = skill.description[lang] || skill.description.en

  // Header
  lines.push(`# ${name}`)
  lines.push('')
  lines.push(description)
  lines.push('')

  // Triggers
  if (skill.triggers && skill.triggers.length > 0) {
    lines.push('## Triggers')
    lines.push('')
    for (const trigger of skill.triggers) {
      const desc = trigger.description ? ` - ${trigger.description}` : ''
      lines.push(`- **${trigger.type}**: \`${trigger.value}\`${desc}`)
    }
    lines.push('')
  }

  // Actions
  if (skill.actions && skill.actions.length > 0) {
    lines.push('## Actions')
    lines.push('')
    for (let i = 0; i < skill.actions.length; i++) {
      const action = skill.actions[i]
      lines.push(`### Action ${i + 1}: ${action.type}`)
      lines.push('')
      if (action.description) {
        lines.push(action.description)
        lines.push('')
      }
      if (action.type === 'bash') {
        lines.push('```bash')
        lines.push(action.content)
        lines.push('```')
      }
      else if (action.type === 'prompt') {
        lines.push('```')
        lines.push(action.content)
        lines.push('```')
      }
      else {
        lines.push(action.content)
      }
      lines.push('')
    }
  }

  // Requirements
  if (skill.requirements && skill.requirements.length > 0) {
    lines.push('## Requirements')
    lines.push('')
    for (const req of skill.requirements) {
      const optional = req.optional ? ' (optional)' : ''
      lines.push(`- **${req.type}**: ${req.name}${optional}`)
    }
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push(`**Category:** ${skill.category}`)
  lines.push(`**Priority:** ${skill.priority}`)
  lines.push(`**Tags:** ${skill.tags.join(', ')}`)
  lines.push(`**Source:** ${skill.source}`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Write skill file to disk
 */
export async function writeSkillFile(
  skill: GeneratedSkill,
  options: { targetDir?: string, global?: boolean, lang?: 'en' | 'zh-CN' } = {},
): Promise<string> {
  const skillsDir = options.global
    ? join(homedir(), '.claude', 'skills')
    : join(options.targetDir || process.cwd(), '.claude', 'skills')

  // Ensure directory exists
  if (!existsSync(skillsDir)) {
    mkdirSync(skillsDir, { recursive: true })
  }

  const fileName = `${skill.id}.md`
  const filePath = join(skillsDir, fileName)
  const content = skillToMarkdown(skill, options.lang || 'en')

  writeFileSync(filePath, content, 'utf-8')
  logger.success(`Written skill: ${filePath}`)

  return filePath
}

// ============================================================================
// Batch Writer
// ============================================================================

/**
 * Write all generated agents and skills
 */
export async function writeGenerationResult(
  result: GenerationResult,
  options: { targetDir?: string, global?: boolean, lang?: 'en' | 'zh-CN' } = {},
): Promise<{ agentPaths: string[], skillPaths: string[] }> {
  const agentPaths: string[] = []
  const skillPaths: string[] = []

  logger.info('Writing generated agents and skills...')

  // Write agents
  for (const agent of result.agents) {
    const path = await writeAgentFile(agent, options)
    agentPaths.push(path)
  }

  // Write skills
  for (const skill of result.skills) {
    const path = await writeSkillFile(skill, options)
    skillPaths.push(path)
  }

  logger.success(`Written ${agentPaths.length} agents and ${skillPaths.length} skills`)

  return { agentPaths, skillPaths }
}

// ============================================================================
// Registry Update
// ============================================================================

/**
 * Update agents registry
 */
export async function updateAgentsRegistry(
  agents: GeneratedAgent[],
  options: { global?: boolean } = {},
): Promise<void> {
  const registryPath = options.global
    ? join(homedir(), '.claude', 'agents', 'registry.json')
    : join(process.cwd(), '.claude', 'agents', 'registry.json')

  // Read existing registry
  let registry: Record<string, any> = {}
  if (existsSync(registryPath)) {
    try {
      const content = await import('node:fs').then(fs => fs.readFileSync(registryPath, 'utf-8'))
      registry = JSON.parse(content)
    }
    catch {
      registry = {}
    }
  }

  // Add new agents
  for (const agent of agents) {
    registry[agent.id] = {
      registeredAt: new Date().toISOString(),
      version: '1.0.0',
      category: agent.category,
      model: agent.model,
      source: agent.source,
    }
  }

  // Ensure directory exists
  const registryDir = join(registryPath, '..')
  if (!existsSync(registryDir)) {
    mkdirSync(registryDir, { recursive: true })
  }

  // Write registry
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
  logger.success(`Updated agents registry: ${registryPath}`)
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import type { AgentTemplate, GeneratedConfig, SkillTemplate, TemplateSelection } from '../types'

/**
 * Configuration generator for smart agent/skills generation
 * Generates Claude Code compatible configurations
 */
export class ConfigGenerator {
  private templatesDir: string
  private outputDir: string

  constructor(templatesDir?: string, outputDir?: string) {
    this.templatesDir = templatesDir || join(__dirname, '..', 'templates')
    this.outputDir = outputDir || join(homedir(), '.config', 'claude')
  }

  /**
   * Generate configurations from template selection
   */
  async generate(selection: TemplateSelection): Promise<GeneratedConfig> {
    const agentConfigs = await this.generateAgents(selection.agents)
    const skillConfigs = await this.generateSkills(selection.skills)

    return {
      agents: agentConfigs,
      skills: skillConfigs,
      summary: this.generateSummary(agentConfigs, skillConfigs),
    }
  }

  /**
   * Generate agent configurations
   */
  private async generateAgents(agents: AgentTemplate[]): Promise<Array<{ id: string, path: string, content: string }>> {
    const configs: Array<{ id: string, path: string, content: string }> = []

    for (const agent of agents) {
      const templatePath = join(this.templatesDir, 'agents', agent.file)
      if (!existsSync(templatePath)) {
        console.warn(`Agent template not found: ${agent.file}`)
        continue
      }

      const content = readFileSync(templatePath, 'utf-8')
      const outputPath = join(this.outputDir, 'agents', agent.file)

      configs.push({
        id: agent.id,
        path: outputPath,
        content,
      })
    }

    return configs
  }

  /**
   * Generate skill configurations
   */
  private async generateSkills(skills: SkillTemplate[]): Promise<Array<{ id: string, path: string, content: string }>> {
    const configs: Array<{ id: string, path: string, content: string }> = []

    for (const skill of skills) {
      const templatePath = join(this.templatesDir, 'skills', skill.file)
      if (!existsSync(templatePath)) {
        console.warn(`Skill template not found: ${skill.file}`)
        continue
      }

      const content = readFileSync(templatePath, 'utf-8')
      const outputPath = join(this.outputDir, 'skills', skill.file)

      configs.push({
        id: skill.id,
        path: outputPath,
        content,
      })
    }

    return configs
  }

  /**
   * Write configurations to disk
   */
  async write(config: GeneratedConfig): Promise<void> {
    // Ensure output directories exist
    const agentsDir = join(this.outputDir, 'agents')
    const skillsDir = join(this.outputDir, 'skills')

    if (!existsSync(agentsDir)) {
      mkdirSync(agentsDir, { recursive: true })
    }
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true })
    }

    // Write agent configurations
    for (const agent of config.agents) {
      const dir = join(agent.path, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(agent.path, agent.content, 'utf-8')
    }

    // Write skill configurations
    for (const skill of config.skills) {
      const dir = join(skill.path, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(skill.path, skill.content, 'utf-8')
    }
  }

  /**
   * Generate summary
   */
  private generateSummary(
    agents: Array<{ id: string, path: string }>,
    skills: Array<{ id: string, path: string }>,
  ): string {
    const lines: string[] = []

    lines.push('# Generated Configuration Summary\n')
    lines.push(`Generated at: ${new Date().toISOString()}\n`)

    lines.push('## Agents\n')
    for (const agent of agents) {
      lines.push(`- ${agent.id}: ${agent.path}`)
    }

    lines.push('\n## Skills\n')
    for (const skill of skills) {
      lines.push(`- ${skill.id}: ${skill.path}`)
    }

    lines.push('\n## Usage\n')
    lines.push('1. Agents are automatically loaded by Claude Code')
    lines.push('2. Skills can be triggered using their command triggers')
    lines.push('3. Use `claude` command to start coding with AI assistance')

    return lines.join('\n')
  }
}

/**
 * Generate configurations from template selection
 */
export async function generateConfigs(selection: TemplateSelection): Promise<GeneratedConfig> {
  const generator = new ConfigGenerator()
  return generator.generate(selection)
}

/**
 * Write configurations to disk
 */
export async function writeConfigs(config: GeneratedConfig): Promise<void> {
  const generator = new ConfigGenerator()
  await generator.write(config)
}

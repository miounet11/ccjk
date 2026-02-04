import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import type { AgentTemplate, ProjectAnalysis, SkillTemplate, TemplateSelection } from '../types'

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Template selector for smart agent/skills generation
 * Selects appropriate templates based on project analysis
 */
export class TemplateSelector {
  private templatesDir: string

  constructor(templatesDir?: string) {
    // Navigate from src/generation/selector to templates/
    this.templatesDir = templatesDir || join(__dirname, '..', '..', '..', 'templates')
  }

  /**
   * Select templates based on project analysis
   */
  async select(analysis: ProjectAnalysis): Promise<TemplateSelection> {
    const agents = await this.selectAgents(analysis)
    const skills = await this.selectSkills(analysis)

    return {
      agents,
      skills,
      reasoning: this.generateReasoning(analysis, agents, skills),
    }
  }

  /**
   * Select agent templates
   */
  private async selectAgents(analysis: ProjectAnalysis): Promise<AgentTemplate[]> {
    const selectedAgents: AgentTemplate[] = []
    const agentIndex = this.loadAgentIndex()

    // Always include based on project type
    switch (analysis.projectType) {
      case 'frontend':
        selectedAgents.push(
          ...this.findAgentsByCategory(agentIndex, 'frontend'),
        )
        break

      case 'backend':
        selectedAgents.push(
          ...this.findAgentsByCategory(agentIndex, 'backend'),
        )
        break

      case 'fullstack':
        selectedAgents.push(
          ...this.findAgentsByCategory(agentIndex, 'fullstack'),
        )
        // Also add frontend and backend specialists for fullstack
        selectedAgents.push(
          ...this.findAgentsByCategory(agentIndex, 'frontend').slice(0, 1),
          ...this.findAgentsByCategory(agentIndex, 'backend').slice(0, 1),
        )
        break

      case 'cli':
      case 'library':
        selectedAgents.push(
          ...this.findAgentsByCategory(agentIndex, 'backend'),
        )
        break
    }

    // Add test engineer if tests are present
    if (analysis.hasTests) {
      selectedAgents.push(
        ...this.findAgentsByCategory(agentIndex, 'testing'),
      )
    }

    // Add DevOps engineer if CI/CD is present
    if (analysis.cicd && analysis.cicd.length > 0) {
      selectedAgents.push(
        ...this.findAgentsByCategory(agentIndex, 'devops'),
      )
    }

    // Add security specialist for production projects
    if (analysis.hasApi || analysis.hasDatabase) {
      selectedAgents.push(
        ...this.findAgentsByCategory(agentIndex, 'security'),
      )
    }

    // Remove duplicates and sort by priority
    return this.deduplicateAndSort(selectedAgents)
  }

  /**
   * Select skill templates
   */
  private async selectSkills(analysis: ProjectAnalysis): Promise<SkillTemplate[]> {
    const selectedSkills: SkillTemplate[] = []
    const skillIndex = this.loadSkillIndex()

    // Always include git commit skill
    selectedSkills.push(
      ...this.findSkillsByCategory(skillIndex, 'git'),
    )

    // Always include code review
    selectedSkills.push(
      ...this.findSkillsByCategory(skillIndex, 'code-quality'),
    )

    // Add test generation if tests are present
    if (analysis.hasTests) {
      selectedSkills.push(
        ...this.findSkillsByIds(skillIndex, ['generate-tests']),
      )
    }

    // Add API docs if API endpoints exist
    if (analysis.hasApi) {
      selectedSkills.push(
        ...this.findSkillsByIds(skillIndex, ['api-docs']),
      )
    }

    // Add database migration if database is present
    if (analysis.hasDatabase) {
      selectedSkills.push(
        ...this.findSkillsByIds(skillIndex, ['database-migration']),
      )
    }

    // Add performance optimization for production projects
    if (analysis.projectType === 'frontend' || analysis.projectType === 'fullstack') {
      selectedSkills.push(
        ...this.findSkillsByIds(skillIndex, ['performance-optimization']),
      )
    }

    // Add dependency update for all projects with package.json
    if (analysis.packageJson) {
      selectedSkills.push(
        ...this.findSkillsByIds(skillIndex, ['dependency-update']),
      )
    }

    // Add refactoring for all projects
    selectedSkills.push(
      ...this.findSkillsByIds(skillIndex, ['refactor-code']),
    )

    // Remove duplicates and sort by priority
    return this.deduplicateAndSort(selectedSkills)
  }

  /**
   * Load agent index
   */
  private loadAgentIndex(): { templates: AgentTemplate[] } {
    try {
      const indexPath = join(this.templatesDir, 'agents', 'index.json')
      const content = readFileSync(indexPath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return { templates: [] }
    }
  }

  /**
   * Load skill index
   */
  private loadSkillIndex(): { templates: SkillTemplate[] } {
    try {
      const indexPath = join(this.templatesDir, 'skills', 'index.json')
      const content = readFileSync(indexPath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return { templates: [] }
    }
  }

  /**
   * Find agents by category
   */
  private findAgentsByCategory(index: { templates: AgentTemplate[] }, category: string): AgentTemplate[] {
    return index.templates.filter(agent => agent.category === category)
  }

  /**
   * Find skills by category
   */
  private findSkillsByCategory(index: { templates: SkillTemplate[] }, category: string): SkillTemplate[] {
    return index.templates.filter(skill => skill.category === category)
  }

  /**
   * Find skills by IDs
   */
  private findSkillsByIds(index: { templates: SkillTemplate[] }, ids: string[]): SkillTemplate[] {
    return index.templates.filter(skill => ids.includes(skill.id))
  }

  /**
   * Deduplicate and sort templates by priority
   */
  private deduplicateAndSort<T extends { id: string, priority: number }>(templates: T[]): T[] {
    const seen = new Set<string>()
    const unique: T[] = []

    for (const template of templates) {
      if (!seen.has(template.id)) {
        seen.add(template.id)
        unique.push(template)
      }
    }

    return unique.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Generate reasoning for template selection
   */
  private generateReasoning(
    analysis: ProjectAnalysis,
    agents: AgentTemplate[],
    skills: SkillTemplate[],
  ): string {
    const reasons: string[] = []

    // Project type reasoning
    reasons.push(`Detected ${analysis.projectType} project`)

    // Framework reasoning
    if (analysis.frameworks.length > 0) {
      reasons.push(`Using frameworks: ${analysis.frameworks.join(', ')}`)
    }

    // Tech stack reasoning
    reasons.push(`Tech stack: ${analysis.techStack.languages.join(', ')} on ${analysis.techStack.runtime}`)

    // Testing reasoning
    if (analysis.hasTests) {
      reasons.push('Tests detected - including test engineer and test generation')
    }

    // Database reasoning
    if (analysis.hasDatabase) {
      reasons.push('Database detected - including migration skills')
    }

    // API reasoning
    if (analysis.hasApi) {
      reasons.push('API endpoints detected - including API documentation')
    }

    // CI/CD reasoning
    if (analysis.cicd && analysis.cicd.length > 0) {
      reasons.push(`CI/CD detected (${analysis.cicd.join(', ')}) - including DevOps engineer`)
    }

    // Summary
    reasons.push(`\nSelected ${agents.length} agents and ${skills.length} skills`)

    return reasons.join('\n')
  }
}

/**
 * Select templates based on project analysis
 */
export async function selectTemplates(analysis: ProjectAnalysis): Promise<TemplateSelection> {
  const selector = new TemplateSelector()
  return selector.select(analysis)
}

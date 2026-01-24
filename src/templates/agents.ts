/**
 * Agent Template Loader
 *
 * Loads and manages agent templates from templates/agents directory
 */

import { join } from 'pathe'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const AGENT_TEMPLATES_DIR = join(process.cwd(), 'templates', 'agents')

/**
 * Agent recommendation structure (simplified from templates)
 */
export interface AgentRecommendation {
  name: string
  description: string
  skills: string[]
  mcpServers: string[]
  persona?: string
  capabilities: string[]
  confidence: number
  reason: string
}

/**
 * Load all agent templates
 */
export async function loadAgentTemplates(): Promise<AgentRecommendation[]> {
  if (!existsSync(AGENT_TEMPLATES_DIR)) {
    console.warn('Agent templates directory not found:', AGENT_TEMPLATES_DIR)
    return []
  }

  const templates: AgentRecommendation[] = []
  const files = readdirSync(AGENT_TEMPLATES_DIR)

  for (const file of files) {
    if (!file.endsWith('.json')) continue

    try {
      const filePath = join(AGENT_TEMPLATES_DIR, file)
      const content = readFileSync(filePath, 'utf-8')
      const template = JSON.parse(content)

      // Convert template to recommendation format
      const recommendation: AgentRecommendation = {
        name: template.name?.en || template.id || file.replace('.json', ''),
        description: template.description?.en || 'No description available',
        skills: template.skills || [],
        mcpServers: template.mcpServers || [],
        persona: template.persona,
        capabilities: template.capabilities || [],
        confidence: 0.8, // Default confidence
        reason: `Matches project type and includes relevant skills: ${(template.skills || []).join(', ')}`
      }

      templates.push(recommendation)
    } catch (error) {
      console.warn(`Failed to load agent template ${file}:`, error)
    }
  }

  return templates
}

/**
 * Load specific agent template
 */
export async function loadAgentTemplate(templateId: string): Promise<AgentRecommendation | null> {
  const filePath = join(AGENT_TEMPLATES_DIR, `${templateId}.json`)

  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const template = JSON.parse(content)

    return {
      name: template.name?.en || template.id || templateId,
      description: template.description?.en || 'No description available',
      skills: template.skills || [],
      mcpServers: template.mcpServers || [],
      persona: template.persona,
      capabilities: template.capabilities || [],
      confidence: 0.9,
      reason: 'Template loaded successfully'
    }
  } catch (error) {
    console.warn(`Failed to load agent template ${templateId}:`, error)
    return null
  }
}

/**
 * Search agent templates
 */
export async function searchAgentTemplates(query: string): Promise<AgentRecommendation[]> {
  const templates = await loadAgentTemplates()
  const lowercaseQuery = query.toLowerCase()

  return templates.filter(template => {
    return (
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.skills.some(skill => skill.toLowerCase().includes(lowercaseQuery)) ||
      template.capabilities.some(cap => cap.toLowerCase().includes(lowercaseQuery))
    )
  })
}

/**
 * Filter agent templates by tags/skills
 */
export async function filterAgentTemplatesByTags(tags: string[]): Promise<AgentRecommendation[]> {
  const templates = await loadAgentTemplates()

  return templates.filter(template => {
    return tags.some(tag => {
      return (
        template.skills.includes(tag) ||
        template.capabilities.includes(tag) ||
        template.name.toLowerCase().includes(tag.toLowerCase())
      )
    })
  })
}
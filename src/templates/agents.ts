/**
 * Agent Template Loader
 *
 * Loads and manages agent templates from templates/agents directory
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'

// Get the directory of this module to locate templates in npm package
const _dirname = dirname(fileURLToPath(import.meta.url))
// dist/chunks/ -> dist/templates/agents  (production)
const AGENT_TEMPLATES_DIR = join(_dirname, '..', 'templates', 'agents')
// src/templates/ -> templates/agents  (development)
const AGENT_TEMPLATES_DIR_DEV = join(_dirname, '..', '..', 'templates', 'agents')

/**
 * Get the effective agent templates directory
 */
function getAgentTemplatesDir(): string {
  if (existsSync(AGENT_TEMPLATES_DIR)) {
    return AGENT_TEMPLATES_DIR
  }
  if (existsSync(AGENT_TEMPLATES_DIR_DEV)) {
    return AGENT_TEMPLATES_DIR_DEV
  }
  // Last resort: project cwd (silently)
  return join(process.cwd(), 'templates', 'agents')
}

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
  tags?: string[]
  confidence: number
  reason: string
}

/**
 * Load all agent templates
 */
export async function loadAgentTemplates(): Promise<AgentRecommendation[]> {
  const templatesDir = getAgentTemplatesDir()

  if (!existsSync(templatesDir)) {
    return []
  }

  const templates: AgentRecommendation[] = []
  const files = readdirSync(templatesDir)

  for (const file of files) {
    if (!file.endsWith('.json'))
      continue

    try {
      const filePath = join(templatesDir, file)
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
        tags: template.metadata?.tags || [],
        confidence: 0.8,
        reason: `Matches project type and includes relevant skills: ${(template.skills || []).join(', ')}`,
      }

      templates.push(recommendation)
    }
    catch (error) {
      console.warn(`Failed to load agent template ${file}:`, error)
    }
  }

  return templates
}

/**
 * Load specific agent template
 */
export async function loadAgentTemplate(templateId: string): Promise<AgentRecommendation | null> {
  const templatesDir = getAgentTemplatesDir()
  const filePath = join(templatesDir, `${templateId}.json`)

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
      reason: 'Template loaded successfully',
    }
  }
  catch (error) {
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

  return templates.filter((template) => {
    return (
      template.name.toLowerCase().includes(lowercaseQuery)
      || template.description.toLowerCase().includes(lowercaseQuery)
      || template.skills.some(skill => skill.toLowerCase().includes(lowercaseQuery))
      || template.capabilities.some(cap => cap.toLowerCase().includes(lowercaseQuery))
    )
  })
}

/**
 * Filter agent templates by tags/skills
 */
export async function filterAgentTemplatesByTags(tags: string[]): Promise<AgentRecommendation[]> {
  const templates = await loadAgentTemplates()

  return templates.filter((template) => {
    return tags.some((tag) => {
      return (
        template.skills.includes(tag)
        || template.capabilities.includes(tag)
        || template.name.toLowerCase().includes(tag.toLowerCase())
      )
    })
  })
}

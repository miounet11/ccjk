import type { SupportedLang } from '../constants'

/**
 * Subagent group category
 */
export type GroupCategory = 'language' | 'site-type' | 'seo' | 'devops' | 'testing' | 'custom'

/**
 * Agent definition within a group
 */
export interface AgentDefinition {
  /** Agent unique ID */
  id: string
  /** Agent name */
  name: string
  /** Agent description */
  description: string
  /** Model to use */
  model: 'opus' | 'sonnet' | 'haiku' | 'inherit'
  /** Agent definition file content (markdown with YAML frontmatter) */
  definition: string
  /** Whether agent is required in the group */
  required: boolean
  /** Agent specialization tags */
  tags?: string[]
}

/**
 * Subagent group definition
 */
export interface SubagentGroup {
  /** Group unique ID */
  id: string
  /** Localized group name */
  name: Record<SupportedLang, string>
  /** Localized group description */
  description: Record<SupportedLang, string>
  /** Group category */
  category: GroupCategory
  /** Agents in this group */
  agents: AgentDefinition[]
  /** Associated skill IDs */
  skills: string[]
  /** Whether group is enabled by default */
  defaultEnabled: boolean
  /** Group version */
  version: string
  /** Group author */
  author?: string
  /** Group icon (emoji or unicode) */
  icon?: string
}

/**
 * Predefined language-specific groups
 */
export type LanguageGroupId
  = | 'typescript-dev'
    | 'python-dev'
    | 'rust-dev'
    | 'go-dev'
    | 'java-dev'
    | 'ruby-dev'

/**
 * Predefined site-type groups
 */
export type SiteTypeGroupId
  = | 'ecommerce'
    | 'saas'
    | 'blog-cms'
    | 'api-service'
    | 'dashboard'
    | 'mobile-app'

/**
 * Predefined specialty groups
 */
export type SpecialtyGroupId
  = | 'seo-team'
    | 'security-team'
    | 'performance-team'
    | 'testing-team'
    | 'devops-team'

/**
 * All predefined group IDs
 */
export type PredefinedGroupId = LanguageGroupId | SiteTypeGroupId | SpecialtyGroupId

/**
 * Group installation result
 */
export interface GroupInstallResult {
  groupId: string
  success: boolean
  installedAgents: string[]
  installedSkills: string[]
  errors?: string[]
}

/**
 * Group registry state
 */
export interface GroupRegistry {
  groups: Map<string, SubagentGroup>
  enabledGroups: Set<string>
  lastUpdated: Date
}

/**
 * Group search options
 */
export interface GroupSearchOptions {
  query?: string
  category?: GroupCategory
  enabled?: boolean
  limit?: number
}

/**
 * Group export format
 */
export interface GroupExport {
  version: string
  exportedAt: string
  groups: SubagentGroup[]
}

/**
 * Agent template for creating new agents in a group
 */
export interface AgentTemplate {
  category: GroupCategory
  name: string
  modelDefault: 'opus' | 'sonnet' | 'haiku'
  responsibilities: string[]
  allowedActions: string[]
  forbiddenActions: string[]
  technologies: string[]
}

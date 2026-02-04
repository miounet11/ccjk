import type { SupportedLang } from '../constants'

/**
 * Skill category types
 */
export type SkillCategory = 'git' | 'dev' | 'seo' | 'devops' | 'testing' | 'docs' | 'review' | 'debug' | 'planning' | 'custom'

/**
 * Skill definition interface
 */
export interface CcjkSkill {
  /** Unique skill identifier */
  id: string
  /** Localized skill name */
  name: Record<SupportedLang, string>
  /** Localized skill description */
  description: Record<SupportedLang, string>
  /** Skill category */
  category: SkillCategory
  /** Command triggers (e.g., /ts-debug, /py-test) */
  triggers: string[]
  /** Skill template content (markdown) */
  template: string
  /** Associated agent IDs */
  agents?: string[]
  /** Whether skill is enabled */
  enabled: boolean
  /** Skill version */
  version: string
  /** Author information */
  author?: string
  /** Tags for search/filtering */
  tags?: string[]
}

/**
 * Batch skill creation options
 */
export interface BatchSkillOptions {
  /** Language-specific skills */
  lang?: 'typescript' | 'python' | 'rust' | 'go' | 'java' | 'ruby'
  /** Site-type specific skills */
  site?: 'ecommerce' | 'saas' | 'blog' | 'api' | 'dashboard'
  /** SEO skills */
  seo?: boolean
  /** DevOps skills */
  devops?: boolean
  /** Custom category */
  customCategory?: string
  /** Output directory */
  outputDir?: string
}

/**
 * Batch skill template definition
 */
export interface BatchSkillTemplate {
  category: SkillCategory
  skills: Array<{
    id: string
    name: Record<SupportedLang, string>
    description: Record<SupportedLang, string>
    triggers: string[]
    templateFile: string
    agents?: string[]
    tags?: string[]
  }>
}

/**
 * Skill installation result
 */
export interface SkillInstallResult {
  skillId: string
  success: boolean
  path?: string
  error?: string
}

/**
 * Skill registry state
 */
export interface SkillRegistry {
  skills: Map<string, CcjkSkill>
  categories: Map<SkillCategory, string[]>
  lastUpdated: Date
}

/**
 * Skill search options
 */
export interface SkillSearchOptions {
  query?: string
  category?: SkillCategory
  tags?: string[]
  enabled?: boolean
  limit?: number
}

/**
 * Skill export format
 */
export interface SkillExport {
  version: string
  exportedAt: string
  skills: CcjkSkill[]
}

/**
 * Smart Generation System Types
 *
 * Type definitions for intelligent Agent/Skills generation based on project analysis
 */

import type { ProjectAnalysis as AnalyzerProjectAnalysis } from '../analyzers/types'
import type { SupportedLang } from '../constants'

// Re-export for convenience
export type { SupportedLang }

/**
 * Project type classification
 */
export type ProjectType
  = | 'web-frontend'
    | 'web-backend'
    | 'fullstack'
    | 'cli'
    | 'library'
    | 'mobile'
    | 'desktop'
    | 'api'
    | 'microservice'
    | 'monorepo'
    | 'frontend'
    | 'backend'
    | 'unknown'

/**
 * Technology stack information
 */
export interface TechStack {
  /** Primary programming languages */
  languages: string[]
  /** Runtime environment */
  runtime: string
  /** Package manager */
  packageManager?: string
}

/**
 * Project analysis result for generation
 */
export interface ProjectAnalysis {
  /** Project root directory */
  projectRoot: string
  /** Detected project type */
  projectType: ProjectType
  /** Technology stack */
  techStack: TechStack
  /** Detected frameworks */
  frameworks: string[]
  /** Build tool */
  buildTool?: string
  /** Has test setup */
  hasTests: boolean
  /** Has database */
  hasDatabase: boolean
  /** Has API */
  hasApi: boolean
  /** CI/CD systems */
  cicd: string[]
  /** Detected patterns */
  patterns: string[]
  /** Analysis confidence (0-1) */
  confidence: number
  /** Package.json content (if available) */
  packageJson?: Record<string, unknown>
}

/**
 * Re-export analyzer's ProjectAnalysis as a separate type
 */
export type { AnalyzerProjectAnalysis }

// ============================================================================
// Template Selection Types
// ============================================================================

/**
 * Template selection result
 */
export interface TemplateSelection {
  /** Selected agent templates */
  agents: AgentTemplate[]
  /** Selected skill templates */
  skills: SkillTemplate[]
  /** Selection reasoning */
  reasoning: string
}

/**
 * Skill template definition
 */
export interface SkillTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description: string
  /** Skill category */
  category: SkillCategory
  /** Template file name */
  file: string
  /** Applicable project types */
  projectTypes: string[]
  /** Applicable frameworks */
  frameworks: string[]
  /** Priority for selection */
  priority: number
}

/**
 * Generated configuration result
 */
export interface GeneratedConfig {
  /** Generated agent configurations */
  agents: Array<{ id: string, path: string, content: string }>
  /** Generated skill configurations */
  skills: Array<{ id: string, path: string, content: string }>
  /** Generation summary */
  summary: string
}

// ============================================================================
// Agent Generation Types
// ============================================================================

/**
 * Generated Agent definition compatible with Claude Code
 */
export interface GeneratedAgent {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Agent description */
  description: string
  /** Model to use (opus, sonnet, haiku) */
  model: 'opus' | 'sonnet' | 'haiku'
  /** Agent specialization area */
  specialization: string
  /** Core competencies */
  competencies: AgentCompetency[]
  /** Workflow steps */
  workflow: WorkflowStep[]
  /** Output format specification */
  outputFormat?: OutputFormat
  /** Best practices */
  bestPractices: string[]
  /** Integration points with other agents */
  integrationPoints?: IntegrationPoint[]
  /** Quality standards */
  qualityStandards?: QualityStandard[]
  /** Category for grouping */
  category: string
  /** Priority (1-10, higher = more important) */
  priority: number
  /** Tags for filtering */
  tags: string[]
  /** Source of generation */
  source: 'smart-analysis' | 'template' | 'custom'
}

export interface AgentCompetency {
  /** Competency name */
  name: string
  /** Detailed description */
  description: string
  /** Sub-skills */
  skills: string[]
}

export interface WorkflowStep {
  /** Step number */
  step: number
  /** Step name */
  name: string
  /** Step description */
  description: string
  /** Expected inputs */
  inputs?: string[]
  /** Expected outputs */
  outputs?: string[]
}

export interface OutputFormat {
  /** Format type (json, markdown, code, etc.) */
  type: 'json' | 'markdown' | 'code' | 'mixed'
  /** Schema or template */
  schema?: Record<string, unknown>
  /** Example output */
  example?: string
}

export interface IntegrationPoint {
  /** Target agent ID */
  agentId: string
  /** Type of integration */
  type: 'input' | 'output' | 'collaboration'
  /** Data exchanged */
  dataFlow: string
}

export interface QualityStandard {
  /** Standard name */
  name: string
  /** Minimum threshold */
  threshold: number
  /** Measurement method */
  measurement: string
}

// ============================================================================
// Skill Generation Types
// ============================================================================

/**
 * Generated Skill definition
 */
export interface GeneratedSkill {
  /** Unique identifier */
  id: string
  /** Display name */
  name: Record<SupportedLang, string>
  /** Skill description */
  description: Record<SupportedLang, string>
  /** Skill category */
  category: SkillCategory
  /** Trigger patterns */
  triggers: SkillTrigger[]
  /** Skill actions */
  actions: SkillAction[]
  /** Required tools/MCP servers */
  requirements?: SkillRequirement[]
  /** Priority (1-10) */
  priority: number
  /** Tags for filtering */
  tags: string[]
  /** Source of generation */
  source: 'smart-analysis' | 'template' | 'custom'
}

export type SkillCategory
  = | 'development'
    | 'testing'
    | 'deployment'
    | 'documentation'
    | 'debugging'
    | 'refactoring'
    | 'security'
    | 'performance'
    | 'git'
    | 'custom'

export interface SkillTrigger {
  /** Trigger type */
  type: 'command' | 'pattern' | 'event' | 'auto'
  /** Trigger value (command name, regex pattern, event name) */
  value: string
  /** Trigger description */
  description?: string
}

export interface SkillAction {
  /** Action type */
  type: 'bash' | 'tool' | 'prompt' | 'workflow'
  /** Action content */
  content: string
  /** Action description */
  description?: string
  /** Conditions for execution */
  conditions?: ActionCondition[]
}

export interface ActionCondition {
  /** Condition type */
  type: 'file-exists' | 'env-var' | 'project-type' | 'custom'
  /** Condition value */
  value: string
  /** Negate condition */
  negate?: boolean
}

export interface SkillRequirement {
  /** Requirement type */
  type: 'tool' | 'mcp' | 'env' | 'file'
  /** Requirement name */
  name: string
  /** Whether optional */
  optional?: boolean
}

// ============================================================================
// Generation Context Types
// ============================================================================

/**
 * Context for smart generation
 * Uses the analyzer's ProjectAnalysis type for compatibility with analyzeProject()
 */
export interface GenerationContext {
  /** Project analysis results from the analyzer */
  analysis: AnalyzerProjectAnalysis
  /** User preferences */
  preferences: GenerationPreferences
  /** Existing agents (to avoid duplicates) */
  existingAgents: string[]
  /** Existing skills (to avoid duplicates) */
  existingSkills: string[]
  /** Target directory */
  targetDir: string
}

export interface GenerationPreferences {
  /** Preferred language */
  language: SupportedLang
  /** Preferred model for agents */
  defaultModel: 'opus' | 'sonnet' | 'haiku'
  /** Include testing agents */
  includeTesting: boolean
  /** Include deployment agents */
  includeDeployment: boolean
  /** Include documentation agents */
  includeDocumentation: boolean
  /** Include security agents */
  includeSecurity: boolean
  /** Include performance agents */
  includePerformance: boolean
  /** Custom agent categories to include */
  customCategories?: string[]
  /** Maximum number of agents to generate */
  maxAgents?: number
  /** Maximum number of skills to generate */
  maxSkills?: number
}

// ============================================================================
// Generation Result Types
// ============================================================================

/**
 * Result of smart generation
 */
export interface GenerationResult {
  /** Generated agents */
  agents: GeneratedAgent[]
  /** Generated skills */
  skills: GeneratedSkill[]
  /** Generation metadata */
  metadata: GenerationMetadata
  /** Validation results */
  validation: ValidationResult
  /** Recommendations for manual review */
  recommendations: GenerationRecommendation[]
}

export interface GenerationMetadata {
  /** Generation timestamp */
  timestamp: Date
  /** Generation duration in ms */
  duration: number
  /** Project type detected */
  projectType: string
  /** Frameworks detected */
  frameworks: string[]
  /** Languages detected */
  languages: string[]
  /** Generation version */
  version: string
}

export interface ValidationResult {
  /** Overall validation status */
  valid: boolean
  /** Validation errors */
  errors: ValidationError[]
  /** Validation warnings */
  warnings: ValidationWarning[]
  /** Validation score (0-100) */
  score: number
}

export interface ValidationError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Affected item (agent/skill ID) */
  item?: string
  /** Suggested fix */
  fix?: string
}

export interface ValidationWarning {
  /** Warning code */
  code: string
  /** Warning message */
  message: string
  /** Affected item */
  item?: string
  /** Suggestion */
  suggestion?: string
}

export interface GenerationRecommendation {
  /** Recommendation type */
  type: 'add' | 'modify' | 'remove' | 'review'
  /** Target (agent/skill ID) */
  target: string
  /** Recommendation description */
  description: string
  /** Priority (1-10) */
  priority: number
  /** Reason for recommendation */
  reason: string
}

// ============================================================================
// Agent Template Types
// ============================================================================

/**
 * Agent template for different project types
 */
export interface AgentTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description?: string
  /** Agent category */
  category: string
  /** Template file name */
  file: string
  /** Applicable project types */
  projectTypes: string[]
  /** Applicable frameworks */
  frameworks: string[]
  /** Applicable languages */
  languages: string[]
  /** Agent definition template */
  template?: Partial<GeneratedAgent>
  /** Variables to replace */
  variables?: TemplateVariable[]
  /** Priority for selection */
  priority: number
}

export interface TemplateVariable {
  /** Variable name */
  name: string
  /** Variable description */
  description: string
  /** Default value */
  defaultValue: string
  /** Value resolver function name */
  resolver?: string
}

// ============================================================================
// Generation Options
// ============================================================================

export interface SmartGenerationOptions {
  /** Target directory */
  targetDir?: string
  /** Language preference */
  lang?: SupportedLang
  /** Dry run mode */
  dryRun?: boolean
  /** JSON output */
  json?: boolean
  /** Force overwrite existing */
  force?: boolean
  /** Interactive mode */
  interactive?: boolean
  /** Categories to include */
  categories?: string[]
  /** Categories to exclude */
  excludeCategories?: string[]
  /** Maximum agents */
  maxAgents?: number
  /** Maximum skills */
  maxSkills?: number
  /** Default model */
  defaultModel?: 'opus' | 'sonnet' | 'haiku'
  /** Output directory for agents */
  agentsDir?: string
  /** Output directory for skills */
  skillsDir?: string
  /** Validation level */
  validationLevel?: 'strict' | 'normal' | 'relaxed'
}

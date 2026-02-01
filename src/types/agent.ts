/**
 * Agent type definitions for multi-agent orchestration system
 */

export type AgentModel = 'opus' | 'sonnet' | 'haiku' | 'inherit'

/** Alias for backward compatibility */
export type OrchestratorAgentModel = AgentModel

/** Alias for backward compatibility */
export type OrchestratorAgentCapability = AgentCapability

export interface AgentCapability {
  /** Unique agent identifier */
  id: string

  /** Display name */
  name: string

  /** Model to use for this agent */
  model: AgentModel

  /** Primary specialties */
  specialties: string[]

  /** Capability strength (0-1) */
  strength: number

  /** Cost factor relative to baseline */
  costFactor: number
}

export interface Task {
  /** Task identifier */
  id: string

  /** Task description */
  description: string

  /** Required capabilities */
  requiredCapabilities: string[]

  /** Task complexity (1-10) */
  complexity: number

  /** Priority (1-10) */
  priority: number

  /** Estimated token count */
  estimatedTokens?: number
}

export interface AgentAssignment {
  /** Agent assigned */
  agent: AgentCapability

  /** Tasks assigned */
  tasks: Task[]

  /** Execution order */
  order: number

  /** Dependencies on other assignments */
  dependencies: string[]
}

export interface OrchestrationResult {
  /** Agent assignments */
  assignments: AgentAssignment[]

  /** Total estimated cost */
  totalCost: number

  /** Estimated execution time (ms) */
  estimatedTime: number

  /** Conflict resolution applied */
  conflictsResolved: string[]

  /** Optimization suggestions */
  suggestions: string[]
}

export interface OrchestrationOptions {
  /** Maximum number of agents to use */
  maxAgents?: number

  /** Cost limit (0 = no limit) */
  costLimit?: number

  /** Time limit in ms (0 = no limit) */
  timeLimit?: number

  /** Allow parallel execution */
  allowParallel?: boolean

  /** Enable conflict resolution */
  enableConflictResolution?: boolean
}

// ============================================================================
// Orchestrator Message Types
// ============================================================================

/** Message type for agent communication */
export type OrchestratorMessageType = 'request' | 'response' | 'notification' | 'broadcast' | 'error'

/** Message for inter-agent communication */
export interface OrchestratorMessage {
  from: string
  to: string
  type: OrchestratorMessageType
  payload: unknown
  timestamp: number
}

/** Task complexity level */
export type TaskComplexity = 'simple' | 'medium' | 'complex'

/** Task for orchestration */
export interface OrchestratorTask {
  id: string
  description: string
  complexity: TaskComplexity
  requiredSpecialties: string[]
  priority?: number
  deadline?: number
  metadata?: Record<string, unknown>
}

/** Orchestration metrics */
export interface OrchestrationMetrics {
  totalTime: number
  agentsUsed: number
  tasksCompleted: number
  tasksFailed: number
  averageTaskTime: number
  costEstimate: number
}

// ============================================================================
// Cloud Agent Types
// ============================================================================

/** Localized string for multi-language support */
export interface LocalizedString {
  en: string
  'zh-CN'?: string
}

/** Agent template variable option */
export interface AgentVariableOption {
  value: string
  label: LocalizedString
}

/** Agent template variable definition */
export interface AgentVariable {
  name: string
  label: LocalizedString
  description: LocalizedString
  type: 'text' | 'select' | 'number' | 'boolean'
  required: boolean
  default?: string | number | boolean
  options?: AgentVariableOption[]
}

/** Agent definition containing role and behavior */
export interface AgentDefinition {
  role: string
  systemPrompt: string
  capabilities: string[]
  tools: string[]
  constraints?: string[]
  temperature?: number
  maxTokens?: number
}

/** Agent metadata */
export interface AgentMetadata {
  description?: LocalizedString | string
  author?: string
  license?: string
  homepage?: string
  repository?: string
  keywords?: string[]
  createdAt?: string
  updatedAt?: string
}

/** Cloud agent template */
export interface AgentTemplate {
  id: string
  name: string
  category: string
  description: LocalizedString
  definition: AgentDefinition
  variables?: AgentVariable[]
  tags?: string[]
  author?: string
  version: string
  metadata?: AgentMetadata
}

/** Cloud agent (full agent with cloud metadata) */
export interface CloudAgent {
  id: string
  name: string
  version: string
  category?: string
  description?: LocalizedString | string
  definition: AgentDefinition
  variables?: AgentVariable[]
  tags?: string[]
  metadata?: AgentMetadata
  cloudId?: string
  publishedAt?: string
  downloads?: number
  rating?: number
}

/** Installed agent record */
export interface InstalledAgent {
  id: string
  name: string
  version: string
  cloudId?: string
  installedAt: string
  updatedAt?: string
  filePath: string
  source: 'cloud' | 'local' | 'template'
  autoUpdate?: boolean
}

// ============================================================================
// Agent Search & Install Types
// ============================================================================

/** Agent search options */
export interface AgentSearchOptions {
  query?: string
  category?: string
  tags?: string[]
  author?: string
  limit?: number
  offset?: number
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name'
  sortOrder?: 'asc' | 'desc'
}

/** Agent search result */
export interface AgentSearchResult {
  agents: CloudAgent[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/** Agent install options */
export interface AgentInstallOptions {
  force?: boolean
  autoUpdate?: boolean
  variables?: Record<string, string | number | boolean>
}

/** Agent install result */
export interface AgentInstallResult {
  success: boolean
  agent?: InstalledAgent
  error?: string
  warnings?: string[]
}

// ============================================================================
// Agent Sync Types
// ============================================================================

/** Agent sync options */
export interface AgentSyncOptions {
  direction?: 'push' | 'pull' | 'both'
  force?: boolean
  dryRun?: boolean
  includeLocal?: boolean
}

/** Agent sync result */
export interface AgentSyncResult {
  success: boolean
  pushed: string[]
  pulled: string[]
  conflicts: string[]
  errors: string[]
}

// ============================================================================
// Agent Validation Types
// ============================================================================

/** Validation error/warning item */
export interface AgentValidationItem {
  field: string
  message: string
  code: string
}

/** Agent validation result */
export interface AgentValidationResult {
  valid: boolean
  errors: AgentValidationItem[]
  warnings: AgentValidationItem[]
}

// ============================================================================
// Agent Update Types
// ============================================================================

/** Agent update info */
export interface AgentUpdateInfo {
  agentId: string
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  changelog?: string
  publishedAt?: string
}

// ============================================================================
// Agent Statistics Types
// ============================================================================

/** Agent statistics */
export interface AgentStatistics {
  totalDownloads: number
  weeklyDownloads: number
  monthlyDownloads: number
  averageRating: number
  totalRatings: number
  lastUpdated: string
}

/** Agent rating */
export interface AgentRating {
  agentId: string
  userId: string
  rating: number
  review?: string
  createdAt: string
}

// ============================================================================
// Agent Export/Import Types
// ============================================================================

/** Agent export options */
export interface AgentExportOptions {
  format?: 'json' | 'yaml' | 'markdown'
  includeMetadata?: boolean
  outputPath?: string
}

/** Agent import options */
export interface AgentImportOptions {
  force?: boolean
  validate?: boolean
  autoInstall?: boolean
}

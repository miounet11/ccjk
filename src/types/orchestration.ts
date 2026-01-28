/**
 * Orchestration Context Manager Types
 * Enhanced context compression and management for multi-agent orchestration
 */

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * Message content types
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  tokens?: number
  metadata?: Record<string, unknown>
}

/**
 * Code snippet extracted from context
 */
export interface CodeSnippet {
  file: string
  lines: string
  context: string
  language?: string
  importance: number
}

/**
 * Decision record
 */
export interface Decision {
  question: string
  answer: string
  timestamp: number
  confidence?: number
  rationale?: string
}

/**
 * Key point extracted from conversation
 */
export interface KeyPoint {
  content: string
  category: 'decision' | 'error' | 'solution' | 'requirement' | 'insight'
  importance: number
  timestamp: number
  relatedMessages: string[]
}

/**
 * Compressed context metadata
 */
export interface CompressionMetadata {
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  compressionTime: number
  strategy: 'summary' | 'dedup' | 'trim' | 'hybrid'
  timestamp: number
}

/**
 * Compressed context result
 */
export interface CompressedContext {
  sessionId: string
  summary: string
  keyPoints: KeyPoint[]
  codeSnippets: CodeSnippet[]
  decisions: Decision[]
  metadata: CompressionMetadata
  originalMessageCount: number
  retainedMessageCount: number
}

/**
 * Context compression options
 */
export interface CompressionOptions {
  keepRecentN?: number
  importanceThreshold?: number
  maxTokens?: number
  preserveCode?: boolean
  preserveDecisions?: boolean
  strategy?: 'aggressive' | 'balanced' | 'conservative'
}

/**
 * Session persistence data
 */
export interface SessionData {
  id: string
  projectPath: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  compressed?: CompressedContext
  totalTokens: number
  status: 'active' | 'compressed' | 'archived'
}

/**
 * Context restoration result
 */
export interface RestorationResult {
  sessionId: string
  messages: Message[]
  compressed?: CompressedContext
  totalTokens: number
  restoredAt: number
}

/**
 * Token estimation result
 */
export interface TokenEstimate {
  total: number
  byRole: Record<MessageRole, number>
  byCategory: Record<string, number>
  averagePerMessage: number
}

/**
 * Compression performance metrics
 */
export interface CompressionMetrics {
  sessionId: string
  originalTokens: number
  compressedTokens: number
  tokensSaved: number
  compressionRatio: number
  processingTime: number
  strategy: string
  timestamp: number
}

/**
 * Intent types representing different categories of user requests.
 * Each intent maps to specific orchestration strategies.
 */
export enum IntentType {
  /** Review code quality, security, and best practices */
  CODE_REVIEW = 'code-review',

  /** Develop new features with planning and implementation */
  FEATURE_DEVELOPMENT = 'feature-development',

  /** Debug and fix bugs or errors */
  BUG_FIX = 'bug-fix',

  /** Write or run tests following TDD methodology */
  TESTING = 'testing',

  /** Generate or update documentation */
  DOCUMENTATION = 'documentation',

  /** Refactor code for better structure and performance */
  REFACTORING = 'refactoring',

  /** Optimize code performance and resource usage */
  OPTIMIZATION = 'optimization',

  /** General inquiry or explanation */
  INQUIRY = 'inquiry',
}

/**
 * Confidence level for intent detection.
 * Ranges from 0.0 to 1.0, with higher values indicating greater certainty.
 */
export type ConfidenceScore = number

/**
 * Detected intent with associated metadata.
 */
export interface DetectedIntent {
  /** The primary intent type */
  intent: IntentType

  /** Confidence score (0.0 to 1.0) */
  confidence: ConfidenceScore

  /** Alternative intents with their confidence scores */
  alternatives?: Array<{
    intent: IntentType
    confidence: ConfidenceScore
  }>

  /** Matched keywords or phrases that led to this detection */
  matchedKeywords: string[]

  /** Timestamp of detection */
  timestamp: number
}

/**
 * Context information for intent detection.
 */
export interface DetectionContext {
  /** Current working directory */
  cwd?: string

  /** Recent command history */
  history?: string[]

  /** Active files in the workspace */
  activeFiles?: string[]

  /** Git repository information */
  gitInfo?: {
    branch?: string
    hasChanges?: boolean
    recentCommits?: string[]
  }

  /** Previously detected intents (for context awareness) */
  previousIntents?: DetectedIntent[]
}

/**
 * Execution step in an orchestration plan.
 */
export interface OrchestrationStep {
  /** Unique step identifier */
  id: string

  /** Step type determining execution strategy */
  type: 'skill' | 'agent' | 'mcp' | 'builtin'

  /** Name of the skill, agent, or MCP to invoke */
  name: string

  /** Specific command or action to execute */
  action: string

  /** Execution order (lower numbers execute first) */
  order: number

  /** Whether this step must complete before proceeding */
  blocking: boolean

  /** Input parameters for this step */
  parameters?: Record<string, unknown>

  /** Expected output format */
  outputFormat?: 'text' | 'json' | 'markdown' | 'code'

  /** Estimated execution time in milliseconds */
  estimatedDuration?: number
}

/**
 * Complete orchestration plan for executing a user request.
 */
export interface OrchestrationPlan {
  /** Unique plan identifier */
  id: string

  /** The intent this plan addresses */
  intent: DetectedIntent

  /** Sequential steps to execute */
  steps: OrchestrationStep[]

  /** Total estimated execution time */
  estimatedDuration: number

  /** Required resources (skills, agents, MCPs) */
  requiredResources: {
    skills?: string[]
    agents?: string[]
    mcps?: string[]
  }

  /** Additional metadata */
  metadata: {
    createdAt: number
    version: string
    complexity: 'simple' | 'moderate' | 'complex'
  }
}

/**
 * Orchestration rules mapping intents to execution strategies.
 */
export interface OrchestrationRule {
  /** Intent type this rule applies to */
  intent: IntentType

  /** Minimum confidence required to apply this rule */
  minConfidence: ConfidenceScore

  /** Primary execution strategy */
  primaryStrategy: {
    type: 'skill' | 'agent' | 'mcp' | 'hybrid'
    name: string
    action: string
  }

  /** Supporting strategies (optional) */
  supportingStrategies?: Array<{
    type: 'skill' | 'agent' | 'mcp'
    name: string
    action: string
    blocking: boolean
  }>

  /** Required MCP services */
  requiredMCPs?: string[]
}

/**
 * Keyword patterns for intent detection.
 * Supports multiple languages (English, Chinese).
 */
export interface IntentKeywords {
  /** Primary keywords with strong correlation */
  primary: {
    en: string[]
    zh: string[]
  }

  /** Secondary keywords with moderate correlation */
  secondary: {
    en: string[]
    zh: string[]
  }

  /** Negative keywords that exclude this intent */
  negative?: {
    en: string[]
    zh: string[]
  }
}

/**
 * Intent detection result with full analysis.
 */
export interface IntentAnalysis {
  /** Detected intent */
  intent: DetectedIntent

  /** Analysis details */
  analysis: {
    /** Input text that was analyzed */
    input: string

    /** Context used for detection */
    context: DetectionContext

    /** All keyword matches found */
    matches: Array<{
      keyword: string
      intent: IntentType
      weight: number
    }>

    /** Confidence calculation details */
    confidenceBreakdown: {
      keywordScore: number
      contextScore: number
      historyScore: number
      finalScore: number
    }
  }
}

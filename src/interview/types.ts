import type { SupportedLang } from '../constants'

/**
 * Interview depth levels
 * - quick: 10 questions - Fast validation, surface-level decisions
 * - standard: 25 questions - Standard coverage of all major areas
 * - deep: 40+ questions - Comprehensive exploration for complex features
 */
export type InterviewDepth = 'quick' | 'standard' | 'deep'

/**
 * Interview category identifiers
 */
export type InterviewCategoryId =
  | 'project-foundation'
  | 'target-audience'
  | 'technical-implementation'
  | 'features-scope'
  | 'ui-ux'
  | 'concerns'
  | 'tradeoffs'
  | 'business-logic'
  | 'security-compliance'
  | 'custom'

/**
 * Interview session status
 */
export type InterviewStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'

/**
 * Question option definition
 */
export interface QuestionOption {
  /** Option label (displayed to user) */
  label: string
  /** Option description (explains what this means) */
  description: string
  /** Value to store if selected */
  value?: string
  /** Whether this is a recommended option */
  recommended?: boolean
}

/**
 * Localized question option
 */
export interface LocalizedQuestionOption {
  label: Record<SupportedLang, string>
  description: Record<SupportedLang, string>
  value?: string
  recommended?: boolean
}

/**
 * Conditional logic for follow-up questions
 */
export interface ConditionalLogic {
  /** Question ID that triggers this condition */
  dependsOn: string
  /** Values that trigger this question */
  whenValues: string[]
  /** Whether to skip or show based on condition */
  action: 'show' | 'skip'
}

/**
 * Single interview question definition
 */
export interface InterviewQuestion {
  /** Unique question identifier */
  id: string
  /** Question category */
  category: InterviewCategoryId
  /** Localized question text */
  question: Record<SupportedLang, string>
  /** Localized question options */
  options: LocalizedQuestionOption[]
  /** Whether multiple options can be selected */
  multiSelect: boolean
  /** Short header for the question (max 12 chars) */
  header: Record<SupportedLang, string>
  /** Conditional display logic */
  conditional?: ConditionalLogic
  /** Question priority order within category */
  order: number
  /** Tags for filtering/search */
  tags?: string[]
  /** Whether this question is required */
  required: boolean
}

/**
 * Interview category definition
 */
export interface InterviewCategory {
  /** Category identifier */
  id: InterviewCategoryId
  /** Localized category name */
  name: Record<SupportedLang, string>
  /** Localized category description */
  description: Record<SupportedLang, string>
  /** Questions in this category */
  questions: InterviewQuestion[]
  /** Display order (lower = earlier) */
  order: number
  /** Icon for UI display */
  icon?: string
}

/**
 * User's answer to a question
 */
export interface InterviewAnswer {
  /** Question ID */
  questionId: string
  /** Category ID */
  categoryId: InterviewCategoryId
  /** Selected option values */
  values: string[]
  /** Custom text input (if "other" selected) */
  customInput?: string
  /** Timestamp when answered */
  answeredAt: Date
}

/**
 * Category completion progress
 */
export interface CategoryProgress {
  /** Category ID */
  categoryId: InterviewCategoryId
  /** Category name (localized) */
  name: string
  /** Number of questions answered */
  answered: number
  /** Total questions in category */
  total: number
  /** Completion percentage */
  percentage: number
  /** Whether category is complete */
  isComplete: boolean
  /** Whether category is current */
  isCurrent: boolean
}

/**
 * Interview session state
 */
export interface InterviewSession {
  /** Unique session ID */
  id: string
  /** Spec file path to write results */
  specFile: string
  /** Interview depth level */
  depth: InterviewDepth
  /** Current category ID */
  currentCategory: InterviewCategoryId
  /** Current question index */
  currentQuestionIndex: number
  /** Total questions asked so far */
  questionsAsked: number
  /** Estimated remaining questions */
  questionsRemaining: number
  /** All collected answers */
  answers: InterviewAnswer[]
  /** Category progress tracking */
  progress: CategoryProgress[]
  /** Session start time */
  startedAt: Date
  /** Last activity time */
  lastActivityAt: Date
  /** Session status */
  status: InterviewStatus
  /** Categories to include */
  includedCategories: InterviewCategoryId[]
  /** Original user request/context */
  context?: string
}

/**
 * Interview configuration options
 */
export interface InterviewOptions {
  /** Interview depth level */
  depth: InterviewDepth
  /** Which categories to cover (empty = all) */
  categories: InterviewCategoryId[]
  /** Skip questions already answered in spec */
  skipObvious: boolean
  /** Output spec file path */
  outputFile: string
  /** Language for questions */
  language: SupportedLang
  /** Resume from existing session */
  resumeSessionId?: string
  /** Context from user's initial request */
  context?: string
}

/**
 * Interview template definition
 */
export interface InterviewTemplate {
  /** Template identifier */
  id: string
  /** Localized template name */
  name: Record<SupportedLang, string>
  /** Localized template description */
  description: Record<SupportedLang, string>
  /** Target project types */
  targetTypes: string[]
  /** Included categories (order matters) */
  categories: InterviewCategoryId[]
  /** Default depth for this template */
  defaultDepth: InterviewDepth
  /** Estimated question count */
  estimatedQuestions: number
}

/**
 * Generated spec section
 */
export interface SpecSection {
  /** Section title */
  title: string
  /** Section content */
  content: string
  /** Order in final spec */
  order: number
}

/**
 * Decision made during interview
 */
export interface SpecDecision {
  /** Decision summary */
  decision: string
  /** Rationale/reasoning */
  rationale: string
  /** Related question IDs */
  relatedQuestions: string[]
  /** Category this decision belongs to */
  category: string
}

/**
 * Edge case identified during interview
 */
export interface SpecEdgeCase {
  /** Edge case description */
  description: string
  /** How to handle it */
  handling: string
  /** Severity level */
  severity: 'low' | 'medium' | 'high'
  /** Related questions */
  relatedQuestions: string[]
}

/**
 * Open question for future consideration
 */
export interface SpecOpenQuestion {
  /** Question text */
  question: string
  /** Why it's still open */
  reason: string
  /** Suggested approach */
  suggestedApproach?: string
  /** Priority level */
  priority: 'low' | 'medium' | 'high'
}

/**
 * Generated specification from interview
 */
export interface GeneratedSpec {
  /** Spec title/feature name */
  title: string
  /** Generation timestamp */
  generatedAt: Date
  /** Interview session ID */
  sessionId: string
  /** Number of questions answered */
  questionCount: number
  /** Interview depth used */
  depth: InterviewDepth

  /** Overview section */
  overview: {
    projectType: string
    targetAudience: string
    mvpScope: string[]
    platforms: string[]
  }

  /** Technical architecture */
  technical: {
    architecture: string
    database: string
    authentication: string
    stateManagement: string
    integrations: string[]
    apiDesign?: string
  }

  /** UI/UX requirements */
  uiux: {
    platforms: string[]
    designSystem: string
    accessibility: string
    responsiveDesign: string
    keyFlows: string[]
  }

  /** Security and compliance */
  security: {
    requirements: string[]
    compliance: string[]
    dataPrivacy: string[]
  }

  /** Business logic */
  business: {
    validationRules: string[]
    workflowStates: string[]
    constraints: string[]
  }

  /** Decisions made */
  decisions: SpecDecision[]

  /** Edge cases identified */
  edgeCases: SpecEdgeCase[]

  /** Open questions */
  openQuestions: SpecOpenQuestion[]

  /** Raw answers for reference */
  rawAnswers: InterviewAnswer[]
}

/**
 * Interview engine result
 */
export interface InterviewResult {
  /** Whether interview completed successfully */
  success: boolean
  /** Final session state */
  session: InterviewSession
  /** Generated spec (if complete) */
  spec?: GeneratedSpec
  /** Spec file path (if written) */
  specFilePath?: string
  /** Error message (if failed) */
  error?: string
}

/**
 * Question display format for UI
 */
export interface QuestionDisplay {
  /** Current question */
  question: InterviewQuestion
  /** Progress indicator text */
  progressText: string
  /** Category breadcrumb */
  categoryBreadcrumb: string
  /** Question number */
  questionNumber: number
  /** Estimated total questions */
  estimatedTotal: number
  /** Available options formatted for display */
  options: Array<{
    label: string
    description: string
    value: string
    isRecommended: boolean
  }>
}

/**
 * Interview statistics
 */
export interface InterviewStats {
  /** Total sessions started */
  totalSessions: number
  /** Completed sessions */
  completedSessions: number
  /** Average questions per session */
  avgQuestionsPerSession: number
  /** Most used depth */
  mostUsedDepth: InterviewDepth
  /** Most common project types */
  commonProjectTypes: Array<{ type: string; count: number }>
  /** Category completion rates */
  categoryCompletionRates: Record<InterviewCategoryId, number>
}

/**
 * Interview storage format
 */
export interface InterviewStorage {
  /** Active sessions */
  sessions: InterviewSession[]
  /** Completed session summaries */
  history: Array<{
    sessionId: string
    specFile: string
    completedAt: Date
    questionCount: number
    depth: InterviewDepth
  }>
  /** Statistics */
  stats: InterviewStats
  /** Last updated */
  lastUpdated: Date
}

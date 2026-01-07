/**
 * ShenCha (审查) - LLM-Driven Autonomous Code Audit System Types
 */

/**
 * Issue severity type
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/**
 * Issue type
 */
export type IssueType = 'security' | 'performance' | 'quality' | 'style' | 'accessibility' | 'logic' | 'bug'

/**
 * Issue category
 */
export type IssueCategory = 'security' | 'performance' | 'quality' | 'style' | 'accessibility' | 'logic'

/**
 * Project context for LLM analysis
 */
export interface ProjectContext {
  /** Project root path */
  rootPath: string
  /** Project name */
  projectName?: string
  /** Root directory */
  rootDir?: string
  /** Detected language/framework */
  framework?: string
  /** Detected frameworks */
  frameworks?: string[]
  /** Detected languages */
  languages?: string[]
  /** Package manager */
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
  /** Source directories */
  sourceDirs: string[]
  /** Test directories */
  testDirs: string[]
  /** Configuration files */
  configFiles: string[]
  /** File structure */
  fileStructure?: string[]
  /** Git information */
  git?: {
    branch: string
    lastCommit: string
    uncommittedChanges: number
  }
}

/**
 * Scan target discovered by LLM
 */
export interface ScanTarget {
  /** Target type */
  type: 'file' | 'directory' | 'function' | 'class' | 'module' | 'api' | 'config'
  /** Target path */
  path: string
  /** Reason for scanning */
  reason: string
  /** Priority (1-10, 10 being highest) */
  priority: number
  /** Estimated complexity */
  complexity: 'low' | 'medium' | 'high'
  /** Tags for categorization */
  tags: string[]
}

/**
 * Scan strategy determined by LLM
 */
export interface ScanStrategy {
  /** Strategy type */
  type: 'security' | 'performance' | 'quality' | 'accessibility' | 'comprehensive'
  /** Specific checks to perform */
  checks: string[]
  /** Depth of analysis */
  depth: 'surface' | 'moderate' | 'deep'
  /** Context to include */
  contextFiles: string[]
  /** LLM model to use */
  model: 'opus' | 'sonnet' | 'haiku'
  /** Focus areas */
  focusAreas?: string[]
}

/**
 * Scan result from LLM analysis
 */
export interface ScanResult {
  /** Target that was scanned */
  target: ScanTarget
  /** Strategy used */
  strategy: ScanStrategy
  /** Timestamp */
  timestamp: Date
  /** Scanned at timestamp */
  scannedAt?: Date
  /** Duration in milliseconds */
  duration: number
  /** Issues found */
  issues: Issue[]
  /** Metrics collected */
  metrics: Record<string, number>
  /** LLM reasoning/notes */
  notes: string
}

/**
 * Issue found during scan
 */
export interface Issue {
  /** Issue unique ID */
  id: string
  /** Issue title */
  title: string
  /** Detailed description */
  description: string
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  /** Issue category */
  category: 'security' | 'performance' | 'quality' | 'style' | 'accessibility' | 'logic'
  /** Issue type */
  type?: string
  /** File path */
  file: string
  /** Line number (if applicable) */
  line?: number
  /** Column number (if applicable) */
  column?: number
  /** Code snippet */
  snippet?: string
  /** Location info */
  location?: {
    file?: string
    startLine?: number
    endLine?: number
    column?: number
    snippet?: string
  } | string
  /** Suggested fix */
  suggestedFix?: string
  /** Suggestion text */
  suggestion?: string
  /** Whether auto-fix is safe */
  autoFixable: boolean
  /** Related issues */
  relatedIssues?: string[]
  /** Confidence score (0-1) */
  confidence: number
}

/**
 * Evaluated issue with LLM decision
 */
export interface EvaluatedIssue extends Issue {
  /** LLM evaluation reasoning */
  evaluation: string
  /** Reasoning explanation */
  reasoning?: string
  /** Actual priority (may differ from severity) */
  priority: number
  /** Adjusted severity after evaluation */
  adjustedSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
  /** Whether this is a real issue */
  isRealIssue?: boolean
  /** Risks associated */
  risks?: string[]
  /** Related patterns */
  relatedPatterns?: string[]
  /** Recommended action */
  action: 'fix-now' | 'fix-later' | 'monitor' | 'ignore'
  /** Effort estimate */
  effort: 'trivial' | 'small' | 'medium' | 'large'
}

/**
 * Fix decision from LLM
 */
export interface FixDecision {
  /** Whether to auto-fix */
  shouldFix: boolean
  /** Whether can auto-fix */
  canAutoFix?: boolean
  /** Whether requires review */
  requiresReview?: boolean
  /** Risk level */
  riskLevel?: 'none' | 'low' | 'medium' | 'high'
  /** Reasoning */
  reason: string
  /** Reasoning (alias) */
  reasoning?: string
  /** Risk assessment */
  risk: 'none' | 'low' | 'medium' | 'high'
  /** Prerequisites before fixing */
  prerequisites: string[]
  /** Post-fix verification steps */
  verificationSteps: string[]
  /** Conditions for safe auto-fix */
  conditions?: string[]
  /** Alternative approaches */
  alternatives?: string[]
}

/**
 * Fix plan generated by LLM
 */
export interface FixPlan {
  /** Issue being fixed */
  issueId: string
  /** Approach description */
  approach: string
  /** Files to modify */
  filesToModify: string[]
  /** Expected changes description */
  expectedChanges: string
  /** Rollback strategy */
  rollbackStrategy: string
  /** Rollback plan */
  rollbackPlan?: string
  /** Tests to run after fix */
  testsToRun: string[]
  /** Steps to execute */
  steps?: Array<string | { action: string, description?: string, order?: number, target?: string, changes?: string }>
  /** Validations to run */
  validations?: string[]
  /** Side effects */
  sideEffects?: string[]
  /** Test strategy */
  testStrategy?: string
  /** Estimated duration in minutes */
  estimatedDuration?: number
}

/**
 * Generated fix from LLM
 */
export interface GeneratedFix {
  /** Fix ID */
  id?: string
  /** Issue ID */
  issueId?: string
  /** Plan ID */
  planId?: string
  /** Plan used */
  plan: FixPlan
  /** File changes */
  changes: FileChange[]
  /** Commit message */
  commitMessage: string
  /** Timestamp */
  generatedAt: Date
  /** File path */
  filePath?: string
  /** Fixed code */
  fixedCode?: string
  /** Imports needed */
  imports?: string[]
  /** Warnings */
  warnings?: string[]
  /** Approach used */
  approach?: string
  /** Description */
  description?: string
  /** Pros */
  pros?: string[]
}

/**
 * File change in a fix
 */
export interface FileChange {
  /** File path */
  path: string
  /** File reference */
  file?: string
  /** Change type */
  type: 'modify' | 'create' | 'delete' | 'rename'
  /** Original content (for modify/delete) */
  originalContent?: string
  /** New content (for modify/create) */
  newContent?: string
  /** New path (for rename) */
  newPath?: string
  /** Diff (unified format) */
  diff?: string
  /** Start line */
  startLine?: number
  /** End line */
  endLine?: number
  /** Explanation */
  explanation?: string
  /** Before content */
  before?: string
  /** After content */
  after?: string
}

/**
 * Fix application result
 */
export interface FixResult {
  /** Fix that was applied */
  fix: GeneratedFix
  /** Fix ID */
  fixId?: string
  /** Success status */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Original content before fix */
  originalContent?: string
  /** New content after fix */
  newContent?: string
  /** Applied changes */
  appliedChanges: FileChange[]
  /** Failed changes */
  failedChanges: Array<{ change: FileChange, error: string }>
  /** Backup paths */
  backupPaths: string[]
  /** Timestamp */
  appliedAt: Date
  /** Duration in ms */
  duration?: number
  /** Changes applied count */
  changesApplied?: number
}

/**
 * Verification result from LLM
 */
export interface VerifyResult {
  /** Fix ID that was verified */
  fixId?: string
  /** Fix that was verified */
  fix?: GeneratedFix
  /** Overall success */
  success?: boolean
  /** Is the fix correct */
  isCorrect?: boolean
  /** Issue resolved */
  issueResolved?: boolean
  /** Syntax valid */
  syntaxValid?: boolean
  /** Functionality preserved */
  functionalityPreserved?: boolean
  /** Logic errors found */
  logicErrors?: string[]
  /** Edge cases handled */
  edgeCasesHandled?: boolean
  /** Style consistent */
  styleConsistent?: boolean
  /** Code correctness verified */
  codeCorrect?: boolean
  /** No regressions detected */
  noRegressions?: boolean
  /** No new issues introduced */
  noNewIssues?: boolean
  /** Confidence score (0-1) */
  confidence?: number
  /** Reasoning */
  reasoning?: string
  /** Verification notes */
  notes?: string
  /** Suggestions */
  suggestions?: string[]
  /** Recommendations */
  recommendations?: string[]
  /** Verified timestamp */
  verifiedAt?: Date
}

/**
 * Regression found during verification
 */
export interface Regression {
  /** Type of regression */
  type: 'functional' | 'performance' | 'breaking-change'
  /** Description */
  description: string
  /** Affected files */
  affectedFiles: string[]
  /** Severity */
  severity: 'critical' | 'high' | 'medium' | 'low'
  /** File path */
  file?: string
  /** Location */
  location?: string
  /** Impact description */
  impact?: string
  /** Suggestion for fix */
  suggestion?: string
}

/**
 * New issue introduced by fix
 */
export interface NewIssue extends Issue {
  /** The fix that introduced this issue */
  introducedByFix: string
}

/**
 * Execution plan for async audit
 */
export interface ExecutionPlan {
  /** Plan ID */
  id: string
  /** Creation timestamp */
  createdAt: Date
  /** Targets to scan */
  targets: ScanTarget[]
  /** Execution order */
  order: string[]
  /** Parallel execution groups */
  parallelGroups: string[][]
  /** Estimated duration */
  estimatedDuration: number
  /** Total estimated minutes */
  totalEstimatedMinutes?: number
  /** Priority queue */
  priorityQueue: Array<{ targetId: string, priority: number }>
  /** Execution phases */
  phases?: Array<{ name: string, description?: string, targets: string[], issueIds?: string[], parallel?: boolean, estimatedMinutes?: number }>
  /** Recommendations */
  recommendations?: string[]
  /** Issues to process */
  issues?: string[]
}

/**
 * ShenCha configuration
 */
export interface ShenChaConfig {
  /** Schedule configuration */
  schedule: {
    intervalHours: number
    totalDurationHours: number
    startTime?: string
  }
  /** LLM configuration */
  llm: {
    baseUrl: string
    apiKey?: string
    models: {
      scanning: string
      analysis: string
      fixing: string
    }
    maxTokens?: number
    temperature?: number
  }
  /** Scanner configuration */
  scanners: {
    page?: { enabled: boolean, criticalPages?: string[] }
    api?: { enabled: boolean, endpoints?: string[] }
    errorLog?: { enabled: boolean, lookbackHours?: number }
    userBehavior?: { enabled: boolean, database?: string }
  }
  /** Fixer configuration */
  fixer: {
    enabled: boolean
    autoCommit: boolean
    safetyChecks: {
      requireTypeCheck: boolean
      requireLintPass: boolean
      requireTestPass: boolean
      maxFilesPerFix: number
      maxLineChanges: number
      requireReview: string[]
    }
  }
  /** Reporter configuration */
  reporter: {
    outputDir: string
    formats: Array<'markdown' | 'json' | 'html'>
    webhooks?: Array<{ url: string, events: string[] }>
  }
}

/**
 * Audit cycle status
 */
export interface AuditCycleStatus {
  /** Cycle number */
  cycleNumber: number
  /** Total cycles planned */
  totalCycles: number
  /** Current status */
  status: 'pending' | 'scanning' | 'analyzing' | 'fixing' | 'verifying' | 'completed' | 'failed'
  /** Start time */
  startedAt?: Date
  /** End time */
  completedAt?: Date
  /** Issues found this cycle */
  issuesFound: number
  /** Issues fixed this cycle */
  issuesFixed: number
  /** Current target being processed */
  currentTarget?: string
  /** Progress percentage */
  progress: number
}

/**
 * Audit cycle
 */
export interface AuditCycle {
  /** Cycle ID */
  id: string
  /** Start time */
  startedAt: Date
  /** Completion time */
  completedAt?: Date
  /** Current status */
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  /** Current phase */
  currentPhase?: string
  /** Pause reason if paused */
  pauseReason?: string
  /** Error message if failed */
  error?: string
  /** Project context */
  context: ProjectContext
  /** Scan results */
  scanResults: ScanResult[]
  /** Evaluated issues */
  evaluatedIssues: EvaluatedIssue[]
  /** Fix results */
  fixResults: Array<{
    issue: EvaluatedIssue
    plan: FixPlan
    fix: GeneratedFix
    result: FixResult
  }>
  /** Generated report */
  report: AuditReport | null
}

/**
 * Audit report
 */
export interface AuditReport {
  /** Report ID */
  id: string
  /** Cycle ID */
  cycleId?: string
  /** Cycle number */
  cycleNumber: number
  /** Generation timestamp */
  generatedAt: Date
  /** Duration */
  duration: number
  /** Summary */
  summary: {
    totalIssues: number
    fixedIssues: number
    pendingIssues: number
    pendingReview?: number
    failedFixes?: number
    bySeverity?: Record<string, number>
    byCategory?: Record<string, number>
    byType?: Record<string, number>
    healthScore?: number
    scores: {
      security: number
      performance: number
      quality: number
    }
  }
  /** Issues by category */
  issuesByCategory: Record<string, Issue[]>
  /** Issues list */
  issues?: EvaluatedIssue[]
  /** Fixes applied */
  fixesApplied: FixResult[]
  /** Fixes summary */
  fixes?: Array<{ issueId: string, success: boolean, error?: string }>
  /** Recommendations */
  recommendations: string[]
  /** Next steps */
  nextSteps: string[]
}

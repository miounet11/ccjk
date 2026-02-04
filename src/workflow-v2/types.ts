/**
 * Workflow Type Definitions for CCJK v2.0
 *
 * This file defines the core types for AI-generated workflows,
 * including fragments, generators, and validation rules.
 */

/**
 * Represents a workflow step
 */
export interface WorkflowStep {
  id: string
  name: string
  description: string
  command?: string
  script?: string
  dependencies?: string[] // Step IDs that must complete before this step
  validation?: ValidationRule
  errorHandling?: ErrorHandling
  timeout?: number // in seconds
  retry?: RetryConfig
  metadata?: Record<string, unknown>
  platform?: 'linux' | 'macos' | 'windows' | 'all' // Platform-specific step
}

/**
 * Validation rule for a step
 */
export interface ValidationRule {
  type: 'exit_code' | 'output' | 'file_exists' | 'custom'
  condition: string | RegExp | ((result: unknown) => boolean)
  errorMessage?: string
}

/**
 * Error handling strategy
 */
export interface ErrorHandling {
  strategy: 'retry' | 'continue' | 'abort' | 'fallback'
  fallbackStep?: string
  maxAttempts?: number
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number
  backoff: 'fixed' | 'exponential' | 'linear'
  initialDelay: number // in milliseconds
  maxDelay?: number // in milliseconds
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  id: string
  name: string
  description: string
  version: string
  author?: string
  tags: string[]
  steps: WorkflowStep[]
  metadata: WorkflowMetadata
  requirements: WorkflowRequirements
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  createdAt: string
  updatedAt: string
  generatedBy: 'ai' | 'human' | 'hybrid'
  aiModel?: string
  complexity: 'simple' | 'medium' | 'complex'
  estimatedDuration?: number // in minutes
}

/**
 * Workflow requirements
 */
export interface WorkflowRequirements {
  tools?: string[]
  dependencies?: string[]
  platforms?: string[]
  environment?: Record<string, string>
}

/**
 * Workflow fragment - reusable building block
 */
export interface Fragment {
  id: string
  name: string
  description: string
  category: FragmentCategory
  steps: WorkflowStep[]
  requirements?: WorkflowRequirements
  tags: string[]
  compatibility?: FragmentCompatibility
  metadata: FragmentMetadata
}

/**
 * Fragment categories
 */
export type FragmentCategory
  = | 'setup'
    | 'develop'
    | 'test'
    | 'deploy'
    | 'debug'
    | 'maintenance'
    | 'integration'
    | 'custom'

/**
 * Fragment compatibility information
 */
export interface FragmentCompatibility {
  platforms?: string[]
  languages?: string[]
  frameworks?: string[]
  minVersion?: string
  maxVersion?: string
}

/**
 * Fragment metadata
 */
export interface FragmentMetadata {
  createdAt: string
  updatedAt: string
  author?: string
  version: string
  usage?: number
  rating?: number
}

/**
 * Project context for workflow generation
 */
/**
 * File system context for project analysis
 */
export interface FileSystemContext {
  hasTests: boolean
  hasDocs: boolean
  hasConfig: boolean
  mainFiles: string[]
}

/**
 * Project context for workflow generation
 */
export interface ProjectContext {
  language: string
  framework?: string
  platform: string
  packageManager?: string
  buildTool?: string
  testingFramework?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  environmentVariables?: Record<string, string>
  customContext?: {
    fileSystem?: FileSystemContext
    [key: string]: unknown
  }
}

/**
 * AI generator configuration
 */
export interface GeneratorConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
  apiKey?: string
  baseURL?: string
  cacheEnabled?: boolean
  cacheTTL?: number // in seconds
}

/**
 * Workflow generation options
 */
export interface GenerationOptions {
  includeTests?: boolean
  includeErrorHandling?: boolean
  optimizationLevel?: 'speed' | 'quality' | 'balanced'
  style?: 'concise' | 'verbose' | 'interactive'
  customRequirements?: string[]
  excludeFragments?: string[]
}

/**
 * Workflow generation request
 */
export interface WorkflowGenerationRequest {
  task: string
  context: ProjectContext
  options?: GenerationOptions
  config?: GeneratorConfig
}

/**
 * Workflow generation result
 */
export interface WorkflowGenerationResult {
  workflow: Workflow
  metadata: GenerationMetadata
  validation?: ValidationResult
  suggestions?: string[]
  warnings?: string[]
}

/**
 * Generation metadata
 */
export interface GenerationMetadata {
  generatedAt: string
  model: string
  duration: number // in milliseconds
  tokensUsed?: number
  cacheHit?: boolean
  confidence?: number // 0-1
  optimized?: boolean
  optimizationImprovements?: number
  fragmentCount?: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions?: string[]
}

/**
 * Validation error
 */
export interface ValidationError {
  type: 'circular_dependency' | 'missing_dependency' | 'invalid_command' | 'timeout_exceeded' | 'syntax_error' | 'security_risk' | 'other'
  stepId?: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: 'long_duration' | 'deprecated_tool' | 'platform_specific' | 'security_risk' | 'performance_issue' | 'invalid_command' | 'other'
  stepId?: string
  message: string
  suggestion?: string
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  originalWorkflow: Workflow
  optimizedWorkflow: Workflow
  improvements: Improvement[]
  estimatedTimeSaved?: number // in minutes
  estimatedResourceSaved?: string
}

/**
 * Optimization improvement
 */
export interface Improvement {
  type: 'parallelization' | 'caching' | 'dependency_reduction' | 'command_optimization' | 'resource_cleanup' | 'timeout_optimization' | 'error_handling'
  stepId?: string
  description: string
  impact: 'high' | 'medium' | 'low'
  before?: string
  after?: string
}

/**
 * Fragment library index
 */
export interface FragmentLibraryIndex {
  fragments: Record<string, Fragment>
  categories: Record<FragmentCategory, string[]>
  tags: Record<string, string[]>
  searchIndex: Record<string, string[]>
}

/**
 * Context builder configuration
 */
export interface ContextBuilderConfig {
  includeFileSystem?: boolean
  includeDependencies?: boolean
  includeEnvironment?: boolean
  includeGitHistory?: boolean
  maxFileSize?: number // in bytes
  maxFiles?: number
}

/**
 * Prompt template variables
 */
export interface PromptVariables {
  task: string
  context: ProjectContext
  options?: GenerationOptions
  examples?: string
  customInstructions?: string
}

/**
 * Post-processor configuration
 */
export interface PostProcessorConfig {
  validateOutput?: boolean
  formatOutput?: boolean
  optimizeOutput?: boolean
  generateTests?: boolean
  maxIterations?: number
}

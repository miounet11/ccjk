/**
 * Type definitions for the project analysis engine
 */

export interface ProjectAnalysis {
  /** Project root directory */
  rootPath: string
  /** Detected project type (primary language/framework) */
  projectType: string
  /** All detected languages with confidence scores */
  languages: LanguageDetection[]
  /** Detected frameworks and libraries */
  frameworks: FrameworkDetectionResult[]
  /** Package manager used */
  packageManager?: PackageManager
  /** Build system detected */
  buildSystem?: BuildSystem
  /** Relative paths to important configuration files */
  configFiles: string[]
  /** Relative paths to important directories */
  importantDirs: string[]
  /** Dependency analysis results */
  dependencies?: DependencyAnalysis
  /** Analysis metadata */
  metadata: AnalysisMetadata
}

export interface LanguageDetection {
  /** Language name (typescript, python, go, rust, etc.) */
  language: string
  /** Confidence score (0-1) */
  confidence: number
  /** Estimated number of files */
  fileCount: number
  /** Primary indication reasons */
  indicators: string[]
}

export interface FrameworkDetectionResult {
  /** Framework name */
  name: string
  /** Framework category (frontend, backend, mobile, desktop, etc.) */
  category: string
  /** Detected version if available */
  version?: string
  /** Confidence score (0-1) */
  confidence: number
  /** Detection evidence */
  evidence: string[]
}

export type PackageManager =
  | 'npm'
  | 'yarn'
  | 'pnpm'
  | 'bun'
  | 'pip'
  | 'poetry'
  | 'pipenv'
  | 'conda'
  | 'go'
  | 'cargo'
  | 'mod'
  | 'gradle'
  | 'maven'
  | 'unknown'

export type BuildSystem =
  | 'webpack'
  | 'vite'
  | 'rollup'
  | 'esbuild'
  | 'tsc'
  | 'babel'
  | 'swc'
  | 'next'
  | 'nuxt'
  | 'svelte'
  | 'make'
  | 'cmake'
  | 'bazel'
  | 'unknown'

export interface DependencyAnalysis {
  /** Direct dependencies */
  direct: DependencyNode[]
  /** All transitive dependencies */
  all: DependencyNode[]
  /** Dependency graph (key = dependency name, value = array of dependents) */
  graph: Map<string, DependencyNode[]>
  /** Installation plan with optimal order */
  installationPlan: InstallationPlan
  /** Detected conflicts */
  conflicts: DependencyConflict[]
  /** Circular dependencies detected */
  circularDeps: string[][]
}

export interface DependencyNode {
  /** Package/dependency name */
  name: string
  /** Version requirement */
  version: string
  /** Type of dependency */
  type: DependencyType
  /** Whether this is a dev dependency */
  isDev: boolean
  /** Whether this is a peer dependency */
  isPeer: boolean
  /** Whether this is an optional dependency */
  isOptional: boolean
  /** Dependencies of this dependency */
  dependencies?: DependencyNode[]
}

export type DependencyType = 'runtime' | 'dev' | 'peer' | 'optional' | 'bundled'

export interface InstallationPlan {
  /** Ordered list of dependencies to install */
  order: DependencyNode[]
  /** Total number of dependencies */
  total: number
  /** Number that can be installed in parallel */
  parallelizable: number
  /** Installation commands for each package manager */
  commands: InstallationCommands
}

export interface InstallationCommands {
  /** Command to install all dependencies */
  installAll: string
  /** Command to install a specific package */
  installPackage: (name: string, version?: string) => string
  /** Command to install dev dependencies */
  installDev: string
  /** Command to add a new dependency */
  add: (name: string, isDev?: boolean) => string
}

export interface DependencyConflict {
  /** Package name with conflict */
  package: string
  /** Conflicting version requirements */
  versions: string[]
  /** Packages requiring these versions */
  requiredBy: string[]
  /** Severity level */
  severity: 'error' | 'warning' | 'info'
}

export interface AnalysisMetadata {
  /** Analysis timestamp */
  timestamp: Date
  /** Analysis duration in milliseconds */
  duration: number
  /** Number of files scanned */
  filesScanned: number
  /** Analysis confidence (0-1) */
  confidence: number
  /** Analysis version */
  version: string
}

export interface DetectorConfig {
  /** Minimum confidence threshold for language detection */
  minConfidence: number
  /** Whether to include node_modules in analysis */
  includeNodeModules: boolean
  /** Whether to analyze transitive dependencies */
  analyzeTransitiveDeps: boolean
  /** Maximum number of files to scan */
  maxFilesToScan: number
  /** Custom file patterns to include */
  includePatterns: string[]
  /** File patterns to exclude */
  excludePatterns: string[]
}

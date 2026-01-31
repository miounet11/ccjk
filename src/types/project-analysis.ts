/**
 * Project Analysis Type Definitions
 *
 * Types for project analysis and fingerprinting.
 */

/**
 * Complete project analysis result
 */
export interface ProjectAnalysis {
  fingerprint: string
  languages: LanguageInfo[]
  frameworks: FrameworkInfo[]
  dependencies: DependencyInfo[]
  structure: ProjectStructure
  metrics: ProjectMetrics
  detectedTools: string[]
}

/**
 * Language detection info
 */
export interface LanguageInfo {
  name: string
  percentage: number
  files: number
  lines: number
}

/**
 * Framework detection info
 */
export interface FrameworkInfo {
  name: string
  version?: string
  confidence: number
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop' | 'other'
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  name: string
  version: string
  type: 'production' | 'development' | 'peer' | 'optional'
  source: 'npm' | 'pip' | 'cargo' | 'go' | 'other'
}

/**
 * Project structure analysis
 */
export interface ProjectStructure {
  rootDir: string
  srcDirs: string[]
  testDirs: string[]
  configFiles: string[]
  hasMonorepo: boolean
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun'
}

/**
 * Project metrics
 */
export interface ProjectMetrics {
  totalFiles: number
  totalLines: number
  avgFileSize: number
  complexity: 'low' | 'medium' | 'high'
  testCoverage?: number
}

/**
 * Project fingerprint for cloud matching
 */
export interface ProjectFingerprint {
  hash: string
  languages: string[]
  frameworks: string[]
  size: 'small' | 'medium' | 'large'
  type: 'library' | 'application' | 'monorepo' | 'unknown'
}

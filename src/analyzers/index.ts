/**
 * Project analysis engine for CCJK
 * Provides intelligent project detection and analysis capabilities
 */

import type { DetectorConfig, ProjectAnalysis } from './types.js'
import consola from 'consola'
import { analyzeDependencies } from './dependency-resolver.js'
import { detectProject } from './project-detector.js'

export { analyzeDependencies, detectProject }
export * from './types.js'

/**
 * ProjectAnalyzer class for analyzing projects
 */
export class ProjectAnalyzer {
  private config: Partial<DetectorConfig> = {}

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = config
  }

  /**
   * Analyze a project directory
   */
  async analyze(projectPath: string): Promise<ProjectAnalysis> {
    return analyzeProject(projectPath, this.config)
  }

  /**
   * Get project type only
   */
  async getProjectType(projectPath: string): Promise<string> {
    return detectProjectType(projectPath)
  }
}

const logger = consola.withTag('analyzer')

// Default configuration
const DEFAULT_CONFIG: DetectorConfig = {
  minConfidence: 0.5,
  includeNodeModules: false,
  analyzeTransitiveDeps: true,
  maxFilesToScan: 10000,
  includePatterns: [],
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.vscode',
    '.idea',
    '*.log',
    '*.tmp',
    '.DS_Store',
    'Thumbs.db',
  ],
}

/**
 * Analyze a project directory
 */
export async function analyzeProject(
  projectPath: string,
  config: Partial<DetectorConfig> = {},
): Promise<ProjectAnalysis> {
  const startTime = Date.now()

  logger.info(`Analyzing project at: ${projectPath}`)

  const mergedConfig: DetectorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  try {
    // Detect project type and structure
    const analysis = await detectProject(projectPath, mergedConfig)

    // Analyze dependencies if enabled
    if (mergedConfig.analyzeTransitiveDeps && analysis.dependencies) {
      analysis.dependencies = await analyzeDependencies(analysis, mergedConfig)
    }

    // Update metadata
    analysis.metadata.duration = Date.now() - startTime

    logger.success(`Project analysis completed in ${analysis.metadata.duration}ms`)
    logger.info(`Detected: ${analysis.projectType} (${analysis.metadata.confidence * 100}% confidence)`)

    return analysis
  }
  catch (error) {
    logger.error('Project analysis failed:', error)
    throw new Error(`Failed to analyze project at ${projectPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Quick project type detection
 */
export async function detectProjectType(projectPath: string): Promise<string> {
  const analysis = await analyzeProject(projectPath, {
    analyzeTransitiveDeps: false,
  })
  return analysis.projectType
}

/**
 * Batch analyze multiple projects
 */
export async function batchAnalyze(
  projectPaths: string[],
  config: Partial<DetectorConfig> = {},
): Promise<ProjectAnalysis[]> {
  logger.info(`Batch analyzing ${projectPaths.length} projects`)

  const results: ProjectAnalysis[] = []

  for (const path of projectPaths) {
    try {
      const analysis = await analyzeProject(path, config)
      results.push(analysis)
    }
    catch (error) {
      logger.error(`Failed to analyze ${path}:`, error)
      // Continue with other projects
    }
  }

  logger.success(`Batch analysis completed: ${results.length}/${projectPaths.length} successful`)
  return results
}

/**
 * Smart Project Analyzer
 *
 * Analyzes project structure and recommends agents/skills based on:
 * - Project type (web, mobile, backend, CLI, etc.)
 * - Frameworks and libraries used
 * - Development patterns detected
 * - Testing setup
 * - Deployment configuration
 * - Documentation needs
 */

import type { ProjectAnalysis } from '../analyzers/types'
import type { GenerationContext, GenerationPreferences } from './types'
import consola from 'consola'
import { analyzeProject } from '../analyzers'

const logger = consola.withTag('smart-analyzer')

/**
 * Analyze project and build generation context
 */
export async function analyzeForGeneration(
  projectPath: string,
  preferences: Partial<GenerationPreferences> = {},
): Promise<GenerationContext> {
  logger.info('Analyzing project for smart generation...')

  // Perform deep project analysis
  const analysis = await analyzeProject(projectPath, {
    analyzeTransitiveDeps: true,
    maxFilesToScan: 10000,
  })

  // Build generation context
  const context: GenerationContext = {
    analysis,
    preferences: buildPreferences(analysis, preferences),
    existingAgents: await detectExistingAgents(projectPath),
    existingSkills: await detectExistingSkills(projectPath),
    targetDir: projectPath,
  }

  logger.success('Project analysis complete')
  logAnalysisSummary(context)

  return context
}

/**
 * Build generation preferences from analysis and user input
 */
function buildPreferences(
  analysis: ProjectAnalysis,
  userPrefs: Partial<GenerationPreferences>,
): GenerationPreferences {
  const hasTestingFramework = analysis.frameworks.some(f =>
    ['jest', 'vitest', 'mocha', 'pytest', 'go test'].includes(f.name.toLowerCase()),
  )

  const hasDeploymentConfig = analysis.configFiles.some(f =>
    ['dockerfile', 'docker-compose', '.github/workflows', 'vercel.json', 'netlify.toml'].some(pattern =>
      f.toLowerCase().includes(pattern),
    ),
  )

  const hasDocsSetup = analysis.configFiles.some(f =>
    ['readme', 'docs/', 'documentation/'].some(pattern => f.toLowerCase().includes(pattern)),
  )

  return {
    language: userPrefs.language || 'en',
    defaultModel: userPrefs.defaultModel || 'sonnet',
    includeTesting: userPrefs.includeTesting ?? hasTestingFramework,
    includeDeployment: userPrefs.includeDeployment ?? hasDeploymentConfig,
    includeDocumentation: userPrefs.includeDocumentation ?? hasDocsSetup,
    includeSecurity: userPrefs.includeSecurity ?? true,
    includePerformance: userPrefs.includePerformance ?? true,
    customCategories: userPrefs.customCategories || [],
    maxAgents: userPrefs.maxAgents || 10,
    maxSkills: userPrefs.maxSkills || 15,
  }
}

/**
 * Detect existing agents in project
 */
async function detectExistingAgents(projectPath: string): Promise<string[]> {
  const { existsSync, readdirSync } = await import('node:fs')
  const { join } = await import('node:path')

  const agentsDir = join(projectPath, '.claude', 'agents')
  if (!existsSync(agentsDir)) {
    return []
  }

  try {
    const files = readdirSync(agentsDir)
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''))
  }
  catch {
    return []
  }
}

/**
 * Detect existing skills in project
 */
async function detectExistingSkills(projectPath: string): Promise<string[]> {
  const { existsSync, readdirSync } = await import('node:fs')
  const { join } = await import('node:path')

  const skillsDir = join(projectPath, '.claude', 'skills')
  if (!existsSync(skillsDir)) {
    return []
  }

  try {
    const files = readdirSync(skillsDir)
    return files
      .filter(f => f.endsWith('.md') || f.endsWith('.json'))
      .map(f => f.replace(/\.(md|json)$/, ''))
  }
  catch {
    return []
  }
}

/**
 * Log analysis summary
 */
function logAnalysisSummary(context: GenerationContext): void {
  const { analysis, preferences } = context

  logger.info('Project Summary:')
  logger.info(`  Type: ${analysis.projectType}`)
  logger.info(`  Languages: ${analysis.languages.map(l => l.language).join(', ')}`)
  logger.info(`  Frameworks: ${analysis.frameworks.map(f => f.name).join(', ')}`)
  logger.info(`  Package Manager: ${analysis.packageManager || 'unknown'}`)
  logger.info(`  Build System: ${analysis.buildSystem || 'unknown'}`)

  logger.info('Generation Preferences:')
  logger.info(`  Language: ${preferences.language}`)
  logger.info(`  Default Model: ${preferences.defaultModel}`)
  logger.info(`  Include Testing: ${preferences.includeTesting}`)
  logger.info(`  Include Deployment: ${preferences.includeDeployment}`)
  logger.info(`  Include Documentation: ${preferences.includeDocumentation}`)
  logger.info(`  Include Security: ${preferences.includeSecurity}`)
  logger.info(`  Include Performance: ${preferences.includePerformance}`)
  logger.info(`  Max Agents: ${preferences.maxAgents}`)
  logger.info(`  Max Skills: ${preferences.maxSkills}`)

  if (context.existingAgents.length > 0) {
    logger.info(`Existing Agents: ${context.existingAgents.length}`)
  }
  if (context.existingSkills.length > 0) {
    logger.info(`Existing Skills: ${context.existingSkills.length}`)
  }
}

/**
 * Determine recommended agent categories based on project analysis
 */
export function recommendAgentCategories(analysis: ProjectAnalysis): string[] {
  const categories: string[] = []

  // Always recommend core development agents
  categories.push('code-generation', 'code-review')

  // Frontend-specific
  const frontendFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt']
  if (analysis.frameworks.some(f => frontendFrameworks.includes(f.name.toLowerCase()))) {
    categories.push('frontend-development', 'ui-ux')
  }

  // Backend-specific
  const backendFrameworks = ['express', 'fastify', 'nest', 'django', 'flask', 'gin', 'axum']
  if (analysis.frameworks.some(f => backendFrameworks.includes(f.name.toLowerCase()))) {
    categories.push('backend-development', 'api-design', 'database')
  }

  // Testing
  const testingFrameworks = ['jest', 'vitest', 'mocha', 'pytest', 'go test']
  if (analysis.frameworks.some(f => testingFrameworks.includes(f.name.toLowerCase()))) {
    categories.push('testing', 'test-automation')
  }

  // DevOps/Deployment
  const hasDocker = analysis.configFiles.some(f => f.toLowerCase().includes('dockerfile'))
  const hasCI = analysis.configFiles.some(f => f.toLowerCase().includes('.github/workflows'))
  if (hasDocker || hasCI) {
    categories.push('devops', 'deployment', 'ci-cd')
  }

  // Security
  const securityFiles = ['security.md', '.snyk', 'dependabot.yml']
  if (analysis.configFiles.some(f => securityFiles.some(sf => f.toLowerCase().includes(sf)))) {
    categories.push('security', 'vulnerability-scanning')
  }

  // Documentation
  const hasReadme = analysis.configFiles.some(f => f.toLowerCase().includes('readme'))
  const hasDocs = analysis.importantDirs.some(d => d.toLowerCase().includes('docs'))
  if (hasReadme || hasDocs) {
    categories.push('documentation', 'technical-writing')
  }

  // Performance
  const performanceTools = ['lighthouse', 'webpack-bundle-analyzer', 'benchmark']
  if (analysis.dependencies?.direct.some(d => performanceTools.includes(d.name.toLowerCase()))) {
    categories.push('performance', 'optimization')
  }

  // Mobile
  const mobileFrameworks = ['react-native', 'flutter', 'ionic']
  if (analysis.frameworks.some(f => mobileFrameworks.includes(f.name.toLowerCase()))) {
    categories.push('mobile-development')
  }

  // Data Science/ML
  const dataFrameworks = ['pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn']
  if (analysis.dependencies?.direct.some(d => dataFrameworks.includes(d.name.toLowerCase()))) {
    categories.push('data-science', 'machine-learning')
  }

  return [...new Set(categories)]
}

/**
 * Determine recommended skill categories based on project analysis
 */
export function recommendSkillCategories(analysis: ProjectAnalysis): string[] {
  const categories: string[] = []

  // Always recommend core skills
  categories.push('development', 'git')

  // Testing skills
  const hasTests = analysis.importantDirs.some(d =>
    ['test', 'tests', '__tests__', 'spec'].some(pattern => d.toLowerCase().includes(pattern)),
  )
  if (hasTests) {
    categories.push('testing')
  }

  // Deployment skills
  const hasDeployment = analysis.configFiles.some(f =>
    ['dockerfile', 'docker-compose', 'vercel.json', 'netlify.toml'].some(pattern =>
      f.toLowerCase().includes(pattern),
    ),
  )
  if (hasDeployment) {
    categories.push('deployment')
  }

  // Documentation skills
  const hasDocs = analysis.configFiles.some(f => f.toLowerCase().includes('readme'))
  if (hasDocs) {
    categories.push('documentation')
  }

  // Debugging skills
  categories.push('debugging')

  // Refactoring skills
  categories.push('refactoring')

  // Security skills
  categories.push('security')

  // Performance skills
  categories.push('performance')

  return [...new Set(categories)]
}

/**
 * CCJK Context Pack - Builder
 *
 * Builds persistent context artifacts for AI coding agents.
 */

import type { CommandInfo, ProjectIntelligence, RepoMap, StackInfo } from '../project-intelligence'

export interface ContextPack {
  projectIdentity: string
  stack: StackInfo
  commands: CommandInfo[]
  repoTopology: string
  testPolicy: string
  riskZones: string[]
  retrievalInstructions: string
  generatedAt: string
}

export interface ContextPackOptions {
  projectName?: string
  projectDescription?: string
  includeCommands?: boolean
  includeRepoMap?: boolean
  maxRepoMapDepth?: number
}

/**
 * Build context pack from project intelligence
 */
export function buildContextPack(
  intelligence: ProjectIntelligence,
  options: ContextPackOptions = {},
): ContextPack {
  const {
    projectName = 'Unknown Project',
    projectDescription = 'No description provided',
    includeCommands = true,
    includeRepoMap = true,
  } = options

  return {
    projectIdentity: buildProjectIdentity(projectName, projectDescription, intelligence.stack),
    stack: intelligence.stack,
    commands: includeCommands ? intelligence.commands : [],
    repoTopology: includeRepoMap ? buildRepoTopology(intelligence.repoMap) : '',
    testPolicy: buildTestPolicy(intelligence.commands),
    riskZones: identifyRiskZones(intelligence.repoMap),
    retrievalInstructions: buildRetrievalInstructions(intelligence.stack),
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Build project identity section
 */
function buildProjectIdentity(
  name: string,
  description: string,
  stack: StackInfo,
): string {
  const parts = [
    `Project: ${name}`,
    `Description: ${description}`,
    '',
  ]

  if (stack.languages.length > 0) {
    parts.push(`Languages: ${stack.languages.join(', ')}`)
  }

  if (stack.frameworks.length > 0) {
    const frameworkList = stack.frameworks
      .map(f => `${f.name}${f.version ? ` ${f.version}` : ''}`)
      .join(', ')
    parts.push(`Frameworks: ${frameworkList}`)
  }

  if (stack.packageManager) {
    parts.push(`Package Manager: ${stack.packageManager}`)
  }

  if (stack.runtime) {
    parts.push(`Runtime: ${stack.runtime}`)
  }

  return parts.join('\n')
}

/**
 * Build repository topology summary
 */
function buildRepoTopology(repoMap: RepoMap): string {
  const parts = ['Repository Structure:', '']

  // Group by type
  const byType = new Map<string, typeof repoMap.directories>()
  for (const dir of repoMap.directories) {
    const dirs = byType.get(dir.type) || []
    dirs.push(dir)
    byType.set(dir.type, dirs)
  }

  // Format each type
  const typeOrder: Array<typeof repoMap.directories[0]['type']> = [
    'source',
    'test',
    'config',
    'docs',
    'assets',
    'other',
  ]

  for (const type of typeOrder) {
    const dirs = byType.get(type)
    if (dirs && dirs.length > 0) {
      parts.push(`${type.toUpperCase()}:`)
      for (const dir of dirs.slice(0, 5)) {
        // Limit to top 5 per type
        parts.push(`  - ${dir.relativePath} (${dir.fileCount} files)`)
      }
      parts.push('')
    }
  }

  parts.push(`Total: ${repoMap.totalFiles} files`)

  return parts.join('\n')
}

/**
 * Build test policy section
 */
function buildTestPolicy(commands: CommandInfo[]): string {
  const testCommands = commands.filter(c => c.type === 'test')

  if (testCommands.length === 0) {
    return 'No test commands detected. Consider adding tests before making changes.'
  }

  const parts = [
    'Test Policy:',
    '',
    'Available test commands:',
  ]

  for (const cmd of testCommands) {
    parts.push(`  - ${cmd.name}: ${cmd.command}`)
  }

  parts.push('')
  parts.push('Always run tests before committing changes.')

  return parts.join('\n')
}

/**
 * Identify risk zones in repository
 */
function identifyRiskZones(repoMap: RepoMap): string[] {
  const riskZones: string[] = []

  // Build output directories
  const buildDirs = repoMap.directories.filter(d => d.type === 'build')
  for (const dir of buildDirs) {
    riskZones.push(`${dir.relativePath} (generated files)`)
  }

  // Large directories
  const largeDirs = repoMap.directories
    .filter(d => d.fileCount > 100)
    .sort((a, b) => b.fileCount - a.fileCount)
    .slice(0, 3)

  for (const dir of largeDirs) {
    riskZones.push(`${dir.relativePath} (${dir.fileCount} files - high complexity)`)
  }

  return riskZones
}

/**
 * Build retrieval instructions
 */
function buildRetrievalInstructions(stack: StackInfo): string {
  const parts = [
    'Retrieval-First Instructions:',
    '',
  ]

  if (stack.frameworks.length > 0) {
    parts.push('For framework-specific questions:')
    for (const framework of stack.frameworks) {
      parts.push(`  - ${framework.name}: Check local docs or official documentation for version ${framework.version || 'latest'}`)
    }
    parts.push('')
  }

  parts.push('For repository conventions:')
  parts.push('  - Check existing code patterns before implementing new features')
  parts.push('  - Review test files to understand testing conventions')
  parts.push('  - Consult configuration files for build and deployment settings')

  return parts.join('\n')
}

/**
 * CCJK Project Intelligence
 *
 * Extracts repository facts and conventions to improve agent reliability.
 */

import type { CommandInfo } from './command-detector'
import type { RepoMap } from './repo-map'
import type { StackInfo } from './stack-detector'
import { detectCommands } from './command-detector'
import { mapRepository } from './repo-map'
import { detectStack } from './stack-detector'

export * from './command-detector'
export * from './repo-map'
export * from './stack-detector'

/**
 * Complete project intelligence report
 */
export interface ProjectIntelligence {
  stack: StackInfo
  commands: CommandInfo[]
  repoMap: RepoMap
  timestamp: string
}

/**
 * Analyze project and gather all intelligence
 */
export async function analyzeProject(projectRoot = '.'): Promise<ProjectIntelligence> {
  const [stack, commands, repoMap] = await Promise.all([
    detectStack(projectRoot),
    detectCommands(projectRoot),
    mapRepository(projectRoot),
  ])

  return {
    stack,
    commands,
    repoMap,
    timestamp: new Date().toISOString(),
  }
}

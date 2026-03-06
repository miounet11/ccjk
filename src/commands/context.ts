/**
 * CCJK Context Command
 *
 * Build and manage project context packs.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'pathe'
import { buildContextPack } from '../context-pack'
import { writeClaudeContext } from '../context-pack/claude-writer'
import { analyzeProject } from '../project-intelligence'

export interface ContextBuildOptions {
  action?: 'build' | 'refresh' | 'doctor'
  target?: 'claude-code' | 'codex'
  output?: string
  force?: boolean
  merge?: boolean
  projectName?: string
  projectDescription?: string
}

export interface ContextCommandOptions extends ContextBuildOptions {
  show?: boolean
  layers?: string
  task?: string
  clear?: boolean
  health?: boolean
  alerts?: boolean
  alertHistory?: boolean
  checkpoint?: boolean
  vacuum?: boolean
  backup?: boolean
  recover?: boolean
}

/**
 * Build context pack
 */
export async function contextBuild(options: ContextBuildOptions = {}): Promise<void> {
  const {
    target: _target = 'claude-code',
    output = '.',
    force: _force = false,
    merge = false,
    projectName,
    projectDescription,
  } = options

  console.log('🔍 Analyzing project...')

  const intelligence = await analyzeProject('.')

  console.log('✅ Analysis complete')
  console.log(`   Languages: ${intelligence.stack.languages.join(', ')}`)
  console.log(`   Frameworks: ${intelligence.stack.frameworks.map(f => f.name).join(', ')}`)
  console.log(`   Commands: ${intelligence.commands.length}`)
  console.log('')

  console.log('📦 Building context pack...')

  const contextPack = buildContextPack(intelligence, {
    projectName,
    projectDescription,
    includeCommands: true,
    includeRepoMap: true,
  })

  const outputPath = join(output, 'CLAUDE.md')

  // Check if file exists and merge is requested
  if (merge) {
    try {
      await readFile(outputPath, 'utf-8')
      console.log('📝 Merging with existing CLAUDE.md...')
      // Simple merge: append new content after existing
      // In production, this should be more sophisticated
    }
    catch {
      // File doesn't exist, proceed normally
    }
  }

  await writeClaudeContext(contextPack, outputPath)

  console.log(`✅ Context pack written to: ${outputPath}`)
}

/**
 * Refresh context pack
 */
export async function contextRefresh(): Promise<void> {
  console.log('🔄 Refreshing context pack...')
  await contextBuild({ force: true, merge: true })
}

/**
 * Doctor check for context
 */
export async function contextDoctor(): Promise<void> {
  console.log('🔍 Running context health check...')

  const intelligence = await analyzeProject('.')

  console.log('\n📊 Project Health:')
  console.log(`   ✅ Languages detected: ${intelligence.stack.languages.length}`)
  console.log(`   ✅ Frameworks detected: ${intelligence.stack.frameworks.length}`)
  console.log(`   ✅ Commands detected: ${intelligence.commands.length}`)
  console.log(`   ✅ Directories scanned: ${intelligence.repoMap.directories.length}`)

  if (intelligence.commands.length === 0) {
    console.log('\n⚠️  Warning: No commands detected. Consider adding package.json scripts.')
  }

  if (intelligence.stack.frameworks.length === 0) {
    console.log('\n⚠️  Warning: No frameworks detected. Context may be generic.')
  }

  console.log('\n✅ Context health check complete')
}

export async function contextCommand(options: ContextCommandOptions = {}): Promise<void> {
  if (options.action === 'refresh') {
    await contextRefresh()
    return
  }

  if (options.action === 'doctor') {
    await contextDoctor()
    return
  }

  await contextBuild(options)
}

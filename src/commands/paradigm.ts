/**
 * Paradigm Command
 *
 * Detect and display project file system paradigm.
 *
 * @module commands/paradigm
 */

import ansis from 'ansis'
import { fsParadigm } from '../brain/fs-paradigm'
import type { FileRole } from '../brain/fs-paradigm'

export interface ParadigmOptions {
  verbose?: boolean
  role?: string
}

/**
 * Paradigm command handler
 */
export async function paradigmCommand(options: ParadigmOptions = {}): Promise<void> {
  console.log(ansis.cyan.bold('\n🏗️  Detecting Project Paradigm...\n'))

  const structure = await fsParadigm.detect(process.cwd())

  // Show paradigm info
  const paradigm = fsParadigm.getParadigm(structure.paradigm)
  if (paradigm) {
    console.log(ansis.white.bold(`Type: ${paradigm.name}`))
    console.log(ansis.gray(`Description: ${paradigm.description}`))
    console.log(ansis.gray(`Confidence: ${structure.confidence}%`))
    console.log()
  }

  // Show conventions
  console.log(ansis.cyan.bold('📁 Conventions:'))
  if (structure.conventions.sourceDir) {
    console.log(ansis.white(`  Source:  ${structure.conventions.sourceDir}`))
  }
  if (structure.conventions.testDir) {
    console.log(ansis.white(`  Test:    ${structure.conventions.testDir}`))
  }
  if (structure.conventions.configDir) {
    console.log(ansis.white(`  Config:  ${structure.conventions.configDir}`))
  }
  if (structure.conventions.buildDir) {
    console.log(ansis.white(`  Build:   ${structure.conventions.buildDir}`))
  }
  console.log()

  // Show file map
  if (options.role) {
    // Show specific role
    const role = options.role as FileRole
    const files = fsParadigm.getFilesByRole(structure, role)

    console.log(ansis.cyan.bold(`📄 ${role.toUpperCase()} Files (${files.length}):\n`))

    if (files.length === 0) {
      console.log(ansis.gray('  No files found for this role\n'))
    }
    else {
      for (const file of files.slice(0, 20)) {
        console.log(ansis.white(`  • ${file.replace(process.cwd(), '')}`))
      }

      if (files.length > 20) {
        console.log(ansis.gray(`  ... and ${files.length - 20} more`))
      }
      console.log()
    }
  }
  else {
    // Show summary
    console.log(ansis.cyan.bold('📊 File Map:'))

    const roles: FileRole[] = ['source', 'test', 'config', 'types', 'docs', 'assets']
    for (const role of roles) {
      const files = fsParadigm.getFilesByRole(structure, role)
      if (files.length > 0) {
        console.log(ansis.white(`  ${role.padEnd(10)} ${files.length} files`))
      }
    }
    console.log()

    if (options.verbose) {
      console.log(ansis.gray('Use --role <role> to see specific files'))
      console.log(ansis.gray('Available roles: source, test, config, types, docs, assets'))
      console.log()
    }
  }

  // Show patterns (verbose mode)
  if (options.verbose && paradigm) {
    console.log(ansis.cyan.bold('🔍 Patterns:'))
    for (const pattern of paradigm.patterns) {
      console.log(ansis.white(`  ${pattern.role.padEnd(10)} ${pattern.pattern}`))
      console.log(ansis.gray(`             ${pattern.description}`))
    }
    console.log()
  }
}

/**
 * CCJK Project Intelligence - Command Detector
 *
 * Detects available commands in a project (build, test, lint, etc.).
 */

import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { join } from 'pathe'

export interface CommandInfo {
  name: string
  command: string
  type: 'build' | 'test' | 'lint' | 'dev' | 'start' | 'deploy' | 'other'
  description?: string
}

/**
 * Detect available commands in project
 */
export async function detectCommands(projectRoot = '.'): Promise<CommandInfo[]> {
  const commands: CommandInfo[] = []

  // Check package.json scripts
  const packageJsonPath = join(projectRoot, 'package.json')
  if (await fileExists(packageJsonPath)) {
    commands.push(...await detectNpmScripts(packageJsonPath))
  }

  // Check Makefile
  const makefilePath = join(projectRoot, 'Makefile')
  if (await fileExists(makefilePath)) {
    commands.push(...await detectMakeTargets(makefilePath))
  }

  // Check pyproject.toml
  const pyprojectPath = join(projectRoot, 'pyproject.toml')
  if (await fileExists(pyprojectPath)) {
    commands.push(...await detectPoetryScripts(pyprojectPath))
  }

  return commands
}

/**
 * Detect npm/pnpm/yarn scripts
 */
async function detectNpmScripts(packageJsonPath: string): Promise<CommandInfo[]> {
  const commands: CommandInfo[] = []

  try {
    const content = await readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)

    if (packageJson.scripts) {
      for (const [name, command] of Object.entries(packageJson.scripts)) {
        commands.push({
          name,
          command: command as string,
          type: inferCommandType(name),
        })
      }
    }
  }
  catch {
    // Ignore errors
  }

  return commands
}

/**
 * Detect Makefile targets
 */
async function detectMakeTargets(makefilePath: string): Promise<CommandInfo[]> {
  const commands: CommandInfo[] = []

  try {
    const content = await readFile(makefilePath, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      // Match target definitions (e.g., "build:", "test:")
      const match = line.match(/^([\w-]+):\s*(.*)/)
      if (match) {
        const [, name, deps] = match
        // Skip special targets
        if (!name.startsWith('.') && name !== 'PHONY') {
          commands.push({
            name,
            command: `make ${name}`,
            type: inferCommandType(name),
            description: deps || undefined,
          })
        }
      }
    }
  }
  catch {
    // Ignore errors
  }

  return commands
}

/**
 * Detect Poetry scripts from pyproject.toml
 */
async function detectPoetryScripts(pyprojectPath: string): Promise<CommandInfo[]> {
  const commands: CommandInfo[] = []

  try {
    const content = await readFile(pyprojectPath, 'utf-8')

    // Simple TOML parsing for [tool.poetry.scripts] section
    const scriptsMatch = content.match(/\[tool\.poetry\.scripts\]([\s\S]*?)(?:\[|$)/)
    if (scriptsMatch) {
      const scriptsSection = scriptsMatch[1]
      const lines = scriptsSection.split('\n')

      for (const line of lines) {
        const match = line.match(/^([\w-]+)\s*=\s*"([^"]+)"/)
        if (match) {
          const [, name, command] = match
          commands.push({
            name,
            command,
            type: inferCommandType(name),
          })
        }
      }
    }
  }
  catch {
    // Ignore errors
  }

  return commands
}

/**
 * Infer command type from name
 */
function inferCommandType(name: string): CommandInfo['type'] {
  const lowerName = name.toLowerCase()

  if (lowerName.includes('build') || lowerName.includes('compile')) {
    return 'build'
  }
  if (lowerName.includes('test') || lowerName.includes('spec')) {
    return 'test'
  }
  if (lowerName.includes('lint') || lowerName.includes('format')) {
    return 'lint'
  }
  if (lowerName.includes('dev') || lowerName.includes('watch')) {
    return 'dev'
  }
  if (lowerName.includes('start') || lowerName.includes('serve')) {
    return 'start'
  }
  if (lowerName.includes('deploy') || lowerName.includes('publish')) {
    return 'deploy'
  }

  return 'other'
}

/**
 * Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  }
  catch {
    return false
  }
}

/**
 * Get command by type
 */
export function getCommandsByType(
  commands: CommandInfo[],
  type: CommandInfo['type'],
): CommandInfo[] {
  return commands.filter(c => c.type === type)
}

/**
 * Get primary build command
 */
export function getPrimaryBuildCommand(commands: CommandInfo[]): string | null {
  const buildCommands = getCommandsByType(commands, 'build')
  return buildCommands[0]?.command || null
}

/**
 * Get primary test command
 */
export function getPrimaryTestCommand(commands: CommandInfo[]): string | null {
  const testCommands = getCommandsByType(commands, 'test')
  return testCommands[0]?.command || null
}

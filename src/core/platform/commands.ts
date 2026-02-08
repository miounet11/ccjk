/**
 * Platform Abstraction Layer - Command Execution Adapter
 *
 * Provides cross-platform command execution with shell escaping,
 * command mapping, and environment variable injection.
 *
 * @module core/platform/commands
 * @since v8.3.0
 */

import type { SpawnOptions } from 'node:child_process'
import type {
  CommandMapping,
  CommandOptions,
  CommandResult,
  ShellEscapeOptions,
  ShellType,
} from './types'
import { exec, execSync, spawn } from 'node:child_process'

import { promisify } from 'node:util'
import { getPlatformInfo } from './detector'

const execAsync = promisify(exec)

// ============================================================================
// Command Mappings
// ============================================================================

/**
 * Cross-platform command mappings
 */
const COMMAND_MAPPINGS: CommandMapping[] = [
  {
    name: 'which',
    windows: 'where',
    unix: 'which',
  },
  {
    name: 'clear',
    windows: 'cls',
    unix: 'clear',
  },
  {
    name: 'copy',
    windows: 'copy',
    unix: 'cp',
  },
  {
    name: 'move',
    windows: 'move',
    unix: 'mv',
  },
  {
    name: 'remove',
    windows: 'del',
    unix: 'rm',
  },
  {
    name: 'removeDir',
    windows: 'rmdir /s /q',
    unix: 'rm -rf',
  },
  {
    name: 'list',
    windows: 'dir',
    unix: 'ls',
  },
  {
    name: 'cat',
    windows: 'type',
    unix: 'cat',
  },
  {
    name: 'echo',
    windows: 'echo',
    unix: 'echo',
  },
  {
    name: 'env',
    windows: 'set',
    unix: 'env',
  },
  {
    name: 'null',
    windows: 'NUL',
    unix: '/dev/null',
  },
  {
    name: 'pathSeparator',
    windows: ';',
    unix: ':',
  },
  {
    name: 'home',
    windows: '%USERPROFILE%',
    unix: '$HOME',
  },
  {
    name: 'open',
    windows: 'start',
    unix: 'open', // macOS; Linux uses xdg-open
    transformArgs: (args, os) => {
      if (os === 'linux') {
        return ['xdg-open', ...args]
      }
      return args
    },
  },
  {
    name: 'kill',
    windows: 'taskkill /F /PID',
    unix: 'kill -9',
  },
  {
    name: 'ps',
    windows: 'tasklist',
    unix: 'ps aux',
  },
  {
    name: 'hostname',
    windows: 'hostname',
    unix: 'hostname',
  },
  {
    name: 'whoami',
    windows: 'whoami',
    unix: 'whoami',
  },
]

/**
 * Get the platform-specific command for a cross-platform command name
 *
 * @param commandName - Cross-platform command name
 * @returns Platform-specific command or null if not found
 */
export function getCommand(commandName: string): string | null {
  const platform = getPlatformInfo()
  const mapping = COMMAND_MAPPINGS.find(m => m.name === commandName)

  if (!mapping) {
    return null
  }

  return platform.os === 'windows' ? mapping.windows : mapping.unix
}

/**
 * Get all available command mappings
 *
 * @returns Array of command mappings
 */
export function getCommandMappings(): CommandMapping[] {
  return [...COMMAND_MAPPINGS]
}

/**
 * Register a custom command mapping
 *
 * @param mapping - Command mapping to register
 */
export function registerCommandMapping(mapping: CommandMapping): void {
  const existingIndex = COMMAND_MAPPINGS.findIndex(m => m.name === mapping.name)
  if (existingIndex >= 0) {
    COMMAND_MAPPINGS[existingIndex] = mapping
  }
  else {
    COMMAND_MAPPINGS.push(mapping)
  }
}

// ============================================================================
// Shell Escaping
// ============================================================================

/**
 * Escape a string for safe use in shell commands
 *
 * @param value - String to escape
 * @param options - Escape options
 * @returns Escaped string
 */
export function escapeShell(
  value: string,
  options: ShellEscapeOptions = { shell: 'bash' },
): string {
  if (!value)
    return value

  const { shell, quote = true, doubleQuoted = false } = options

  switch (shell) {
    case 'powershell':
      return escapePowerShell(value, quote)
    case 'cmd':
      return escapeCmd(value, quote)
    case 'bash':
    case 'zsh':
    case 'sh':
    case 'fish':
    default:
      return escapeBash(value, quote, doubleQuoted)
  }
}

/**
 * Escape for Bash/Zsh/POSIX shells
 */
function escapeBash(value: string, quote: boolean, doubleQuoted: boolean): string {
  if (doubleQuoted) {
    // Inside double quotes, escape: $ ` \ " !
    const escaped = value.replace(/[$`\\"!]/g, '\\$&')
    return quote ? `"${escaped}"` : escaped
  }

  // Use single quotes for maximum safety
  // Single quotes preserve everything except single quotes themselves
  if (quote) {
    // Replace ' with '\'' (end quote, escaped quote, start quote)
    const escaped = value.replace(/'/g, '\'\\\'\'')
    return `'${escaped}'`
  }

  // Without quotes, escape special characters
  return value.replace(/([\\'"$`!*?#~<>|;&(){}[\]\s])/g, '\\$1')
}

/**
 * Escape for PowerShell
 */
function escapePowerShell(value: string, quote: boolean): string {
  // PowerShell uses backtick for escaping
  // Special characters: ` $ " ' # @
  const escaped = value
    .replace(/`/g, '``')
    .replace(/\$/g, '`$')
    .replace(/"/g, '`"')

  if (quote) {
    return `"${escaped}"`
  }

  return escaped
}

/**
 * Escape for Windows CMD
 */
function escapeCmd(value: string, quote: boolean): string {
  // CMD uses ^ for escaping special characters
  // Special characters: & | < > ^ " %
  let escaped = value
    .replace(/\^/g, '^^')
    .replace(/&/g, '^&')
    .replace(/\|/g, '^|')
    .replace(/</g, '^<')
    .replace(/>/g, '^>')
    .replace(/"/g, '""')

  // Escape percent signs (environment variables)
  escaped = escaped.replace(/%/g, '%%')

  if (quote) {
    return `"${escaped}"`
  }

  return escaped
}

/**
 * Escape an array of arguments for shell execution
 *
 * @param args - Arguments to escape
 * @param shell - Target shell type
 * @returns Escaped arguments joined with spaces
 */
export function escapeArgs(args: string[], shell?: ShellType): string {
  const targetShell = shell || getPlatformInfo().shell
  return args.map(arg => escapeShell(arg, { shell: targetShell })).join(' ')
}

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Get environment variable reference for the current shell
 *
 * @param name - Variable name
 * @returns Shell-specific variable reference
 */
export function getEnvVarRef(name: string): string {
  const platform = getPlatformInfo()

  switch (platform.shell) {
    case 'cmd':
      return `%${name}%`
    case 'powershell':
      return `$env:${name}`
    default:
      return `$${name}`
  }
}

/**
 * Build environment variable assignment for the current shell
 *
 * @param name - Variable name
 * @param value - Variable value
 * @returns Shell-specific assignment statement
 */
export function buildEnvAssignment(name: string, value: string): string {
  const platform = getPlatformInfo()
  const escapedValue = escapeShell(value, { shell: platform.shell })

  switch (platform.shell) {
    case 'cmd':
      return `set ${name}=${escapedValue}`
    case 'powershell':
      return `$env:${name} = ${escapedValue}`
    default:
      return `export ${name}=${escapedValue}`
  }
}

/**
 * Build a command with environment variables prepended
 *
 * @param command - Command to run
 * @param env - Environment variables to set
 * @returns Command with environment variables
 */
export function buildCommandWithEnv(
  command: string,
  env: Record<string, string>,
): string {
  const platform = getPlatformInfo()
  const entries = Object.entries(env)

  if (entries.length === 0) {
    return command
  }

  if (platform.os === 'windows') {
    if (platform.shell === 'powershell') {
      // PowerShell: set variables then run command
      const assignments = entries
        .map(([k, v]) => `$env:${k} = ${escapeShell(v, { shell: 'powershell' })}`)
        .join('; ')
      return `${assignments}; ${command}`
    }
    // CMD: use set and &&
    const assignments = entries
      .map(([k, v]) => `set ${k}=${v}`)
      .join(' && ')
    return `${assignments} && ${command}`
  }

  // Unix: prepend env vars
  const envPrefix = entries
    .map(([k, v]) => `${k}=${escapeShell(v, { shell: platform.shell })}`)
    .join(' ')
  return `${envPrefix} ${command}`
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Get the shell command and arguments for execution
 *
 * @param shell - Shell type
 * @returns Shell command and flag for executing commands
 */
function _getShellCommand(shell: ShellType): { cmd: string, flag: string } {
  switch (shell) {
    case 'powershell':
      return { cmd: 'powershell.exe', flag: '-Command' }
    case 'cmd':
      return { cmd: 'cmd.exe', flag: '/c' }
    case 'zsh':
      return { cmd: 'zsh', flag: '-c' }
    case 'fish':
      return { cmd: 'fish', flag: '-c' }
    case 'sh':
      return { cmd: 'sh', flag: '-c' }
    case 'bash':
    default:
      return { cmd: 'bash', flag: '-c' }
  }
}

/**
 * Execute a command asynchronously
 *
 * @param command - Command to execute
 * @param options - Execution options
 * @returns Command result
 */
export async function executeCommand(
  command: string,
  options: CommandOptions = {},
): Promise<CommandResult> {
  const _platform = getPlatformInfo()
  const startTime = Date.now()

  const {
    cwd = process.cwd(),
    env = {},
    timeout = 30000,
    shell = true,
    encoding = 'utf8',
    throwOnError = false,
    maxBuffer = 10 * 1024 * 1024, // 10MB
  } = options

  // Merge environment variables
  const mergedEnv = { ...process.env, ...env }

  const execOptions: any = {
    cwd,
    env: mergedEnv,
    timeout,
    encoding,
    maxBuffer,
  }

  // Set shell only if it's not false
  if (shell !== false) {
    execOptions.shell = shell === true ? undefined : shell
  }

  try {
    const { stdout, stderr } = await execAsync(command, execOptions)

    return {
      exitCode: 0,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      success: true,
      durationMs: Date.now() - startTime,
    }
  }
  catch (error: unknown) {
    const execError = error as {
      code?: number
      stdout?: string
      stderr?: string
      signal?: NodeJS.Signals
      killed?: boolean
    }

    const result: CommandResult = {
      exitCode: execError.code ?? 1,
      stdout: execError.stdout?.toString() ?? '',
      stderr: execError.stderr?.toString() ?? '',
      success: false,
      durationMs: Date.now() - startTime,
      signal: execError.signal,
    }

    if (throwOnError) {
      const err = new Error(`Command failed: ${command}`)
      Object.assign(err, result)
      throw err
    }

    return result
  }
}

/**
 * Execute a command synchronously
 *
 * @param command - Command to execute
 * @param options - Execution options
 * @returns Command result
 */
export function executeCommandSync(
  command: string,
  options: CommandOptions = {},
): CommandResult {
  const startTime = Date.now()

  const {
    cwd = process.cwd(),
    env = {},
    timeout = 30000,
    shell = true,
    encoding = 'utf8',
    throwOnError = false,
    maxBuffer = 10 * 1024 * 1024,
  } = options

  const mergedEnv = { ...process.env, ...env }

  const execOptions: any = {
    cwd,
    env: mergedEnv,
    timeout,
    encoding,
    maxBuffer,
    stdio: ['pipe', 'pipe', 'pipe'],
  }

  // Set shell only if it's not false
  if (shell !== false) {
    execOptions.shell = shell === true ? undefined : shell
  }

  try {
    const stdout = execSync(command, execOptions)

    return {
      exitCode: 0,
      stdout: stdout.toString(),
      stderr: '',
      success: true,
      durationMs: Date.now() - startTime,
    }
  }
  catch (error: unknown) {
    const execError = error as {
      status?: number
      stdout?: Buffer
      stderr?: Buffer
      signal?: NodeJS.Signals
    }

    const result: CommandResult = {
      exitCode: execError.status ?? 1,
      stdout: execError.stdout?.toString() ?? '',
      stderr: execError.stderr?.toString() ?? '',
      success: false,
      durationMs: Date.now() - startTime,
      signal: execError.signal,
    }

    if (throwOnError) {
      const err = new Error(`Command failed: ${command}`)
      Object.assign(err, result)
      throw err
    }

    return result
  }
}

/**
 * Spawn a command with streaming output
 *
 * @param command - Command to spawn
 * @param args - Command arguments
 * @param options - Spawn options
 * @returns Promise that resolves with command result
 */
export function spawnCommand(
  command: string,
  args: string[] = [],
  options: CommandOptions = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const _platform = getPlatformInfo()

    const {
      cwd = process.cwd(),
      env = {},
      timeout = 0,
      shell = false,
      throwOnError = false,
    } = options

    const mergedEnv = { ...process.env, ...env }

    const spawnOptions: SpawnOptions = {
      cwd,
      env: mergedEnv,
      shell: shell === true ? true : shell || false,
      stdio: ['pipe', 'pipe', 'pipe'],
    }

    const child = spawn(command, args, spawnOptions)

    let stdout = ''
    let stderr = ''
    let timeoutId: NodeJS.Timeout | undefined

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
      }, timeout)
    }

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code, signal) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const result: CommandResult = {
        exitCode: code ?? 1,
        stdout,
        stderr,
        success: code === 0,
        durationMs: Date.now() - startTime,
        signal: signal ?? undefined,
      }

      if (throwOnError && !result.success) {
        const err = new Error(`Command failed: ${command}`)
        Object.assign(err, result)
        reject(err)
      }
      else {
        resolve(result)
      }
    })

    child.on('error', (error) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const result: CommandResult = {
        exitCode: 1,
        stdout,
        stderr: error.message,
        success: false,
        durationMs: Date.now() - startTime,
      }

      if (throwOnError) {
        reject(error)
      }
      else {
        resolve(result)
      }
    })
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a command exists on the system
 *
 * @param command - Command to check
 * @returns True if command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  const platform = getPlatformInfo()
  const whichCmd = platform.os === 'windows' ? 'where' : 'which'

  try {
    const result = await executeCommand(`${whichCmd} ${escapeShell(command, { shell: platform.shell })}`)
    return result.success
  }
  catch {
    return false
  }
}

/**
 * Check if a command exists (synchronous)
 *
 * @param command - Command to check
 * @returns True if command exists
 */
export function commandExistsSync(command: string): boolean {
  const platform = getPlatformInfo()
  const whichCmd = platform.os === 'windows' ? 'where' : 'which'

  try {
    const result = executeCommandSync(`${whichCmd} ${escapeShell(command, { shell: platform.shell })}`)
    return result.success
  }
  catch {
    return false
  }
}

/**
 * Get the full path to a command
 *
 * @param command - Command to find
 * @returns Full path or null if not found
 */
export async function getCommandPath(command: string): Promise<string | null> {
  const platform = getPlatformInfo()
  const whichCmd = platform.os === 'windows' ? 'where' : 'which'

  try {
    const result = await executeCommand(`${whichCmd} ${escapeShell(command, { shell: platform.shell })}`)
    if (result.success && result.stdout.trim()) {
      // Windows 'where' may return multiple lines, take the first
      return result.stdout.trim().split('\n')[0].trim()
    }
    return null
  }
  catch {
    return null
  }
}

/**
 * Build a cross-platform command string
 *
 * @param commandName - Cross-platform command name
 * @param args - Command arguments
 * @returns Platform-specific command string
 */
export function buildCommand(commandName: string, args: string[] = []): string {
  const platform = getPlatformInfo()
  const mapping = COMMAND_MAPPINGS.find(m => m.name === commandName)

  let cmd: string
  let finalArgs = args

  if (mapping) {
    cmd = platform.os === 'windows' ? mapping.windows : mapping.unix
    if (mapping.transformArgs) {
      finalArgs = mapping.transformArgs(args, platform.os)
    }
  }
  else {
    cmd = commandName
  }

  if (finalArgs.length === 0) {
    return cmd
  }

  return `${cmd} ${escapeArgs(finalArgs, platform.shell)}`
}

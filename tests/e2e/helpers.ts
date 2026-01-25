/**
 * E2E Test Helper Functions
 * Provides utilities for running CCJK commands and validating results
 */

import type { SpawnOptions } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { resolve } from 'pathe'
import { getE2EEnvironment, registerProcess } from './setup'

// ============================================================================
// Types
// ============================================================================

export interface RunCcjkOptions {
  /** Simulated user input lines */
  input?: string[]
  /** Additional environment variables */
  env?: Record<string, string>
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Working directory */
  cwd?: string
  /** Whether to capture output in real-time */
  realtime?: boolean
}

export interface RunCcjkResult {
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** Exit code */
  exitCode: number
  /** Whether the command timed out */
  timedOut: boolean
  /** Execution duration in ms */
  duration: number
}

export interface WaitForOptions {
  /** Timeout in milliseconds */
  timeout?: number
  /** Polling interval in milliseconds */
  interval?: number
  /** Error message on timeout */
  message?: string
}

export interface FileAssertion {
  path: string
  exists?: boolean
  contains?: string | string[]
  matches?: RegExp
  json?: Record<string, any>
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Run CCJK CLI command with options
 */
export async function runCcjk(
  args: string[],
  options: RunCcjkOptions = {},
): Promise<RunCcjkResult> {
  const {
    input = [],
    env = {},
    timeout = 30000,
    cwd,
    realtime = false,
  } = options

  const e2eEnv = getE2EEnvironment()
  const startTime = Date.now()

  // Determine the ccjk executable path
  const ccjkPath = resolve(e2eEnv.originalCwd, 'bin/ccjk.mjs')
  const nodeArgs = [ccjkPath, ...args]

  const spawnOptions: SpawnOptions = {
    cwd: cwd || process.cwd(),
    env: {
      ...process.env,
      ...env,
      NODE_ENV: 'test',
      CCJK_E2E_TEST: 'true',
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  }

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let inputIndex = 0

    const proc = spawn('node', nodeArgs, spawnOptions)
    registerProcess(proc)

    // Handle stdout
    proc.stdout?.on('data', (data) => {
      const chunk = data.toString()
      stdout += chunk
      if (realtime) {
        process.stdout.write(`[stdout] ${chunk}`)
      }

      // Send next input if available
      if (inputIndex < input.length) {
        // Check if we should send input (e.g., after a prompt)
        setTimeout(() => {
          if (proc.stdin?.writable && inputIndex < input.length) {
            proc.stdin.write(`${input[inputIndex]}\n`)
            inputIndex++
          }
        }, 100)
      }
    })

    // Handle stderr
    proc.stderr?.on('data', (data) => {
      const chunk = data.toString()
      stderr += chunk
      if (realtime) {
        process.stderr.write(`[stderr] ${chunk}`)
      }
    })

    // Setup timeout
    const timeoutId = setTimeout(() => {
      timedOut = true
      proc.kill('SIGKILL')
    }, timeout)

    // Handle process exit
    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      resolve({
        stdout,
        stderr,
        exitCode: code ?? (timedOut ? 124 : 1),
        timedOut,
        duration,
      })
    })

    proc.on('error', (error) => {
      clearTimeout(timeoutId)
      const duration = Date.now() - startTime

      resolve({
        stdout,
        stderr: `${stderr}\nProcess error: ${error.message}`,
        exitCode: 1,
        timedOut: false,
        duration,
      })
    })

    // Send initial input if stdin is ready
    if (input.length > 0 && proc.stdin?.writable) {
      setTimeout(() => {
        if (proc.stdin?.writable && inputIndex < input.length) {
          proc.stdin.write(`${input[inputIndex]}\n`)
          inputIndex++
        }
      }, 500)
    }
  })
}

/**
 * Run a shell command (not ccjk)
 */
export async function runCommand(
  command: string,
  args: string[],
  options: Omit<RunCcjkOptions, 'input'> = {},
): Promise<RunCcjkResult> {
  const { env = {}, timeout = 30000, cwd, realtime = false } = options

  const startTime = Date.now()

  const spawnOptions: SpawnOptions = {
    cwd: cwd || process.cwd(),
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  }

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const proc = spawn(command, args, spawnOptions)
    registerProcess(proc)

    proc.stdout?.on('data', (data) => {
      const chunk = data.toString()
      stdout += chunk
      if (realtime) {
        process.stdout.write(chunk)
      }
    })

    proc.stderr?.on('data', (data) => {
      const chunk = data.toString()
      stderr += chunk
      if (realtime) {
        process.stderr.write(chunk)
      }
    })

    const timeoutId = setTimeout(() => {
      timedOut = true
      proc.kill('SIGKILL')
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut,
        duration: Date.now() - startTime,
      })
    })

    proc.on('error', (error) => {
      clearTimeout(timeoutId)
      resolve({
        stdout,
        stderr: `Process error: ${error.message}`,
        exitCode: 1,
        timedOut: false,
        duration: Date.now() - startTime,
      })
    })
  })
}

// ============================================================================
// Wait Utilities
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions = {},
): Promise<void> {
  const { timeout = 10000, interval = 100, message = 'Condition not met' } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return
      }
    }
    catch {
      // Condition threw, continue waiting
    }
    await sleep(interval)
  }

  throw new Error(`${message} (timeout: ${timeout}ms)`)
}

/**
 * Wait for a file to exist
 */
export async function waitForFile(
  filePath: string,
  options: WaitForOptions = {},
): Promise<void> {
  await waitFor(
    () => existsSync(filePath),
    { ...options, message: options.message || `File not found: ${filePath}` },
  )
}

/**
 * Wait for file content to match
 */
export async function waitForFileContent(
  filePath: string,
  matcher: string | RegExp,
  options: WaitForOptions = {},
): Promise<void> {
  await waitFor(
    () => {
      if (!existsSync(filePath))
        return false
      const content = readFileSync(filePath, 'utf-8')
      if (typeof matcher === 'string') {
        return content.includes(matcher)
      }
      return matcher.test(content)
    },
    { ...options, message: options.message || `File content not matched: ${filePath}` },
  )
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// File Utilities
// ============================================================================

/**
 * Assert file conditions
 */
export function assertFile(assertion: FileAssertion): void {
  const { path, exists = true, contains, matches, json } = assertion

  if (exists) {
    if (!existsSync(path)) {
      throw new Error(`Expected file to exist: ${path}`)
    }

    const content = readFileSync(path, 'utf-8')

    if (contains) {
      const patterns = Array.isArray(contains) ? contains : [contains]
      for (const pattern of patterns) {
        if (!content.includes(pattern)) {
          throw new Error(`File ${path} does not contain: ${pattern}`)
        }
      }
    }

    if (matches) {
      if (!matches.test(content)) {
        throw new Error(`File ${path} does not match pattern: ${matches}`)
      }
    }

    if (json) {
      const parsed = JSON.parse(content)
      for (const [key, value] of Object.entries(json)) {
        if (JSON.stringify(parsed[key]) !== JSON.stringify(value)) {
          throw new Error(
            `File ${path} JSON key "${key}" mismatch: expected ${JSON.stringify(value)}, got ${JSON.stringify(parsed[key])}`,
          )
        }
      }
    }
  }
  else {
    if (existsSync(path)) {
      throw new Error(`Expected file to not exist: ${path}`)
    }
  }
}

/**
 * Create a file with content
 */
export function createFile(filePath: string, content: string): void {
  const dir = resolve(filePath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, content)
}

/**
 * Read JSON file safely
 */
export function readJsonFile<T = any>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  }
  catch {
    return null
  }
}

/**
 * Write JSON file
 */
export function writeJsonFile(filePath: string, data: any): void {
  const dir = resolve(filePath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2))
}

// ============================================================================
// Output Assertions
// ============================================================================

/**
 * Assert command output contains text
 */
export function assertOutputContains(
  result: RunCcjkResult,
  text: string,
  stream: 'stdout' | 'stderr' | 'both' = 'both',
): void {
  const output
    = stream === 'both'
      ? result.stdout + result.stderr
      : stream === 'stdout'
        ? result.stdout
        : result.stderr

  if (!output.includes(text)) {
    throw new Error(
      `Expected output to contain "${text}"\n`
      + `stdout: ${result.stdout}\n`
      + `stderr: ${result.stderr}`,
    )
  }
}

/**
 * Assert command output matches pattern
 */
export function assertOutputMatches(
  result: RunCcjkResult,
  pattern: RegExp,
  stream: 'stdout' | 'stderr' | 'both' = 'both',
): void {
  const output
    = stream === 'both'
      ? result.stdout + result.stderr
      : stream === 'stdout'
        ? result.stdout
        : result.stderr

  if (!pattern.test(output)) {
    throw new Error(
      `Expected output to match ${pattern}\n`
      + `stdout: ${result.stdout}\n`
      + `stderr: ${result.stderr}`,
    )
  }
}

/**
 * Assert command succeeded
 */
export function assertSuccess(result: RunCcjkResult): void {
  if (result.exitCode !== 0) {
    throw new Error(
      `Expected command to succeed (exit code 0), got ${result.exitCode}\n`
      + `stdout: ${result.stdout}\n`
      + `stderr: ${result.stderr}`,
    )
  }
}

/**
 * Assert command failed
 */
export function assertFailure(result: RunCcjkResult, expectedCode?: number): void {
  if (result.exitCode === 0) {
    throw new Error(
      `Expected command to fail, but it succeeded\n`
      + `stdout: ${result.stdout}\n`
      + `stderr: ${result.stderr}`,
    )
  }
  if (expectedCode !== undefined && result.exitCode !== expectedCode) {
    throw new Error(
      `Expected exit code ${expectedCode}, got ${result.exitCode}\n`
      + `stdout: ${result.stdout}\n`
      + `stderr: ${result.stderr}`,
    )
  }
}

// ============================================================================
// Mock Utilities
// ============================================================================

/**
 * Create a mock MCP server configuration
 */
export function createMockMcpServer(name: string, options: {
  command?: string
  args?: string[]
  env?: Record<string, string>
} = {}): Record<string, any> {
  return {
    [name]: {
      command: options.command || 'node',
      args: options.args || ['mock-server.js'],
      env: options.env || {},
    },
  }
}

/**
 * Create a mock cloud sync configuration
 */
export function createMockCloudConfig(options: {
  provider?: string
  enabled?: boolean
  autoSync?: boolean
} = {}): Record<string, any> {
  return {
    provider: options.provider || 'local',
    enabled: options.enabled ?? false,
    autoSync: options.autoSync ?? false,
    lastSync: null,
    syncInterval: 300000,
  }
}

/**
 * Create mock user responses for interactive prompts
 */
export function createMockResponses(responses: Record<string, string>): string[] {
  return Object.values(responses)
}

// ============================================================================
// Environment Utilities
// ============================================================================

/**
 * Get platform-specific path separator
 */
export function getPathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/'
}

/**
 * Normalize path for current platform
 */
export function normalizePath(path: string): string {
  if (process.platform === 'win32') {
    return path.replace(/\//g, '\\')
  }
  return path.replace(/\\/g, '/')
}

/**
 * Check if running on specific platform
 */
export function isPlatform(platform: 'darwin' | 'linux' | 'win32'): boolean {
  return process.platform === platform
}

/**
 * Skip test on specific platforms
 */
export function skipOnPlatform(platforms: Array<'darwin' | 'linux' | 'win32'>): boolean {
  return platforms.includes(process.platform as any)
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Log debug information
 */
export function debug(message: string, data?: any): void {
  if (process.env.CCJK_E2E_DEBUG === 'true') {
    console.log(`[E2E Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }
}

/**
 * Capture and return debug snapshot
 */
export function captureSnapshot(): {
  cwd: string
  env: Record<string, string | undefined>
  files: string[]
} {
  const cwd = process.cwd()

  let files: string[] = []
  try {
    files = readdirSync(cwd)
  }
  catch {
    // Directory may not exist
  }

  return {
    cwd,
    env: {
      HOME: process.env.HOME,
      NODE_ENV: process.env.NODE_ENV,
      CCJK_E2E_TEST: process.env.CCJK_E2E_TEST,
    },
    files,
  }
}

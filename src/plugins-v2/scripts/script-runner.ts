/**
 * Script Runner
 *
 * Executes plugin scripts (bash, node, python, etc.) with:
 * - Permission-based security model
 * - Sandbox execution option
 * - Timeout handling
 * - Output capture and parsing
 *
 * @module plugins-v2/scripts/script-runner
 */

import type {
  Permission,
  ScriptDefinition,
  ScriptExecutionOptions,
  ScriptResult,
  ScriptType,
} from '../types'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_TIMEOUT = 300000 // 5 minutes
const MAX_OUTPUT_SIZE = 1024 * 1024 // 1MB

/**
 * Script interpreters for each type
 */
const SCRIPT_INTERPRETERS: Record<ScriptType, string[]> = {
  bash: ['bash', '-e'],
  node: ['node'],
  python: ['python3', '-u'],
  deno: ['deno', 'run', '--allow-all'],
  bun: ['bun', 'run'],
}

/**
 * File extensions for each script type
 */
const SCRIPT_EXTENSIONS: Record<ScriptType, string[]> = {
  bash: ['.sh', '.bash'],
  node: ['.js', '.mjs', '.cjs'],
  python: ['.py'],
  deno: ['.ts', '.js'],
  bun: ['.ts', '.js'],
}

// ============================================================================
// Script Runner Class
// ============================================================================

/**
 * Script Runner
 *
 * Executes plugin scripts with security controls and output handling
 */
export class ScriptRunner {
  private grantedPermissions: Set<Permission> = new Set()
  private runningProcesses: Map<string, { pid: number, kill: () => void }> = new Map()

  constructor() {
    // Default safe permissions
    this.grantedPermissions.add('file:read')
    this.grantedPermissions.add('git:read')
    this.grantedPermissions.add('env:read')
  }

  // ==========================================================================
  // Permission Management
  // ==========================================================================

  /**
   * Grant a permission
   */
  grantPermission(permission: Permission): void {
    this.grantedPermissions.add(permission)
  }

  /**
   * Grant multiple permissions
   */
  grantPermissions(permissions: Permission[]): void {
    for (const p of permissions) {
      this.grantedPermissions.add(p)
    }
  }

  /**
   * Revoke a permission
   */
  revokePermission(permission: Permission): void {
    this.grantedPermissions.delete(permission)
  }

  /**
   * Check if permission is granted
   */
  hasPermission(permission: Permission): boolean {
    return this.grantedPermissions.has(permission)
  }

  /**
   * Check if all required permissions are granted
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.grantedPermissions.has(p))
  }

  /**
   * Get missing permissions
   */
  getMissingPermissions(required: Permission[]): Permission[] {
    return required.filter(p => !this.grantedPermissions.has(p))
  }

  // ==========================================================================
  // Script Execution
  // ==========================================================================

  /**
   * Execute a script
   *
   * @param script - Script definition
   * @param pluginPath - Path to the plugin directory
   * @param options - Execution options
   * @returns Script execution result
   */
  async execute(
    script: ScriptDefinition,
    pluginPath: string,
    options: ScriptExecutionOptions = {},
  ): Promise<ScriptResult> {
    const startTime = Date.now()

    // Check permissions
    const missingPermissions = this.getMissingPermissions(script.permissions)
    if (missingPermissions.length > 0) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Permission denied. Missing permissions: ${missingPermissions.join(', ')}`,
        duration: 0,
      }
    }

    // Resolve script path
    const scriptPath = join(pluginPath, script.path)
    if (!existsSync(scriptPath)) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Script not found: ${scriptPath}`,
        duration: 0,
      }
    }

    // Get interpreter
    const interpreter = this.getInterpreter(script.type)
    if (!interpreter) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Unsupported script type: ${script.type}`,
        duration: 0,
      }
    }

    // Build command
    const args = [...interpreter.slice(1), scriptPath, ...(options.args ?? script.defaultArgs ?? [])]
    const command = interpreter[0]

    // Build environment
    const env = this.buildEnvironment(script, options)

    // Set working directory
    const cwd = options.cwd ?? dirname(scriptPath)

    // Set timeout
    const timeout = Math.min(options.timeout ?? script.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)

    // Execute
    try {
      const result = await this.spawn(command, args, {
        cwd,
        env,
        timeout,
        stdin: options.stdin,
        captureOutput: options.captureOutput ?? true,
        background: options.background,
        scriptId: `${script.name}-${Date.now()}`,
      })

      return {
        ...result,
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Execute a script from raw content
   */
  async executeRaw(
    content: string,
    type: ScriptType,
    options: ScriptExecutionOptions = {},
  ): Promise<ScriptResult> {
    const startTime = Date.now()

    // Check shell:execute permission for raw scripts
    if (!this.hasPermission('shell:execute')) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: 'Permission denied. shell:execute permission required for raw script execution.',
        duration: 0,
      }
    }

    // Get interpreter
    const interpreter = this.getInterpreter(type)
    if (!interpreter) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Unsupported script type: ${type}`,
        duration: 0,
      }
    }

    // For bash, we can use -c flag
    if (type === 'bash') {
      const args = ['-c', content, ...(options.args ?? [])]
      const timeout = Math.min(options.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)

      try {
        const result = await this.spawn('bash', args, {
          cwd: options.cwd,
          env: {
            ...Object.fromEntries(
              Object.entries(process.env).filter(([, v]) => v !== undefined)
            ) as Record<string, string>,
            ...options.env,
          },
          timeout,
          stdin: options.stdin,
          captureOutput: options.captureOutput ?? true,
        })

        return {
          ...result,
          duration: Date.now() - startTime,
        }
      }
      catch (error) {
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        }
      }
    }

    // For other types, write to temp file and execute
    const tempPath = join(tmpdir(), `ccjk-script-${Date.now()}${SCRIPT_EXTENSIONS[type][0]}`)
    const { writeFileSync, unlinkSync } = await import('node:fs')

    try {
      writeFileSync(tempPath, content, 'utf-8')

      const args = [...interpreter.slice(1), tempPath, ...(options.args ?? [])]
      const timeout = Math.min(options.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)

      const result = await this.spawn(interpreter[0], args, {
        cwd: options.cwd,
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([, v]) => v !== undefined)
          ) as Record<string, string>,
          ...options.env,
        },
        timeout,
        stdin: options.stdin,
        captureOutput: options.captureOutput ?? true,
      })

      return {
        ...result,
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      }
    }
    finally {
      // Clean up temp file
      try {
        unlinkSync(tempPath)
      }
      catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute inline bash command
   */
  async bash(command: string, options: ScriptExecutionOptions = {}): Promise<ScriptResult> {
    return this.executeRaw(command, 'bash', options)
  }

  // ==========================================================================
  // Process Management
  // ==========================================================================

  /**
   * Kill a running script
   */
  kill(scriptId: string): boolean {
    const process = this.runningProcesses.get(scriptId)
    if (process) {
      process.kill()
      this.runningProcesses.delete(scriptId)
      return true
    }
    return false
  }

  /**
   * Kill all running scripts
   */
  killAll(): void {
    for (const [id, process] of Array.from(this.runningProcesses.entries())) {
      process.kill()
      this.runningProcesses.delete(id)
    }
  }

  /**
   * Get running script IDs
   */
  getRunningScripts(): string[] {
    return Array.from(this.runningProcesses.keys())
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Get interpreter for script type
   */
  private getInterpreter(type: ScriptType): string[] | null {
    return SCRIPT_INTERPRETERS[type] ?? null
  }

  /**
   * Build environment variables
   */
  private buildEnvironment(
    script: ScriptDefinition,
    options: ScriptExecutionOptions,
  ): Record<string, string> {
    const env: Record<string, string> = {}

    // Copy allowed environment variables
    if (this.hasPermission('env:read')) {
      // Copy safe env vars
      const safeVars = ['PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL', 'TERM', 'NODE_ENV']
      for (const key of safeVars) {
        if (process.env[key]) {
          env[key] = process.env[key]!
        }
      }
    }

    // Add script-defined env vars
    if (script.env) {
      Object.assign(env, script.env)
    }

    // Add option-defined env vars
    if (options.env) {
      Object.assign(env, options.env)
    }

    // Add CCJK-specific vars
    env.CCJK_PLUGIN = 'true'
    env.CCJK_VERSION = '2.0'

    return env
  }

  /**
   * Spawn a process
   */
  private spawn(
    command: string,
    args: string[],
    options: {
      cwd?: string
      env?: Record<string, string>
      timeout?: number
      stdin?: string
      captureOutput?: boolean
      background?: boolean
      scriptId?: string
    },
  ): Promise<Omit<ScriptResult, 'duration'>> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      let killed = false

      const proc = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: options.captureOutput ? ['pipe', 'pipe', 'pipe'] : 'inherit',
        shell: false,
      })

      // Track running process
      if (options.scriptId) {
        this.runningProcesses.set(options.scriptId, {
          pid: proc.pid!,
          kill: () => {
            killed = true
            proc.kill('SIGTERM')
          },
        })
      }

      // Set timeout
      let timeoutId: NodeJS.Timeout | undefined
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          killed = true
          proc.kill('SIGTERM')
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill('SIGKILL')
            }
          }, 1000)
        }, options.timeout)
      }

      // Handle stdin
      if (options.stdin && proc.stdin) {
        proc.stdin.write(options.stdin)
        proc.stdin.end()
      }

      // Capture output
      if (options.captureOutput) {
        proc.stdout?.on('data', (data) => {
          const chunk = data.toString()
          if (stdout.length + chunk.length <= MAX_OUTPUT_SIZE) {
            stdout += chunk
          }
        })

        proc.stderr?.on('data', (data) => {
          const chunk = data.toString()
          if (stderr.length + chunk.length <= MAX_OUTPUT_SIZE) {
            stderr += chunk
          }
        })
      }

      // Handle completion
      proc.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        if (options.scriptId) {
          this.runningProcesses.delete(options.scriptId)
        }

        if (killed && code !== 0) {
          resolve({
            success: false,
            exitCode: code ?? -1,
            stdout,
            stderr: stderr || 'Script was killed (timeout or manual)',
          })
        }
        else {
          resolve({
            success: code === 0,
            exitCode: code ?? 0,
            stdout,
            stderr,
          })
        }
      })

      proc.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        if (options.scriptId) {
          this.runningProcesses.delete(options.scriptId)
        }

        reject(error)
      })

      // For background processes, resolve immediately
      if (options.background) {
        resolve({
          success: true,
          exitCode: 0,
          stdout: `Background process started with PID: ${proc.pid}`,
          stderr: '',
        })
      }
    })
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let runnerInstance: ScriptRunner | null = null

/**
 * Get the singleton ScriptRunner instance
 */
export function getScriptRunner(): ScriptRunner {
  if (!runnerInstance) {
    runnerInstance = new ScriptRunner()
  }
  return runnerInstance
}

/**
 * Reset the runner instance (for testing)
 */
export function resetScriptRunner(): void {
  if (runnerInstance) {
    runnerInstance.killAll()
  }
  runnerInstance = null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect script type from file extension
 */
export function detectScriptType(filePath: string): ScriptType | null {
  const ext = filePath.substring(filePath.lastIndexOf('.'))

  for (const [type, extensions] of Object.entries(SCRIPT_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type as ScriptType
    }
  }

  return null
}

/**
 * Check if a script type is supported
 */
export function isScriptTypeSupported(type: ScriptType): boolean {
  return type in SCRIPT_INTERPRETERS
}

/**
 * Get all supported script types
 */
export function getSupportedScriptTypes(): ScriptType[] {
  return Object.keys(SCRIPT_INTERPRETERS) as ScriptType[]
}

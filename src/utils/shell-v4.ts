/**
 * Modern Shell Utilities for CCJK v4.0.0
 * Uses zx for robust command execution with parallel operations and error handling
 */

import type { SupportedLang } from '../constants'
import { homedir } from 'node:os'
import { env } from 'node:process'
import { join } from 'pathe'
import { $ } from 'zx'
import { i18n } from '../i18n'
import { isTermux, isWindows } from './platform'
import { retry, withParallelSpinner, withSpinner, withTimeout } from './shell-helpers'

// Configure zx defaults
$.verbose = false // Disable verbose output by default
$.quote = (str: string) => str // Disable automatic quoting

/**
 * Result type for shell operations
 */
export interface ShellOperationResult {
  success: boolean
  message?: string
  error?: string
  data?: any
}

/**
 * Install Claude Code with parallel directory setup
 * @param _lang - Language for user messages (currently unused)
 * @returns Operation result
 */
export async function installClaudeCode(_lang: SupportedLang = 'en'): Promise<ShellOperationResult> {
  const claudeDir = join(homedir(), '.claude')
  const backupDir = join(claudeDir, 'backup')

  return withSpinner(
    i18n.t('cli:installing_claude_code'),
    async () => {
      try {
        // Parallel directory creation and package installation
        await withParallelSpinner([
          {
            label: 'Create directories',
            fn: async () => {
              await $`mkdir -p ${claudeDir}`
              await $`mkdir -p ${backupDir}`
            },
          },
          {
            label: 'Install Claude Code',
            fn: async () => {
              // Use npm with retry for network resilience
              await retry(
                async () => {
                  const result = await $`npm install -g @anthropic-ai/claude-code`.nothrow()
                  if (result.exitCode !== 0) {
                    throw new Error(`npm install failed: ${result.stderr}`)
                  }
                },
                {
                  maxAttempts: 3,
                  delayMs: 2000,
                  onRetry: (attempt, error) => {
                    console.log(`Retry attempt ${attempt}: ${error.message}`)
                  },
                },
              )
            },
          },
        ], 'Setting up Claude Code')

        return {
          success: true,
          message: i18n.t('cli:claude_code_installed'),
        }
      }
      catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
    i18n.t('cli:claude_code_installed'),
  )
}

/**
 * Clone workflow repositories in parallel
 * @param workflows - Array of workflow git URLs
 * @param targetDir - Target directory for cloning
 * @param _lang - Language for user messages (currently unused)
 * @returns Operation result with cloned workflow data
 */
export async function cloneWorkflows(
  workflows: Array<{ name: string, url: string }>,
  targetDir: string,
  _lang: SupportedLang = 'en',
): Promise<ShellOperationResult> {
  return withSpinner(
    i18n.t('cli:cloning_workflows'),
    async () => {
      try {
        // Ensure target directory exists
        await $`mkdir -p ${targetDir}`

        // Clone all workflows in parallel with error handling
        const results = await withParallelSpinner(
          workflows.map(workflow => ({
            label: workflow.name,
            fn: async () => {
              const workflowPath = join(targetDir, workflow.name)

              // Check if already exists
              let checkResult
              try {
                await $`test -d ${workflowPath}`
                checkResult = { exitCode: 0 }
              }
              catch {
                checkResult = { exitCode: 1 }
              }
              if (checkResult.exitCode === 0) {
                // Update existing repository
                await $`cd ${workflowPath} && git pull origin main`
                return { name: workflow.name, action: 'updated' }
              }
              else {
                // Clone new repository with timeout
                await withTimeout(
                  async () => {
                    let cloneResult
                    try {
                      await $`git clone ${workflow.url} ${workflowPath}`
                      cloneResult = { exitCode: 0 }
                    }
                    catch (e) {
                      cloneResult = { exitCode: 1, stderr: String(e) }
                    }
                    if (cloneResult.exitCode !== 0) {
                      throw new Error(`Git clone failed: ${cloneResult.stderr}`)
                    }
                  },
                  30000, // 30 second timeout
                  `Cloning ${workflow.name} timed out`,
                )
                return { name: workflow.name, action: 'cloned' }
              }
            },
          })),
          'Cloning workflows',
        )

        return {
          success: true,
          message: i18n.t('cli:workflows_cloned'),
          data: results,
        }
      }
      catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
    i18n.t('cli:workflows_cloned'),
  )
}

/**
 * Setup development environment with necessary tools
 * @param _lang - Language for user messages (currently unused)
 * @returns Operation result
 */
export async function setupEnvironment(_lang: SupportedLang = 'en'): Promise<ShellOperationResult> {
  return withSpinner(
    i18n.t('cli:setting_up_environment'),
    async () => {
      try {
        const operations: Array<{ label: string, fn: () => Promise<void> }> = []

        // Platform-specific setup
        if (isTermux()) {
          operations.push({
            label: 'Install Termux packages',
            fn: async () => {
              await $`pkg install -y nodejs git`
            },
          })
        }
        else if (isWindows()) {
          operations.push({
            label: 'Check Windows prerequisites',
            fn: async () => {
              // Verify Node.js and Git are available
              let nodeCheck
              try {
                await $`node --version`
                nodeCheck = { exitCode: 0 }
              }
              catch {
                nodeCheck = { exitCode: 1 }
              }
              let gitCheck
              try {
                await $`git --version`
                gitCheck = { exitCode: 0 }
              }
              catch {
                gitCheck = { exitCode: 1 }
              }

              if (nodeCheck.exitCode !== 0) {
                throw new Error('Node.js is not installed')
              }
              if (gitCheck.exitCode !== 0) {
                throw new Error('Git is not installed')
              }
            },
          })
        }
        else {
          // Unix-like systems (macOS, Linux)
          operations.push({
            label: 'Verify prerequisites',
            fn: async () => {
              let nodeCheck
              let gitCheck
              try {
                await $`command -v node`
                nodeCheck = { exitCode: 0 }
              }
              catch {
                nodeCheck = { exitCode: 1 }
              }
              try {
                await $`command -v git`
                gitCheck = { exitCode: 0 }
              }
              catch {
                gitCheck = { exitCode: 1 }
              }

              if (nodeCheck.exitCode !== 0) {
                throw new Error('Node.js is not installed')
              }
              if (gitCheck.exitCode !== 0) {
                throw new Error('Git is not installed')
              }
            },
          })
        }

        // Create necessary directories
        operations.push({
          label: 'Create directories',
          fn: async () => {
            const claudeDir = join(homedir(), '.claude')
            await $`mkdir -p ${claudeDir}`
            await $`mkdir -p ${join(claudeDir, 'backup')}`
            await $`mkdir -p ${join(claudeDir, 'workflows')}`
          },
        })

        // Execute all operations in parallel
        await withParallelSpinner(operations, 'Setting up environment')

        return {
          success: true,
          message: i18n.t('cli:environment_ready'),
        }
      }
      catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
    i18n.t('cli:environment_ready'),
  )
}

/**
 * Generic command executor with zx
 * @param command - Command to execute
 * @param options - Execution options
 * @param options.cwd - Working directory for command execution
 * @param options.env - Environment variables to merge
 * @param options.timeout - Timeout in milliseconds
 * @param options.retries - Number of retries on failure
 * @param options.silent - Whether to suppress error output
 * @returns Operation result with command output
 */
export async function executeCommand(
  command: string,
  options: {
    cwd?: string
    env?: Record<string, string>
    timeout?: number
    retries?: number
    silent?: boolean
  } = {},
): Promise<ShellOperationResult> {
  const {
    cwd,
    env: envVars,
    timeout = 60000,
    retries = 1,
    silent = false,
  } = options

  try {
    const result = await retry(
      async () => {
        // Set working directory if specified
        if (cwd) {
          $.cwd = cwd
        }

        // Merge environment variables
        if (envVars) {
          Object.assign(env, envVars)
        }

        // Execute with timeout
        return await withTimeout(
          async () => {
            let output
            try {
              await $`${command}`
              output = { exitCode: 0, stdout: '', stderr: '' }
            }
            catch (e: any) {
              output = { exitCode: 1, stdout: '', stderr: String(e) }
            }
            if (output.exitCode !== 0 && !silent) {
              throw new Error(`Command failed: ${output.stderr}`)
            }
            return output
          },
          timeout,
          `Command timed out after ${timeout}ms`,
        )
      },
      {
        maxAttempts: retries,
        delayMs: 1000,
      },
    )

    return {
      success: result.exitCode === 0,
      message: result.stdout,
      error: result.exitCode !== 0 ? result.stderr : undefined,
      data: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
  finally {
    // Reset cwd
    if (cwd) {
      $.cwd = undefined
    }
  }
}

/**
 * Check if a command exists in the system
 * @param command - Command name to check
 * @returns True if command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    if (isWindows()) {
      const result = await $`where ${command}`.nothrow()
      return result.exitCode === 0
    }
    else {
      const result = await $`command -v ${command}`.nothrow()
      return result.exitCode === 0
    }
  }
  catch {
    return false
  }
}

/**
 * Install npm package globally with retry
 * @param packageName - Package name to install
 * @param version - Optional version specifier
 * @param _lang - Language for user messages (currently unused)
 * @returns Operation result
 */
export async function installNpmPackage(
  packageName: string,
  version?: string,
  _lang: SupportedLang = 'en',
): Promise<ShellOperationResult> {
  const packageSpec = version ? `${packageName}@${version}` : packageName

  return withSpinner(
    `Installing ${packageSpec}`,
    async () => {
      try {
        await retry(
          async () => {
            const result = await $`npm install -g ${packageSpec}`.nothrow()
            if (result.exitCode !== 0) {
              throw new Error(`npm install failed: ${result.stderr}`)
            }
          },
          {
            maxAttempts: 3,
            delayMs: 2000,
          },
        )

        return {
          success: true,
          message: `${packageSpec} installed successfully`,
        }
      }
      catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
    `${packageSpec} installed`,
  )
}

/**
 * Execute git operations with error handling
 * @param operation - Git operation (clone, pull, push, etc.)
 * @param args - Operation arguments
 * @param options - Execution options
 * @param options.cwd - Working directory for git operation
 * @param options.timeout - Timeout in milliseconds
 * @returns Operation result
 */
export async function gitOperation(
  operation: 'clone' | 'pull' | 'push' | 'checkout' | 'status',
  args: string[],
  options: {
    cwd?: string
    timeout?: number
  } = {},
): Promise<ShellOperationResult> {
  const { cwd, timeout = 30000 } = options

  try {
    if (cwd) {
      $.cwd = cwd
    }

    const result = await withTimeout(
      async () => {
        let output
        try {
          await $`git ${operation} ${args}`
          output = { exitCode: 0, stdout: '', stderr: '' }
        }
        catch (e: any) {
          output = { exitCode: 1, stdout: '', stderr: String(e) }
        }
        if (output.exitCode !== 0) {
          throw new Error(`Git ${operation} failed: ${output.stderr}`)
        }
        return output
      },
      timeout,
      `Git ${operation} timed out`,
    )

    return {
      success: true,
      message: result.stdout,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
      },
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
  finally {
    if (cwd) {
      $.cwd = undefined
    }
  }
}

/**
 * Create directory with parents
 * @param path - Directory path to create
 * @returns Operation result
 */
export async function createDirectory(path: string): Promise<ShellOperationResult> {
  try {
    await $`mkdir -p ${path}`
    return {
      success: true,
      message: `Directory created: ${path}`,
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check if path exists
 * @param path - Path to check
 * @returns True if path exists
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    const result = await $`test -e ${path}`.nothrow()
    return result.exitCode === 0
  }
  catch {
    return false
  }
}

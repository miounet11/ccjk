/**
 * Hook executor
 * Handles the execution of individual hooks with timeout and error handling
 */

import type { Hook, HookExecutionResult } from '../types/hooks'
import type { HookContext } from './hook-context'
import { exec } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/**
 * Default timeout for hook execution (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000

/**
 * Maximum timeout allowed (60 seconds)
 */
const MAX_TIMEOUT = 60000

/**
 * Hook executor class
 * Responsible for executing individual hooks with proper error handling and timeout
 */
export class HookExecutor {
  /**
   * Execute a single hook with the given context
   * @param hook - Hook configuration to execute
   * @param context - Context data to pass to the hook
   * @returns Promise resolving to execution result
   */
  async execute(hook: Hook, context: HookContext): Promise<HookExecutionResult> {
    const startTime = Date.now()

    // Check if hook is enabled
    if (hook.enabled === false) {
      return {
        success: true,
        hook,
        executionTime: 0,
        stdout: '',
        stderr: 'Hook is disabled',
      }
    }

    // Validate timeout
    const timeout = this.validateTimeout(hook.timeout)

    try {
      // Prepare context as JSON string for passing to hook
      const contextJson = JSON.stringify(context, null, 2)

      // Execute the hook command
      const result = await this.executeCommand(hook.command, contextJson, timeout)

      const executionTime = Date.now() - startTime

      return {
        success: result.exitCode === 0,
        hook,
        executionTime,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      }
    }
    catch (error) {
      const executionTime = Date.now() - startTime

      return {
        success: false,
        hook,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute a command with timeout
   * @param command - Command to execute
   * @param contextJson - Context data as JSON string
   * @param timeout - Timeout in milliseconds
   * @returns Promise resolving to command output
   */
  private async executeCommand(
    command: string,
    contextJson: string,
    timeout: number,
  ): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    try {
      // Set environment variable with context data
      const env = {
        ...process.env,
        CCJK_HOOK_CONTEXT: contextJson,
      }

      // Execute command with timeout
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        env,
        maxBuffer: 1024 * 1024, // 1MB buffer
      })

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      }
    }
    catch (error: any) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message || 'Unknown error',
        exitCode: error.code || 1,
      }
    }
  }

  /**
   * Execute a hook asynchronously without waiting for completion
   * Used for hooks that should run in the background
   * @param hook - Hook configuration to execute
   * @param context - Context data to pass to the hook
   */
  executeAsync(hook: Hook, context: HookContext): void {
    // Execute in background without awaiting
    this.execute(hook, context).catch((error) => {
      console.error('[HookExecutor] Async hook execution failed:', error)
    })
  }

  /**
   * Validate and normalize timeout value
   * @param timeout - Timeout value to validate
   * @returns Validated timeout value
   */
  private validateTimeout(timeout?: number): number {
    if (!timeout) {
      return DEFAULT_TIMEOUT
    }

    if (timeout < 0) {
      return DEFAULT_TIMEOUT
    }

    if (timeout > MAX_TIMEOUT) {
      return MAX_TIMEOUT
    }

    return timeout
  }
}

export const hookExecutor = new HookExecutor()

/**
 * Executor Agent
 * Specialized agent for command execution, file operations, and result verification
 */

import type { AgentCapability, AgentContext, AgentResult } from './base-agent'
import { AgentState, BaseAgent } from './base-agent'

export interface ExecutionTask {
  id: string
  type: 'command' | 'file' | 'script' | 'batch'
  description: string
  actions: ExecutionAction[]
  validation?: ValidationRule[]
  rollback?: RollbackAction[]
}

export interface ExecutionAction {
  order: number
  type: 'shell' | 'read' | 'write' | 'delete' | 'move' | 'copy' | 'mkdir'
  target: string
  params?: Record<string, unknown>
  timeout?: number
  retryable?: boolean
}

export interface ValidationRule {
  type: 'file-exists' | 'file-content' | 'command-output' | 'exit-code' | 'custom'
  condition: string
  expected: unknown
  message?: string
}

export interface RollbackAction {
  order: number
  type: 'restore' | 'delete' | 'revert' | 'cleanup'
  target: string
  params?: Record<string, unknown>
}

export interface ExecutionResult {
  taskId: string
  success: boolean
  actions: ActionResult[]
  validations: ValidationResult[]
  duration: number
  output?: string
  error?: string
}

export interface ActionResult {
  action: ExecutionAction
  success: boolean
  output?: string
  error?: string
  duration: number
  timestamp: number
}

export interface ValidationResult {
  rule: ValidationRule
  passed: boolean
  actual?: unknown
  message?: string
}

export interface FileOperation {
  type: 'read' | 'write' | 'append' | 'delete' | 'move' | 'copy' | 'mkdir' | 'rmdir'
  source: string
  destination?: string
  content?: string
  options?: FileOperationOptions
}

export interface FileOperationOptions {
  encoding?: string
  mode?: number
  recursive?: boolean
  force?: boolean
  backup?: boolean
}

export interface CommandExecution {
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  shell?: boolean
  captureOutput?: boolean
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  timedOut: boolean
}

export interface BackupEntry {
  id: string
  timestamp: number
  files: BackupFile[]
  description: string
}

export interface BackupFile {
  originalPath: string
  backupPath: string
  size: number
  checksum: string
}

/**
 * Executor Agent Implementation
 */
export class ExecutorAgent extends BaseAgent {
  private executionHistory: ExecutionResult[] = []
  private backups: Map<string, BackupEntry> = new Map()
  private activeTask: ExecutionTask | null = null

  constructor(context: AgentContext) {
    const capabilities: AgentCapability[] = [
      {
        name: 'execute',
        description: 'Execute commands and scripts',
        parameters: { command: 'string', args: 'string[]', options: 'object' },
      },
      {
        name: 'file-operation',
        description: 'Perform file system operations',
        parameters: { operation: 'string', source: 'string', destination: 'string' },
      },
      {
        name: 'batch',
        description: 'Execute batch of operations',
        parameters: { tasks: 'ExecutionTask[]', parallel: 'boolean' },
      },
      {
        name: 'validate',
        description: 'Validate execution results',
        parameters: { rules: 'ValidationRule[]', target: 'string' },
      },
      {
        name: 'rollback',
        description: 'Rollback failed operations',
        parameters: { taskId: 'string', point: 'string' },
      },
    ]

    super(
      {
        name: 'executor-agent',
        description: 'Specialized agent for command execution, file operations, and result verification',
        capabilities,
        maxRetries: 2,
        timeout: 120000,
        verbose: true,
      },
      context,
    )
  }

  /**
   * Initialize executor agent
   */
  async initialize(): Promise<void> {
    this.setState(AgentState.THINKING)
    this.log('Initializing Executor Agent...')

    try {
      // Verify execution environment
      await this.verifyEnvironment()

      // Initialize backup system
      await this.initializeBackupSystem()

      // Load execution history
      await this.loadExecutionHistory()

      this.setState(AgentState.IDLE)
      this.log('Executor Agent initialized successfully')
    }
    catch (error) {
      this.setState(AgentState.ERROR)
      throw error
    }
  }

  /**
   * Process execution request
   */
  async process(message: string, metadata?: Record<string, unknown>): Promise<AgentResult<ExecutionResult>> {
    this.setState(AgentState.THINKING)
    this.addMessage({ role: 'user', content: message, metadata })

    try {
      const action = metadata?.action as string || 'execute'

      this.log(`Processing ${action} request: ${message}`)

      let result: ExecutionResult

      switch (action) {
        case 'execute':
          result = await this.executeCommand(metadata as unknown as CommandExecution)
          break
        case 'file-operation':
          result = await this.performFileOperation(metadata as unknown as FileOperation)
          break
        case 'batch':
          result = await this.executeBatch(metadata?.tasks as ExecutionTask[])
          break
        case 'validate':
          result = await this.validateExecution(metadata?.taskId as string, metadata?.rules as ValidationRule[])
          break
        case 'rollback':
          result = await this.rollbackExecution(metadata?.taskId as string)
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }

      this.setState(AgentState.COMPLETED)
      this.addMessage({
        role: 'agent',
        content: `Completed ${action} execution`,
        metadata: { result },
      })

      return {
        success: true,
        data: result,
        message: `Execution ${action} completed successfully`,
      }
    }
    catch (error) {
      return await this.handleError(error instanceof Error ? error : new Error(String(error))) as AgentResult<ExecutionResult>
    }
  }

  /**
   * Execute command
   */
  private async executeCommand(execution: CommandExecution): Promise<ExecutionResult> {
    this.setState(AgentState.EXECUTING)
    this.log(`Executing command: ${execution.command}`)

    const startTime = Date.now()
    const taskId = this.generateTaskId()

    const task: ExecutionTask = {
      id: taskId,
      type: 'command',
      description: `Execute: ${execution.command}`,
      actions: [
        {
          order: 1,
          type: 'shell',
          target: execution.command,
          params: execution as unknown as Record<string, unknown>,
          timeout: execution.timeout,
          retryable: true,
        },
      ],
    }

    this.activeTask = task

    try {
      const actionResults: ActionResult[] = []

      for (const action of task.actions) {
        const actionResult = await this.executeAction(action)
        actionResults.push(actionResult)

        if (!actionResult.success) {
          throw new Error(`Action failed: ${actionResult.error}`)
        }
      }

      const result: ExecutionResult = {
        taskId,
        success: true,
        actions: actionResults,
        validations: [],
        duration: Date.now() - startTime,
        output: actionResults[0]?.output,
      }

      this.executionHistory.push(result)
      this.activeTask = null

      return result
    }
    catch (error) {
      const result: ExecutionResult = {
        taskId,
        success: false,
        actions: [],
        validations: [],
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }

      this.executionHistory.push(result)
      this.activeTask = null

      throw error
    }
  }

  /**
   * Perform file operation
   */
  private async performFileOperation(operation: FileOperation): Promise<ExecutionResult> {
    this.setState(AgentState.EXECUTING)
    this.log(`Performing file operation: ${operation.type} on ${operation.source}`)

    const startTime = Date.now()
    const taskId = this.generateTaskId()

    const task: ExecutionTask = {
      id: taskId,
      type: 'file',
      description: `File operation: ${operation.type}`,
      actions: [
        {
          order: 1,
          type: operation.type as ExecutionAction['type'],
          target: operation.source,
          params: operation as unknown as Record<string, unknown>,
          retryable: false,
        },
      ],
    }

    this.activeTask = task

    try {
      // Create backup if needed
      if (operation.options?.backup && ['write', 'delete', 'move'].includes(operation.type)) {
        await this.createBackup([operation.source])
      }

      const actionResults: ActionResult[] = []

      for (const action of task.actions) {
        const actionResult = await this.executeAction(action)
        actionResults.push(actionResult)

        if (!actionResult.success) {
          throw new Error(`File operation failed: ${actionResult.error}`)
        }
      }

      const result: ExecutionResult = {
        taskId,
        success: true,
        actions: actionResults,
        validations: [],
        duration: Date.now() - startTime,
      }

      this.executionHistory.push(result)
      this.activeTask = null

      return result
    }
    catch (error) {
      // Attempt rollback if backup exists
      if (operation.options?.backup) {
        await this.restoreBackup(taskId)
      }

      const result: ExecutionResult = {
        taskId,
        success: false,
        actions: [],
        validations: [],
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }

      this.executionHistory.push(result)
      this.activeTask = null

      throw error
    }
  }

  /**
   * Execute batch of tasks
   */
  private async executeBatch(tasks: ExecutionTask[]): Promise<ExecutionResult> {
    this.setState(AgentState.EXECUTING)
    this.log(`Executing batch of ${tasks.length} tasks`)

    const startTime = Date.now()
    const taskId = this.generateTaskId()

    const allActionResults: ActionResult[] = []
    const allValidationResults: ValidationResult[] = []

    try {
      for (const task of tasks) {
        this.activeTask = task
        this.log(`Executing task: ${task.description}`)

        // Execute actions
        for (const action of task.actions) {
          const actionResult = await this.executeAction(action)
          allActionResults.push(actionResult)

          if (!actionResult.success && !action.retryable) {
            throw new Error(`Task failed: ${actionResult.error}`)
          }
        }

        // Validate results
        if (task.validation) {
          const validationResults = await this.validateTask(task)
          allValidationResults.push(...validationResults)

          const failed = validationResults.find(v => !v.passed)
          if (failed) {
            throw new Error(`Validation failed: ${failed.message}`)
          }
        }
      }

      const result: ExecutionResult = {
        taskId,
        success: true,
        actions: allActionResults,
        validations: allValidationResults,
        duration: Date.now() - startTime,
      }

      this.executionHistory.push(result)
      this.activeTask = null

      return result
    }
    catch (error) {
      // Attempt rollback
      await this.rollbackBatch(tasks)

      const result: ExecutionResult = {
        taskId,
        success: false,
        actions: allActionResults,
        validations: allValidationResults,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }

      this.executionHistory.push(result)
      this.activeTask = null

      throw error
    }
  }

  /**
   * Validate execution
   */
  private async validateExecution(taskId: string, rules: ValidationRule[]): Promise<ExecutionResult> {
    this.setState(AgentState.EXECUTING)
    this.log(`Validating execution: ${taskId}`)

    const startTime = Date.now()
    const execution = this.executionHistory.find(e => e.taskId === taskId)

    if (!execution) {
      throw new Error(`Execution not found: ${taskId}`)
    }

    const validationResults: ValidationResult[] = []

    for (const rule of rules) {
      const result = await this.validateRule(rule, execution)
      validationResults.push(result)
    }

    const allPassed = validationResults.every(v => v.passed)

    return {
      taskId,
      success: allPassed,
      actions: execution.actions,
      validations: validationResults,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Rollback execution
   */
  private async rollbackExecution(taskId: string): Promise<ExecutionResult> {
    this.setState(AgentState.EXECUTING)
    this.log(`Rolling back execution: ${taskId}`)

    const startTime = Date.now()
    const execution = this.executionHistory.find(e => e.taskId === taskId)

    if (!execution) {
      throw new Error(`Execution not found: ${taskId}`)
    }

    try {
      // Restore from backup
      await this.restoreBackup(taskId)

      return {
        taskId,
        success: true,
        actions: [],
        validations: [],
        duration: Date.now() - startTime,
        output: 'Rollback completed successfully',
      }
    }
    catch (error) {
      return {
        taskId,
        success: false,
        actions: [],
        validations: [],
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute single action
   */
  private async executeAction(action: ExecutionAction): Promise<ActionResult> {
    const startTime = Date.now()

    try {
      this.log(`Executing action: ${action.type} on ${action.target}`)

      let output: string | undefined

      switch (action.type) {
        case 'shell':
          output = await this.executeShellCommand(action)
          break
        case 'read':
          output = await this.readFile(action)
          break
        case 'write':
          await this.writeFile(action)
          break
        case 'delete':
          await this.deleteFile(action)
          break
        case 'move':
          await this.moveFile(action)
          break
        case 'copy':
          await this.copyFile(action)
          break
        case 'mkdir':
          await this.createDirectory(action)
          break
        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      return {
        action,
        success: true,
        output,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
    catch (error) {
      return {
        action,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Execute shell command
   */
  private async executeShellCommand(action: ExecutionAction): Promise<string> {
    this.log(`Executing shell command: ${action.target}`)
    // Placeholder implementation
    return 'Command executed successfully'
  }

  /**
   * Read file
   */
  private async readFile(action: ExecutionAction): Promise<string> {
    this.log(`Reading file: ${action.target}`)
    // Placeholder implementation
    return 'File content'
  }

  /**
   * Write file
   */
  private async writeFile(action: ExecutionAction): Promise<void> {
    this.log(`Writing file: ${action.target}`)
    // Placeholder implementation
  }

  /**
   * Delete file
   */
  private async deleteFile(action: ExecutionAction): Promise<void> {
    this.log(`Deleting file: ${action.target}`)
    // Placeholder implementation
  }

  /**
   * Move file
   */
  private async moveFile(action: ExecutionAction): Promise<void> {
    this.log(`Moving file: ${action.target}`)
    // Placeholder implementation
  }

  /**
   * Copy file
   */
  private async copyFile(action: ExecutionAction): Promise<void> {
    this.log(`Copying file: ${action.target}`)
    // Placeholder implementation
  }

  /**
   * Create directory
   */
  private async createDirectory(action: ExecutionAction): Promise<void> {
    this.log(`Creating directory: ${action.target}`)
    // Placeholder implementation
  }

  /**
   * Validate task
   */
  private async validateTask(task: ExecutionTask): Promise<ValidationResult[]> {
    this.log(`Validating task: ${task.id}`)

    if (!task.validation) {
      return []
    }

    const results: ValidationResult[] = []

    for (const rule of task.validation) {
      const result = await this.validateRule(rule, null)
      results.push(result)
    }

    return results
  }

  /**
   * Validate rule
   */
  private async validateRule(rule: ValidationRule, _execution: ExecutionResult | null): Promise<ValidationResult> {
    this.log(`Validating rule: ${rule.type}`)

    // Placeholder implementation
    return {
      rule,
      passed: true,
      message: 'Validation passed',
    }
  }

  /**
   * Create backup
   */
  private async createBackup(files: string[]): Promise<string> {
    const backupId = this.generateTaskId()
    this.log(`Creating backup: ${backupId} for ${files.length} files`)

    const backupEntry: BackupEntry = {
      id: backupId,
      timestamp: Date.now(),
      files: [],
      description: `Backup of ${files.length} files`,
    }

    this.backups.set(backupId, backupEntry)

    return backupId
  }

  /**
   * Restore backup
   */
  private async restoreBackup(backupId: string): Promise<void> {
    this.log(`Restoring backup: ${backupId}`)

    const backup = this.backups.get(backupId)
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    // Placeholder implementation
  }

  /**
   * Rollback batch
   */
  private async rollbackBatch(tasks: ExecutionTask[]): Promise<void> {
    this.log(`Rolling back batch of ${tasks.length} tasks`)

    for (const task of tasks.reverse()) {
      if (task.rollback) {
        for (const action of task.rollback) {
          this.log(`Executing rollback action: ${action.type}`)
          // Placeholder implementation
        }
      }
    }
  }

  /**
   * Generate task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Verify environment
   */
  private async verifyEnvironment(): Promise<void> {
    this.log('Verifying execution environment...')
    // Placeholder for environment verification
  }

  /**
   * Initialize backup system
   */
  private async initializeBackupSystem(): Promise<void> {
    this.log('Initializing backup system...')
    // Placeholder for backup system initialization
  }

  /**
   * Load execution history
   */
  private async loadExecutionHistory(): Promise<void> {
    this.log('Loading execution history...')
    // Placeholder for loading persisted history
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.log('Cleaning up Executor Agent resources...')
    this.executionHistory = []
    this.backups.clear()
    this.activeTask = null
    this.setState(AgentState.IDLE)
  }

  /**
   * Handle errors
   */
  async handleError(error: Error): Promise<AgentResult> {
    this.setState(AgentState.ERROR)
    this.log(`Error: ${error.message}`, 'error')

    // Attempt to rollback active task
    if (this.activeTask) {
      this.log('Attempting to rollback active task...')
      try {
        await this.rollbackBatch([this.activeTask])
      }
      catch (rollbackError) {
        this.log(`Rollback failed: ${rollbackError}`, 'error')
      }
    }

    this.addMessage({
      role: 'system',
      content: `Error occurred: ${error.message}`,
      metadata: { error: error.stack },
    })

    return {
      success: false,
      error,
      message: `Execution failed: ${error.message}`,
    }
  }
}

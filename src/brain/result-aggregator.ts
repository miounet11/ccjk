/**
 * CCJK Brain Result Aggregator
 *
 * Intelligent result aggregation system that collects, validates, and merges
 * results from multiple agents with conflict resolution and quality assurance.
 *
 * @module brain/result-aggregator
 */

import type {
  ConflictResolutionContext,
  ConflictResolutionResult,
  ConflictResolutionStrategy,
  Task,
  TaskArtifact,
  TaskOutput,
} from './orchestrator-types.js'

/**
 * Result aggregation options
 */
export interface ResultAggregationOptions {
  /** Default conflict resolution strategy */
  defaultStrategy?: ConflictResolutionStrategy

  /** Enable automatic conflict detection */
  autoDetectConflicts?: boolean

  /** Enable result validation */
  enableValidation?: boolean

  /** Minimum confidence threshold (0-1) */
  minConfidenceThreshold?: number

  /** Enable result merging */
  enableMerging?: boolean

  /** Maximum merge attempts */
  maxMergeAttempts?: number
}

/**
 * Aggregation context
 *
 * Context for aggregating results from multiple tasks.
 */
export interface AggregationContext {
  /** Tasks being aggregated */
  tasks: Task[]

  /** Aggregation strategy */
  strategy: ConflictResolutionStrategy

  /** Expected output schema */
  expectedSchema?: Record<string, unknown>

  /** Aggregation metadata */
  metadata?: Record<string, unknown>
}

/**
 * Aggregation result
 *
 * Result of aggregating multiple task outputs.
 */
export interface AggregationResult {
  /** Whether aggregation succeeded */
  success: boolean

  /** Aggregated output */
  output?: TaskOutput

  /** Conflicts detected */
  conflicts: ConflictResolutionContext[]

  /** Conflicts resolved */
  resolvedConflicts: ConflictResolutionResult[]

  /** Unresolved conflicts */
  unresolvedConflicts: ConflictResolutionContext[]

  /** Validation errors */
  validationErrors: Array<{
    taskId: string
    field: string
    message: string
  }>

  /** Aggregation warnings */
  warnings: string[]

  /** Aggregation metadata */
  metadata: {
    totalTasks: number
    successfulTasks: number
    failedTasks: number
    averageConfidence: number
    aggregationTimestamp: string
  }
}

/**
 * Result validator interface
 */
export interface ResultValidator {
  /** Validate a task output */
  validate: (output: TaskOutput, schema?: Record<string, unknown>) => ValidationResult
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean

  /** Validation errors */
  errors: Array<{
    field: string
    message: string
    code: string
  }>

  /** Validation warnings */
  warnings: Array<{
    field: string
    message: string
    code: string
  }>
}

/**
 * Result aggregator class
 *
 * Aggregates results from multiple agents with intelligent conflict resolution.
 */
export class ResultAggregator {
  private readonly options: Required<ResultAggregationOptions>
  private readonly validator: ResultValidator

  constructor(options: ResultAggregationOptions = {}) {
    this.options = {
      defaultStrategy: options.defaultStrategy ?? 'highest-confidence',
      autoDetectConflicts: options.autoDetectConflicts ?? true,
      enableValidation: options.enableValidation ?? true,
      minConfidenceThreshold: options.minConfidenceThreshold ?? 0.7,
      enableMerging: options.enableMerging ?? true,
      maxMergeAttempts: options.maxMergeAttempts ?? 3,
    }

    this.validator = this.createValidator()
  }

  /**
   * Aggregate results from multiple tasks
   *
   * @param tasks - Tasks with outputs to aggregate
   * @param context - Aggregation context
   * @returns Aggregation result
   */
  async aggregate(
    tasks: Task[],
    context?: Partial<AggregationContext>,
  ): Promise<AggregationResult> {
    const aggregationContext: AggregationContext = {
      tasks,
      strategy: context?.strategy ?? this.options.defaultStrategy,
      expectedSchema: context?.expectedSchema,
      metadata: context?.metadata,
    }

    // Filter tasks with outputs
    const tasksWithOutputs = tasks.filter(t => t.output !== undefined)

    if (tasksWithOutputs.length === 0) {
      return this.createEmptyResult(tasks)
    }

    // Validate outputs if enabled
    const validationErrors: Array<{ taskId: string, field: string, message: string }> = []
    if (this.options.enableValidation) {
      for (const task of tasksWithOutputs) {
        const validation = this.validator.validate(task.output!, aggregationContext.expectedSchema)
        if (!validation.valid) {
          validationErrors.push(
            ...validation.errors.map(err => ({
              taskId: task.id,
              field: err.field,
              message: err.message,
            })),
          )
        }
      }
    }

    // Detect conflicts if enabled
    const conflicts: ConflictResolutionContext[] = []
    if (this.options.autoDetectConflicts) {
      conflicts.push(...this.detectConflicts(tasksWithOutputs))
    }

    // Resolve conflicts
    const resolvedConflicts: ConflictResolutionResult[] = []
    const unresolvedConflicts: ConflictResolutionContext[] = []

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict)
      if (resolution.resolved) {
        resolvedConflicts.push(resolution)
      }
      else {
        unresolvedConflicts.push(conflict)
      }
    }

    // Aggregate outputs
    const aggregatedOutput = await this.aggregateOutputs(
      tasksWithOutputs,
      aggregationContext,
      resolvedConflicts,
    )

    // Calculate metadata
    const successfulTasks = tasksWithOutputs.filter(t => t.status === 'completed')
    const failedTasks = tasks.filter(t => t.status === 'failed')
    const averageConfidence = this.calculateAverageConfidence(tasksWithOutputs)

    // Generate warnings
    const warnings: string[] = []
    if (averageConfidence < this.options.minConfidenceThreshold) {
      warnings.push(`Average confidence ${averageConfidence.toFixed(2)} is below threshold ${this.options.minConfidenceThreshold}`)
    }
    if (unresolvedConflicts.length > 0) {
      warnings.push(`${unresolvedConflicts.length} conflicts remain unresolved`)
    }

    return {
      success: unresolvedConflicts.length === 0 && validationErrors.length === 0,
      output: aggregatedOutput,
      conflicts,
      resolvedConflicts,
      unresolvedConflicts,
      validationErrors,
      warnings,
      metadata: {
        totalTasks: tasks.length,
        successfulTasks: successfulTasks.length,
        failedTasks: failedTasks.length,
        averageConfidence,
        aggregationTimestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Detect conflicts between task outputs
   *
   * @param tasks - Tasks to check for conflicts
   * @returns Detected conflicts
   */
  private detectConflicts(tasks: Task[]): ConflictResolutionContext[] {
    const conflicts: ConflictResolutionContext[] = []

    // Group tasks by type
    const tasksByType = this.groupTasksByType(tasks)

    for (const [_type, typeTasks] of tasksByType) {
      if (typeTasks.length < 2)
        continue

      // Check for data conflicts
      const dataConflicts = this.detectDataConflicts(typeTasks)
      conflicts.push(...dataConflicts)

      // Check for file conflicts
      const fileConflicts = this.detectFileConflicts(typeTasks)
      conflicts.push(...fileConflicts)

      // Check for decision conflicts
      const decisionConflicts = this.detectDecisionConflicts(typeTasks)
      conflicts.push(...decisionConflicts)
    }

    return conflicts
  }

  /**
   * Detect data conflicts between tasks
   *
   * @param tasks - Tasks to check
   * @returns Data conflicts
   */
  private detectDataConflicts(tasks: Task[]): ConflictResolutionContext[] {
    const conflicts: ConflictResolutionContext[] = []

    // Compare data fields across tasks
    const dataFields = this.extractDataFields(tasks)

    for (const field of dataFields) {
      const values = tasks
        .map(t => ({ taskId: t.id, value: this.getFieldValue(t.output!, field) }))
        .filter(v => v.value !== undefined)

      if (values.length < 2)
        continue

      // Check if values differ
      const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)))
      if (uniqueValues.size > 1) {
        conflicts.push({
          conflictingTasks: values.map(v => v.taskId),
          results: tasks.map(t => t.output!),
          strategy: this.options.defaultStrategy,
          conflictType: 'data',
          description: `Conflicting values for field "${field}"`,
          metadata: {
            field,
            values: values.map(v => v.value),
          },
        })
      }
    }

    return conflicts
  }

  /**
   * Detect file conflicts between tasks
   *
   * @param tasks - Tasks to check
   * @returns File conflicts
   */
  private detectFileConflicts(tasks: Task[]): ConflictResolutionContext[] {
    const conflicts: ConflictResolutionContext[] = []

    // Group files by path
    const filesByPath = new Map<string, Array<{ taskId: string, file: string }>>()

    for (const task of tasks) {
      if (!task.output?.files)
        continue

      for (const file of task.output.files) {
        if (!filesByPath.has(file)) {
          filesByPath.set(file, [])
        }
        filesByPath.get(file)!.push({ taskId: task.id, file })
      }
    }

    // Check for conflicts (same file from multiple tasks)
    for (const [path, files] of filesByPath) {
      if (files.length > 1) {
        conflicts.push({
          conflictingTasks: files.map(f => f.taskId),
          results: tasks.filter(t => files.some(f => f.taskId === t.id)).map(t => t.output!),
          strategy: this.options.defaultStrategy,
          conflictType: 'file',
          description: `Multiple tasks produced file "${path}"`,
          metadata: {
            filePath: path,
            taskCount: files.length,
          },
        })
      }
    }

    return conflicts
  }

  /**
   * Detect decision conflicts between tasks
   *
   * @param tasks - Tasks to check
   * @returns Decision conflicts
   */
  private detectDecisionConflicts(tasks: Task[]): ConflictResolutionContext[] {
    const conflicts: ConflictResolutionContext[] = []

    // Check for conflicting decisions in metadata
    const decisions = tasks
      .map(t => ({
        taskId: t.id,
        decision: t.output?.metadata?.decision as string | undefined,
      }))
      .filter(d => d.decision !== undefined)

    if (decisions.length < 2)
      return conflicts

    const uniqueDecisions = new Set(decisions.map(d => d.decision))
    if (uniqueDecisions.size > 1) {
      conflicts.push({
        conflictingTasks: decisions.map(d => d.taskId),
        results: tasks.map(t => t.output!),
        strategy: this.options.defaultStrategy,
        conflictType: 'decision',
        description: 'Tasks made conflicting decisions',
        metadata: {
          decisions: decisions.map(d => d.decision),
        },
      })
    }

    return conflicts
  }

  /**
   * Resolve a conflict using the specified strategy
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution result
   */
  private async resolveConflict(
    conflict: ConflictResolutionContext,
  ): Promise<ConflictResolutionResult> {
    switch (conflict.strategy) {
      case 'first-wins':
        return this.resolveFirstWins(conflict)
      case 'last-wins':
        return this.resolveLastWins(conflict)
      case 'vote':
        return this.resolveByVote(conflict)
      case 'merge':
        return this.resolveByMerge(conflict)
      case 'highest-confidence':
        return this.resolveByConfidence(conflict)
      case 'manual':
        return this.resolveManually(conflict)
      default:
        return {
          resolved: false,
          method: 'unknown',
          confidence: 0,
          explanation: `Unknown resolution strategy: ${conflict.strategy}`,
        }
    }
  }

  /**
   * Resolve conflict using first-wins strategy
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution result
   */
  private resolveFirstWins(conflict: ConflictResolutionContext): ConflictResolutionResult {
    return {
      resolved: true,
      result: conflict.results[0],
      method: 'first-wins',
      confidence: 0.5,
      explanation: 'Used first completed result',
      discarded: conflict.results.slice(1),
    }
  }

  /**
   * Resolve conflict using last-wins strategy
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution result
   */
  private resolveLastWins(conflict: ConflictResolutionContext): ConflictResolutionResult {
    const lastResult = conflict.results[conflict.results.length - 1]
    return {
      resolved: true,
      result: lastResult,
      method: 'last-wins',
      confidence: 0.5,
      explanation: 'Used last completed result',
      discarded: conflict.results.slice(0, -1),
    }
  }

  /**
   * Resolve conflict using voting strategy
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution result
   */
  private resolveByVote(conflict: ConflictResolutionContext): ConflictResolutionResult {
    // Count occurrences of each result
    const resultCounts = new Map<string, { count: number, result: TaskOutput }>()

    for (const result of conflict.results) {
      const key = JSON.stringify(result.data)
      const existing = resultCounts.get(key)
      if (existing) {
        existing.count++
      }
      else {
        resultCounts.set(key, { count: 1, result })
      }
    }

    // Find result with most votes
    let maxCount = 0
    let winningResult: TaskOutput | undefined

    for (const [_, { count, result }] of resultCounts) {
      if (count > maxCount) {
        maxCount = count
        winningResult = result
      }
    }

    const confidence = maxCount / conflict.results.length

    return {
      resolved: winningResult !== undefined,
      result: winningResult,
      method: 'vote',
      confidence,
      explanation: `Result won with ${maxCount}/${conflict.results.length} votes`,
      discarded: conflict.results.filter(r => r !== winningResult),
    }
  }

  /**
   * Resolve conflict by merging results
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution result
   */
  private async resolveByMerge(conflict: ConflictResolutionContext): Promise<ConflictResolutionResult> {
    if (!this.options.enableMerging) {
      return {
        resolved: false,
        method: 'merge',
        confidence: 0,
        explanation: 'Merging is disabled',
      }
    }

    try {
      const mergedResult = await this.mergeResults(conflict.results, conflict.conflictType)

      return {
        resolved: true,
        result: mergedResult,
        method: 'merge',
        confidence: 0.8,
        explanation: 'Successfully merged conflicting results',
      }
    }
    catch (error) {
      return {
        resolved: false,
        method: 'merge',
        confidence: 0,
        explanation: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Resolve conflict using highest confidence strategy
   *
   * @param conflict - Conflict to resolve
   * @returns Resolution result
   */
  private resolveByConfidence(conflict: ConflictResolutionContext): ConflictResolutionResult {
    // Find result with highest confidence
    let maxConfidence = 0
    let bestResult: TaskOutput | undefined

    for (const result of conflict.results) {
      const confidence = result.confidence ?? 0
      if (confidence > maxConfidence) {
        maxConfidence = confidence
        bestResult = result
      }
    }

    return {
      resolved: bestResult !== undefined,
      result: bestResult,
      method: 'highest-confidence',
      confidence: maxConfidence,
      explanation: `Selected result with confidence ${maxConfidence.toFixed(2)}`,
      discarded: conflict.results.filter(r => r !== bestResult),
    }
  }

  /**
   * Resolve conflict manually (placeholder for user intervention)
   *
   * @param _conflict - Conflict to resolve
   * @returns Resolution result
   */
  private resolveManually(_conflict: ConflictResolutionContext): ConflictResolutionResult {
    return {
      resolved: false,
      method: 'manual',
      confidence: 0,
      explanation: 'Manual resolution required',
    }
  }

  /**
   * Merge multiple results into a single result
   *
   * @param results - Results to merge
   * @returns Merged result
   */
  private async mergeResults(
    results: TaskOutput[],
    _conflictType: 'data' | 'file' | 'decision' | 'state',
  ): Promise<TaskOutput> {
    const mergedData: Record<string, unknown> = {}
    const mergedFiles: string[] = []
    const mergedArtifacts: TaskArtifact[] = []
    const mergedLogs: string[] = []

    // Merge data fields
    for (const result of results) {
      for (const [key, value] of Object.entries(result.data)) {
        if (!(key in mergedData)) {
          mergedData[key] = value
        }
        else if (Array.isArray(mergedData[key]) && Array.isArray(value)) {
          // Merge arrays
          mergedData[key] = [...(mergedData[key] as unknown[]), ...value]
        }
        else if (typeof mergedData[key] === 'object' && typeof value === 'object') {
          // Merge objects
          mergedData[key] = { ...(mergedData[key] as Record<string, unknown>), ...(value as Record<string, unknown>) }
        }
        // Otherwise keep existing value
      }

      // Merge files (deduplicate)
      if (result.files) {
        for (const file of result.files) {
          if (!mergedFiles.includes(file)) {
            mergedFiles.push(file)
          }
        }
      }

      // Merge artifacts
      if (result.artifacts) {
        mergedArtifacts.push(...result.artifacts)
      }

      // Merge logs
      if (result.logs) {
        mergedLogs.push(...result.logs)
      }
    }

    // Calculate average confidence
    const confidences = results.map(r => r.confidence ?? 0).filter(c => c > 0)
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : undefined

    return {
      data: mergedData,
      files: mergedFiles.length > 0 ? mergedFiles : undefined,
      artifacts: mergedArtifacts.length > 0 ? mergedArtifacts : undefined,
      logs: mergedLogs.length > 0 ? mergedLogs : undefined,
      confidence: avgConfidence,
      metadata: {
        merged: true,
        sourceCount: results.length,
        mergeTimestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Aggregate outputs from multiple tasks
   *
   * @param tasks - Tasks with outputs
   * @param context - Aggregation context
   * @param resolvedConflicts - Resolved conflicts
   * @returns Aggregated output
   */
  private async aggregateOutputs(
    tasks: Task[],
    context: AggregationContext,
    resolvedConflicts: ConflictResolutionResult[],
  ): Promise<TaskOutput> {
    // Start with empty output
    const aggregated: TaskOutput = {
      data: {},
      files: [],
      artifacts: [],
      logs: [],
    }

    // Apply resolved conflicts first
    for (const resolution of resolvedConflicts) {
      if (resolution.result) {
        this.mergeIntoAggregated(aggregated, resolution.result)
      }
    }

    // Add outputs from non-conflicting tasks
    for (const task of tasks) {
      if (!task.output)
        continue

      // Check if this task was involved in a conflict
      const taskOutput = task.output
      const wasInConflict = resolvedConflicts.some(r =>
        r.discarded?.includes(taskOutput),
      )

      if (!wasInConflict) {
        this.mergeIntoAggregated(aggregated, taskOutput)
      }
    }

    // Calculate overall confidence
    const confidences = tasks
      .map(t => t.output?.confidence ?? 0)
      .filter(c => c > 0)

    aggregated.confidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : undefined

    // Add aggregation metadata
    aggregated.metadata = {
      ...aggregated.metadata,
      aggregated: true,
      taskCount: tasks.length,
      aggregationStrategy: context.strategy,
      aggregationTimestamp: new Date().toISOString(),
    }

    return aggregated
  }

  /**
   * Merge an output into the aggregated result
   *
   * @param aggregated - Aggregated output
   * @param output - Output to merge
   */
  private mergeIntoAggregated(aggregated: TaskOutput, output: TaskOutput): void {
    // Merge data
    Object.assign(aggregated.data, output.data)

    // Merge files
    if (output.files) {
      aggregated.files = [...(aggregated.files ?? []), ...output.files]
    }

    // Merge artifacts
    if (output.artifacts) {
      aggregated.artifacts = [...(aggregated.artifacts ?? []), ...output.artifacts]
    }

    // Merge logs
    if (output.logs) {
      aggregated.logs = [...(aggregated.logs ?? []), ...output.logs]
    }
  }

  /**
   * Create empty aggregation result
   *
   * @param tasks - Tasks
   * @returns Empty result
   */
  private createEmptyResult(tasks: Task[]): AggregationResult {
    return {
      success: false,
      conflicts: [],
      resolvedConflicts: [],
      unresolvedConflicts: [],
      validationErrors: [],
      warnings: ['No task outputs to aggregate'],
      metadata: {
        totalTasks: tasks.length,
        successfulTasks: 0,
        failedTasks: tasks.filter(t => t.status === 'failed').length,
        averageConfidence: 0,
        aggregationTimestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Group tasks by type
   *
   * @param tasks - Tasks to group
   * @returns Tasks grouped by type
   */
  private groupTasksByType(tasks: Task[]): Map<string, Task[]> {
    const groups = new Map<string, Task[]>()

    for (const task of tasks) {
      if (!groups.has(task.type)) {
        groups.set(task.type, [])
      }
      groups.get(task.type)!.push(task)
    }

    return groups
  }

  /**
   * Extract data fields from tasks
   *
   * @param tasks - Tasks to analyze
   * @returns Data field names
   */
  private extractDataFields(tasks: Task[]): string[] {
    const fields = new Set<string>()

    for (const task of tasks) {
      if (!task.output)
        continue

      for (const key of Object.keys(task.output.data)) {
        fields.add(key)
      }
    }

    return Array.from(fields)
  }

  /**
   * Get field value from output
   *
   * @param output - Task output
   * @param field - Field name
   * @returns Field value
   */
  private getFieldValue(output: TaskOutput, field: string): unknown {
    return output.data[field]
  }

  /**
   * Calculate average confidence from tasks
   *
   * @param tasks - Tasks with outputs
   * @returns Average confidence
   */
  private calculateAverageConfidence(tasks: Task[]): number {
    const confidences = tasks
      .map(t => t.output?.confidence ?? 0)
      .filter(c => c > 0)

    if (confidences.length === 0)
      return 0

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  }

  /**
   * Create result validator
   *
   * @returns Result validator
   */
  private createValidator(): ResultValidator {
    return {
      validate: (output: TaskOutput, schema?: Record<string, unknown>): ValidationResult => {
        const errors: Array<{ field: string, message: string, code: string }> = []
        const warnings: Array<{ field: string, message: string, code: string }> = []

        // Basic validation
        if (!output.data || Object.keys(output.data).length === 0) {
          errors.push({
            field: 'data',
            message: 'Output data is empty',
            code: 'EMPTY_DATA',
          })
        }

        // Schema validation if provided
        if (schema) {
          for (const [field, _type] of Object.entries(schema)) {
            if (!(field in output.data)) {
              errors.push({
                field,
                message: `Required field "${field}" is missing`,
                code: 'MISSING_FIELD',
              })
            }
          }
        }

        // Confidence validation
        if (output.confidence !== undefined && (output.confidence < 0 || output.confidence > 1)) {
          warnings.push({
            field: 'confidence',
            message: 'Confidence score should be between 0 and 1',
            code: 'INVALID_CONFIDENCE',
          })
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
        }
      },
    }
  }
}

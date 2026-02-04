/**
 * CCJK Brain Task Decomposer
 *
 * Intelligent task decomposition system that breaks down complex tasks
 * into manageable subtasks with dependency analysis and execution optimization.
 *
 * @module brain/task-decomposer
 */

import type {
  DecompositionStrategy,
  Task,
  TaskDecompositionResult,
  TaskDependency,
  TaskExecutionGraph,
  TaskGraphEdge,
  TaskGraphNode,
  TaskStage,
} from './orchestrator-types.js'
import type { AgentCapability } from '../types/agent.js'
import { nanoid } from 'nanoid'

/**
 * Convert capability name strings to AgentCapability objects
 */
function toAgentCapabilities(names: string[]): AgentCapability[] {
  return names.map(name => ({
    id: name,
    name,
    model: 'sonnet' as const,
    specialties: [name],
    strength: 0.8,
    costFactor: 1.0,
  }))
}

/**
 * Extract capability names from AgentCapability objects
 */
function fromAgentCapabilities(capabilities: AgentCapability[]): string[] {
  return capabilities.map(cap => cap.id)
}

/**
 * Task decomposition options
 */
export interface TaskDecompositionOptions {
  /** Preferred decomposition strategy */
  strategy?: DecompositionStrategy

  /** Maximum depth for hierarchical decomposition */
  maxDepth?: number

  /** Maximum number of parallel tasks */
  maxParallelTasks?: number

  /** Minimum task granularity (estimated duration in ms) */
  minTaskGranularity?: number

  /** Enable automatic dependency detection */
  autoDetectDependencies?: boolean

  /** Enable task optimization */
  enableOptimization?: boolean
}

/**
 * Task decomposer class
 *
 * Analyzes complex tasks and breaks them down into executable subtasks.
 */
export class TaskDecomposer {
  private readonly options: Required<TaskDecompositionOptions>

  constructor(options: TaskDecompositionOptions = {}) {
    this.options = {
      strategy: options.strategy ?? 'hierarchical',
      maxDepth: options.maxDepth ?? 5,
      maxParallelTasks: options.maxParallelTasks ?? 10,
      minTaskGranularity: options.minTaskGranularity ?? 1000,
      autoDetectDependencies: options.autoDetectDependencies ?? true,
      enableOptimization: options.enableOptimization ?? true,
    }
  }

  /**
   * Decompose a complex task into subtasks
   *
   * @param task - The task to decompose
   * @param strategy - Optional strategy override
   * @returns Decomposition result with subtasks and dependencies
   */
  async decompose(
    task: Task,
    strategy?: DecompositionStrategy,
  ): Promise<TaskDecompositionResult> {
    const decompositionStrategy = strategy ?? this.options.strategy

    // Analyze task complexity
    const complexity = this.analyzeComplexity(task)

    // Choose decomposition strategy based on task characteristics
    const effectiveStrategy = this.selectStrategy(task, complexity, decompositionStrategy)

    // Decompose based on strategy
    let subtasks: Task[]
    let dependencies: TaskDependency[]

    switch (effectiveStrategy) {
      case 'sequential':
        ({ subtasks, dependencies } = await this.decomposeSequential(task))
        break
      case 'parallel':
        ({ subtasks, dependencies } = await this.decomposeParallel(task))
        break
      case 'hierarchical':
        ({ subtasks, dependencies } = await this.decomposeHierarchical(task))
        break
      case 'pipeline':
        ({ subtasks, dependencies } = await this.decomposePipeline(task))
        break
      case 'map-reduce':
        ({ subtasks, dependencies } = await this.decomposeMapReduce(task))
        break
      default:
        throw new Error(`Unknown decomposition strategy: ${effectiveStrategy}`)
    }

    // Auto-detect additional dependencies if enabled
    if (this.options.autoDetectDependencies) {
      dependencies = this.detectDependencies(subtasks, dependencies)
    }

    // Build execution graph
    const executionGraph = this.buildExecutionGraph(subtasks, dependencies)

    // Optimize execution order if enabled
    if (this.options.enableOptimization) {
      this.optimizeExecutionGraph(executionGraph, subtasks)
    }

    // Calculate estimated duration
    const estimatedDuration = this.calculateEstimatedDuration(subtasks, executionGraph)

    return {
      originalTask: task,
      subtasks,
      dependencies,
      strategy: effectiveStrategy,
      executionGraph,
      estimatedDuration,
      metadata: {
        complexity,
        decompositionTimestamp: new Date().toISOString(),
        subtaskCount: subtasks.length,
        dependencyCount: dependencies.length,
      },
    }
  }

  /**
   * Analyze task complexity
   *
   * @param task - Task to analyze
   * @returns Complexity score (0-1)
   */
  private analyzeComplexity(task: Task): number {
    let complexity = 0

    // Factor 1: Number of required capabilities
    complexity += Math.min(task.requiredCapabilities.length / 10, 0.3)

    // Factor 2: Task description length (proxy for complexity)
    complexity += Math.min(task.description.length / 1000, 0.2)

    // Factor 3: Number of input parameters
    complexity += Math.min(Object.keys(task.input.parameters).length / 20, 0.2)

    // Factor 4: Number of constraints
    complexity += Math.min((task.input.constraints?.length ?? 0) / 10, 0.15)

    // Factor 5: Estimated duration
    if (task.estimatedDuration) {
      complexity += Math.min(task.estimatedDuration / 300000, 0.15) // 5 minutes max
    }

    return Math.min(complexity, 1)
  }

  /**
   * Select appropriate decomposition strategy
   *
   * @param task - Task to decompose
   * @param complexity - Task complexity score
   * @param preferredStrategy - Preferred strategy
   * @returns Selected strategy
   */
  private selectStrategy(
    task: Task,
    complexity: number,
    preferredStrategy: DecompositionStrategy,
  ): DecompositionStrategy {
    // For simple tasks, use sequential
    if (complexity < 0.3) {
      return 'sequential'
    }

    // For data processing tasks, prefer pipeline or map-reduce
    if (task.type.includes('data') || task.type.includes('process')) {
      return task.input.files && task.input.files.length > 1 ? 'map-reduce' : 'pipeline'
    }

    // For analysis tasks, prefer parallel
    if (task.type.includes('analysis') || task.type.includes('review')) {
      return 'parallel'
    }

    // Otherwise use preferred strategy
    return preferredStrategy
  }

  /**
   * Decompose task sequentially
   *
   * @param task - Task to decompose
   * @returns Subtasks and dependencies
   */
  private async decomposeSequential(
    task: Task,
  ): Promise<{ subtasks: Task[], dependencies: TaskDependency[] }> {
    const subtasks: Task[] = []
    const dependencies: TaskDependency[] = []

    // Identify sequential steps based on task description
    const steps = this.identifySequentialSteps(task)

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const subtask = this.createSubtask(task, step, i)
      subtasks.push(subtask)

      // Add sequential dependency to previous task
      if (i > 0) {
        dependencies.push({
          taskId: subtasks[i - 1].id,
          type: 'sequential',
          required: true,
        })
      }
    }

    return { subtasks, dependencies }
  }

  /**
   * Decompose task into parallel subtasks
   *
   * @param task - Task to decompose
   * @returns Subtasks and dependencies
   */
  private async decomposeParallel(
    task: Task,
  ): Promise<{ subtasks: Task[], dependencies: TaskDependency[] }> {
    const subtasks: Task[] = []
    const dependencies: TaskDependency[] = []

    // Identify independent subtasks
    const parallelSteps = this.identifyParallelSteps(task)

    for (let i = 0; i < parallelSteps.length; i++) {
      const step = parallelSteps[i]
      const subtask = this.createSubtask(task, step, i)
      subtasks.push(subtask)
    }

    // No dependencies for parallel tasks
    return { subtasks, dependencies }
  }

  /**
   * Decompose task hierarchically
   *
   * @param task - Task to decompose
   * @returns Subtasks and dependencies
   */
  private async decomposeHierarchical(
    task: Task,
    depth = 0,
  ): Promise<{ subtasks: Task[], dependencies: TaskDependency[] }> {
    const subtasks: Task[] = []
    const dependencies: TaskDependency[] = []

    if (depth >= this.options.maxDepth) {
      return { subtasks: [task], dependencies: [] }
    }

    // Identify high-level phases
    const phases = this.identifyPhases(task)

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i]
      const phaseTask = this.createSubtask(task, phase, i)

      // Recursively decompose if still complex
      const phaseComplexity = this.analyzeComplexity(phaseTask)
      if (phaseComplexity > 0.5 && depth < this.options.maxDepth - 1) {
        const { subtasks: phaseSubtasks, dependencies: phaseDeps }
          = await this.decomposeHierarchical(phaseTask, depth + 1)
        subtasks.push(...phaseSubtasks)
        dependencies.push(...phaseDeps)
      }
      else {
        subtasks.push(phaseTask)
      }

      // Add sequential dependency between phases
      if (i > 0 && subtasks.length > 1) {
        dependencies.push({
          taskId: subtasks[subtasks.length - 2].id,
          type: 'sequential',
          required: true,
        })
      }
    }

    return { subtasks, dependencies }
  }

  /**
   * Decompose task as a pipeline
   *
   * @param task - Task to decompose
   * @returns Subtasks and dependencies
   */
  private async decomposePipeline(
    task: Task,
  ): Promise<{ subtasks: Task[], dependencies: TaskDependency[] }> {
    const subtasks: Task[] = []
    const dependencies: TaskDependency[] = []

    // Identify pipeline stages
    const stages = this.identifyPipelineStages(task)

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      const subtask = this.createSubtask(task, stage, i)
      subtasks.push(subtask)

      // Add data dependency to previous stage
      if (i > 0) {
        dependencies.push({
          taskId: subtasks[i - 1].id,
          type: 'data',
          required: true,
          dataMapping: {
            output: 'input',
          },
        })
      }
    }

    return { subtasks, dependencies }
  }

  /**
   * Decompose task using map-reduce pattern
   *
   * @param task - Task to decompose
   * @returns Subtasks and dependencies
   */
  private async decomposeMapReduce(
    task: Task,
  ): Promise<{ subtasks: Task[], dependencies: TaskDependency[] }> {
    const subtasks: Task[] = []
    const dependencies: TaskDependency[] = []

    // Create map tasks (parallel processing)
    const mapTasks = this.createMapTasks(task)
    subtasks.push(...mapTasks)

    // Create reduce task (aggregation)
    const reduceTask = this.createReduceTask(task, mapTasks.length)
    subtasks.push(reduceTask)

    // Add dependencies from all map tasks to reduce task
    for (const mapTask of mapTasks) {
      dependencies.push({
        taskId: mapTask.id,
        type: 'data',
        required: true,
        dataMapping: {
          output: 'input',
        },
      })
    }

    return { subtasks, dependencies }
  }

  /**
   * Identify sequential steps in a task
   *
   * @param task - Task to analyze
   * @returns Sequential steps
   */
  private identifySequentialSteps(task: Task): Array<{ name: string, description: string, capabilities: string[] }> {
    // Simple heuristic: split by common sequential keywords
    const steps: Array<{ name: string, description: string, capabilities: string[] }> = []

    // Default sequential breakdown
    steps.push({
      name: `${task.name} - Preparation`,
      description: `Prepare for ${task.description}`,
      capabilities: fromAgentCapabilities(task.requiredCapabilities),
    })

    steps.push({
      name: `${task.name} - Execution`,
      description: `Execute ${task.description}`,
      capabilities: fromAgentCapabilities(task.requiredCapabilities),
    })

    steps.push({
      name: `${task.name} - Validation`,
      description: `Validate results of ${task.description}`,
      capabilities: ['code-analysis'],
    })

    return steps
  }

  /**
   * Identify parallel steps in a task
   *
   * @param task - Task to analyze
   * @returns Parallel steps
   */
  private identifyParallelSteps(task: Task): Array<{ name: string, description: string, capabilities: string[] }> {
    const steps: Array<{ name: string, description: string, capabilities: string[] }> = []

    // If task has multiple files, create parallel tasks for each
    if (task.input.files && task.input.files.length > 1) {
      for (const file of task.input.files) {
        steps.push({
          name: `${task.name} - ${file}`,
          description: `${task.description} for ${file}`,
          capabilities: fromAgentCapabilities(task.requiredCapabilities),
        })
      }
    }
    else {
      // Default parallel breakdown by capability
      const capabilityGroups = this.groupCapabilities(fromAgentCapabilities(task.requiredCapabilities))
      for (const [group, capabilities] of capabilityGroups) {
        steps.push({
          name: `${task.name} - ${group}`,
          description: `${task.description} (${group})`,
          capabilities,
        })
      }
    }

    return steps
  }

  /**
   * Identify high-level phases in a task
   *
   * @param task - Task to analyze
   * @returns Task phases
   */
  private identifyPhases(task: Task): Array<{ name: string, description: string, capabilities: string[] }> {
    const phases: Array<{ name: string, description: string, capabilities: string[] }> = []

    // Common software development phases
    phases.push({
      name: `${task.name} - Planning`,
      description: `Plan approach for ${task.description}`,
      capabilities: ['architecture-design'],
    })

    phases.push({
      name: `${task.name} - Implementation`,
      description: `Implement ${task.description}`,
      capabilities: fromAgentCapabilities(task.requiredCapabilities),
    })

    phases.push({
      name: `${task.name} - Testing`,
      description: `Test ${task.description}`,
      capabilities: ['test-generation', 'code-analysis'],
    })

    return phases
  }

  /**
   * Identify pipeline stages in a task
   *
   * @param task - Task to analyze
   * @returns Pipeline stages
   */
  private identifyPipelineStages(task: Task): Array<{ name: string, description: string, capabilities: string[] }> {
    const stages: Array<{ name: string, description: string, capabilities: string[] }> = []

    // Data processing pipeline
    stages.push({
      name: `${task.name} - Input Processing`,
      description: `Process input for ${task.description}`,
      capabilities: fromAgentCapabilities(task.requiredCapabilities),
    })

    stages.push({
      name: `${task.name} - Transformation`,
      description: `Transform data for ${task.description}`,
      capabilities: fromAgentCapabilities(task.requiredCapabilities),
    })

    stages.push({
      name: `${task.name} - Output Generation`,
      description: `Generate output for ${task.description}`,
      capabilities: fromAgentCapabilities(task.requiredCapabilities),
    })

    return stages
  }

  /**
   * Create map tasks for map-reduce pattern
   *
   * @param task - Original task
   * @returns Map tasks
   */
  private createMapTasks(task: Task): Task[] {
    const mapTasks: Task[] = []
    const items = task.input.files ?? [task.input.parameters]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      mapTasks.push(this.createSubtask(task, {
        name: `${task.name} - Map ${i + 1}`,
        description: `Process ${typeof item === 'string' ? item : `item ${i + 1}`}`,
        capabilities: fromAgentCapabilities(task.requiredCapabilities),
      }, i))
    }

    return mapTasks
  }

  /**
   * Create reduce task for map-reduce pattern
   *
   * @param task - Original task
   * @param mapTaskCount - Number of map tasks
   * @returns Reduce task
   */
  private createReduceTask(task: Task, mapTaskCount: number): Task {
    return this.createSubtask(task, {
      name: `${task.name} - Reduce`,
      description: `Aggregate results from ${mapTaskCount} map tasks`,
      capabilities: ['code-analysis'],
    }, mapTaskCount)
  }

  /**
   * Create a subtask from a task and step definition
   *
   * @param parentTask - Parent task
   * @param step - Step definition object
   * @param step.name - Step name
   * @param step.description - Step description
   * @param step.capabilities - Required agent capabilities
   * @param index - Step index
   * @returns Created subtask
   */
  private createSubtask(
    parentTask: Task,
    step: { name: string, description: string, capabilities: string[] },
    index: number,
  ): Task {
    const now = new Date().toISOString()

    return {
      id: nanoid(),
      name: step.name,
      description: step.description,
      type: parentTask.type,
      priority: parentTask.priority,
      status: 'pending',
      requiredCapabilities: toAgentCapabilities(step.capabilities),
      input: {
        parameters: parentTask.input.parameters,
        files: parentTask.input.files,
        context: parentTask.input.context,
        instructions: parentTask.input.instructions,
        constraints: parentTask.input.constraints,
      },
      dependencies: [],
      estimatedDuration: parentTask.estimatedDuration
        ? Math.floor(parentTask.estimatedDuration / 3)
        : undefined,
      maxRetries: parentTask.maxRetries,
      retryCount: 0,
      timeout: parentTask.timeout,
      metadata: {
        ...parentTask.metadata,
        tags: [...parentTask.metadata.tags, 'subtask'],
        custom: {
          ...parentTask.metadata.custom,
          parentTaskId: parentTask.id,
          subtaskIndex: index,
        },
      },
      createdAt: now,
      progress: 0,
      parentId: parentTask.id,
    }
  }

  /**
   * Group capabilities by category
   *
   * @param capabilities - Capabilities to group
   * @returns Grouped capabilities
   */
  private groupCapabilities(capabilities: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>()

    for (const capability of capabilities) {
      const category = capability.split('-')[0]
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(capability)
    }

    return groups
  }

  /**
   * Detect additional dependencies between tasks
   *
   * @param subtasks - Subtasks to analyze
   * @param existingDeps - Existing dependencies
   * @returns Updated dependencies
   */
  private detectDependencies(
    subtasks: Task[],
    existingDeps: TaskDependency[],
  ): TaskDependency[] {
    const dependencies = [...existingDeps]

    // Detect data dependencies based on input/output patterns
    for (let i = 0; i < subtasks.length; i++) {
      for (let j = i + 1; j < subtasks.length; j++) {
        const task1 = subtasks[i]
        const task2 = subtasks[j]

        // Check if task2 might need output from task1
        if (this.hasDataDependency(task1, task2)) {
          // Check if dependency doesn't already exist
          const exists = dependencies.some(
            dep => dep.taskId === task1.id && subtasks[j].id === task2.id,
          )

          if (!exists) {
            dependencies.push({
              taskId: task1.id,
              type: 'data',
              required: false,
            })
          }
        }
      }
    }

    return dependencies
  }

  /**
   * Check if one task has a data dependency on another
   *
   * @param producer - Potential producer task
   * @param consumer - Potential consumer task
   * @returns Whether dependency exists
   */
  private hasDataDependency(producer: Task, consumer: Task): boolean {
    // Simple heuristic: check if consumer's description mentions producer's output
    const producerKeywords = producer.name.toLowerCase().split(/\s+/)
    const consumerDesc = consumer.description.toLowerCase()

    return producerKeywords.some(keyword => consumerDesc.includes(keyword))
  }

  /**
   * Build execution graph from tasks and dependencies
   *
   * @param subtasks - Subtasks
   * @param dependencies - Task dependencies
   * @returns Execution graph
   */
  private buildExecutionGraph(
    subtasks: Task[],
    dependencies: TaskDependency[],
  ): TaskExecutionGraph {
    const nodes: TaskGraphNode[] = []
    const edges: TaskGraphEdge[] = []
    // taskMap reserved for future dependency resolution enhancements

    // Create nodes
    for (const task of subtasks) {
      const incomingEdges = dependencies
        .filter((dep) => {
          const dependentTask = subtasks.find(t =>
            t.dependencies.some(d => d.taskId === dep.taskId),
          )
          return dependentTask?.id === task.id
        })
        .map(dep => dep.taskId)

      const outgoingEdges = dependencies
        .filter(dep => dep.taskId === task.id)
        .map((dep) => {
          const dependentTask = subtasks.find(t =>
            t.dependencies.includes(dep),
          )
          return dependentTask?.id ?? ''
        })
        .filter(id => id !== '')

      nodes.push({
        taskId: task.id,
        level: 0, // Will be calculated later
        isLeaf: outgoingEdges.length === 0,
        isRoot: incomingEdges.length === 0,
        incomingEdges,
        outgoingEdges,
      })
    }

    // Create edges
    for (const dep of dependencies) {
      const dependentTask = subtasks.find(t =>
        t.dependencies.includes(dep),
      )

      if (dependentTask) {
        edges.push({
          id: nanoid(),
          from: dep.taskId,
          to: dependentTask.id,
          type: dep.type,
          weight: dep.required ? 1 : 0.5,
        })
      }
    }

    // Calculate node levels (topological sort)
    this.calculateNodeLevels(nodes, edges)

    // Build execution stages
    const stages = this.buildExecutionStages(nodes, subtasks)

    return { nodes, edges, stages }
  }

  /**
   * Calculate node levels in the graph
   *
   * @param nodes - Graph nodes
   * @param edges - Graph edges
   */
  private calculateNodeLevels(nodes: TaskGraphNode[], edges: TaskGraphEdge[]): void {
    const visited = new Set<string>()
    const levels = new Map<string, number>()

    // Initialize root nodes at level 0
    for (const node of nodes) {
      if (node.isRoot) {
        levels.set(node.taskId, 0)
      }
    }

    // BFS to calculate levels
    const queue = nodes.filter(n => n.isRoot).map(n => n.taskId)

    while (queue.length > 0) {
      const taskId = queue.shift()!
      if (visited.has(taskId))
        continue

      visited.add(taskId)
      const currentLevel = levels.get(taskId) ?? 0

      // Update levels of dependent tasks
      const outgoingEdges = edges.filter(e => e.from === taskId)
      for (const edge of outgoingEdges) {
        const newLevel = currentLevel + 1
        const existingLevel = levels.get(edge.to) ?? -1

        if (newLevel > existingLevel) {
          levels.set(edge.to, newLevel)
        }

        queue.push(edge.to)
      }
    }

    // Update node levels
    for (const node of nodes) {
      node.level = levels.get(node.taskId) ?? 0
    }
  }

  /**
   * Build execution stages from graph nodes
   *
   * @param nodes - Graph nodes
   * @param subtasks - Subtasks
   * @returns Execution stages
   */
  private buildExecutionStages(nodes: TaskGraphNode[], subtasks: Task[]): TaskStage[] {
    const stages: TaskStage[] = []
    const maxLevel = Math.max(...nodes.map(n => n.level))

    for (let level = 0; level <= maxLevel; level++) {
      const stageTasks = nodes
        .filter(n => n.level === level)
        .map(n => n.taskId)

      const estimatedDuration = Math.max(
        ...stageTasks.map((taskId) => {
          const task = subtasks.find(t => t.id === taskId)
          return task?.estimatedDuration ?? 0
        }),
      )

      stages.push({
        stage: level,
        tasks: stageTasks,
        estimatedDuration,
      })
    }

    return stages
  }

  /**
   * Optimize execution graph for better performance
   *
   * @param graph - Execution graph
   * @param subtasks - Subtasks
   */
  private optimizeExecutionGraph(graph: TaskExecutionGraph, subtasks: Task[]): void {
    // Optimization 1: Merge small sequential tasks
    this.mergeSmallTasks(graph, subtasks)

    // Optimization 2: Reorder tasks within stages for better load balancing
    this.reorderTasksInStages(graph, subtasks)

    // Optimization 3: Identify critical path
    this.identifyCriticalPath(graph, subtasks)
  }

  /**
   * Merge small sequential tasks
   *
   * @param graph - Execution graph
   * @param subtasks - Subtasks
   */
  private mergeSmallTasks(graph: TaskExecutionGraph, subtasks: Task[]): void {
    // Find sequential tasks that are below minimum granularity
    for (const stage of graph.stages) {
      if (stage.tasks.length === 1) {
        const task = subtasks.find(t => t.id === stage.tasks[0])
        if (task && (task.estimatedDuration ?? 0) < this.options.minTaskGranularity) {
          // Mark for potential merging (implementation would merge with adjacent tasks)
          task.metadata.custom = {
            ...task.metadata.custom,
            mergeable: true,
          }
        }
      }
    }
  }

  /**
   * Reorder tasks within stages for load balancing
   *
   * @param graph - Execution graph
   * @param subtasks - Subtasks
   */
  private reorderTasksInStages(graph: TaskExecutionGraph, subtasks: Task[]): void {
    for (const stage of graph.stages) {
      // Sort tasks by estimated duration (longest first)
      stage.tasks.sort((a, b) => {
        const taskA = subtasks.find(t => t.id === a)
        const taskB = subtasks.find(t => t.id === b)
        const durationA = taskA?.estimatedDuration ?? 0
        const durationB = taskB?.estimatedDuration ?? 0
        return durationB - durationA
      })
    }
  }

  /**
   * Identify critical path in the execution graph
   *
   * @param graph - Execution graph
   * @param subtasks - Subtasks
   */
  private identifyCriticalPath(graph: TaskExecutionGraph, subtasks: Task[]): void {
    // Calculate earliest start times
    const earliestStart = new Map<string, number>()

    for (const stage of graph.stages) {
      for (const taskId of stage.tasks) {
        const task = subtasks.find(t => t.id === taskId)
        const node = graph.nodes.find(n => n.taskId === taskId)

        if (!node || !task)
          continue

        // Calculate earliest start based on dependencies
        let maxPredecessorFinish = 0
        for (const predId of node.incomingEdges) {
          const predTask = subtasks.find(t => t.id === predId)
          const predStart = earliestStart.get(predId) ?? 0
          const predDuration = predTask?.estimatedDuration ?? 0
          maxPredecessorFinish = Math.max(maxPredecessorFinish, predStart + predDuration)
        }

        earliestStart.set(taskId, maxPredecessorFinish)
      }
    }

    // Mark critical path tasks
    for (const [taskId, _] of earliestStart) {
      const task = subtasks.find(t => t.id === taskId)
      if (task) {
        task.metadata.custom = {
          ...task.metadata.custom,
          onCriticalPath: true,
        }
      }
    }
  }

  /**
   * Calculate estimated total duration
   *
   * @param _subtasks - Subtasks (unused but kept for API consistency)
   * @param graph - Execution graph
   * @returns Estimated duration in milliseconds
   */
  private calculateEstimatedDuration(_subtasks: Task[], graph: TaskExecutionGraph): number {
    // Sum of stage durations (stages run sequentially)
    return graph.stages.reduce((total, stage) => {
      return total + stage.estimatedDuration
    }, 0)
  }
}

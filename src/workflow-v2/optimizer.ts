/**
 * Workflow Optimizer
 *
 * This module analyzes workflows and provides optimization suggestions
 * for performance, resource usage, and execution time.
 */

import type {
  Improvement,
  OptimizationResult,
  ProjectContext,
  Workflow,
  WorkflowStep,
} from './types.js'

interface OptimizationRule {
  id: string
  name: string
  description: string
  apply: (workflow: Workflow, context: ProjectContext) => Improvement[]
  priority: number
}

export class WorkflowOptimizer {
  private rules: OptimizationRule[]

  constructor() {
    this.rules = [
      {
        id: 'parallelization',
        name: 'Step Parallelization',
        description: 'Identify steps that can be executed in parallel',
        apply: this.optimizeParallelization.bind(this),
        priority: 10,
      },
      {
        id: 'caching',
        name: 'Build Caching',
        description: 'Add caching for expensive operations',
        apply: this.optimizeCaching.bind(this),
        priority: 8,
      },
      {
        id: 'dependency-reduction',
        name: 'Dependency Reduction',
        description: 'Remove unnecessary dependencies between steps',
        apply: this.optimizeDependencies.bind(this),
        priority: 7,
      },
      {
        id: 'resource-cleanup',
        name: 'Resource Cleanup',
        description: 'Add resource cleanup to prevent leaks',
        apply: this.optimizeResourceCleanup.bind(this),
        priority: 6,
      },
      {
        id: 'timeout-optimization',
        name: 'Timeout Optimization',
        description: 'Adjust timeouts based on step complexity',
        apply: this.optimizeTimeouts.bind(this),
        priority: 5,
      },
      {
        id: 'error-handling',
        name: 'Error Handling',
        description: 'Improve error handling and recovery',
        apply: this.optimizeErrorHandling.bind(this),
        priority: 9,
      },
    ]
  }

  /**
   * Optimize a workflow
   */
  optimize(workflow: Workflow, context: ProjectContext): OptimizationResult {
    const improvements: Improvement[] = []

    // Apply optimization rules
    for (const rule of this.rules) {
      try {
        const ruleImprovements = rule.apply(workflow, context)
        improvements.push(...ruleImprovements)
      }
      catch (error) {
        console.warn(`Optimization rule ${rule.id} failed:`, error)
      }
    }

    // Apply improvements to create optimized workflow
    const optimizedWorkflow = this.applyImprovements(workflow, improvements)

    // Calculate metrics
    const originalMetrics = this.calculateMetrics(workflow)
    const optimizedMetrics = this.calculateMetrics(optimizedWorkflow)

    return {
      originalWorkflow: workflow,
      optimizedWorkflow,
      improvements,
      estimatedTimeSaved: originalMetrics.estimatedDuration - optimizedMetrics.estimatedDuration,
      estimatedResourceSaved: this.formatResourceSaving(originalMetrics, optimizedMetrics),
    }
  }

  /**
   * Optimize step parallelization
   */
  private optimizeParallelization(workflow: Workflow): Improvement[] {
    const improvements: Improvement[] = []
    const dependencyGraph = this.buildDependencyGraph(workflow)
    const stepLevels = this.calculateStepLevels(workflow)

    // Find steps at the same level that can be parallelized
    const levelMap = new Map<number, string[]>()
    for (const [stepId, level] of stepLevels) {
      if (!levelMap.has(level)) {
        levelMap.set(level, [])
      }
      levelMap.get(level)!.push(stepId)
    }

    for (const [level, stepIds] of levelMap) {
      if (stepIds.length > 1) {
        improvements.push({
          type: 'parallelization',
          description: `Steps ${stepIds.join(', ')} can be executed in parallel at level ${level}`,
          impact: 'high',
          before: `Sequential execution of ${stepIds.length} steps`,
          after: `Parallel execution of ${stepIds.length} steps`,
        })
      }
    }

    return improvements
  }

  /**
   * Optimize caching
   */
  private optimizeCaching(workflow: Workflow): Improvement[] {
    const improvements: Improvement[] = []
    const cacheableOperations = [
      'npm install',
      'yarn install',
      'pip install',
      'mvn install',
      'gradle build',
      'cargo build',
      'npm run build',
      'yarn build',
    ]

    for (const step of workflow.steps) {
      if (!step.command) {
        continue
      }

      const isCacheable = cacheableOperations.some(op => step.command!.includes(op))
      if (isCacheable && !step.command!.includes('--cache')) {
        improvements.push({
          type: 'caching',
          description: `Add caching for step: ${step.name}`,
          impact: 'medium',
          before: 'No caching configured',
          after: 'Enable caching with appropriate cache keys',
        })
      }
    }

    return improvements
  }

  /**
   * Optimize dependencies
   */
  private optimizeDependencies(workflow: Workflow): Improvement[] {
    const improvements: Improvement[] = []
    const dependencyGraph = this.buildDependencyGraph(workflow)

    for (const step of workflow.steps) {
      if (!step.dependencies || step.dependencies.length === 0) {
        continue
      }

      // Check if all dependencies are actually needed
      const requiredDeps = new Set<string>()
      const visited = new Set<string>()

      const findTransitiveDeps = (depId: string): void => {
        if (visited.has(depId)) {
          return
        }
        visited.add(depId)

        const dep = workflow.steps.find(s => s.id === depId)
        if (dep?.dependencies) {
          for (const transitiveDep of dep.dependencies) {
            requiredDeps.add(transitiveDep)
            findTransitiveDeps(transitiveDep)
          }
        }
      }

      // Find what this step actually needs
      for (const dep of step.dependencies) {
        requiredDeps.add(dep)
        findTransitiveDeps(dep)
      }

      // Check for unnecessary direct dependencies
      for (const dep of step.dependencies) {
        if (requiredDeps.has(dep) && step.dependencies.filter(d => d === dep).length > 1) {
          improvements.push({
            type: 'dependency_reduction',
            stepId: step.id,
            description: `Remove duplicate dependency: ${dep}`,
            impact: 'low',
            before: `Multiple references to ${dep}`,
            after: 'Single reference to dependency',
          })
        }
      }
    }

    return improvements
  }

  /**
   * Optimize resource cleanup
   */
  private optimizeResourceCleanup(workflow: Workflow): Improvement[] {
    const improvements: Improvement[] = []
    const resourceOperations = [
      'docker run',
      'docker-compose up',
      'npm start',
      'node server.js',
      'python app.py',
    ]

    const cleanupOperations = [
      'docker stop',
      'docker-compose down',
      'pkill',
      'kill',
      'docker rm',
      'docker rmi',
    ]

    // Find steps that start resources without cleanup
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      if (!step.command) {
        continue
      }

      const startsResource = resourceOperations.some(op => step.command!.includes(op))
      if (!startsResource) {
        continue
      }

      // Check if there's a cleanup step
      const hasCleanup = workflow.steps.slice(i + 1).some((s: WorkflowStep) => {
        return s.command && cleanupOperations.some(op => s.command!.includes(op))
      })

      if (!hasCleanup) {
        improvements.push({
          type: 'resource_cleanup',
          stepId: step.id,
          description: `Add cleanup step for resource started by: ${step.name}`,
          impact: 'medium',
          before: 'No cleanup for started resources',
          after: 'Automatic cleanup of resources',
        })
      }
    }

    return improvements
  }

  /**
   * Optimize timeouts
   */
  private optimizeTimeouts(workflow: Workflow): Improvement[] {
    const improvements: Improvement[] = []

    for (const step of workflow.steps) {
      if (!step.timeout) {
        // Suggest timeout based on command type
        const defaultTimeouts: Record<string, number> = {
          'npm install': 300,
          'yarn install': 300,
          'npm test': 600,
          'docker build': 600,
          'docker push': 900,
          'git clone': 300,
          'mvn build': 900,
          'gradle build': 900,
        }

        for (const [cmd, timeout] of Object.entries(defaultTimeouts)) {
          if (step.command?.includes(cmd)) {
            improvements.push({
              type: 'timeout_optimization',
              stepId: step.id,
              description: `Add appropriate timeout (${timeout}s) for: ${step.name}`,
              impact: 'low',
              before: 'No timeout configured',
              after: `Timeout set to ${timeout} seconds`,
            })
            break
          }
        }
      }
      else {
        // Check if timeout is too long or too short
        const isTooLong = step.timeout > 3600
        const isTooShort = step.timeout < 30

        if (isTooLong) {
          improvements.push({
            type: 'timeout_optimization',
            stepId: step.id,
            description: `Reduce excessive timeout (${step.timeout}s) for: ${step.name}`,
            impact: 'low',
            before: `Excessive timeout of ${step.timeout}s`,
            after: 'Reduced timeout to prevent hanging',
          })
        }
        else if (isTooShort) {
          improvements.push({
            type: 'timeout_optimization',
            stepId: step.id,
            description: `Increase insufficient timeout (${step.timeout}s) for: ${step.name}`,
            impact: 'medium',
            before: `Insufficient timeout of ${step.timeout}s`,
            after: 'Increased timeout to prevent premature failures',
          })
        }
      }
    }

    return improvements
  }

  /**
   * Optimize error handling
   */
  private optimizeErrorHandling(workflow: Workflow): Improvement[] {
    const improvements: Improvement[] = []

    for (const step of workflow.steps) {
      if (!step.errorHandling) {
        improvements.push({
          type: 'error_handling',
          stepId: step.id,
          description: `Add error handling to: ${step.name}`,
          impact: 'high',
          before: 'No error handling configured',
          after: 'Proper error handling with retry logic',
        })
        continue
      }

      // Check retry configuration
      if (!step.retry) {
        improvements.push({
          type: 'error_handling',
          stepId: step.id,
          description: `Add retry configuration to: ${step.name}`,
          impact: 'medium',
          before: 'No retry configuration',
          after: 'Retry with exponential backoff',
        })
      }
      else if (step.retry.maxAttempts < 2 || step.retry.maxAttempts > 5) {
        improvements.push({
          type: 'error_handling',
          stepId: step.id,
          description: `Adjust retry attempts (${step.retry.maxAttempts}) for: ${step.name}`,
          impact: 'low',
          before: `Suboptimal retry attempts: ${step.retry.maxAttempts}`,
          after: 'Retry attempts between 2-5',
        })
      }
    }

    return improvements
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(workflow: Workflow): Map<string, string[]> {
    const graph = new Map<string, string[]>()

    for (const step of workflow.steps) {
      graph.set(step.id, step.dependencies || [])
    }

    return graph
  }

  /**
   * Calculate step levels for parallelization
   */
  private calculateStepLevels(workflow: Workflow): Map<string, number> {
    const levels = new Map<string, number>()
    const dependencyGraph = this.buildDependencyGraph(workflow)

    const calculateLevel = (stepId: string): number => {
      if (levels.has(stepId)) {
        return levels.get(stepId)!
      }

      const dependencies = dependencyGraph.get(stepId) || []
      if (dependencies.length === 0) {
        levels.set(stepId, 0)
        return 0
      }

      const maxDepLevel = Math.max(0, ...dependencies.map(dep => calculateLevel(dep)))
      levels.set(stepId, maxDepLevel + 1)
      return maxDepLevel + 1
    }

    for (const step of workflow.steps) {
      calculateLevel(step.id)
    }

    return levels
  }

  /**
   * Calculate workflow metrics
   */
  private calculateMetrics(workflow: Workflow): {
    estimatedDuration: number
    resourceUsage: {
      cpu: number
      memory: number
      network: number
    }
    complexity: number
  } {
    let estimatedDuration = 0
    let complexity = 0

    for (const step of workflow.steps) {
      // Estimate duration based on timeout or default values
      const duration = step.timeout || this.estimateStepDuration(step)
      estimatedDuration += duration

      // Calculate complexity based on command complexity
      complexity += this.calculateStepComplexity(step)
    }

    // Adjust for parallelization
    const stepLevels = this.calculateStepLevels(workflow)
    const maxLevel = Math.max(0, ...Array.from(stepLevels.values()))
    estimatedDuration = estimatedDuration / Math.max(1, maxLevel)

    return {
      estimatedDuration,
      resourceUsage: {
        cpu: complexity * 10,
        memory: complexity * 50,
        network: workflow.steps.length * 10,
      },
      complexity,
    }
  }

  /**
   * Estimate step duration
   */
  private estimateStepDuration(step: WorkflowStep): number {
    const defaultDurations: Record<string, number> = {
      'npm install': 60,
      'yarn install': 60,
      'pip install': 45,
      'npm test': 120,
      'yarn test': 120,
      'docker build': 180,
      'docker push': 120,
      'git clone': 30,
      'git push': 15,
    }

    if (!step.command) {
      return 30 // Default
    }

    for (const [cmd, duration] of Object.entries(defaultDurations)) {
      if (step.command.includes(cmd)) {
        return duration
      }
    }

    return 60 // Generic default
  }

  /**
   * Calculate step complexity
   */
  private calculateStepComplexity(step: WorkflowStep): number {
    if (!step.command) {
      return 1
    }

    let complexity = 1

    // Increase complexity for build operations
    if (step.command.includes('build')) {
      complexity += 2
    }

    // Increase complexity for test operations
    if (step.command.includes('test')) {
      complexity += 1
    }

    // Increase complexity for deployment operations
    if (step.command.includes('deploy') || step.command.includes('push')) {
      complexity += 2
    }

    // Increase complexity for long-running operations
    if ((step.timeout || 0) > 300) {
      complexity += 1
    }

    return complexity
  }

  /**
   * Apply improvements to workflow
   */
  private applyImprovements(workflow: Workflow, improvements: Improvement[]): Workflow {
    const optimizedWorkflow = { ...workflow }

    // Group improvements by type
    const improvementsByType = new Map<string, Improvement[]>()
    for (const improvement of improvements) {
      const type = improvement.type
      if (!improvementsByType.has(type)) {
        improvementsByType.set(type, [])
      }
      improvementsByType.get(type)!.push(improvement)
    }

    // Apply improvements based on type
    for (const [type, typeImprovements] of improvementsByType) {
      switch (type) {
        case 'parallelization':
          optimizedWorkflow.steps = this.applyParallelization(optimizedWorkflow.steps, typeImprovements)
          break

        case 'caching':
          optimizedWorkflow.steps = this.applyCaching(optimizedWorkflow.steps, typeImprovements)
          break

        case 'resource_cleanup':
          optimizedWorkflow.steps = this.applyResourceCleanup(optimizedWorkflow.steps, typeImprovements)
          break

        case 'timeout_optimization':
          optimizedWorkflow.steps = this.applyTimeoutOptimization(optimizedWorkflow.steps, typeImprovements)
          break

        case 'error_handling':
          optimizedWorkflow.steps = this.applyErrorHandling(optimizedWorkflow.steps, typeImprovements)
          break
      }
    }

    return optimizedWorkflow
  }

  /**
   * Apply parallelization improvements
   */
  private applyParallelization(steps: WorkflowStep[], improvements: Improvement[]): WorkflowStep[] {
    // Implementation would add parallel execution metadata
    return steps
  }

  /**
   * Apply caching improvements
   */
  private applyCaching(steps: WorkflowStep[], improvements: Improvement[]): WorkflowStep[] {
    const updatedSteps = [...steps]

    for (const improvement of improvements) {
      if (!improvement.stepId) {
        continue
      }

      const stepIndex = updatedSteps.findIndex(s => s.id === improvement.stepId)
      if (stepIndex === -1) {
        continue
      }

      const step = updatedSteps[stepIndex]
      updatedSteps[stepIndex] = {
        ...step,
        command: this.addCachingToCommand(step.command),
      }
    }

    return updatedSteps
  }

  /**
   * Add caching to command
   */
  private addCachingToCommand(command?: string): string | undefined {
    if (!command) {
      return command
    }

    // Add cache directory for npm/yarn
    if (command.includes('npm install')) {
      return `${command} --cache .npm`
    }

    if (command.includes('yarn install')) {
      return `${command} --cache-folder .yarn-cache`
    }

    return command
  }

  /**
   * Apply resource cleanup improvements
   */
  private applyResourceCleanup(steps: WorkflowStep[], improvements: Improvement[]): WorkflowStep[] {
    const updatedSteps = [...steps]

    for (const improvement of improvements) {
      if (!improvement.stepId) {
        continue
      }

      // Add cleanup step after resource creation
      const stepIndex = updatedSteps.findIndex(s => s.id === improvement.stepId)
      if (stepIndex === -1) {
        continue
      }

      // Add cleanup step
      const cleanupStep: WorkflowStep = {
        id: `${improvement.stepId}-cleanup`,
        name: `Cleanup: ${updatedSteps[stepIndex].name}`,
        description: `Clean up resources from ${updatedSteps[stepIndex].name}`,
        command: this.generateCleanupCommand(updatedSteps[stepIndex].command),
        dependencies: [improvement.stepId],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
        },
        errorHandling: {
          strategy: 'continue',
        },
      }

      // Insert cleanup step
      updatedSteps.splice(stepIndex + 1, 0, cleanupStep)
    }

    return updatedSteps
  }

  /**
   * Generate cleanup command
   */
  private generateCleanupCommand(command?: string): string {
    if (!command) {
      return 'echo "No cleanup needed"'
    }

    // Generate appropriate cleanup based on command
    if (command.includes('docker run')) {
      return 'docker stop $(docker ps -q) || true'
    }

    if (command.includes('npm start')) {
      return 'pkill -f "npm start" || true'
    }

    return 'echo "Cleanup completed"'
  }

  /**
   * Apply timeout optimization
   */
  private applyTimeoutOptimization(steps: WorkflowStep[], improvements: Improvement[]): WorkflowStep[] {
    const updatedSteps = [...steps]

    for (const improvement of improvements) {
      if (!improvement.stepId) {
        continue
      }

      const stepIndex = updatedSteps.findIndex(s => s.id === improvement.stepId)
      if (stepIndex === -1) {
        continue
      }

      const step = updatedSteps[stepIndex]
      updatedSteps[stepIndex] = {
        ...step,
        timeout: this.calculateOptimalTimeout(step),
      }
    }

    return updatedSteps
  }

  /**
   * Calculate optimal timeout
   */
  private calculateOptimalTimeout(step: WorkflowStep): number {
    if (!step.command) {
      return 300
    }

    // Calculate based on command type and historical data
    const baseTimeout = this.estimateStepDuration(step)
    return Math.ceil(baseTimeout * 1.5) // Add 50% buffer
  }

  /**
   * Apply error handling improvements
   */
  private applyErrorHandling(steps: WorkflowStep[], improvements: Improvement[]): WorkflowStep[] {
    const updatedSteps = [...steps]

    for (const improvement of improvements) {
      if (!improvement.stepId) {
        continue
      }

      const stepIndex = updatedSteps.findIndex(s => s.id === improvement.stepId)
      if (stepIndex === -1) {
        continue
      }

      const step = updatedSteps[stepIndex]
      updatedSteps[stepIndex] = {
        ...step,
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 3,
        },
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
          initialDelay: 1000,
          maxDelay: 30000,
        },
      }
    }

    return updatedSteps
  }

  /**
   * Format resource saving
   */
  private formatResourceSaving(original: any, optimized: any): string {
    const cpuSaved = Math.max(0, original.resourceUsage.cpu - optimized.resourceUsage.cpu)
    const memorySaved = Math.max(0, original.resourceUsage.memory - optimized.resourceUsage.memory)
    const networkSaved = Math.max(0, original.resourceUsage.network - optimized.resourceUsage.network)

    return `${cpuSaved} CPU units, ${memorySaved}MB memory, ${networkSaved}MB network`
  }
}

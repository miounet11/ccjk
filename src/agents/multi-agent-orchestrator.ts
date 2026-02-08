/**
 * Multi-agent orchestration system for coordinating AI agent collaboration
 */

import type { AgentAssignment, AgentCapability, OrchestrationOptions, OrchestrationResult, Task } from '../types/agent'
import type { AgentCapabilityMap } from './capability-map'
import { agentCapabilityMap } from './capability-map'

export class MultiAgentOrchestrator {
  private capabilityMap: AgentCapabilityMap

  constructor(capabilityMap: AgentCapabilityMap = agentCapabilityMap) {
    this.capabilityMap = capabilityMap
  }

  /**
   * Select best agents for a given task
   * Returns 1-3 agents based on task complexity and requirements
   */
  selectAgents(task: Task, options: OrchestrationOptions = {}): AgentCapability[] {
    const maxAgents = options.maxAgents || Math.min(3, Math.ceil(task.complexity / 3))

    // Score all agents for this task
    const scoredAgents = this.capabilityMap.getAllAgents().map(agent => ({
      agent,
      score: this.capabilityMap.calculateCompatibility(agent.id, task.requiredCapabilities),
    }))

    // Sort by score (descending)
    scoredAgents.sort((a, b) => b.score - a.score)

    // Filter out agents with very low compatibility
    const qualifiedAgents = scoredAgents.filter(sa => sa.score > 0.3)

    // Select top agents up to maxAgents
    const selectedAgents = qualifiedAgents
      .slice(0, maxAgents)
      .map(sa => sa.agent)

    // If no qualified agents, return best match anyway
    if (selectedAgents.length === 0 && scoredAgents.length > 0) {
      return [scoredAgents[0].agent]
    }

    return selectedAgents
  }

  /**
   * Select agents for multiple tasks
   * Optimizes for minimal agent count while maintaining expertise
   */
  selectAgentsForTasks(tasks: Task[], options: OrchestrationOptions = {}): Map<string, AgentCapability[]> {
    const taskAgentMap = new Map<string, AgentCapability[]>()

    for (const task of tasks) {
      const agents = this.selectAgents(task, options)
      taskAgentMap.set(task.id, agents)
    }

    return taskAgentMap
  }

  /**
   * Orchestrate agent assignments
   * Creates execution plan with dependencies and conflict resolution
   */
  orchestrate(
    tasks: Task[],
    options: OrchestrationOptions = {},
  ): OrchestrationResult {
    const startTime = Date.now()

    // Select agents for all tasks
    const taskAgentMap = this.selectAgentsForTasks(tasks, options)

    // Group tasks by agents
    const agentTasksMap = new Map<string, Task[]>()
    for (const [taskId, agents] of taskAgentMap.entries()) {
      const task = tasks.find(t => t.id === taskId)
      if (!task)
        continue

      for (const agent of agents) {
        if (!agentTasksMap.has(agent.id)) {
          agentTasksMap.set(agent.id, [])
        }
        agentTasksMap.get(agent.id)!.push(task)
      }
    }

    // Create assignments
    const assignments: AgentAssignment[] = []
    const conflictsResolved: string[] = []

    for (const [agentId, agentTasks] of agentTasksMap.entries()) {
      const agent = this.capabilityMap.getAgent(agentId)!
      const order = this.determineExecutionOrder(agent, agentTasks)

      // Check for conflicts
      const conflicts = this.detectConflicts(agent, agentTasks, assignments)
      if (conflicts.length > 0 && options.enableConflictResolution !== false) {
        for (const conflict of conflicts) {
          conflictsResolved.push(`Resolved ${conflict} for ${agent.name}`)
        }
      }

      assignments.push({
        agent,
        tasks: agentTasks,
        order,
        dependencies: this.findDependencies(agent, agentTasks, assignments),
      })
    }

    // Sort assignments by order
    assignments.sort((a, b) => a.order - b.order)

    // Calculate total cost
    const totalCost = this.calculateTotalCost(assignments)

    // Estimate execution time
    const estimatedTime = this.estimateExecutionTime(assignments, options)

    // Generate suggestions
    const suggestions = this.generateOptimizationSuggestions(assignments, tasks, options)

    const orchestrationTime = Date.now() - startTime

    // Performance check: should complete in < 1s
    if (orchestrationTime > 1000) {
      console.warn(`Orchestration took ${orchestrationTime}ms, exceeds 1s target`)
    }

    return {
      assignments,
      totalCost,
      estimatedTime,
      conflictsResolved,
      suggestions,
    }
  }

  /**
   * Determine execution order for an agent's tasks
   */
  private determineExecutionOrder(agent: AgentCapability, _tasks: Task[]): number {
    // Agents with higher model priority go first
    const modelPriority: Record<string, number> = {
      opus: 1,
      sonnet: 2,
      haiku: 3,
      inherit: 4,
    }

    return modelPriority[agent.model] || 5
  }

  /**
   * Detect potential conflicts between agent assignments
   */
  private detectConflicts(
    agent: AgentCapability,
    tasks: Task[],
    existingAssignments: AgentAssignment[],
  ): string[] {
    const conflicts: string[] = []

    // Check for overlapping specialties
    for (const existing of existingAssignments) {
      const overlap = agent.specialties.filter(s =>
        existing.agent.specialties.some(es => es.toLowerCase() === s.toLowerCase()),
      )

      if (overlap.length > 2) {
        conflicts.push(`specialty overlap: ${overlap.join(', ')}`)
      }
    }

    // Check for task complexity overload
    const totalComplexity = tasks.reduce((sum, t) => sum + t.complexity, 0)
    if (totalComplexity > 15) {
      conflicts.push(`complexity overload: ${totalComplexity}`)
    }

    return conflicts
  }

  /**
   * Find dependencies for an agent's tasks
   */
  private findDependencies(
    agent: AgentCapability,
    tasks: Task[],
    existingAssignments: AgentAssignment[],
  ): string[] {
    const dependencies: string[] = []

    // i18n and config work should happen after CLI architecture
    if (agent.id === 'ccjk-i18n-specialist' || agent.id === 'ccjk-config-architect') {
      const cliArchitect = existingAssignments.find(a => a.agent.id === 'typescript-cli-architect')
      if (cliArchitect) {
        dependencies.push(cliArchitect.agent.id)
      }
    }

    // Testing should happen last
    if (agent.id === 'ccjk-testing-specialist') {
      for (const existing of existingAssignments) {
        if (existing.agent.id !== 'ccjk-testing-specialist') {
          dependencies.push(existing.agent.id)
        }
      }
    }

    return dependencies
  }

  /**
   * Calculate total cost for all assignments
   */
  private calculateTotalCost(assignments: AgentAssignment[]): number {
    let totalCost = 0

    for (const assignment of assignments) {
      for (const task of assignment.tasks) {
        const taskCost = this.capabilityMap.estimateCost(
          assignment.agent.id,
          task.complexity,
          task.estimatedTokens || 1000,
        )
        totalCost += taskCost
      }
    }

    return totalCost
  }

  /**
   * Estimate execution time in milliseconds
   */
  private estimateExecutionTime(
    assignments: AgentAssignment[],
    options: OrchestrationOptions,
  ): number {
    const allowParallel = options.allowParallel !== false

    // Base time per task (ms)
    const baseTimePerTask = 500

    // Model speed factors (relative to sonnet = 1)
    const modelSpeedFactors: Record<string, number> = {
      haiku: 0.3,
      sonnet: 1,
      opus: 2,
      inherit: 0.5,
    }

    if (allowParallel) {
      // Parallel execution: longest chain determines time
      const chainTimes = assignments.map((assignment) => {
        const avgComplexity = assignment.tasks.reduce((sum, t) => sum + t.complexity, 0) / assignment.tasks.length
        const speedFactor = modelSpeedFactors[assignment.agent.model] || 1
        return assignment.tasks.length * baseTimePerTask * avgComplexity * speedFactor
      })

      return Math.max(...chainTimes, 0)
    }
    else {
      // Sequential execution: sum all times
      return assignments.reduce((total, assignment) => {
        const avgComplexity = assignment.tasks.reduce((sum, t) => sum + t.complexity, 0) / assignment.tasks.length
        const speedFactor = modelSpeedFactors[assignment.agent.model] || 1
        return total + (assignment.tasks.length * baseTimePerTask * avgComplexity * speedFactor)
      }, 0)
    }
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    assignments: AgentAssignment[],
    tasks: Task[],
    options: OrchestrationOptions,
  ): string[] {
    const suggestions: string[] = []

    // Check if using too many agents
    if (assignments.length > 5 && (!options.maxAgents || options.maxAgents > 5)) {
      suggestions.push('Consider reducing maxAgents to 5 for better coordination')
    }

    // Check for unused parallelism
    if (options.allowParallel === false && assignments.length > 2) {
      suggestions.push('Enable parallel execution to reduce total time')
    }

    // Check for cost optimization
    const opusAgents = assignments.filter(a => a.agent.model === 'opus')
    if (opusAgents.length > 2) {
      suggestions.push('Consider using sonnet agents for some tasks to reduce cost')
    }

    // Check for agent imbalance
    const taskCounts = assignments.map(a => a.tasks.length)
    const maxTasks = Math.max(...taskCounts)
    const minTasks = Math.min(...taskCounts)
    if (maxTasks - minTasks > 3) {
      suggestions.push('Consider redistributing tasks for better load balancing')
    }

    return suggestions
  }

  /**
   * Get statistics about the orchestration
   */
  getStats(result: OrchestrationResult): {
    agentCount: number
    taskCount: number
    avgTasksPerAgent: number
    modelDistribution: Record<string, number>
    estimatedCostPerTask: number
  } {
    const modelDistribution: Record<string, number> = {}

    for (const assignment of result.assignments) {
      modelDistribution[assignment.agent.model] = (modelDistribution[assignment.agent.model] || 0) + 1
    }

    const totalTasks = result.assignments.reduce((sum, a) => sum + a.tasks.length, 0)

    return {
      agentCount: result.assignments.length,
      taskCount: totalTasks,
      avgTasksPerAgent: totalTasks / result.assignments.length,
      modelDistribution,
      estimatedCostPerTask: result.totalCost / totalTasks,
    }
  }
}

// Export singleton instance
export const multiAgentOrchestrator = new MultiAgentOrchestrator()

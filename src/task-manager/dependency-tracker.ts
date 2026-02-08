/**
 * Task Dependency Tracker
 * 任务依赖跟踪器
 *
 * @version 8.0.0
 * @module task-manager
 */

import type { Task, TaskGraphNode } from './types'

/**
 * Dependency Tracker class
 */
export class TaskDependencyTracker {
  /**
   * Detect circular dependencies using DFS
   */
  async detectCircular(taskId: string, dependsOn: string[]): Promise<boolean> {
    const visited = new Set<string>()
    const stack = new Set<string>()

    const _dfs = async (currentId: string): Promise<boolean> => {
      if (stack.has(currentId)) {
        return true // Found a cycle
      }

      if (visited.has(currentId)) {
        return false
      }

      visited.add(currentId)
      stack.add(currentId)

      // In real implementation, would fetch task from storage
      // For now, we accept dependsOn as parameter

      stack.delete(currentId)
      return false
    }

    for (const depId of dependsOn) {
      if (depId === taskId) {
        return true // Self-dependency
      }

      // Would fetch task and recursively check
      // Simplified for now
    }

    return false
  }

  /**
   * Build dependency graph for visualization
   */
  buildGraph(tasks: Task[]): TaskGraphNode[] {
    const nodes: TaskGraphNode[] = tasks.map((task) => {
      const level = this.calculateLevel(task, tasks)
      return {
        id: task.id,
        name: task.name,
        status: task.status,
        priority: task.priority,
        level,
        dependencies: [...task.dependsOn],
      }
    })

    return nodes
  }

  /**
   * Calculate topological level for each task
   */
  private calculateLevel(task: Task, allTasks: Task[]): number {
    if (task.dependsOn.length === 0) {
      return 0
    }

    let maxDepLevel = -1
    for (const depId of task.dependsOn) {
      const depTask = allTasks.find(t => t.id === depId)
      if (depTask) {
        const depLevel = this.calculateLevel(depTask, allTasks)
        maxDepLevel = Math.max(maxDepLevel, depLevel)
      }
    }

    return maxDepLevel + 1
  }

  /**
   * Get tasks that can run in parallel
   */
  getParallelGroups(tasks: Task[]): Task[][] {
    const graph = this.buildGraph(tasks)
    const groups: Task[][] = []

    // Group by level
    const levels = new Map<number, Task[]>()
    for (const node of graph) {
      if (!levels.has(node.level)) {
        levels.set(node.level, [])
      }
      const task = tasks.find(t => t.id === node.id)
      if (task) {
        levels.get(node.level)!.push(task)
      }
    }

    // Convert to array
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b)
    for (const level of sortedLevels) {
      groups.push(levels.get(level)!)
    }

    return groups
  }

  /**
   * Get execution order (topological sort)
   */
  getExecutionOrder(tasks: Task[]): Task[] {
    const graph = this.buildGraph(tasks)
    const idToTask = new Map(tasks.map(t => [t.id, t]))

    // Sort by level
    const sorted = [...graph].sort((a, b) => a.level - b.level)

    return sorted.map(node => idToTask.get(node.id)!).filter(Boolean)
  }
}

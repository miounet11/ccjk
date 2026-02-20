/**
 * Task Persistence Tests
 *
 * Tests for enhanced task persistence with dependency tracking,
 * execution recovery, metrics, and decision logging.
 *
 * @module brain/__tests__/task-persistence.test
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '../orchestrator-types'
import { TaskPersistence } from '../task-persistence'

describe('taskPersistence', () => {
  let persistence: TaskPersistence
  let testDbPath: string

  beforeEach(() => {
    // Use temporary database for tests
    testDbPath = join(process.cwd(), '.test-brain.db')
    persistence = new TaskPersistence(testDbPath)
  })

  afterEach(() => {
    persistence.close()
    // Clean up test database
    if (existsSync(testDbPath)) {
      rmSync(testDbPath)
    }
  })

  // ===========================================================================
  // Basic Task Operations
  // ===========================================================================

  describe('basic Task Operations', () => {
    it('should save and retrieve a task', () => {
      const task: Task = {
        id: 'task-1',
        name: 'Test Task',
        description: 'A test task',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }

      persistence.saveTask(task, 'session-1')

      const retrieved = persistence.getTask('task-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('task-1')
      expect(retrieved?.name).toBe('Test Task')
      expect(retrieved?.sessionId).toBe('session-1')
    })

    it('should update task status', () => {
      const task: Task = {
        id: 'task-2',
        name: 'Test Task 2',
        description: 'Another test task',
        type: 'test',
        priority: 'high',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }

      persistence.saveTask(task, 'session-1')
      persistence.updateTaskStatus('task-2', 'running')

      const retrieved = persistence.getTask('task-2')
      expect(retrieved?.status).toBe('running')
      expect(retrieved?.startedAt).toBeDefined()
    })

    it('should get all tasks for a session', () => {
      const tasks: Task[] = [
        {
          id: 'task-3',
          name: 'Task 3',
          description: 'Task 3',
          type: 'test',
          priority: 'normal',
          status: 'pending',
          requiredCapabilities: [],
          input: { parameters: {} },
          dependencies: [],
          maxRetries: 3,
          retryCount: 0,
          metadata: { tags: [] },
          createdAt: new Date().toISOString(),
          progress: 0,
        },
        {
          id: 'task-4',
          name: 'Task 4',
          description: 'Task 4',
          type: 'test',
          priority: 'normal',
          status: 'pending',
          requiredCapabilities: [],
          input: { parameters: {} },
          dependencies: [],
          maxRetries: 3,
          retryCount: 0,
          metadata: { tags: [] },
          createdAt: new Date().toISOString(),
          progress: 0,
        },
      ]

      tasks.forEach(task => persistence.saveTask(task, 'session-1'))

      const sessionTasks = persistence.getSessionTasks('session-1')
      expect(sessionTasks).toHaveLength(2)
      expect(sessionTasks.map(t => t.id)).toContain('task-3')
      expect(sessionTasks.map(t => t.id)).toContain('task-4')
    })
  })

  // ===========================================================================
  // Dependency Tracking
  // ===========================================================================

  describe('dependency Tracking', () => {
    beforeEach(() => {
      // Create test tasks
      const tasks: Task[] = [
        {
          id: 'task-a',
          name: 'Task A',
          description: 'First task',
          type: 'test',
          priority: 'normal',
          status: 'pending',
          requiredCapabilities: [],
          input: { parameters: {} },
          dependencies: [],
          maxRetries: 3,
          retryCount: 0,
          metadata: { tags: [] },
          createdAt: new Date().toISOString(),
          progress: 0,
        },
        {
          id: 'task-b',
          name: 'Task B',
          description: 'Second task',
          type: 'test',
          priority: 'normal',
          status: 'pending',
          requiredCapabilities: [],
          input: { parameters: {} },
          dependencies: [],
          maxRetries: 3,
          retryCount: 0,
          metadata: { tags: [] },
          createdAt: new Date().toISOString(),
          progress: 0,
        },
        {
          id: 'task-c',
          name: 'Task C',
          description: 'Third task',
          type: 'test',
          priority: 'normal',
          status: 'pending',
          requiredCapabilities: [],
          input: { parameters: {} },
          dependencies: [],
          maxRetries: 3,
          retryCount: 0,
          metadata: { tags: [] },
          createdAt: new Date().toISOString(),
          progress: 0,
        },
      ]

      tasks.forEach(task => persistence.saveTask(task, 'session-dep'))
    })

    it('should add task dependency', () => {
      persistence.addDependency('task-b', 'task-a', 'sequential', true)

      const deps = persistence.getTaskDependencies('task-b')
      expect(deps).toHaveLength(1)
      expect(deps[0].dependsOnId).toBe('task-a')
      expect(deps[0].dependencyType).toBe('sequential')
      expect(deps[0].required).toBe(true)
    })

    it('should remove task dependency', () => {
      persistence.addDependency('task-b', 'task-a')
      persistence.removeDependency('task-b', 'task-a')

      const deps = persistence.getTaskDependencies('task-b')
      expect(deps).toHaveLength(0)
    })

    it('should get dependent tasks', () => {
      persistence.addDependency('task-b', 'task-a')
      persistence.addDependency('task-c', 'task-a')

      const dependents = persistence.getDependentTasks('task-a')
      expect(dependents).toHaveLength(2)
      expect(dependents.map(t => t.id)).toContain('task-b')
      expect(dependents.map(t => t.id)).toContain('task-c')
    })

    it('should build dependency graph', () => {
      // Create dependency chain: task-a -> task-b -> task-c
      persistence.addDependency('task-b', 'task-a')
      persistence.addDependency('task-c', 'task-b')

      const graph = persistence.buildDependencyGraph('session-dep')
      expect(graph).toHaveLength(3)

      const nodeA = graph.find(n => n.id === 'task-a')
      const nodeB = graph.find(n => n.id === 'task-b')
      const nodeC = graph.find(n => n.id === 'task-c')

      expect(nodeA?.level).toBe(0)
      expect(nodeB?.level).toBe(1)
      expect(nodeC?.level).toBe(2)
    })

    it('should detect circular dependencies', () => {
      persistence.addDependency('task-b', 'task-a')
      persistence.addDependency('task-c', 'task-b')

      // This would create a cycle: task-a -> task-b -> task-c -> task-a
      const hasCycle = persistence.detectCircularDependency('task-a', 'task-c')
      expect(hasCycle).toBe(true)
    })

    it('should not detect circular dependency when none exists', () => {
      persistence.addDependency('task-b', 'task-a')

      const hasCycle = persistence.detectCircularDependency('task-c', 'task-b')
      expect(hasCycle).toBe(false)
    })
  })

  // ===========================================================================
  // Topological Sorting
  // ===========================================================================

  describe('topological Sorting', () => {
    beforeEach(() => {
      // Create tasks with dependencies
      const tasks: Task[] = [
        { id: 'task-1', name: 'Task 1', description: '', type: 'test', priority: 'normal', status: 'pending', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 0 },
        { id: 'task-2', name: 'Task 2', description: '', type: 'test', priority: 'normal', status: 'pending', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 0 },
        { id: 'task-3', name: 'Task 3', description: '', type: 'test', priority: 'normal', status: 'pending', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 0 },
        { id: 'task-4', name: 'Task 4', description: '', type: 'test', priority: 'normal', status: 'pending', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 0 },
      ]

      tasks.forEach(task => persistence.saveTask(task, 'session-topo'))

      // Create dependency graph:
      // task-1 (level 0)
      // task-2 depends on task-1 (level 1)
      // task-3 depends on task-1 (level 1)
      // task-4 depends on task-2 and task-3 (level 2)
      persistence.addDependency('task-2', 'task-1')
      persistence.addDependency('task-3', 'task-1')
      persistence.addDependency('task-4', 'task-2')
      persistence.addDependency('task-4', 'task-3')
    })

    it('should return tasks in topological order', () => {
      const ordered = persistence.getTopologicalOrder('session-topo')

      expect(ordered).toHaveLength(4)
      expect(ordered[0].id).toBe('task-1')
      expect(['task-2', 'task-3']).toContain(ordered[1].id)
      expect(['task-2', 'task-3']).toContain(ordered[2].id)
      expect(ordered[3].id).toBe('task-4')
    })

    it('should get next executable tasks', () => {
      const executable = persistence.getNextExecutableTasks('session-topo')

      // Only task-1 should be executable (no dependencies)
      expect(executable).toHaveLength(1)
      expect(executable[0].id).toBe('task-1')
    })

    it('should update executable tasks after completion', () => {
      // Complete task-1
      persistence.updateTaskStatus('task-1', 'completed')

      const executable = persistence.getNextExecutableTasks('session-topo')

      // Now task-2 and task-3 should be executable
      expect(executable).toHaveLength(2)
      expect(executable.map(t => t.id)).toContain('task-2')
      expect(executable.map(t => t.id)).toContain('task-3')
    })
  })

  // ===========================================================================
  // Execution Recovery
  // ===========================================================================

  describe('execution Recovery', () => {
    beforeEach(() => {
      const tasks: Task[] = [
        { id: 'rec-1', name: 'Recovery 1', description: '', type: 'test', priority: 'normal', status: 'completed', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 100 },
        { id: 'rec-2', name: 'Recovery 2', description: '', type: 'test', priority: 'normal', status: 'running', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 50 },
        { id: 'rec-3', name: 'Recovery 3', description: '', type: 'test', priority: 'normal', status: 'pending', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 0 },
        { id: 'rec-4', name: 'Recovery 4', description: '', type: 'test', priority: 'normal', status: 'failed', requiredCapabilities: [], input: { parameters: {} }, dependencies: [], maxRetries: 3, retryCount: 0, metadata: { tags: [] }, createdAt: new Date().toISOString(), progress: 0 },
      ]

      tasks.forEach(task => persistence.saveTask(task, 'session-recovery'))

      persistence.addDependency('rec-2', 'rec-1')
      persistence.addDependency('rec-3', 'rec-1')
    })

    it('should recover execution state', () => {
      const state = persistence.recoverExecutionState('session-recovery')

      expect(state.sessionId).toBe('session-recovery')
      expect(state.completedTasks).toHaveLength(1)
      expect(state.runningTasks).toHaveLength(1)
      expect(state.pendingTasks).toHaveLength(1)
      expect(state.failedTasks).toHaveLength(1)
    })

    it('should identify next executable tasks on recovery', () => {
      const state = persistence.recoverExecutionState('session-recovery')

      // rec-1 is completed, so rec-2 and rec-3 should be executable
      // But rec-2 is already running, so only rec-3 should be in nextExecutable
      expect(state.nextExecutable).toHaveLength(1)
      expect(state.nextExecutable[0].id).toBe('rec-3')
    })

    it('should include dependency graph in recovery state', () => {
      const state = persistence.recoverExecutionState('session-recovery')

      expect(state.dependencyGraph).toBeDefined()
      expect(state.dependencyGraph.length).toBeGreaterThan(0)
    })
  })

  // ===========================================================================
  // Task Metrics
  // ===========================================================================

  describe('task Metrics', () => {
    beforeEach(() => {
      const task: Task = {
        id: 'metric-task',
        name: 'Metric Task',
        description: '',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }

      persistence.saveTask(task, 'session-metrics')
    })

    it('should record task metrics', () => {
      persistence.recordMetrics({
        taskId: 'metric-task',
        sessionId: 'session-metrics',
        executionTime: 1500,
        retryCount: 0,
        success: true,
      })

      const metrics = persistence.getTaskMetrics('metric-task')
      expect(metrics).toHaveLength(1)
      expect(metrics[0].executionTime).toBe(1500)
      expect(metrics[0].success).toBe(true)
    })

    it('should record multiple metric entries', () => {
      // First attempt - failed
      persistence.recordMetrics({
        taskId: 'metric-task',
        sessionId: 'session-metrics',
        executionTime: 1000,
        retryCount: 0,
        success: false,
        errorType: 'timeout',
      })

      // Second attempt - success
      persistence.recordMetrics({
        taskId: 'metric-task',
        sessionId: 'session-metrics',
        executionTime: 1200,
        retryCount: 1,
        success: true,
      })

      const metrics = persistence.getTaskMetrics('metric-task')
      expect(metrics).toHaveLength(2)
    })

    it('should calculate session metrics', () => {
      // Record metrics for multiple tasks
      persistence.recordMetrics({
        taskId: 'metric-task',
        sessionId: 'session-metrics',
        executionTime: 1000,
        retryCount: 0,
        success: true,
      })

      const task2: Task = {
        id: 'metric-task-2',
        name: 'Metric Task 2',
        description: '',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }
      persistence.saveTask(task2, 'session-metrics')

      persistence.recordMetrics({
        taskId: 'metric-task-2',
        sessionId: 'session-metrics',
        executionTime: 2000,
        retryCount: 1,
        success: false,
        errorType: 'error',
      })

      const sessionMetrics = persistence.getSessionMetrics('session-metrics')
      expect(sessionMetrics.totalTasks).toBe(2)
      expect(sessionMetrics.completedTasks).toBe(1)
      expect(sessionMetrics.failedTasks).toBe(1)
      expect(sessionMetrics.avgExecutionTime).toBe(1500)
      expect(sessionMetrics.successRate).toBe(0.5)
      expect(sessionMetrics.totalRetries).toBe(1)
    })
  })

  // ===========================================================================
  // Decision Log
  // ===========================================================================

  describe('decision Log', () => {
    it('should log a decision', () => {
      persistence.logDecision({
        id: 'decision-1',
        sessionId: 'session-decision',
        taskId: 'task-1',
        decision: 'Use parallel execution',
        reasoning: 'Tasks have no dependencies',
        context: JSON.stringify({ taskCount: 5 }),
      })

      const log = persistence.getDecisionLog('session-decision')
      expect(log).toHaveLength(1)
      expect(log[0].decision).toBe('Use parallel execution')
      expect(log[0].reasoning).toBe('Tasks have no dependencies')
    })

    it('should update decision outcome', () => {
      persistence.logDecision({
        id: 'decision-2',
        sessionId: 'session-decision',
        decision: 'Retry failed task',
        reasoning: 'Transient error detected',
        context: JSON.stringify({ errorType: 'network' }),
      })

      persistence.updateDecisionOutcome('decision-2', 'Success after retry')

      const log = persistence.getDecisionLog('session-decision')
      const decision = log.find(d => d.id === 'decision-2')
      expect(decision?.outcome).toBe('Success after retry')
    })

    it('should get decision log for specific task', () => {
      const task: Task = {
        id: 'task-decision',
        name: 'Decision Task',
        description: '',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }
      persistence.saveTask(task, 'session-decision')

      persistence.logDecision({
        id: 'decision-3',
        sessionId: 'session-decision',
        taskId: 'task-decision',
        decision: 'Allocate more resources',
        reasoning: 'Task is high priority',
        context: JSON.stringify({ priority: 'high' }),
      })

      const taskLog = persistence.getTaskDecisionLog('task-decision')
      expect(taskLog).toHaveLength(1)
      expect(taskLog[0].taskId).toBe('task-decision')
    })

    it('should maintain decision log order', () => {
      const decisions = [
        { id: 'dec-1', decision: 'First decision', reasoning: 'Reason 1' },
        { id: 'dec-2', decision: 'Second decision', reasoning: 'Reason 2' },
        { id: 'dec-3', decision: 'Third decision', reasoning: 'Reason 3' },
      ]

      decisions.forEach((dec, index) => {
        persistence.logDecision({
          ...dec,
          sessionId: 'session-order',
          context: JSON.stringify({ order: index }),
        })
      })

      const log = persistence.getDecisionLog('session-order')
      expect(log).toHaveLength(3)
      expect(log[0].decision).toBe('First decision')
      expect(log[1].decision).toBe('Second decision')
      expect(log[2].decision).toBe('Third decision')
    })
  })

  // ===========================================================================
  // Session Management
  // ===========================================================================

  describe('session Management', () => {
    it('should create and retrieve session', () => {
      persistence.saveSession('session-test', { projectName: 'Test Project' })

      const sessions = persistence.listSessions()
      expect(sessions.length).toBeGreaterThan(0)

      const session = sessions.find(s => s.id === 'session-test')
      expect(session).toBeDefined()
      expect(session?.metadata.projectName).toBe('Test Project')
    })

    it('should restore task context', () => {
      const task: Task = {
        id: 'context-task',
        name: 'Context Task',
        description: '',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }

      persistence.saveTask(task, 'session-context')
      persistence.saveSession('session-context', { restored: true })

      const context = persistence.restoreContext('session-context')
      expect(context).toBeDefined()
      expect(context?.tasks).toHaveLength(1)
      expect(context?.metadata.restored).toBe(true)
    })

    it('should cleanup old sessions', () => {
      // Create old session (7+ days ago)
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000)
      const task: Task = {
        id: 'old-task',
        name: 'Old Task',
        description: '',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date(oldTimestamp).toISOString(),
        progress: 0,
      }

      persistence.saveTask(task, 'old-session')

      const deleted = persistence.cleanup(7)
      expect(deleted).toBeGreaterThan(0)
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge Cases', () => {
    it('should handle task with no dependencies', () => {
      const task: Task = {
        id: 'no-deps',
        name: 'No Dependencies',
        description: '',
        type: 'test',
        priority: 'normal',
        status: 'pending',
        requiredCapabilities: [],
        input: { parameters: {} },
        dependencies: [],
        maxRetries: 3,
        retryCount: 0,
        metadata: { tags: [] },
        createdAt: new Date().toISOString(),
        progress: 0,
      }

      persistence.saveTask(task, 'session-edge')

      const deps = persistence.getTaskDependencies('no-deps')
      expect(deps).toHaveLength(0)

      const graph = persistence.buildDependencyGraph('session-edge')
      const node = graph.find(n => n.id === 'no-deps')
      expect(node?.level).toBe(0)
    })

    it('should handle empty session', () => {
      const state = persistence.recoverExecutionState('empty-session')

      expect(state.pendingTasks).toHaveLength(0)
      expect(state.runningTasks).toHaveLength(0)
      expect(state.completedTasks).toHaveLength(0)
      expect(state.failedTasks).toHaveLength(0)
    })

    it('should handle non-existent task', () => {
      const task = persistence.getTask('non-existent')
      expect(task).toBeUndefined()
    })

    it('should handle metrics for non-existent task', () => {
      const metrics = persistence.getTaskMetrics('non-existent')
      expect(metrics).toHaveLength(0)
    })

    it('should handle decision log for empty session', () => {
      const log = persistence.getDecisionLog('empty-session')
      expect(log).toHaveLength(0)
    })
  })
})

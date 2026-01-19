/**
 * Workflow System Unit Tests
 *
 * Tests for the Superpowers-style workflow system
 */

import type { WorkflowTask } from '../../../src/workflow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_REVIEW_CONFIG,
  getScheduler,
  getWorkflowStateMachine,
  PHASE_CONFIGS,
  resetScheduler,
  resetWorkflowStateMachine,
  TwoStageReviewer,
  workflowSkill,
} from '../../../src/workflow'

describe('workflow System', () => {
  beforeEach(() => {
    resetWorkflowStateMachine()
    resetScheduler()
    // Clear any persisted state for clean tests
    const machine = getWorkflowStateMachine({ autoSave: false })
    machine.clearState()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetWorkflowStateMachine()
    resetScheduler()
  })

  describe('workflowStateMachine', () => {
    it('should create a workflow session', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
        description: 'A test workflow',
      })

      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.name).toBe('Test Workflow')
      expect(session.currentPhase).toBe('brainstorming')
      expect(session.status).toBe('active')
    })

    it('should transition between phases', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      // Transition to planning
      const updated = machine.transitionTo(session.id, 'planning')
      expect(updated.currentPhase).toBe('planning')
    })

    it('should not allow invalid transitions', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      // Try to skip to finishing (invalid)
      expect(() => machine.transitionTo(session.id, 'finishing')).toThrow('Invalid transition')
    })

    it('should add tasks to a session', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const task = machine.addTask(session.id, {
        title: 'Test Task',
        description: 'A test task',
        priority: 'high',
        estimatedMinutes: 30,
        dependencies: [],
        metadata: {},
      })

      expect(task).toBeDefined()
      expect(task.title).toBe('Test Task')
      expect(task.status).toBe('pending')

      const updated = machine.getSession(session.id)
      expect(updated?.tasks).toHaveLength(1)
    })

    it('should update task status', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const task = machine.addTask(session.id, {
        title: 'Test Task',
        description: 'A test task',
        priority: 'medium',
        estimatedMinutes: 15,
        dependencies: [],
        metadata: {},
      })

      const updatedTask = machine.updateTaskStatus(session.id, task.id, 'running')
      expect(updatedTask.status).toBe('running')
    })

    it('should list all sessions', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })

      machine.createSession({ name: 'Workflow 1' })
      machine.createSession({ name: 'Workflow 2' })
      machine.createSession({ name: 'Workflow 3' })

      const sessions = machine.getAllSessions()
      expect(sessions).toHaveLength(3)
    })

    it('should get available transitions', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const transitions = machine.getAllowedTransitions(session.id)
      expect(transitions).toContain('planning')
      expect(transitions).not.toContain('finishing')
    })

    it('should check if transition is allowed', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      expect(machine.canTransitionTo(session.id, 'planning')).toBe(true)
      expect(machine.canTransitionTo(session.id, 'finishing')).toBe(false)
    })

    it('should pause and resume sessions', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const paused = machine.pauseSession(session.id)
      expect(paused.status).toBe('paused')

      const resumed = machine.resumeSession(session.id)
      expect(resumed.status).toBe('active')
    })

    it('should complete a session', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const completed = machine.completeSession(session.id)
      expect(completed.status).toBe('completed')
      expect(completed.completedAt).toBeDefined()
    })

    it('should get workflow statistics', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })

      machine.createSession({ name: 'Workflow 1' })
      const session2 = machine.createSession({ name: 'Workflow 2' })
      machine.completeSession(session2.id)

      const stats = machine.getStats()
      expect(stats.totalSessions).toBe(2)
      expect(stats.activeSessions).toBe(1)
      expect(stats.completedSessions).toBe(1)
    })
  })

  describe('subagentScheduler', () => {
    it('should be a singleton', () => {
      const scheduler1 = getScheduler()
      const scheduler2 = getScheduler()
      expect(scheduler1).toBe(scheduler2)
    })

    it('should queue tasks', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      machine.addTask(session.id, {
        title: 'Task 1',
        description: 'First task',
        priority: 'high',
        estimatedMinutes: 10,
        dependencies: [],
        metadata: {},
      })

      machine.addTask(session.id, {
        title: 'Task 2',
        description: 'Second task',
        priority: 'medium',
        estimatedMinutes: 20,
        dependencies: [],
        metadata: {},
      })

      const updatedSession = machine.getSession(session.id)!
      const scheduler = getScheduler()
      scheduler.queueTasks(updatedSession, updatedSession.tasks)

      const status = scheduler.getQueueStatus()
      expect(status.queued).toBe(2)
    })

    it('should emit events when tasks are queued', () => {
      const scheduler = getScheduler()
      const events: string[] = []

      scheduler.on('task:queued', () => events.push('queued'))

      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      machine.addTask(session.id, {
        title: 'Task 1',
        description: 'First task',
        priority: 'medium',
        estimatedMinutes: 10,
        dependencies: [],
        metadata: {},
      })

      const updatedSession = machine.getSession(session.id)!
      scheduler.queueTasks(updatedSession, updatedSession.tasks)

      expect(events).toContain('queued')
    })

    it('should dequeue tasks', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const task = machine.addTask(session.id, {
        title: 'Task 1',
        description: 'First task',
        priority: 'high',
        estimatedMinutes: 10,
        dependencies: [],
        metadata: {},
      })

      const updatedSession = machine.getSession(session.id)!
      const scheduler = getScheduler()
      scheduler.queueTasks(updatedSession, updatedSession.tasks)

      expect(scheduler.getQueueStatus().queued).toBe(1)

      const removed = scheduler.dequeueTask(task.id)
      expect(removed).toBe(true)
      expect(scheduler.getQueueStatus().queued).toBe(0)
    })

    it('should clear the queue', () => {
      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      machine.addTask(session.id, {
        title: 'Task 1',
        description: 'First task',
        priority: 'high',
        estimatedMinutes: 10,
        dependencies: [],
        metadata: {},
      })

      machine.addTask(session.id, {
        title: 'Task 2',
        description: 'Second task',
        priority: 'medium',
        estimatedMinutes: 20,
        dependencies: [],
        metadata: {},
      })

      const updatedSession = machine.getSession(session.id)!
      const scheduler = getScheduler()
      scheduler.queueTasks(updatedSession, updatedSession.tasks)

      expect(scheduler.getQueueStatus().queued).toBe(2)

      scheduler.clearQueue()
      expect(scheduler.getQueueStatus().queued).toBe(0)
    })
  })

  describe('twoStageReviewer', () => {
    it('should create a reviewer with default config', () => {
      const reviewer = new TwoStageReviewer()
      expect(reviewer).toBeDefined()
    })

    it('should create a reviewer with custom config', () => {
      const reviewer = new TwoStageReviewer({
        maxIterations: 5,
        autoFixMinor: false,
        blockingThreshold: 'blocker',
        verbose: true,
      })
      expect(reviewer).toBeDefined()
    })

    it('should review a task with proper context', async () => {
      const reviewer = new TwoStageReviewer()

      const task: WorkflowTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'A test task',
        status: 'completed',
        priority: 'medium',
        estimatedMinutes: 10,
        actualMinutes: 8,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      }

      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const result = await reviewer.review({
        task,
        session,
        spec: 'Must implement a function that returns true',
        modifiedFiles: ['src/test.ts'],
        fileContents: new Map([
          ['src/test.ts', 'export function test() { return true; }'],
        ]),
      })

      expect(result).toBeDefined()
      expect(result.taskId).toBe('task-1')
      expect(result.specCompliance).toBeDefined()
      expect(result.codeQuality).toBeDefined()
      expect(['passed', 'failed', 'in-progress', 'pending']).toContain(result.status)
    })

    it('should identify code quality issues', async () => {
      const reviewer = new TwoStageReviewer()

      const task: WorkflowTask = {
        id: 'task-2',
        title: 'Task with Issues',
        description: 'A task with code issues',
        status: 'completed',
        priority: 'medium',
        estimatedMinutes: 10,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      }

      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const result = await reviewer.review({
        task,
        session,
        spec: 'Implement a function',
        modifiedFiles: ['src/bad.ts'],
        fileContents: new Map([
          ['src/bad.ts', `
            console.log("debug");
            function bad() {
              try {
                doSomething();
              } catch (e) {
                // empty catch block
              }
            }
          `],
        ]),
      })

      // Should find console.log and empty catch block issues
      expect(result.codeQuality).toBeDefined()
      expect(result.codeQuality!.issues.length).toBeGreaterThan(0)
    })

    it('should detect spec compliance issues when no files modified', async () => {
      const reviewer = new TwoStageReviewer()

      const task: WorkflowTask = {
        id: 'task-3',
        title: 'Empty Task',
        description: 'A task with no changes',
        status: 'completed',
        priority: 'medium',
        estimatedMinutes: 10,
        dependencies: [],
        createdAt: new Date(),
        metadata: {},
      }

      const machine = getWorkflowStateMachine({ autoSave: false })
      const session = machine.createSession({
        name: 'Test Workflow',
      })

      const result = await reviewer.review({
        task,
        session,
        spec: 'Implement something',
        modifiedFiles: [],
        fileContents: new Map(),
      })

      expect(result.specCompliance).toBeDefined()
      expect(result.specCompliance!.passed).toBe(false)
    })
  })

  describe('phase Configs', () => {
    it('should have all required phases', () => {
      expect(PHASE_CONFIGS.brainstorming).toBeDefined()
      expect(PHASE_CONFIGS.planning).toBeDefined()
      expect(PHASE_CONFIGS.implementation).toBeDefined()
      expect(PHASE_CONFIGS.review).toBeDefined()
      expect(PHASE_CONFIGS.finishing).toBeDefined()
    })

    it('should have valid transitions', () => {
      expect(PHASE_CONFIGS.brainstorming.allowedTransitions).toContain('planning')
      expect(PHASE_CONFIGS.planning.allowedTransitions).toContain('implementation')
      expect(PHASE_CONFIGS.implementation.allowedTransitions).toContain('review')
      expect(PHASE_CONFIGS.review.allowedTransitions).toContain('finishing')
    })

    it('should have phase descriptions', () => {
      expect(PHASE_CONFIGS.brainstorming.description).toBeDefined()
      expect(PHASE_CONFIGS.planning.description).toBeDefined()
      expect(PHASE_CONFIGS.implementation.description).toBeDefined()
      expect(PHASE_CONFIGS.review.description).toBeDefined()
      expect(PHASE_CONFIGS.finishing.description).toBeDefined()
    })
  })

  describe('default Configs', () => {
    it('should have valid review config', () => {
      expect(DEFAULT_REVIEW_CONFIG.maxIterations).toBeGreaterThan(0)
      expect(typeof DEFAULT_REVIEW_CONFIG.autoFixMinor).toBe('boolean')
      expect(DEFAULT_REVIEW_CONFIG.blockingThreshold).toBeDefined()
    })
  })

  describe('workflow Skill', () => {
    it('should have correct skill definition', () => {
      expect(workflowSkill.id).toBe('workflow-automation')
      expect(workflowSkill.triggers).toContain('/workflow')
      expect(workflowSkill.triggers).toContain('/wf')
      expect(workflowSkill.triggers).toContain('/flow')
      expect(workflowSkill.enabled).toBe(true)
      expect(workflowSkill.category).toBe('dev')
    })

    it('should have comprehensive template', () => {
      expect(workflowSkill.template).toContain('Two-Stage Review')
      expect(workflowSkill.template).toContain('Subagent')
    })

    it('should have proper metadata', () => {
      expect(workflowSkill.name.en).toBeDefined()
      expect(workflowSkill.name['zh-CN']).toBeDefined()
      expect(workflowSkill.description.en).toBeDefined()
      expect(workflowSkill.description['zh-CN']).toBeDefined()
      expect(workflowSkill.version).toBeDefined()
    })
  })
})

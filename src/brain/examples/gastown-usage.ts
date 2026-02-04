/**
 * Gastown-Inspired Multi-Agent System Usage Example
 *
 * This example demonstrates the complete workflow:
 * 1. Git-backed state persistence
 * 2. Persistent mailbox messaging
 * 3. Convoy task management
 * 4. Mayor agent coordination
 *
 * @module brain/examples/gastown-usage
 */

import { getGlobalConvoyManager } from '../convoy/convoy-manager'
import { ProgressTracker } from '../convoy/progress-tracker'
import { getGlobalMayorAgent } from '../mayor/mayor-agent'
import { getGlobalMailboxManager } from '../messaging/persistent-mailbox'
import { getGlobalStateManager } from '../persistence/git-backed-state'

/**
 * Example 1: Git-Backed State Persistence
 */
async function exampleStatePersistence() {
  console.log('\n=== Example 1: Git-Backed State Persistence ===')

  const stateManager = getGlobalStateManager()
  await stateManager.initialize()

  // Create agent worktree
  const agentId = 'worker-001'
  await stateManager.createAgentWorktree(agentId)

  // Save state (automatically commits to Git)
  await stateManager.saveState(agentId, {
    agentId,
    status: 'active',
    currentTask: 'Processing user request',
    memory: { lastAction: 'read_file', timestamp: Date.now() },
  })

  console.log('✓ State saved with Git commit')

  // Load state
  const state = await stateManager.loadState(agentId)
  console.log('✓ State loaded:', state)

  // Get state history
  const history = await stateManager.getStateHistory(agentId, 5)
  console.log('✓ State history:', history.commits.length, 'commits')

  // Create snapshot
  const snapshot = await stateManager.createSnapshot(agentId, 'Before major operation')
  console.log('✓ Snapshot created:', snapshot.id)

  // Rollback if needed
  // await stateManager.rollback(agentId, snapshot.commitId)
}

/**
 * Example 2: Persistent Mailbox Messaging
 */
async function exampleMailboxMessaging() {
  console.log('\n=== Example 2: Persistent Mailbox Messaging ===')

  const mailboxManager = getGlobalMailboxManager()
  await mailboxManager.initialize()

  // Create mailboxes for agents
  await mailboxManager.createMailbox('mayor-001')
  await mailboxManager.createMailbox('worker-001')
  await mailboxManager.createMailbox('worker-002')

  // Send messages
  await mailboxManager.send('mayor-001', 'worker-001', {
    type: 'task_assignment',
    payload: { task: 'Analyze codebase', priority: 'high' },
  })

  await mailboxManager.send('mayor-001', 'worker-002', {
    type: 'task_assignment',
    payload: { task: 'Run tests', priority: 'normal' },
  })

  console.log('✓ Messages sent')

  // Worker reads messages
  const messages = await mailboxManager.read('worker-001', { limit: 10 })
  console.log('✓ Worker-001 received:', messages.length, 'messages')

  // Mark as read
  if (messages.length > 0) {
    await mailboxManager.markAsRead('worker-001', messages[0].id)
    console.log('✓ Message marked as read')
  }

  // Get mailbox info
  const mailbox = await mailboxManager.getMailbox('worker-001')
  console.log('✓ Mailbox stats:', { unread: mailbox.unreadCount, total: mailbox.totalMessages })
}

/**
 * Example 3: Convoy Task Management
 */
async function exampleConvoyManagement() {
  console.log('\n=== Example 3: Convoy Task Management ===')

  const convoyManager = getGlobalConvoyManager()
  await convoyManager.initialize()

  // Create convoy
  const convoy = await convoyManager.create('Feature Implementation', {
    description: 'Implement user authentication feature',
    createdBy: 'mayor-001',
    notifyOnComplete: true,
    tags: ['feature', 'auth'],
  })

  console.log('✓ Convoy created:', convoy.id)

  // Add tasks with dependencies
  const task1 = await convoyManager.addTask(convoy.id, 'Analyze requirements', {
    description: 'Review authentication requirements',
  })

  const task2 = await convoyManager.addTask(convoy.id, 'Design API', {
    description: 'Design authentication API endpoints',
    dependsOn: [task1.id],
  })

  const task3 = await convoyManager.addTask(convoy.id, 'Implement backend', {
    description: 'Implement authentication logic',
    dependsOn: [task2.id],
  })

  const task4 = await convoyManager.addTask(convoy.id, 'Write tests', {
    description: 'Create unit and integration tests',
    dependsOn: [task3.id],
  })

  console.log('✓ Tasks added:', convoy.totalTasks)

  // Start convoy
  await convoyManager.start(convoy.id)
  console.log('✓ Convoy started')

  // Setup progress tracking
  const tracker = new ProgressTracker(convoyManager, {
    updateInterval: 2000,
    consoleOutput: false,
  })

  tracker.on('progress', (update) => {
    console.log(`Progress: ${update.progress}% (${update.completedTasks}/${update.totalTasks})`)
  })

  tracker.track(convoy.id)

  // Simulate task execution
  await convoyManager.startTask(convoy.id, task1.id, 'worker-001')
  await new Promise(resolve => setTimeout(resolve, 1000))
  await convoyManager.completeTask(convoy.id, task1.id, { analysis: 'Requirements documented' })

  await convoyManager.startTask(convoy.id, task2.id, 'worker-002')
  await new Promise(resolve => setTimeout(resolve, 1000))
  await convoyManager.completeTask(convoy.id, task2.id, { design: 'API designed' })

  console.log('✓ Tasks completed')

  // Get convoy summary
  const summary = convoyManager.getSummary(convoy.id)
  console.log('\nConvoy Summary:')
  console.log(summary)

  tracker.destroy()
}

/**
 * Example 4: Mayor Agent Coordination
 */
async function exampleMayorCoordination() {
  console.log('\n=== Example 4: Mayor Agent Coordination ===')

  const mayor = getGlobalMayorAgent({
    autoCreateConvoy: true,
    autoSpawnWorkers: true,
    monitorProgress: true,
    notifyHuman: true,
  })

  // Listen to mayor events
  mayor.on('intent:analyzed', (intent) => {
    console.log('✓ Intent analyzed:', intent.type, '-', intent.summary)
  })

  mayor.on('plan:created', (plan) => {
    console.log('✓ Plan created:', plan.tasks.length, 'tasks')
  })

  mayor.on('convoy:created', (convoy) => {
    console.log('✓ Convoy created:', convoy.id)
  })

  mayor.on('workers:spawned', (count) => {
    console.log('✓ Workers spawned:', count)
  })

  mayor.on('progress:update', (update) => {
    console.log(`Progress: ${update.progress}%`)
  })

  // Process user request
  const response = await mayor.processRequest(
    'Add user authentication with JWT tokens to the API',
  )

  console.log('\nMayor Response:')
  console.log(response.message)
  console.log('\nPlan:')
  console.log('- Tasks:', response.plan.tasks.length)
  console.log('- Effort:', response.plan.totalEffort)
  console.log('- Risks:', response.plan.risks)
  console.log('- Success Criteria:', response.plan.successCriteria)
}

/**
 * Example 5: Complete Workflow
 */
async function exampleCompleteWorkflow() {
  console.log('\n=== Example 5: Complete Workflow ===')

  // 1. Initialize all systems
  const stateManager = getGlobalStateManager()
  const mailboxManager = getGlobalMailboxManager()
  const convoyManager = getGlobalConvoyManager()
  const mayor = getGlobalMayorAgent()

  await stateManager.initialize()
  await mailboxManager.initialize()
  await convoyManager.initialize()

  console.log('✓ All systems initialized')

  // 2. Mayor receives user request
  const response = await mayor.processRequest(
    'Refactor the authentication module to use async/await',
  )

  console.log('✓ Mayor created plan:', response.convoyId)

  // 3. Workers receive tasks via mailbox
  const convoy = convoyManager.get(response.convoyId)
  if (convoy) {
    for (const task of convoy.tasks) {
      if (task.assignedTo) {
        await mailboxManager.send('mayor-001', task.assignedTo, {
          type: 'task_assignment',
          payload: {
            convoyId: convoy.id,
            taskId: task.id,
            title: task.title,
            description: task.description,
          },
        })
      }
    }
    console.log('✓ Tasks distributed to workers')
  }

  // 4. Workers save state as they work
  const workerId = 'worker-001'
  await stateManager.createAgentWorktree(workerId)
  await stateManager.saveState(workerId, {
    agentId: workerId,
    status: 'active',
    currentTask: 'Refactoring authentication',
    memory: { progress: 0.5 },
  })

  console.log('✓ Worker state persisted')

  // 5. Monitor progress
  const activeConvoys = mayor.getActiveConvoys()
  console.log('✓ Active convoys:', activeConvoys.length)

  console.log('\n✓ Complete workflow demonstrated')
}

/**
 * Run all examples
 */
async function main() {
  console.log('Gastown-Inspired Multi-Agent System Examples')
  console.log('=============================================')

  try {
    await exampleStatePersistence()
    await exampleMailboxMessaging()
    await exampleConvoyManagement()
    await exampleMayorCoordination()
    await exampleCompleteWorkflow()

    console.log('\n✓ All examples completed successfully')
  }
  catch (error) {
    console.error('\n✗ Error:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export {
  exampleCompleteWorkflow,
  exampleConvoyManagement,
  exampleMailboxMessaging,
  exampleMayorCoordination,
  exampleStatePersistence,
}

/**
 * Basic Usage Example
 *
 * Demonstrates how to use the Brain system for multi-agent orchestration.
 */

import { initializeBrain } from '../index'

async function main() {
  console.log('🧠 Brain System - Basic Usage Example\n')

  // ========================================================================
  // Example 1: Initialize the full Brain system
  // ========================================================================

  console.log('1️⃣ Initializing Brain system...')
  const brain = await initializeBrain({
    stateDir: '.brain-state',
    autoRecover: true,
    mayorConfig: {
      autoCreateConvoy: true,
      autoSpawnWorkers: true,
      monitorProgress: true,
      maxConcurrentWorkers: 5,
    },
  })
  console.log('✅ Brain system initialized\n')

  // ========================================================================
  // Example 2: Use the Mayor to process a request
  // ========================================================================

  console.log('2️⃣ Processing user request with Mayor...')
  const response = await brain.mayor.processRequest(
    'Add authentication to the app with JWT tokens',
  )

  console.log('📋 Mayor Response:')
  console.log(response.message)
  console.log('\n📊 Task Plan:')
  console.log(`  Name: ${response.plan.name}`)
  console.log(`  Tasks: ${response.plan.tasks.length}`)
  console.log(`  Effort: ${response.plan.totalEffort}`)
  console.log('\n📝 Tasks:')
  response.plan.tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. ${task.title} (${task.role})`)
  })
  console.log()

  // ========================================================================
  // Example 3: Monitor convoy progress
  // ========================================================================

  console.log('3️⃣ Monitoring convoy progress...')
  brain.mayor.on('progress:update', (update) => {
    console.log(`📈 Progress: ${update.progress}% (${update.completedTasks}/${update.totalTasks})`)
  })

  brain.mayor.on('convoy:completed', (convoy, summary) => {
    console.log('✅ Convoy completed!')
    console.log(summary)
  })

  // ========================================================================
  // Example 4: Work with convoys directly
  // ========================================================================

  console.log('4️⃣ Creating a convoy manually...')
  const convoy = await brain.convoyManager.create('Fix Login Bug', {
    description: 'Fix the login bug reported by users',
    notifyOnComplete: true,
  })

  // Add tasks
  const task1 = await brain.convoyManager.addTask(convoy.id, 'Reproduce bug', {
    description: 'Understand and reproduce the login bug',
  })

  const task2 = await brain.convoyManager.addTask(convoy.id, 'Fix bug', {
    description: 'Implement the fix',
    dependsOn: [task1.id],
  })

  const _task3 = await brain.convoyManager.addTask(convoy.id, 'Add test', {
    description: 'Add regression test',
    dependsOn: [task2.id],
  })

  console.log(`✅ Created convoy: ${convoy.id}`)
  console.log(`   Tasks: ${convoy.totalTasks}`)
  console.log()

  // Start and execute tasks
  await brain.convoyManager.start(convoy.id)
  console.log('🚀 Convoy started')

  await brain.convoyManager.startTask(convoy.id, task1.id, 'agent-1')
  console.log('▶️  Task 1 started')

  await brain.convoyManager.completeTask(convoy.id, task1.id, {
    reproduced: true,
    steps: ['Login with invalid credentials', 'Check error message'],
  })
  console.log('✅ Task 1 completed')

  // Get next available tasks
  const nextTasks = brain.convoyManager.getNextTasks(convoy.id)
  console.log(`📋 Next available tasks: ${nextTasks.map(t => t.title).join(', ')}`)
  console.log()

  // ========================================================================
  // Example 5: Agent communication via mailbox
  // ========================================================================

  console.log('5️⃣ Agent communication...')

  // Send a message
  await brain.mailboxManager.send(
    'agent-1',
    'agent-2',
    'Task completed',
    {
      taskId: task1.id,
      result: 'Bug reproduced successfully',
      nextSteps: ['Implement fix', 'Add test'],
    },
    {
      priority: 'high',
    },
  )
  console.log('📧 Message sent from agent-1 to agent-2')

  // Check inbox
  const unread = await brain.mailboxManager.checkInbox('agent-2')
  console.log(`📬 Agent-2 has ${unread.length} unread messages`)

  if (unread.length > 0) {
    const message = unread[0]
    console.log(`   From: ${message.from}`)
    console.log(`   Subject: ${message.subject}`)
    console.log(`   Priority: ${message.priority}`)

    // Mark as read
    await brain.mailboxManager.markAsRead('agent-2', message.id)
    console.log('✅ Message marked as read')
  }
  console.log()

  // ========================================================================
  // Example 6: State persistence
  // ========================================================================

  console.log('6️⃣ State persistence...')

  // Create agent worktree
  await brain.stateManager.createAgentWorktree('agent-1')
  console.log('📁 Created worktree for agent-1')

  // Save state
  await brain.stateManager.saveState('agent-1', {
    agentId: 'agent-1',
    role: 'coder',
    status: 'active',
    currentTask: task2.id,
    taskHistory: [task1.id],
    memory: {
      context: 'Working on login bug fix',
      files: ['auth.ts', 'login.ts'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  console.log('💾 State saved for agent-1')

  // Load state
  const state = await brain.stateManager.loadState('agent-1')
  console.log('📖 State loaded:')
  console.log(`   Role: ${state?.role}`)
  console.log(`   Status: ${state?.status}`)
  console.log(`   Current task: ${state?.currentTask}`)
  console.log()

  // ========================================================================
  // Example 7: Get convoy summary
  // ========================================================================

  console.log('7️⃣ Convoy summary...')
  const summary = brain.convoyManager.getSummary(convoy.id)
  console.log(summary)
  console.log()

  console.log('✅ Example completed!')
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
}

export { main }

// Quick manual test script
import { TaskManager } from './src/task-manager/task-manager.js'

const taskManager = new TaskManager({
  storageType: 'cloud',
  cloudEndpoint: 'http://localhost:3456',
})

async function test() {
  console.log('=== Test 1: Create task ===')
  const t1 = await taskManager.createTask({ name: 'Task 1', priority: 'high' })
  console.log('Created:', t1.id)

  console.log('\n=== Test 2: Create task 2 ===')
  const t2 = await taskManager.createTask({ name: 'Task 2', priority: 'medium' })
  console.log('Created:', t2.id)

  console.log('\n=== Test 3: Add dependency ===')
  try {
    const added = await taskManager.addDependency(t2.id, t1.id)
    console.log('Dependency added:', added)
  } catch (e) {
    console.error('Add dependency failed:', e)
  }

  console.log('\n=== Test 4: Get dependency graph ===')
  try {
    const graph = await taskManager.getDependencyGraph(t2.id)
    console.log('Graph nodes:', graph.nodes.length)
  } catch (e) {
    console.error('Get graph failed:', e)
  }

  console.log('\n=== Test 5: Delete task ===')
  try {
    const deleted = await taskManager.deleteTask(t1.id)
    console.log('Deleted:', deleted)
  } catch (e) {
    console.error('Delete failed:', e)
  }

  console.log('\n=== All tests done ===')
}

test().catch(console.error)

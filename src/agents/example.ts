/**
 * Multi-Agent Orchestration Example
 *
 * Demonstrates how to use the multi-agent orchestration system
 */

import type { Task } from '../types/agent.js'
import { MultiAgentOrchestrator } from './multi-agent-orchestrator.js'

async function example() {
  const orchestrator = new MultiAgentOrchestrator()

  // Example 1: Simple task
  const simpleTasks: Task[] = [{
    id: 'task-1',
    description: 'Create a new TypeScript CLI command',
    complexity: 3,
    priority: 'medium',
    requiredCapabilities: ['typescript', 'cli-architecture'],
  }]

  console.log('Executing simple task...')
  const simpleResult = orchestrator.orchestrate(simpleTasks)
  console.log('Simple task result:', simpleResult)
  console.log('Stats:', orchestrator.getStats(simpleResult))

  // Example 2: Medium complexity task
  const mediumTasks: Task[] = [{
    id: 'task-2',
    description: 'Add internationalization support to CLI',
    complexity: 5,
    priority: 'high',
    requiredCapabilities: ['typescript', 'internationalization', 'i18next'],
  }]

  console.log('\nExecuting medium task...')
  const mediumResult = orchestrator.orchestrate(mediumTasks)
  console.log('Medium task result:', mediumResult)
  console.log('Stats:', orchestrator.getStats(mediumResult))

  // Example 3: Complex task with multiple phases
  const complexTasks: Task[] = [
    {
      id: 'task-3a',
      description: 'Design configuration architecture',
      complexity: 7,
      priority: 'high',
      requiredCapabilities: ['configuration-management', 'config-merging'],
    },
    {
      id: 'task-3b',
      description: 'Implement configuration system',
      complexity: 8,
      priority: 'high',
      requiredCapabilities: ['typescript', 'configuration-management'],
    },
    {
      id: 'task-3c',
      description: 'Write tests for configuration',
      complexity: 5,
      priority: 'medium',
      requiredCapabilities: ['testing', 'vitest'],
    },
  ]

  console.log('\nExecuting complex tasks...')
  const complexResult = orchestrator.orchestrate(complexTasks)
  console.log('Complex task result:', complexResult)
  console.log('Stats:', orchestrator.getStats(complexResult))
}

// Run example if executed directly
if (typeof process !== 'undefined' && process.argv[1]) {
  const fileUrl = new URL(import.meta.url)
  if (fileUrl.pathname === process.argv[1]) {
    example().catch(console.error)
  }
}

export { example }

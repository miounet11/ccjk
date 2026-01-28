/**
 * Multi-Agent Orchestration Example
 *
 * Demonstrates how to use the multi-agent orchestration system
 */

import type { OrchestratorTask } from '../types/agent.js'
import { MultiAgentOrchestrator } from './multi-agent-orchestrator.js'

async function example() {
  const orchestrator = new MultiAgentOrchestrator()

  // Example 1: Simple task
  const simpleTask: OrchestratorTask = {
    id: 'task-1',
    description: 'Create a new TypeScript CLI command',
    complexity: 'simple',
    requiredSpecialties: ['typescript', 'cli'],
  }

  console.log('Executing simple task...')
  const simpleResult = await orchestrator.orchestrate(simpleTask)
  console.log('Simple task result:', simpleResult.resolution)
  console.log('Metrics:', orchestrator.getMetrics(simpleResult))

  // Example 2: Medium complexity task
  const mediumTask: OrchestratorTask = {
    id: 'task-2',
    description: 'Add internationalization support to CLI',
    complexity: 'medium',
    requiredSpecialties: ['typescript', 'i18next', 'localization'],
  }

  console.log('\nExecuting medium task...')
  const mediumResult = await orchestrator.orchestrate(mediumTask)
  console.log('Medium task result:', mediumResult.resolution)
  console.log('Metrics:', orchestrator.getMetrics(mediumResult))

  // Example 3: Complex task with multiple phases
  const complexTask: OrchestratorTask = {
    id: 'task-3',
    description: 'Implement full feature with tests and configuration',
    complexity: 'complex',
    requiredSpecialties: ['typescript', 'testing', 'configuration', 'i18next'],
  }

  console.log('\nExecuting complex task...')
  const complexResult = await orchestrator.orchestrate(complexTask)
  console.log('Complex task result:', complexResult.resolution)
  console.log('Metrics:', orchestrator.getMetrics(complexResult))
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error)
}

export { example }

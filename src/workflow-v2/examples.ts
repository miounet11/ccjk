/**
 * Workflow v2 Usage Examples
 *
 * This file demonstrates common usage patterns for the workflow v2 system.
 */

import type { Fragment, Workflow } from './index.js'
import {

  FragmentLibrary,
  quickOptimize,
  quickValidate,

  WorkflowManager,
} from './index.js'

/**
 * Example 1: Basic Workflow Generation
 */
export async function example1_BasicGeneration() {
  console.log('=== Example 1: Basic Workflow Generation ===\n')

  const manager = new WorkflowManager({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
  })

  const result = await manager.generateWorkflow({
    task: 'Build and test a Node.js application with Docker support',
    context: {
      language: 'typescript',
      framework: 'express',
      platform: 'linux',
      packageManager: 'npm',
      testingFramework: 'jest',
    },
    options: {
      includeTests: true,
      includeErrorHandling: true,
      optimizationLevel: 'balanced',
      style: 'concise',
    },
  })

  console.log('Generated Workflow:')
  console.log(`  ID: ${result.workflow.id}`)
  console.log(`  Name: ${result.workflow.name}`)
  console.log(`  Description: ${result.workflow.description}`)
  console.log(`  Steps: ${result.workflow.steps.length}`)
  console.log(`  Tags: ${result.workflow.tags.join(', ')}`)
  console.log(`  Complexity: ${result.workflow.metadata.complexity}`)
  console.log(`  Estimated Duration: ${result.workflow.metadata.estimatedDuration} minutes`)
  console.log(`  Confidence: ${(result.metadata.confidence! * 100).toFixed(1)}%`)
  console.log(`  Generation Time: ${result.metadata.duration}ms`)

  if (result.metadata.tokensUsed) {
    console.log(`  Tokens Used: ${result.metadata.tokensUsed}`)
  }

  console.log('\nSteps:')
  for (const step of result.workflow.steps) {
    console.log(`  - ${step.name} (${step.id})`)
    console.log(`    ${step.description}`)
    if (step.command) {
      console.log(`    Command: ${step.command}`)
    }
    if (step.dependencies && step.dependencies.length > 0) {
      console.log(`    Dependencies: ${step.dependencies.join(', ')}`)
    }
  }

  return result.workflow
}

/**
 * Example 2: Using Fragments
 */
export async function example2_UsingFragments() {
  console.log('\n=== Example 2: Using Fragments ===\n')

  const manager = new WorkflowManager()

  // Search for fragments
  console.log('Searching for Docker-related fragments:')
  const dockerFragments = manager.searchFragments('docker')
  for (const fragment of dockerFragments) {
    console.log(`  - ${fragment.name} (${fragment.id})`)
    console.log(`    ${fragment.description}`)
    console.log(`    Category: ${fragment.category}`)
  }

  // Get fragments by category
  console.log('\nSetup fragments:')
  const setupFragments = manager.getFragmentsByCategory('setup')
  for (const fragment of setupFragments) {
    console.log(`  - ${fragment.name}`)
  }

  // Generate workflow from fragments
  const fragmentIds = ['setup-nodejs', 'setup-git', 'setup-docker']
  console.log(`\nGenerating workflow from fragments: ${fragmentIds.join(', ')}`)

  const result = await manager.generateFromFragments(
    fragmentIds,
    {
      language: 'javascript',
      platform: 'linux',
    },
  )

  console.log(`\nGenerated workflow: ${result.workflow.name}`)
  console.log(`  Steps: ${result.workflow.steps.length}`)
  console.log(`  Fragments used: ${result.metadata.fragmentCount}`)

  return result.workflow
}

/**
 * Example 3: Workflow Validation
 */
export function example3_Validation(workflow: Workflow) {
  console.log('\n=== Example 3: Workflow Validation ===\n')

  const validation = quickValidate(workflow, {
    language: 'typescript',
    platform: 'linux',
  })

  console.log(`Valid: ${validation.isValid}`)

  if (validation.errors.length > 0) {
    console.log('\nErrors:')
    for (const error of validation.errors) {
      console.log(`  [${error.severity}] ${error.type}: ${error.message}`)
      if (error.stepId) {
        console.log(`    Step: ${error.stepId}`)
      }
    }
  }

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of validation.warnings) {
      console.log(`  [${warning.type}] ${warning.message}`)
      if (warning.stepId) {
        console.log(`    Step: ${warning.stepId}`)
      }
      if (warning.suggestion) {
        console.log(`    Suggestion: ${warning.suggestion}`)
      }
    }
  }

  if (validation.suggestions && validation.suggestions.length > 0) {
    console.log('\nSuggestions:')
    for (const suggestion of validation.suggestions) {
      console.log(`  - ${suggestion}`)
    }
  }

  return validation
}

/**
 * Example 4: Workflow Optimization
 */
export function example4_Optimization(workflow: Workflow) {
  console.log('\n=== Example 4: Workflow Optimization ===\n')

  const optimization = quickOptimize(workflow, {
    language: 'typescript',
    platform: 'linux',
  })

  console.log('Optimization Results:')
  console.log(`  Original Duration: ${optimization.originalWorkflow.metadata.estimatedDuration} minutes`)
  console.log(`  Optimized Duration: ${optimization.optimizedWorkflow.metadata.estimatedDuration} minutes`)
  console.log(`  Time Saved: ${optimization.estimatedTimeSaved} minutes`)
  console.log(`  Resource Saved: ${optimization.estimatedResourceSaved}`)

  console.log('\nImprovements:')
  for (const improvement of optimization.improvements) {
    console.log(`  [${improvement.type}] ${improvement.description}`)
    console.log(`    Impact: ${improvement.impact}`)
    if (improvement.before) {
      console.log(`    Before: ${improvement.before}`)
    }
    if (improvement.after) {
      console.log(`    After: ${improvement.after}`)
    }
  }

  return optimization
}

/**
 * Example 5: Custom Fragments
 */
export function example5_CustomFragments() {
  console.log('\n=== Example 5: Custom Fragments ===\n')

  const library = new FragmentLibrary()

  // Create custom fragment
  const customFragment: Fragment = {
    id: 'custom-frontend-build',
    name: 'Frontend Build Optimization',
    description: 'Build frontend application with optimizations',
    category: 'develop',
    steps: [
      {
        id: 'install-deps',
        name: 'Install Dependencies',
        description: 'Install all frontend dependencies',
        command: 'npm ci',
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to install dependencies',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'lint-code',
        name: 'Lint Code',
        description: 'Run linter to check code quality',
        command: 'npm run lint',
        dependencies: ['install-deps'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Linting failed',
        },
      },
      {
        id: 'type-check',
        name: 'Type Check',
        description: 'Run TypeScript type checking',
        command: 'npm run type-check',
        dependencies: ['install-deps'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Type checking failed',
        },
      },
      {
        id: 'run-tests',
        name: 'Run Tests',
        description: 'Execute unit and integration tests',
        command: 'npm run test:ci',
        dependencies: ['install-deps'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Tests failed',
        },
      },
      {
        id: 'build-production',
        name: 'Build for Production',
        description: 'Build optimized production bundle',
        command: 'npm run build',
        dependencies: ['lint-code', 'type-check', 'run-tests'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Production build failed',
        },
        errorHandling: {
          strategy: 'abort',
        },
      },
      {
        id: 'verify-build',
        name: 'Verify Build Output',
        description: 'Check that build artifacts were created',
        command: '[ -f dist/index.html ] && [ -d dist/assets ]',
        dependencies: ['build-production'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Build artifacts missing',
        },
      },
    ],
    tags: ['frontend', 'build', 'production', 'optimization'],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      author: 'custom',
    },
  }

  // Add fragment to library
  library.addFragment(customFragment)

  console.log('Added custom fragment:')
  console.log(`  ID: ${customFragment.id}`)
  console.log(`  Name: ${customFragment.name}`)
  console.log(`  Steps: ${customFragment.steps.length}`)

  // Verify fragment was added
  const retrieved = library.getFragment(customFragment.id)
  if (retrieved) {
    console.log('\nFragment successfully retrieved from library')
  }

  // Search for the fragment
  const searchResults = library.searchText('frontend build')
  console.log(`\nSearch found ${searchResults.length} fragment(s)`)
  for (const result of searchResults) {
    console.log(`  - ${result.name} (${result.id})`)
  }

  return customFragment
}

/**
 * Example 6: Fragment Library Statistics
 */
export function example6_LibraryStats() {
  console.log('\n=== Example 6: Fragment Library Statistics ===\n')

  const library = new FragmentLibrary()
  const stats = library.getStats()

  console.log('Fragment Library Statistics:')
  console.log(`  Total Fragments: ${stats.totalFragments}`)
  console.log('\nFragments by Category:')
  for (const [category, count] of Object.entries(stats.fragmentsByCategory)) {
    if (count > 0) {
      console.log(`    ${category}: ${count}`)
    }
  }

  console.log('\nTop Tags:')
  for (const tag of stats.topTags) {
    console.log(`    ${tag.tag}: ${tag.count} fragments`)
  }

  return stats
}

/**
 * Example 7: Cache Management
 */
export async function example7_CacheManagement() {
  console.log('\n=== Example 7: Cache Management ===\n')

  const manager = new WorkflowManager()

  // Generate workflow (will be cached)
  console.log('Generating workflow (first time - cache miss):')
  const result1 = await manager.generateWorkflow({
    task: 'Build a Node.js application',
    context: {
      language: 'javascript',
      platform: 'linux',
    },
  })
  console.log(`  Cache Hit: ${result1.metadata.cacheHit ? 'Yes' : 'No'}`)
  console.log(`  Duration: ${result1.metadata.duration}ms`)

  // Generate same workflow again (should be cached)
  console.log('\nGenerating same workflow again (cache hit):')
  const result2 = await manager.generateWorkflow({
    task: 'Build a Node.js application',
    context: {
      language: 'javascript',
      platform: 'linux',
    },
  })
  console.log(`  Cache Hit: ${result2.metadata.cacheHit ? 'Yes' : 'No'}`)
  console.log(`  Duration: ${result2.metadata.duration}ms`)

  // View cache stats
  const cacheStats = manager.getCacheStats()
  console.log('\nCache Statistics:')
  console.log(`  Size: ${cacheStats.size} entries`)
  console.log(`  Keys: ${cacheStats.keys.length}`)

  // Clear cache
  console.log('\nClearing cache...')
  manager.clearCache()
  console.log('Cache cleared')

  const statsAfter = manager.getCacheStats()
  console.log(`  Cache size after clear: ${statsAfter.size} entries`)

  return { result1, result2, cacheStats }
}

/**
 * Example 8: End-to-End Workflow
 */
export async function example8_EndToEnd() {
  console.log('\n=== Example 8: End-to-End Workflow ===\n')

  const manager = new WorkflowManager()

  // 1. Generate workflow
  console.log('Step 1: Generate workflow')
  const generation = await manager.generateWorkflow({
    task: 'Set up, build, test, and deploy a Node.js API',
    context: {
      language: 'typescript',
      framework: 'express',
      platform: 'linux',
      packageManager: 'npm',
    },
    options: {
      includeTests: true,
      includeErrorHandling: true,
      optimizationLevel: 'quality',
    },
  })

  console.log(`  Generated: ${generation.workflow.name}`)
  console.log(`  Steps: ${generation.workflow.steps.length}`)

  // 2. Validate workflow
  console.log('\nStep 2: Validate workflow')
  const validation = manager.validateWorkflow(generation.workflow, {
    language: 'typescript',
    platform: 'linux',
  })

  console.log(`  Valid: ${validation.isValid}`)
  if (!validation.isValid) {
    console.log(`  Errors: ${validation.errors.length}`)
    console.log(`  Warnings: ${validation.warnings.length}`)
  }

  // 3. Optimize workflow
  console.log('\nStep 3: Optimize workflow')
  const optimization = manager.optimizeWorkflow(generation.workflow, {
    language: 'typescript',
    platform: 'linux',
  })

  console.log(`  Time saved: ${optimization.estimatedTimeSaved} minutes`)
  console.log(`  Improvements: ${optimization.improvements.length}`)

  // 4. Export workflow
  console.log('\nStep 4: Export workflow')
  const workflowJSON = JSON.stringify(optimization.optimizedWorkflow, null, 2)
  console.log(`  Size: ${workflowJSON.length} characters`)

  return {
    generation,
    validation,
    optimization,
    workflowJSON,
  }
}

/**
 * Main function to run all examples
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     CCJK Workflow v2 - Usage Examples                    ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  try {
    // Run examples
    const workflow1 = await example1_BasicGeneration()
    const workflow2 = await example2_UsingFragments()
    example3_Validation(workflow1)
    example4_Optimization(workflow1)
    example5_CustomFragments()
    example6_LibraryStats()
    await example7_CacheManagement()
    await example8_EndToEnd()

    console.log('\n✅ All examples completed successfully!')
  }
  catch (error) {
    console.error('\n❌ Example failed:', error)
    process.exit(1)
  }
}

// Run examples if this file is executed directly
// Note: Use `npx tsx src/workflow-v2/examples.ts` to run
const isMainModule = typeof require !== 'undefined' && require.main === module
if (isMainModule) {
  runAllExamples()
}

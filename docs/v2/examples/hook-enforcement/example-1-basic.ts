/**
 * Example 1: Basic Hook System
 *
 * Demonstrates how to register and enforce a basic hook
 */

import type { HookExecutor, HookMatcher } from '@ccjk/v2/hooks'
import { HookEnforcer } from '@ccjk/v2/hooks'
import { EnforcementLevel } from '@ccjk/v2/types'

/**
 * Step 1: Define a hook matcher
 * This hook triggers when the user asks about file operations
 */
const fileOperationMatcher: HookMatcher = {
  id: 'file-operation-check',
  name: 'File Operation Checker',
  keywords: ['delete', 'remove', 'modify', 'file'],
  level: EnforcementLevel.L1, // Suggestion only
  category: 'safety',
}

/**
 * Step 2: Define the hook executor
 * This function executes when the hook is triggered
 */
const fileOperationExecutor: HookExecutor = async (context) => {
  const { userQuery, metadata: _metadata } = context

  // Extract file paths from the query
  const filePaths = (userQuery.match(/[\w\-./]+\.(ts|js|json|md)/g) || []).slice(0, 5)

  if (filePaths.length === 0) {
    return {
      action: 'continue',
      message: 'No file paths detected. Proceeding safely.',
    }
  }

  // Provide safety suggestions
  return {
    action: 'suggest',
    message: `Detected file operations on: ${filePaths.join(', ')}`,
    suggestions: [
      'Create a backup before modifying',
      'Use git to track changes',
      'Consider using a dry-run first',
    ],
    metadata: {
      filePaths,
      riskLevel: 'low',
    },
  }
}

/**
 * Step 3: Register and enforce the hook
 */
export async function basicHookExample() {
  const enforcer = new HookEnforcer()

  // Register the hook
  enforcer.register({
    matcher: fileOperationMatcher,
    executor: fileOperationExecutor,
  })

  // Test the hook
  const userQuery = 'Please delete the file src/utils/config.ts'

  const result = await enforcer.enforce(userQuery, {
    userId: 'user-123',
    sessionId: 'session-456',
  })

  console.log('Hook Enforcement Result:', result)

  return result
}

/**
 * Expected Output:
 *
 * {
 *   action: 'suggest',
 *   message: 'Detected file operations on: src/utils/config.ts',
 *   suggestions: [
 *     'Create a backup before modifying',
 *     'Use git to track changes',
 *     'Consider using a dry-run first'
 *   ],
 *   metadata: {
 *     filePaths: ['src/utils/config.ts'],
 *     riskLevel: 'low'
 *   },
 *   canProceed: true
 * }
 */

/**
 * Example 3: Hook Bypass Mechanism
 *
 * Demonstrates how to implement bypass mechanisms for hooks
 */

import type { HookExecutor, HookMatcher } from '@ccjk/v2/hooks'
import { HookEnforcer } from '@ccjk/v2/hooks'
import { EnforcementLevel } from '@ccjk/v2/types'

/**
 * Hook with bypass capability
 */
const expensiveOperationMatcher: HookMatcher = {
  id: 'expensive-operation-check',
  name: 'Expensive Operation Checker',
  keywords: ['analyze', 'process', 'scan', 'deep'],
  level: EnforcementLevel.L2, // Require confirmation
  category: 'performance',
  timeout: 30000, // 30 second timeout
}

/**
 * Executor with bypass logic
 */
const expensiveOperationExecutor: HookExecutor = async (context) => {
  const { userQuery, metadata } = context

  // Check for bypass flag
  const hasBypass = metadata.bypassHooks?.includes('expensive-operation-check')

  if (hasBypass) {
    return {
      action: 'continue',
      message: 'Bypass detected. Skipping expensive operation check.',
      metadata: {
        bypassed: true,
        reason: 'User provided bypass flag',
      },
    }
  }

  // Simulate expensive operation check
  const estimatedTime = estimateOperationTime(userQuery)

  if (estimatedTime > 5000) { // > 5 seconds
    return {
      action: 'confirm',
      message: `This operation will take approximately ${estimatedTime / 1000} seconds`,
      confirmation: {
        type: 'explicit',
        prompt: 'Are you sure you want to proceed?',
        bypassOption: true, // Allow bypass
        bypassFlag: '--bypass-expensive',
      },
      metadata: {
        estimatedTime,
        operationComplexity: 'high',
      },
    }
  }

  return {
    action: 'continue',
    message: 'Quick operation detected. Proceeding without confirmation.',
  }
}

/**
 * Helper function to estimate operation time
 */
function estimateOperationTime(query: string): number {
  const complexity = query.length * 100
  const fileCount = (query.match(/file|scan|analyze/g) || []).length
  const deepScan = query.includes('deep') ? 5000 : 0

  return Math.min(complexity + fileCount * 2000 + deepScan, 30000)
}

/**
 * Example: Using bypass mechanism
 */
export async function bypassExample() {
  const enforcer = new HookEnforcer()

  enforcer.register({
    matcher: expensiveOperationMatcher,
    executor: expensiveOperationExecutor,
  })

  // Scenario 1: Normal operation (requires confirmation)
  console.log('Scenario 1: Normal operation')
  const result1 = await enforcer.enforce(
    'Deep scan all files in the project',
    {
      userId: 'user-123',
    },
  )
  console.log('Result:', result1)

  // Scenario 2: With bypass flag (proceeds immediately)
  console.log('\nScenario 2: With bypass flag')
  const result2 = await enforcer.enforce(
    'Deep scan all files in the project',
    {
      userId: 'user-123',
      bypassHooks: ['expensive-operation-check'],
    },
  )
  console.log('Result:', result2)

  // Scenario 3: Quick operation (no confirmation needed)
  console.log('\nScenario 3: Quick operation')
  const result3 = await enforcer.enforce(
    'Check syntax',
    {
      userId: 'user-123',
    },
  )
  console.log('Result:', result3)

  return { result1, result2, result3 }
}

/**
 * Advanced Example: Temporary bypass with time limit
 */
export async function temporaryBypassExample() {
  const enforcer = new HookEnforcer()

  // Register a hook with temporary bypass capability
  enforcer.register({
    matcher: {
      id: 'temp-bypass-test',
      name: 'Temporary Bypass Test',
      keywords: ['test'],
      level: EnforcementLevel.L2,
    },
    executor: async (context) => {
      const bypassUntil = context.metadata.bypassUntil

      // Check if we have an active temporary bypass
      if (bypassUntil && Date.now() < bypassUntil) {
        return {
          action: 'continue',
          message: 'Temporary bypass active',
          metadata: {
            bypassed: true,
            bypassExpiresAt: new Date(bypassUntil).toISOString(),
          },
        }
      }

      return {
        action: 'confirm',
        message: 'This operation requires confirmation',
      }
    },
  })

  // Set a temporary bypass for 5 minutes
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000

  const result = await enforcer.enforce('test operation', {
    userId: 'user-123',
    bypassUntil: fiveMinutesFromNow,
  })

  return result
}

/**
 * Expected Output for Scenario 1:
 *
 * {
 *   action: 'confirm',
 *   message: 'This operation will take approximately 10 seconds',
 *   confirmation: {
 *     type: 'explicit',
 *     prompt: 'Are you sure you want to proceed?',
 *     bypassOption: true,
 *     bypassFlag: '--bypass-expensive'
 *   },
 *   metadata: {
 *     estimatedTime: 10000,
 *     operationComplexity: 'high'
 *   },
 *   canProceed: false
 * }
 */

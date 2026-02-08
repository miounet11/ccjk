/**
 * Example 2: L3 Critical Hook Enforcement
 *
 * Demonstrates critical-level hooks that block dangerous operations
 */

import type { HookExecutor, HookMatcher } from '@ccjk/v2/hooks'
import { HookEnforcer } from '@ccjk/v2/hooks'
import { EnforcementLevel } from '@ccjk/v2/types'

/**
 * Critical Hook: System File Protection
 *
 * This hook uses L3 enforcement to block operations on critical system files
 */
const systemFileProtectionMatcher: HookMatcher = {
  id: 'system-file-protection',
  name: 'System File Protection',
  keywords: ['delete', 'remove', 'rm', 'unlink'],
  level: EnforcementLevel.L3, // Block operation
  category: 'critical',
  priority: 100, // Highest priority
}

/**
 * Critical executor with strict blocking logic
 */
const systemFileProtectionExecutor: HookExecutor = async (context) => {
  const { userQuery, metadata: _metadata } = context

  // Define protected paths
  const protectedPaths = [
    '/etc/passwd',
    '/etc/shadow',
    '/usr/bin',
    '/System',
    'C:\\Windows',
    '~/.ssh',
    '~/.gnupg',
  ]

  // Check if query contains protected paths
  const hasProtectedPath = protectedPaths.some(path => userQuery.includes(path))

  if (hasProtectedPath) {
    return {
      action: 'block',
      message: 'CRITICAL: Attempted operation on system file',
      reason: 'Protected system files cannot be modified',
      error: {
        code: 'SYSTEM_FILE_PROTECTED',
        severity: 'critical',
        details: 'This operation is blocked to prevent system damage',
      },
      metadata: {
        requiresAdmin: true,
        riskLevel: 'critical',
      },
    }
  }

  // Check for wildcard deletions
  const hasWildcard = userQuery.includes('*') || userQuery.includes('rm -rf')

  if (hasWildcard) {
    return {
      action: 'block',
      message: 'CRITICAL: Wildcard deletion detected',
      reason: 'Wildcard operations are too dangerous',
      error: {
        code: 'WILDCARD_BLOCKED',
        severity: 'critical',
        details: 'Use specific file paths instead of wildcards',
      },
      metadata: {
        requiresExplicitConfirmation: true,
        riskLevel: 'high',
      },
    }
  }

  // Safe to proceed
  return {
    action: 'continue',
    message: 'No critical violations detected',
  }
}

/**
 * Example: Register critical hook
 */
export async function criticalHookExample() {
  const enforcer = new HookEnforcer()

  // Register the critical hook
  enforcer.register({
    matcher: systemFileProtectionMatcher,
    executor: systemFileProtectionExecutor,
  })

  // Test Case 1: System file operation (should be blocked)
  console.log('Test 1: System file operation')
  const result1 = await enforcer.enforce('Delete /etc/passwd', {
    userId: 'user-123',
  })
  console.log('Result:', result1)
  // Expected: action: 'block'

  // Test Case 2: Wildcard deletion (should be blocked)
  console.log('\nTest 2: Wildcard deletion')
  const result2 = await enforcer.enforce('rm -rf /home/user/projects/*', {
    userId: 'user-123',
  })
  console.log('Result:', result2)
  // Expected: action: 'block'

  // Test Case 3: Safe operation (should continue)
  console.log('\nTest 3: Safe operation')
  const result3 = await enforcer.enforce('Delete the temporary file temp.txt', {
    userId: 'user-123',
  })
  console.log('Result:', result3)
  // Expected: action: 'continue'

  return { result1, result2, result3 }
}

/**
 * Expected Output for Test 1:
 *
 * {
 *   action: 'block',
 *   message: 'CRITICAL: Attempted operation on system file',
 *   reason: 'Protected system files cannot be modified',
 *   error: {
 *     code: 'SYSTEM_FILE_PROTECTED',
 *     severity: 'critical',
 *     details: 'This operation is blocked to prevent system damage'
 *   },
 *   metadata: {
 *     requiresAdmin: true,
 *     riskLevel: 'critical'
 *   },
 *   canProceed: false
 * }
 */

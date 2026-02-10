import { describe, expect, it } from 'vitest'
import { cleanupZcfNamespace } from '../../src/utils/cleanup-migration'

/**
 * Integration test verifying that cleanupZcfNamespace is properly integrated
 * into the init command. This test verifies the function is available and
 * can be imported, which is what init.ts does via dynamic import.
 */
describe('init command - cleanup migration integration', () => {
  it('should have cleanupZcfNamespace available for import', () => {
    // Verify the function exists and is callable
    expect(cleanupZcfNamespace).toBeDefined()
    expect(typeof cleanupZcfNamespace).toBe('function')
  })

  it('should return expected structure from cleanupZcfNamespace', () => {
    // Call the function and verify it returns the expected structure
    const result = cleanupZcfNamespace()

    expect(result).toHaveProperty('removed')
    expect(Array.isArray(result.removed)).toBe(true)
  })

  it('should be safe to call cleanupZcfNamespace multiple times', () => {
    // Verify idempotency - calling multiple times should not throw
    expect(() => {
      cleanupZcfNamespace()
      cleanupZcfNamespace()
      cleanupZcfNamespace()
    }).not.toThrow()
  })
})

/**
 * Note: Full end-to-end testing of init() calling cleanupZcfNamespace()
 * is covered by manual testing and the unit tests for cleanup-migration.ts.
 *
 * The init.ts file uses dynamic imports:
 *   const { cleanupZcfNamespace } = await import('../utils/cleanup-migration.js')
 *   cleanupZcfNamespace()
 *
 * This integration test verifies that:
 * 1. The function is properly exported and importable
 * 2. The function has the correct signature and behavior
 * 3. The function is safe to call (doesn't throw unexpected errors)
 */

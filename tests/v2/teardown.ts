import { afterAll } from 'vitest'
import { existsSync, rmSync } from 'node:fs'
import { getTestEnvironment, restoreConsole, restoreProcessExit } from './setup'

/**
 * Final teardown operations for CCJK v2.0 test suite
 * This runs after all tests and global teardown
 */
afterAll(async () => {
  console.log('🔧 CCJK v2.0 Test Suite - Final Teardown')

  try {
    // Restore original console methods
    restoreConsole()

    // Restore original process.exit
    restoreProcessExit()

    // Get test environment
    const testEnv = getTestEnvironment()

    // Final cleanup of any remaining test artifacts
    if (testEnv?.tempDir && existsSync(testEnv.tempDir)) {
      try {
        rmSync(testEnv.tempDir, { recursive: true, force: true })
        console.log(`✅ Final cleanup completed: ${testEnv.tempDir}`)
      } catch (error) {
        console.warn(`⚠️ Final cleanup warning: ${error}`)
      }
    }

    // Clear any remaining environment variables
    const testEnvVars = Object.keys(process.env).filter(key =>
      key.startsWith('CCJK_TEST_') ||
      key.startsWith('VITEST_') ||
      key === 'NODE_ENV' && process.env[key] === 'test'
    )

    testEnvVars.forEach(key => {
      delete process.env[key]
    })

    // Clear any global test state
    ;(globalThis as any).__originalConsole = undefined
    ;(globalThis as any).__originalExit = undefined

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    console.log('🎉 CCJK v2.0 Test Suite - Teardown Complete')
  } catch (error) {
    console.error('❌ Error during final teardown:', error)
  }
})

/**
 * Emergency cleanup function for critical failures
 */
export function emergencyCleanup() {
  try {
    const testEnv = getTestEnvironment()
    if (testEnv?.tempDir && existsSync(testEnv.tempDir)) {
      rmSync(testEnv.tempDir, { recursive: true, force: true })
    }
    restoreConsole()
    restoreProcessExit()
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error)
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Test suite interrupted - performing emergency cleanup')
  emergencyCleanup()
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Test suite terminated - performing emergency cleanup')
  emergencyCleanup()
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception in test suite:', error)
  emergencyCleanup()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection in test suite:', reason, promise)
  emergencyCleanup()
  process.exit(1)
})
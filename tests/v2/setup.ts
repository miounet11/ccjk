import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { resolve } from 'pathe'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'

// Test environment configuration
export interface TestEnvironment {
  tempDir: string
  originalCwd: string
  originalEnv: NodeJS.ProcessEnv
  testStartTime: number
}

// Global test environment
let testEnv: TestEnvironment

/**
 * Global test setup - runs once before all tests
 */
beforeAll(async () => {
  console.log('🚀 CCJK v2.0 Test Suite - Global Setup')

  testEnv = {
    tempDir: join(tmpdir(), `ccjk-v2-tests-${Date.now()}`),
    originalCwd: process.cwd(),
    originalEnv: { ...process.env },
    testStartTime: Date.now(),
  }

  // Create temporary test directory
  if (!existsSync(testEnv.tempDir)) {
    mkdirSync(testEnv.tempDir, { recursive: true })
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.CCJK_TEST_MODE = 'v2'
  process.env.CCJK_LOG_LEVEL = 'silent'
  process.env.CCJK_TEST_TEMP_DIR = testEnv.tempDir
  process.env.CCJK_DISABLE_ANALYTICS = 'true'
  process.env.CCJK_DISABLE_UPDATE_CHECK = 'true'
  process.env.CCJK_DISABLE_TELEMETRY = 'true'

  // Mock external dependencies
  await setupGlobalMocks()

  console.log(`✅ Test environment initialized at: ${testEnv.tempDir}`)
})

/**
 * Global test teardown - runs once after all tests
 */
afterAll(async () => {
  console.log('🧹 CCJK v2.0 Test Suite - Global Teardown')

  // Restore original environment
  process.env = testEnv.originalEnv
  process.chdir(testEnv.originalCwd)

  // Clean up temporary directory
  if (existsSync(testEnv.tempDir)) {
    try {
      rmSync(testEnv.tempDir, { recursive: true, force: true })
      console.log(`✅ Cleaned up test directory: ${testEnv.tempDir}`)
    } catch (error) {
      console.warn(`⚠️ Failed to clean up test directory: ${error}`)
    }
  }

  const duration = Date.now() - testEnv.testStartTime
  console.log(`🎯 Test suite completed in ${duration}ms`)
})

/**
 * Per-test setup - runs before each test
 */
beforeEach(async (context) => {
  // Create isolated test directory for each test
  const testId = context.task.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const testDir = join(testEnv.tempDir, testId)

  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true })
  }

  // Set test-specific environment
  process.env.CCJK_TEST_DIR = testDir
  process.env.CCJK_TEST_ID = testId

  // Change to test directory
  process.chdir(testDir)
})

/**
 * Per-test teardown - runs after each test
 */
afterEach(async () => {
  // Restore original working directory
  process.chdir(testEnv.originalCwd)

  // Clean up test-specific environment variables
  delete process.env.CCJK_TEST_DIR
  delete process.env.CCJK_TEST_ID
})

/**
 * Setup global mocks for external dependencies
 */
async function setupGlobalMocks() {
  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console }

  // Store original methods for restoration
  ;(globalThis as any).__originalConsole = originalConsole

  // Mock console methods
  console.log = vi.fn()
  console.info = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
  console.debug = vi.fn()

  // Mock process.exit to prevent tests from exiting
  const originalExit = process.exit
  ;(globalThis as any).__originalExit = originalExit
  process.exit = vi.fn() as any

  // Mock external command execution
  vi.mock('tinyexec', () => ({
    x: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  }))

  // Mock file system operations that might affect the real system
  vi.mock('trash', () => ({
    default: vi.fn().mockResolvedValue(undefined),
  }))

  // Mock inquirer for interactive prompts
  vi.mock('inquirer', () => ({
    default: {
      prompt: vi.fn().mockResolvedValue({}),
    },
  }))

  // Mock ora spinner
  vi.mock('ora', () => ({
    default: vi.fn(() => ({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      warn: vi.fn().mockReturnThis(),
      info: vi.fn().mockReturnThis(),
      text: '',
    })),
  }))
}

/**
 * Utility function to get test environment
 */
export function getTestEnvironment(): TestEnvironment {
  return testEnv
}

/**
 * Utility function to create a test-specific temporary directory
 */
export function createTestTempDir(name: string): string {
  const dir = join(testEnv.tempDir, name)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Utility function to restore console methods
 */
export function restoreConsole() {
  const originalConsole = (globalThis as any).__originalConsole
  if (originalConsole) {
    Object.assign(console, originalConsole)
  }
}

/**
 * Utility function to restore process.exit
 */
export function restoreProcessExit() {
  const originalExit = (globalThis as any).__originalExit
  if (originalExit) {
    process.exit = originalExit
  }
}

// Export test environment for use in tests
export { testEnv }
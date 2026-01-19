import { beforeAll } from 'vitest'

/**
 * Ensure console methods exist for all tests
 * Some test environments may not have all console methods
 */
if (typeof console.warn !== 'function') {
  console.warn = console.log
}
if (typeof console.error !== 'function') {
  console.error = console.log
}
if (typeof console.info !== 'function') {
  console.info = console.log
}
if (typeof console.debug !== 'function') {
  console.debug = console.log
}

/**
 * Global test setup for i18n initialization
 * This ensures all tests have access to initialized i18n system
 * Note: Some tests mock the i18n module, so we handle import errors gracefully
 */
beforeAll(async () => {
  try {
    // Dynamically import to avoid issues with mocked modules
    const { initI18n } = await import('../src/i18n')
    // Initialize i18n system for test environment with English locale
    await initI18n('en')
  }
  catch {
    // i18n module is mocked in this test file, skip initialization
  }
})

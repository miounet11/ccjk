/**
 * Vitest setup file for CCJK tests
 */

import { beforeEach, vi } from 'vitest'

// Setup before each test
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks()
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}

/**
 * Error Boundary Tests
 * Tests for centralized error handling system
 */

import ansis from 'ansis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiKeyError,
  CcjkError,
  ConfigError,
  ErrorBoundary,
  FileNotFoundError,
  NetworkError,
  ValidationError,
} from '../../src/core/error-boundary'

describe('errorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('ccjkError', () => {
    it('should create error with code and message', () => {
      const error = new CcjkError('TEST_ERROR', 'Test message')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Test message')
      expect(error.name).toBe('CcjkError')
    })

    it('should include context when provided', () => {
      const error = new CcjkError('TEST_ERROR', 'Test message', 'test-context')
      expect(error.context).toBe('test-context')
    })

    it('should include original error when provided', () => {
      const original = new Error('Original error')
      const error = new CcjkError('TEST_ERROR', 'Test message', 'test-context', original)
      expect(error.originalError).toBe(original)
    })

    it('should convert to JSON correctly', () => {
      const original = new Error('Original')
      const error = new CcjkError('TEST_CODE', 'Test msg', 'ctx', original)
      const json = error.toJSON()

      expect(json).toMatchObject({
        name: 'CcjkError',
        code: 'TEST_CODE',
        message: 'Test msg',
        context: 'ctx',
      })
      // originalError is serialized as just the message
      expect(json.originalError).toBe('Original')
      expect(json.stack).toBeDefined()
    })

    it('should convert to string correctly', () => {
      const error = new CcjkError('CODE', 'Message', 'context')
      expect(error.toString()).toBe('[CODE] Message (context: context)')
    })

    it('should toString without context', () => {
      const error = new CcjkError('CODE', 'Message')
      expect(error.toString()).toBe('[CODE] Message')
    })
  })

  describe('specific Error Types', () => {
    it('should create ConfigError', () => {
      const error = new ConfigError('Invalid config')
      expect(error.name).toBe('ConfigError')
      expect(error.code).toBe('CONFIG_INVALID')
    })

    it('should create ApiKeyError', () => {
      const error = new ApiKeyError('Missing API key')
      expect(error.name).toBe('ApiKeyError')
      expect(error.code).toBe('API_KEY_MISSING')
    })

    it('should create NetworkError', () => {
      const original = new Error('Connection failed')
      const error = new NetworkError('Network error', 'api-call', original)
      expect(error.name).toBe('NetworkError')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.originalError).toBe(original)
    })

    it('should create FileNotFoundError', () => {
      const error = new FileNotFoundError('/path/to/file')
      expect(error.name).toBe('FileNotFoundError')
      expect(error.code).toBe('FILE_NOT_FOUND')
      expect(error.message).toContain('/path/to/file')
    })

    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input')
      expect(error.name).toBe('ValidationError')
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('errorBoundary.handle', () => {
    it('should throw CcjkError as-is', () => {
      const error = new CcjkError('TEST', 'Test')
      expect(() => ErrorBoundary.handle(error, 'test')).toThrow(CcjkError)
      expect(() => ErrorBoundary.handle(error, 'test')).toThrow('Test')
    })

    it('should wrap standard Error in CcjkError', () => {
      const error = new Error('Standard error')
      expect(() => ErrorBoundary.handle(error, 'test-context')).toThrow(CcjkError)
      try {
        ErrorBoundary.handle(error, 'test-context')
      }
      catch (e) {
        expect(e).toBeInstanceOf(CcjkError)
        if (e instanceof CcjkError) {
          expect(e.code).toBe('UNKNOWN_ERROR')
          expect(e.message).toBe('Standard error')
          expect(e.context).toBe('test-context')
        }
      }
    })

    it('should wrap unknown type in CcjkError', () => {
      expect(() => ErrorBoundary.handle('string error', 'ctx')).toThrow(CcjkError)
      try {
        ErrorBoundary.handle('string error', 'ctx')
      }
      catch (e) {
        expect(e).toBeInstanceOf(CcjkError)
        if (e instanceof CcjkError) {
          expect(e.message).toBe('string error')
        }
      }
    })

    it('should log errors', () => {
      const error = new Error('Test')
      try {
        ErrorBoundary.handle(error, 'test')
      }
      catch {}
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('errorBoundary.wrap', () => {
    it('should wrap synchronous function and return result', () => {
      const result = ErrorBoundary.wrap(() => 42, 'test')
      expect(result).toBe(42)
    })

    it('should handle errors in sync function', () => {
      expect(() => {
        ErrorBoundary.wrap(() => {
          throw new Error('Sync error')
        }, 'sync-context')
      }).toThrow(CcjkError)
    })

    it('should preserve return values', () => {
      const obj = { value: 123 }
      const result = ErrorBoundary.wrap(() => obj, 'test')
      expect(result).toBe(obj)
    })
  })

  describe('errorBoundary.wrapAsync', () => {
    it('should wrap async function and return result', async () => {
      const result = await ErrorBoundary.wrapAsync(async () => 42, 'test')
      expect(result).toBe(42)
    })

    it('should handle errors in async function', async () => {
      await expect(async () => {
        await ErrorBoundary.wrapAsync(async () => {
          throw new Error('Async error')
        }, 'async-context')
      }).rejects.toThrow(CcjkError)
    })

    it('should preserve resolved values', async () => {
      const obj = { value: 123 }
      const result = await ErrorBoundary.wrapAsync(async () => obj, 'test')
      expect(result).toBe(obj)
    })
  })

  describe('errorBoundary.getSuggestion', () => {
    it('should return suggestion for CONFIG_INVALID', () => {
      const error = new ConfigError('Invalid config')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('doctor')
    })

    it('should return suggestion for API_KEY_MISSING', () => {
      const error = new ApiKeyError('Missing key')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('api')
    })

    it('should return suggestion for NETWORK_ERROR', () => {
      const error = new NetworkError('Network failed')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('internet')
    })

    it('should return suggestion for FILE_NOT_FOUND', () => {
      const error = new FileNotFoundError('/path')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('Verify')
    })

    it('should return suggestion for PARSE_ERROR', () => {
      const error = new CcjkError('PARSE_ERROR', 'Parse failed')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('fix')
    })

    it('should return suggestion for VALIDATION_ERROR', () => {
      const error = new ValidationError('Invalid input')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('Check')
    })

    it('should return suggestion for LOCK_FILE_EXISTS', () => {
      const error = new CcjkError('LOCK_FILE_EXISTS', 'Locked')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('unlock')
    })

    it('should return suggestion for UNKNOWN_ERROR', () => {
      const error = new CcjkError('RANDOM_CODE', 'Unknown')
      const suggestion = ErrorBoundary.getSuggestion(error)
      expect(suggestion).toContain('doctor')
    })
  })

  describe('errorBoundary.format', () => {
    it('should format error with all components', () => {
      const error = new CcjkError('TEST_CODE', 'Test message', 'test-context')
      const formatted = ErrorBoundary.format(error)
      expect(formatted).toContain('[TEST_CODE]')
      expect(formatted).toContain('Test message')
      expect(formatted).toContain('(test-context)')
      expect(formatted).toContain('💡')
    })

    it('should format error without context', () => {
      const error = new CcjkError('CODE', 'Message')
      const formatted = ErrorBoundary.format(error)
      expect(formatted).toContain('[CODE]')
      expect(formatted).toContain('Message')
      // Should not have context paren
      expect(formatted).not.toMatch(/\(.*\)/)
    })

    it('should include suggestion', () => {
      const error = new ApiKeyError('No key')
      const formatted = ErrorBoundary.format(error)
      expect(formatted).toContain('💡')
    })
  })

  describe('debug logging', () => {
    it('should log stack trace in debug mode', () => {
      const debugSpy = vi.spyOn(console, 'error')
      process.env.CCJK_DEBUG = '1'

      try {
        ErrorBoundary.handle(new Error('Test'), 'debug-test')
      }
      catch {}

      process.env.CCJK_DEBUG = ''

      const calls = debugSpy.mock.calls
      const hasStack = calls.some(call =>
        call.some(arg => typeof arg === 'string' && arg.includes('Stack:')),
      )
      expect(hasStack).toBe(true)

      debugSpy.mockRestore()
    })
  })
})

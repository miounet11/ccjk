/**
 * Hook context tests
 */

import type {
  ErrorContext,
  PostResponseContext,
  PreRequestContext,
  ProviderSwitchContext,
  SessionEndContext,
  SessionStartContext,
} from '../../../src/hooks/hook-context'
import { describe, expect, it } from 'vitest'
import {
  isErrorContext,
  isPostResponseContext,
  isPreRequestContext,
  isProviderSwitchContext,
  isSessionEndContext,
  isSessionStartContext,
} from '../../../src/hooks/hook-context'

describe('hook Context Type Guards', () => {
  describe('isPreRequestContext', () => {
    it('should identify PreRequestContext', () => {
      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      }

      expect(isPreRequestContext(context)).toBe(true)
    })

    it('should reject non-PreRequestContext', () => {
      const context: PostResponseContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        latency: 1000,
        success: true,
      }

      expect(isPreRequestContext(context)).toBe(false)
    })
  })

  describe('isPostResponseContext', () => {
    it('should identify PostResponseContext', () => {
      const context: PostResponseContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        latency: 1000,
        tokens: {
          input: 100,
          output: 200,
          total: 300,
        },
        success: true,
      }

      expect(isPostResponseContext(context)).toBe(true)
    })

    it('should reject non-PostResponseContext', () => {
      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      expect(isPostResponseContext(context)).toBe(false)
    })
  })

  describe('isProviderSwitchContext', () => {
    it('should identify ProviderSwitchContext', () => {
      const context: ProviderSwitchContext = {
        timestamp: Date.now(),
        fromProvider: 'anthropic',
        toProvider: 'openai',
        reason: 'Rate limit exceeded',
      }

      expect(isProviderSwitchContext(context)).toBe(true)
    })

    it('should reject non-ProviderSwitchContext', () => {
      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      expect(isProviderSwitchContext(context)).toBe(false)
    })
  })

  describe('isErrorContext', () => {
    it('should identify ErrorContext', () => {
      const context: ErrorContext = {
        timestamp: Date.now(),
        error: 'API request failed',
        errorType: 'NetworkError',
        provider: 'anthropic',
        retryCount: 2,
      }

      expect(isErrorContext(context)).toBe(true)
    })

    it('should reject non-ErrorContext', () => {
      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      expect(isErrorContext(context)).toBe(false)
    })
  })

  describe('isSessionStartContext', () => {
    it('should identify SessionStartContext', () => {
      const context: SessionStartContext = {
        timestamp: Date.now(),
        sessionId: 'session-123',
        provider: 'anthropic',
      }

      expect(isSessionStartContext(context)).toBe(true)
    })

    it('should reject SessionEndContext', () => {
      const context: SessionEndContext = {
        timestamp: Date.now(),
        sessionId: 'session-123',
        duration: 5000,
        reason: 'normal',
      }

      expect(isSessionStartContext(context)).toBe(false)
    })
  })

  describe('isSessionEndContext', () => {
    it('should identify SessionEndContext', () => {
      const context: SessionEndContext = {
        timestamp: Date.now(),
        sessionId: 'session-123',
        duration: 5000,
        totalRequests: 10,
        totalTokens: 1000,
        reason: 'normal',
      }

      expect(isSessionEndContext(context)).toBe(true)
    })

    it('should reject SessionStartContext', () => {
      const context: SessionStartContext = {
        timestamp: Date.now(),
        sessionId: 'session-123',
        provider: 'anthropic',
      }

      expect(isSessionEndContext(context)).toBe(false)
    })
  })
})

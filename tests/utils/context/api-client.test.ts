/**
 * API Client Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnthropicApiClient, createApiClient } from '../../../src/utils/context/api-client'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

describe('api-client', () => {
  let client: AnthropicApiClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = createApiClient({
      apiKey: 'test-api-key',
    })
  })

  describe('createApiClient', () => {
    it('should create client with default config', () => {
      const defaultClient = createApiClient()
      expect(defaultClient).toBeInstanceOf(AnthropicApiClient)
    })

    it('should create client with custom config', () => {
      const customClient = createApiClient({
        apiKey: 'custom-key',
        model: 'claude-3-opus-20240229',
        maxTokens: 2048,
        temperature: 0.5,
      })

      expect(customClient).toBeInstanceOf(AnthropicApiClient)
      const config = customClient.getConfig()
      expect(config.apiKey).toBe('custom-key')
      expect(config.model).toBe('claude-3-opus-20240229')
      expect(config.maxTokens).toBe(2048)
      expect(config.temperature).toBe(0.5)
    })
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
      })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      const response = await client.sendMessage('Test prompt')

      expect(response).toBe('Test response')
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: 'Test prompt',
          },
        ],
      })
    })

    it('should use custom options', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
      })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      await client.sendMessage('Test prompt', {
        model: 'claude-3-opus-20240229',
        maxTokens: 2048,
        temperature: 0.7,
      })

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: 'Test prompt',
          },
        ],
      })
    })

    it('should throw error for unexpected response type', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'image', data: 'base64...' }],
      })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      await expect(client.sendMessage('Test prompt')).rejects.toThrow(
        'Unexpected response type from Claude API',
      )
    })
  })

  describe('retry logic', () => {
    it('should retry on network error', async () => {
      const mockCreate = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success after retry' }],
        })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      const response = await client.sendMessage('Test prompt')

      expect(response).toBe('Success after retry')
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should retry on rate limit error', async () => {
      const mockCreate = vi.fn()
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success after retry' }],
        })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      const response = await client.sendMessage('Test prompt')

      expect(response).toBe('Success after retry')
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should retry on server error', async () => {
      const mockCreate = vi.fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Success after retry' }],
        })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      const response = await client.sendMessage('Test prompt')

      expect(response).toBe('Success after retry')
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should not retry on client error', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ status: 400 })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      await expect(client.sendMessage('Test prompt')).rejects.toThrow()
      expect(mockCreate).toHaveBeenCalledTimes(1)
    })

    it('should stop after max retries', async () => {
      const mockCreate = vi.fn().mockRejectedValue({ status: 500 })

      // @ts-expect-error - accessing private property for testing
      client.client.messages.create = mockCreate

      await expect(client.sendMessage('Test prompt')).rejects.toThrow()
      expect(mockCreate).toHaveBeenCalledTimes(3) // Initial + 2 retries (default maxRetries is 3)
    })
  })

  describe('updateConfig', () => {
    it('should update API key', () => {
      client.updateConfig({ apiKey: 'new-key' })
      const config = client.getConfig()
      expect(config.apiKey).toBe('new-key')
    })

    it('should update model', () => {
      client.updateConfig({ model: 'claude-3-opus-20240229' })
      const config = client.getConfig()
      expect(config.model).toBe('claude-3-opus-20240229')
    })

    it('should update multiple settings', () => {
      client.updateConfig({
        maxTokens: 2048,
        temperature: 0.7,
      })

      const config = client.getConfig()
      expect(config.maxTokens).toBe(2048)
      expect(config.temperature).toBe(0.7)
    })

    it('should update retry config', () => {
      client.updateConfig({
        retry: {
          maxRetries: 5,
          initialDelay: 2000,
          maxDelay: 20000,
          backoffMultiplier: 3,
        },
      })

      const config = client.getConfig()
      expect(config.retry.maxRetries).toBe(5)
      expect(config.retry.initialDelay).toBe(2000)
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = client.getConfig()

      expect(config).toHaveProperty('apiKey')
      expect(config).toHaveProperty('model')
      expect(config).toHaveProperty('maxTokens')
      expect(config).toHaveProperty('temperature')
      expect(config).toHaveProperty('retry')
    })

    it('should return copy of config', () => {
      const config1 = client.getConfig()
      const config2 = client.getConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })
})

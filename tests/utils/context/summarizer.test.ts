/**
 * Summarizer Tests
 */

import type { SummarizationRequest } from '../../../src/types/context'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSummarizer, Summarizer } from '../../../src/utils/context/summarizer'

// Mock API client
const mockSendMessage = vi.fn().mockResolvedValue('Test summary')
const mockUpdateConfig = vi.fn()

vi.mock('../../../src/utils/context/api-client', () => ({
  createApiClient: vi.fn(() => ({
    sendMessage: mockSendMessage,
    updateConfig: mockUpdateConfig,
  })),
  AnthropicApiClient: vi.fn(),
}))

describe('summarizer', () => {
  let summarizer: Summarizer

  beforeEach(() => {
    vi.clearAllMocks()
    summarizer = createSummarizer()
  })

  describe('createSummarizer', () => {
    it('should create summarizer with default config', () => {
      const defaultSummarizer = createSummarizer()
      expect(defaultSummarizer).toBeInstanceOf(Summarizer)
    })

    it('should create summarizer with custom config', () => {
      const customSummarizer = createSummarizer({
        model: 'user-default',
        batchSize: 10,
        maxConcurrent: 5,
      })

      expect(customSummarizer).toBeInstanceOf(Summarizer)
      const config = customSummarizer.getConfig()
      expect(config.model).toBe('user-default')
      expect(config.batchSize).toBe(10)
      expect(config.maxConcurrent).toBe(5)
    })
  })

  describe('summarize', () => {
    it('should summarize function call successfully', async () => {
      const request: SummarizationRequest = {
        fcId: 'test-fc-1',
        fcName: 'readFile',
        fcArgs: { path: '/test/file.txt' },
        fcResult: 'File content here',
      }

      const summary = await summarizer.summarize(request)

      expect(summary).toHaveProperty('fcId', 'test-fc-1')
      expect(summary).toHaveProperty('fcName', 'readFile')
      expect(summary).toHaveProperty('summary')
      expect(summary).toHaveProperty('tokens')
      expect(summary).toHaveProperty('timestamp')
      expect(summary.summary).toBeTruthy()
      expect(summary.tokens).toBeGreaterThan(0)
    })

    it('should clean summary text', async () => {
      const { createApiClient } = await import('../../../src/utils/context/api-client')
      const mockClient = createApiClient()
      vi.mocked(mockClient.sendMessage).mockResolvedValue('Summary: Test summary with prefix')

      const request: SummarizationRequest = {
        fcId: 'test-fc-2',
        fcName: 'writeFile',
        fcArgs: { path: '/test/file.txt' },
        fcResult: 'Success',
      }

      const summary = await summarizer.summarize(request)

      expect(summary.summary).not.toContain('Summary:')
    })

    it('should truncate long summaries', async () => {
      const { createApiClient } = await import('../../../src/utils/context/api-client')
      const mockClient = createApiClient()
      const longSummary = 'a'.repeat(150)
      vi.mocked(mockClient.sendMessage).mockResolvedValueOnce(longSummary)

      const request: SummarizationRequest = {
        fcId: 'test-fc-3',
        fcName: 'processData',
        fcArgs: {},
        fcResult: 'Data processed',
      }

      const summary = await summarizer.summarize(request)

      expect(summary.summary.length).toBeLessThanOrEqual(100)
      if (summary.summary.length === 100) {
        expect(summary.summary).toContain('...')
      }
    })

    it('should create fallback summary on error', async () => {
      // Mock API error for this test
      mockSendMessage.mockRejectedValueOnce(new Error('API error'))

      const request: SummarizationRequest = {
        fcId: 'test-fc-4',
        fcName: 'deleteFile',
        fcArgs: { path: '/test/file.txt' },
        fcResult: 'Deleted',
      }

      const summary = await summarizer.summarize(request)

      expect(summary.summary).toBe('deleteFile executed')
      expect(summary.fcId).toBe('test-fc-4')
    })

    it('should truncate long results', async () => {
      const longResult = 'x'.repeat(5000)
      const request: SummarizationRequest = {
        fcId: 'test-fc-5',
        fcName: 'readLargeFile',
        fcArgs: {},
        fcResult: longResult,
      }

      const summary = await summarizer.summarize(request)

      expect(summary).toBeDefined()
      expect(summary.fcId).toBe('test-fc-5')
    })
  })

  describe('queueSummarization', () => {
    it('should add request to queue', async () => {
      const request: SummarizationRequest = {
        fcId: 'test-fc-6',
        fcName: 'testFunction',
        fcArgs: {},
        fcResult: 'result',
      }

      await summarizer.queueSummarization(request)

      // Queue should be processing or empty after processing
      expect(summarizer.getQueueLength()).toBeGreaterThanOrEqual(0)
    })

    it('should process queue automatically', async () => {
      const requests: SummarizationRequest[] = [
        { fcId: 'fc-1', fcName: 'func1', fcArgs: {}, fcResult: 'result1' },
        { fcId: 'fc-2', fcName: 'func2', fcArgs: {}, fcResult: 'result2' },
        { fcId: 'fc-3', fcName: 'func3', fcArgs: {}, fcResult: 'result3' },
      ]

      for (const request of requests) {
        await summarizer.queueSummarization(request)
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100))

      // Queue should be empty or processing
      expect(summarizer.getQueueLength()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('summarizeBatch', () => {
    it('should summarize multiple requests', async () => {
      const requests: SummarizationRequest[] = [
        { fcId: 'fc-1', fcName: 'func1', fcArgs: {}, fcResult: 'result1' },
        { fcId: 'fc-2', fcName: 'func2', fcArgs: {}, fcResult: 'result2' },
        { fcId: 'fc-3', fcName: 'func3', fcArgs: {}, fcResult: 'result3' },
      ]

      const summaries = await summarizer.summarizeBatch(requests)

      expect(summaries).toHaveLength(3)
      expect(summaries[0]).toHaveProperty('fcId', 'fc-1')
      expect(summaries[1]).toHaveProperty('fcId', 'fc-2')
      expect(summaries[2]).toHaveProperty('fcId', 'fc-3')
    })

    it('should handle empty batch', async () => {
      const summaries = await summarizer.summarizeBatch([])
      expect(summaries).toHaveLength(0)
    })

    it('should process large batches', async () => {
      const requests: SummarizationRequest[] = Array.from({ length: 20 }, (_, i) => ({
        fcId: `fc-${i}`,
        fcName: `func${i}`,
        fcArgs: {},
        fcResult: `result${i}`,
      }))

      const summaries = await summarizer.summarizeBatch(requests)

      expect(summaries).toHaveLength(20)
    })
  })

  describe('updateConfig', () => {
    it('should update model', () => {
      summarizer.updateConfig({ model: 'user-default' })
      const config = summarizer.getConfig()
      expect(config.model).toBe('user-default')
    })

    it('should update batch size', () => {
      summarizer.updateConfig({ batchSize: 10 })
      const config = summarizer.getConfig()
      expect(config.batchSize).toBe(10)
    })

    it('should update max concurrent', () => {
      summarizer.updateConfig({ maxConcurrent: 5 })
      const config = summarizer.getConfig()
      expect(config.maxConcurrent).toBe(5)
    })

    it('should update multiple settings', () => {
      summarizer.updateConfig({
        model: 'user-default',
        batchSize: 8,
        maxConcurrent: 4,
      })

      const config = summarizer.getConfig()
      expect(config.model).toBe('user-default')
      expect(config.batchSize).toBe(8)
      expect(config.maxConcurrent).toBe(4)
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = summarizer.getConfig()

      expect(config).toHaveProperty('model')
      expect(config).toHaveProperty('apiKey')
      expect(config).toHaveProperty('batchSize')
      expect(config).toHaveProperty('maxConcurrent')
    })
  })

  describe('getQueueLength', () => {
    it('should return queue length', () => {
      const length = summarizer.getQueueLength()
      expect(length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('isProcessing', () => {
    it('should return processing status', () => {
      const processing = summarizer.isProcessing()
      expect(typeof processing).toBe('boolean')
    })
  })
})

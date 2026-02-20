/**
 * Compression Quality Tests
 * Verifies that compression preserves key information
 */

import { SemanticCompression } from '../compression/algorithms/semantic-compression'

describe('compression Quality', () => {
  describe('rule-based Compression', () => {
    let compressor: SemanticCompression

    beforeEach(() => {
      compressor = new SemanticCompression(0.5) // Balanced aggressiveness
    })

    it('should preserve code structure', () => {
      const code = `
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function processOrder(order: Order): void {
  const total = calculateTotal(order.items);
  order.total = total;
  order.status = 'processed';
}
      `.trim()

      const result = compressor.compress(code)

      // Should preserve function names
      expect(result.compressed).toContain('calculateTotal')
      expect(result.compressed).toContain('processOrder')

      // Should preserve key logic
      expect(result.compressed).toContain('reduce')
      expect(result.compressed).toContain('total')
    })

    it('should preserve key decisions', () => {
      const context = `
User: Should we use REST or GraphQL for the API?

Assistant: I recommend using GraphQL because:
1. You need flexible queries
2. Multiple clients with different data needs
3. Real-time updates are required

Decision: Use GraphQL with Apollo Server
      `.trim()

      const result = compressor.compress(context)

      // Should preserve the decision
      expect(result.compressed.toLowerCase()).toContain('graphql')
      expect(result.compressed.toLowerCase()).toContain('apollo')
    })

    it('should preserve error messages', () => {
      const context = `
Error: Cannot connect to database
Stack trace:
  at DatabaseConnection.connect (db.ts:45)
  at Server.start (server.ts:12)

Cause: Connection timeout after 5000ms
Solution: Increase timeout or check network
      `.trim()

      const result = compressor.compress(context)

      // Should preserve error type and solution
      expect(result.compressed.toLowerCase()).toMatch(/error|cannot/)
      expect(result.compressed.toLowerCase()).toMatch(/timeout|network/)
    })

    it('should preserve file paths', () => {
      const context = `
Modified files:
- src/components/Button.tsx
- src/utils/helpers.ts
- tests/Button.test.tsx

Created files:
- src/hooks/useAuth.ts
      `.trim()

      const result = compressor.compress(context)

      // Should preserve at least some file paths
      const hasFilePath = /\w+\.tsx?/.test(result.compressed)
      expect(hasFilePath).toBe(true)
    })

    it('should remove redundant whitespace', () => {
      const text = 'Hello    world\n\n\n\nTest    content'
      const result = compressor.compress(text)

      // Should not have multiple spaces
      expect(result.compressed).not.toMatch(/  +/)
      // Should not have more than 2 consecutive newlines
      expect(result.compressed).not.toMatch(/\n{3,}/)
    })

    it('should compress common phrases', () => {
      const text = 'In order to complete the task, we need to verify the implementation.'
      const result = compressor.compress(text)

      // Should compress "in order to" to "to"
      expect(result.compressed.toLowerCase()).not.toContain('in order to')
      expect(result.compressed.toLowerCase()).toContain('to')
    })

    it('should achieve measurable compression', () => {
      const text = `
This is a test document with repeated content.
This is a test document with repeated content.
We need to verify the compression functionality.
We need to verify the compression functionality.
The function should handle various scenarios.
The function should handle various scenarios.
In order to complete this task, we need to verify the implementation.
Due to the fact that we have redundant content, compression is needed.
      `.trim()

      const result = compressor.compress(text)

      // Should achieve some compression (even if small)
      const compressionRatio = (result.originalSize - result.compressedSize) / result.originalSize
      expect(compressionRatio).toBeGreaterThan(0)

      // Should not be too aggressive (preserve at least 30% of content)
      expect(compressionRatio).toBeLessThan(0.7)
    })

    it('should handle empty text', () => {
      const result = compressor.compress('')

      expect(result.compressed).toBe('')
      expect(result.originalSize).toBe(0)
      expect(result.compressedSize).toBe(0)
    })

    it('should handle very short text', () => {
      const text = 'Hello'
      const result = compressor.compress(text)

      // Should not break short text
      expect(result.compressed).toBeTruthy()
      expect(result.compressed.length).toBeGreaterThan(0)
    })
  })

  describe('aggressiveness Levels', () => {
    it('conservative should preserve more content', () => {
      const text = `
This is a test document with some content that should be preserved.
We need to verify the compression functionality works correctly.
The function should handle various scenarios and edge cases.
In order to complete this task, we need proper implementation.
Due to the fact that we have verbose content, compression helps.
      `.trim()

      const conservative = new SemanticCompression(0.2)
      const aggressive = new SemanticCompression(0.8)

      const conservativeResult = conservative.compress(text)
      const aggressiveResult = aggressive.compress(text)

      // Conservative should preserve more (or at least equal)
      expect(conservativeResult.compressedSize).toBeGreaterThanOrEqual(aggressiveResult.compressedSize)
    })

    it('aggressive should achieve higher compression', () => {
      const text = `
function example() {
  const variable = 'test';
  const parameter = 'value';
  return variable + parameter;
}
      `.trim()

      const conservative = new SemanticCompression(0.2)
      const aggressive = new SemanticCompression(0.8)

      const conservativeResult = conservative.compress(text)
      const aggressiveResult = aggressive.compress(text)

      // Aggressive should compress more
      const conservativeRatio = (conservativeResult.originalSize - conservativeResult.compressedSize) / conservativeResult.originalSize
      const aggressiveRatio = (aggressiveResult.originalSize - aggressiveResult.compressedSize) / aggressiveResult.originalSize

      expect(aggressiveRatio).toBeGreaterThan(conservativeRatio)
    })
  })

  describe('decompression', () => {
    it('should decompress rule-based compression', () => {
      const text = 'This is a test with function and parameter values.'
      const compressor = new SemanticCompression(0.5)

      const compressed = compressor.compress(text)
      const decompressed = compressor.decompress(compressed.compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.decompressed).toBeTruthy()
    })

    it('should handle LLM-compressed content gracefully', () => {
      const compressor = new SemanticCompression(0.5)
      const llmCompressed = 'LLM-based compression applied: Summary of content'

      const result = compressor.decompress(llmCompressed)

      // Should not fail, but return as-is
      expect(result.success).toBe(true)
      expect(result.decompressed).toBe(llmCompressed)
    })
  })

  describe('LLM-based Compression', () => {
    it('should use LLM compression when API client is provided', async () => {
      // Mock API client
      const mockApiClient = {
        sendMessage: jest.fn().mockResolvedValue('Compressed summary of the content'),
        updateConfig: jest.fn(),
        getConfig: jest.fn(),
      }

      const compressor = new SemanticCompression(0.5, mockApiClient as any)
      const text = 'This is a long text that should be compressed using LLM-based summarization.'

      const result = await compressor.compressAsync(text)

      expect(mockApiClient.sendMessage).toHaveBeenCalled()
      expect(result.compressed).toBeTruthy()
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it('should fall back to rule-based compression when API fails', async () => {
      // Mock API client that fails
      const mockApiClient = {
        sendMessage: jest.fn().mockRejectedValue(new Error('API error')),
        updateConfig: jest.fn(),
        getConfig: jest.fn(),
      }

      const compressor = new SemanticCompression(0.5, mockApiClient as any)
      const text = 'This is a test text for fallback compression.'

      const result = await compressor.compressAsync(text)

      // Should still return a result (fallback to rule-based)
      expect(result.compressed).toBeTruthy()
      expect(result.compressedSize).toBeGreaterThan(0)
    })

    it('should use rule-based compression for small texts', async () => {
      const mockApiClient = {
        sendMessage: jest.fn().mockResolvedValue('Compressed'),
        updateConfig: jest.fn(),
        getConfig: jest.fn(),
      }

      const compressor = new SemanticCompression(0.5, mockApiClient as any)
      const text = 'Short text' // Less than 500 chars

      const result = await compressor.compressAsync(text)

      // Should not call API for small texts
      expect(mockApiClient.sendMessage).not.toHaveBeenCalled()
    })
  })

  describe('information Preservation', () => {
    it('should preserve numbers and metrics', () => {
      const text = 'The API response time is 250ms with 99.9% uptime and 1000 requests per second.'
      const compressor = new SemanticCompression(0.5)

      const result = compressor.compress(text)

      // Should preserve key numbers
      expect(result.compressed).toMatch(/250|99\.9|1000/)
    })

    it('should preserve technical terms', () => {
      const text = 'Configure the PostgreSQL database with Redis cache and Elasticsearch indexing.'
      const compressor = new SemanticCompression(0.5)

      const result = compressor.compress(text)

      // Should preserve technology names
      const hasTechTerms = /postgres|redis|elasticsearch/i.test(result.compressed)
      expect(hasTechTerms).toBe(true)
    })

    it('should preserve URLs and paths', () => {
      const text = 'Visit https://example.com/api/v1/users for documentation at /docs/api.md'
      const compressor = new SemanticCompression(0.5)

      const result = compressor.compress(text)

      // Should preserve URL structure
      const hasUrl = /https?:\/\/|\w+\.com|\/\w+/.test(result.compressed)
      expect(hasUrl).toBe(true)
    })
  })
})

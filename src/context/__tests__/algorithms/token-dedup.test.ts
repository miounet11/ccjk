/**
 * Tests for Token Deduplication algorithm
 */

import { TokenDeduplication } from '../compression/algorithms/token-dedup'

describe('tokenDeduplication', () => {
  let deduplicator: TokenDeduplication

  beforeEach(() => {
    deduplicator = new TokenDeduplication(100, 3)
  })

  describe('compress', () => {
    it('should remove duplicate tokens within window', () => {
      const text = 'hello world hello test hello'
      const result = deduplicator.compress(text)

      expect(result.duplicatesRemoved).toBeGreaterThan(0)
      expect(result.compressedTokenCount).toBeLessThan(result.originalTokenCount)
    })

    it('should handle text without duplicates', () => {
      const text = 'unique words every time different'
      const result = deduplicator.compress(text)

      expect(result.duplicatesRemoved).toBe(0)
    })

    it('should preserve token order', () => {
      const text = 'first second third'
      const result = deduplicator.compress(text)

      expect(result.compressed).toContain('first')
      expect(result.compressed).toContain('second')
      expect(result.compressed).toContain('third')
    })

    it('should handle punctuation correctly', () => {
      const text = 'Hello, world! Hello, test!'
      const result = deduplicator.compress(text)

      expect(result.compressed).toBeDefined()
      expect(result.compressedTokenCount).toBeLessThan(result.originalTokenCount)
    })

    it('should remove redundant sequences', () => {
      const text = 'one two three one two three'
      const result = deduplicator.compress(text)

      expect(result.duplicatesRemoved).toBeGreaterThan(0)
    })
  })

  describe('decompress', () => {
    it('should return compressed text as-is', () => {
      const text = 'hello world test'
      const compressed = deduplicator.compress(text)
      const decompressed = deduplicator.decompress(compressed.compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.decompressed).toBe(compressed.compressed)
    })
  })

  describe('tokenization', () => {
    it('should handle empty text', () => {
      const result = deduplicator.compress('')

      expect(result.originalTokenCount).toBe(0)
      expect(result.compressedTokenCount).toBe(0)
    })

    it('should handle whitespace-only text', () => {
      const result = deduplicator.compress('   \n\t  ')

      expect(result.compressed).toBeDefined()
    })

    it('should handle special characters', () => {
      const text = '@#$% test @#$%'
      const result = deduplicator.compress(text)

      expect(result.compressed).toBeDefined()
    })
  })

  describe('window size', () => {
    it('should respect window size for deduplication', () => {
      const smallWindow = new TokenDeduplication(5, 3)
      const text = `word ${'filler '.repeat(10)}word`
      const result = smallWindow.compress(text)

      // With small window, distant duplicates should not be removed
      expect(result.compressed).toContain('word')
    })

    it('should handle large window efficiently', () => {
      const largeWindow = new TokenDeduplication(1000, 3)
      const text = 'test '.repeat(100)
      const result = largeWindow.compress(text)

      expect(result.duplicatesRemoved).toBeGreaterThan(50)
    })
  })

  describe('estimateTokenCount', () => {
    it('should estimate token count', () => {
      const text = 'Hello world test'
      const estimate = deduplicator.estimateTokenCount(text)

      expect(estimate).toBeGreaterThan(0)
      expect(estimate).toBeLessThan(text.length)
    })

    it('should handle empty text', () => {
      const estimate = deduplicator.estimateTokenCount('')

      expect(estimate).toBe(0)
    })
  })
})

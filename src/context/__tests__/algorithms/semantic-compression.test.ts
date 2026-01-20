/**
 * Tests for Semantic Compression algorithm
 */

import { SemanticCompression } from '../compression/algorithms/semantic-compression'

describe('semanticCompression', () => {
  describe('conservative compression', () => {
    let compressor: SemanticCompression

    beforeEach(() => {
      compressor = new SemanticCompression(0.2)
    })

    it('should remove redundant whitespace', () => {
      const text = 'Hello    world   with    spaces'
      const result = compressor.compress(text)

      expect(result.compressed).not.toContain('    ')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it('should compress common phrases', () => {
      const text = 'In order to test this, we need to verify'
      const result = compressor.compress(text)

      expect(result.compressed).toContain('to test')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it('should preserve important content', () => {
      const text = 'Important data: 12345'
      const result = compressor.compress(text)

      expect(result.compressed).toContain('12345')
    })
  })

  describe('balanced compression', () => {
    let compressor: SemanticCompression

    beforeEach(() => {
      compressor = new SemanticCompression(0.5)
    })

    it('should abbreviate common terms', () => {
      const text = 'function parameter configuration'
      const result = compressor.compress(text)

      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it('should remove filler words', () => {
      const text = 'This is actually very really quite simple'
      const result = compressor.compress(text)

      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })
  })

  describe('aggressive compression', () => {
    let compressor: SemanticCompression

    beforeEach(() => {
      compressor = new SemanticCompression(0.8)
    })

    it('should achieve high compression ratio', () => {
      const text = `
        This is a test. This is a test.
        We need to verify this functionality.
        We need to verify this functionality.
      `
      const result = compressor.compress(text)

      const ratio = 1 - (result.compressedSize / result.originalSize)
      expect(ratio).toBeGreaterThan(0.3)
    })

    it('should remove redundant sentences', () => {
      const text = 'Hello world. Hello world. Goodbye world.'
      const result = compressor.compress(text)

      expect(result.removedInfo.length).toBeGreaterThan(0)
    })
  })

  describe('decompress', () => {
    it('should restore abbreviated terms', () => {
      const compressor = new SemanticCompression(0.5)
      const text = 'function parameter'
      const compressed = compressor.compress(text)
      const decompressed = compressor.decompress(compressed.compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.decompressed).toContain('function')
    })

    it('should handle empty text', () => {
      const compressor = new SemanticCompression(0.5)
      const result = compressor.decompress('')

      expect(result.success).toBe(true)
    })
  })
})

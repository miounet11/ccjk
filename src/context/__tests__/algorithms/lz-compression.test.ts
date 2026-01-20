/**
 * Tests for LZ Compression algorithm
 */

import { LZCompression } from '../compression/algorithms/lz-compression'

describe('lZCompression', () => {
  let compressor: LZCompression

  beforeEach(() => {
    compressor = new LZCompression()
  })

  describe('compress', () => {
    it('should compress text with repeating patterns', () => {
      const text = 'Hello world! Hello world! Hello world!'
      const result = compressor.compress(text)

      expect(result.compressed).toBeDefined()
      expect(result.compressedSize).toBeLessThan(result.originalSize)
      expect(result.dictionary.size).toBeGreaterThan(0)
    })

    it('should handle text without repeating patterns', () => {
      const text = 'abcdefghijklmnopqrstuvwxyz'
      const result = compressor.compress(text)

      expect(result.compressed).toBeDefined()
      // May not compress much without patterns
      expect(result.originalSize).toBe(text.length)
    })

    it('should handle empty text', () => {
      const text = ''
      const result = compressor.compress(text)

      expect(result.compressed).toBeDefined()
      expect(result.originalSize).toBe(0)
    })

    it('should compress code with repeated function calls', () => {
      const text = `
        function test() {
          console.log('test');
          console.log('test');
          console.log('test');
        }
      `
      const result = compressor.compress(text)

      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it('should handle special characters', () => {
      const text = 'Test @#$% Test @#$% Test @#$%'
      const result = compressor.compress(text)

      expect(result.compressed).toBeDefined()
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })
  })

  describe('decompress', () => {
    it('should decompress to original text', () => {
      const original = 'Hello world! Hello world! Hello world!'
      const compressed = compressor.compress(original)
      const decompressed = compressor.decompress(compressed.compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.decompressed).toBe(original)
    })

    it('should handle empty compressed text', () => {
      const result = compressor.decompress('')

      expect(result.success).toBe(true)
      expect(result.decompressed).toBe('')
    })

    it('should preserve special characters', () => {
      const original = 'Test @#$% Test @#$% Test @#$%'
      const compressed = compressor.compress(original)
      const decompressed = compressor.decompress(compressed.compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.decompressed).toBe(original)
    })

    it('should handle complex nested patterns', () => {
      const original = 'abc abc def def abc abc def def'
      const compressed = compressor.compress(original)
      const decompressed = compressor.decompress(compressed.compressed)

      expect(decompressed.success).toBe(true)
      expect(decompressed.decompressed).toBe(original)
    })
  })

  describe('compression ratio', () => {
    it('should achieve good compression on repetitive text', () => {
      const text = 'repeat '.repeat(100)
      const result = compressor.compress(text)

      const ratio = 1 - (result.compressedSize / result.originalSize)
      expect(ratio).toBeGreaterThan(0.5) // At least 50% compression
    })

    it('should handle large text efficiently', () => {
      const text = 'Lorem ipsum dolor sit amet, '.repeat(50)
      const result = compressor.compress(text)

      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })
  })
})

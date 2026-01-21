/**
 * Stream Processor Tests
 * Tests for large file handling utilities
 */

import { createReadStream, promises as fs } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  batchProcessFiles,
  getFileSize,
  isLargeFile,
  processLargeFile,
  streamJSON,
  streamWriteJSON,
} from '../../src/utils/stream-processor'

// Mock node modules
vi.mock('node:fs', () => ({
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
  promises: {
    stat: vi.fn(),
    writeFile: vi.fn(),
  },
}))

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn(),
}))

describe('streamProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('processLargeFile', () => {
    it('should process file in chunks', async () => {
      const mockStream = {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(Buffer.from('test data'))
          }
          if (event === 'end') {
            handler()
          }
          return mockStream
        }),
      }

      vi.mocked(createReadStream).mockReturnValue(mockStream as any)

      const processor = vi.fn()
      await processLargeFile('/test/file.txt', processor)

      expect(processor).toHaveBeenCalled()
    })

    it('should handle multiple chunks', async () => {
      const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')]
      let chunkIndex = 0

      const mockStream = {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(chunks[chunkIndex++])
          }
          if (event === 'end') {
            handler()
          }
          return mockStream
        }),
      }

      vi.mocked(createReadStream).mockReturnValue(mockStream as any)

      const processor = vi.fn()
      await processLargeFile('/test/file.txt', processor, { chunkSize: 100 })

      expect(processor).toHaveBeenCalled()
    })
  })

  describe('streamJSON', () => {
    it('should parse JSON from file', async () => {
      vi.mocked(pipeline).mockResolvedValue(undefined)

      await streamJSON('/test/config.json')
      expect(pipeline).toHaveBeenCalled()
    })
  })

  describe('streamWriteJSON', () => {
    it('should write JSON to file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue()

      await streamWriteJSON('/test/output.json', { key: 'value' })

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/output.json',
        JSON.stringify({ key: 'value' }, null, 2),
        'utf8',
      )
    })
  })

  describe('getFileSize', () => {
    it('should return file size', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)

      const size = await getFileSize('/test/file.txt')
      expect(size).toBe(1024)
    })

    it('should return 0 on error', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'))

      const size = await getFileSize('/test/nonexistent.txt')
      expect(size).toBe(0)
    })
  })

  describe('batchProcessFiles', () => {
    it('should process files with concurrency limit', async () => {
      const files = ['/test/file1.txt', '/test/file2.txt']
      const processor = vi.fn(async (file: string) => `ok-${file}`)

      const resultMap = await batchProcessFiles(files, processor, 2)

      expect(resultMap.size).toBe(2)
      expect(processor).toHaveBeenCalledTimes(2)
    })

    it('should handle processor errors gracefully', async () => {
      const files = ['/test/file1.txt', '/test/file2.txt']

      const processor = vi.fn(async (file: string) => {
        if (file === '/test/file2.txt') {
          throw new Error('Failed')
        }
        return `ok-${file}`
      })

      const resultMap = await batchProcessFiles(files, processor, 2)

      expect(resultMap.get('/test/file1.txt')).toBe('ok-/test/file1.txt')
      expect(resultMap.get('/test/file2.txt')).toBeNull()
    })
  })

  describe('isLargeFile', () => {
    it('should return true for files above threshold', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 2 * 1024 * 1024 } as any)

      const isLarge = await isLargeFile('/test/large.txt')
      expect(isLarge).toBe(true)
    })

    it('should return false for files below threshold', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 500 * 1024 } as any)

      const isLarge = await isLargeFile('/test/small.txt')
      expect(isLarge).toBe(false)
    })

    it('should use custom threshold', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any)

      const isLarge = await isLargeFile('/test/file.txt', 10 * 1024 * 1024)
      expect(isLarge).toBe(false)
    })
  })
})

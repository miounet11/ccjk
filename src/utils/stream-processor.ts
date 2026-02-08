/**
 * Stream Processor - Handle large files efficiently
 *
 * Provides utilities for:
 * - Streaming large JSON files
 * - Processing large files in chunks
 * - Memory-efficient file operations
 */

import { createReadStream, promises as fs } from 'node:fs'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

/**
 * Chunk processing options
 */
export interface ChunkProcessorOptions {
  chunkSize?: number // Default: 1MB
  encoding?: BufferEncoding // Default: 'utf8'
  paused?: boolean
}

/**
 * Stream processor options
 */
export interface StreamProcessorOptions extends ChunkProcessorOptions {
  objectMode?: boolean // Default: false
  destroy?: boolean // Default: true
}

const DEFAULT_CHUNK_SIZE = 1024 * 1024 // 1MB

/**
 * Process a large file in chunks
 */
export async function processLargeFile(
  filePath: string,
  processor: (chunk: Buffer, index: number) => void | Promise<void>,
  options: ChunkProcessorOptions = {},
): Promise<void> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, encoding = 'utf8' } = options

  return new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: encoding as BufferEncoding })
    const chunks: Buffer[] = []
    let chunkIndex = 0

    stream.on('data', (chunk: string | Buffer) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk, encoding as BufferEncoding) : chunk
      chunks.push(buffer)

      // Process accumulated chunks when threshold reached
      if (chunks.length * chunkSize >= chunkSize) {
        const combined = Buffer.concat(chunks)
        processor(combined, chunkIndex++)
        chunks.length = 0 // Clear chunks
      }
    })

    stream.on('end', () => {
      // Process any remaining chunks
      if (chunks.length > 0) {
        const combined = Buffer.concat(chunks)
        processor(combined, chunkIndex)
      }
      resolve()
    })

    stream.on('error', reject)
  })
}

/**
 * Stream read a JSON file efficiently
 */
export async function streamJSON<T = any>(
  filePath: string,
  _options: StreamProcessorOptions = {},
): Promise<T | null> {
  const chunks: Buffer[] = []

  await pipeline(
    createReadStream(filePath, { encoding: 'utf8' }),
    new Transform({
      transform(chunk: Buffer, _, callback) {
        chunks.push(chunk)
        callback()
      },
    }),
  )

  const content = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(content) as T
}

/**
 * Stream write a JSON file efficiently
 */
export async function streamWriteJSON<T>(
  filePath: string,
  data: T,
  _options: StreamProcessorOptions = {},
): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Process file line by line
 */
export async function processLineByLine(
  filePath: string,
  processor: (line: string, index: number) => void | Promise<void>,
): Promise<void> {
  const readline = await import('node:readline')
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Number.MAX_VALUE, // Treat \r\n as single character
  })

  let index = 0
  for await (const line of rl) {
    await Promise.resolve(processor(line, index++))
  }

  rl.close()
}

/**
 * File size utility
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath)
    return stats.size
  }
  catch {
    return 0
  }
}

/**
 * Count lines in a file efficiently
 */
export async function countLines(filePath: string): Promise<number> {
  let count = 0

  await processLineByLine(filePath, () => {
    count++
  })

  return count
}

/**
 * Batch process multiple files
 */
export async function batchProcessFiles<T = any>(
  filePaths: string[],
  processor: (file: string) => Promise<T>,
  concurrency: number = 3,
): Promise<Map<string, T>> {
  const results = new Map<string, T>()
  const queue: string[] = [...filePaths]
  const processing: Set<string> = new Set()

  const processNext = async (): Promise<void> => {
    while (queue.length > 0 && processing.size < concurrency) {
      const file = queue.shift()!
      processing.add(file)

      try {
        const result = await processor(file)
        results.set(file, result)
      }
      catch (_error) {
        results.set(file, null as any)
      }
      finally {
        processing.delete(file)
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: Math.min(concurrency, queue.length) })
  for (let i = 0; i < workers.length; i++) {
    processNext().then(() => {
      // Start next worker when this one completes
    })
  }

  // Wait for all workers to complete
  await Promise.all(workers)

  return results
}

/**
 * Check if file is large (above threshold)
 */
export async function isLargeFile(
  filePath: string,
  threshold: number = 1024 * 1024, // 1MB default
): Promise<boolean> {
  return (await getFileSize(filePath)) > threshold
}

/**
 * Get file info efficiently
 */
export interface FileInfo {
  path: string
  size: number
  lines: number
  isLarge: boolean
  encoding: BufferEncoding | null
}

export async function getFileInfo(
  filePath: string,
  options: StreamProcessorOptions = {},
): Promise<FileInfo> {
  const size = await getFileSize(filePath)
  const isLarge = size > (options.chunkSize || DEFAULT_CHUNK_SIZE)
  const lines = isLarge ? await countLines(filePath) : 0

  return {
    path: filePath,
    size,
    lines,
    isLarge,
    encoding: (options.encoding as BufferEncoding | null) || null,
  }
}

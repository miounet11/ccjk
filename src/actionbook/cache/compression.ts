/**
 * Data Compression
 *
 * Compression utilities for reducing storage size and improving cache performance.
 * Supports multiple compression algorithms and automatic level selection.
 */

import * as zlib from 'node:zlib'
import { promisify } from 'node:util'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)
const brotliCompress = promisify(zlib.brotliCompress)
const brotliDecompress = promisify(zlib.brotliDecompress)

/**
 * Compression algorithms
 */
export type CompressionAlgorithm = 'gzip' | 'brotli' | 'none'

/**
 * Compression configuration
 */
export interface CompressionConfig {
  algorithm: CompressionAlgorithm
  level?: number // Compression level (0-9 for gzip, 0-11 for brotli)
  threshold: number // Minimum size in bytes to compress
}

/**
 * Compression result
 */
export interface CompressionResult {
  data: Buffer
  algorithm: CompressionAlgorithm
  originalSize: number
  compressedSize: number
  ratio: number
}

/**
 * Compress data based on configuration
 */
export async function compressData(
  data: string | Buffer,
  config: CompressionConfig = { algorithm: 'gzip', threshold: 1024 },
): Promise<CompressionResult> {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8')
  const originalSize = buffer.length

  // Skip compression if data is too small
  if (originalSize < config.threshold) {
    return {
      data: buffer,
      algorithm: 'none',
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
    }
  }

  let compressed: Buffer
  let algorithm = config.algorithm

  try {
    switch (algorithm) {
      case 'gzip': {
        compressed = await gzip(buffer, { level: config.level || 6 })
        break
      }
      case 'brotli': {
        compressed = await brotliCompress(buffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: config.level || 6,
          },
        })
        break
      }
      default: {
        compressed = buffer
        algorithm = 'none'
      }
    }

    // If compression didn't help, use original
    if (compressed.length >= originalSize) {
      return {
        data: buffer,
        algorithm: 'none',
        originalSize,
        compressedSize: originalSize,
        ratio: 1,
      }
    }

    return {
      data: compressed,
      algorithm,
      originalSize,
      compressedSize: compressed.length,
      ratio: compressed.length / originalSize,
    }
  }
  catch (error) {
    // Fallback to uncompressed on error
    return {
      data: buffer,
      algorithm: 'none',
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
    }
  }
}

/**
 * Decompress data
 */
export async function decompressData(
  data: Buffer,
  algorithm: CompressionAlgorithm = 'gzip',
): Promise<Buffer> {
  try {
    switch (algorithm) {
      case 'gzip':
        return await gunzip(data)
      case 'brotli':
        return await brotliDecompress(data)
      default:
        return data
    }
  }
  catch (error) {
    console.error('Decompression error:', error)
    // Return original data if decompression fails
    return data
  }
}

/**
 * Compress JSON object
 */
export async function compressJSON(obj: any, config?: CompressionConfig): Promise<CompressionResult> {
  const json = JSON.stringify(obj)
  return compressData(json, config)
}

/**
 * Decompress to JSON object
 */
export async function decompressJSON(
  data: Buffer,
  algorithm: CompressionAlgorithm = 'gzip',
): Promise<any> {
  const decompressed = await decompressData(data, algorithm)
  return JSON.parse(decompressed.toString('utf-8'))
}

/**
 * Estimate compression ratio without actually compressing
 */
export function estimateCompressionRatio(data: string | Buffer): number {
  const str = Buffer.isBuffer(data) ? data.toString('utf-8') : data

  // Simple heuristic: repeated patterns compress better
  const uniqueChars = new Set(str).size
  const totalChars = str.length
  const entropy = uniqueChars / totalChars

  // Lower entropy = better compression
  return Math.max(0.3, Math.min(1.0, entropy))
}

/**
 * Select best compression algorithm based on data characteristics
 */
export function selectAlgorithm(data: string | Buffer): CompressionAlgorithm {
  const ratio = estimateCompressionRatio(data)

  // Use brotli for highly compressible data
  if (ratio < 0.5) {
    return 'brotli'
  }

  // Use gzip for moderately compressible data
  if (ratio < 0.8) {
    return 'gzip'
  }

  // Skip compression for incompressible data
  return 'none'
}

/**
 * Create optimal compression configuration
 */
export function createOptimalConfig(data: string | Buffer): CompressionConfig {
  const algorithm = selectAlgorithm(data)

  if (algorithm === 'none') {
    return { algorithm: 'none', threshold: Infinity }
  }

  return {
    algorithm,
    level: algorithm === 'brotli' ? 4 : 6,
    threshold: 1024,
  }
}

/**
 * Compress with automatic algorithm selection
 */
export async function compressAuto(data: string | Buffer): Promise<CompressionResult> {
  const config = createOptimalConfig(data)
  return compressData(data, config)
}

/**
 * Batch compress multiple items
 */
export async function compressBatch(
  items: Array<{ key: string; data: string | Buffer }>,
  config?: CompressionConfig,
): Promise<Array<{ key: string; result: CompressionResult }>> {
  const results = await Promise.all(
    items.map(async (item) => ({
      key: item.key,
      result: await compressData(item.data, config),
    })),
  )

  return results
}

/**
 * Batch decompress multiple items
 */
export async function decompressBatch(
  items: Array<{ key: string; data: Buffer; algorithm: CompressionAlgorithm }>,
): Promise<Array<{ key: string; result: Buffer }>> {
  const results = await Promise.all(
    items.map(async (item) => ({
      key: item.key,
      result: await decompressData(item.data, item.algorithm),
    })),
  )

  return results
}

/**
 * Get compression statistics
 */
export function getCompressionStats(result: CompressionResult): {
  savedBytes: number
  savedPercent: number
  algorithm: string
  efficiency: string
} {
  const savedBytes = result.originalSize - result.compressedSize
  const savedPercent = ((1 - result.ratio) * 100).toFixed(2)

  let efficiency = 'poor'
  if (result.ratio < 0.4) efficiency = 'excellent'
  else if (result.ratio < 0.6) efficiency = 'good'
  else if (result.ratio < 0.8) efficiency = 'fair'

  return {
    savedBytes,
    savedPercent: `${savedPercent}%`,
    algorithm: result.algorithm,
    efficiency,
  }
}

/**
 * LZ-based compression algorithm
 * Uses dictionary-based compression similar to LZ77/LZ78
 */

import { CompressionAlgorithm } from '../../types'

export interface LZCompressionResult {
  compressed: string
  dictionary: Map<string, string>
  originalSize: number
  compressedSize: number
}

export interface LZDecompressionResult {
  decompressed: string
  success: boolean
  error?: string
}

/**
 * LZ Compression implementation
 */
export class LZCompression {
  private readonly minPatternLength: number
  private readonly maxPatternLength: number
  private readonly minOccurrences: number

  constructor(
    minPatternLength: number = 4,
    maxPatternLength: number = 50,
    minOccurrences: number = 2,
  ) {
    this.minPatternLength = minPatternLength
    this.maxPatternLength = maxPatternLength
    this.minOccurrences = minOccurrences
  }

  /**
   * Compress text using LZ-based algorithm
   */
  compress(text: string): LZCompressionResult {
    const dictionary = new Map<string, string>()
    let compressed = text
    let tokenId = 0

    // Find repeating patterns
    const patterns = this.findRepeatingPatterns(text)

    // Sort patterns by potential savings (length * occurrences)
    const sortedPatterns = Array.from(patterns.entries())
      .sort((a, b) => {
        const savingsA = a[0].length * a[1]
        const savingsB = b[0].length * b[1]
        return savingsB - savingsA
      })

    // Replace patterns with tokens
    for (const [pattern, count] of sortedPatterns) {
      if (count >= this.minOccurrences) {
        const token = `§${tokenId}§`
        dictionary.set(token, pattern)

        // Replace all occurrences
        const regex = new RegExp(this.escapeRegex(pattern), 'g')
        compressed = compressed.replace(regex, token)

        tokenId++
      }
    }

    // Encode dictionary at the start
    const dictStr = this.encodeDictionary(dictionary)
    const finalCompressed = `${dictStr}${compressed}`

    return {
      compressed: finalCompressed,
      dictionary,
      originalSize: text.length,
      compressedSize: finalCompressed.length,
    }
  }

  /**
   * Decompress LZ-compressed text
   */
  decompress(compressed: string): LZDecompressionResult {
    try {
      // Extract dictionary and content
      const { dictionary, content } = this.decodeDictionary(compressed)

      // Replace tokens with original patterns
      let decompressed = content
      for (const [token, pattern] of dictionary.entries()) {
        const regex = new RegExp(this.escapeRegex(token), 'g')
        decompressed = decompressed.replace(regex, pattern)
      }

      return {
        decompressed,
        success: true,
      }
    }
    catch (error) {
      return {
        decompressed: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Find repeating patterns in text
   */
  private findRepeatingPatterns(text: string): Map<string, number> {
    const patterns = new Map<string, number>()

    // Sliding window approach
    for (let len = this.minPatternLength; len <= this.maxPatternLength; len++) {
      for (let i = 0; i <= text.length - len; i++) {
        const pattern = text.substring(i, i + len)

        // Skip patterns that are just whitespace or single repeated characters
        if (this.isValidPattern(pattern)) {
          patterns.set(pattern, (patterns.get(pattern) || 0) + 1)
        }
      }
    }

    // Filter out patterns that are substrings of more frequent patterns
    return this.filterSubpatterns(patterns)
  }

  /**
   * Check if pattern is valid for compression
   */
  private isValidPattern(pattern: string): boolean {
    // Skip pure whitespace
    if (/^\s+$/.test(pattern)) {
      return false
    }

    // Skip single repeated character
    if (new Set(pattern).size === 1) {
      return false
    }

    return true
  }

  /**
   * Filter out subpatterns that are less efficient
   */
  private filterSubpatterns(patterns: Map<string, number>): Map<string, number> {
    const filtered = new Map<string, number>()
    const sortedPatterns = Array.from(patterns.entries())
      .sort((a, b) => b[0].length - a[0].length)

    for (const [pattern, count] of sortedPatterns) {
      let isSubpattern = false

      for (const [existingPattern] of filtered.entries()) {
        if (existingPattern.includes(pattern) && existingPattern !== pattern) {
          isSubpattern = true
          break
        }
      }

      if (!isSubpattern) {
        filtered.set(pattern, count)
      }
    }

    return filtered
  }

  /**
   * Encode dictionary to string
   */
  private encodeDictionary(dictionary: Map<string, string>): string {
    const entries: string[] = []

    for (const [token, pattern] of dictionary.entries()) {
      // Escape special characters
      const escapedPattern = this.encodeString(pattern)
      entries.push(`${token}:${escapedPattern}`)
    }

    return `[DICT:${entries.join('|')}]`
  }

  /**
   * Decode dictionary from compressed string
   */
  private decodeDictionary(compressed: string): { dictionary: Map<string, string>, content: string } {
    const dictMatch = compressed.match(/^\[DICT:(.*?)\]/)

    if (!dictMatch) {
      return { dictionary: new Map(), content: compressed }
    }

    const dictStr = dictMatch[1]
    const content = compressed.substring(dictMatch[0].length)
    const dictionary = new Map<string, string>()

    if (dictStr) {
      const entries = dictStr.split('|')
      for (const entry of entries) {
        const [token, escapedPattern] = entry.split(':')
        if (token && escapedPattern) {
          dictionary.set(token, this.decodeString(escapedPattern))
        }
      }
    }

    return { dictionary, content }
  }

  /**
   * Encode string for dictionary storage
   */
  private encodeString(str: string): string {
    return Buffer.from(str).toString('base64')
  }

  /**
   * Decode string from dictionary storage
   */
  private decodeString(str: string): string {
    return Buffer.from(str, 'base64').toString('utf-8')
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Get algorithm identifier
   */
  getAlgorithm(): CompressionAlgorithm {
    return CompressionAlgorithm.LZ
  }
}

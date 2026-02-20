/**
 * Semantic compression algorithm
 * Uses LLM-based summarization to compress context while preserving meaning
 */

import type { AnthropicApiClient } from '../../../utils/context/api-client'
import { CompressionAlgorithm } from '../../types'

export interface SemanticCompressionResult {
  compressed: string
  removedInfo: string[]
  originalSize: number
  compressedSize: number
}

export interface SemanticDecompressionResult {
  decompressed: string
  success: boolean
  error?: string
}

/**
 * Semantic Compression implementation
 * Uses Claude Haiku for intelligent summarization when API is available
 * Falls back to rule-based compression when API is unavailable
 */
export class SemanticCompression {
  private readonly aggressiveness: number
  private apiClient?: AnthropicApiClient

  constructor(aggressiveness: number = 0.5, apiClient?: AnthropicApiClient) {
    // Aggressiveness: 0 (conservative) to 1 (aggressive)
    this.aggressiveness = Math.max(0, Math.min(1, aggressiveness))
    this.apiClient = apiClient
  }

  /**
   * Compress text using rule-based semantic analysis (synchronous)
   * For LLM-based compression, use compressAsync()
   */
  compress(text: string): SemanticCompressionResult {
    return this.compressRuleBased(text)
  }

  /**
   * Compress text using LLM-based semantic analysis (async)
   * Falls back to rule-based compression if API is unavailable
   */
  async compressAsync(text: string): Promise<SemanticCompressionResult> {
    const originalSize = text.length

    // Try LLM-based compression first if API is available
    if (this.apiClient && originalSize > 500) {
      try {
        const llmResult = await this.compressWithLLM(text)
        return llmResult
      }
      catch (error) {
        // Fall back to rule-based compression on error
        console.warn('LLM compression failed, falling back to rule-based:', error)
      }
    }

    // Rule-based compression fallback
    return this.compressRuleBased(text)
  }

  /**
   * LLM-based compression using Claude Haiku
   * Uses intelligent summarization to preserve semantic meaning while reducing tokens
   */
  private async compressWithLLM(text: string): Promise<SemanticCompressionResult> {
    const originalSize = text.length
    const targetRatio = this.getTargetRatio()

    const prompt = this.buildCompressionPrompt(text, targetRatio)

    // Calculate appropriate max tokens for response
    // Estimate: 1 token ≈ 4 chars, target ratio determines output size
    const estimatedInputTokens = Math.ceil(originalSize / 4)
    const targetOutputTokens = Math.ceil(estimatedInputTokens * targetRatio)
    const maxTokens = Math.min(Math.max(targetOutputTokens, 256), 4096)

    const compressed = await this.apiClient!.sendMessage(prompt, {
      maxTokens,
      temperature: 0.3, // Low temperature for consistent, focused compression
    })

    return {
      compressed: compressed.trim(),
      removedInfo: ['LLM-based compression applied'],
      originalSize,
      compressedSize: compressed.length,
    }
  }

  /**
   * Build compression prompt based on aggressiveness
   * Prompts are designed to preserve semantic meaning while reducing verbosity
   */
  private buildCompressionPrompt(text: string, targetRatio: number): string {
    const targetPercent = Math.round(targetRatio * 100)

    if (this.aggressiveness < 0.3) {
      // Conservative: preserve details
      return `You are a context compression assistant. Compress the following text to approximately ${targetPercent}% of its original length while preserving ALL key information.

PRESERVE:
- All function/variable/file names
- All code structure and syntax
- All numbers, metrics, and URLs
- All error messages and solutions
- All technical terms and decisions
- All file paths and commands

COMPRESS:
- Remove redundant whitespace
- Shorten verbose explanations
- Remove filler words
- Use concise phrasing

Text to compress:
${text}

Provide the compressed version maintaining maximum fidelity:`
    }
    else if (this.aggressiveness < 0.7) {
      // Balanced: preserve core meaning
      return `You are a context compression assistant. Compress the following text to approximately ${targetPercent}% of its original length while preserving core meaning.

PRESERVE:
- Function/variable names
- Key code changes
- Important decisions and outcomes
- Error messages and solutions
- File paths and URLs
- Critical numbers and metrics

COMPRESS:
- Remove redundant information
- Shorten verbose explanations
- Remove filler words and phrases
- Combine similar points
- Use bullet points where appropriate

OMIT:
- Conversational elements
- Redundant examples
- Unnecessary background

Text to compress:
${text}

Provide the compressed version:`
    }
    else {
      // Aggressive: extract essence only
      return `You are a context compression assistant. Extract only the essential information from the following text in approximately ${targetPercent}% of the original length.

PRESERVE:
- Core decisions and outcomes
- Critical code changes
- Key error messages
- Essential file paths

COMPRESS AGGRESSIVELY:
- Use bullet points
- Remove all redundancy
- Keep only critical facts
- Omit examples and explanations

Text to compress:
${text}

Provide only the essential information in bullet points:`
    }
  }

  /**
   * Get target compression ratio based on aggressiveness
   * Returns the target size as a fraction of original (e.g., 0.5 = 50% of original size)
   */
  private getTargetRatio(): number {
    // Conservative (0.0-0.3): 60-70% of original (30-40% reduction)
    // Balanced (0.3-0.7): 40-60% of original (40-60% reduction)
    // Aggressive (0.7-1.0): 30-40% of original (60-70% reduction)
    return 0.7 - (this.aggressiveness * 0.4)
  }

  /**
   * Rule-based compression fallback
   */
  private compressRuleBased(text: string): SemanticCompressionResult {
    const originalSize = text.length
    let compressed = text
    const removedInfo: string[] = []

    // Apply compression techniques based on aggressiveness
    compressed = this.removeRedundantWhitespace(compressed)
    compressed = this.compressCommonPhrases(compressed, removedInfo)
    compressed = this.removeFillerWords(compressed, removedInfo)

    if (this.aggressiveness > 0.3) {
      compressed = this.abbreviateCommonTerms(compressed, removedInfo)
    }

    if (this.aggressiveness > 0.6) {
      compressed = this.removeRedundantSentences(compressed, removedInfo)
    }

    return {
      compressed,
      removedInfo,
      originalSize,
      compressedSize: compressed.length,
    }
  }

  /**
   * Decompress semantically compressed text
   * Note: LLM-based compression is lossy and cannot be fully decompressed
   * This method only works for rule-based compression
   */
  decompress(compressed: string): SemanticDecompressionResult {
    try {
      // Check if this was LLM-compressed (lossy)
      if (compressed.includes('LLM-based compression') || compressed.length < 100) {
        // Cannot decompress LLM-compressed content
        return {
          decompressed: compressed,
          success: true,
        }
      }

      // Semantic compression is mostly lossy, but we can restore some patterns
      let decompressed = compressed

      // Restore abbreviated terms
      decompressed = this.restoreAbbreviations(decompressed)

      // Restore common phrases
      decompressed = this.restoreCommonPhrases(decompressed)

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
   * Remove redundant whitespace
   */
  private removeRedundantWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double newline
      .trim()
  }

  /**
   * Compress common phrases
   */
  private compressCommonPhrases(text: string, removedInfo: string[]): string {
    const phraseMap: Record<string, string> = {
      'in order to': 'to',
      'due to the fact that': 'because',
      'at this point in time': 'now',
      'for the purpose of': 'for',
      'in the event that': 'if',
      'with regard to': 'regarding',
      'with reference to': 'regarding',
      'it is important to note that': '',
      'it should be noted that': '',
      'as a matter of fact': 'actually',
      'at the present time': 'now',
      'in the near future': 'soon',
      'on a regular basis': 'regularly',
      'in spite of the fact that': 'although',
      'until such time as': 'until',
    }

    let compressed = text

    for (const [phrase, replacement] of Object.entries(phraseMap)) {
      const regex = new RegExp(phrase, 'gi')
      if (regex.test(compressed)) {
        removedInfo.push(`phrase:${phrase}->${replacement}`)
        compressed = compressed.replace(regex, replacement)
      }
    }

    return compressed
  }

  /**
   * Remove filler words based on aggressiveness
   */
  private removeFillerWords(text: string, removedInfo: string[]): string {
    const fillerWords = [
      'actually',
      'basically',
      'essentially',
      'literally',
      'really',
      'very',
      'quite',
      'rather',
      'somewhat',
      'just',
      'simply',
      'merely',
      'only',
    ]

    let compressed = text

    // Only remove if aggressiveness is high enough
    if (this.aggressiveness > 0.4) {
      for (const word of fillerWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi')
        if (regex.test(compressed)) {
          removedInfo.push(`filler:${word}`)
          compressed = compressed.replace(regex, '')
        }
      }
    }

    return compressed
  }

  /**
   * Abbreviate common technical terms
   */
  private abbreviateCommonTerms(text: string, removedInfo: string[]): string {
    const abbreviations: Record<string, string> = {
      function: 'fn',
      parameter: 'param',
      parameters: 'params',
      argument: 'arg',
      arguments: 'args',
      variable: 'var',
      variables: 'vars',
      configuration: 'config',
      initialize: 'init',
      implementation: 'impl',
      interface: 'iface',
      application: 'app',
      database: 'db',
      repository: 'repo',
      environment: 'env',
      development: 'dev',
      production: 'prod',
      documentation: 'docs',
      specification: 'spec',
      authentication: 'auth',
      authorization: 'authz',
      administrator: 'admin',
      information: 'info',
      message: 'msg',
      error: 'err',
      response: 'resp',
      request: 'req',
    }

    let compressed = text

    for (const [term, abbr] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi')
      if (regex.test(compressed)) {
        removedInfo.push(`abbr:${term}->${abbr}`)
        compressed = compressed.replace(regex, abbr)
      }
    }

    return compressed
  }

  /**
   * Remove redundant sentences (aggressive)
   */
  private removeRedundantSentences(text: string, removedInfo: string[]): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim())
    const uniqueSentences = new Set<string>()
    const kept: string[] = []

    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().trim()

      // Check for semantic similarity (simple approach)
      let isDuplicate = false
      for (const existing of uniqueSentences) {
        if (this.areSimilar(normalized, existing)) {
          isDuplicate = true
          removedInfo.push(`duplicate:${sentence.trim()}`)
          break
        }
      }

      if (!isDuplicate) {
        uniqueSentences.add(normalized)
        kept.push(sentence.trim())
      }
    }

    return kept.join('. ') + (kept.length > 0 ? '.' : '')
  }

  /**
   * Check if two sentences are semantically similar
   */
  private areSimilar(s1: string, s2: string): boolean {
    // Simple similarity check based on word overlap
    const words1 = new Set(s1.split(/\s+/))
    const words2 = new Set(s2.split(/\s+/))

    const words1Array = Array.from(words1)
    const words2Array = Array.from(words2)
    const intersection = new Set(words1Array.filter(w => words2.has(w)))
    const union = new Set(words1Array.concat(words2Array))

    const similarity = intersection.size / union.size

    // Consider similar if > 70% word overlap
    return similarity > 0.7
  }

  /**
   * Restore abbreviations
   */
  private restoreAbbreviations(text: string): string {
    const expansions: Record<string, string> = {
      fn: 'function',
      param: 'parameter',
      params: 'parameters',
      arg: 'argument',
      args: 'arguments',
      var: 'variable',
      vars: 'variables',
      config: 'configuration',
      init: 'initialize',
      impl: 'implementation',
      iface: 'interface',
      app: 'application',
      db: 'database',
      repo: 'repository',
      env: 'environment',
      dev: 'development',
      prod: 'production',
      docs: 'documentation',
      spec: 'specification',
      auth: 'authentication',
      authz: 'authorization',
      admin: 'administrator',
      info: 'information',
      msg: 'message',
      err: 'error',
      resp: 'response',
      req: 'request',
    }

    let restored = text

    for (const [abbr, term] of Object.entries(expansions)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g')
      restored = restored.replace(regex, term)
    }

    return restored
  }

  /**
   * Restore common phrases
   */
  private restoreCommonPhrases(text: string): string {
    // Most phrase compressions are acceptable in decompressed form
    // Only restore critical ones
    return text
      .replace(/\bto\b/g, 'in order to')
      .replace(/\bbecause\b/g, 'due to the fact that')
  }

  /**
   * Get algorithm identifier
   */
  getAlgorithm(): CompressionAlgorithm {
    return CompressionAlgorithm.SEMANTIC
  }
}

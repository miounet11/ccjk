/**
 * Multi-Head Compressor (mHC-Inspired)
 *
 * Implements parallel compression using multiple specialized "heads":
 * - Semantic Head: Extracts core meaning using Haiku
 * - Structural Head: Preserves code/file structure
 * - Temporal Head: Maintains timeline of key events
 * - Entity Head: Tracks important entities and relationships
 *
 * Each head produces a compressed segment, which are then fused
 * using weighted combination for optimal context preservation.
 */

import type { FCSummary } from '../../types/context'
import type { AnthropicApiClient } from './api-client'
import process from 'node:process'
import { createApiClient } from './api-client'
import { estimateTokens } from './token-estimator'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Raw context input for compression
 */
export interface RawContext {
  /** Function call summaries */
  functionCalls: FCSummary[]
  /** Files that were read/modified */
  files: FileContext[]
  /** User messages */
  userMessages: string[]
  /** Assistant responses */
  assistantResponses: string[]
  /** Error messages */
  errors: string[]
  /** Current goal/task */
  currentGoal?: string
  /** Session metadata */
  metadata?: Record<string, unknown>
}

/**
 * File context information
 */
export interface FileContext {
  path: string
  action: 'read' | 'write' | 'edit' | 'delete'
  summary?: string
  linesChanged?: number
}

/**
 * Compressed segment from a single head
 */
export interface CompressedSegment {
  headName: string
  content: string
  tokens: number
  importance: number // 0-1 scale
}

/**
 * Final compressed output
 */
export interface CompressedOutput {
  /** Combined compressed content */
  content: string
  /** Individual head outputs */
  segments: CompressedSegment[]
  /** Original token count */
  originalTokens: number
  /** Compressed token count */
  compressedTokens: number
  /** Compression ratio */
  compressionRatio: number
  /** Timestamp */
  timestamp: Date
}

/**
 * Compression head interface
 */
export interface CompressionHead {
  name: string
  weight: number
  compress: (context: RawContext, apiClient?: AnthropicApiClient) => Promise<CompressedSegment>
}

// ============================================================================
// Compression Prompts (reserved for API-based compression)
// ============================================================================

const _SEMANTIC_PROMPT = `You are a context compression expert. Analyze the following conversation and extract the CORE SEMANTIC MEANING.

Focus on:
1. Key decisions made and their rationale
2. Important findings or discoveries
3. Critical outcomes and results
4. Unresolved issues or blockers

Input:
{context}

Provide a concise summary (max 200 words) capturing the essential meaning. Use bullet points for clarity.`

// Reserved for future API-based structural compression
const _STRUCTURAL_PROMPT = `Analyze the following code-related context and extract the STRUCTURAL INFORMATION.

Focus on:
1. File hierarchy and organization
2. Key function/class signatures
3. Import/export relationships
4. Configuration changes

Input:
{context}

Provide a structured summary (max 150 words) of the code structure. Use code blocks where appropriate.`

// Reserved for future API-based temporal compression
const _TEMPORAL_PROMPT = `Analyze the following conversation and create a TIMELINE of key events.

Focus on:
1. Major state transitions
2. Important milestones achieved
3. Sequence of critical actions
4. Time-sensitive decisions

Input:
{context}

Provide a chronological summary (max 100 words) of key events. Use numbered list format.`

// ============================================================================
// Compression Heads Implementation
// ============================================================================

/**
 * Semantic Compression Head
 * Uses Haiku to extract core meaning
 */
async function semanticCompress(
  context: RawContext,
  apiClient?: AnthropicApiClient,
): Promise<CompressedSegment> {
  // Build context string
  const contextStr = buildContextString(context)

  // If no API client, use rule-based fallback
  if (!apiClient) {
    return semanticCompressFallback(context)
  }

  try {
    const prompt = _SEMANTIC_PROMPT.replace('{context}', contextStr)
    const response = await apiClient.sendMessage(prompt)

    return {
      headName: 'semantic',
      content: response,
      tokens: estimateTokens(response),
      importance: 0.9, // Semantic is most important
    }
  }
  catch {
    return semanticCompressFallback(context)
  }
}

/**
 * Semantic compression fallback (rule-based)
 */
function semanticCompressFallback(context: RawContext): CompressedSegment {
  const parts: string[] = []

  // Extract key decisions from user messages
  if (context.currentGoal) {
    parts.push(`**Goal**: ${context.currentGoal}`)
  }

  // Summarize function calls
  if (context.functionCalls.length > 0) {
    parts.push('**Actions**:')
    const recentFCs = context.functionCalls.slice(-10)
    for (const fc of recentFCs) {
      parts.push(`- ${fc.fcName}: ${fc.summary}`)
    }
  }

  // Note errors
  if (context.errors.length > 0) {
    parts.push('**Issues**:')
    for (const error of context.errors.slice(-3)) {
      parts.push(`- ${error}`)
    }
  }

  const content = parts.join('\n')
  return {
    headName: 'semantic',
    content,
    tokens: estimateTokens(content),
    importance: 0.8,
  }
}

/**
 * Structural Compression Head
 * Preserves code/file structure using rules
 */
async function structuralCompress(
  context: RawContext,
  _apiClient?: AnthropicApiClient,
): Promise<CompressedSegment> {
  const parts: string[] = []

  // Group files by action
  const filesByAction = new Map<string, FileContext[]>()
  for (const file of context.files) {
    const existing = filesByAction.get(file.action) || []
    existing.push(file)
    filesByAction.set(file.action, existing)
  }

  // Summarize file operations
  if (filesByAction.size > 0) {
    parts.push('**File Operations**:')

    for (const [action, files] of filesByAction) {
      const icon = getActionIcon(action)
      parts.push(`${icon} ${action.toUpperCase()}:`)
      for (const file of files.slice(0, 10)) {
        const detail = file.linesChanged ? ` (${file.linesChanged} lines)` : ''
        parts.push(`  - ${file.path}${detail}`)
      }
      if (files.length > 10) {
        parts.push(`  - ... and ${files.length - 10} more`)
      }
    }
  }

  // Extract imports/exports from function calls
  const codePatterns = extractCodePatterns(context.functionCalls)
  if (codePatterns.length > 0) {
    parts.push('**Code Patterns**:')
    for (const pattern of codePatterns) {
      parts.push(`- ${pattern}`)
    }
  }

  const content = parts.join('\n')
  return {
    headName: 'structural',
    content,
    tokens: estimateTokens(content),
    importance: 0.7,
  }
}

/**
 * Temporal Compression Head
 * Maintains timeline of key events
 */
async function temporalCompress(
  context: RawContext,
  _apiClient?: AnthropicApiClient,
): Promise<CompressedSegment> {
  const parts: string[] = []
  const events: { time: Date, event: string }[] = []

  // Extract timeline from function calls
  for (const fc of context.functionCalls) {
    events.push({
      time: fc.timestamp,
      event: `${fc.fcName}: ${fc.summary}`,
    })
  }

  // Sort by time
  events.sort((a, b) => a.time.getTime() - b.time.getTime())

  // Group into phases
  if (events.length > 0) {
    parts.push('**Timeline**:')

    // Take key events (first, last, and important ones)
    const keyEvents = selectKeyEvents(events, 10)
    let index = 1
    for (const event of keyEvents) {
      const timeStr = formatTime(event.time)
      parts.push(`${index}. [${timeStr}] ${event.event}`)
      index++
    }
  }

  const content = parts.join('\n')
  return {
    headName: 'temporal',
    content,
    tokens: estimateTokens(content),
    importance: 0.5,
  }
}

/**
 * Entity Compression Head
 * Tracks important entities and relationships
 */
async function entityCompress(
  context: RawContext,
  _apiClient?: AnthropicApiClient,
): Promise<CompressedSegment> {
  const parts: string[] = []

  // Extract entities
  const entities = extractEntities(context)

  if (entities.files.size > 0) {
    parts.push('**Key Files**:')
    for (const file of Array.from(entities.files).slice(0, 10)) {
      parts.push(`- ${file}`)
    }
  }

  if (entities.functions.size > 0) {
    parts.push('**Key Functions**:')
    for (const func of Array.from(entities.functions).slice(0, 10)) {
      parts.push(`- ${func}`)
    }
  }

  if (entities.variables.size > 0) {
    parts.push('**Key Variables**:')
    for (const variable of Array.from(entities.variables).slice(0, 10)) {
      parts.push(`- ${variable}`)
    }
  }

  if (entities.dependencies.size > 0) {
    parts.push('**Dependencies**:')
    for (const dep of Array.from(entities.dependencies).slice(0, 5)) {
      parts.push(`- ${dep}`)
    }
  }

  const content = parts.join('\n')
  return {
    headName: 'entity',
    content,
    tokens: estimateTokens(content),
    importance: 0.4,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build context string from raw context
 */
function buildContextString(context: RawContext): string {
  const parts: string[] = []

  if (context.currentGoal) {
    parts.push(`Goal: ${context.currentGoal}`)
  }

  if (context.userMessages.length > 0) {
    parts.push('User Messages:')
    for (const msg of context.userMessages.slice(-5)) {
      parts.push(`- ${msg.substring(0, 200)}`)
    }
  }

  if (context.functionCalls.length > 0) {
    parts.push('Function Calls:')
    for (const fc of context.functionCalls.slice(-10)) {
      parts.push(`- ${fc.fcName}: ${fc.summary}`)
    }
  }

  if (context.errors.length > 0) {
    parts.push('Errors:')
    for (const error of context.errors) {
      parts.push(`- ${error}`)
    }
  }

  return parts.join('\n')
}

/**
 * Get icon for file action
 */
function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    read: '📖',
    write: '✏️',
    edit: '🔧',
    delete: '🗑️',
  }
  return icons[action] || '📄'
}

/**
 * Extract code patterns from function calls
 */
function extractCodePatterns(fcs: FCSummary[]): string[] {
  const patterns: string[] = []
  const seen = new Set<string>()

  for (const fc of fcs) {
    // Look for common patterns in summaries
    const summary = fc.summary.toLowerCase()

    if (summary.includes('import') && !seen.has('import')) {
      patterns.push('Import statements modified')
      seen.add('import')
    }
    if (summary.includes('export') && !seen.has('export')) {
      patterns.push('Export statements modified')
      seen.add('export')
    }
    if (summary.includes('function') && !seen.has('function')) {
      patterns.push('Function definitions changed')
      seen.add('function')
    }
    if (summary.includes('class') && !seen.has('class')) {
      patterns.push('Class definitions changed')
      seen.add('class')
    }
    if (summary.includes('test') && !seen.has('test')) {
      patterns.push('Test files modified')
      seen.add('test')
    }
    if (summary.includes('config') && !seen.has('config')) {
      patterns.push('Configuration updated')
      seen.add('config')
    }
  }

  return patterns
}

/**
 * Select key events from timeline
 */
function selectKeyEvents(
  events: { time: Date, event: string }[],
  maxEvents: number,
): { time: Date, event: string }[] {
  if (events.length <= maxEvents) {
    return events
  }

  const result: { time: Date, event: string }[] = []

  // Always include first and last
  result.push(events[0])

  // Include events with important keywords
  const importantKeywords = ['error', 'success', 'complete', 'create', 'delete', 'fix']
  for (const event of events) {
    if (result.length >= maxEvents - 1)
      break
    const eventLower = event.event.toLowerCase()
    if (importantKeywords.some(kw => eventLower.includes(kw))) {
      if (!result.includes(event)) {
        result.push(event)
      }
    }
  }

  // Fill remaining with evenly spaced events
  const remaining = maxEvents - result.length - 1
  if (remaining > 0) {
    const step = Math.floor(events.length / (remaining + 1))
    for (let i = step; i < events.length - 1 && result.length < maxEvents - 1; i += step) {
      if (!result.includes(events[i])) {
        result.push(events[i])
      }
    }
  }

  // Always include last
  if (!result.includes(events[events.length - 1])) {
    result.push(events[events.length - 1])
  }

  // Sort by time
  return result.sort((a, b) => a.time.getTime() - b.time.getTime())
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Extract entities from context
 */
function extractEntities(context: RawContext): {
  files: Set<string>
  functions: Set<string>
  variables: Set<string>
  dependencies: Set<string>
} {
  const files = new Set<string>()
  const functions = new Set<string>()
  const variables = new Set<string>()
  const dependencies = new Set<string>()

  // Extract from file contexts
  for (const file of context.files) {
    files.add(file.path)
  }

  // Extract from function calls
  for (const fc of context.functionCalls) {
    // Function names often indicate what was called
    if (fc.fcName.includes('Read') || fc.fcName.includes('Write') || fc.fcName.includes('Edit')) {
      // Try to extract file path from summary
      const pathMatch = fc.summary.match(/[/\\][\w\-./\\]+\.\w+/)
      if (pathMatch) {
        files.add(pathMatch[0])
      }
    }

    // Extract function names from summaries
    const funcMatch = fc.summary.match(/function\s+(\w+)|(\w+)\s*\(/)
    if (funcMatch) {
      functions.add(funcMatch[1] || funcMatch[2])
    }
  }

  // Extract from user messages
  for (const msg of context.userMessages) {
    // Look for npm packages
    const npmMatch = msg.match(/npm\s+(?:install|i)\s+([\w\-@/]+)/)
    if (npmMatch) {
      dependencies.add(npmMatch[1])
    }

    // Look for variable assignments
    const varMatch = msg.match(/(?:const|let|var)\s+(\w+)/)
    if (varMatch) {
      variables.add(varMatch[1])
    }
  }

  return { files, functions, variables, dependencies }
}

// ============================================================================
// Multi-Head Compressor Class
// ============================================================================

/**
 * Multi-Head Compressor Configuration
 */
export interface MultiHeadCompressorConfig {
  /** API key for Haiku calls */
  apiKey?: string
  /** Enable semantic head (uses API) */
  enableSemanticHead?: boolean
  /** Head weights (must sum to 1.0) */
  weights?: {
    semantic: number
    structural: number
    temporal: number
    entity: number
  }
  /** Target compression ratio */
  targetRatio?: number
  /** Maximum output tokens */
  maxOutputTokens?: number
}

/**
 * Multi-Head Compressor
 *
 * Orchestrates multiple compression heads to produce optimal compressed context.
 */
export class MultiHeadCompressor {
  private config: Required<MultiHeadCompressorConfig>
  private apiClient: AnthropicApiClient | null = null
  private heads: CompressionHead[]

  constructor(config: MultiHeadCompressorConfig = {}) {
    // Normalize weights
    const defaultWeights = {
      semantic: 0.4,
      structural: 0.3,
      temporal: 0.2,
      entity: 0.1,
    }

    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      enableSemanticHead: config.enableSemanticHead ?? true,
      weights: config.weights || defaultWeights,
      targetRatio: config.targetRatio ?? 0.2, // 5x compression
      maxOutputTokens: config.maxOutputTokens ?? 2000,
    }

    // Initialize API client if key available
    if (this.config.apiKey && this.config.enableSemanticHead) {
      this.apiClient = createApiClient({
        apiKey: this.config.apiKey,
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 500,
        temperature: 0.3,
      })
    }

    // Initialize heads
    this.heads = [
      {
        name: 'semantic',
        weight: this.config.weights.semantic,
        compress: semanticCompress,
      },
      {
        name: 'structural',
        weight: this.config.weights.structural,
        compress: structuralCompress,
      },
      {
        name: 'temporal',
        weight: this.config.weights.temporal,
        compress: temporalCompress,
      },
      {
        name: 'entity',
        weight: this.config.weights.entity,
        compress: entityCompress,
      },
    ]
  }

  /**
   * Compress context using all heads
   */
  async compress(context: RawContext): Promise<CompressedOutput> {
    // Calculate original tokens
    const originalTokens = this.estimateOriginalTokens(context)

    // Run all heads in parallel
    const segmentPromises = this.heads.map(head =>
      head.compress(context, this.apiClient || undefined),
    )

    const segments = await Promise.all(segmentPromises)

    // Fuse segments
    const fusedContent = this.fuseSegments(segments)

    // Calculate compressed tokens
    const compressedTokens = estimateTokens(fusedContent)

    return {
      content: fusedContent,
      segments,
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      timestamp: new Date(),
    }
  }

  /**
   * Fuse segments from all heads
   */
  private fuseSegments(segments: CompressedSegment[]): string {
    const parts: string[] = []

    // Sort by importance * weight
    const sortedSegments = [...segments].sort((a, b) => {
      const headA = this.heads.find(h => h.name === a.headName)
      const headB = this.heads.find(h => h.name === b.headName)
      const scoreA = a.importance * (headA?.weight || 0)
      const scoreB = b.importance * (headB?.weight || 0)
      return scoreB - scoreA
    })

    // Build fused output
    parts.push('# Context Summary\n')

    let currentTokens = 0
    for (const segment of sortedSegments) {
      // Check if adding this segment would exceed limit
      if (currentTokens + segment.tokens > this.config.maxOutputTokens) {
        // Truncate segment if needed
        const remainingTokens = this.config.maxOutputTokens - currentTokens
        if (remainingTokens > 50) {
          const truncated = this.truncateToTokens(segment.content, remainingTokens)
          parts.push(truncated)
        }
        break
      }

      parts.push(segment.content)
      parts.push('') // Empty line between sections
      currentTokens += segment.tokens
    }

    return parts.join('\n').trim()
  }

  /**
   * Estimate original token count
   */
  private estimateOriginalTokens(context: RawContext): number {
    let total = 0

    // Function calls
    for (const fc of context.functionCalls) {
      total += estimateTokens(fc.summary) * 3 // Assume summary is 3x compressed
    }

    // User messages
    for (const msg of context.userMessages) {
      total += estimateTokens(msg)
    }

    // Assistant responses
    for (const resp of context.assistantResponses) {
      total += estimateTokens(resp)
    }

    // Files
    for (const file of context.files) {
      total += estimateTokens(file.path)
      if (file.summary) {
        total += estimateTokens(file.summary) * 2
      }
    }

    // Errors
    for (const error of context.errors) {
      total += estimateTokens(error)
    }

    return total
  }

  /**
   * Truncate content to approximate token count
   */
  private truncateToTokens(content: string, maxTokens: number): string {
    // Rough estimate: 4 chars per token for English
    const maxChars = maxTokens * 4
    if (content.length <= maxChars) {
      return content
    }
    return `${content.substring(0, maxChars - 3)}...`
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MultiHeadCompressorConfig>): void {
    if (config.apiKey !== undefined) {
      this.config.apiKey = config.apiKey
    }
    if (config.enableSemanticHead !== undefined) {
      this.config.enableSemanticHead = config.enableSemanticHead
    }
    if (config.weights) {
      this.config.weights = { ...this.config.weights, ...config.weights }
    }
    if (config.targetRatio !== undefined) {
      this.config.targetRatio = config.targetRatio
    }
    if (config.maxOutputTokens !== undefined) {
      this.config.maxOutputTokens = config.maxOutputTokens
    }

    // Reinitialize API client if needed
    if (this.config.apiKey && this.config.enableSemanticHead) {
      this.apiClient = createApiClient({
        apiKey: this.config.apiKey,
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 500,
        temperature: 0.3,
      })
    }
    else {
      this.apiClient = null
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<MultiHeadCompressorConfig> {
    return { ...this.config }
  }

  /**
   * Check if API is available
   */
  hasApiAccess(): boolean {
    return this.apiClient !== null
  }
}

/**
 * Create multi-head compressor instance
 */
export function createMultiHeadCompressor(
  config?: MultiHeadCompressorConfig,
): MultiHeadCompressor {
  return new MultiHeadCompressor(config)
}

/**
 * Intelligent Fusion Layer
 *
 * Combines Layered Memory and Multi-Head Compressor into a unified
 * context optimization system. This is the main entry point for
 * the advanced context compression features.
 *
 * Key Features:
 * - Automatic project structure scanning
 * - Pattern learning from usage
 * - Intelligent context retrieval
 * - Multi-head compression with Haiku
 * - Zero-config operation
 */

import type { FCSummary } from '../../types/context'
import type {
  CodePattern,
  CommandTemplate,
  DecisionRecord,
  LayeredMemoryManager,
  ProjectNode,
} from './layered-memory'
import type {
  CompressedOutput,
  FileContext,
  MultiHeadCompressor,
  RawContext,
} from './multi-head-compressor'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'pathe'
import { createLayeredMemoryManager } from './layered-memory'
import { createMultiHeadCompressor } from './multi-head-compressor'
import { estimateTokens } from './token-estimator'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Fusion system configuration
 */
export interface FusionConfig {
  /** API key for Haiku (optional, uses env if not provided) */
  apiKey?: string
  /** Enable automatic project scanning */
  autoScan?: boolean
  /** Enable pattern learning */
  learnPatterns?: boolean
  /** Maximum depth for project scanning */
  maxScanDepth?: number
  /** Directories to ignore during scanning */
  ignoreDirs?: string[]
  /** File extensions to track */
  trackExtensions?: string[]
  /** Context threshold (0-1) to trigger compression */
  compressionThreshold?: number
  /** Maximum context tokens */
  maxContextTokens?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Optimized context result
 */
export interface OptimizedContext {
  /** The optimized context string */
  content: string
  /** Token count */
  tokens: number
  /** Compression ratio achieved */
  compressionRatio: number
  /** Source breakdown */
  sources: {
    static: number
    session: number
    dynamic: number
    compressed: number
  }
  /** Timestamp */
  timestamp: Date
}

/**
 * Context optimization request
 */
export interface OptimizationRequest {
  /** Current query/task */
  query?: string
  /** Target token budget */
  targetTokens?: number
  /** Include static knowledge */
  includeStatic?: boolean
  /** Include session context */
  includeSession?: boolean
  /** Include dynamic context */
  includeDynamic?: boolean
  /** Force compression even if under threshold */
  forceCompress?: boolean
}

/**
 * Learning event for pattern detection
 */
export interface LearningEvent {
  type: 'command' | 'file' | 'pattern' | 'decision'
  data: Record<string, unknown>
  timestamp: Date
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<FusionConfig> = {
  apiKey: '',
  autoScan: true,
  learnPatterns: true,
  maxScanDepth: 4,
  ignoreDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    '__pycache__',
    'venv',
    '.venv',
  ],
  trackExtensions: [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.vue',
    '.svelte',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.kt',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
    '.md',
    '.mdx',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.xml',
  ],
  compressionThreshold: 0.8,
  maxContextTokens: 200000,
  debug: false,
}

// ============================================================================
// Intelligent Fusion Manager
// ============================================================================

/**
 * Intelligent Fusion Manager
 *
 * The main orchestrator that combines all advanced context compression
 * features into a single, easy-to-use interface.
 */
export class IntelligentFusionManager {
  private config: Required<FusionConfig>
  private memoryManager: LayeredMemoryManager
  private compressor: MultiHeadCompressor
  private projectPath: string | null = null
  private isScanning = false
  private lastScanTime: Date | null = null
  private learningQueue: LearningEvent[] = []

  constructor(config: FusionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Initialize subsystems
    this.memoryManager = createLayeredMemoryManager({
      maxRecentFCs: 50,
      maxActiveFiles: 20,
      maxDecisionHistory: 100,
    })

    this.compressor = createMultiHeadCompressor({
      apiKey: this.config.apiKey,
      enableSemanticHead: true,
    })
  }

  // ==========================================================================
  // Initialization & Project Setup
  // ==========================================================================

  /**
   * Initialize with a project path
   */
  async initialize(projectPath: string): Promise<void> {
    this.projectPath = projectPath
    this.debug(`Initializing fusion manager for: ${projectPath}`)

    // Start session in memory manager
    this.memoryManager.startSession(projectPath)

    // Auto-scan project structure if enabled
    if (this.config.autoScan) {
      await this.scanProject()
    }

    this.debug('Fusion manager initialized')
  }

  /**
   * Scan project structure
   */
  async scanProject(): Promise<ProjectNode | null> {
    if (!this.projectPath || this.isScanning) {
      return null
    }

    this.isScanning = true
    this.debug('Starting project scan...')

    try {
      const structure = await this.scanDirectory(this.projectPath, 0)
      this.memoryManager.updateProjectStructure(structure)
      this.lastScanTime = new Date()
      this.debug(`Project scan complete: ${this.countNodes(structure)} nodes`)
      return structure
    }
    catch (error) {
      this.debug(`Project scan failed: ${error}`)
      return null
    }
    finally {
      this.isScanning = false
    }
  }

  /**
   * Recursively scan directory
   */
  private async scanDirectory(dirPath: string, depth: number): Promise<ProjectNode> {
    const name = dirPath.split('/').pop() || dirPath

    if (depth > this.config.maxScanDepth) {
      return { path: dirPath, name, type: 'directory' }
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })
      const children: ProjectNode[] = []

      for (const entry of entries) {
        // Skip ignored directories
        if (entry.isDirectory() && this.config.ignoreDirs.includes(entry.name)) {
          continue
        }

        // Skip hidden files/dirs (except specific ones)
        if (entry.name.startsWith('.') && !['src', '.github'].includes(entry.name)) {
          continue
        }

        const childPath = join(dirPath, entry.name)

        if (entry.isDirectory()) {
          const childNode = await this.scanDirectory(childPath, depth + 1)
          children.push(childNode)
        }
        else if (entry.isFile()) {
          const ext = this.getExtension(entry.name)
          if (this.config.trackExtensions.includes(ext)) {
            try {
              const stats = await stat(childPath)
              children.push({
                path: childPath,
                name: entry.name,
                type: 'file',
                metadata: {
                  extension: ext,
                  size: stats.size,
                  lastModified: stats.mtimeMs,
                },
              })
            }
            catch {
              children.push({
                path: childPath,
                name: entry.name,
                type: 'file',
                metadata: { extension: ext },
              })
            }
          }
        }
      }

      return {
        path: dirPath,
        name,
        type: 'directory',
        children: children.sort((a, b) => {
          if (a.type === b.type)
            return a.name.localeCompare(b.name)
          return a.type === 'directory' ? -1 : 1
        }),
      }
    }
    catch {
      return { path: dirPath, name, type: 'directory' }
    }
  }

  /**
   * Get file extension
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot > 0 ? filename.substring(lastDot) : ''
  }

  /**
   * Count nodes in project structure
   */
  private countNodes(node: ProjectNode): number {
    let count = 1
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child)
      }
    }
    return count
  }

  // ==========================================================================
  // Context Tracking
  // ==========================================================================

  /**
   * Track a function call
   */
  trackFunctionCall(fc: FCSummary): void {
    this.memoryManager.addFunctionCall(fc)

    // Learn patterns if enabled
    if (this.config.learnPatterns) {
      this.learnFromFunctionCall(fc)
    }
  }

  /**
   * Track file access
   */
  trackFileAccess(filePath: string, action: 'read' | 'write' | 'edit' | 'delete'): void {
    this.memoryManager.markFileActive(filePath)

    // Learn patterns if enabled
    if (this.config.learnPatterns) {
      this.learningQueue.push({
        type: 'file',
        data: { path: filePath, action },
        timestamp: new Date(),
      })
    }
  }

  /**
   * Track command execution
   */
  trackCommand(command: string, description: string): void {
    const template: CommandTemplate = {
      id: this.hashString(command),
      command,
      description,
      frequency: 1,
      lastUsed: new Date(),
    }
    this.memoryManager.addCommandTemplate(template)
  }

  /**
   * Track decision
   */
  trackDecision(context: string, decision: string, tags: string[]): string {
    return this.memoryManager.addPendingDecision({
      context,
      decision,
      outcome: 'pending',
      tags,
    })
  }

  /**
   * Resolve a tracked decision
   */
  resolveDecision(id: string, outcome: 'success' | 'failure'): void {
    this.memoryManager.resolveDecision(id, outcome)
  }

  /**
   * Track error
   */
  trackError(type: string, message: string, file?: string, line?: number): void {
    this.memoryManager.addError({ type, message, file, line })
  }

  /**
   * Set current goal
   */
  setGoal(goal: string): void {
    this.memoryManager.setCurrentGoal(goal)
  }

  /**
   * Push task to stack
   */
  pushTask(task: string): void {
    this.memoryManager.pushTask(task)
  }

  /**
   * Pop task from stack
   */
  popTask(): string | undefined {
    return this.memoryManager.popTask()
  }

  // ==========================================================================
  // Context Optimization
  // ==========================================================================

  /**
   * Get optimized context for current state
   */
  async getOptimizedContext(request: OptimizationRequest = {}): Promise<OptimizedContext> {
    const {
      query = '',
      targetTokens = 2000,
      includeStatic = true,
      includeSession = true,
      includeDynamic = true,
      forceCompress = false,
    } = request

    this.debug(`Getting optimized context (target: ${targetTokens} tokens)`)

    // Get layered memory context
    const memoryContext = this.memoryManager.retrieveRelevantContext(query, targetTokens)

    // Build parts based on request
    const parts: string[] = []
    const sources = { static: 0, session: 0, dynamic: 0, compressed: 0 }

    if (includeStatic && memoryContext.staticSummary) {
      parts.push(memoryContext.staticSummary)
      sources.static = estimateTokens(memoryContext.staticSummary)
    }

    if (includeSession && memoryContext.sessionSummary) {
      parts.push(memoryContext.sessionSummary)
      sources.session = estimateTokens(memoryContext.sessionSummary)
    }

    if (includeDynamic && memoryContext.dynamicSummary) {
      parts.push(memoryContext.dynamicSummary)
      sources.dynamic = estimateTokens(memoryContext.dynamicSummary)
    }

    const content = parts.join('\n\n')
    const tokens = estimateTokens(content)

    // Check if compression is needed
    const needsCompression = forceCompress || tokens > targetTokens

    if (needsCompression) {
      this.debug('Compression needed, running multi-head compressor')
      const compressed = await this.compressContext()
      sources.compressed = compressed.compressedTokens

      return {
        content: compressed.content,
        tokens: compressed.compressedTokens,
        compressionRatio: compressed.compressionRatio,
        sources,
        timestamp: new Date(),
      }
    }

    return {
      content,
      tokens,
      compressionRatio: 1.0,
      sources,
      timestamp: new Date(),
    }
  }

  /**
   * Compress current context using multi-head compressor
   */
  async compressContext(): Promise<CompressedOutput> {
    // Build raw context from memory
    const rawContext = this.buildRawContext()

    // Run compression
    return this.compressor.compress(rawContext)
  }

  /**
   * Build raw context from memory manager
   */
  private buildRawContext(): RawContext {
    const memory = this.memoryManager.getMemory()

    // Convert active files to FileContext
    const files: FileContext[] = Array.from(memory.session.activeFiles).map(path => ({
      path,
      action: 'read' as const,
    }))

    return {
      functionCalls: memory.session.recentFCs,
      files,
      userMessages: [], // Would be populated from actual conversation
      assistantResponses: [],
      errors: memory.dynamic.errorContext.map(e => `[${e.type}] ${e.message}`),
      currentGoal: memory.session.currentGoal,
    }
  }

  /**
   * Check if compression should be triggered
   */
  shouldCompress(): boolean {
    const totalTokens = this.estimateCurrentTokens()
    const threshold = this.config.compressionThreshold * this.config.maxContextTokens

    return totalTokens > threshold
  }

  /**
   * Estimate current token usage
   */
  estimateCurrentTokens(): number {
    const memory = this.memoryManager.getMemory()
    let total = 0

    // Function calls
    for (const fc of memory.session.recentFCs) {
      total += fc.tokens
    }

    // Active files (rough estimate)
    total += memory.session.activeFiles.size * 50

    // Dynamic context
    total += memory.dynamic.errorContext.length * 30
    total += memory.dynamic.pendingDecisions.length * 50
    total += memory.dynamic.taskStack.length * 20

    return total
  }

  // ==========================================================================
  // Pattern Learning
  // ==========================================================================

  /**
   * Learn patterns from function call
   */
  private learnFromFunctionCall(fc: FCSummary): void {
    // Detect code patterns
    const patterns = this.detectPatterns(fc)
    for (const pattern of patterns) {
      this.memoryManager.addCodePattern(pattern)
    }
  }

  /**
   * Detect patterns from function call
   */
  private detectPatterns(fc: FCSummary): CodePattern[] {
    const patterns: CodePattern[] = []
    const summary = fc.summary.toLowerCase()

    // Detect import patterns
    if (summary.includes('import') || summary.includes('require')) {
      patterns.push({
        id: 'import-pattern',
        name: 'Import Statement',
        description: 'Module import detected',
        pattern: 'import|require',
        category: 'import',
        frequency: 1,
        examples: [fc.summary],
      })
    }

    // Detect export patterns
    if (summary.includes('export')) {
      patterns.push({
        id: 'export-pattern',
        name: 'Export Statement',
        description: 'Module export detected',
        pattern: 'export',
        category: 'export',
        frequency: 1,
        examples: [fc.summary],
      })
    }

    // Detect function patterns
    if (summary.includes('function') || summary.includes('const') || summary.includes('async')) {
      patterns.push({
        id: 'function-pattern',
        name: 'Function Definition',
        description: 'Function definition detected',
        pattern: 'function|const.*=>|async',
        category: 'function',
        frequency: 1,
        examples: [fc.summary],
      })
    }

    // Detect test patterns
    if (summary.includes('test') || summary.includes('spec') || summary.includes('describe')) {
      patterns.push({
        id: 'test-pattern',
        name: 'Test Code',
        description: 'Test code detected',
        pattern: 'test|spec|describe|it\\(',
        category: 'test',
        frequency: 1,
        examples: [fc.summary],
      })
    }

    // Detect config patterns
    if (summary.includes('config') || summary.includes('setting') || summary.includes('.json')) {
      patterns.push({
        id: 'config-pattern',
        name: 'Configuration',
        description: 'Configuration change detected',
        pattern: 'config|setting|\\.json',
        category: 'config',
        frequency: 1,
        examples: [fc.summary],
      })
    }

    return patterns
  }

  /**
   * Process learning queue
   */
  async processLearningQueue(): Promise<void> {
    while (this.learningQueue.length > 0) {
      const event = this.learningQueue.shift()!
      await this.processLearningEvent(event)
    }
  }

  /**
   * Process single learning event
   */
  private async processLearningEvent(event: LearningEvent): Promise<void> {
    switch (event.type) {
      case 'file': {
        const { path, action } = event.data as { path: string, action: string }
        // Could analyze file content for patterns
        this.debug(`Learning from file ${action}: ${path}`)
        break
      }
      case 'command': {
        const { command, description } = event.data as { command: string, description: string }
        this.trackCommand(command, description)
        break
      }
      case 'pattern': {
        const pattern = event.data as unknown as CodePattern
        this.memoryManager.addCodePattern(pattern)
        break
      }
      case 'decision': {
        const decision = event.data as Omit<DecisionRecord, 'id' | 'timestamp'>
        this.memoryManager.addPendingDecision(decision)
        break
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Hash string for ID generation
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Debug logging
   */
  private debug(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[IntelligentFusion]', ...args)
    }
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  /**
   * Export state for persistence
   */
  exportState(): Record<string, unknown> {
    return {
      config: this.config,
      projectPath: this.projectPath,
      lastScanTime: this.lastScanTime?.toISOString(),
      memory: this.memoryManager.export(),
    }
  }

  /**
   * Import state from persistence
   */
  importState(state: Record<string, unknown>): void {
    if (state.config) {
      this.config = { ...DEFAULT_CONFIG, ...state.config as FusionConfig }
    }
    if (state.projectPath) {
      this.projectPath = state.projectPath as string
    }
    if (state.lastScanTime) {
      this.lastScanTime = new Date(state.lastScanTime as string)
    }
    if (state.memory) {
      this.memoryManager.import(state.memory as Record<string, unknown>)
    }
  }

  /**
   * Get memory manager (for advanced usage)
   */
  getMemoryManager(): LayeredMemoryManager {
    return this.memoryManager
  }

  /**
   * Get compressor (for advanced usage)
   */
  getCompressor(): MultiHeadCompressor {
    return this.compressor
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.memoryManager.clear()
    this.projectPath = null
    this.lastScanTime = null
    this.learningQueue = []
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FusionConfig>): void {
    this.config = { ...this.config, ...config }

    // Update compressor if API key changed
    if (config.apiKey !== undefined) {
      this.compressor.updateConfig({ apiKey: config.apiKey })
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<FusionConfig> {
    return { ...this.config }
  }
}

/**
 * Create intelligent fusion manager instance
 */
export function createIntelligentFusionManager(
  config?: FusionConfig,
): IntelligentFusionManager {
  return new IntelligentFusionManager(config)
}

/**
 * Global fusion manager instance (singleton)
 */
let globalFusionManager: IntelligentFusionManager | null = null

/**
 * Get global fusion manager instance
 */
export function getFusionManager(config?: FusionConfig): IntelligentFusionManager {
  if (!globalFusionManager) {
    globalFusionManager = new IntelligentFusionManager(config)
  }
  return globalFusionManager
}

/**
 * Reset global fusion manager
 */
export function resetFusionManager(): void {
  if (globalFusionManager) {
    globalFusionManager.clear()
    globalFusionManager = null
  }
}

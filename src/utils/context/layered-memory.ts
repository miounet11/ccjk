/**
 * Layered Memory System (Engram-Inspired)
 *
 * Implements a three-layer memory architecture:
 * - L1: Static Knowledge (O(1) lookup) - Project structure, code patterns
 * - L2: Session Cache - Recent function calls, active files
 * - L3: Dynamic Context - Real-time decisions, error context
 *
 * This design is inspired by DeepSeek's Engram paper which separates
 * static knowledge retrieval from dynamic reasoning.
 */

import type { FCSummary } from '../../types/context'
import { createHash } from 'node:crypto'
import { extname } from 'pathe'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Project structure node
 */
export interface ProjectNode {
  path: string
  name: string
  type: 'file' | 'directory'
  children?: ProjectNode[]
  metadata?: {
    extension?: string
    size?: number
    lastModified?: number
  }
}

/**
 * Code pattern definition
 */
export interface CodePattern {
  id: string
  name: string
  description: string
  pattern: string // Regex or glob pattern
  category: 'import' | 'export' | 'function' | 'class' | 'config' | 'test' | 'other'
  frequency: number // How often this pattern appears
  examples: string[] // Example usages
}

/**
 * Command template
 */
export interface CommandTemplate {
  id: string
  command: string
  description: string
  frequency: number
  lastUsed: Date
  args?: Record<string, string>
}

/**
 * Decision record
 */
export interface DecisionRecord {
  id: string
  timestamp: Date
  context: string
  decision: string
  outcome: 'success' | 'failure' | 'pending'
  tags: string[]
}

/**
 * L1: Static Knowledge Layer
 * Pre-computed, O(1) lookup
 */
export interface StaticKnowledge {
  projectStructure: ProjectNode | null
  codePatterns: Map<string, CodePattern>
  commandTemplates: Map<string, CommandTemplate>
  decisionIndex: Map<string, DecisionRecord[]>
  lastUpdated: Date
}

/**
 * L2: Session Cache Layer
 * Current session context
 */
export interface SessionCache {
  recentFCs: FCSummary[]
  activeFiles: Set<string>
  currentGoal: string
  workingDirectory: string
  sessionStartTime: Date
}

/**
 * L3: Dynamic Context Layer
 * Real-time, frequently changing
 */
export interface DynamicContext {
  pendingDecisions: DecisionRecord[]
  errorContext: ErrorInfo[]
  currentTask: string
  taskStack: string[]
}

/**
 * Error information
 */
export interface ErrorInfo {
  timestamp: Date
  type: string
  message: string
  file?: string
  line?: number
  resolved: boolean
}

/**
 * Complete layered memory structure
 */
export interface LayeredMemory {
  static: StaticKnowledge
  session: SessionCache
  dynamic: DynamicContext
}

/**
 * Compressed context output
 */
export interface CompressedContext {
  staticSummary: string
  sessionSummary: string
  dynamicSummary: string
  totalTokens: number
  compressionRatio: number
}

/**
 * Relevance score for context retrieval
 */
export interface RelevanceScore {
  score: number
  source: 'static' | 'session' | 'dynamic'
  reason: string
}

// ============================================================================
// Layered Memory Manager
// ============================================================================

/**
 * Layered Memory Manager
 *
 * Manages the three-layer memory system with intelligent retrieval
 * and automatic maintenance.
 */
export class LayeredMemoryManager {
  private memory: LayeredMemory
  private maxRecentFCs: number
  private maxActiveFiles: number
  private maxDecisionHistory: number

  constructor(options: {
    maxRecentFCs?: number
    maxActiveFiles?: number
    maxDecisionHistory?: number
  } = {}) {
    this.maxRecentFCs = options.maxRecentFCs ?? 50
    this.maxActiveFiles = options.maxActiveFiles ?? 20
    this.maxDecisionHistory = options.maxDecisionHistory ?? 100

    // Initialize empty memory
    this.memory = this.createEmptyMemory()
  }

  /**
   * Create empty memory structure
   */
  private createEmptyMemory(): LayeredMemory {
    return {
      static: {
        projectStructure: null,
        codePatterns: new Map(),
        commandTemplates: new Map(),
        decisionIndex: new Map(),
        lastUpdated: new Date(),
      },
      session: {
        recentFCs: [],
        activeFiles: new Set(),
        currentGoal: '',
        workingDirectory: '',
        sessionStartTime: new Date(),
      },
      dynamic: {
        pendingDecisions: [],
        errorContext: [],
        currentTask: '',
        taskStack: [],
      },
    }
  }

  // ==========================================================================
  // L1: Static Knowledge Operations
  // ==========================================================================

  /**
   * Update project structure (called on project scan)
   */
  updateProjectStructure(structure: ProjectNode): void {
    this.memory.static.projectStructure = structure
    this.memory.static.lastUpdated = new Date()
  }

  /**
   * Add or update code pattern
   */
  addCodePattern(pattern: CodePattern): void {
    const existing = this.memory.static.codePatterns.get(pattern.id)
    if (existing) {
      // Update frequency
      pattern.frequency = existing.frequency + 1
      // Merge examples (keep unique, max 5)
      const allExamples = [...new Set([...existing.examples, ...pattern.examples])]
      pattern.examples = allExamples.slice(0, 5)
    }
    this.memory.static.codePatterns.set(pattern.id, pattern)
  }

  /**
   * Add or update command template
   */
  addCommandTemplate(template: CommandTemplate): void {
    const existing = this.memory.static.commandTemplates.get(template.id)
    if (existing) {
      template.frequency = existing.frequency + 1
    }
    template.lastUsed = new Date()
    this.memory.static.commandTemplates.set(template.id, template)
  }

  /**
   * Index a decision for future reference
   */
  indexDecision(decision: DecisionRecord): void {
    // Index by tags
    for (const tag of decision.tags) {
      const existing = this.memory.static.decisionIndex.get(tag) || []
      existing.push(decision)
      // Keep only recent decisions per tag
      if (existing.length > this.maxDecisionHistory) {
        existing.shift()
      }
      this.memory.static.decisionIndex.set(tag, existing)
    }
  }

  /**
   * Lookup static knowledge by key (O(1))
   */
  lookupStatic(key: string): CodePattern | CommandTemplate | DecisionRecord[] | null {
    // Try code patterns
    if (this.memory.static.codePatterns.has(key)) {
      return this.memory.static.codePatterns.get(key)!
    }
    // Try command templates
    if (this.memory.static.commandTemplates.has(key)) {
      return this.memory.static.commandTemplates.get(key)!
    }
    // Try decision index
    if (this.memory.static.decisionIndex.has(key)) {
      return this.memory.static.decisionIndex.get(key)!
    }
    return null
  }

  // ==========================================================================
  // L2: Session Cache Operations
  // ==========================================================================

  /**
   * Start new session
   */
  startSession(workingDirectory: string, goal: string = ''): void {
    this.memory.session = {
      recentFCs: [],
      activeFiles: new Set(),
      currentGoal: goal,
      workingDirectory,
      sessionStartTime: new Date(),
    }
  }

  /**
   * Add function call to session cache
   */
  addFunctionCall(fc: FCSummary): void {
    this.memory.session.recentFCs.push(fc)
    // Trim if exceeds max
    if (this.memory.session.recentFCs.length > this.maxRecentFCs) {
      this.memory.session.recentFCs.shift()
    }
  }

  /**
   * Mark file as active
   */
  markFileActive(filePath: string): void {
    this.memory.session.activeFiles.add(filePath)
    // Trim if exceeds max (remove oldest)
    if (this.memory.session.activeFiles.size > this.maxActiveFiles) {
      const first = this.memory.session.activeFiles.values().next().value
      if (first) {
        this.memory.session.activeFiles.delete(first)
      }
    }
  }

  /**
   * Update current goal
   */
  setCurrentGoal(goal: string): void {
    this.memory.session.currentGoal = goal
  }

  /**
   * Get recent function calls
   */
  getRecentFCs(limit?: number): FCSummary[] {
    const fcs = this.memory.session.recentFCs
    return limit ? fcs.slice(-limit) : fcs
  }

  // ==========================================================================
  // L3: Dynamic Context Operations
  // ==========================================================================

  /**
   * Add pending decision
   */
  addPendingDecision(decision: Omit<DecisionRecord, 'id' | 'timestamp'>): string {
    const id = this.generateId()
    const record: DecisionRecord = {
      ...decision,
      id,
      timestamp: new Date(),
    }
    this.memory.dynamic.pendingDecisions.push(record)
    return id
  }

  /**
   * Resolve pending decision
   */
  resolveDecision(id: string, outcome: 'success' | 'failure'): void {
    const index = this.memory.dynamic.pendingDecisions.findIndex(d => d.id === id)
    if (index !== -1) {
      const decision = this.memory.dynamic.pendingDecisions[index]
      decision.outcome = outcome
      // Move to static index
      this.indexDecision(decision)
      // Remove from pending
      this.memory.dynamic.pendingDecisions.splice(index, 1)
    }
  }

  /**
   * Add error context
   */
  addError(error: Omit<ErrorInfo, 'timestamp' | 'resolved'>): void {
    this.memory.dynamic.errorContext.push({
      ...error,
      timestamp: new Date(),
      resolved: false,
    })
    // Keep only recent errors (max 10)
    if (this.memory.dynamic.errorContext.length > 10) {
      this.memory.dynamic.errorContext.shift()
    }
  }

  /**
   * Mark error as resolved
   */
  resolveError(index: number): void {
    if (this.memory.dynamic.errorContext[index]) {
      this.memory.dynamic.errorContext[index].resolved = true
    }
  }

  /**
   * Push task to stack
   */
  pushTask(task: string): void {
    this.memory.dynamic.taskStack.push(task)
    this.memory.dynamic.currentTask = task
  }

  /**
   * Pop task from stack
   */
  popTask(): string | undefined {
    const task = this.memory.dynamic.taskStack.pop()
    this.memory.dynamic.currentTask
      = this.memory.dynamic.taskStack[this.memory.dynamic.taskStack.length - 1] || ''
    return task
  }

  // ==========================================================================
  // Intelligent Retrieval
  // ==========================================================================

  /**
   * Retrieve relevant context based on query
   * Uses semantic matching to find relevant information across all layers
   */
  retrieveRelevantContext(query: string, _maxTokens: number = 2000): CompressedContext {
    const staticSummary = this.retrieveStaticContext(query)
    const sessionSummary = this.retrieveSessionContext(query)
    const dynamicSummary = this.retrieveDynamicContext()

    // Estimate tokens (rough: 1 char ≈ 0.25 tokens for English, 2.5 for Chinese)
    const estimateTokens = (text: string): number => {
      const chineseChars = (text.match(/[\u4E00-\u9FFF]/g) || []).length
      const otherChars = text.length - chineseChars
      return Math.ceil(chineseChars * 2.5 + otherChars * 0.25)
    }

    const staticTokens = estimateTokens(staticSummary)
    const sessionTokens = estimateTokens(sessionSummary)
    const dynamicTokens = estimateTokens(dynamicSummary)
    const totalTokens = staticTokens + sessionTokens + dynamicTokens

    // Calculate compression ratio (assuming original would be 5x larger)
    const estimatedOriginal = totalTokens * 5
    const compressionRatio = totalTokens / estimatedOriginal

    return {
      staticSummary,
      sessionSummary,
      dynamicSummary,
      totalTokens,
      compressionRatio,
    }
  }

  /**
   * Retrieve relevant static context
   */
  private retrieveStaticContext(query: string): string {
    const parts: string[] = []

    // Add project structure summary if available
    if (this.memory.static.projectStructure) {
      parts.push(this.summarizeProjectStructure(this.memory.static.projectStructure))
    }

    // Find relevant code patterns
    const relevantPatterns = this.findRelevantPatterns(query)
    if (relevantPatterns.length > 0) {
      parts.push('## Code Patterns')
      for (const pattern of relevantPatterns.slice(0, 5)) {
        parts.push(`- ${pattern.name}: ${pattern.description}`)
      }
    }

    // Find relevant command templates
    const relevantCommands = this.findRelevantCommands(query)
    if (relevantCommands.length > 0) {
      parts.push('## Frequent Commands')
      for (const cmd of relevantCommands.slice(0, 5)) {
        parts.push(`- \`${cmd.command}\`: ${cmd.description}`)
      }
    }

    // Find relevant decisions
    const relevantDecisions = this.findRelevantDecisions(query)
    if (relevantDecisions.length > 0) {
      parts.push('## Past Decisions')
      for (const decision of relevantDecisions.slice(0, 3)) {
        parts.push(`- ${decision.context}: ${decision.decision} (${decision.outcome})`)
      }
    }

    return parts.join('\n')
  }

  /**
   * Retrieve session context
   */
  private retrieveSessionContext(_query: string): string {
    const parts: string[] = []

    // Current goal
    if (this.memory.session.currentGoal) {
      parts.push(`## Current Goal\n${this.memory.session.currentGoal}`)
    }

    // Active files
    if (this.memory.session.activeFiles.size > 0) {
      parts.push('## Active Files')
      for (const file of this.memory.session.activeFiles) {
        parts.push(`- ${file}`)
      }
    }

    // Recent function calls (summarized)
    const recentFCs = this.memory.session.recentFCs.slice(-10)
    if (recentFCs.length > 0) {
      parts.push('## Recent Actions')
      for (const fc of recentFCs) {
        parts.push(`- ${fc.fcName}: ${fc.summary}`)
      }
    }

    return parts.join('\n')
  }

  /**
   * Retrieve dynamic context
   */
  private retrieveDynamicContext(): string {
    const parts: string[] = []

    // Current task
    if (this.memory.dynamic.currentTask) {
      parts.push(`## Current Task\n${this.memory.dynamic.currentTask}`)
    }

    // Task stack
    if (this.memory.dynamic.taskStack.length > 1) {
      parts.push('## Task Stack')
      for (let i = this.memory.dynamic.taskStack.length - 1; i >= 0; i--) {
        parts.push(`${i + 1}. ${this.memory.dynamic.taskStack[i]}`)
      }
    }

    // Pending decisions
    if (this.memory.dynamic.pendingDecisions.length > 0) {
      parts.push('## Pending Decisions')
      for (const decision of this.memory.dynamic.pendingDecisions) {
        parts.push(`- ${decision.context}: ${decision.decision}`)
      }
    }

    // Unresolved errors
    const unresolvedErrors = this.memory.dynamic.errorContext.filter(e => !e.resolved)
    if (unresolvedErrors.length > 0) {
      parts.push('## Unresolved Errors')
      for (const error of unresolvedErrors) {
        parts.push(`- [${error.type}] ${error.message}${error.file ? ` (${error.file}:${error.line})` : ''}`)
      }
    }

    return parts.join('\n')
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Summarize project structure
   */
  private summarizeProjectStructure(node: ProjectNode, depth: number = 0, maxDepth: number = 3): string {
    if (depth > maxDepth)
      return ''

    const indent = '  '.repeat(depth)
    const lines: string[] = []

    if (node.type === 'directory') {
      lines.push(`${indent}📁 ${node.name}/`)
      if (node.children) {
        // Sort: directories first, then files
        const sorted = [...node.children].sort((a, b) => {
          if (a.type === b.type)
            return a.name.localeCompare(b.name)
          return a.type === 'directory' ? -1 : 1
        })
        for (const child of sorted.slice(0, 10)) { // Limit children
          lines.push(this.summarizeProjectStructure(child, depth + 1, maxDepth))
        }
        if (sorted.length > 10) {
          lines.push(`${indent}  ... and ${sorted.length - 10} more`)
        }
      }
    }
    else {
      const ext = node.metadata?.extension || extname(node.name)
      const icon = this.getFileIcon(ext)
      lines.push(`${indent}${icon} ${node.name}`)
    }

    return lines.filter(l => l).join('\n')
  }

  /**
   * Get file icon based on extension
   */
  private getFileIcon(ext: string): string {
    const icons: Record<string, string> = {
      '.ts': '📘',
      '.tsx': '📘',
      '.js': '📙',
      '.jsx': '📙',
      '.json': '📋',
      '.md': '📝',
      '.css': '🎨',
      '.scss': '🎨',
      '.html': '🌐',
      '.vue': '💚',
      '.py': '🐍',
      '.go': '🔵',
      '.rs': '🦀',
      '.yaml': '⚙️',
      '.yml': '⚙️',
    }
    return icons[ext] || '📄'
  }

  /**
   * Find patterns relevant to query
   */
  private findRelevantPatterns(query: string): CodePattern[] {
    const queryLower = query.toLowerCase()
    const patterns = Array.from(this.memory.static.codePatterns.values())

    return patterns
      .filter(p =>
        p.name.toLowerCase().includes(queryLower)
        || p.description.toLowerCase().includes(queryLower)
        || p.category.toLowerCase().includes(queryLower),
      )
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Find commands relevant to query
   */
  private findRelevantCommands(query: string): CommandTemplate[] {
    const queryLower = query.toLowerCase()
    const commands = Array.from(this.memory.static.commandTemplates.values())

    return commands
      .filter(c =>
        c.command.toLowerCase().includes(queryLower)
        || c.description.toLowerCase().includes(queryLower),
      )
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Find decisions relevant to query
   */
  private findRelevantDecisions(query: string): DecisionRecord[] {
    const queryLower = query.toLowerCase()
    const allDecisions: DecisionRecord[] = []

    for (const decisions of this.memory.static.decisionIndex.values()) {
      allDecisions.push(...decisions)
    }

    return allDecisions
      .filter(d =>
        d.context.toLowerCase().includes(queryLower)
        || d.decision.toLowerCase().includes(queryLower)
        || d.tags.some(t => t.toLowerCase().includes(queryLower)),
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 12)
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Export memory to JSON-serializable format
   */
  export(): Record<string, unknown> {
    return {
      static: {
        projectStructure: this.memory.static.projectStructure,
        codePatterns: Array.from(this.memory.static.codePatterns.entries()),
        commandTemplates: Array.from(this.memory.static.commandTemplates.entries()),
        decisionIndex: Array.from(this.memory.static.decisionIndex.entries()),
        lastUpdated: this.memory.static.lastUpdated.toISOString(),
      },
      session: {
        recentFCs: this.memory.session.recentFCs,
        activeFiles: Array.from(this.memory.session.activeFiles),
        currentGoal: this.memory.session.currentGoal,
        workingDirectory: this.memory.session.workingDirectory,
        sessionStartTime: this.memory.session.sessionStartTime.toISOString(),
      },
      dynamic: this.memory.dynamic,
    }
  }

  /**
   * Import memory from JSON
   */
  import(data: Record<string, unknown>): void {
    const staticData = data.static as Record<string, unknown>
    const sessionData = data.session as Record<string, unknown>
    const dynamicData = data.dynamic as DynamicContext

    this.memory = {
      static: {
        projectStructure: staticData.projectStructure as ProjectNode | null,
        codePatterns: new Map(staticData.codePatterns as [string, CodePattern][]),
        commandTemplates: new Map(staticData.commandTemplates as [string, CommandTemplate][]),
        decisionIndex: new Map(staticData.decisionIndex as [string, DecisionRecord[]][]),
        lastUpdated: new Date(staticData.lastUpdated as string),
      },
      session: {
        recentFCs: sessionData.recentFCs as FCSummary[],
        activeFiles: new Set(sessionData.activeFiles as string[]),
        currentGoal: sessionData.currentGoal as string,
        workingDirectory: sessionData.workingDirectory as string,
        sessionStartTime: new Date(sessionData.sessionStartTime as string),
      },
      dynamic: dynamicData,
    }
  }

  /**
   * Get raw memory (for testing/debugging)
   */
  getMemory(): LayeredMemory {
    return this.memory
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.memory = this.createEmptyMemory()
  }
}

/**
 * Create layered memory manager instance
 */
export function createLayeredMemoryManager(options?: {
  maxRecentFCs?: number
  maxActiveFiles?: number
  maxDecisionHistory?: number
}): LayeredMemoryManager {
  return new LayeredMemoryManager(options)
}

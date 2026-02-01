/**
 * Auto-Compact Hook
 *
 * Monitors for upstream service errors and context overflow indicators,
 * automatically triggering the /compact command when needed.
 *
 * @module core/auto-compact-hook
 */

import type { HookContext, HookPhase, HookResult, LifecycleHook } from './lifecycle-hooks'
import { i18n } from '../i18n'

/**
 * Error patterns that indicate context overflow or service issues
 */
export interface ErrorPattern {
  /** Pattern name for identification */
  name: string
  /** Regular expression to match the error */
  pattern: RegExp
  /** Severity level: 'warning' triggers notification, 'critical' triggers auto-compact */
  severity: 'warning' | 'critical'
  /** Description of what this pattern detects */
  description: string
}

/**
 * Configuration options for AutoCompactHook
 */
export interface AutoCompactHookOptions {
  /** Whether to automatically trigger compact on critical errors */
  autoTrigger?: boolean
  /** Minimum interval between auto-compact triggers (in milliseconds) */
  cooldownMs?: number
  /** Custom error patterns to detect */
  customPatterns?: ErrorPattern[]
  /** Callback for user notifications */
  onNotify?: (message: string, level: 'info' | 'warning' | 'error') => void
  /** Callback when compact is triggered */
  onCompactTrigger?: () => Promise<void>
}

/**
 * Detection result from error analysis
 */
export interface DetectionResult {
  /** Whether an error was detected */
  detected: boolean
  /** The pattern that matched, if any */
  matchedPattern?: ErrorPattern
  /** The matched text from the output */
  matchedText?: string
  /** Timestamp of detection */
  timestamp: number
}

/**
 * Statistics for the auto-compact hook
 */
export interface AutoCompactStats {
  /** Total number of errors detected */
  totalDetections: number
  /** Number of auto-compact triggers */
  compactTriggers: number
  /** Last detection timestamp */
  lastDetection?: number
  /** Last compact trigger timestamp */
  lastCompactTrigger?: number
  /** Detection counts by pattern name */
  detectionsByPattern: Record<string, number>
}

/**
 * Default error patterns for context overflow detection
 */
const DEFAULT_ERROR_PATTERNS: ErrorPattern[] = [
  {
    name: 'improperly_formed_request',
    pattern: /improperly\s+formed\s+request/i,
    severity: 'critical',
    description: 'Upstream service rejected request due to malformed data',
  },
  {
    name: 'context_length_exceeded',
    pattern: /context\s+length\s+exceeded|maximum\s+context\s+length/i,
    severity: 'critical',
    description: 'Context window has exceeded maximum allowed length',
  },
  {
    name: 'token_limit_exceeded',
    pattern: /token\s+limit\s+exceeded|too\s+many\s+tokens/i,
    severity: 'critical',
    description: 'Token count has exceeded the model limit',
  },
  {
    name: 'request_too_large',
    pattern: /request\s+(?:is\s+)?too\s+large|payload\s+too\s+large/i,
    severity: 'critical',
    description: 'Request payload exceeds size limits',
  },
  {
    name: 'context_window_full',
    pattern: /context\s+window\s+(?:is\s+)?full|no\s+(?:more\s+)?room\s+in\s+context/i,
    severity: 'critical',
    description: 'Context window is completely full',
  },
  {
    name: 'truncation_warning',
    pattern: /(?:input|context)\s+(?:was\s+)?truncated|truncating\s+(?:input|context)/i,
    severity: 'warning',
    description: 'Input or context was truncated to fit limits',
  },
  {
    name: 'approaching_limit',
    pattern: /approaching\s+(?:context|token)\s+limit|(?:context|token)\s+limit\s+approaching/i,
    severity: 'warning',
    description: 'Context or token usage is approaching the limit',
  },
  {
    name: 'rate_limit_context',
    pattern: /rate\s+limit.*context|context.*rate\s+limit/i,
    severity: 'warning',
    description: 'Rate limiting related to context size',
  },
]

/**
 * Default cooldown period between auto-compact triggers (5 minutes)
 */
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000

/**
 * AutoCompactHook monitors for upstream service errors and context overflow,
 * automatically triggering the /compact command when critical issues are detected.
 *
 * @example
 * ```typescript
 * const hook = new AutoCompactHook({
 *   autoTrigger: true,
 *   onNotify: (msg, level) => console.log(`[${level}] ${msg}`),
 *   onCompactTrigger: async () => {
 *     // Execute /compact command
 *   },
 * })
 *
 * // Detect errors in output
 * const result = hook.detectError(outputText)
 * if (result.detected && hook.shouldTriggerCompact()) {
 *   await hook.triggerCompact()
 * }
 * ```
 */
export class AutoCompactHook implements LifecycleHook {
  readonly name = 'auto-compact'
  readonly phase: HookPhase = 'post-execution'
  readonly priority = 100 // High priority for error detection
  enabled = true

  private options: Required<AutoCompactHookOptions>
  private patterns: ErrorPattern[]
  private stats: AutoCompactStats
  private lastDetection: DetectionResult | null = null
  private isCompacting = false

  constructor(options: AutoCompactHookOptions = {}) {
    this.options = {
      autoTrigger: options.autoTrigger ?? true,
      cooldownMs: options.cooldownMs ?? DEFAULT_COOLDOWN_MS,
      customPatterns: options.customPatterns ?? [],
      onNotify: options.onNotify ?? this.defaultNotify.bind(this),
      onCompactTrigger: options.onCompactTrigger ?? this.defaultCompactTrigger.bind(this),
    }

    // Combine default patterns with custom patterns
    this.patterns = [...DEFAULT_ERROR_PATTERNS, ...this.options.customPatterns]

    // Initialize statistics
    this.stats = {
      totalDetections: 0,
      compactTriggers: 0,
      detectionsByPattern: {},
    }
  }

  /**
   * Lifecycle hook execution method
   * Called by the lifecycle hook system
   *
   * Note: This hook processes output from the metadata.output field
   * which should be set by the caller when invoking the hook.
   */
  async execute(context: HookContext): Promise<HookResult> {
    // Extract output from metadata if available
    const output = context.metadata?.output as string | undefined

    if (!output || typeof output !== 'string') {
      return { success: true }
    }

    const detection = this.detectError(output)

    if (!detection.detected) {
      return { success: true }
    }

    // Notify user about the detection
    this.notifyDetection(detection)

    // Check if we should auto-trigger compact
    if (this.options.autoTrigger && this.shouldTriggerCompact()) {
      try {
        await this.triggerCompact()
        return {
          success: true,
          data: {
            compactTriggered: true,
            pattern: detection.matchedPattern?.name,
          },
        }
      }
      catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }
      }
    }

    return {
      success: true,
      data: {
        detected: true,
        pattern: detection.matchedPattern?.name,
        autoTriggerSkipped: !this.shouldTriggerCompact(),
      },
    }
  }

  /**
   * Detect errors in the output text
   *
   * @param output - The output text to analyze
   * @returns Detection result with matched pattern information
   */
  detectError(output: string): DetectionResult {
    if (!output || typeof output !== 'string') {
      return {
        detected: false,
        timestamp: Date.now(),
      }
    }

    // Check each pattern for matches
    for (const pattern of this.patterns) {
      const match = output.match(pattern.pattern)
      if (match) {
        const result: DetectionResult = {
          detected: true,
          matchedPattern: pattern,
          matchedText: match[0],
          timestamp: Date.now(),
        }

        // Update statistics
        this.stats.totalDetections++
        this.stats.lastDetection = result.timestamp
        this.stats.detectionsByPattern[pattern.name]
          = (this.stats.detectionsByPattern[pattern.name] || 0) + 1

        // Store last detection
        this.lastDetection = result

        return result
      }
    }

    return {
      detected: false,
      timestamp: Date.now(),
    }
  }

  /**
   * Determine if compact should be triggered based on cooldown and conditions
   *
   * @returns True if compact should be triggered
   */
  shouldTriggerCompact(): boolean {
    // Don't trigger if already compacting
    if (this.isCompacting) {
      return false
    }

    // Don't trigger if no detection
    if (!this.lastDetection?.detected) {
      return false
    }

    // Only trigger for critical severity
    if (this.lastDetection.matchedPattern?.severity !== 'critical') {
      return false
    }

    // Check cooldown period
    if (this.stats.lastCompactTrigger) {
      const timeSinceLastTrigger = Date.now() - this.stats.lastCompactTrigger
      if (timeSinceLastTrigger < this.options.cooldownMs) {
        return false
      }
    }

    return true
  }

  /**
   * Trigger the compact command
   *
   * @throws Error if compact trigger fails
   */
  async triggerCompact(): Promise<void> {
    if (this.isCompacting) {
      throw new Error(i18n.t('common:autoCompact.alreadyCompacting'))
    }

    this.isCompacting = true

    try {
      // Notify user that compact is being triggered
      this.options.onNotify(
        i18n.t('common:autoCompact.triggeringCompact'),
        'info',
      )

      // Execute the compact trigger callback
      await this.options.onCompactTrigger()

      // Update statistics
      this.stats.compactTriggers++
      this.stats.lastCompactTrigger = Date.now()

      // Notify success
      this.options.onNotify(
        i18n.t('common:autoCompact.compactSuccess'),
        'info',
      )
    }
    catch (error) {
      // Notify failure
      this.options.onNotify(
        i18n.t('common:autoCompact.compactFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
        'error',
      )
      throw error
    }
    finally {
      this.isCompacting = false
    }
  }

  /**
   * Get current statistics
   *
   * @returns Current auto-compact statistics
   */
  getStats(): AutoCompactStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalDetections: 0,
      compactTriggers: 0,
      detectionsByPattern: {},
    }
    this.lastDetection = null
  }

  /**
   * Get the last detection result
   *
   * @returns Last detection result or null
   */
  getLastDetection(): DetectionResult | null {
    return this.lastDetection ? { ...this.lastDetection } : null
  }

  /**
   * Add a custom error pattern
   *
   * @param pattern - The error pattern to add
   */
  addPattern(pattern: ErrorPattern): void {
    // Check for duplicate names
    const existingIndex = this.patterns.findIndex(p => p.name === pattern.name)
    if (existingIndex >= 0) {
      // Replace existing pattern
      this.patterns[existingIndex] = pattern
    }
    else {
      this.patterns.push(pattern)
    }
  }

  /**
   * Remove an error pattern by name
   *
   * @param name - The pattern name to remove
   * @returns True if pattern was removed
   */
  removePattern(name: string): boolean {
    const index = this.patterns.findIndex(p => p.name === name)
    if (index >= 0) {
      this.patterns.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Get all registered patterns
   *
   * @returns Array of error patterns
   */
  getPatterns(): ErrorPattern[] {
    return [...this.patterns]
  }

  /**
   * Update hook options
   *
   * @param options - Partial options to update
   */
  updateOptions(options: Partial<AutoCompactHookOptions>): void {
    if (options.autoTrigger !== undefined) {
      this.options.autoTrigger = options.autoTrigger
    }
    if (options.cooldownMs !== undefined) {
      this.options.cooldownMs = options.cooldownMs
    }
    if (options.onNotify !== undefined) {
      this.options.onNotify = options.onNotify
    }
    if (options.onCompactTrigger !== undefined) {
      this.options.onCompactTrigger = options.onCompactTrigger
    }
    if (options.customPatterns !== undefined) {
      // Re-combine patterns
      this.patterns = [...DEFAULT_ERROR_PATTERNS, ...options.customPatterns]
      this.options.customPatterns = options.customPatterns
    }
  }

  /**
   * Check if the hook is currently in compacting state
   *
   * @returns True if currently compacting
   */
  isCurrentlyCompacting(): boolean {
    return this.isCompacting
  }

  /**
   * Default notification handler
   * Logs to console with appropriate formatting
   */
  private defaultNotify(message: string, level: 'info' | 'warning' | 'error'): void {
    const prefix = {
      info: '[INFO]',
      warning: '[WARN]',
      error: '[ERROR]',
    }[level]

    console.log(`${prefix} ${message}`)
  }

  /**
   * Default compact trigger handler
   * This is a placeholder that should be overridden with actual implementation
   */
  private async defaultCompactTrigger(): Promise<void> {
    // Default implementation logs a warning
    // In production, this should be replaced with actual /compact command execution

    console.warn(i18n.t('common:autoCompact.noCompactHandler'))
  }

  /**
   * Notify user about a detection
   */
  private notifyDetection(detection: DetectionResult): void {
    if (!detection.detected || !detection.matchedPattern) {
      return
    }

    const { matchedPattern, matchedText } = detection
    const level = matchedPattern.severity === 'critical' ? 'error' : 'warning'

    this.options.onNotify(
      i18n.t('common:autoCompact.errorDetected', {
        pattern: matchedPattern.name,
        description: matchedPattern.description,
        text: matchedText,
      }),
      level,
    )
  }
}

/**
 * Create a pre-configured AutoCompactHook instance
 *
 * @param options - Hook options
 * @returns Configured AutoCompactHook instance
 */
export function createAutoCompactHook(options?: AutoCompactHookOptions): AutoCompactHook {
  return new AutoCompactHook(options)
}

/**
 * Export default error patterns for external use
 */
export { DEFAULT_ERROR_PATTERNS }

import type { SupportedLang } from '../../constants'
import ansis from 'ansis'
import { i18n } from '../../i18n'

/**
 * Context Monitor Hook
 * Tracks conversation length and proactively warns users before hitting context limits
 */

interface ContextStats {
  toolCalls: number
  messageCount: number
  lastWarningAt: number
}

const stats: ContextStats = {
  toolCalls: 0,
  messageCount: 0,
  lastWarningAt: 0,
}

// Thresholds
const TOOL_CALL_WARNING_THRESHOLD = 30 // Warn after 30 tool calls
const MESSAGE_WARNING_THRESHOLD = 50 // Warn after 50 messages
const WARNING_COOLDOWN_MS = 5 * 60 * 1000 // Don't warn more than once per 5 minutes

/**
 * Track a tool call
 */
export function trackToolCall(): void {
  stats.toolCalls++
  checkAndWarn()
}

/**
 * Track a message exchange
 */
export function trackMessage(): void {
  stats.messageCount++
  checkAndWarn()
}

/**
 * Check if we should warn the user
 */
function checkAndWarn(): void {
  const now = Date.now()
  const timeSinceLastWarning = now - stats.lastWarningAt

  // Don't warn if we warned recently
  if (timeSinceLastWarning < WARNING_COOLDOWN_MS) {
    return
  }

  // Check if we've hit thresholds
  const shouldWarn
    = stats.toolCalls >= TOOL_CALL_WARNING_THRESHOLD
    || stats.messageCount >= MESSAGE_WARNING_THRESHOLD

  if (shouldWarn) {
    emitWarning()
    stats.lastWarningAt = now
  }
}

/**
 * Emit a context warning to the user
 */
function emitWarning(): void {
  console.log()
  console.log(ansis.yellow(ansis.bold(i18n.t('common:contextWarning.title'))))
  console.log(ansis.gray(i18n.t('common:contextWarning.body', {
    toolCalls: stats.toolCalls,
    messageCount: stats.messageCount,
  })))
  console.log(ansis.cyan(i18n.t('common:contextWarning.suggestion')))
  console.log(ansis.green(i18n.t('common:contextWarning.command')))
  console.log()
}

/**
 * Reset stats (e.g., after user runs /compact)
 */
export function resetStats(): void {
  stats.toolCalls = 0
  stats.messageCount = 0
  stats.lastWarningAt = 0
}

/**
 * Get current stats (for debugging)
 */
export function getStats(): Readonly<ContextStats> {
  return { ...stats }
}

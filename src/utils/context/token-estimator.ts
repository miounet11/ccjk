/**
 * Token Estimator
 * Estimates token count for text with Chinese character support
 */

import type { TokenEstimation } from '../../types/context'

/**
 * Estimate tokens for given text
 * Algorithm:
 * - Chinese characters: ~1.5 chars per token
 * - Other characters: ~4 chars per token
 */
export function estimateTokens(text: string): number {
  const estimation = estimateTokensDetailed(text)
  return estimation.total
}

/**
 * Estimate tokens with detailed breakdown
 */
export function estimateTokensDetailed(text: string): TokenEstimation {
  // Count Chinese characters (CJK Unified Ideographs)
  const chineseChars = (text.match(/[\u4E00-\u9FA5]/g) || []).length
  const otherChars = text.length - chineseChars

  // Calculate tokens
  const chineseTokens = Math.ceil(chineseChars / 1.5)
  const otherTokens = Math.ceil(otherChars / 4)
  const total = chineseTokens + otherTokens

  return {
    total,
    chineseChars,
    otherChars,
  }
}

/**
 * Estimate tokens for JSON object
 */
export function estimateTokensForJSON(obj: any): number {
  const jsonString = JSON.stringify(obj, null, 2)
  return estimateTokens(jsonString)
}

/**
 * Calculate percentage of context used
 */
export function calculateContextUsage(
  currentTokens: number,
  maxTokens: number,
): number {
  return (currentTokens / maxTokens) * 100
}

/**
 * Check if threshold is exceeded
 */
export function isThresholdExceeded(
  currentTokens: number,
  maxTokens: number,
  threshold: number,
): boolean {
  const usage = calculateContextUsage(currentTokens, maxTokens)
  return usage >= threshold * 100
}

/**
 * Get remaining tokens
 */
export function getRemainingTokens(
  currentTokens: number,
  maxTokens: number,
): number {
  return Math.max(0, maxTokens - currentTokens)
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}

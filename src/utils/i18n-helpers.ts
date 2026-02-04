/**
 * I18n Helper Utilities
 *
 * Provides helper functions for handling multilingual data from cloud API
 * @module utils/i18n-helpers
 */

import type { SupportedLang } from '../constants'

/**
 * Multilingual string type - can be a plain string or an object with language keys
 */
export type MultilingualString = string | Record<string, string> | undefined

/**
 * Extract a string value from a multilingual object or plain string
 *
 * Handles various formats returned by cloud API:
 * - Plain string: "Hello"
 * - Multilingual object: { en: "Hello", "zh-CN": "你好" }
 * - Nested object (edge case): { en: { text: "Hello" } }
 *
 * @param val - The value to extract string from
 * @param fallback - Fallback value if extraction fails
 * @param preferredLang - Preferred language (defaults to 'en')
 * @returns Extracted string value
 *
 * @example
 * ```typescript
 * extractString("Hello", "default") // "Hello"
 * extractString({ en: "Hello", "zh-CN": "你好" }, "default") // "Hello"
 * extractString({ en: "Hello", "zh-CN": "你好" }, "default", "zh-CN") // "你好"
 * extractString(undefined, "default") // "default"
 * ```
 */
export function extractString(
  val: MultilingualString,
  fallback: string,
  preferredLang: SupportedLang = 'en',
): string {
  // Handle undefined/null
  if (val === undefined || val === null) {
    return fallback
  }

  // Handle plain string
  if (typeof val === 'string') {
    return val || fallback
  }

  // Handle object with language keys
  if (typeof val === 'object') {
    // Try preferred language first
    const preferred = val[preferredLang]
    if (typeof preferred === 'string' && preferred) {
      return preferred
    }

    // Try common language keys
    const en = val.en || val['en-US']
    if (typeof en === 'string' && en) {
      return en
    }

    const zhCN = val['zh-CN'] || val.zh || val['zh-Hans']
    if (typeof zhCN === 'string' && zhCN) {
      return zhCN
    }

    // Try first available value
    const values = Object.values(val)
    for (const v of values) {
      if (typeof v === 'string' && v) {
        return v
      }
    }
  }

  return fallback
}

/**
 * Extract display name with language preference
 *
 * Similar to extractString but optimized for display purposes
 * with automatic language detection from i18n context
 *
 * @param val - The value to extract string from
 * @param isZh - Whether to prefer Chinese
 * @param fallback - Fallback value (defaults to 'Unknown')
 * @returns Extracted display name
 */
export function extractDisplayName(
  val: MultilingualString,
  isZh: boolean = false,
  fallback: string = 'Unknown',
): string {
  return extractString(val, fallback, isZh ? 'zh-CN' : 'en')
}

/**
 * Normalize a recommendation object from cloud API
 *
 * Ensures all string fields are properly extracted from multilingual objects
 *
 * @param rec - Raw recommendation from cloud API
 * @param preferredLang - Preferred language
 * @returns Normalized recommendation with string fields
 */
export function normalizeRecommendation<T extends Record<string, any>>(
  rec: T,
  preferredLang: SupportedLang = 'en',
): T & { name: string, description: string } {
  return {
    ...rec,
    name: extractString(rec.name, rec.id || 'Unknown', preferredLang),
    description: extractString(rec.description, 'No description available', preferredLang),
  }
}

/**
 * Batch normalize recommendations
 *
 * @param recommendations - Array of raw recommendations
 * @param preferredLang - Preferred language
 * @returns Array of normalized recommendations
 */
export function normalizeRecommendations<T extends Record<string, any>>(
  recommendations: T[],
  preferredLang: SupportedLang = 'en',
): Array<T & { name: string, description: string }> {
  return recommendations.map(rec => normalizeRecommendation(rec, preferredLang))
}

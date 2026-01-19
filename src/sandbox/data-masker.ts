/**
 * Data masking module for sensitive information protection
 */

import type { MaskingOptions, SensitiveFieldPattern } from '../types/sandbox.js'

/**
 * Default masking options
 */
const DEFAULT_MASKING_OPTIONS: Required<MaskingOptions> = {
  showFirst: 4,
  showLast: 4,
  maskChar: '*',
  customPatterns: [],
}

/**
 * Sensitive field patterns to detect
 */
const SENSITIVE_PATTERNS: Record<SensitiveFieldPattern, RegExp> = {
  apiKey: /api[_-]?key/i,
  password: /pass(word|wd)?/i,
  token: /token/i,
  secret: /secret/i,
  credential: /credential/i,
  auth: /^auth$/i,
  bearer: /bearer/i,
  authorization: /authorization/i,
}

/**
 * Email pattern
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/**
 * Data masker class for sensitive information protection
 */
export class DataMasker {
  private options: Required<MaskingOptions>

  constructor(options?: MaskingOptions) {
    this.options = { ...DEFAULT_MASKING_OPTIONS, ...options }
  }

  /**
   * Mask API key (show first 4 and last 4 characters)
   */
  maskApiKey(key: string): string {
    if (!key || key.length <= this.options.showFirst + this.options.showLast) {
      return this.options.maskChar.repeat(8)
    }

    const first = key.slice(0, this.options.showFirst)
    const last = key.slice(-this.options.showLast)
    const maskLength = Math.max(4, key.length - this.options.showFirst - this.options.showLast)

    return `${first}${this.options.maskChar.repeat(maskLength)}${last}`
  }

  /**
   * Mask email address
   */
  maskEmail(email: string): string {
    if (!email || !EMAIL_PATTERN.test(email)) {
      return email
    }

    const [localPart, domain] = email.split('@')
    const maskedLocal = this.maskString(localPart, 2, 1)

    return `${maskedLocal}@${domain}`
  }

  /**
   * Mask a generic string
   */
  maskString(str: string, showFirst = 2, showLast = 2): string {
    if (!str || str.length <= showFirst + showLast) {
      return this.options.maskChar.repeat(Math.max(4, str.length))
    }

    const first = str.slice(0, showFirst)
    const last = str.slice(-showLast)
    const maskLength = str.length - showFirst - showLast

    return `${first}${this.options.maskChar.repeat(maskLength)}${last}`
  }

  /**
   * Check if a field name is sensitive
   */
  isSensitiveField(fieldName: string): boolean {
    // Check against known patterns
    for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
      if (pattern.test(fieldName)) {
        return true
      }
    }

    // Check against custom patterns
    for (const pattern of this.options.customPatterns) {
      if (pattern.test(fieldName)) {
        return true
      }
    }

    return false
  }

  /**
   * Recursively mask sensitive fields in an object
   */
  maskSensitiveFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      return obj
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveFields(item))
    }

    // Handle objects
    const masked: any = {}

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        // Mask sensitive field value
        if (typeof value === 'string') {
          masked[key] = this.maskApiKey(value)
        }
        else {
          masked[key] = '[REDACTED]'
        }
      }
      else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        masked[key] = this.maskSensitiveFields(value)
      }
      else {
        // Keep non-sensitive values as-is
        masked[key] = value
      }
    }

    return masked
  }

  /**
   * Mask URL parameters
   */
  maskUrlParams(url: string): string {
    try {
      const urlObj = new URL(url)
      const params = new URLSearchParams(urlObj.search)

      // Mask sensitive parameters
      for (const [key, value] of params.entries()) {
        if (this.isSensitiveField(key)) {
          params.set(key, this.maskApiKey(value))
        }
      }

      urlObj.search = params.toString()
      return urlObj.toString()
    }
    catch {
      // If URL parsing fails, return original
      return url
    }
  }

  /**
   * Mask headers
   */
  maskHeaders(headers: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {}

    for (const [key, value] of Object.entries(headers)) {
      if (this.isSensitiveField(key)) {
        masked[key] = this.maskApiKey(value)
      }
      else {
        masked[key] = value
      }
    }

    return masked
  }

  /**
   * Update masking options
   */
  updateOptions(options: Partial<MaskingOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current masking options
   */
  getOptions(): Required<MaskingOptions> {
    return { ...this.options }
  }
}

/**
 * Create a default data masker instance
 */
export function createDataMasker(options?: MaskingOptions): DataMasker {
  return new DataMasker(options)
}

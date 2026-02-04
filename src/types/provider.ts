/**
 * Provider Registry Types
 *
 * Type definitions for the quick provider launch feature.
 * Supports cloud-based provider registry for fast API configuration.
 *
 * @module types/provider
 */

// ============================================================================
// Provider Registry Types
// ============================================================================

/**
 * Provider registry entry
 *
 * Represents a registered API provider in the cloud registry.
 */
export interface ProviderRegistry {
  /** Unique shortcode (e.g., "302", "glm", "kimi") */
  shortcode: string
  /** Display name (e.g., "302.AI", "智谱AI") */
  name: string
  /** API base URL */
  apiUrl: string
  /** Optional description */
  description?: string
  /** Recommended models list */
  models?: string[]
  /** Creation timestamp */
  createdAt: string
  /** Creator identifier (optional) */
  createdBy?: string
  /** Whether officially verified */
  verified: boolean
  /** Provider category */
  category?: ProviderCategory
  /** Provider status */
  status?: ProviderStatus
}

/**
 * Provider category
 */
export type ProviderCategory
  = | 'official' // Official providers (Anthropic, OpenAI)
    | 'relay' // Relay/proxy services (302.AI)
    | 'domestic' // Domestic Chinese providers (GLM, Kimi, MiniMax)
    | 'custom' // User-created custom providers

/**
 * Provider status
 */
export type ProviderStatus
  = | 'active' // Active and working
    | 'maintenance' // Under maintenance
    | 'deprecated' // Deprecated, will be removed
    | 'testing' // In testing phase

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Create provider request
 */
export interface CreateProviderInput {
  /** Unique shortcode */
  shortcode: string
  /** Display name */
  name: string
  /** API base URL */
  apiUrl: string
  /** Optional description */
  description?: string
  /** Recommended models */
  models?: string[]
}

/**
 * Provider query response
 */
export interface ProviderQueryResponse {
  success: boolean
  data?: ProviderRegistry
  error?: {
    code: string
    message: string
  }
}

/**
 * Provider create response
 */
export interface ProviderCreateResponse {
  success: boolean
  data?: ProviderRegistry
  error?: {
    code: string
    message: string
  }
}

/**
 * Provider list response
 */
export interface ProviderListResponse {
  success: boolean
  data?: {
    providers: ProviderRegistry[]
    total: number
  }
  error?: {
    code: string
    message: string
  }
}

// ============================================================================
// Quick Launch Types
// ============================================================================

/**
 * Quick launch configuration result
 */
export interface QuickLaunchConfig {
  /** Provider shortcode */
  shortcode: string
  /** Provider info */
  provider: ProviderRegistry
  /** User's API key */
  apiKey: string
  /** Selected model */
  model: string
  /** Target code tool */
  codeTool?: string
}

/**
 * Quick launch options
 */
export interface QuickLaunchOptions {
  /** Skip confirmation prompt */
  skipConfirm?: boolean
  /** Language preference */
  lang?: 'zh-CN' | 'en'
  /** Target code tool type */
  codeTool?: string
}

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Provider error codes
 */
export const ProviderErrorCodes = {
  /** Provider not found */
  NOT_FOUND: 'PROVIDER_NOT_FOUND',
  /** Shortcode already exists */
  SHORTCODE_EXISTS: 'SHORTCODE_EXISTS',
  /** Invalid shortcode format */
  INVALID_SHORTCODE: 'INVALID_SHORTCODE',
  /** Invalid API URL */
  INVALID_API_URL: 'INVALID_API_URL',
  /** Rate limit exceeded */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Network error */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Server error */
  SERVER_ERROR: 'SERVER_ERROR',
} as const

export type ProviderErrorCode = typeof ProviderErrorCodes[keyof typeof ProviderErrorCodes]

// ============================================================================
// Validation
// ============================================================================

/**
 * Shortcode validation rules
 */
export const SHORTCODE_RULES = {
  /** Minimum length */
  minLength: 2,
  /** Maximum length */
  maxLength: 20,
  /** Allowed pattern (lowercase letters, numbers, hyphens) */
  pattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
  /** Reserved shortcodes that cannot be used */
  reserved: [
    'help',
    'menu',
    'init',
    'setup',
    'config',
    'update',
    'doctor',
    'mcp',
    'skills',
    'agents',
    'hooks',
    'api',
    'cloud',
    'system',
    'version',
    'test',
    'debug',
  ],
}

/**
 * Validate shortcode format
 */
export function isValidShortcode(shortcode: string): boolean {
  if (!shortcode)
    return false
  if (shortcode.length < SHORTCODE_RULES.minLength)
    return false
  if (shortcode.length > SHORTCODE_RULES.maxLength)
    return false
  if (!SHORTCODE_RULES.pattern.test(shortcode))
    return false
  if (SHORTCODE_RULES.reserved.includes(shortcode.toLowerCase()))
    return false
  return true
}

/**
 * Validate API URL format
 */
export function isValidApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  }
  catch {
    return false
  }
}

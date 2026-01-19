/**
 * Unified Input Validation Library
 * Provides reusable validation functions for common input types
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate array access safety
 */
export function validateArrayAccess<T>(
  array: T[] | null | undefined,
  index: number,
): ValidationResult {
  if (!Array.isArray(array)) {
    return { valid: false, error: 'Input is not an array' }
  }

  if (index < 0 || index >= array.length) {
    return { valid: false, error: `Index ${index} out of bounds for array of length ${array.length}` }
  }

  return { valid: true }
}

/**
 * Safely access array element
 */
export function safeArrayAccess<T>(
  array: T[] | null | undefined,
  index: number,
  defaultValue?: T,
): T | undefined {
  const validation = validateArrayAccess(array, index)
  if (!validation.valid) {
    return defaultValue
  }
  return array![index]
}

/**
 * Validate object key access
 */
export function validateObjectKeyAccess<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  key: string,
): ValidationResult {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, error: 'Input is not an object' }
  }

  if (!(key in obj)) {
    return { valid: false, error: `Key "${key}" not found in object` }
  }

  return { valid: true }
}

/**
 * Safely access object property
 */
export function safeObjectAccess<T extends Record<string, unknown>, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K],
): T[K] | undefined {
  if (!obj || typeof obj !== 'object') {
    return defaultValue
  }

  return key in obj ? obj[key] : defaultValue
}

/**
 * Validate environment variable name
 */
export function isValidEnvVarName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Environment variable name must be a non-empty string' }
  }

  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) {
    return {
      valid: false,
      error: 'Environment variable name must start with letter or underscore and contain only uppercase letters, numbers, and underscores',
    }
  }

  return { valid: true }
}

/**
 * Sanitize environment variable value
 */
export function sanitizeEnvValue(value: string): string {
  if (!value || typeof value !== 'string') {
    return ''
  }

  // Remove newlines, carriage returns, and null bytes
  return value.replace(/[\n\r\0]/g, '')
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' }
  }

  if (url.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' }
  }

  try {
    const parsed = new URL(url)

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http:// or https://' }
    }

    // Check hostname
    if (!parsed.hostname) {
      return { valid: false, error: 'URL must have a valid hostname' }
    }

    return { valid: true }
  }
  catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Validate file path safety (no directory traversal)
 */
export function isValidFilePath(path: string): ValidationResult {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' }
  }

  // Check for directory traversal attempts
  if (path.includes('..')) {
    return { valid: false, error: 'Path contains directory traversal characters (..)' }
  }

  // Check for null bytes
  if (path.includes('\0')) {
    return { valid: false, error: 'Path contains null bytes' }
  }

  return { valid: true }
}

/**
 * Validate path entry (filename or directory name)
 */
export function isValidPathEntry(entry: string): ValidationResult {
  if (!entry || typeof entry !== 'string') {
    return { valid: false, error: 'Path entry must be a non-empty string' }
  }

  // Check for directory traversal
  if (entry.includes('..') || entry.includes('/') || entry.includes('\\')) {
    return { valid: false, error: 'Path entry contains invalid characters' }
  }

  // Check for null bytes
  if (entry.includes('\0')) {
    return { valid: false, error: 'Path entry contains null bytes' }
  }

  return { valid: true }
}

/**
 * Validate user input string
 */
export function validateUserInput(
  input: string,
  options: {
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    allowedChars?: string
  } = {},
): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input must be a non-empty string' }
  }

  const trimmed = input.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Input cannot be empty' }
  }

  const { minLength = 1, maxLength = 1000, pattern, allowedChars } = options

  if (trimmed.length < minLength) {
    return { valid: false, error: `Input must be at least ${minLength} characters` }
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Input must not exceed ${maxLength} characters` }
  }

  if (pattern && !pattern.test(trimmed)) {
    return { valid: false, error: 'Input contains invalid characters' }
  }

  if (allowedChars) {
    const allowedSet = new Set(allowedChars)
    for (const char of trimmed) {
      if (!allowedSet.has(char)) {
        return { valid: false, error: `Input contains disallowed character: ${char}` }
      }
    }
  }

  return { valid: true }
}

/**
 * Sanitize user input
 */
export function sanitizeUserInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input.trim().slice(0, maxLength)
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: string): ValidationResult {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key must be a non-empty string' }
  }

  if (apiKey.length < 10) {
    return { valid: false, error: 'API key is too short' }
  }

  if (apiKey.length > 500) {
    return { valid: false, error: 'API key is too long' }
  }

  // Check for whitespace characters
  if (/\s/.test(apiKey)) {
    return { valid: false, error: 'API key contains whitespace' }
  }

  return { valid: true }
}

/**
 * Format API key for display (mask sensitive parts)
 */
export function formatApiKeyDisplay(apiKey: string | null | undefined): string {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 12) {
    return '***'
  }

  // Show first 8 and last 4 characters
  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
}

/**
 * Validate configuration object structure
 */
export function validateConfigStructure(
  config: unknown,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>,
): ValidationResult {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Config must be an object' }
  }

  const configObj = config as Record<string, unknown>

  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in configObj)) {
      return { valid: false, error: `Missing required field: ${key}` }
    }

    const value = configObj[key]
    const actualType = Array.isArray(value) ? 'array' : typeof value

    if (actualType !== expectedType) {
      return {
        valid: false,
        error: `Field "${key}" has wrong type. Expected ${expectedType}, got ${actualType}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate array of items
 */
export function validateArray(
  array: unknown,
  validator: (item: unknown) => ValidationResult,
): ValidationResult {
  if (!Array.isArray(array)) {
    return { valid: false, error: 'Input is not an array' }
  }

  for (let i = 0; i < array.length; i++) {
    const result = validator(array[i])
    if (!result.valid) {
      return { valid: false, error: `Item at index ${i}: ${result.error}` }
    }
  }

  return { valid: true }
}

/**
 * Validate enum value
 */
export function isValidEnumValue<T extends string | number>(
  value: unknown,
  allowedValues: T[],
): ValidationResult {
  if (!allowedValues.includes(value as T)) {
    return {
      valid: false,
      error: `Invalid value. Must be one of: ${allowedValues.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Validate port number
 */
export function isValidPort(port: unknown): ValidationResult {
  if (typeof port !== 'number' && typeof port !== 'string') {
    return { valid: false, error: 'Port must be a number or string' }
  }

  const portNum = typeof port === 'string' ? Number.parseInt(port, 10) : port

  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return { valid: false, error: 'Port must be between 1 and 65535' }
  }

  return { valid: true }
}

/**
 * Validate hostname
 */
export function isValidHostname(hostname: string): ValidationResult {
  if (!hostname || typeof hostname !== 'string') {
    return { valid: false, error: 'Hostname must be a non-empty string' }
  }

  if (hostname.length > 253) {
    return { valid: false, error: 'Hostname is too long (max 253 characters)' }
  }

  // Basic hostname validation (case-insensitive)
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(hostname)) {
    return { valid: false, error: 'Invalid hostname format' }
  }

  return { valid: true }
}

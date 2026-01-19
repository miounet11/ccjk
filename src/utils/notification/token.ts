/**
 * CCJK Notification System - Token Management
 *
 * Handles device token generation, storage, and validation.
 * Tokens are used to authenticate with the CCJK cloud service.
 */

import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import os from 'node:os'

// ============================================================================
// Constants
// ============================================================================

/** Token prefix for identification */
const TOKEN_PREFIX = 'ccjk_'

/** Token length (excluding prefix) */
const TOKEN_LENGTH = 64

/** Token version for future compatibility */
const TOKEN_VERSION = 1

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a new device token
 *
 * Token format: ccjk_<version><random_hex>
 * Example: ccjk_1a3b5c7d9e...
 *
 * @returns Generated device token
 */
export function generateDeviceToken(): string {
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH / 2)
  const randomHex = randomBytes.toString('hex')
  return `${TOKEN_PREFIX}${TOKEN_VERSION}${randomHex}`
}

/**
 * Validate token format
 *
 * @param token - Token to validate
 * @returns Whether the token has valid format
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  // Check prefix
  if (!token.startsWith(TOKEN_PREFIX)) {
    return false
  }

  // Check length (prefix + version + hex)
  const expectedLength = TOKEN_PREFIX.length + 1 + TOKEN_LENGTH
  if (token.length !== expectedLength) {
    return false
  }

  // Check version
  const version = token[TOKEN_PREFIX.length]
  if (!/^\d$/.test(version)) {
    return false
  }

  // Check hex part
  const hexPart = token.slice(TOKEN_PREFIX.length + 1)
  if (!/^[a-f0-9]+$/i.test(hexPart)) {
    return false
  }

  return true
}

/**
 * Extract token version
 *
 * @param token - Token to extract version from
 * @returns Token version number or null if invalid
 */
export function getTokenVersion(token: string): number | null {
  if (!isValidTokenFormat(token)) {
    return null
  }

  const version = Number.parseInt(token[TOKEN_PREFIX.length], 10)
  return Number.isNaN(version) ? null : version
}

// ============================================================================
// Token Hashing (for cloud storage)
// ============================================================================

/**
 * Hash a token for secure storage
 *
 * The cloud service should only store the hash, not the actual token.
 * This way, even if the database is compromised, tokens cannot be recovered.
 *
 * @param token - Token to hash
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a token against its hash
 *
 * @param token - Token to verify
 * @param hash - Expected hash
 * @returns Whether the token matches the hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash))
}

// ============================================================================
// Device Information
// ============================================================================

/**
 * Device information for registration
 */
export interface DeviceInfo {
  /** Device name (hostname) */
  name: string
  /** Operating system platform */
  platform: string
  /** OS version */
  osVersion: string
  /** Architecture */
  arch: string
  /** Username */
  username: string
  /** Unique machine identifier */
  machineId: string
}

/**
 * Get current device information
 *
 * @returns Device information
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    name: os.hostname(),
    platform: os.platform(),
    osVersion: os.release(),
    arch: os.arch(),
    username: os.userInfo().username,
    machineId: generateMachineId(),
  }
}

/**
 * Generate a unique machine identifier
 *
 * This is used to identify the device across token regenerations.
 * It's based on stable system properties that don't change often.
 *
 * @returns Machine identifier hash
 */
export function generateMachineId(): string {
  const components = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || 'unknown',
    os.userInfo().username,
    // Add network interface MAC addresses for uniqueness
    ...Object.values(os.networkInterfaces())
      .flat()
      .filter(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
      .map(iface => iface?.mac)
      .filter(Boolean)
      .slice(0, 3), // Limit to first 3 MACs
  ]

  const combined = components.join('|')
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 32)
}

// ============================================================================
// Token Encryption (for local storage)
// ============================================================================

/**
 * Encryption key derivation from machine ID
 *
 * This provides basic protection for locally stored tokens.
 * The key is derived from machine-specific properties.
 */
function deriveEncryptionKey(): Buffer {
  const machineId = generateMachineId()
  const salt = 'ccjk-notification-token-v1'
  return crypto.pbkdf2Sync(machineId, salt, 100000, 32, 'sha256')
}

/**
 * Encrypt a token for local storage
 *
 * @param token - Token to encrypt
 * @returns Encrypted token string (base64)
 */
export function encryptToken(token: string): string {
  const key = deriveEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted (all in hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a locally stored token
 *
 * @param encryptedToken - Encrypted token string
 * @returns Decrypted token or null if decryption fails
 */
export function decryptToken(encryptedToken: string): string | null {
  try {
    const parts = encryptedToken.split(':')
    if (parts.length !== 3) {
      return null
    }

    const [ivHex, authTagHex, encrypted] = parts
    const key = deriveEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
  catch {
    return null
  }
}

// ============================================================================
// Token Refresh
// ============================================================================

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  /** Whether refresh was successful */
  success: boolean
  /** New token (if successful) */
  newToken?: string
  /** Error message (if failed) */
  error?: string
}

/**
 * Check if a token should be refreshed
 *
 * Tokens should be refreshed periodically for security.
 * This function checks if the token is old enough to warrant a refresh.
 *
 * @param tokenCreatedAt - When the token was created
 * @param maxAgeDays - Maximum age in days before refresh (default: 90)
 * @returns Whether the token should be refreshed
 */
export function shouldRefreshToken(tokenCreatedAt: Date, maxAgeDays: number = 90): boolean {
  const now = new Date()
  const ageMs = now.getTime() - tokenCreatedAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return ageDays >= maxAgeDays
}

// ============================================================================
// Token Masking (for display)
// ============================================================================

/**
 * Mask a token for safe display
 *
 * Shows only the prefix and last 4 characters.
 * Example: ccjk_1***...***a3b5
 *
 * @param token - Token to mask
 * @returns Masked token string
 */
export function maskToken(token: string): string {
  if (!token || token.length < 12) {
    return '***'
  }

  const prefix = token.slice(0, TOKEN_PREFIX.length + 1) // ccjk_1
  const suffix = token.slice(-4)
  return `${prefix}***...***${suffix}`
}

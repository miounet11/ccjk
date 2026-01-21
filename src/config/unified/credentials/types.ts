/**
 * Credential Storage Types
 *
 * Type definitions for secure credential storage system
 */

import type { CredentialType } from '../types'

/**
 * Stored credential metadata
 */
export interface Credential {
  id: string
  type: CredentialType
  name: string
  encrypted: boolean
  createdAt: string
  lastUsed?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}

/**
 * Credential with value (only in memory, never persisted plain)
 */
export interface CredentialWithValue extends Credential {
  value: string
}

/**
 * Encrypted credential storage format
 */
export interface EncryptedCredentialStorage {
  version: string
  algorithm: 'aes-256-gcm' | 'none'
  credentials: Record<string, EncryptedCredential>
}

/**
 * Single encrypted credential
 */
export interface EncryptedCredential {
  id: string
  type: CredentialType
  name: string
  value: string // Encrypted value
  iv: string // Initialization vector
  authTag: string // Authentication tag
  createdAt: string
  lastUsed?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}

/**
 * Credential storage options
 */
export interface CredentialStorageOptions {
  encrypt?: boolean
  ttl?: number // Time to live in milliseconds
  backup?: boolean
}

/**
 * Credential query options
 */
export interface CredentialQueryOptions {
  type?: CredentialType
  name?: string
  includeExpired?: boolean
  limit?: number
}

/**
 * Encryption key derivation options
 */
export interface KeyDerivationOptions {
  salt?: string
  iterations?: number
  keyLength?: number
  digest?: string
}

/**
 * Default key derivation options
 */
export const DEFAULT_KEY_DERIVATION: KeyDerivationOptions = {
  iterations: 100000,
  keyLength: 32,
  digest: 'sha256',
}

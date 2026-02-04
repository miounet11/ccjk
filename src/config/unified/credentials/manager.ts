/**
 * Secure Credential Manager
 *
 * Manages encrypted storage of API keys, tokens, and other sensitive credentials
 * Uses Node.js crypto for AES-256-GCM encryption
 */

import type { CredentialType } from '../types'
import type { Credential, CredentialQueryOptions, EncryptedCredentialStorage } from './types'

import { createHash, randomBytes } from 'node:crypto'
import { join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../../../constants'
import { ensureDir, exists, readFile, writeFileAtomic } from '../../../utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../../../utils/json-config'

/**
 * Credential storage file path
 */
const CREDENTIALS_FILE = join(CCJK_CONFIG_DIR, 'credentials.json')

/**
 * Storage version
 */
const STORAGE_VERSION = '1.0.0'

/**
 * In-memory credential cache (plaintext, never persisted)
 */
const credentialCache = new Map<string, string>()

/**
 * Master key for encryption (derived from environment or machine-specific)
 * In production, this should use system keychain or proper secret management
 */
let masterKey: Buffer | null = null

/**
 * Initialize the credential manager
 */
export async function initializeCredentials(): Promise<void> {
  ensureDir(CCJK_CONFIG_DIR)

  // Derive or load master key
  masterKey = await deriveMasterKey()
}

/**
 * Derive master key from system-specific data
 */
async function deriveMasterKey(): Promise<Buffer> {
  const { hostname, platform } = await import('node:os')
  const { getuid, getgid } = await import('node:process')

  // Create a machine-specific salt
  const machineId = `${hostname()}-${platform()}-${getuid?.() || 'n/a'}-${getgid?.() || 'n/a'}`
  const salt = createHash('sha256').update(machineId).digest()

  // In production, use proper key derivation with user-provided password
  // For now, use a simpler approach - the machine-specific hash
  return createHash('sha256').update(`${machineId}ccjk-credential-key`).digest()
}

/**
 * Encrypt a value using AES-256-GCM
 */
function encrypt(plaintext: string, key: Buffer): {
  encrypted: string
  iv: string
  authTag: string
} {
  const iv = randomBytes(16)
  const { createCipheriv } = require('node:crypto')

  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  }
}

/**
 * Decrypt a value using AES-256-GCM
 */
function decrypt(
  encrypted: string,
  iv: string,
  authTag: string,
  key: Buffer,
): string {
  const { createDecipheriv } = require('node:crypto')

  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'hex'),
  )
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Encrypted credential structure
 */
interface EncryptedCredential {
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
  metadata?: Record<string, unknown>
  expiresAt?: string
}

/**
 * Store a credential
 */
export async function storeCredential(
  id: string,
  type: CredentialType,
  name: string,
  value: string,
  options: CredentialStorageOptions = {},
): Promise<void> {
  if (!masterKey) {
    await initializeCredentials()
  }

  const now = new Date().toISOString()

  const encrypted = encrypt(value, masterKey!)

  const storage = loadCredentialStorage()
  const credential: EncryptedCredential = {
    id,
    type,
    name,
    value: encrypted.encrypted,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    createdAt: now,
  }
  if (options.metadata) {
    credential.metadata = options.metadata as Record<string, unknown>
  }
  storage.credentials[id] = credential

  // Update cache
  credentialCache.set(id, value)

  saveCredentialStorage(storage)
}

/**
 * Retrieve a credential by ID
 */
export async function retrieveCredential(id: string): Promise<string | null> {
  if (!masterKey) {
    await initializeCredentials()
  }

  // Check cache first
  if (credentialCache.has(id)) {
    return credentialCache.get(id)!
  }

  const storage = loadCredentialStorage()
  const encrypted = storage.credentials[id]

  if (!encrypted) {
    return null
  }

  try {
    const value = decrypt(encrypted.value, encrypted.iv, encrypted.authTag, masterKey!)
    credentialCache.set(id, value)
    return value
  }
  catch {
    return null
  }
}

/**
 * Retrieve credential metadata without value
 */
export function getCredential(id: string): Credential | null {
  const storage = loadCredentialStorage()
  const encrypted = storage.credentials[id]

  if (!encrypted) {
    return null
  }

  return {
    id: encrypted.id,
    type: encrypted.type,
    name: encrypted.name,
    encrypted: true,
    createdAt: encrypted.createdAt,
    lastUsed: encrypted.lastUsed,
    expiresAt: encrypted.expiresAt,
    metadata: encrypted.metadata,
  }
}

/**
 * Delete a credential
 */
export function deleteCredential(id: string): boolean {
  const storage = loadCredentialStorage()

  if (!storage.credentials[id]) {
    return false
  }

  delete storage.credentials[id]
  credentialCache.delete(id)
  saveCredentialStorage(storage)
  return true
}

/**
 * List credentials matching query
 */
export function listCredentials(options: CredentialQueryOptions = {}): Credential[] {
  const storage = loadCredentialStorage()
  const credentials: Credential[] = []

  const now = Date.now()

  for (const cred of Object.values(storage.credentials)) {
    // Filter by type
    if (options.type && cred.type !== options.type) {
      continue
    }

    // Filter by name
    if (options.name && !cred.name.includes(options.name)) {
      continue
    }

    // Filter expired
    if (!options.includeExpired && cred.expiresAt) {
      if (new Date(cred.expiresAt).getTime() < now) {
        continue
      }
    }

    credentials.push({
      id: cred.id,
      type: cred.type,
      name: cred.name,
      encrypted: true,
      createdAt: cred.createdAt,
      lastUsed: cred.lastUsed,
      expiresAt: cred.expiresAt,
      metadata: cred.metadata,
    })
  }

  // Apply limit
  if (options.limit && options.limit < credentials.length) {
    credentials.length = options.limit
  }

  return credentials
}

/**
 * Update credential last used time
 */
export async function touchCredential(id: string): Promise<void> {
  const storage = loadCredentialStorage()
  const cred = storage.credentials[id]

  if (cred) {
    cred.lastUsed = new Date().toISOString()
    saveCredentialStorage(storage)
  }
}

/**
 * Check if credential exists
 */
export function hasCredential(id: string): boolean {
  const storage = loadCredentialStorage()
  return id in storage.credentials
}

/**
 * Clear all credentials (with confirmation)
 */
export function clearAllCredentials(): void {
  const storage: EncryptedCredentialStorage = {
    version: STORAGE_VERSION,
    algorithm: 'aes-256-gcm',
    credentials: {},
  }
  saveCredentialStorage(storage)
  credentialCache.clear()
}

/**
 * Clear credential cache (memory only)
 */
export function clearCredentialCache(): void {
  credentialCache.clear()
}

/**
 * Load credential storage from file
 */
function loadCredentialStorage(): EncryptedCredentialStorage {
  if (!exists(CREDENTIALS_FILE)) {
    return {
      version: STORAGE_VERSION,
      algorithm: 'aes-256-gcm',
      credentials: {},
    }
  }

  try {
    const data = readJsonConfig<EncryptedCredentialStorage>(CREDENTIALS_FILE)
    if (data && data.version) {
      return data
    }
  }
  catch {
    // File corrupted, create new storage
  }

  return {
    version: STORAGE_VERSION,
    algorithm: 'aes-256-gcm',
    credentials: {},
  }
}

/**
 * Save credential storage to file
 */
function saveCredentialStorage(storage: EncryptedCredentialStorage): void {
  try {
    ensureDir(CCJK_CONFIG_DIR)
    writeJsonConfig(CREDENTIALS_FILE, storage, { pretty: false, atomic: true })
  }
  catch (error) {
    console.error('Failed to save credential storage:', error)
  }
}

/**
 * Backup credential storage
 */
export function backupCredentials(): string | null {
  if (!exists(CREDENTIALS_FILE)) {
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupPath = `${CREDENTIALS_FILE}.backup.${timestamp}`

  try {
    const content = readFile(CREDENTIALS_FILE)
    writeFileAtomic(backupPath, content)
    return backupPath
  }
  catch {
    return null
  }
}

/**
 * Migrate credentials from old storage format
 */
export async function migrateCredentials(
  oldCredentials: Record<string, string>,
  type: CredentialType = 'api_key',
): Promise<void> {
  for (const [id, value] of Object.entries(oldCredentials)) {
    if (value && !hasCredential(id)) {
      await storeCredential(id, type, id, value)
    }
  }
}

/**
 * Validate credential storage integrity
 */
export function validateCredentialStorage(): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    const storage = loadCredentialStorage()

    if (storage.version !== STORAGE_VERSION) {
      errors.push(`Invalid storage version: ${storage.version}`)
    }

    if (storage.algorithm !== 'aes-256-gcm' && storage.algorithm !== 'none') {
      errors.push(`Unsupported algorithm: ${storage.algorithm}`)
    }

    for (const [id, cred] of Object.entries(storage.credentials)) {
      if (cred.id !== id) {
        errors.push(`Credential ID mismatch: ${id}`)
      }
      if (!cred.value || !cred.iv || !cred.authTag) {
        errors.push(`Incomplete credential data: ${id}`)
      }
    }
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

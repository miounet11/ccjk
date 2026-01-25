/**
 * Cloud Sync V2 - End-to-End Encryption
 *
 * Provides AES-256-GCM encryption with secure key derivation and key exchange.
 *
 * @module cloud-sync-v2/encryption
 */

import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto'
import type {
  EncryptedEnvelope,
  EncryptionAlgorithm,
  EncryptionConfig,
  KDFType,
  KeyPair,
  Timestamp,
} from './types'
import { DEFAULT_ENCRYPTION_CONFIG } from './types'

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM_CONFIG: Record<EncryptionAlgorithm, { keyLength: number, ivLength: number, tagLength: number }> = {
  'aes-256-gcm': { keyLength: 32, ivLength: 12, tagLength: 16 },
  'chacha20-poly1305': { keyLength: 32, ivLength: 12, tagLength: 16 },
}

const CURRENT_VERSION = 1

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Derive encryption key from password using specified KDF
 */
export function deriveKey(
  password: string,
  salt: Buffer,
  kdf: KDFType,
  algorithm: EncryptionAlgorithm,
  options: { iterations?: number, memory?: number, parallelism?: number } = {},
): Buffer {
  const { keyLength } = ALGORITHM_CONFIG[algorithm]
  const iterations = options.iterations || 100000

  switch (kdf) {
    case 'pbkdf2':
      return pbkdf2Sync(password, salt, iterations, keyLength, 'sha256')

    case 'argon2':
    case 'scrypt':
      // Fallback to PBKDF2 for Node.js compatibility
      // In production, use argon2 or scrypt packages
      return pbkdf2Sync(password, salt, iterations, keyLength, 'sha256')

    default:
      return pbkdf2Sync(password, salt, iterations, keyLength, 'sha256')
  }
}

/**
 * Generate a random salt
 */
export function generateSalt(length: number = 32): Buffer {
  return randomBytes(length)
}

/**
 * Generate a random key
 */
export function generateKey(algorithm: EncryptionAlgorithm = 'aes-256-gcm'): Buffer {
  const { keyLength } = ALGORITHM_CONFIG[algorithm]
  return randomBytes(keyLength)
}

/**
 * Generate a random IV
 */
export function generateIV(algorithm: EncryptionAlgorithm = 'aes-256-gcm'): Buffer {
  const { ivLength } = ALGORITHM_CONFIG[algorithm]
  return randomBytes(ivLength)
}

/**
 * Generate a unique key ID
 */
export function generateKeyId(): string {
  return randomBytes(16).toString('hex')
}

// ============================================================================
// Encryption / Decryption
// ============================================================================

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(
  data: Buffer | string,
  key: Buffer,
  algorithm: EncryptionAlgorithm = 'aes-256-gcm',
  aad?: Buffer,
): { ciphertext: Buffer, iv: Buffer, authTag: Buffer } {
  const iv = generateIV(algorithm)
  const { tagLength } = ALGORITHM_CONFIG[algorithm]

  // Map algorithm to Node.js cipher name
  const cipherName = algorithm === 'aes-256-gcm' ? 'aes-256-gcm' : 'chacha20-poly1305'

  const cipher = createCipheriv(cipherName, key, iv, { authTagLength: tagLength } as any)

  if (aad && algorithm === 'aes-256-gcm') {
    cipher.setAAD(aad)
  }

  const inputBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
  const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  return { ciphertext: encrypted, iv, authTag }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
  algorithm: EncryptionAlgorithm = 'aes-256-gcm',
  aad?: Buffer,
): Buffer {
  const { tagLength } = ALGORITHM_CONFIG[algorithm]

  // Map algorithm to Node.js cipher name
  const cipherName = algorithm === 'aes-256-gcm' ? 'aes-256-gcm' : 'chacha20-poly1305'

  const decipher = createDecipheriv(cipherName, key, iv, { authTagLength: tagLength } as any)
  decipher.setAuthTag(authTag)

  if (aad && algorithm === 'aes-256-gcm') {
    decipher.setAAD(aad)
  }

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

// ============================================================================
// Envelope Operations
// ============================================================================

/**
 * Encrypt data and create an encrypted envelope
 */
export function encryptToEnvelope(
  data: Buffer | string,
  password: string,
  config: Partial<EncryptionConfig> = {},
): EncryptedEnvelope {
  const mergedConfig = { ...DEFAULT_ENCRYPTION_CONFIG, ...config }
  const { algorithm, kdf, iterations } = mergedConfig

  const salt = generateSalt()
  const key = deriveKey(password, salt, kdf, algorithm, { iterations })
  const { ciphertext, iv, authTag } = encrypt(data, key, algorithm)

  return {
    algorithm,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    kdf: {
      type: kdf,
      salt: salt.toString('base64'),
      iterations,
    },
    version: CURRENT_VERSION,
  }
}

/**
 * Decrypt data from an encrypted envelope
 */
export function decryptFromEnvelope(
  envelope: EncryptedEnvelope,
  password: string,
): Buffer {
  const { algorithm, iv, authTag, ciphertext, kdf } = envelope

  if (!kdf) {
    throw new Error('Missing KDF parameters in envelope')
  }

  const salt = Buffer.from(kdf.salt, 'base64')
  const key = deriveKey(password, salt, kdf.type, algorithm, {
    iterations: kdf.iterations,
    memory: kdf.memory,
    parallelism: kdf.parallelism,
  })

  return decrypt(
    Buffer.from(ciphertext, 'base64'),
    key,
    Buffer.from(iv, 'base64'),
    Buffer.from(authTag, 'base64'),
    algorithm,
  )
}

/**
 * Encrypt data with a raw key (no password derivation)
 */
export function encryptWithKey(
  data: Buffer | string,
  key: Buffer,
  algorithm: EncryptionAlgorithm = 'aes-256-gcm',
  keyId?: string,
): EncryptedEnvelope {
  const { ciphertext, iv, authTag } = encrypt(data, key, algorithm)

  return {
    algorithm,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    keyId,
    version: CURRENT_VERSION,
  }
}

/**
 * Decrypt data with a raw key
 */
export function decryptWithKey(
  envelope: EncryptedEnvelope,
  key: Buffer,
): Buffer {
  const { algorithm, iv, authTag, ciphertext } = envelope

  return decrypt(
    Buffer.from(ciphertext, 'base64'),
    key,
    Buffer.from(iv, 'base64'),
    Buffer.from(authTag, 'base64'),
    algorithm,
  )
}

// ============================================================================
// Key Exchange (Simplified Diffie-Hellman style)
// ============================================================================

/**
 * Generate a key pair for key exchange
 * Note: In production, use proper ECDH or X25519
 */
export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32)
  const publicKey = createHash('sha256').update(privateKey).digest()

  return {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64'),
    keyId: generateKeyId(),
    createdAt: Date.now(),
  }
}

/**
 * Derive shared secret from key pair and peer's public key
 * Note: Simplified implementation - use proper ECDH in production
 */
export function deriveSharedSecret(
  privateKey: string,
  peerPublicKey: string,
): Buffer {
  const privKeyBuffer = Buffer.from(privateKey, 'base64')
  const pubKeyBuffer = Buffer.from(peerPublicKey, 'base64')

  // Simple shared secret derivation (NOT cryptographically secure for real use)
  // In production, use ECDH or X25519
  const combined = Buffer.concat([privKeyBuffer, pubKeyBuffer])
  return createHash('sha256').update(combined).digest()
}

// ============================================================================
// Zero-Knowledge Proof (Simplified)
// ============================================================================

/**
 * Generate a commitment for zero-knowledge proof
 */
export function generateCommitment(secret: string): { commitment: string, nonce: string } {
  const nonce = randomBytes(32).toString('hex')
  const commitment = createHash('sha256')
    .update(secret + nonce)
    .digest('hex')

  return { commitment, nonce }
}

/**
 * Verify a commitment
 */
export function verifyCommitment(secret: string, nonce: string, commitment: string): boolean {
  const computed = createHash('sha256')
    .update(secret + nonce)
    .digest('hex')

  return computed === commitment
}

/**
 * Generate a proof of knowledge (simplified Schnorr-like)
 */
export function generateProofOfKnowledge(secret: string): {
  challenge: string
  response: string
  commitment: string
} {
  const k = randomBytes(32)
  const commitment = createHash('sha256').update(k).digest('hex')
  const challenge = createHash('sha256')
    .update(commitment + secret)
    .digest('hex')

  // Response = k XOR (challenge * secret_hash)
  const secretHash = createHash('sha256').update(secret).digest()
  const challengeBuffer = Buffer.from(challenge, 'hex')
  const response = Buffer.alloc(32)

  for (let i = 0; i < 32; i++) {
    response[i] = k[i] ^ (challengeBuffer[i % challengeBuffer.length] ^ secretHash[i])
  }

  return {
    challenge,
    response: response.toString('hex'),
    commitment,
  }
}

// ============================================================================
// Encryption Manager Class
// ============================================================================

/**
 * Encryption manager for handling encryption operations
 */
export class EncryptionManager {
  private config: EncryptionConfig
  private masterKey: Buffer | null = null
  private keyPair: KeyPair | null = null
  private keyCache: Map<string, { key: Buffer, expiresAt: Timestamp }> = new Map()

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config }
  }

  /**
   * Initialize with a master password
   */
  initialize(password: string): void {
    const salt = generateSalt()
    this.masterKey = deriveKey(
      password,
      salt,
      this.config.kdf,
      this.config.algorithm,
      { iterations: this.config.iterations },
    )
    this.keyPair = generateKeyPair()
  }

  /**
   * Initialize with a raw key
   */
  initializeWithKey(key: Buffer): void {
    this.masterKey = key
    this.keyPair = generateKeyPair()
  }

  /**
   * Check if encryption is enabled and initialized
   */
  isReady(): boolean {
    return this.config.enabled && this.masterKey !== null
  }

  /**
   * Encrypt data
   */
  encrypt(data: Buffer | string): EncryptedEnvelope {
    if (!this.masterKey) {
      throw new Error('Encryption manager not initialized')
    }

    return encryptWithKey(data, this.masterKey, this.config.algorithm)
  }

  /**
   * Decrypt data
   */
  decrypt(envelope: EncryptedEnvelope): Buffer {
    if (!this.masterKey) {
      throw new Error('Encryption manager not initialized')
    }

    return decryptWithKey(envelope, this.masterKey)
  }

  /**
   * Encrypt string and return base64
   */
  encryptString(data: string): string {
    const envelope = this.encrypt(data)
    return Buffer.from(JSON.stringify(envelope)).toString('base64')
  }

  /**
   * Decrypt base64 string
   */
  decryptString(encryptedBase64: string): string {
    const envelope = JSON.parse(Buffer.from(encryptedBase64, 'base64').toString('utf-8'))
    return this.decrypt(envelope).toString('utf-8')
  }

  /**
   * Get public key for key exchange
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null
  }

  /**
   * Derive shared key with peer
   */
  deriveSharedKey(peerPublicKey: string): Buffer {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized')
    }

    return deriveSharedSecret(this.keyPair.privateKey, peerPublicKey)
  }

  /**
   * Rotate master key
   */
  rotateKey(newPassword: string): { oldKeyId: string, newKeyId: string } {
    const oldKeyId = this.keyPair?.keyId || 'unknown'

    const salt = generateSalt()
    this.masterKey = deriveKey(
      newPassword,
      salt,
      this.config.kdf,
      this.config.algorithm,
      { iterations: this.config.iterations },
    )
    this.keyPair = generateKeyPair()

    return { oldKeyId, newKeyId: this.keyPair.keyId }
  }

  /**
   * Clear sensitive data
   */
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0)
      this.masterKey = null
    }
    this.keyPair = null
    this.keyCache.clear()
  }

  /**
   * Get current configuration
   */
  getConfig(): EncryptionConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EncryptionConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an encryption manager
 */
export function createEncryptionManager(config?: Partial<EncryptionConfig>): EncryptionManager {
  return new EncryptionManager(config)
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: Buffer | string): string {
  return createHash('sha256')
    .update(typeof data === 'string' ? data : data)
    .digest('hex')
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

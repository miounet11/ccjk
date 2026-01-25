/**
 * CCJK Security Module - 统一凭证加密系统
 *
 * @module core/security
 * @description
 * 提供安全的凭证存储和管理功能：
 * - AES-256-GCM 加密
 * - PBKDF2 密钥派生
 * - 系统密钥链集成 (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * - 加密文件存储回退
 *
 * @example
 * ```typescript
 * import { CredentialManager, EncryptionService } from '@ccjk/core/security'
 *
 * // 使用凭证管理器
 * const manager = await CredentialManager.create()
 * await manager.store('api-key', 'sk-xxx', 'api-key')
 * const key = await manager.retrieve('api-key')
 *
 * // 直接使用加密服务
 * const encryption = new EncryptionService()
 * const encrypted = await encryption.encrypt('secret', 'password')
 * const decrypted = await encryption.decrypt(encrypted, 'password')
 * ```
 */

// Types
export type {
  CredentialEvent,
  CredentialEventListener,
  CredentialManagerConfig,
  CredentialMetadata,
  CredentialType,
  EncryptedData,
  EncryptionAlgorithm,
  EncryptionConfig,
  ICredentialManager,
  IEncryptionService,
  IKeychainBackend,
  KeyDerivationAlgorithm,
  Platform,
  StorageBackend,
  StoredCredential,
} from './types'

// Encryption
export {
  EncryptionService,
  encryptionService,
} from './encryption'

// Keychain backends
export {
  createKeychainBackend,
  FileStorageBackend,
  getKeychainBackendType,
  LinuxSecretServiceBackend,
  MacOSKeychainBackend,
  WindowsCredentialBackend,
} from './keychain'

// Credential Manager
export {
  createCredentialManager,
  CredentialManager,
  getCredentialManager,
  resetCredentialManager,
} from './credential-manager'

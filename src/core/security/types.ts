/**
 * CCJK Security Module - Type Definitions
 *
 * @module core/security/types
 * @description 凭证加密系统的类型定义
 */

/**
 * 支持的操作系统平台
 */
export type Platform = 'darwin' | 'win32' | 'linux'

/**
 * 凭证存储后端类型
 */
export type StorageBackend = 'keychain' | 'credential-manager' | 'secret-service' | 'file'

/**
 * 加密算法类型
 */
export type EncryptionAlgorithm = 'aes-256-gcm'

/**
 * 密钥派生算法类型
 */
export type KeyDerivationAlgorithm = 'pbkdf2'

/**
 * 加密后的数据结构
 */
export interface EncryptedData {
  /** 加密算法 */
  algorithm: EncryptionAlgorithm
  /** 初始化向量 (Base64) */
  iv: string
  /** 加密后的数据 (Base64) */
  ciphertext: string
  /** 认证标签 (Base64) */
  authTag: string
  /** 盐值 (Base64) - 用于密钥派生 */
  salt: string
  /** 密钥派生迭代次数 */
  iterations: number
  /** 版本号 */
  version: number
}

/**
 * 凭证元数据
 */
export interface CredentialMetadata {
  /** 凭证键名 */
  key: string
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 凭证类型 */
  type?: CredentialType
  /** 过期时间 */
  expiresAt?: Date
  /** 自定义标签 */
  tags?: string[]
}

/**
 * 凭证类型
 */
export type CredentialType = 'api-key' | 'oauth-token' | 'refresh-token' | 'password' | 'secret' | 'custom'

/**
 * 存储的凭证结构
 */
export interface StoredCredential {
  /** 加密后的数据 */
  encrypted: EncryptedData
  /** 元数据 */
  metadata: CredentialMetadata
}

/**
 * 凭证管理器配置
 */
export interface CredentialManagerConfig {
  /** 服务名称 (用于系统密钥链) */
  serviceName?: string
  /** 是否启用系统密钥链 */
  useSystemKeychain?: boolean
  /** 回退存储路径 */
  fallbackStoragePath?: string
  /** 密钥派生迭代次数 */
  pbkdf2Iterations?: number
  /** 主密钥 (用于文件存储加密) */
  masterKey?: string
  /** 是否自动轮换密钥 */
  autoRotate?: boolean
  /** 密钥轮换间隔 (天) */
  rotationIntervalDays?: number
}

/**
 * 凭证管理器接口
 */
export interface ICredentialManager {
  /**
   * 存储凭证
   * @param key - 凭证键名
   * @param value - 凭证值
   * @param type - 凭证类型
   */
  store: (key: string, value: string, type?: CredentialType) => Promise<void>

  /**
   * 获取凭证
   * @param key - 凭证键名
   * @returns 凭证值，如果不存在则返回 null
   */
  retrieve: (key: string) => Promise<string | null>

  /**
   * 删除凭证
   * @param key - 凭证键名
   * @returns 是否删除成功
   */
  delete: (key: string) => Promise<boolean>

  /**
   * 列出所有凭证键名
   * @returns 凭证键名列表
   */
  list: () => Promise<string[]>

  /**
   * 轮换凭证 (重新加密)
   * @param key - 凭证键名
   */
  rotate: (key: string) => Promise<void>
}

/**
 * 密钥链后端接口
 */
export interface IKeychainBackend {
  /** 后端类型 */
  readonly type: StorageBackend

  /** 是否可用 */
  isAvailable: () => Promise<boolean>

  /**
   * 存储密钥
   * @param service - 服务名称
   * @param account - 账户名称
   * @param password - 密码/密钥
   */
  setPassword: (service: string, account: string, password: string) => Promise<void>

  /**
   * 获取密钥
   * @param service - 服务名称
   * @param account - 账户名称
   * @returns 密码/密钥，如果不存在则返回 null
   */
  getPassword: (service: string, account: string) => Promise<string | null>

  /**
   * 删除密钥
   * @param service - 服务名称
   * @param account - 账户名称
   * @returns 是否删除成功
   */
  deletePassword: (service: string, account: string) => Promise<boolean>

  /**
   * 列出服务下的所有账户
   * @param service - 服务名称
   * @returns 账户名称列表
   */
  listAccounts: (service: string) => Promise<string[]>
}

/**
 * 加密服务接口
 */
export interface IEncryptionService {
  /**
   * 加密数据
   * @param plaintext - 明文
   * @param masterKey - 主密钥
   * @returns 加密后的数据
   */
  encrypt: (plaintext: string, masterKey: string) => Promise<EncryptedData>

  /**
   * 解密数据
   * @param encrypted - 加密后的数据
   * @param masterKey - 主密钥
   * @returns 明文
   */
  decrypt: (encrypted: EncryptedData, masterKey: string) => Promise<string>

  /**
   * 生成随机密钥
   * @param length - 密钥长度 (字节)
   * @returns Base64 编码的密钥
   */
  generateKey: (length?: number) => string

  /**
   * 验证加密数据完整性
   * @param encrypted - 加密后的数据
   * @returns 是否有效
   */
  validate: (encrypted: EncryptedData) => boolean
}

/**
 * 加密配置
 */
export interface EncryptionConfig {
  /** 密钥派生迭代次数 */
  iterations: number
  /** 盐值长度 (字节) */
  saltLength: number
  /** IV 长度 (字节) */
  ivLength: number
  /** 密钥长度 (字节) */
  keyLength: number
  /** 认证标签长度 (字节) */
  authTagLength: number
}

/**
 * 凭证存储事件
 */
export type CredentialEvent
  = | { type: 'stored', key: string }
    | { type: 'retrieved', key: string }
    | { type: 'deleted', key: string }
    | { type: 'rotated', key: string }
    | { type: 'error', key: string, error: Error }

/**
 * 凭证事件监听器
 */
export type CredentialEventListener = (event: CredentialEvent) => void

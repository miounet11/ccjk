/**
 * CCJK Security Module - Credential Manager
 *
 * @module core/security/credential-manager
 * @description 统一凭证管理器，支持系统密钥链和加密文件存储
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import type {
  CredentialEventListener,
  CredentialManagerConfig,
  CredentialMetadata,
  CredentialType,
  ICredentialManager,
  IKeychainBackend,
  StoredCredential,
} from './types'
import { EncryptionService } from './encryption'
import { createKeychainBackend, FileStorageBackend } from './keychain'

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<CredentialManagerConfig> = {
  serviceName: 'ccjk',
  useSystemKeychain: true,
  fallbackStoragePath: path.join(os.homedir(), '.ccjk', 'credentials'),
  pbkdf2Iterations: 100000,
  masterKey: '',
  autoRotate: false,
  rotationIntervalDays: 90,
}

/**
 * 元数据存储文件名
 */
const METADATA_FILE = '.metadata.json'

/**
 * 凭证管理器
 *
 * @description
 * 提供统一的凭证存储、检索、删除和轮换功能：
 * - 优先使用系统密钥链 (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * - 当系统密钥链不可用时，回退到加密文件存储
 * - 支持凭证元数据管理
 * - 支持凭证轮换 (重新加密)
 *
 * @example
 * ```typescript
 * const manager = await CredentialManager.create()
 *
 * // 存储 API 密钥
 * await manager.store('openai-api-key', 'sk-xxx', 'api-key')
 *
 * // 获取凭证
 * const apiKey = await manager.retrieve('openai-api-key')
 *
 * // 列出所有凭证
 * const keys = await manager.list()
 *
 * // 删除凭证
 * await manager.delete('openai-api-key')
 * ```
 */
export class CredentialManager implements ICredentialManager {
  private readonly config: Required<CredentialManagerConfig>
  private backend: IKeychainBackend | null = null
  private metadata: Map<string, CredentialMetadata> = new Map()
  private listeners: Set<CredentialEventListener> = new Set()
  private initialized = false

  /**
   * 创建凭证管理器实例
   * @param config - 配置选项
   */
  private constructor(config: CredentialManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 创建并初始化凭证管理器
   *
   * @param config - 配置选项
   * @returns 初始化后的凭证管理器实例
   *
   * @example
   * ```typescript
   * const manager = await CredentialManager.create({
   *   serviceName: 'my-app',
   *   useSystemKeychain: true,
   * })
   * ```
   */
  static async create(config: CredentialManagerConfig = {}): Promise<CredentialManager> {
    const manager = new CredentialManager(config)
    await manager.initialize()
    return manager
  }

  /**
   * 初始化凭证管理器
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // 创建密钥链后端
    if (this.config.useSystemKeychain) {
      try {
        this.backend = await createKeychainBackend(
          this.config.fallbackStoragePath,
          this.config.masterKey || undefined,
        )
      }
      catch {
        // 回退到文件存储
        this.backend = new FileStorageBackend(
          this.config.fallbackStoragePath,
          this.config.masterKey || undefined,
        )
      }
    }
    else {
      this.backend = new FileStorageBackend(
        this.config.fallbackStoragePath,
        this.config.masterKey || undefined,
      )
    }

    // 加载元数据
    await this.loadMetadata()

    this.initialized = true
  }

  /**
   * 存储凭证
   *
   * @description
   * 将凭证安全地存储到系统密钥链或加密文件中
   *
   * @param key - 凭证键名
   * @param value - 凭证值
   * @param type - 凭证类型 (可选)
   * @throws {Error} 存储失败时抛出错误
   *
   * @example
   * ```typescript
   * await manager.store('github-token', 'ghp_xxx', 'oauth-token')
   * ```
   */
  async store(key: string, value: string, type?: CredentialType): Promise<void> {
    this.ensureInitialized()

    try {
      await this.backend!.setPassword(this.config.serviceName, key, value)

      // 更新元数据
      const now = new Date()
      const existingMeta = this.metadata.get(key)

      const meta: CredentialMetadata = {
        key,
        createdAt: existingMeta?.createdAt || now,
        updatedAt: now,
        type: type || existingMeta?.type,
      }

      this.metadata.set(key, meta)
      await this.saveMetadata()

      this.emit({ type: 'stored', key })
    }
    catch (error) {
      this.emit({ type: 'error', key, error: error instanceof Error ? error : new Error(String(error)) })
      throw error
    }
  }

  /**
   * 获取凭证
   *
   * @description
   * 从系统密钥链或加密文件中检索凭证
   *
   * @param key - 凭证键名
   * @returns 凭证值，如果不存在则返回 null
   *
   * @example
   * ```typescript
   * const token = await manager.retrieve('github-token')
   * if (token) {
   *   console.log('Token found')
   * }
   * ```
   */
  async retrieve(key: string): Promise<string | null> {
    this.ensureInitialized()

    try {
      const value = await this.backend!.getPassword(this.config.serviceName, key)

      if (value) {
        this.emit({ type: 'retrieved', key })

        // 检查是否需要自动轮换
        if (this.config.autoRotate) {
          await this.checkAndRotate(key)
        }
      }

      return value
    }
    catch (error) {
      this.emit({ type: 'error', key, error: error instanceof Error ? error : new Error(String(error)) })
      return null
    }
  }

  /**
   * 删除凭证
   *
   * @description
   * 从系统密钥链或加密文件中删除凭证
   *
   * @param key - 凭证键名
   * @returns 是否删除成功
   *
   * @example
   * ```typescript
   * const deleted = await manager.delete('old-api-key')
   * ```
   */
  async delete(key: string): Promise<boolean> {
    this.ensureInitialized()

    try {
      const result = await this.backend!.deletePassword(this.config.serviceName, key)

      if (result) {
        this.metadata.delete(key)
        await this.saveMetadata()
        this.emit({ type: 'deleted', key })
      }

      return result
    }
    catch (error) {
      this.emit({ type: 'error', key, error: error instanceof Error ? error : new Error(String(error)) })
      return false
    }
  }

  /**
   * 列出所有凭证键名
   *
   * @description
   * 返回所有已存储凭证的键名列表
   *
   * @returns 凭证键名数组
   *
   * @example
   * ```typescript
   * const keys = await manager.list()
   * console.log('Stored credentials:', keys)
   * ```
   */
  async list(): Promise<string[]> {
    this.ensureInitialized()

    try {
      // 优先从元数据获取
      if (this.metadata.size > 0) {
        return Array.from(this.metadata.keys())
      }

      // 回退到后端列表
      return await this.backend!.listAccounts(this.config.serviceName)
    }
    catch {
      return []
    }
  }

  /**
   * 轮换凭证
   *
   * @description
   * 重新加密凭证（使用新的盐值和 IV）
   * 这对于定期更新加密参数很有用
   *
   * @param key - 凭证键名
   * @throws {Error} 凭证不存在或轮换失败时抛出错误
   *
   * @example
   * ```typescript
   * await manager.rotate('api-key')
   * ```
   */
  async rotate(key: string): Promise<void> {
    this.ensureInitialized()

    try {
      // 获取当前值
      const value = await this.retrieve(key)
      if (value === null) {
        throw new Error(`Credential not found: ${key}`)
      }

      // 获取元数据
      const meta = this.metadata.get(key)

      // 重新存储（会使用新的加密参数）
      await this.store(key, value, meta?.type)

      this.emit({ type: 'rotated', key })
    }
    catch (error) {
      this.emit({ type: 'error', key, error: error instanceof Error ? error : new Error(String(error)) })
      throw error
    }
  }

  /**
   * 获取凭证元数据
   *
   * @param key - 凭证键名
   * @returns 凭证元数据，如果不存在则返回 undefined
   */
  getMetadata(key: string): CredentialMetadata | undefined {
    return this.metadata.get(key)
  }

  /**
   * 获取所有凭证元数据
   *
   * @returns 凭证元数据映射
   */
  getAllMetadata(): Map<string, CredentialMetadata> {
    return new Map(this.metadata)
  }

  /**
   * 检查凭证是否存在
   *
   * @param key - 凭证键名
   * @returns 凭证是否存在
   */
  async has(key: string): Promise<boolean> {
    const value = await this.retrieve(key)
    return value !== null
  }

  /**
   * 批量存储凭证
   *
   * @param credentials - 凭证映射
   * @param type - 凭证类型 (可选)
   */
  async storeMany(
    credentials: Record<string, string>,
    type?: CredentialType,
  ): Promise<void> {
    for (const [key, value] of Object.entries(credentials)) {
      await this.store(key, value, type)
    }
  }

  /**
   * 批量获取凭证
   *
   * @param keys - 凭证键名数组
   * @returns 凭证映射
   */
  async retrieveMany(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {}
    for (const key of keys) {
      result[key] = await this.retrieve(key)
    }
    return result
  }

  /**
   * 清除所有凭证
   *
   * @returns 删除的凭证数量
   */
  async clear(): Promise<number> {
    const keys = await this.list()
    let count = 0

    for (const key of keys) {
      if (await this.delete(key)) {
        count++
      }
    }

    return count
  }

  /**
   * 导出凭证 (加密)
   *
   * @description
   * 将所有凭证导出为加密的 JSON 格式
   * 用于备份或迁移
   *
   * @param exportKey - 导出加密密钥
   * @returns 加密后的导出数据
   */
  async export(exportKey: string): Promise<string> {
    this.ensureInitialized()

    const encryption = new EncryptionService()
    const credentials: Record<string, StoredCredential> = {}

    const keys = await this.list()
    for (const key of keys) {
      const value = await this.retrieve(key)
      if (value) {
        const encrypted = await encryption.encrypt(value, exportKey)
        credentials[key] = {
          encrypted,
          metadata: this.metadata.get(key) || {
            key,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }
      }
    }

    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      credentials,
    }, null, 2)
  }

  /**
   * 导入凭证
   *
   * @description
   * 从加密的导出数据中导入凭证
   *
   * @param data - 加密的导出数据
   * @param importKey - 导入解密密钥
   * @param overwrite - 是否覆盖已存在的凭证
   * @returns 导入的凭证数量
   */
  async import(
    data: string,
    importKey: string,
    overwrite = false,
  ): Promise<number> {
    this.ensureInitialized()

    const encryption = new EncryptionService()
    const parsed = JSON.parse(data)

    if (!parsed.credentials || typeof parsed.credentials !== 'object') {
      throw new Error('Invalid export data format')
    }

    let count = 0

    for (const [key, stored] of Object.entries(parsed.credentials) as [string, StoredCredential][]) {
      // 检查是否已存在
      if (!overwrite && await this.has(key)) {
        continue
      }

      try {
        const value = await encryption.decrypt(stored.encrypted, importKey)
        await this.store(key, value, stored.metadata?.type)
        count++
      }
      catch {
        // 跳过解密失败的凭证
        continue
      }
    }

    return count
  }

  /**
   * 添加事件监听器
   *
   * @param listener - 事件监听器函数
   * @returns 取消监听的函数
   */
  on(listener: CredentialEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 获取当前使用的存储后端类型
   */
  getBackendType(): string {
    return this.backend?.type || 'unknown'
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.backend) {
      throw new Error('CredentialManager not initialized. Use CredentialManager.create() to create an instance.')
    }
  }

  /**
   * 发送事件
   */
  private emit(event: Parameters<CredentialEventListener>[0]): void {
    Array.from(this.listeners).forEach((listener) => {
      try {
        listener(event)
      }
      catch {
        // 忽略监听器错误
      }
    })
  }

  /**
   * 加载元数据
   */
  private async loadMetadata(): Promise<void> {
    const metadataPath = path.join(this.config.fallbackStoragePath, METADATA_FILE)

    try {
      const content = await fs.readFile(metadataPath, 'utf8')
      const data = JSON.parse(content)

      if (data && typeof data === 'object') {
        for (const [key, meta] of Object.entries(data) as [string, CredentialMetadata][]) {
          this.metadata.set(key, {
            ...meta,
            createdAt: new Date(meta.createdAt),
            updatedAt: new Date(meta.updatedAt),
            expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : undefined,
          })
        }
      }
    }
    catch {
      // 元数据文件不存在或无效，使用空映射
    }
  }

  /**
   * 保存元数据
   */
  private async saveMetadata(): Promise<void> {
    const metadataPath = path.join(this.config.fallbackStoragePath, METADATA_FILE)

    try {
      await fs.mkdir(path.dirname(metadataPath), { recursive: true, mode: 0o700 })

      const data: Record<string, CredentialMetadata> = {}
      Array.from(this.metadata.entries()).forEach(([key, meta]) => {
        data[key] = meta
      })

      await fs.writeFile(metadataPath, JSON.stringify(data, null, 2), { mode: 0o600 })
    }
    catch {
      // 忽略保存失败
    }
  }

  /**
   * 检查并自动轮换凭证
   */
  private async checkAndRotate(key: string): Promise<void> {
    const meta = this.metadata.get(key)
    if (!meta) {
      return
    }

    const daysSinceUpdate = (Date.now() - meta.updatedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate >= this.config.rotationIntervalDays) {
      await this.rotate(key)
    }
  }
}

/**
 * 创建凭证管理器的便捷函数
 *
 * @param config - 配置选项
 * @returns 初始化后的凭证管理器实例
 */
export async function createCredentialManager(
  config?: CredentialManagerConfig,
): Promise<CredentialManager> {
  return CredentialManager.create(config)
}

/**
 * 默认凭证管理器实例 (延迟初始化)
 */
let defaultManager: CredentialManager | null = null

/**
 * 获取默认凭证管理器实例
 *
 * @returns 默认凭证管理器实例
 */
export async function getCredentialManager(): Promise<CredentialManager> {
  if (!defaultManager) {
    defaultManager = await CredentialManager.create()
  }
  return defaultManager
}

/**
 * 重置默认凭证管理器实例
 */
export function resetCredentialManager(): void {
  defaultManager = null
}

export default CredentialManager

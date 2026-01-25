/**
 * CCJK Security Module - Encryption Service
 *
 * @module core/security/encryption
 * @description AES-256-GCM 加密实现，支持 PBKDF2 密钥派生
 */

import * as crypto from 'node:crypto'
import type { EncryptedData, EncryptionConfig, IEncryptionService } from './types'

/**
 * 默认加密配置
 */
const DEFAULT_CONFIG: EncryptionConfig = {
  iterations: 100000, // PBKDF2 迭代次数
  saltLength: 32, // 256 bits
  ivLength: 12, // 96 bits (GCM 推荐)
  keyLength: 32, // 256 bits (AES-256)
  authTagLength: 16, // 128 bits
}

/**
 * 当前加密数据格式版本
 */
const CURRENT_VERSION = 1

/**
 * AES-256-GCM 加密服务
 *
 * @description
 * 提供安全的对称加密功能：
 * - 使用 AES-256-GCM 算法提供加密和认证
 * - 使用 PBKDF2 从主密钥派生加密密钥
 * - 每次加密使用随机 IV 和盐值
 *
 * @example
 * ```typescript
 * const encryption = new EncryptionService()
 * const masterKey = encryption.generateKey()
 *
 * // 加密
 * const encrypted = await encryption.encrypt('sensitive data', masterKey)
 *
 * // 解密
 * const decrypted = await encryption.decrypt(encrypted, masterKey)
 * ```
 */
export class EncryptionService implements IEncryptionService {
  private readonly config: EncryptionConfig

  /**
   * 创建加密服务实例
   * @param config - 加密配置 (可选)
   */
  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 加密数据
   *
   * @description
   * 使用 AES-256-GCM 加密数据：
   * 1. 生成随机盐值和 IV
   * 2. 使用 PBKDF2 从主密钥派生加密密钥
   * 3. 使用 AES-256-GCM 加密数据
   * 4. 返回包含所有必要信息的加密数据结构
   *
   * @param plaintext - 要加密的明文
   * @param masterKey - 主密钥
   * @returns 加密后的数据结构
   * @throws {Error} 加密失败时抛出错误
   */
  async encrypt(plaintext: string, masterKey: string): Promise<EncryptedData> {
    // 生成随机盐值和 IV
    const salt = crypto.randomBytes(this.config.saltLength)
    const iv = crypto.randomBytes(this.config.ivLength)

    // 使用 PBKDF2 派生密钥
    const key = await this.deriveKey(masterKey, salt)

    // 创建加密器
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
      authTagLength: this.config.authTagLength,
    })

    // 加密数据
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])

    // 获取认证标签
    const authTag = cipher.getAuthTag()

    return {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      iterations: this.config.iterations,
      version: CURRENT_VERSION,
    }
  }

  /**
   * 解密数据
   *
   * @description
   * 使用 AES-256-GCM 解密数据：
   * 1. 从加密数据中提取盐值、IV 和认证标签
   * 2. 使用 PBKDF2 从主密钥派生解密密钥
   * 3. 使用 AES-256-GCM 解密并验证数据
   *
   * @param encrypted - 加密后的数据结构
   * @param masterKey - 主密钥
   * @returns 解密后的明文
   * @throws {Error} 解密失败或认证失败时抛出错误
   */
  async decrypt(encrypted: EncryptedData, masterKey: string): Promise<string> {
    // 验证数据格式
    if (!this.validate(encrypted)) {
      throw new Error('Invalid encrypted data format')
    }

    // 解码 Base64 数据
    const salt = Buffer.from(encrypted.salt, 'base64')
    const iv = Buffer.from(encrypted.iv, 'base64')
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')
    const authTag = Buffer.from(encrypted.authTag, 'base64')

    // 使用 PBKDF2 派生密钥 (使用存储的迭代次数)
    const key = await this.deriveKey(masterKey, salt, encrypted.iterations)

    // 创建解密器
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
      authTagLength: this.config.authTagLength,
    })

    // 设置认证标签
    decipher.setAuthTag(authTag)

    // 解密数据
    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ])
      return decrypted.toString('utf8')
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('Unsupported state')) {
        throw new Error('Decryption failed: authentication tag mismatch (data may be corrupted or tampered)')
      }
      throw error
    }
  }

  /**
   * 生成随机密钥
   *
   * @description
   * 使用加密安全的随机数生成器生成密钥
   *
   * @param length - 密钥长度 (字节)，默认 32 字节 (256 bits)
   * @returns Base64 编码的随机密钥
   */
  generateKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64')
  }

  /**
   * 验证加密数据格式
   *
   * @description
   * 检查加密数据结构是否包含所有必要字段且格式正确
   *
   * @param encrypted - 加密后的数据结构
   * @returns 数据格式是否有效
   */
  validate(encrypted: EncryptedData): boolean {
    if (!encrypted || typeof encrypted !== 'object') {
      return false
    }

    // 检查必要字段
    const requiredFields: (keyof EncryptedData)[] = [
      'algorithm',
      'iv',
      'ciphertext',
      'authTag',
      'salt',
      'iterations',
      'version',
    ]

    for (const field of requiredFields) {
      if (!(field in encrypted)) {
        return false
      }
    }

    // 验证算法
    if (encrypted.algorithm !== 'aes-256-gcm') {
      return false
    }

    // 验证版本
    if (typeof encrypted.version !== 'number' || encrypted.version < 1) {
      return false
    }

    // 验证迭代次数
    if (typeof encrypted.iterations !== 'number' || encrypted.iterations < 1000) {
      return false
    }

    // 验证 Base64 字符串
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (
      !base64Regex.test(encrypted.iv)
      || !base64Regex.test(encrypted.ciphertext)
      || !base64Regex.test(encrypted.authTag)
      || !base64Regex.test(encrypted.salt)
    ) {
      return false
    }

    return true
  }

  /**
   * 使用 PBKDF2 派生密钥
   *
   * @param masterKey - 主密钥
   * @param salt - 盐值
   * @param iterations - 迭代次数 (可选，默认使用配置值)
   * @returns 派生的密钥
   */
  private deriveKey(
    masterKey: string,
    salt: Buffer,
    iterations: number = this.config.iterations,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        masterKey,
        salt,
        iterations,
        this.config.keyLength,
        'sha256',
        (err, derivedKey) => {
          if (err) {
            reject(err)
          }
          else {
            resolve(derivedKey)
          }
        },
      )
    })
  }

  /**
   * 计算数据的 SHA-256 哈希
   *
   * @param data - 要哈希的数据
   * @returns 十六进制编码的哈希值
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * 安全比较两个字符串 (防止时序攻击)
   *
   * @param a - 第一个字符串
   * @param b - 第二个字符串
   * @returns 两个字符串是否相等
   */
  static secureCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)

    if (bufA.length !== bufB.length) {
      // 仍然执行比较以防止时序攻击
      crypto.timingSafeEqual(bufA, bufA)
      return false
    }

    return crypto.timingSafeEqual(bufA, bufB)
  }
}

/**
 * 默认加密服务实例
 */
export const encryptionService = new EncryptionService()

export default EncryptionService

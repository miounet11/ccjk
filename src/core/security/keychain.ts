/**
 * CCJK Security Module - Keychain Backend
 *
 * @module core/security/keychain
 * @description 系统密钥链集成 (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 */

import type { IKeychainBackend, Platform, StorageBackend } from './types'
import { exec } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { EncryptionService } from './encryption'

const execAsync = promisify(exec)

/**
 * macOS Keychain 后端
 *
 * @description
 * 使用 macOS 的 security 命令行工具与 Keychain 交互
 */
export class MacOSKeychainBackend implements IKeychainBackend {
  readonly type: StorageBackend = 'keychain'

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return false
    }
    try {
      await execAsync('which security')
      return true
    }
    catch {
      return false
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    // 先尝试删除已存在的条目
    try {
      await this.deletePassword(service, account)
    }
    catch {
      // 忽略删除失败
    }

    const escapedPassword = password.replace(/'/g, '\'\\\'\'')
    const escapedService = service.replace(/'/g, '\'\\\'\'')
    const escapedAccount = account.replace(/'/g, '\'\\\'\'')

    try {
      await execAsync(
        `security add-generic-password -s '${escapedService}' -a '${escapedAccount}' -w '${escapedPassword}' -U`,
      )
    }
    catch (error) {
      throw new Error(`Failed to store password in Keychain: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    const escapedService = service.replace(/'/g, '\'\\\'\'')
    const escapedAccount = account.replace(/'/g, '\'\\\'\'')

    try {
      const { stdout } = await execAsync(
        `security find-generic-password -s '${escapedService}' -a '${escapedAccount}' -w`,
      )
      return stdout.trim()
    }
    catch {
      return null
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    const escapedService = service.replace(/'/g, '\'\\\'\'')
    const escapedAccount = account.replace(/'/g, '\'\\\'\'')

    try {
      await execAsync(
        `security delete-generic-password -s '${escapedService}' -a '${escapedAccount}'`,
      )
      return true
    }
    catch {
      return false
    }
  }

  async listAccounts(service: string): Promise<string[]> {
    const escapedService = service.replace(/'/g, '\'\\\'\'')

    try {
      const { stdout } = await execAsync(
        `security dump-keychain | grep -A 4 '"${escapedService}"' | grep '"acct"' | sed 's/.*="\\(.*\\)"/\\1/'`,
      )
      return stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(s => s.replace(/^"|"$/g, ''))
    }
    catch {
      return []
    }
  }
}

/**
 * Windows Credential Manager 后端
 *
 * @description
 * 使用 PowerShell 与 Windows Credential Manager 交互
 */
export class WindowsCredentialBackend implements IKeychainBackend {
  readonly type: StorageBackend = 'credential-manager'

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'win32') {
      return false
    }
    try {
      await execAsync('powershell -Command "Get-Command Get-StoredCredential -ErrorAction SilentlyContinue"')
      return true
    }
    catch {
      // 尝试使用 cmdkey 作为备选
      try {
        await execAsync('cmdkey /list')
        return true
      }
      catch {
        return false
      }
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const target = `${service}:${account}`
    const escapedPassword = password.replace(/"/g, '`"')

    try {
      // 使用 cmdkey 存储凭证
      await execAsync(
        `cmdkey /generic:"${target}" /user:"${account}" /pass:"${escapedPassword}"`,
      )
    }
    catch (error) {
      throw new Error(`Failed to store credential: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    const target = `${service}:${account}`

    try {
      // 使用 PowerShell 读取凭证
      const script = `
        Add-Type -AssemblyName System.Security
        $cred = [System.Net.CredentialCache]::DefaultCredentials
        $target = "${target}"
        $credman = New-Object -TypeName PSCredentialManager.CredentialManager
        $cred = $credman.GetCredential($target)
        if ($cred) { Write-Output $cred.Password }
      `
      const { stdout } = await execAsync(`powershell -Command "${script}"`)
      return stdout.trim() || null
    }
    catch {
      // 备选方案：使用 vaultcmd (需要管理员权限)
      return null
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    const target = `${service}:${account}`

    try {
      await execAsync(`cmdkey /delete:"${target}"`)
      return true
    }
    catch {
      return false
    }
  }

  async listAccounts(service: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('cmdkey /list')
      const lines = stdout.split('\n')
      const accounts: string[] = []

      for (const line of lines) {
        if (line.includes(`${service}:`)) {
          const match = line.match(new RegExp(`${service}:(.+)`))
          if (match) {
            accounts.push(match[1].trim())
          }
        }
      }

      return accounts
    }
    catch {
      return []
    }
  }
}

/**
 * Linux Secret Service 后端
 *
 * @description
 * 使用 secret-tool (libsecret) 与 GNOME Keyring / KDE Wallet 交互
 */
export class LinuxSecretServiceBackend implements IKeychainBackend {
  readonly type: StorageBackend = 'secret-service'

  async isAvailable(): Promise<boolean> {
    if (process.platform !== 'linux') {
      return false
    }
    try {
      await execAsync('which secret-tool')
      return true
    }
    catch {
      return false
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    try {
      // secret-tool 从 stdin 读取密码
      const child = exec(
        `secret-tool store --label="${service}:${account}" service "${service}" account "${account}"`,
      )

      if (child.stdin) {
        child.stdin.write(password)
        child.stdin.end()
      }

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            resolve()
          }
          else {
            reject(new Error(`secret-tool exited with code ${code}`))
          }
        })
        child.on('error', reject)
      })
    }
    catch (error) {
      throw new Error(`Failed to store secret: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `secret-tool lookup service "${service}" account "${account}"`,
      )
      return stdout.trim() || null
    }
    catch {
      return null
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    try {
      await execAsync(
        `secret-tool clear service "${service}" account "${account}"`,
      )
      return true
    }
    catch {
      return false
    }
  }

  async listAccounts(service: string): Promise<string[]> {
    try {
      // secret-tool 没有直接列出的功能，需要使用 search
      const { stdout } = await execAsync(
        `secret-tool search service "${service}" 2>/dev/null | grep "^attribute.account" | cut -d= -f2`,
      )
      return stdout.trim().split('\n').filter(Boolean)
    }
    catch {
      return []
    }
  }
}

/**
 * 文件存储后端 (回退方案)
 *
 * @description
 * 当系统密钥链不可用时，使用加密文件存储凭证
 * 凭证使用 AES-256-GCM 加密后存储在本地文件中
 */
export class FileStorageBackend implements IKeychainBackend {
  readonly type: StorageBackend = 'file'
  private readonly storagePath: string
  private readonly encryption: EncryptionService
  private masterKey: string | null = null

  /**
   * 创建文件存储后端
   * @param storagePath - 存储目录路径
   * @param masterKey - 主密钥 (可选，如果不提供则使用机器特定密钥)
   */
  constructor(storagePath?: string, masterKey?: string) {
    this.storagePath = storagePath || path.join(os.homedir(), '.ccjk', 'credentials')
    this.encryption = new EncryptionService()
    this.masterKey = masterKey || null
  }

  /**
   * 获取或生成主密钥
   */
  private async getMasterKey(): Promise<string> {
    if (this.masterKey) {
      return this.masterKey
    }

    // 使用机器特定信息生成密钥
    const machineId = await this.getMachineId()
    const keyPath = path.join(this.storagePath, '.key')

    try {
      const existingKey = await fs.readFile(keyPath, 'utf8')
      this.masterKey = existingKey.trim()
      return this.masterKey
    }
    catch {
      // 生成新密钥
      const newKey = this.encryption.generateKey(32)
      // 使用机器 ID 加密密钥
      const encrypted = await this.encryption.encrypt(newKey, machineId)
      await fs.mkdir(this.storagePath, { recursive: true, mode: 0o700 })
      await fs.writeFile(keyPath, JSON.stringify(encrypted), { mode: 0o600 })
      this.masterKey = newKey
      return this.masterKey
    }
  }

  /**
   * 获取机器唯一标识
   */
  private async getMachineId(): Promise<string> {
    const platform = process.platform as Platform

    try {
      if (platform === 'darwin') {
        const { stdout } = await execAsync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID')
        const match = stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)
        if (match) {
          return match[1]
        }
      }
      else if (platform === 'linux') {
        try {
          const machineId = await fs.readFile('/etc/machine-id', 'utf8')
          return machineId.trim()
        }
        catch {
          const dbusId = await fs.readFile('/var/lib/dbus/machine-id', 'utf8')
          return dbusId.trim()
        }
      }
      else if (platform === 'win32') {
        const { stdout } = await execAsync('wmic csproduct get uuid')
        const lines = stdout.trim().split('\n')
        if (lines.length > 1) {
          return lines[1].trim()
        }
      }
    }
    catch {
      // 忽略错误
    }

    // 回退：使用主机名和用户名的组合
    return EncryptionService.hash(`${os.hostname()}-${os.userInfo().username}`)
  }

  async isAvailable(): Promise<boolean> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true, mode: 0o700 })
      return true
    }
    catch {
      return false
    }
  }

  async setPassword(service: string, account: string, password: string): Promise<void> {
    const masterKey = await this.getMasterKey()
    const encrypted = await this.encryption.encrypt(password, masterKey)

    const filePath = this.getFilePath(service, account)
    await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 })
    await fs.writeFile(filePath, JSON.stringify(encrypted), { mode: 0o600 })
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    const filePath = this.getFilePath(service, account)

    try {
      const content = await fs.readFile(filePath, 'utf8')
      const encrypted = JSON.parse(content)
      const masterKey = await this.getMasterKey()
      return await this.encryption.decrypt(encrypted, masterKey)
    }
    catch {
      return null
    }
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    const filePath = this.getFilePath(service, account)

    try {
      await fs.unlink(filePath)
      return true
    }
    catch {
      return false
    }
  }

  async listAccounts(service: string): Promise<string[]> {
    const serviceDir = path.join(this.storagePath, this.sanitize(service))

    try {
      const files = await fs.readdir(serviceDir)
      return files
        .filter(f => f.endsWith('.enc'))
        .map(f => f.replace('.enc', ''))
    }
    catch {
      return []
    }
  }

  /**
   * 获取凭证文件路径
   */
  private getFilePath(service: string, account: string): string {
    return path.join(
      this.storagePath,
      this.sanitize(service),
      `${this.sanitize(account)}.enc`,
    )
  }

  /**
   * 清理文件名中的特殊字符
   */
  private sanitize(name: string): string {
    return name.replace(/[^\w-]/g, '_')
  }
}

/**
 * 创建适合当前平台的密钥链后端
 *
 * @description
 * 根据当前操作系统选择合适的密钥链后端：
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (GNOME Keyring / KDE Wallet)
 * - 回退: 加密文件存储
 *
 * @param fallbackStoragePath - 回退存储路径
 * @param masterKey - 主密钥 (用于文件存储)
 * @returns 密钥链后端实例
 */
export async function createKeychainBackend(
  fallbackStoragePath?: string,
  masterKey?: string,
): Promise<IKeychainBackend> {
  const platform = process.platform as Platform

  // 尝试使用系统密钥链
  let backend: IKeychainBackend

  if (platform === 'darwin') {
    backend = new MacOSKeychainBackend()
    if (await backend.isAvailable()) {
      return backend
    }
  }
  else if (platform === 'win32') {
    backend = new WindowsCredentialBackend()
    if (await backend.isAvailable()) {
      return backend
    }
  }
  else if (platform === 'linux') {
    backend = new LinuxSecretServiceBackend()
    if (await backend.isAvailable()) {
      return backend
    }
  }

  // 回退到文件存储
  const fileBackend = new FileStorageBackend(fallbackStoragePath, masterKey)
  if (await fileBackend.isAvailable()) {
    return fileBackend
  }

  throw new Error('No available keychain backend')
}

/**
 * 获取当前平台的密钥链后端类型
 */
export function getKeychainBackendType(): StorageBackend {
  const platform = process.platform as Platform

  switch (platform) {
    case 'darwin':
      return 'keychain'
    case 'win32':
      return 'credential-manager'
    case 'linux':
      return 'secret-service'
    default:
      return 'file'
  }
}

export default {
  MacOSKeychainBackend,
  WindowsCredentialBackend,
  LinuxSecretServiceBackend,
  FileStorageBackend,
  createKeychainBackend,
  getKeychainBackendType,
}

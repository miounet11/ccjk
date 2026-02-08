/**
 * CCJK Cloud Auto Bootstrap
 *
 * 全自动云服务初始化系统
 * - 安装后自动开启所有云功能
 * - 静默升级，用户无需任何操作
 * - 自动设备注册和匿名同步
 * - 预留云配置查看入口（初期隐藏）
 *
 * @module services/cloud/auto-bootstrap
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, hostname, platform, release, type } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../../constants'

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// Constants
// ============================================================================

/** 云服务配置目录 */
export const CLOUD_CONFIG_DIR = join(CCJK_CONFIG_DIR, 'cloud')

/** 设备配置文件 */
export const DEVICE_CONFIG_FILE = join(CLOUD_CONFIG_DIR, 'device.json')

/** 云服务状态文件 */
export const CLOUD_STATE_FILE = join(CLOUD_CONFIG_DIR, 'state.json')

/** 云服务 API 端点 */
export const CLOUD_API_ENDPOINT = 'https://api.api.claudehome.cn/v1'

/** 云配置查看页面（预留，初期隐藏） */
export const CLOUD_DASHBOARD_URL = 'https://cloud.api.claudehome.cn/dashboard'

/** 自动同步间隔（毫秒）- 默认 30 分钟 */
export const AUTO_SYNC_INTERVAL = 30 * 60 * 1000

/** 自动升级检查间隔（毫秒）- 默认 6 小时 */
export const AUTO_UPGRADE_CHECK_INTERVAL = 6 * 60 * 60 * 1000

/** 静默升级最大重试次数 */
export const SILENT_UPGRADE_MAX_RETRIES = 3

// ============================================================================
// Types
// ============================================================================

/**
 * 设备信息（匿名化）
 */
export interface DeviceInfo {
  /** 设备唯一 ID（自动生成的 UUID） */
  deviceId: string
  /** 设备指纹（匿名哈希） */
  fingerprint: string
  /** 首次注册时间 */
  registeredAt: string
  /** 最后活跃时间 */
  lastActiveAt: string
  /** 操作系统类型 */
  osType: string
  /** 操作系统版本 */
  osVersion: string
  /** CCJK 版本 */
  ccjkVersion: string
}

/**
 * 云服务状态
 */
export interface CloudState {
  /** 是否已初始化 */
  initialized: boolean
  /** 是否启用自动同步 */
  autoSyncEnabled: boolean
  /** 是否启用静默升级 */
  silentUpgradeEnabled: boolean
  /** 最后同步时间 */
  lastSyncAt: string | null
  /** 最后升级检查时间 */
  lastUpgradeCheckAt: string | null
  /** 最后升级时间 */
  lastUpgradedAt: string | null
  /** 同步统计 */
  syncStats: {
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
  }
  /** 升级统计 */
  upgradeStats: {
    totalChecks: number
    upgradesApplied: number
    upgradesFailed: number
  }
}

/**
 * 云服务握手响应
 */
export interface HandshakeResponse {
  success: boolean
  deviceId: string
  serverTime: string
  features: {
    autoSync: boolean
    silentUpgrade: boolean
    analytics: boolean
  }
  config: {
    syncInterval: number
    upgradeCheckInterval: number
  }
  message?: string
}

/**
 * 自动升级结果
 */
export interface SilentUpgradeResult {
  success: boolean
  upgraded: boolean
  fromVersion?: string
  toVersion?: string
  error?: string
}

// ============================================================================
// Device Management
// ============================================================================

/**
 * 生成设备指纹（匿名化）
 * 不包含任何可识别个人信息
 */
function generateDeviceFingerprint(): string {
  const data = [
    platform(),
    type(),
    homedir().split('/').length.toString(), // 只用路径深度，不用实际路径
    hostname().length.toString(), // 只用主机名长度，不用实际名称
  ].join('|')

  return createHash('sha256').update(data).digest('hex').substring(0, 32)
}

/**
 * 获取或创建设备信息
 */
export function getOrCreateDeviceInfo(): DeviceInfo {
  ensureCloudConfigDir()

  // 尝试读取现有设备信息
  if (existsSync(DEVICE_CONFIG_FILE)) {
    try {
      const data = readFileSync(DEVICE_CONFIG_FILE, 'utf-8')
      const device = JSON.parse(data) as DeviceInfo

      // 更新最后活跃时间
      device.lastActiveAt = new Date().toISOString()
      writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(device, null, 2))

      return device
    }
    catch {
      // 文件损坏，重新创建
    }
  }

  // 创建新设备信息
  const device: DeviceInfo = {
    deviceId: randomUUID(),
    fingerprint: generateDeviceFingerprint(),
    registeredAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    osType: platform(),
    osVersion: release(),
    ccjkVersion: getCcjkVersion(),
  }

  writeFileSync(DEVICE_CONFIG_FILE, JSON.stringify(device, null, 2))
  return device
}

/**
 * 获取 CCJK 版本
 */
function getCcjkVersion(): string {
  try {
    // 动态导入 package.json
    const packagePath = join(__dirname, '../../../package.json')
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'))
      return pkg.version || 'unknown'
    }
  }
  catch {
    // 忽略错误
  }
  return 'unknown'
}

// ============================================================================
// Cloud State Management
// ============================================================================

/**
 * 确保云配置目录存在
 */
function ensureCloudConfigDir(): void {
  if (!existsSync(CLOUD_CONFIG_DIR)) {
    mkdirSync(CLOUD_CONFIG_DIR, { recursive: true })
  }
}

/**
 * 获取云服务状态
 */
export function getCloudState(): CloudState {
  ensureCloudConfigDir()

  if (existsSync(CLOUD_STATE_FILE)) {
    try {
      const data = readFileSync(CLOUD_STATE_FILE, 'utf-8')
      return JSON.parse(data) as CloudState
    }
    catch {
      // 文件损坏，返回默认状态
    }
  }

  // 默认状态：全部自动开启
  return {
    initialized: false,
    autoSyncEnabled: true,
    silentUpgradeEnabled: true,
    lastSyncAt: null,
    lastUpgradeCheckAt: null,
    lastUpgradedAt: null,
    syncStats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
    },
    upgradeStats: {
      totalChecks: 0,
      upgradesApplied: 0,
      upgradesFailed: 0,
    },
  }
}

/**
 * 保存云服务状态
 */
export function saveCloudState(state: CloudState): void {
  ensureCloudConfigDir()
  writeFileSync(CLOUD_STATE_FILE, JSON.stringify(state, null, 2))
}

/**
 * 更新云服务状态
 */
export function updateCloudState(updates: Partial<CloudState>): CloudState {
  const state = getCloudState()
  const newState = { ...state, ...updates }
  saveCloudState(newState)
  return newState
}

// ============================================================================
// Auto Bootstrap
// ============================================================================

/**
 * 云服务自动引导
 *
 * 在 CLI 启动时自动调用，完成：
 * 1. 设备注册（首次运行）
 * 2. 云服务握手
 * 3. 启动后台自动同步
 * 4. 启动静默升级检查
 *
 * 全程静默，不打扰用户
 */
export async function autoBootstrap(): Promise<void> {
  try {
    const state = getCloudState()

    // 首次运行：初始化
    if (!state.initialized) {
      await initializeCloudServices()
    }

    // 执行握手（静默）
    await performHandshake()

    // 检查是否需要静默升级
    if (state.silentUpgradeEnabled) {
      await checkAndPerformSilentUpgrade()
    }

    // 检查是否需要自动同步
    if (state.autoSyncEnabled) {
      await performAutoSync()
    }
  }
  catch {
    // 所有错误静默处理，不影响用户使用
  }
}

/**
 * 初始化云服务（首次运行）
 */
async function initializeCloudServices(): Promise<void> {
  // 获取或创建设备信息
  const device = getOrCreateDeviceInfo()

  // 更新状态为已初始化
  updateCloudState({
    initialized: true,
    autoSyncEnabled: true,
    silentUpgradeEnabled: true,
  })

  // 向云端注册设备（静默）
  try {
    await registerDevice(device)
  }
  catch {
    // 注册失败不影响使用，下次重试
  }
}

/**
 * 向云端注册设备
 */
async function registerDevice(device: DeviceInfo): Promise<void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    await fetch(`${CLOUD_API_ENDPOINT}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `CCJK/${device.ccjkVersion}`,
      },
      body: JSON.stringify({
        deviceId: device.deviceId,
        fingerprint: device.fingerprint,
        osType: device.osType,
        osVersion: device.osVersion,
        ccjkVersion: device.ccjkVersion,
      }),
      signal: controller.signal,
    })
  }
  finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 执行云服务握手
 */
async function performHandshake(): Promise<HandshakeResponse | null> {
  const device = getOrCreateDeviceInfo()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${CLOUD_API_ENDPOINT}/handshake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `CCJK/${device.ccjkVersion}`,
        'X-Device-ID': device.deviceId,
      },
      body: JSON.stringify({
        deviceId: device.deviceId,
        ccjkVersion: device.ccjkVersion,
      }),
      signal: controller.signal,
    })

    if (response.ok) {
      return await response.json() as HandshakeResponse
    }
  }
  catch {
    // 握手失败静默处理
  }
  finally {
    clearTimeout(timeoutId)
  }

  return null
}

// ============================================================================
// Silent Upgrade
// ============================================================================

/**
 * 检查并执行静默升级
 */
async function checkAndPerformSilentUpgrade(): Promise<SilentUpgradeResult> {
  const state = getCloudState()
  const now = Date.now()

  // 检查是否需要升级检查
  if (state.lastUpgradeCheckAt) {
    const lastCheck = new Date(state.lastUpgradeCheckAt).getTime()
    if (now - lastCheck < AUTO_UPGRADE_CHECK_INTERVAL) {
      return { success: true, upgraded: false }
    }
  }

  // 更新检查时间
  updateCloudState({
    lastUpgradeCheckAt: new Date().toISOString(),
    upgradeStats: {
      ...state.upgradeStats,
      totalChecks: state.upgradeStats.totalChecks + 1,
    },
  })

  try {
    // 检查是否有新版本
    const updateInfo = await checkForUpdates()

    if (updateInfo.hasUpdate) {
      // 执行静默升级
      const result = await performSilentUpgrade(updateInfo.latestVersion)

      if (result.success && result.upgraded) {
        updateCloudState({
          lastUpgradedAt: new Date().toISOString(),
          upgradeStats: {
            ...getCloudState().upgradeStats,
            upgradesApplied: getCloudState().upgradeStats.upgradesApplied + 1,
          },
        })
      }

      return result
    }

    return { success: true, upgraded: false }
  }
  catch (error) {
    updateCloudState({
      upgradeStats: {
        ...getCloudState().upgradeStats,
        upgradesFailed: getCloudState().upgradeStats.upgradesFailed + 1,
      },
    })

    return {
      success: false,
      upgraded: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 检查更新
 */
async function checkForUpdates(): Promise<{ hasUpdate: boolean, latestVersion: string, currentVersion: string }> {
  const currentVersion = getCcjkVersion()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch('https://registry.npmjs.org/ccjk/latest', {
      signal: controller.signal,
    })

    if (response.ok) {
      const data = await response.json() as { version: string }
      const latestVersion = data.version

      return {
        hasUpdate: isNewerVersion(latestVersion, currentVersion),
        latestVersion,
        currentVersion,
      }
    }
  }
  catch {
    // 检查失败
  }
  finally {
    clearTimeout(timeoutId)
  }

  return { hasUpdate: false, latestVersion: currentVersion, currentVersion }
}

/**
 * 比较版本号
 */
function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number)
  const currentParts = current.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const l = latestParts[i] || 0
    const c = currentParts[i] || 0
    if (l > c)
      return true
    if (l < c)
      return false
  }

  return false
}

/**
 * 执行静默升级
 */
async function performSilentUpgrade(targetVersion: string): Promise<SilentUpgradeResult> {
  const currentVersion = getCcjkVersion()

  try {
    // 使用 spawn 执行 npm update，完全静默
    const { exec } = await import('tinyexec')

    const result = await exec('npm', ['update', '-g', 'ccjk'], {
      timeout: 60000, // 60 秒超时
    })

    if (result.exitCode === 0) {
      return {
        success: true,
        upgraded: true,
        fromVersion: currentVersion,
        toVersion: targetVersion,
      }
    }

    return {
      success: false,
      upgraded: false,
      error: result.stderr || 'Upgrade failed',
    }
  }
  catch (error) {
    return {
      success: false,
      upgraded: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Auto Sync
// ============================================================================

/**
 * 执行自动同步
 */
async function performAutoSync(): Promise<void> {
  const state = getCloudState()
  const now = Date.now()

  // 检查是否需要同步
  if (state.lastSyncAt) {
    const lastSync = new Date(state.lastSyncAt).getTime()
    if (now - lastSync < AUTO_SYNC_INTERVAL) {
      return
    }
  }

  try {
    // 执行同步（静默）
    await syncToCloud()

    updateCloudState({
      lastSyncAt: new Date().toISOString(),
      syncStats: {
        ...state.syncStats,
        totalSyncs: state.syncStats.totalSyncs + 1,
        successfulSyncs: state.syncStats.successfulSyncs + 1,
      },
    })
  }
  catch {
    updateCloudState({
      syncStats: {
        ...state.syncStats,
        totalSyncs: state.syncStats.totalSyncs + 1,
        failedSyncs: state.syncStats.failedSyncs + 1,
      },
    })
  }
}

/**
 * 同步到云端
 */
async function syncToCloud(): Promise<void> {
  const device = getOrCreateDeviceInfo()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    // 收集需要同步的数据（匿名化）
    const syncData = await collectSyncData()

    await fetch(`${CLOUD_API_ENDPOINT}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `CCJK/${device.ccjkVersion}`,
        'X-Device-ID': device.deviceId,
      },
      body: JSON.stringify(syncData),
      signal: controller.signal,
    })
  }
  finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 收集同步数据（匿名化）
 */
async function collectSyncData(): Promise<Record<string, unknown>> {
  const device = getOrCreateDeviceInfo()

  return {
    deviceId: device.deviceId,
    timestamp: new Date().toISOString(),
    // 只同步匿名化的使用统计
    stats: {
      osType: device.osType,
      ccjkVersion: device.ccjkVersion,
    },
  }
}

// ============================================================================
// Cloud Dashboard (Hidden for now)
// ============================================================================

/**
 * 获取云配置查看链接
 *
 * 注意：此功能初期隐藏，后续版本开放
 *
 * @returns 云配置查看 URL
 */
export function getCloudDashboardUrl(): string {
  const device = getOrCreateDeviceInfo()
  return `${CLOUD_DASHBOARD_URL}?device=${device.deviceId}`
}

/**
 * 检查云配置查看功能是否启用
 *
 * 初期返回 false，后续版本开放
 */
export function isCloudDashboardEnabled(): boolean {
  // TODO: 后续版本开放此功能
  return false
}

// ============================================================================
// Exports
// ============================================================================

export {
  autoBootstrap as bootstrap,
  checkAndPerformSilentUpgrade as checkUpgrade,
  performAutoSync as sync,
}

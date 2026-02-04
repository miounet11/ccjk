/**
 * Silent Updater - 静默自动升级系统
 *
 * 全自动升级所有相关工具：
 * - CCJK 本身
 * - Claude Code
 * - CCR (Claude Code Router)
 * - 其他已安装的工具
 *
 * 特点：
 * - 完全静默，用户无感知
 * - 后台执行，不阻塞主进程
 * - 智能重试和错误恢复
 * - 升级日志记录
 *
 * @module services/cloud/silent-updater
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { platform } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import { CCJK_CONFIG_DIR } from '../../constants'
import { getCloudState, updateCloudState } from './auto-bootstrap'

// ============================================================================
// Constants
// ============================================================================

/** 升级日志目录 */
export const UPGRADE_LOG_DIR = join(CCJK_CONFIG_DIR, 'cloud', 'logs')

/** 升级日志文件 */
export const UPGRADE_LOG_FILE = join(UPGRADE_LOG_DIR, 'upgrades.log')

/** 升级锁文件（防止并发升级） */
export const UPGRADE_LOCK_FILE = join(CCJK_CONFIG_DIR, 'cloud', '.upgrade.lock')

/** 升级检查间隔（毫秒）- 6 小时 */
export const UPGRADE_CHECK_INTERVAL = 6 * 60 * 60 * 1000

/** 升级超时（毫秒）- 5 分钟 */
export const UPGRADE_TIMEOUT = 5 * 60 * 1000

/** 最大重试次数 */
export const MAX_RETRIES = 3

/** 重试延迟（毫秒） */
export const RETRY_DELAY = 5000

// ============================================================================
// Types
// ============================================================================

/**
 * 可升级的工具类型
 */
export type UpgradableTool = 'ccjk' | 'claude-code' | 'ccr' | 'cometix-line'

/**
 * 工具版本信息
 */
export interface ToolVersionInfo {
  tool: UpgradableTool
  installed: boolean
  currentVersion: string | null
  latestVersion: string | null
  needsUpdate: boolean
  installMethod: 'npm' | 'homebrew' | 'curl' | 'unknown'
}

/**
 * 升级结果
 */
export interface UpgradeResult {
  tool: UpgradableTool
  success: boolean
  upgraded: boolean
  fromVersion?: string
  toVersion?: string
  error?: string
  duration: number
}

/**
 * 批量升级结果
 */
export interface BatchUpgradeResult {
  success: boolean
  results: UpgradeResult[]
  totalDuration: number
  upgradedCount: number
  failedCount: number
}

/**
 * 升级日志条目
 */
export interface UpgradeLogEntry {
  timestamp: string
  tool: UpgradableTool
  fromVersion: string
  toVersion: string
  success: boolean
  error?: string
  duration: number
}

// ============================================================================
// Version Checking
// ============================================================================

/**
 * 检查所有工具的版本
 */
export async function checkAllToolVersions(): Promise<ToolVersionInfo[]> {
  const results: ToolVersionInfo[] = []

  // 并行检查所有工具
  const [ccjk, claudeCode, ccr] = await Promise.all([
    checkCcjkVersion(),
    checkClaudeCodeVersion(),
    checkCcrVersion(),
  ])

  results.push(ccjk, claudeCode, ccr)
  return results
}

/**
 * 检查 CCJK 版本
 */
async function checkCcjkVersion(): Promise<ToolVersionInfo> {
  try {
    const currentVersion = getCurrentCcjkVersion()
    const latestVersion = await fetchLatestNpmVersion('ccjk')

    return {
      tool: 'ccjk',
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate: latestVersion ? isNewerVersion(latestVersion, currentVersion) : false,
      installMethod: 'npm',
    }
  }
  catch {
    return {
      tool: 'ccjk',
      installed: true,
      currentVersion: getCurrentCcjkVersion(),
      latestVersion: null,
      needsUpdate: false,
      installMethod: 'npm',
    }
  }
}

/**
 * 检查 Claude Code 版本
 */
async function checkClaudeCodeVersion(): Promise<ToolVersionInfo> {
  try {
    const { exec } = await import('tinyexec')

    // 检查是否安装
    const result = await exec('claude', ['--version'], { timeout: 5000 })

    if (result.exitCode !== 0) {
      return {
        tool: 'claude-code',
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
        installMethod: 'unknown',
      }
    }

    const currentVersion = result.stdout.trim().replace(/^v/, '')
    const latestVersion = await fetchLatestNpmVersion('@anthropic-ai/claude-code')

    // 检测安装方式
    const installMethod = await detectClaudeCodeInstallMethod()

    return {
      tool: 'claude-code',
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate: latestVersion ? isNewerVersion(latestVersion, currentVersion) : false,
      installMethod,
    }
  }
  catch {
    return {
      tool: 'claude-code',
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false,
      installMethod: 'unknown',
    }
  }
}

/**
 * 检查 CCR 版本
 */
async function checkCcrVersion(): Promise<ToolVersionInfo> {
  try {
    const { exec } = await import('tinyexec')

    const result = await exec('ccr', ['--version'], { timeout: 5000 })

    if (result.exitCode !== 0) {
      return {
        tool: 'ccr',
        installed: false,
        currentVersion: null,
        latestVersion: null,
        needsUpdate: false,
        installMethod: 'unknown',
      }
    }

    const currentVersion = result.stdout.trim().replace(/^v/, '')
    const latestVersion = await fetchLatestNpmVersion('@musistudio/claude-code-router')

    return {
      tool: 'ccr',
      installed: true,
      currentVersion,
      latestVersion,
      needsUpdate: latestVersion ? isNewerVersion(latestVersion, currentVersion) : false,
      installMethod: 'npm',
    }
  }
  catch {
    return {
      tool: 'ccr',
      installed: false,
      currentVersion: null,
      latestVersion: null,
      needsUpdate: false,
      installMethod: 'unknown',
    }
  }
}

/**
 * 获取当前 CCJK 版本
 */
function getCurrentCcjkVersion(): string {
  try {
    const packagePath = join(__dirname, '../../../package.json')
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'))
      return pkg.version || 'unknown'
    }
  }
  catch {
    // 忽略
  }
  return 'unknown'
}

/**
 * 从 npm registry 获取最新版本
 */
async function fetchLatestNpmVersion(packageName: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      signal: controller.signal,
    })

    if (response.ok) {
      const data = await response.json() as { version: string }
      return data.version
    }
  }
  catch {
    // 忽略
  }
  finally {
    clearTimeout(timeoutId)
  }

  return null
}

/**
 * 检测 Claude Code 安装方式
 */
async function detectClaudeCodeInstallMethod(): Promise<'npm' | 'homebrew' | 'curl' | 'unknown'> {
  try {
    const { exec } = await import('tinyexec')

    // 检查 Homebrew
    if (platform() === 'darwin') {
      const brewResult = await exec('brew', ['list', '--cask', 'claude-code'], { timeout: 5000 })
      if (brewResult.exitCode === 0) {
        return 'homebrew'
      }
    }

    // 检查 npm
    const npmResult = await exec('npm', ['list', '-g', '@anthropic-ai/claude-code'], { timeout: 5000 })
    if (npmResult.exitCode === 0 && npmResult.stdout.includes('@anthropic-ai/claude-code')) {
      return 'npm'
    }

    // 默认假设是 curl 安装
    return 'curl'
  }
  catch {
    return 'unknown'
  }
}

/**
 * 比较版本号
 */
function isNewerVersion(latest: string, current: string): boolean {
  if (!latest || !current || current === 'unknown')
    return false

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

// ============================================================================
// Silent Upgrade Execution
// ============================================================================

/**
 * 执行静默升级（所有需要升级的工具）
 */
export async function performSilentUpgradeAll(): Promise<BatchUpgradeResult> {
  const startTime = Date.now()
  const results: UpgradeResult[] = []

  // 检查升级锁
  if (isUpgradeLocked()) {
    return {
      success: false,
      results: [],
      totalDuration: 0,
      upgradedCount: 0,
      failedCount: 0,
    }
  }

  try {
    // 创建升级锁
    createUpgradeLock()

    // 检查所有工具版本
    const versions = await checkAllToolVersions()

    // 筛选需要升级的工具
    const toolsToUpgrade = versions.filter(v => v.needsUpdate && v.installed)

    // 依次升级（避免并发问题）
    for (const tool of toolsToUpgrade) {
      const result = await upgradeTool(tool)
      results.push(result)

      // 记录日志
      logUpgrade({
        timestamp: new Date().toISOString(),
        tool: tool.tool,
        fromVersion: tool.currentVersion || 'unknown',
        toVersion: tool.latestVersion || 'unknown',
        success: result.success,
        error: result.error,
        duration: result.duration,
      })
    }

    const totalDuration = Date.now() - startTime
    const upgradedCount = results.filter(r => r.upgraded).length
    const failedCount = results.filter(r => !r.success).length

    // 更新云状态
    const state = getCloudState()
    updateCloudState({
      lastUpgradeCheckAt: new Date().toISOString(),
      upgradeStats: {
        totalChecks: state.upgradeStats.totalChecks + 1,
        upgradesApplied: state.upgradeStats.upgradesApplied + upgradedCount,
        upgradesFailed: state.upgradeStats.upgradesFailed + failedCount,
      },
    })

    return {
      success: failedCount === 0,
      results,
      totalDuration,
      upgradedCount,
      failedCount,
    }
  }
  finally {
    // 释放升级锁
    releaseUpgradeLock()
  }
}

/**
 * 升级单个工具
 */
async function upgradeTool(info: ToolVersionInfo): Promise<UpgradeResult> {
  const startTime = Date.now()

  try {
    switch (info.tool) {
      case 'ccjk':
        return await upgradeCcjk(info, startTime)
      case 'claude-code':
        return await upgradeClaudeCode(info, startTime)
      case 'ccr':
        return await upgradeCcr(info, startTime)
      default:
        return {
          tool: info.tool,
          success: false,
          upgraded: false,
          error: 'Unknown tool',
          duration: Date.now() - startTime,
        }
    }
  }
  catch (error) {
    return {
      tool: info.tool,
      success: false,
      upgraded: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

/**
 * 升级 CCJK
 */
async function upgradeCcjk(info: ToolVersionInfo, startTime: number): Promise<UpgradeResult> {
  const { exec } = await import('tinyexec')

  const result = await exec('npm', ['update', '-g', 'ccjk'], {
    timeout: UPGRADE_TIMEOUT,
  })

  return {
    tool: 'ccjk',
    success: result.exitCode === 0,
    upgraded: result.exitCode === 0,
    fromVersion: info.currentVersion || undefined,
    toVersion: info.latestVersion || undefined,
    error: result.exitCode !== 0 ? result.stderr : undefined,
    duration: Date.now() - startTime,
  }
}

/**
 * 升级 Claude Code
 */
async function upgradeClaudeCode(info: ToolVersionInfo, startTime: number): Promise<UpgradeResult> {
  const { exec } = await import('tinyexec')

  let result

  switch (info.installMethod) {
    case 'homebrew':
      result = await exec('brew', ['upgrade', '--cask', 'claude-code'], {
        timeout: UPGRADE_TIMEOUT,
      })
      break

    case 'npm':
      result = await exec('npm', ['update', '-g', '@anthropic-ai/claude-code'], {
        timeout: UPGRADE_TIMEOUT,
      })
      break

    case 'curl':
    default:
      // 使用 claude update 命令
      result = await exec('claude', ['update'], {
        timeout: UPGRADE_TIMEOUT,
      })
      break
  }

  return {
    tool: 'claude-code',
    success: result.exitCode === 0,
    upgraded: result.exitCode === 0,
    fromVersion: info.currentVersion || undefined,
    toVersion: info.latestVersion || undefined,
    error: result.exitCode !== 0 ? result.stderr : undefined,
    duration: Date.now() - startTime,
  }
}

/**
 * 升级 CCR
 */
async function upgradeCcr(info: ToolVersionInfo, startTime: number): Promise<UpgradeResult> {
  const { exec } = await import('tinyexec')

  const result = await exec('npm', ['update', '-g', '@musistudio/claude-code-router'], {
    timeout: UPGRADE_TIMEOUT,
  })

  return {
    tool: 'ccr',
    success: result.exitCode === 0,
    upgraded: result.exitCode === 0,
    fromVersion: info.currentVersion || undefined,
    toVersion: info.latestVersion || undefined,
    error: result.exitCode !== 0 ? result.stderr : undefined,
    duration: Date.now() - startTime,
  }
}

// ============================================================================
// Upgrade Lock Management
// ============================================================================

/**
 * 检查是否有升级锁
 */
function isUpgradeLocked(): boolean {
  if (!existsSync(UPGRADE_LOCK_FILE)) {
    return false
  }

  try {
    const lockData = JSON.parse(readFileSync(UPGRADE_LOCK_FILE, 'utf-8'))
    const lockTime = new Date(lockData.timestamp).getTime()
    const now = Date.now()

    // 锁超过 10 分钟自动释放
    if (now - lockTime > 10 * 60 * 1000) {
      releaseUpgradeLock()
      return false
    }

    return true
  }
  catch {
    return false
  }
}

/**
 * 创建升级锁
 */
function createUpgradeLock(): void {
  ensureLogDir()
  writeFileSync(UPGRADE_LOCK_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    pid: process.pid,
  }))
}

/**
 * 释放升级锁
 */
function releaseUpgradeLock(): void {
  try {
    if (existsSync(UPGRADE_LOCK_FILE)) {
      unlinkSync(UPGRADE_LOCK_FILE)
    }
  }
  catch {
    // 忽略
  }
}

// ============================================================================
// Logging
// ============================================================================

/**
 * 确保日志目录存在
 */
function ensureLogDir(): void {
  if (!existsSync(UPGRADE_LOG_DIR)) {
    mkdirSync(UPGRADE_LOG_DIR, { recursive: true })
  }
}

/**
 * 记录升级日志
 */
function logUpgrade(entry: UpgradeLogEntry): void {
  ensureLogDir()

  const logLine = [
    entry.timestamp,
    entry.tool,
    entry.fromVersion,
    '->',
    entry.toVersion,
    entry.success ? 'SUCCESS' : 'FAILED',
    entry.error || '',
    `${entry.duration}ms`,
  ].join(' | ')

  appendFileSync(UPGRADE_LOG_FILE, `${logLine}\n`)
}

/**
 * 读取升级日志
 */
export function readUpgradeLog(limit = 50): UpgradeLogEntry[] {
  if (!existsSync(UPGRADE_LOG_FILE)) {
    return []
  }

  try {
    const content = readFileSync(UPGRADE_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').slice(-limit)

    return lines.map((line) => {
      const parts = line.split(' | ')
      return {
        timestamp: parts[0],
        tool: parts[1] as UpgradableTool,
        fromVersion: parts[2],
        toVersion: parts[4],
        success: parts[5] === 'SUCCESS',
        error: parts[6] || undefined,
        duration: Number.parseInt(parts[7]) || 0,
      }
    })
  }
  catch {
    return []
  }
}

// ============================================================================
// Scheduled Upgrade Check
// ============================================================================

/**
 * 检查是否需要执行升级检查
 */
export function shouldCheckForUpgrades(): boolean {
  const state = getCloudState()

  if (!state.silentUpgradeEnabled) {
    return false
  }

  if (!state.lastUpgradeCheckAt) {
    return true
  }

  const lastCheck = new Date(state.lastUpgradeCheckAt).getTime()
  const now = Date.now()

  return now - lastCheck >= UPGRADE_CHECK_INTERVAL
}

/**
 * 执行定时升级检查（如果需要）
 */
export async function checkAndUpgradeIfNeeded(): Promise<BatchUpgradeResult | null> {
  if (!shouldCheckForUpgrades()) {
    return null
  }

  return performSilentUpgradeAll()
}

// ============================================================================
// Exports
// ============================================================================

export {
  checkAndUpgradeIfNeeded as autoUpgrade,
  checkAllToolVersions as checkVersions,
  performSilentUpgradeAll as upgradeAll,
}

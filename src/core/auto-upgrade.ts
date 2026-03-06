/**
 * Auto-Upgrade Engine
 * 自动升级引擎 - 检测新版本并提示升级
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// ============================================================================
// 版本检测
// ============================================================================

interface VersionInfo {
  current: string
  latest: string
  hasUpdate: boolean
  updateType: 'major' | 'minor' | 'patch' | null
}

/**
 * 获取当前版本
 */
function getCurrentVersion(): string {
  try {
    const packagePath = join(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'))
    return pkg.version
  }
  catch {
    return '0.0.0'
  }
}

/**
 * 获取最新版本（从 npm registry）
 */
async function getLatestVersion(): Promise<string> {
  try {
    const result = execSync('npm view @cometx/ccjk version', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'ignore'], // 忽略 stderr
    })
    return result.trim()
  }
  catch {
    return getCurrentVersion() // 如果失败，返回当前版本
  }
}

/**
 * 比较版本号
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2)
      return 1
    if (p1 < p2)
      return -1
  }
  return 0
}

/**
 * 检测更新类型
 */
function detectUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' | null {
  const c = current.split('.').map(Number)
  const l = latest.split('.').map(Number)

  if (l[0] > c[0])
    return 'major'
  if (l[1] > c[1])
    return 'minor'
  if (l[2] > c[2])
    return 'patch'
  return null
}

/**
 * 检查是否有新版本
 */
export async function checkForUpdates(): Promise<VersionInfo> {
  const current = getCurrentVersion()
  const latest = await getLatestVersion()
  const hasUpdate = compareVersions(latest, current) > 0
  const updateType = hasUpdate ? detectUpdateType(current, latest) : null

  return {
    current,
    latest,
    hasUpdate,
    updateType,
  }
}

// ============================================================================
// 升级提示管理
// ============================================================================

interface UpgradePromptState {
  lastChecked: number
  lastPrompted: number
  dismissedVersion?: string
}

const PROMPT_STATE_FILE = join(homedir(), '.claude', '.upgrade-state.json')
const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 小时
const PROMPT_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 天

/**
 * 读取提示状态
 */
function readPromptState(): UpgradePromptState {
  try {
    if (existsSync(PROMPT_STATE_FILE)) {
      return JSON.parse(readFileSync(PROMPT_STATE_FILE, 'utf-8'))
    }
  }
  catch {}

  return {
    lastChecked: 0,
    lastPrompted: 0,
  }
}

/**
 * 保存提示状态
 */
function savePromptState(state: UpgradePromptState): void {
  try {
    writeFileSync(PROMPT_STATE_FILE, JSON.stringify(state, null, 2))
  }
  catch {}
}

/**
 * 检查是否应该显示升级提示
 */
function shouldShowPrompt(versionInfo: VersionInfo, state: UpgradePromptState): boolean {
  const now = Date.now()

  // 如果用户已经忽略了这个版本，不再提示
  if (state.dismissedVersion === versionInfo.latest) {
    return false
  }

  // 如果距离上次提示不到 7 天，不提示
  if (now - state.lastPrompted < PROMPT_INTERVAL) {
    return false
  }

  // 如果有更新，显示提示
  return versionInfo.hasUpdate
}

/**
 * 显示升级提示
 */
function showUpgradePrompt(versionInfo: VersionInfo): void {
  const { current, latest, updateType } = versionInfo

  console.log(`\n${'='.repeat(60)}`)
  console.log('🚀 New version available!')
  console.log(`   Current: v${current}`)
  console.log(`   Latest:  v${latest} (${updateType} update)`)
  console.log('\n   Upgrade now:')
  console.log('   npm install -g @cometx/ccjk@latest')
  console.log('   # or')
  console.log('   pnpm add -g @cometx/ccjk@latest')
  console.log(`${'='.repeat(60)}\n`)
}

/**
 * 自动检查更新（在 CLI 启动时调用）
 */
export async function autoCheckUpdates(silent = false): Promise<void> {
  try {
    const state = readPromptState()
    const now = Date.now()

    // 如果距离上次检查不到 24 小时，跳过
    if (now - state.lastChecked < CHECK_INTERVAL) {
      return
    }

    // 更新检查时间
    state.lastChecked = now
    savePromptState(state)

    // 检查更新
    const versionInfo = await checkForUpdates()

    // 如果应该显示提示
    if (!silent && shouldShowPrompt(versionInfo, state)) {
      showUpgradePrompt(versionInfo)
      state.lastPrompted = now
      savePromptState(state)
    }
  }
  catch {
    // 静默失败，不阻塞 CLI 启动
  }
}

/**
 * 执行升级
 */
export async function performUpgrade(): Promise<boolean> {
  try {
    console.log('🚀 Upgrading CCJK...')

    // 检测包管理器
    let packageManager = 'npm'
    try {
      execSync('pnpm --version', { stdio: 'ignore' })
      packageManager = 'pnpm'
    }
    catch {
      try {
        execSync('yarn --version', { stdio: 'ignore' })
        packageManager = 'yarn'
      }
      catch {}
    }

    // 执行升级
    const command = packageManager === 'yarn'
      ? 'yarn global add @cometx/ccjk@latest'
      : `${packageManager} add -g @cometx/ccjk@latest`

    console.log(`   Running: ${command}`)
    execSync(command, { stdio: 'inherit' })

    console.log('\n✅ Upgrade completed!')
    return true
  }
  catch (error) {
    console.error('❌ Upgrade failed:', error)
    return false
  }
}

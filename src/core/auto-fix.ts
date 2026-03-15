/**
 * Auto-Fix Engine
 * 自动修复引擎 - 检测并自动修复常见配置问题
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { migrateSettingsForTokenRetrieval, needsMigration } from '../utils/config-migration'

const AUTO_UPGRADE_STATE_FILE = join(homedir(), '.ccjk', '.auto-upgrade-state.json')
const AUTO_UPGRADE_INTERVAL = 7 * 24 * 60 * 60 * 1000 // 7 days

// ============================================================================
// 配置问题检测
// ============================================================================

interface ConfigIssue {
  type: 'missing' | 'invalid' | 'outdated'
  severity: 'critical' | 'warning' | 'info'
  description: string
  fix: () => Promise<boolean>
}

/**
 * 检测 settings.json 问题
 */
export async function detectSettingsIssues(): Promise<ConfigIssue[]> {
  const issues: ConfigIssue[] = []
  const settingsPath = join(homedir(), '.claude', 'settings.json')

  // 检查文件是否存在
  if (!existsSync(settingsPath)) {
    issues.push({
      type: 'missing',
      severity: 'critical',
      description: 'settings.json not found',
      fix: async () => {
        try {
          const { init } = await import('../commands/init')
          await init({ silent: true, skipPrompt: true })
          return true
        }
        catch {
          return false
        }
      },
    })
    return issues
  }

  // 检查 JSON 格式
  try {
    const content = readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(content)

    if (needsMigration()) {
      issues.push({
        type: 'outdated',
        severity: 'critical',
        description: 'Adaptive Claude model routing configuration needs repair',
        fix: async () => migrateSettingsForTokenRetrieval().success,
      })
    }

    // Guard adaptive routing: settings.model overrides env vars,
    // breaking Haiku/Sonnet/Opus per-task routing
    const env = settings.env || {}
    const hasAdaptiveEnvVars = Boolean(
      env.ANTHROPIC_DEFAULT_HAIKU_MODEL
      || env.ANTHROPIC_DEFAULT_SONNET_MODEL
      || env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    )
    if (settings.model === 'default') {
      issues.push({
        type: 'invalid',
        severity: 'critical',
        description: 'settings.model is set to invalid runtime value "default"',
        fix: async () => {
          delete settings.model
          writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
          return true
        },
      })
    }

    if (settings.model && settings.model !== 'default' && hasAdaptiveEnvVars) {
      issues.push({
        type: 'invalid',
        severity: 'critical',
        description: 'settings.model overrides adaptive model routing',
        fix: async () => {
          delete settings.model
          writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
          return true
        },
      })
    }

    // 检查必需字段
    if (!settings.apiType) {
      issues.push({
        type: 'invalid',
        severity: 'critical',
        description: 'Missing apiType in settings.json',
        fix: async () => {
          settings.apiType = 'anthropic'
          writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
          return true
        },
      })
    }

    // 检查 API key - 只在非 CCR 模式下检查
    if (settings.apiType === 'anthropic' && !settings.apiKey && !process.env.ANTHROPIC_API_KEY) {
      issues.push({
        type: 'missing',
        severity: 'info', // 降级为 info，不会在启动时自动修复
        description: 'No API key configured',
        fix: async () => false, // 不输出任何内容
      })
    }
  }
  catch (_error) {
    issues.push({
      type: 'invalid',
      severity: 'critical',
      description: 'Invalid JSON format in settings.json',
      fix: async () => {
        try {
          // 备份损坏的文件
          const backupPath = `${settingsPath}.backup`
          const content = readFileSync(settingsPath, 'utf-8')
          writeFileSync(backupPath, content)

          // 重新初始化
          const { init } = await import('../commands/init')
          await init({ silent: true, skipPrompt: true, force: true })
          return true
        }
        catch {
          return false
        }
      },
    })
  }

  return issues
}

/**
 * 检测 MCP 配置问题
 */
export async function detectMcpIssues(): Promise<ConfigIssue[]> {
  const issues: ConfigIssue[] = []
  const mcpConfigPath = join(homedir(), '.claude', 'mcp_settings.json')

  if (!existsSync(mcpConfigPath)) {
    return issues // MCP 配置是可选的
  }

  try {
    const content = readFileSync(mcpConfigPath, 'utf-8')
    JSON.parse(content) // 验证 JSON 格式
  }
  catch {
    issues.push({
      type: 'invalid',
      severity: 'warning',
      description: 'Invalid MCP configuration',
      fix: async () => {
        try {
          // 备份并重置
          const backupPath = `${mcpConfigPath}.backup`
          const content = readFileSync(mcpConfigPath, 'utf-8')
          writeFileSync(backupPath, content)
          writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers: {} }, null, 2))
          return true
        }
        catch {
          return false
        }
      },
    })
  }

  return issues
}

/**
 * 自动修复所有检测到的问题
 */
export async function autoFixAll(silent = true): Promise<{
  fixed: number
  failed: number
  total: number
}> {
  const allIssues = [
    ...(await detectSettingsIssues()),
    ...(await detectMcpIssues()),
  ]

  let fixed = 0
  let failed = 0

  for (const issue of allIssues) {
    // 只自动修复 critical 和 warning 级别的问题
    if (issue.severity === 'info') {
      continue
    }

    if (!silent) {
      console.log(`🔧 Fixing: ${issue.description}`)
    }

    try {
      const success = await issue.fix()
      if (success) {
        fixed++
        if (!silent) {
          console.log(`   ✅ Fixed`)
        }
      }
      else {
        failed++
        if (!silent) {
          console.log(`   ❌ Failed`)
        }
      }
    }
    catch (_error) {
      failed++
      if (!silent) {
        console.log(`   ❌ Error: ${_error}`)
      }
    }
  }

  return {
    fixed,
    failed,
    total: allIssues.length,
  }
}

/**
 * Run auto-fix + periodic self-upgrade on CLI startup
 */
export async function runAutoFixOnStartup(): Promise<void> {
  try {
    await autoFixAll(true)
  }
  catch {
    // Silent failure, never block CLI startup
  }

  // Periodic self-upgrade (every 7 days, background, no user prompt)
  try {
    await autoUpgradeCcjk()
  }
  catch {
    // Silent failure
  }
}

/**
 * Auto-upgrade CCJK every 7 days.
 * Runs silently in the background, no user authorization needed.
 */
async function autoUpgradeCcjk(): Promise<void> {
  const now = Date.now()

  // Read last upgrade timestamp
  let lastUpgrade = 0
  try {
    if (existsSync(AUTO_UPGRADE_STATE_FILE)) {
      const state = JSON.parse(readFileSync(AUTO_UPGRADE_STATE_FILE, 'utf-8'))
      lastUpgrade = state.lastUpgrade || 0
    }
  }
  catch {
    // Corrupted state file, proceed with upgrade
  }

  if (now - lastUpgrade < AUTO_UPGRADE_INTERVAL) {
    return
  }

  // Ensure state directory exists
  const stateDir = join(homedir(), '.ccjk')
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true })
  }

  // Save timestamp FIRST to prevent retry storms on failure
  writeFileSync(AUTO_UPGRADE_STATE_FILE, JSON.stringify({
    lastUpgrade: now,
    lastAttempt: new Date().toISOString(),
  }))

  // Run upgrade in background — fire and forget
  const { exec } = await import('tinyexec')
  exec('npm', ['update', '-g', 'ccjk'], {
    timeout: 120_000,
    nodeOptions: { detached: true, stdio: 'ignore' },
  }).then(() => {}, () => {
    // Silent failure — will retry in 7 days
  })
}

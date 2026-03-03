/**
 * Auto-Fix Engine
 * 自动修复引擎 - 检测并自动修复常见配置问题
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

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

    // 检查 API key
    if (!settings.apiKey && !process.env.ANTHROPIC_API_KEY) {
      issues.push({
        type: 'missing',
        severity: 'warning',
        description: 'No API key configured',
        fix: async () => {
          console.log('⚠️  Please run: ccjk init --api-key YOUR_KEY')
          return false
        },
      })
    }
  }
  catch (error) {
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
    catch (error) {
      failed++
      if (!silent) {
        console.log(`   ❌ Error: ${error}`)
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
 * 在 CLI 启动时静默运行自动修复
 */
export async function runAutoFixOnStartup(): Promise<void> {
  try {
    await autoFixAll(true)
  }
  catch {
    // 静默失败，不阻塞 CLI 启动
  }
}

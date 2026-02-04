/**
 * CCJK Doctor Command
 * Health check and diagnostic tool for Claude Code environment
 */

import type { CodeToolType } from '../constants'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join, resolve } from 'pathe'
import { getApiProviderPresets } from '../config/api-providers'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { getPermissionManager } from '../permissions/permission-manager'
import { commandExists } from '../utils/platform'
import { ProviderHealthMonitor } from '../utils/provider-health'
import { displayWorkspaceReport, runWorkspaceCheck, runWorkspaceWizard } from '../utils/workspace-guide'

interface CheckResult {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  fix?: string
  details?: string[]
}

/**
 * Check if Claude Code CLI is installed
 */
async function checkClaudeCode(): Promise<CheckResult> {
  const hasCommand = await commandExists('claude')
  if (hasCommand) {
    return { name: 'Claude Code', status: 'ok', message: 'Installed' }
  }
  return {
    name: 'Claude Code',
    status: 'error',
    message: 'Not installed',
    fix: 'Run: npm install -g @anthropic-ai/claude-code',
  }
}

/**
 * Check if Claude configuration directory exists
 */
async function checkClaudeDir(): Promise<CheckResult> {
  if (existsSync(CLAUDE_DIR)) {
    return { name: 'Config Directory', status: 'ok', message: CLAUDE_DIR }
  }
  return {
    name: 'Config Directory',
    status: 'error',
    message: 'Does not exist',
    fix: 'Run: npx ccjk init',
  }
}

/**
 * Check if settings.json exists and is valid
 */
async function checkSettings(): Promise<CheckResult> {
  if (!existsSync(SETTINGS_FILE)) {
    return {
      name: 'settings.json',
      status: 'warning',
      message: 'Not found',
      fix: 'Run: npx ccjk init',
    }
  }

  try {
    const { readFileSync } = await import('node:fs')
    const content = readFileSync(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(content)

    // Check for schema validation issues
    const issues: string[] = []

    // Check $schema
    if (settings.$schema && settings.$schema !== 'https://json.schemastore.org/claude-code-settings.json') {
      issues.push('Invalid $schema URL')
    }

    // Check attribution
    if (typeof settings.attribution === 'string') {
      issues.push('attribution should be an object, not a string')
    }

    // Check fileSuggestion.type
    if (settings.fileSuggestion && settings.fileSuggestion.type !== 'command') {
      issues.push('fileSuggestion.type must be "command"')
    }

    // Check permissions.allow for lowercase tool names
    if (settings.permissions?.allow) {
      const lowerCaseTools = settings.permissions.allow.filter((t: string) =>
        /^[a-z]/.test(t) && !t.startsWith('Allow'),
      )
      if (lowerCaseTools.length > 0) {
        issues.push(`${lowerCaseTools.length} permission(s) with lowercase names`)
      }
    }

    // Check for invalid plansDirectory
    if (settings.plansDirectory === null) {
      issues.push('plansDirectory should not be null')
    }

    if (issues.length > 0) {
      return {
        name: 'settings.json',
        status: 'error',
        message: `Validation issues: ${issues.length} problem(s)`,
        fix: 'Run: npx ccjk doctor --fix-settings',
        details: issues,
      }
    }

    return { name: 'settings.json', status: 'ok', message: 'Valid configuration' }
  }
  catch (error) {
    return {
      name: 'settings.json',
      status: 'error',
      message: 'Invalid JSON',
      fix: 'Run: npx ccjk init',
    }
  }
}

/**
 * Check installed workflows
 */
async function checkWorkflows(): Promise<CheckResult> {
  const commandsDir = join(CLAUDE_DIR, 'commands')
  if (existsSync(commandsDir)) {
    try {
      const files = readdirSync(commandsDir, { recursive: true })
      const mdFiles = files.filter(f => String(f).endsWith('.md'))
      return {
        name: 'Workflows',
        status: 'ok',
        message: `${mdFiles.length} commands installed`,
      }
    }
    catch {
      return { name: 'Workflows', status: 'warning', message: 'Cannot read directory' }
    }
  }
  return {
    name: 'Workflows',
    status: 'warning',
    message: 'Not installed',
    fix: 'Run: npx ccjk update',
  }
}

/**
 * Check MCP services configuration
 */
async function checkMcp(): Promise<CheckResult> {
  const mcpConfigPath = join(CLAUDE_DIR, 'mcp.json')
  const settingsPath = SETTINGS_FILE

  // Check if MCP is configured in settings.json
  if (existsSync(settingsPath)) {
    try {
      const { readFileSync } = await import('node:fs')
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
      if (settings.mcpServers && Object.keys(settings.mcpServers).length > 0) {
        const count = Object.keys(settings.mcpServers).length
        return { name: 'MCP Services', status: 'ok', message: `${count} services configured` }
      }
    }
    catch {
      // Continue to check mcp.json
    }
  }

  if (existsSync(mcpConfigPath)) {
    return { name: 'MCP Services', status: 'ok', message: 'Configured' }
  }

  return {
    name: 'MCP Services',
    status: 'warning',
    message: 'Not configured',
    fix: 'Run: npx ccjk init and select MCP services',
  }
}

/**
 * Check CCR proxy installation
 */
async function checkCcr(): Promise<CheckResult> {
  const hasCcr = await commandExists('ccr')
  if (hasCcr) {
    return { name: 'CCR Proxy', status: 'ok', message: 'Installed' }
  }
  return {
    name: 'CCR Proxy',
    status: 'warning',
    message: 'Not installed (optional)',
    fix: 'Run: npx ccjk ccr to install',
  }
}

/**
 * Check output styles installation
 */
async function checkOutputStyles(): Promise<CheckResult> {
  const stylesDir = join(CLAUDE_DIR, 'output-styles')
  if (existsSync(stylesDir)) {
    try {
      const files = readdirSync(stylesDir).filter(f => f.endsWith('.md'))
      return {
        name: 'Output Styles',
        status: 'ok',
        message: `${files.length} styles available`,
      }
    }
    catch {
      return { name: 'Output Styles', status: 'warning', message: 'Cannot read directory' }
    }
  }
  return {
    name: 'Output Styles',
    status: 'warning',
    message: 'Not installed',
    fix: 'Run: npx ccjk init',
  }
}

/**
 * Check API provider health
 */
async function checkProviders(codeType: CodeToolType = 'claude-code'): Promise<CheckResult> {
  try {
    const providers = await getApiProviderPresets(codeType)

    if (providers.length === 0) {
      return {
        name: 'API Providers',
        status: 'warning',
        message: 'No providers available',
      }
    }

    // Initialize health monitor
    const monitor = new ProviderHealthMonitor({
      timeout: 3000,
      degradedLatencyThreshold: 1000,
      unhealthyLatencyThreshold: 3000,
    })

    monitor.setProviders(providers)

    // Check all providers (with timeout)
    const results = await Promise.race([
      Promise.all(
        providers.map(async (provider) => {
          const result = await monitor.checkHealth(provider)
          return { provider, result }
        }),
      ),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000)
      }),
    ])

    if (!results) {
      return {
        name: 'API Providers',
        status: 'warning',
        message: 'Health check timeout',
      }
    }

    const healthyCount = results.filter(r => r.result.success).length

    if (healthyCount === 0) {
      return {
        name: 'API Providers',
        status: 'error',
        message: 'All providers unavailable',
        fix: 'Check your network connection',
      }
    }

    if (healthyCount < providers.length) {
      return {
        name: 'API Providers',
        status: 'warning',
        message: `${healthyCount}/${providers.length} providers healthy`,
      }
    }

    return {
      name: 'API Providers',
      status: 'ok',
      message: `${healthyCount} providers healthy`,
    }
  }
  catch {
    return {
      name: 'API Providers',
      status: 'warning',
      message: 'Health check failed',
    }
  }
}

/**
 * Check permission rules for unreachable or problematic rules
 */
async function checkPermissionRules(): Promise<CheckResult> {
  const isZh = i18n.language === 'zh-CN'

  try {
    const permissionManager = getPermissionManager()
    const unreachableRules = permissionManager.getUnreachableRules()
    const allDiagnostics = permissionManager.getAllDiagnostics()

    // Count problematic rules
    const shadowedRules = allDiagnostics.filter(d => d.shadowedBy.length > 0)
    const conflictedRules = allDiagnostics.filter(d => d.conflicts.length > 0)

    const problemCount = unreachableRules.length + shadowedRules.length + conflictedRules.length

    if (problemCount === 0) {
      const stats = permissionManager.getStats()
      return {
        name: 'Permission Rules',
        status: 'ok',
        message: `${stats.total} rules configured`,
      }
    }

    const details: string[] = []

    if (unreachableRules.length > 0) {
      details.push(isZh ? `${unreachableRules.length} unreachable rule(s)` : `${unreachableRules.length} unreachable rule(s)`)
      for (const rule of unreachableRules.slice(0, 3)) {
        details.push(`  - ${ansis.dim(rule.pattern)}`)
      }
      if (unreachableRules.length > 3) {
        details.push(`  ... ${isZh ? 'and' : 'and'} ${unreachableRules.length - 3} ${isZh ? 'more' : 'more'}`)
      }
    }

    if (shadowedRules.length > 0) {
      details.push(isZh ? `${shadowedRules.length} shadowed rule(s)` : `${shadowedRules.length} shadowed rule(s)`)
      for (const diag of shadowedRules.slice(0, 2)) {
        details.push(`  - ${ansis.dim(diag.rule.pattern)} ${ansis.dim(isZh ? 'shadowed by' : 'shadowed by')} ${diag.shadowedBy[0].pattern}`)
      }
    }

    if (conflictedRules.length > 0) {
      details.push(isZh ? `${conflictedRules.length} conflicted rule(s)` : `${conflictedRules.length} conflicted rule(s)`)
    }

    return {
      name: 'Permission Rules',
      status: 'warning',
      message: `${problemCount} ${isZh ? 'problematic' : 'problematic'} ${isZh ? 'rule(s)' : 'rule(s)'}`,
      fix: isZh ? 'Run: ccjk permissions diagnose' : 'Run: ccjk permissions diagnose',
      details,
    }
  }
  catch {
    // Permission manager may not be initialized
    return {
      name: 'Permission Rules',
      status: 'warning',
      message: 'Unable to check',
    }
  }
}

/**
 * Fix settings.json validation issues by merging with template
 */
async function fixSettingsFile(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const { copyConfigFiles } = await import('../utils/config')

  console.log('')
  console.log(ansis.bold.cyan('🔧 Fixing settings.json'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  // First, backup the existing settings
  const backupPath = join(CLAUDE_DIR, 'backup', `settings.backup.${Date.now()}.json`)
  try {
    if (existsSync(SETTINGS_FILE)) {
      mkdirSync(join(CLAUDE_DIR, 'backup'), { recursive: true })
      copyFileSync(SETTINGS_FILE, backupPath)
      console.log(ansis.green(`✔ ${isZh ? '已备份旧设置' : 'Backed up settings'}: ${backupPath}`))
    }
  }
  catch (error) {
    console.log(ansis.yellow(`⚠️ ${isZh ? '备份失败，继续...' : 'Backup failed, continuing...'}`))
  }

  // Run copyConfigFiles which will merge with template
  console.log('')
  console.log(ansis.dim(isZh ? '正在合并模板设置...' : 'Merging template settings...'))
  copyConfigFiles(false)

  // Verify the fix
  const checkResult = await checkSettings()
  console.log('')

  if (checkResult.status === 'ok') {
    console.log(ansis.green(`✅ ${isZh ? '设置已修复！' : 'Settings fixed successfully!'}`))
  }
  else {
    console.log(ansis.yellow(`⚠️ ${isZh ? '仍有一些问题' : 'Some issues remain'}:`))
    if (checkResult.details) {
      for (const detail of checkResult.details) {
        console.log(ansis.dim(`   • ${detail}`))
      }
    }
  }

  console.log('')
  console.log(ansis.dim(isZh ? '提示: 请重启 Claude Code 以应用更改' : 'Tip: Restart Claude Code to apply changes'))
  console.log('')
}

/**
 * Main doctor command - runs health checks and displays results
 */
export async function doctor(options: { checkProviders?: boolean, codeType?: CodeToolType, fixSettings?: boolean } = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  // Handle --fix-settings flag
  if (options.fixSettings) {
    await fixSettingsFile()
    return
  }

  console.log('')
  console.log(ansis.bold.cyan('🔍 CCJK Health Check'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  const checks = [
    checkClaudeCode,
    checkClaudeDir,
    checkSettings,
    checkWorkflows,
    checkMcp,
    checkPermissionRules,
    checkCcr,
    checkOutputStyles,
  ]

  // Add provider check if requested
  if (options.checkProviders) {
    checks.push(() => checkProviders(options.codeType))
  }

  let hasErrors = false
  let hasWarnings = false

  for (const check of checks) {
    const result = await check()

    const statusIcon = result.status === 'ok'
      ? ansis.green('✅')
      : result.status === 'warning'
        ? ansis.yellow('⚠️')
        : ansis.red('❌')

    const statusColor = result.status === 'ok'
      ? ansis.green
      : result.status === 'warning'
        ? ansis.yellow
        : ansis.red

    console.log(`${statusIcon} ${ansis.bold(result.name)}: ${statusColor(result.message)}`)

    if (result.fix) {
      console.log(ansis.dim(`   💡 Fix: ${result.fix}`))
    }

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(ansis.dim(`   ${detail}`))
      }
    }

    if (result.status === 'error')
      hasErrors = true
    if (result.status === 'warning')
      hasWarnings = true
  }

  console.log('')
  console.log(ansis.dim('─'.repeat(50)))

  if (hasErrors) {
    console.log(ansis.red('❌ Issues found - please follow the suggestions above'))
  }
  else if (hasWarnings) {
    console.log(ansis.yellow('⚠️ Configuration is functional, but some features may be limited'))
  }
  else {
    console.log(ansis.green('✅ All checks passed - CCJK is properly configured!'))
  }
  console.log('')

  // Ask if user wants to check providers (if not already checked)
  if (!options.checkProviders) {
    const { checkProvidersNow } = await inquirer.prompt<{ checkProvidersNow: boolean }>({
      type: 'confirm',
      name: 'checkProvidersNow',
      message: isZh ? '是否检查 API 供应商健康状态？' : 'Check API provider health status?',
      default: false,
    })

    if (checkProvidersNow) {
      console.log('')
      console.log(ansis.dim(isZh ? '正在检查供应商...' : 'Checking providers...'))
      const providerResult = await checkProviders(options.codeType)

      const statusIcon = providerResult.status === 'ok'
        ? ansis.green('✅')
        : providerResult.status === 'warning'
          ? ansis.yellow('⚠️')
          : ansis.red('❌')

      const statusColor = providerResult.status === 'ok'
        ? ansis.green
        : providerResult.status === 'warning'
          ? ansis.yellow
          : ansis.red

      console.log(`${statusIcon} ${ansis.bold(providerResult.name)}: ${statusColor(providerResult.message)}`)

      if (providerResult.fix) {
        console.log(ansis.dim(`   💡 Fix: ${providerResult.fix}`))
      }
      console.log('')
    }
  }

  // Ask if user wants to run workspace diagnostics
  const { runWorkspace } = await inquirer.prompt<{ runWorkspace: boolean }>({
    type: 'confirm',
    name: 'runWorkspace',
    message: isZh ? '是否检查当前工作目录的文件写入权限？' : 'Check file write permissions for current directory?',
    default: false,
  })

  if (runWorkspace) {
    console.log('')
    const report = await runWorkspaceCheck(process.cwd())
    displayWorkspaceReport(report)
  }
}

/**
 * Workspace diagnostics command - check and fix workspace issues
 */
export async function workspaceDiagnostics(targetDir?: string): Promise<void> {
  const dir = targetDir ? resolve(targetDir) : process.cwd()
  await runWorkspaceWizard(dir)
}

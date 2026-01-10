/**
 * CCJK Doctor Command
 * Health check and diagnostic tool for Claude Code environment
 */

import { existsSync, readdirSync } from 'node:fs'
import ansis from 'ansis'
import { join } from 'pathe'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { commandExists } from '../utils/platform'

interface CheckResult {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  fix?: string
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
 * Check if settings.json exists
 */
async function checkSettings(): Promise<CheckResult> {
  if (existsSync(SETTINGS_FILE)) {
    return { name: 'settings.json', status: 'ok', message: 'Configured' }
  }
  return {
    name: 'settings.json',
    status: 'warning',
    message: 'Not found',
    fix: 'Run: npx ccjk init',
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
 * Main doctor command - runs health checks and displays results
 */
export async function doctor(): Promise<void> {
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
    checkCcr,
    checkOutputStyles,
  ]

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
}

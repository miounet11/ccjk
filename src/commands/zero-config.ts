/**
 * Zero-Config Permission Preset System
 * Provides one-click permission presets for different use cases
 */

import { existsSync, readFileSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { ensureDir, writeFileAtomic } from '../utils/fs-operations'
import { mergeAndCleanPermissions } from '../utils/permission-cleaner'
import { addNumbersToChoices } from '../utils/prompt-helpers'

// ============================================================================
// Permission Presets
// ============================================================================

interface PermissionPreset {
  id: string
  name: string
  description: string
  permissions: string[]
  env?: Record<string, string>
}

/**
 * Maximum permissions preset - All common commands and operations
 */
const MAX_PRESET: PermissionPreset = {
  id: 'max',
  name: 'Maximum Permissions',
  description: 'All common commands, file operations, and MCP servers',
  permissions: [
    // Package managers
    'Bash(pnpm *)',
    'Bash(npm *)',
    'Bash(npx *)',
    'Bash(NODE_ENV=* pnpm *)',
    'Bash(yarn *)',
    'Bash(bun *)',
    'Bash(deno *)',

    // Version control
    'Bash(git *)',

    // Build tools
    'Bash(make *)',
    'Bash(cmake *)',
    'Bash(cargo *)',
    'Bash(go *)',
    'Bash(rustc *)',

    // Container tools
    'Bash(docker *)',
    'Bash(docker-compose *)',
    'Bash(podman *)',

    // Programming languages
    'Bash(python *)',
    'Bash(python3 *)',
    'Bash(node *)',
    'Bash(ruby *)',
    'Bash(php *)',
    'Bash(java *)',
    'Bash(javac *)',

    // Shell utilities
    'Bash(which *)',
    'Bash(cat *)',
    'Bash(ls *)',
    'Bash(echo *)',
    'Bash(grep *)',
    'Bash(find *)',
    'Bash(head *)',
    'Bash(tail *)',
    'Bash(wc *)',
    'Bash(sort *)',
    'Bash(uniq *)',
    'Bash(cut *)',
    'Bash(sed *)',
    'Bash(awk *)',
    'Bash(tr *)',
    'Bash(xargs *)',

    // File operations
    'Bash(mkdir *)',
    'Bash(touch *)',
    'Bash(cp *)',
    'Bash(mv *)',
    'Bash(chmod *)',
    'Bash(chown *)',
    'Bash(ln *)',

    // Network tools
    'Bash(curl *)',
    'Bash(wget *)',
    'Bash(ping *)',
    'Bash(netstat *)',
    'Bash(ss *)',

    // System info
    'Bash(ps *)',
    'Bash(top *)',
    'Bash(htop *)',
    'Bash(df *)',
    'Bash(du *)',
    'Bash(free *)',
    'Bash(uname *)',

    // Text editors
    'Bash(vim *)',
    'Bash(nano *)',
    'Bash(emacs *)',
    'Bash(code *)',

    // Compression
    'Bash(tar *)',
    'Bash(gzip *)',
    'Bash(gunzip *)',
    'Bash(zip *)',
    'Bash(unzip *)',

    // Package managers (system)
    'Bash(brew *)',
    'Bash(apt *)',
    'Bash(apt-get *)',
    'Bash(yum *)',
    'Bash(dnf *)',
    'Bash(pacman *)',

    // File operations (Claude Code tools)
    'Read(*)',
    'Edit(*)',
    'Write(*)',
    'NotebookEdit(*)',

    // Web access
    'WebFetch(*)',

    // MCP servers (wildcard for all)
    'MCP(*)',
  ],
  env: {
    ANTHROPIC_MODEL: '',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
    ANTHROPIC_DEFAULT_SONNET_MODEL: '',
    ANTHROPIC_DEFAULT_OPUS_MODEL: '',
  },
}

/**
 * Developer preset - Common development tools
 */
const DEV_PRESET: PermissionPreset = {
  id: 'dev',
  name: 'Developer Preset',
  description: 'Build tools, git, package managers, and file operations',
  permissions: [
    // Package managers
    'Bash(pnpm *)',
    'Bash(npm *)',
    'Bash(npx *)',
    'Bash(NODE_ENV=* pnpm *)',
    'Bash(yarn *)',
    'Bash(bun *)',

    // Version control
    'Bash(git *)',

    // Build tools
    'Bash(make *)',
    'Bash(cargo *)',
    'Bash(go *)',

    // Programming languages
    'Bash(python *)',
    'Bash(python3 *)',
    'Bash(node *)',

    // Shell utilities
    'Bash(which *)',
    'Bash(cat *)',
    'Bash(ls *)',
    'Bash(echo *)',
    'Bash(grep *)',
    'Bash(find *)',
    'Bash(head *)',
    'Bash(tail *)',
    'Bash(wc *)',
    'Bash(sort *)',

    // File operations
    'Bash(mkdir *)',
    'Bash(touch *)',
    'Bash(cp *)',
    'Bash(mv *)',
    'Bash(chmod *)',

    // File operations (Claude Code tools)
    'Read(*)',
    'Edit(*)',
    'Write(*)',
    'NotebookEdit(*)',

    // Web access for docs
    'WebFetch(*)',
  ],
  env: {
    ANTHROPIC_MODEL: '',
  },
}

/**
 * Safe preset - Read-only operations
 */
const SAFE_PRESET: PermissionPreset = {
  id: 'safe',
  name: 'Safe Preset',
  description: 'Read-only commands, no file modifications',
  permissions: [
    // Read-only shell utilities
    'Bash(which *)',
    'Bash(cat *)',
    'Bash(ls *)',
    'Bash(echo *)',
    'Bash(grep *)',
    'Bash(find *)',
    'Bash(head *)',
    'Bash(tail *)',
    'Bash(wc *)',
    'Bash(sort *)',
    'Bash(uniq *)',
    'Bash(cut *)',

    // System info (read-only)
    'Bash(ps *)',
    'Bash(df *)',
    'Bash(du *)',
    'Bash(uname *)',

    // Git read operations
    'Bash(git status *)',
    'Bash(git log *)',
    'Bash(git diff *)',
    'Bash(git show *)',
    'Bash(git branch *)',

    // File operations (read-only)
    'Read(*)',

    // Web access
    'WebFetch(*)',
  ],
}

const PRESETS: PermissionPreset[] = [MAX_PRESET, DEV_PRESET, SAFE_PRESET]

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Load current settings from settings.json
 */
function loadCurrentSettings(): any {
  if (!existsSync(SETTINGS_FILE)) {
    return {}
  }

  try {
    const content = readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return {}
  }
}

/**
 * Save settings to settings.json
 */
function saveSettings(settings: any): void {
  ensureDir(CLAUDE_DIR)
  writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

/**
 * Create backup of current settings
 */
function backupSettings(): string | null {
  if (!existsSync(SETTINGS_FILE)) {
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupDir = `${CLAUDE_DIR}/backup`
  ensureDir(backupDir)

  const backupPath = `${backupDir}/settings-${timestamp}.json`
  const content = readFileSync(SETTINGS_FILE, 'utf-8')
  writeFileAtomic(backupPath, content)

  return backupPath
}

/**
 * Apply permission preset to settings
 */
function applyPreset(preset: PermissionPreset, currentSettings: any): any {
  const newSettings = { ...currentSettings }

  // Merge permissions
  if (!newSettings.permissions) {
    newSettings.permissions = { allow: [] }
  }

  // Merge preset permissions with existing ones
  newSettings.permissions.allow = mergeAndCleanPermissions(
    preset.permissions,
    newSettings.permissions.allow || [],
  )

  // Merge environment variables if provided
  if (preset.env) {
    newSettings.env = {
      ...newSettings.env,
      ...preset.env,
    }
  }

  return newSettings
}

/**
 * Show what will be added by the preset
 */
function showPresetDiff(preset: PermissionPreset, currentSettings: any): void {
  const isZh = i18n.language === 'zh-CN'
  const currentPermissions = new Set(currentSettings.permissions?.allow || [])
  const newPermissions = preset.permissions.filter(p => !currentPermissions.has(p))

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📋 预设详情' : '📋 Preset Details'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log(`${ansis.green('Name:')} ${preset.name}`)
  console.log(`${ansis.green('Description:')} ${preset.description}`)
  console.log('')

  if (newPermissions.length > 0) {
    console.log(ansis.bold.yellow(isZh ? '✨ 将添加的权限:' : '✨ Permissions to be added:'))
    console.log(ansis.dim(`  ${isZh ? '总计' : 'Total'}: ${newPermissions.length} ${isZh ? '项' : 'items'}`))

    // Group by type
    const bashPerms = newPermissions.filter(p => p.startsWith('Bash('))
    const filePerms = newPermissions.filter(p => ['Read', 'Edit', 'Write', 'NotebookEdit'].some(t => p.startsWith(t)))
    const otherPerms = newPermissions.filter(p => !bashPerms.includes(p) && !filePerms.includes(p))

    if (bashPerms.length > 0) {
      console.log(`  ${ansis.cyan('Bash:')} ${bashPerms.length} ${isZh ? '个命令' : 'commands'}`)
    }
    if (filePerms.length > 0) {
      console.log(`  ${ansis.cyan('File:')} ${filePerms.length} ${isZh ? '个操作' : 'operations'}`)
    }
    if (otherPerms.length > 0) {
      console.log(`  ${ansis.cyan('Other:')} ${otherPerms.length} ${isZh ? '项' : 'items'}`)
    }
  }
  else {
    console.log(ansis.yellow(isZh ? '✓ 所有权限已存在' : '✓ All permissions already exist'))
  }

  console.log(ansis.dim('─'.repeat(60)))
  console.log('')
}

// ============================================================================
// Command Interface
// ============================================================================

export interface ZeroConfigOptions {
  preset?: string
  list?: boolean
  skipBackup?: boolean
}

/**
 * Zero-config permission preset command
 */
export async function zeroConfig(options: ZeroConfigOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  // List presets
  if (options.list) {
    console.log('')
    console.log(ansis.bold.cyan(isZh ? '📦 可用的权限预设' : '📦 Available Permission Presets'))
    console.log(ansis.dim('─'.repeat(60)))

    for (const preset of PRESETS) {
      console.log(`  ${ansis.green(preset.id.padEnd(8))} - ${preset.name}`)
      console.log(`  ${ansis.dim(' '.repeat(10))}${preset.description}`)
      console.log(`  ${ansis.dim(' '.repeat(10))}${preset.permissions.length} ${isZh ? '项权限' : 'permissions'}`)
      console.log('')
    }

    console.log(ansis.dim('─'.repeat(60)))
    console.log(ansis.gray(isZh ? '使用: npx ccjk zc --preset=<id>' : 'Usage: npx ccjk zc --preset=<id>'))
    console.log('')
    return
  }

  // Select preset
  let selectedPreset: PermissionPreset | undefined

  if (options.preset) {
    selectedPreset = PRESETS.find(p => p.id === options.preset)
    if (!selectedPreset) {
      console.error(ansis.red(isZh ? `错误: 未找到预设 "${options.preset}"` : `Error: Preset "${options.preset}" not found`))
      console.log(ansis.gray(isZh ? '使用 --list 查看可用预设' : 'Use --list to see available presets'))
      return
    }
  }
  else {
    // Interactive selection
    const { presetId } = await inquirer.prompt<{ presetId: string }>({
      type: 'list',
      name: 'presetId',
      message: isZh ? '选择权限预设:' : 'Select permission preset:',
      choices: addNumbersToChoices(
        PRESETS.map(p => ({
          name: `${p.name} - ${ansis.gray(p.description)}`,
          value: p.id,
          short: p.name,
        })),
      ),
    })

    selectedPreset = PRESETS.find(p => p.id === presetId)
    if (!selectedPreset) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }
  }

  // Load current settings
  const currentSettings = loadCurrentSettings()

  // Show what will be added
  showPresetDiff(selectedPreset, currentSettings)

  // Confirm
  if (!options.preset) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
      type: 'confirm',
      name: 'confirm',
      message: isZh ? '确认应用此预设?' : 'Confirm applying this preset?',
      default: true,
    })

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('common:cancelled')))
      return
    }
  }

  // Backup current settings
  if (!options.skipBackup) {
    const backupPath = backupSettings()
    if (backupPath) {
      console.log(ansis.gray(`✔ ${isZh ? '已备份到' : 'Backed up to'}: ${backupPath}`))
    }
  }

  // Apply preset
  const newSettings = applyPreset(selectedPreset, currentSettings)
  saveSettings(newSettings)

  console.log('')
  console.log(ansis.green(`✅ ${isZh ? '权限预设已应用' : 'Permission preset applied'}: ${selectedPreset.name}`))
  console.log(ansis.gray(`   ${isZh ? '配置文件' : 'Config file'}: ${SETTINGS_FILE}`))
  console.log('')
}

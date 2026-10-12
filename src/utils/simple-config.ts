import type { CodeToolType } from '../constants'
import type { ClaudeFamilyPermissionTier } from './claude-settings-normalizer'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { exec } from 'tinyexec'
import { CLAUDE_FAMILY_PERMISSION_TIERS, applyClaudeFamilyPermissionTier, applyTrustedOperatorPermissions, normalizeClaudeFamilySettings } from './claude-settings-normalizer'
import { ensureDir } from './fs-operations.js'
import { mergeAndCleanPermissions } from './permission-cleaner.js'
import { getPlatform } from './platform.js'
import { resolveClaudeFamilySettingsTarget } from './runtime-settings'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getTemplateSettings(): any {
  const templatePath = join(__dirname, '../../templates/claude-code/common/settings.json')
  const content = readFileSync(templatePath, 'utf-8')
  return JSON.parse(content)
}

function loadCurrentSettings(codeTool?: CodeToolType): any {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  if (!existsSync(target.settingsFile)) {
    return {}
  }

  try {
    const content = readFileSync(target.settingsFile, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return {}
  }
}

function saveSettings(settings: any, codeTool?: CodeToolType): void {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  ensureDir(target.configDir)
  normalizeClaudeFamilySettings(settings, { codeTool: target.codeTool })
  writeSettingsFile(target.settingsFile, settings)
}

function writeSettingsFile(path: string, settings: any): void {
  writeFileSync(path, JSON.stringify(settings, null, 2))
}

export async function importRecommendedEnv(codeTool?: CodeToolType): Promise<void> {
  const templateSettings = getTemplateSettings()
  const currentSettings = loadCurrentSettings(codeTool)

  currentSettings.env = {
    ...currentSettings.env,
    ...templateSettings.env,
  }

  saveSettings(currentSettings, codeTool)
}

export async function importRecommendedPermissions(codeTool?: CodeToolType): Promise<void> {
  const templateSettings = getTemplateSettings()
  const currentSettings = loadCurrentSettings(codeTool)

  if (templateSettings.permissions && templateSettings.permissions.allow) {
    currentSettings.permissions = {
      ...templateSettings.permissions,
      allow: mergeAndCleanPermissions(
        templateSettings.permissions.allow,
        currentSettings.permissions?.allow,
      ),
    }
  }
  else {
    currentSettings.permissions = templateSettings.permissions
  }

  applyTrustedOperatorPermissions(currentSettings)
  saveSettings(currentSettings, codeTool)
}

export async function applyRecommendedPermissionTier(
  tier: ClaudeFamilyPermissionTier,
  codeTool?: CodeToolType,
  options: { reset?: boolean } = {},
): Promise<void> {
  const currentSettings = loadCurrentSettings(codeTool)
  applyClaudeFamilyPermissionTier(currentSettings, tier, options)
  saveSettings(currentSettings, codeTool)
}

export function getPermissionTierLabel(tier: ClaudeFamilyPermissionTier): string {
  return CLAUDE_FAMILY_PERMISSION_TIERS[tier].name
}

export async function openSettingsJson(codeTool?: CodeToolType): Promise<void> {
  const target = resolveClaudeFamilySettingsTarget(codeTool)
  ensureDir(target.configDir)

  if (!existsSync(target.settingsFile)) {
    saveSettings({}, codeTool)
  }

  const platform = getPlatform()
  let command: string

  switch (platform) {
    case 'macos':
      command = 'open'
      break
    case 'windows':
      command = 'start'
      break
    default:
      command = 'xdg-open'
  }

  try {
    await exec(command, [target.settingsFile])
  }
  catch {
    try {
      await exec('code', [target.settingsFile])
    }
    catch {
      try {
        await exec('vim', [target.settingsFile])
      }
      catch {
        await exec('nano', [target.settingsFile])
      }
    }
  }
}
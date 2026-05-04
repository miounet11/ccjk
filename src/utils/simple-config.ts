import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { exec } from 'tinyexec'
import { ensureDir, writeFileAtomic } from './fs-operations.js'
import { normalizeClaudeFamilySettings } from './claude-settings-normalizer.js'
import { mergeAndCleanPermissions } from './permission-cleaner.js'
import { getPlatform } from './platform.js'
import { resolveClaudeFamilySettingsTarget } from './runtime-settings.js'
import type { RuntimeSettingsTarget } from './runtime-settings.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Get template settings
function getTemplateSettings(): any {
  const templatePath = join(__dirname, '../../templates/claude-code/common/settings.json')
  const content = readFileSync(templatePath, 'utf-8')
  return JSON.parse(content)
}

// Load current settings
function loadCurrentSettings(target: RuntimeSettingsTarget = resolveClaudeFamilySettingsTarget()): any {
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

// Save settings
function saveSettings(settings: any, target: RuntimeSettingsTarget = resolveClaudeFamilySettingsTarget()): void {
  ensureDir(target.configDir)
  normalizeClaudeFamilySettings(settings)
  writeFileAtomic(target.settingsFile, JSON.stringify(settings, null, 2))
}

// Import recommended environment variables
export async function importRecommendedEnv(): Promise<void> {
  const target = resolveClaudeFamilySettingsTarget()
  const templateSettings = getTemplateSettings()
  const currentSettings = loadCurrentSettings(target)

  // Merge env variables
  currentSettings.env = {
    ...currentSettings.env,
    ...templateSettings.env,
  }

  saveSettings(currentSettings, target)
}

// Import recommended permissions
export async function importRecommendedPermissions(): Promise<void> {
  const target = resolveClaudeFamilySettingsTarget()
  const templateSettings = getTemplateSettings()
  const currentSettings = loadCurrentSettings(target)

  // Merge permissions with cleanup
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

  saveSettings(currentSettings, target)
}

// Open settings.json in system editor
export async function openSettingsJson(): Promise<void> {
  const target = resolveClaudeFamilySettingsTarget()
  ensureDir(target.configDir)

  // Ensure file exists
  if (!existsSync(target.settingsFile)) {
    saveSettings({}, target)
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
      // Linux - try common editors
      command = 'xdg-open'
  }

  try {
    await exec(command, [target.settingsFile])
  }
  catch {
    // Fallback to code/vim/nano
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

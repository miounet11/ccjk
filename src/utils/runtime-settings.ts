import type { CodeToolType } from '../constants'
import { CLAUDE_DIR, CLAVUE_DIR, CLAVUE_SETTINGS_FILE, SETTINGS_FILE, isCodeToolType } from '../constants'
import { readZcfConfig } from './ccjk-config'

export interface RuntimeSettingsTarget {
  codeTool: CodeToolType
  configDir: string
  settingsFile: string
  displayName: string
}

export function resolveClaudeFamilySettingsTarget(codeTool?: CodeToolType): RuntimeSettingsTarget {
  const configuredTool = readZcfConfig()?.codeToolType
  const resolvedTool = codeTool || (isCodeToolType(configuredTool) ? configuredTool : 'claude-code')

  if (resolvedTool === 'clavue') {
    return {
      codeTool: 'clavue',
      configDir: CLAVUE_DIR,
      settingsFile: CLAVUE_SETTINGS_FILE,
      displayName: 'Clavue',
    }
  }

  return {
    codeTool: 'claude-code',
    configDir: CLAUDE_DIR,
    settingsFile: SETTINGS_FILE,
    displayName: 'Claude Code',
  }
}

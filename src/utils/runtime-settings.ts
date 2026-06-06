import type { CodeToolType } from '../constants'
import { join } from 'pathe'
import {
  ClAUDE_CONFIG_FILE,
  CLAUDE_DIR,
  CLAVUE_CONFIG_FILE,
  CLAVUE_DIR,
  CLAVUE_SETTINGS_FILE,
  DEFAULT_CODE_TOOL_TYPE,
  isCodeToolType,
  SETTINGS_FILE,
} from '../constants'
import { readCcjkConfig } from './ccjk-config'

export interface RuntimeSettingsTarget {
  codeTool: 'clavue' | 'claude-code'
  configDir: string
  settingsFile: string
  instructionsFile: string
  runtimeConfigFile: string
  runtimeBackupDirName: string
  displayName: string
  runtimeCommand: string
  configDirDisplay: string
}

export function getActiveCodeTool(): CodeToolType {
  const configured = readCcjkConfig()?.codeToolType
  return isCodeToolType(configured) ? configured : DEFAULT_CODE_TOOL_TYPE
}

export function resolveClaudeFamilySettingsTarget(codeTool?: CodeToolType): RuntimeSettingsTarget {
  const configuredTool = readCcjkConfig()?.codeToolType
  const resolvedTool = codeTool
    || (isCodeToolType(configuredTool) && (configuredTool === 'clavue' || configuredTool === 'claude-code')
      ? configuredTool
      : DEFAULT_CODE_TOOL_TYPE === 'clavue' ? 'clavue' : 'claude-code')

  if (resolvedTool === 'clavue') {
    return {
      codeTool: 'clavue',
      configDir: CLAVUE_DIR,
      settingsFile: CLAVUE_SETTINGS_FILE,
      instructionsFile: join(CLAVUE_DIR, 'clavue.md'),
      runtimeConfigFile: CLAVUE_CONFIG_FILE,
      runtimeBackupDirName: 'backups',
      displayName: 'Clavue',
      runtimeCommand: 'clavue',
      configDirDisplay: '~/.clavue',
    }
  }

  return {
    codeTool: 'claude-code',
    configDir: CLAUDE_DIR,
    settingsFile: SETTINGS_FILE,
    instructionsFile: join(CLAUDE_DIR, 'CLAUDE.md'),
    runtimeConfigFile: ClAUDE_CONFIG_FILE,
    runtimeBackupDirName: 'backup',
    displayName: 'Claude Code',
    runtimeCommand: 'claude',
    configDirDisplay: '~/.claude',
  }
}

export function activeSettingsFile(codeTool?: CodeToolType): string {
  return resolveClaudeFamilySettingsTarget(codeTool).settingsFile
}

export function isClaudeFamilyCodeTool(tool: CodeToolType): tool is 'clavue' | 'claude-code' {
  return tool === 'clavue' || tool === 'claude-code'
}
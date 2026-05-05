import type { CodeToolType } from '../constants';
import { join } from 'pathe';
import { ClAUDE_CONFIG_FILE, CLAUDE_DIR, CLAVUE_CONFIG_FILE, CLAVUE_DIR, CLAVUE_SETTINGS_FILE, isCodeToolType, SETTINGS_FILE } from '../constants';
import { readZcfConfig } from './ccjk-config';

export interface RuntimeSettingsTarget {
  codeTool: CodeToolType;
  configDir: string;
  settingsFile: string;
  instructionsFile: string;
  runtimeConfigFile: string;
  runtimeBackupDirName: string;
  displayName: string;
}

export function resolveClaudeFamilySettingsTarget(codeTool?: CodeToolType): RuntimeSettingsTarget {
  const configuredTool = readZcfConfig()?.codeToolType;
  const resolvedTool = codeTool || (isCodeToolType(configuredTool) ? configuredTool : 'claude-code');

  if (resolvedTool === 'clavue') {
    return {
      codeTool: 'clavue',
      configDir: CLAVUE_DIR,
      settingsFile: CLAVUE_SETTINGS_FILE,
      instructionsFile: join(CLAVUE_DIR, 'clavue.md'),
      runtimeConfigFile: CLAVUE_CONFIG_FILE,
      runtimeBackupDirName: 'backups',
      displayName: 'Clavue',
    };
  }

  return {
    codeTool: 'claude-code',
    configDir: CLAUDE_DIR,
    settingsFile: SETTINGS_FILE,
    instructionsFile: join(CLAUDE_DIR, 'CLAUDE.md'),
    runtimeConfigFile: ClAUDE_CONFIG_FILE,
    runtimeBackupDirName: 'backup',
    displayName: 'Claude Code',
  };
}

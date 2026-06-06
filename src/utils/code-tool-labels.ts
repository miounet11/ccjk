import type { CodeToolType } from '../constants'
import { getActiveCodeTool, resolveClaudeFamilySettingsTarget } from './runtime-settings'

export const CODE_TOOL_DISPLAY_NAMES: Record<CodeToolType, string> = {
  'clavue': 'Clavue',
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'grok': 'Grok CLI',
}

export function getCodeToolDisplayName(tool?: CodeToolType): string {
  const resolved = tool ?? getActiveCodeTool()
  return CODE_TOOL_DISPLAY_NAMES[resolved] || resolved
}

export function getClaudeFamilyRuntimeLabel(tool?: CodeToolType): string {
  return resolveClaudeFamilySettingsTarget(tool).displayName
}

export function getClaudeFamilyRuntimeCommand(tool?: CodeToolType): string {
  return resolveClaudeFamilySettingsTarget(tool).runtimeCommand
}

export { getActiveCodeTool }
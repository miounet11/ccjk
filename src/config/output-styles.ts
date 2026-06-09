import { ensureI18nInitialized, i18n } from '../i18n'
import { exists } from '../utils/fs-operations'
import { join } from 'pathe'

export interface CustomOutputStyleConfig {
  id: string
  filename: string
  order: number
}

/** Codex ~/.codex/AGENTS.md — practical engineering styles only (OpenAI + community) */
export const CODEX_AGENTS_STYLE_CONFIGS: CustomOutputStyleConfig[] = [
  { id: 'agents-md-baseline', filename: 'agents-md-baseline.md', order: 1 },
  { id: 'plan-first', filename: 'plan-first.md', order: 2 },
  { id: 'verify-and-ship', filename: 'verify-and-ship.md', order: 3 },
  { id: 'surgical-diff', filename: 'surgical-diff.md', order: 4 },
  { id: 'engineer-professional', filename: 'engineer-professional.md', order: 5 },
]

/** Claude Code custom output-styles — same practical set (no persona/roleplay) */
export const CUSTOM_OUTPUT_STYLE_CONFIGS: CustomOutputStyleConfig[] = [
  ...CODEX_AGENTS_STYLE_CONFIGS,
]

export interface OutputStylePromptOption {
  id: string
  name: string
  description: string
}

function buildStylePrompts(
  configs: CustomOutputStyleConfig[],
  templateDir: string,
  i18nPrefix: 'configuration:outputStyles' | 'configuration:codexAgentsStyles',
): OutputStylePromptOption[] {
  ensureI18nInitialized()

  return configs
    .filter(style => exists(join(templateDir, style.filename)))
    .sort((a, b) => a.order - b.order)
    .map(style => ({
      id: style.id,
      name: i18n.t(`${i18nPrefix}.${style.id}.name`),
      description: i18n.t(`${i18nPrefix}.${style.id}.description`),
    }))
}

export function getCodexAgentsStylePrompts(templateDir: string): OutputStylePromptOption[] {
  return buildStylePrompts(CODEX_AGENTS_STYLE_CONFIGS, templateDir, 'configuration:codexAgentsStyles')
}

export function getCustomOutputStylePrompts(templateDir: string): OutputStylePromptOption[] {
  return buildStylePrompts(CUSTOM_OUTPUT_STYLE_CONFIGS, templateDir, 'configuration:outputStyles')
}

export function getCustomOutputStyleFileMap(): Map<string, string> {
  return new Map(CUSTOM_OUTPUT_STYLE_CONFIGS.map(style => [style.id, style.filename]))
}

export function getCustomOutputStyleIds(): string[] {
  return CUSTOM_OUTPUT_STYLE_CONFIGS.map(style => style.id)
}

const BUILTIN_OUTPUT_STYLE_IDS = ['default', 'explanatory', 'learning', 'none'] as const

export function getAllValidOutputStyleIds(): string[] {
  return [...getCustomOutputStyleIds(), ...BUILTIN_OUTPUT_STYLE_IDS]
}
import { homedir } from 'node:os'
import { join } from 'pathe'
import { i18n } from './i18n'

// Claude Code configuration paths
export const CLAUDE_DIR = join(homedir(), '.claude')
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')

// Clavue (CCJK 主推)
export const CLAVUE_DIR = join(homedir(), '.clavue')
export const CLAVUE_SETTINGS_FILE = join(CLAVUE_DIR, 'settings.json')
export const CLAUDE_MD_FILE = join(CLAUDE_DIR, 'CLAUDE.md')
export const ClAUDE_CONFIG_FILE = join(homedir(), '.claude.json')
export const CLAUDE_VSC_CONFIG_FILE = join(CLAUDE_DIR, 'config.json')

// Codex configuration paths
export const CODEX_DIR = join(homedir(), '.codex')
export const CODEX_CONFIG_FILE = join(CODEX_DIR, 'config.toml')
export const CODEX_AUTH_FILE = join(CODEX_DIR, 'auth.json')
export const CODEX_AGENTS_FILE = join(CODEX_DIR, 'AGENTS.md')
export const CODEX_PROMPTS_DIR = join(CODEX_DIR, 'prompts')

// CCJK configuration paths
export const CCJK_CONFIG_DIR = join(homedir(), '.ccjk')
export const CCJK_CONFIG_FILE = join(CCJK_CONFIG_DIR, 'config.toml')
/** 旧版配置路径（仅用于 migrate，不含当前 canonical ~/.ccjk/config.toml） */
export const LEGACY_CCJK_CONFIG_FILES = [
  join(CLAUDE_DIR, '.ccjk-config.json'),
  join(homedir(), '.ccjk.json'),
  join(homedir(), '.ufomiao', 'ccjk', 'config.toml'),
]

export const CODE_TOOL_TYPES = ['clavue', 'claude-code', 'codex', 'grok'] as const
export type CodeToolType = (typeof CODE_TOOL_TYPES)[number]
export const DEFAULT_CODE_TOOL_TYPE: CodeToolType = 'clavue'

export const CODE_TOOL_BANNERS: Record<CodeToolType, string> = {
  'clavue': 'for Clavue',
  'claude-code': 'for Claude Code',
  'codex': 'for Codex',
  'grok': 'for Grok CLI',
}

export function settingsFileForTool(tool: CodeToolType): string {
  if (tool === 'clavue') return CLAVUE_SETTINGS_FILE
  if (tool === 'codex') return CODEX_CONFIG_FILE
  return SETTINGS_FILE
}

// Short aliases for code tool types
export const CODE_TOOL_ALIASES: Record<string, CodeToolType> = {
  cv: 'clavue',
  cc: 'claude-code',
  cx: 'codex',
  gk: 'grok',
}

export function isCodeToolType(value: any): value is CodeToolType {
  return CODE_TOOL_TYPES.includes(value as CodeToolType)
}

// API configuration constants
export const API_DEFAULT_URL = 'https://api.anthropic.com'
export const API_ENV_KEY = 'ANTHROPIC_API_KEY'

export function resolveCodeToolType(value: unknown): CodeToolType {
  // First check if it's already a valid code tool type
  if (isCodeToolType(value)) {
    return value
  }

  // Check if it's a short alias
  if (typeof value === 'string' && value in CODE_TOOL_ALIASES) {
    return CODE_TOOL_ALIASES[value]
  }

  return DEFAULT_CODE_TOOL_TYPE
}

export const SUPPORTED_LANGS = ['zh-CN', 'en'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

// Dynamic language labels using i18n
// This will be replaced with a function that uses i18n to get labels
export const LANG_LABELS = {
  'zh-CN': '简体中文',
  'en': 'English',
} as const

// AI output languages - labels are now retrieved via helper function
export const AI_OUTPUT_LANGUAGES = {
  'zh-CN': { directive: 'Always respond in Chinese-simplified' },
  'en': { directive: 'Always respond in English' },
  'custom': { directive: '' },
} as const

export type AiOutputLanguage = keyof typeof AI_OUTPUT_LANGUAGES

export function getAiOutputLanguageLabel(lang: AiOutputLanguage): string {
  // For built-in languages, use LANG_LABELS
  if (lang in LANG_LABELS) {
    return LANG_LABELS[lang as SupportedLang]
  }

  if (lang === 'custom' && i18n?.isInitialized) {
    try {
      return i18n.t('language:labels.custom')
    }
    catch {
      // Fallback if translation fails
    }
  }

  return lang
}

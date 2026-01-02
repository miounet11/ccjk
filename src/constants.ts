import { homedir } from 'node:os'
import { join } from 'pathe'
import { i18n } from './i18n'

// Claude Code configuration paths
export const CLAUDE_DIR = join(homedir(), '.claude')
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json')
export const CLAUDE_MD_FILE = join(CLAUDE_DIR, 'CLAUDE.md')
export const ClAUDE_CONFIG_FILE = join(homedir(), '.claude.json')
export const CLAUDE_VSC_CONFIG_FILE = join(CLAUDE_DIR, 'config.json')

// Codex configuration paths
export const CODEX_DIR = join(homedir(), '.codex')
export const CODEX_CONFIG_FILE = join(CODEX_DIR, 'config.toml')
export const CODEX_AUTH_FILE = join(CODEX_DIR, 'auth.json')
export const CODEX_AGENTS_FILE = join(CODEX_DIR, 'AGENTS.md')
export const CODEX_PROMPTS_DIR = join(CODEX_DIR, 'prompts')

// Aider configuration paths
export const AIDER_DIR = join(homedir(), '.aider')
export const AIDER_CONFIG_FILE = join(AIDER_DIR, '.aider.conf.yml')
export const AIDER_ENV_FILE = join(AIDER_DIR, '.env')

// Continue configuration paths
export const CONTINUE_DIR = join(homedir(), '.continue')
export const CONTINUE_CONFIG_FILE = join(CONTINUE_DIR, 'config.json')

// Cline configuration paths (VS Code extension stores in workspace)
export const CLINE_DIR = join(homedir(), '.cline')
export const CLINE_CONFIG_FILE = join(CLINE_DIR, 'config.json')

// Cursor CLI configuration paths
export const CURSOR_DIR = join(homedir(), '.cursor')
export const CURSOR_CONFIG_FILE = join(CURSOR_DIR, 'config.json')

// CCJK configuration paths
export const CCJK_CONFIG_DIR = join(homedir(), '.ccjk')
export const CCJK_CONFIG_FILE = join(CCJK_CONFIG_DIR, 'config.toml')
export const CCJK_PLUGINS_DIR = join(CCJK_CONFIG_DIR, 'plugins')
export const CCJK_SKILLS_DIR = join(CCJK_CONFIG_DIR, 'skills')
export const CCJK_GROUPS_DIR = join(CCJK_CONFIG_DIR, 'groups')

// Legacy ZCF paths for migration support
export const LEGACY_ZCF_CONFIG_DIR = join(homedir(), '.ufomiao', 'zcf')
export const LEGACY_ZCF_CONFIG_FILE = join(LEGACY_ZCF_CONFIG_DIR, 'config.toml')
export const LEGACY_ZCF_CONFIG_FILES = [
  join(CLAUDE_DIR, '.zcf-config.json'),
  join(homedir(), '.zcf.json'),
  LEGACY_ZCF_CONFIG_FILE,
]

// Aliases for backward compatibility (deprecated, use CCJK_* instead)
/** @deprecated Use CCJK_CONFIG_DIR instead */
export const ZCF_CONFIG_DIR = CCJK_CONFIG_DIR
/** @deprecated Use CCJK_CONFIG_FILE instead */
export const ZCF_CONFIG_FILE = CCJK_CONFIG_FILE

export const CODE_TOOL_TYPES = ['claude-code', 'codex', 'aider', 'continue', 'cline', 'cursor'] as const
export type CodeToolType = (typeof CODE_TOOL_TYPES)[number]
export const DEFAULT_CODE_TOOL_TYPE: CodeToolType = 'claude-code'

export const CODE_TOOL_BANNERS: Record<CodeToolType, string> = {
  'claude-code': 'for Claude Code',
  'codex': 'for Codex',
  'aider': 'for Aider',
  'continue': 'for Continue',
  'cline': 'for Cline',
  'cursor': 'for Cursor CLI',
}

// Short aliases for code tool types
export const CODE_TOOL_ALIASES: Record<string, CodeToolType> = {
  cc: 'claude-code',
  cx: 'codex',
  ad: 'aider',
  ct: 'continue',
  cl: 'cline',
  cu: 'cursor',
}

// Tool metadata for display and management
export const CODE_TOOL_INFO: Record<CodeToolType, {
  name: string
  description: string
  website: string
  installCmd: string
  configFormat: 'json' | 'toml' | 'yaml'
  category: 'cli' | 'extension' | 'editor'
}> = {
  'claude-code': {
    name: 'Claude Code',
    description: 'Anthropic official CLI for Claude',
    website: 'https://claude.ai/code',
    installCmd: 'npm install -g @anthropic-ai/claude-code',
    configFormat: 'json',
    category: 'cli',
  },
  'codex': {
    name: 'Codex',
    description: 'OpenAI Codex CLI',
    website: 'https://openai.com/codex',
    installCmd: 'npm install -g @openai/codex',
    configFormat: 'toml',
    category: 'cli',
  },
  'aider': {
    name: 'Aider',
    description: 'AI pair programming in terminal',
    website: 'https://aider.chat',
    installCmd: 'pip install aider-chat',
    configFormat: 'yaml',
    category: 'cli',
  },
  'continue': {
    name: 'Continue',
    description: 'Open-source AI code assistant',
    website: 'https://continue.dev',
    installCmd: 'pip install continuedev',
    configFormat: 'json',
    category: 'extension',
  },
  'cline': {
    name: 'Cline',
    description: 'Autonomous coding agent for VS Code',
    website: 'https://cline.bot',
    installCmd: 'code --install-extension saoudrizwan.claude-dev',
    configFormat: 'json',
    category: 'extension',
  },
  'cursor': {
    name: 'Cursor CLI',
    description: 'AI-first code editor CLI',
    website: 'https://cursor.com/cli',
    installCmd: 'curl https://cursor.com/install -fsSL | bash',
    configFormat: 'json',
    category: 'editor',
  },
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

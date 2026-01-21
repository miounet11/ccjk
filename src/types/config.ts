/**
 * Claude Code settings.json configuration types
 * Supports Claude Code CLI 2.0-2.1 configuration schema
 */

/**
 * StatusLine configuration for Claude Code
 */
export interface StatusLineConfig {
  type: 'command'
  command: string
  padding?: number
}

/**
 * Thinking configuration for Claude Code CLI 2.0+
 */
export interface ThinkingConfig {
  /** Enable extended thinking mode */
  enabled?: boolean
  /** Budget tokens for thinking (default: 10240) */
  budgetTokens?: number
}

/**
 * File suggestion configuration for Claude Code CLI 2.0+
 */
export interface FileSuggestionConfig {
  /** Command to run for file suggestions (e.g., 'git', 'grep') */
  command?: string
}

/**
 * Permission configuration for CCJK
 */
export interface PermissionConfig {
  allow?: string[]
  deny?: string[]
}

/**
 * Claude Code CLI 2.0-2.1 settings.json configuration
 * Extends the legacy configuration with new fields
 */
export interface ClaudeSettings {
  /** Model configuration: opus, sonnet, sonnet[1m], or custom. Custom models should use env variables instead. */
  model?: 'opus' | 'sonnet' | 'sonnet[1m]' | 'custom'

  /** Environment variables for API configuration */
  env?: {
    ANTHROPIC_API_KEY?: string
    ANTHROPIC_AUTH_TOKEN?: string
    ANTHROPIC_BASE_URL?: string
    ANTHROPIC_MODEL?: string
    ANTHROPIC_DEFAULT_HAIKU_MODEL?: string
    ANTHROPIC_DEFAULT_SONNET_MODEL?: string
    ANTHROPIC_DEFAULT_OPUS_MODEL?: string
    [key: string]: string | undefined
  }

  /** Permissions configuration */
  permissions?: {
    allow?: string[]
    deny?: string[]
  }

  /** Chat configuration */
  chat?: {
    alwaysApprove?: string[]
  }

  /** Experimental features configuration */
  experimental?: {
    [key: string]: any
  }

  /** Status line configuration */
  statusLine?: StatusLineConfig

  /** Output style for AI responses (legacy CCJK field) */
  outputStyle?: string

  // === Claude Code CLI 2.0-2.1 new fields ===

  /** Response language for AI (e.g., "japanese", "chinese", "english") */
  language?: string

  /** Custom directory for storing plans */
  plansDirectory?: string

  /** Show duration for each turn in conversation */
  showTurnDuration?: boolean

  /** Respect .gitignore file for file operations */
  respectGitignore?: boolean

  /** MCP auto-enable threshold configuration */
  auto?: {
    /** Number of uses before auto-enabling an MCP server (default: 5) */
    mcp?: number
  }

  /** Default agent for Claude Code CLI 2.0+ */
  agent?: string

  /** Extended thinking configuration */
  thinking?: ThinkingConfig

  /** File suggestion configuration */
  fileSuggestion?: FileSuggestionConfig

  /** Allow unsandboxed commands (dangerous) */
  allowUnsandboxedCommands?: boolean

  /** List of disallowed tools */
  disallowedTools?: string[]

  /** Attribution string for responses */
  attribution?: string

  /** Index configuration for context management */
  index?: {
    /** Maximum number of files to index */
    maxFiles?: number
    /** Maximum file size to index (in bytes) */
    maxFileSize?: number
  }

  /** Allow/deny browser automation */
  allowBrowser?: boolean

  /** Session configuration */
  session?: {
    /** Auto-naming pattern for sessions */
    autoNaming?: 'branch' | 'timestamp' | 'prompt' | 'off'
    /** Session persistence directory */
    directory?: string
    /** Auto-save interval in seconds */
    autoSaveInterval?: number
  }

  /** Background tasks configuration */
  backgroundTasks?: {
    /** Maximum concurrent background tasks */
    maxConcurrent?: number
    /** Storage directory for task data */
    storageDir?: string
    /** Default task timeout in milliseconds */
    defaultTimeout?: number
  }

  /** Teleport configuration for remote sessions */
  teleport?: {
    /** Enable teleport feature */
    enabled?: boolean
    /** Custom endpoint for teleport service */
    endpoint?: string
    /** API key for remote service */
    apiKey?: string
    /** Session expiration in days */
    expirationDays?: number
  }

  /** Output format configuration */
  output?: {
    /** Format for responses */
    format?: 'text' | 'markdown' | 'json'
    /** Include timestamps */
    timestamps?: boolean
    /** Include source attribution */
    attribution?: boolean
  }

  /** MCP servers configuration (legacy field, now in config.json) */
  mcpServers?: Record<string, McpServerConfig>

  /** Additional unknown fields for forward compatibility */
  [key: string]: any
}

/**
 * MCP server configuration (shared between settings.json and config.json)
 */
export interface McpServerConfig {
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
}

/**
 * API configuration for Claude Code
 */
export interface ApiConfig {
  url: string
  key: string
  authType?: 'auth_token' | 'api_key'
}

/**
 * Installation method types for code tools
 */
export type InstallMethod = 'npm' | 'homebrew' | 'curl' | 'powershell' | 'cmd'

/**
 * Installation method option with metadata
 */
export interface InstallMethodOption {
  method: InstallMethod
  label: string
  description: string
  command: string
  args?: string[]
  platforms: ('windows' | 'macos' | 'linux' | 'wsl')[]
  recommended?: boolean
}

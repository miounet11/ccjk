/**
 * Hook system type definitions for CCJK
 * Provides extensible hook mechanism for intercepting and extending CCJK operations
 */

/**
 * Hook type enumeration
 * Defines all available hook points in the CCJK lifecycle
 */
export enum HookType {
  /** Triggered before sending request to AI provider */
  PreRequest = 'PreRequest',
  /** Triggered after receiving response from AI provider */
  PostResponse = 'PostResponse',
  /** Triggered when switching between API providers */
  ProviderSwitch = 'ProviderSwitch',
  /** Triggered when an error occurs */
  Error = 'Error',
  /** Triggered at the start of a session */
  SessionStart = 'SessionStart',
  /** Triggered at the end of a session */
  SessionEnd = 'SessionEnd',
}

/**
 * Hook configuration interface
 * Defines how a hook should be executed
 */
export interface Hook {
  /** Hook type - determines when this hook is triggered */
  type: HookType
  /** Command to execute (shell command or Node.js script path) */
  command: string
  /** Timeout in milliseconds (default: 5000ms) */
  timeout?: number
  /** Whether to execute asynchronously without blocking main flow (default: false) */
  async?: boolean
  /** Optional description for documentation */
  description?: string
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean
}

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  /** Whether the hook executed successfully */
  success: boolean
  /** Hook that was executed */
  hook: Hook
  /** Execution time in milliseconds */
  executionTime: number
  /** Standard output from the hook */
  stdout?: string
  /** Standard error from the hook */
  stderr?: string
  /** Exit code from the hook process */
  exitCode?: number
  /** Error message if execution failed */
  error?: string
}

/**
 * Hook configuration stored in config file
 */
export interface HooksConfig {
  /** Hooks organized by type */
  [HookType.PreRequest]?: Hook[]
  [HookType.PostResponse]?: Hook[]
  [HookType.ProviderSwitch]?: Hook[]
  [HookType.Error]?: Hook[]
  [HookType.SessionStart]?: Hook[]
  [HookType.SessionEnd]?: Hook[]
}

/**
 * Hook manager options
 */
export interface HookManagerOptions {
  /** Path to hooks configuration file */
  configPath?: string
  /** Whether to enable hooks globally (default: true) */
  enabled?: boolean
  /** Default timeout for all hooks in milliseconds */
  defaultTimeout?: number
}

/**
 * Hook command options
 */
export interface HookCommandOptions {
  /** Language for CLI output */
  lang?: 'en' | 'zh-CN'
  /** Show detailed information */
  verbose?: boolean
}

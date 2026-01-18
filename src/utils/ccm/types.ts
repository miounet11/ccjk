/**
 * CCM (Claude Code Monitor) Type Definitions
 */

/**
 * Session status types
 */
export type CCMSessionStatus = 'running' | 'waiting_input' | 'stopped'

/**
 * CCM session data structure
 */
export interface CCMSession {
  /**
   * Claude Code session identifier
   */
  session_id: string

  /**
   * Working directory path
   */
  cwd: string

  /**
   * Terminal device path (e.g., /dev/ttys001)
   */
  tty: string

  /**
   * Session status
   */
  status: CCMSessionStatus

  /**
   * Last update timestamp (ISO 8601)
   */
  updated_at: string
}

/**
 * CCM sessions file structure
 */
export interface CCMSessionsData {
  sessions: CCMSession[]
}

/**
 * CCM installation options
 */
export interface CCMInstallOptions {
  /**
   * Force reinstall even if already installed
   */
  force?: boolean

  /**
   * Skip setup after installation
   */
  skipSetup?: boolean

  /**
   * Silent mode (no prompts)
   */
  silent?: boolean
}

/**
 * CCM status display
 */
export interface CCMStatusDisplay {
  /**
   * Status symbol (●, ◐, ✓)
   */
  symbol: string

  /**
   * Status label
   */
  label: string

  /**
   * Color for display
   */
  color: 'green' | 'yellow' | 'gray'
}

/**
 * CCM command action types
 */
export type CCMAction = 'launch' | 'watch' | 'setup' | 'clear' | 'list' | 'status'

/**
 * CCM configuration in Claude Code settings
 */
export interface CCMHookConfig {
  /**
   * Hook command to execute
   */
  command: string

  /**
   * Hook description
   */
  description?: string
}

/**
 * Keybinding System Types
 * 快捷键系统类型定义
 *
 * @version 8.0.0
 * @module keybinding
 */

/**
 * Key modifier enum
 */
export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | 'cmd'

/**
 * Keybinding context
 */
export type KeybindingContext = 'global' | 'terminal' | 'editor' | 'prompt'

/**
 * Keybinding interface
 */
export interface Keybinding {
  id: string
  key: string                    // e.g., "ctrl+b", "ctrl+shift+p"
  command: string                // Command to execute
  args?: any[]                   // Command arguments
  when?: KeybindingContext       // Context when binding is active
  description?: string           // Human-readable description
  enabled: boolean
}

/**
 * Keybinding configuration
 */
export interface KeybindingConfig {
  keybindings: Keybinding[]
  version: string
}

/**
 * Key event interface
 */
export interface KeyEvent {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

/**
 * Keybinding manager options
 */
export interface KeybindingManagerOptions {
  storageType: 'local' | 'cloud'
  cloudEndpoint?: string
  enableDefaults?: boolean
}

/**
 * Keybinding conflict
 */
export interface KeybindingConflict {
  key: string
  existing: Keybinding
  new: Keybinding
}

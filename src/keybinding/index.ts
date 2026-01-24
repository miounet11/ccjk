/**
 * Keybinding Module
 * 快捷键模块入口
 *
 * @version 8.0.0
 * @module keybinding
 */

export { KeybindingManager } from './keybinding-manager'
export { DEFAULT_KEYBINDINGS } from './defaults'

export type {
  Keybinding,
  KeybindingConfig,
  KeyEvent,
  KeybindingContext,
  KeybindingManagerOptions,
  KeybindingConflict,
  KeyModifier,
} from './types'

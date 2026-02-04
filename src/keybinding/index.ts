/**
 * Keybinding Module
 * 快捷键模块入口
 *
 * @version 8.0.0
 * @module keybinding
 */

export { DEFAULT_KEYBINDINGS } from './defaults'
export { KeybindingManager } from './keybinding-manager'

export type {
  Keybinding,
  KeybindingConfig,
  KeybindingConflict,
  KeybindingContext,
  KeybindingManagerOptions,
  KeyEvent,
  KeyModifier,
} from './types'

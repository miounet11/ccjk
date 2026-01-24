/**
 * Default Keybindings
 * 默认快捷键配置
 *
 * @version 8.0.0
 * @module keybinding
 */

import type { Keybinding } from './types'

/**
 * Default keybindings for CCJK
 */
export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // Task management
  {
    id: 'task.create',
    key: 'ctrl+t',
    command: 'task:create',
    when: 'terminal',
    description: 'Create a new task',
    enabled: true,
  },
  {
    id: 'task.list',
    key: 'ctrl+shift+t',
    command: 'task:list',
    when: 'terminal',
    description: 'List all tasks',
    enabled: true,
  },

  // Background execution
  {
    id: 'background.run',
    key: 'ctrl+b',
    command: 'background:run',
    when: 'terminal',
    description: 'Run current command in background',
    enabled: true,
  },

  // Editor
  {
    id: 'editor.open',
    key: 'ctrl+g',
    command: 'editor:open',
    when: 'prompt',
    description: 'Open prompt in external editor',
    enabled: true,
  },

  // History
  {
    id: 'history.search',
    key: 'ctrl+r',
    command: 'history:search',
    when: 'terminal',
    description: 'Search command history',
    enabled: true,
  },
  {
    id: 'history.previous',
    key: 'up',
    command: 'history:previous',
    when: 'prompt',
    description: 'Previous command in history',
    enabled: true,
  },
  {
    id: 'history.next',
    key: 'down',
    command: 'history:next',
    when: 'prompt',
    description: 'Next command in history',
    enabled: true,
  },

  // Session management
  {
    id: 'session.save',
    key: 'ctrl+s',
    command: 'session:save',
    when: 'terminal',
    description: 'Save current session',
    enabled: true,
  },
  {
    id: 'session.list',
    key: 'ctrl+shift+s',
    command: 'session:list',
    when: 'terminal',
    description: 'List all sessions',
    enabled: true,
  },

  // Autocomplete
  {
    id: 'autocomplete.trigger',
    key: 'tab',
    command: 'autocomplete:trigger',
    when: 'prompt',
    description: 'Trigger autocomplete',
    enabled: true,
  },
  {
    id: 'autocomplete.next',
    key: 'tab',
    command: 'autocomplete:next',
    when: 'prompt',
    description: 'Next autocomplete suggestion',
    enabled: true,
  },
  {
    id: 'autocomplete.previous',
    key: 'shift+tab',
    command: 'autocomplete:previous',
    when: 'prompt',
    description: 'Previous autocomplete suggestion',
    enabled: true,
  },

  // Cancel/Exit
  {
    id: 'cancel',
    key: 'esc',
    command: 'cancel',
    when: 'global',
    description: 'Cancel current operation',
    enabled: true,
  },
  {
    id: 'exit',
    key: 'ctrl+c',
    command: 'exit',
    when: 'global',
    description: 'Exit CCJK',
    enabled: true,
  },

  // Help
  {
    id: 'help',
    key: 'ctrl+h',
    command: 'help',
    when: 'global',
    description: 'Show help',
    enabled: true,
  },
]

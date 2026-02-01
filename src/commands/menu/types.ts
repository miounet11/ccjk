/**
 * Menu System Type Definitions
 *
 * This file defines the core types for the progressive menu system,
 * including menu items, categories, complexity levels, and user preferences.
 */

import type { CodeToolType, SupportedLang } from '../../constants'

/**
 * Menu item complexity level for progressive disclosure
 */
export type MenuLevel = 'basic' | 'intermediate' | 'expert'

/**
 * Menu item category for grouping
 */
export type MenuCategory
  = | 'quick'
    | 'config'
    | 'tools'
    | 'advanced'
    | 'system'
    | 'cloud'
    | 'extensions'

/**
 * Menu item action type
 */
export type MenuAction
  = | 'command' // Execute a command function
    | 'submenu' // Navigate to a submenu
    | 'toggle' // Toggle a boolean setting
    | 'input' // Prompt for user input
    | 'back' // Return to previous menu
    | 'exit' // Exit the menu system

/**
 * Individual menu item definition
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: string

  /** Display label (i18n key) */
  label: string

  /** Short description (i18n key) */
  description: string

  /** Category for grouping */
  category: MenuCategory

  /** Complexity level for progressive disclosure */
  level: MenuLevel

  /** Action type */
  action: MenuAction

  /** Action handler function */
  handler?: () => Promise<void | boolean> | void | boolean

  /** Keyboard shortcut (single character) */
  shortcut?: string

  /** Icon/emoji for visual emphasis */
  icon?: string

  /** Whether this item requires confirmation before executing */
  confirm?: boolean

  /** Confirmation message (i18n key) */
  confirmMessage?: string

  /** Whether this item is disabled */
  disabled?: boolean

  /** Disabled reason (i18n key) */
  disabledReason?: string

  /** Submenu to navigate to (for action: 'submenu') */
  submenu?: MenuDefinition
}

/**
 * Menu definition for rendering
 */
export interface MenuDefinition {
  /** Menu title (i18n key) */
  title: string

  /** Menu subtitle/description (i18n key) */
  subtitle?: string

  /** Menu items organized by category */
  items: MenuItem[]

  /** Whether to show category headers */
  showCategories: boolean

  /** Maximum visible items before scrolling */
  maxVisible?: number
}

/**
 * Menu state and user preferences
 */
export interface MenuState {
  /** Current language */
  language: SupportedLang

  /** Current code tool type */
  codeTool: CodeToolType

  /** Current menu level */
  level: MenuLevel

  /** Whether to show advanced options */
  showAdvanced: boolean

  /** Menu history for navigation */
  history: MenuDefinition[]

  /** Current position in history */
  historyIndex: number
}

/**
 * Menu render options
 */
export interface MenuRenderOptions {
  /** Whether to show keyboard shortcuts */
  showShortcuts: boolean

  /** Whether to show descriptions */
  showDescriptions: boolean

  /** Whether to use color (ANSI codes) */
  useColor: boolean

  /** Terminal width for layout */
  terminalWidth: number
}

/**
 * Menu navigation result
 */
export type MenuResult
  = | 'continue' // Continue showing menu
    | 'back' // Go back to previous menu
    | 'exit' // Exit menu system
    | 'switch' // Switch code tool (requires menu reload)
    | undefined // No action taken, continue

/**
 * Menu configuration
 */
export interface MenuConfig {
  /** Default menu level */
  defaultLevel: MenuLevel

  /** Whether to remember user's level preference */
  rememberLevel: boolean

  /** Whether to show hints and tips */
  showHints: boolean

  /** Keyboard navigation enabled */
  keyboardNav: boolean

  /** Animation speed in ms */
  animationSpeed: number
}

/**
 * Menu section definition for layout
 */
export interface MenuSection {
  /** Section title (i18n key) */
  title: string

  /** Section icon */
  icon?: string

  /** Items in this section */
  items: MenuItem[]

  /** Whether this section is collapsed */
  collapsed?: boolean
}

/**
 * Validated menu input
 */
export interface MenuInput {
  /** Raw input string */
  raw: string

  /** Normalized input (lowercase, trimmed) */
  normalized: string

  /** Whether input is a shortcut */
  isShortcut: boolean

  /** Whether input is a number */
  isNumber: boolean

  /** Numeric value if isNumber is true */
  number?: number
}

/**
 * Menu item render data
 */
export interface MenuItemRenderData {
  /** Menu item */
  item: MenuItem

  /** Display number */
  number: number

  /** Display label */
  label: string

  /** Display description */
  description: string

  /** Keyboard shortcut indicator */
  shortcutIndicator: string

  /** Whether item is highlighted */
  highlighted: boolean
}

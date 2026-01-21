/**
 * Menu Input Handler
 *
 * Handles user input processing including:
 * - Number-based selection (1, 2, 3...)
 * - Keyboard shortcuts (a, c, m, q...)
 * - Navigation (back, exit)
 * - Input validation
 */

import type { MenuInput, MenuItem, MenuSection } from '../types'
import inquirer from 'inquirer'
import { i18n } from '../../i18n'

/**
 * Valid menu input characters
 */
const VALID_SHORTCUTS = new Set([
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
])

/**
 * Parse and validate menu input
 */
export function parseMenuInput(raw: string): MenuInput {
  const trimmed = raw.trim()
  const normalized = trimmed.toLowerCase()

  return {
    raw: trimmed,
    normalized,
    isShortcut: trimmed.length === 1 && VALID_SHORTCUTS.has(normalized),
    isNumber: /^\d+$/.test(trimmed),
    number: /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : undefined,
  }
}

/**
 * Validate menu input against available items
 */
export function validateMenuInput(
  input: MenuInput,
  itemCount: number,
  items: MenuItem[],
): string | true {
  // Check for exit command
  if (input.normalized === 'q' || input.normalized === 'quit') {
    return true
  }

  // Check for back command
  if (input.normalized === '0' || input.normalized === 'b' || input.normalized === 'back') {
    return true
  }

  // Check for more command
  if (input.normalized === 'm' || input.normalized === 'more') {
    return true
  }

  // Check numeric input
  if (input.isNumber) {
    if (input.number! < 0 || input.number! > itemCount) {
      return i18n.t('common:invalidChoice', 'Invalid choice')
    }
    return true
  }

  // Check shortcut input
  if (input.isShortcut) {
    const hasShortcut = items.some(item => item.shortcut === input.normalized)
    if (!hasShortcut) {
      return i18n.t('common:invalidChoice', 'Invalid choice')
    }
    return true
  }

  return i18n.t('common:invalidChoice', 'Invalid choice')
}

/**
 * Prompt for menu selection
 */
export async function promptMenuSelection(
  itemCount: number,
  items: MenuItem[],
  message?: string,
): Promise<string> {
  const promptMessage = message || i18n.t('common:enterChoice', 'Enter your choice')

  // Build validation regex
  const validShortcuts = items.map(i => i.shortcut).filter(Boolean).join('')
  const validNumbers = Array.from({ length: itemCount + 1 }, (_, i) => i.toString()).join('')
  const alwaysValid = ['0', 'q', 'b', 'm']
  const validChars = [...new Set([...alwaysValid, ...validShortcuts, ...validNumbers])].join('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: promptMessage,
    validate: (value: string) => {
      if (!value || value.trim() === '') {
        return i18n.t('common:invalidChoice', 'Please enter a choice')
      }

      const input = parseMenuInput(value)
      const result = validateMenuInput(input, itemCount, items)
      return result
    },
  })

  return choice
}

/**
 * Find menu item by input
 */
export function findItemByInput(
  input: MenuInput,
  sections: MenuSection[],
): MenuItem | undefined {
  // Try numeric selection first
  if (input.isNumber && input.number! > 0) {
    let current = 1
    for (const section of sections) {
      if (section.collapsed)
        continue
      for (const item of section.items) {
        if (current === input.number) {
          return item
        }
        current++
      }
    }
  }

  // Try shortcut
  if (input.isShortcut) {
    for (const section of sections) {
      for (const item of section.items) {
        if (item.shortcut === input.normalized) {
          return item
        }
      }
    }
  }

  return undefined
}

/**
 * Check if input is a back command
 */
export function isBackCommand(input: MenuInput): boolean {
  return input.normalized === '0' || input.normalized === 'b' || input.normalized === 'back'
}

/**
 * Check if input is an exit command
 */
export function isExitCommand(input: MenuInput): boolean {
  return input.normalized === 'q' || input.normalized === 'quit' || input.normalized === 'exit'
}

/**
 * Check if input is a more command (show more features)
 */
export function isMoreCommand(input: MenuInput): boolean {
  return input.normalized === 'm' || input.normalized === 'more'
}

/**
 * Check if input is a help command
 */
export function isHelpCommand(input: MenuInput): boolean {
  return input.normalized === '?' || input.normalized === 'h' || input.normalized === 'help'
}

/**
 * Get all valid shortcuts from items
 */
export function getAllShortcuts(items: MenuItem[]): string[] {
  return items.map(item => item.shortcut).filter(Boolean) as string[]
}

/**
 * Display input hints
 */
export function getInputHints(items: MenuItem[]): string {
  const shortcuts = getAllShortcuts(items)
  const hints: string[] = []

  if (shortcuts.length > 0) {
    hints.push(`Shortcuts: ${shortcuts.slice(0, 5).join(', ')}${shortcuts.length > 5 ? '...' : ''}`)
  }

  hints.push('0 = Back, Q = Quit')

  return hints.join(' | ')
}

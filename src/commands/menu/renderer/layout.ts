/**
 * Menu Layout Engine
 *
 * Handles the visual rendering of menus including:
 * - ASCII art layout generation
 * - Section grouping and headers
 * - Responsive layout based on terminal width
 * - Color scheme management (MUD-style: green highlights, white text)
 * - Keyboard shortcut indicators
 */

import type { SupportedLang } from '../../constants'
import type { MenuCategory, MenuItem, MenuItemRenderData, MenuRenderOptions, MenuSection } from '../types'
import ansis from 'ansis'
import { i18n } from '../../i18n'

/**
 * Default render options
 */
const defaultRenderOptions: MenuRenderOptions = {
  showShortcuts: true,
  showDescriptions: true,
  useColor: true,
  terminalWidth: 80,
}

/**
 * Color scheme tokens
 * Following MUD-style convention: green for highlights, white for text
 */
const colors = {
  title: ansis.green.bold,
  section: ansis.green.bold,
  itemNumber: ansis.green,
  itemText: ansis.white,
  itemTextDim: ansis.white,
  description: ansis.dim,
  shortcut: ansis.green,
  separator: ansis.dim,
  disabled: ansis.dim,
  error: ansis.red,
  warning: ansis.yellow,
  success: ansis.green,
  icon: ansis.green,
}

/**
 * ASCII box drawing characters
 */
const boxChars = {
  horizontal: '─',
  vertical: '│',
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  leftT: '├',
  rightT: '┤',
  cross: '┼',
}

/**
 * Get translated text with fallback
 */
function t(key: string, defaultValue?: string): string {
  try {
    const result = i18n.t(key)
    return result !== key ? result : (defaultValue || key)
  }
  catch {
    return defaultValue || key
  }
}

/**
 * Format a menu item for display
 */
export function formatMenuItem(
  item: MenuItem,
  number: number,
  options: Partial<MenuRenderOptions> = {},
): MenuItemRenderData {
  const opts = { ...defaultRenderOptions, ...options }

  return {
    item,
    number,
    label: t(item.label, item.id),
    description: t(item.description, ''),
    shortcutIndicator: item.shortcut ? `[${item.shortcut}]` : '',
    highlighted: false,
  }
}

/**
 * Render a single menu item line
 */
export function renderMenuItemLine(data: MenuItemRenderData, options: Partial<MenuRenderOptions> = {}): string {
  const opts = { ...defaultRenderOptions, ...options }

  if (data.item.disabled) {
    const disabledText = data.item.disabledReason ? ` (${t(data.item.disabledReason, 'Disabled')})` : ''
    return `  ${colors.disabled(`${data.number}. ${data.label}${disabledText}`)}`
  }

  const icon = data.item.icon ? `${colors.icon(data.item.icon)} ` : ''
  const numberPart = colors.itemNumber(`${data.number}.`)
  const labelPart = opts.useColor ? colors.itemText(data.label) : data.label
  const shortcutPart = opts.showShortcuts && data.shortcutIndicator
    ? colors.shortcut(` ${data.shortcutIndicator}`)
    : ''

  let line = `  ${icon}${numberPart} ${labelPart}${shortcutPart}`

  // Add description if enabled and available
  if (opts.showDescriptions && data.description) {
    const spacing = Math.max(2, 45 - line.replace(/\x1B\[[0-9;]*m/g, '').length)
    const descPart = colors.description(data.description)
    line += ' '.repeat(spacing) + descPart
  }

  return line
}

/**
 * Group menu items into sections
 */
export function groupItemsIntoSections(
  items: MenuItem[],
  options: Partial<MenuRenderOptions> = {},
): MenuSection[] {
  const sections: Map<string, MenuItem[]> = new Map()

  // Group by category
  for (const item of items) {
    if (!sections.has(item.category)) {
      sections.set(item.category, [])
    }
    sections.get(item.category)!.push(item)
  }

  // Convert to MenuSection array with translated titles
  const result: MenuSection[] = []

  // Define section order and titles
  const sectionOrder: MenuCategory[] = ['quick', 'config', 'extensions', 'tools', 'cloud', 'system']

  for (const category of sectionOrder) {
    const categoryItems = sections.get(category)
    if (categoryItems && categoryItems.length > 0) {
      result.push({
        title: getCategoryTitle(category),
        icon: getCategoryIcon(category),
        items: categoryItems,
        collapsed: false,
      })
    }
  }

  return result
}

/**
 * Get category title (i18n key)
 */
function getCategoryTitle(category: MenuCategory): string {
  const titles: Record<MenuCategory, string> = {
    quick: 'menu:menuSections.quickStart',
    config: 'menu:menuSections.configCenter',
    tools: 'menu:menuSections.extensions',
    advanced: 'menu:menuSections.systemSettings',
    system: 'menu:menuSections.systemSettings',
    cloud: 'menu:menuSections.cloudServices',
    extensions: 'menu:menuSections.smartFeatures',
  }
  return titles[category] || category
}

/**
 * Get category icon
 */
function getCategoryIcon(category: MenuCategory): string {
  const icons: Record<MenuCategory, string> = {
    quick: '🚀',
    config: '⚙️',
    tools: '🔌',
    advanced: '🔬',
    system: '🖥️',
    cloud: '☁️',
    extensions: '🛠️',
  }
  return icons[category] || '•'
}

/**
 * Render a section header
 */
export function renderSectionHeader(section: MenuSection, useColor = true): string {
  const title = t(section.title, section.title)
  const icon = section.icon || ''

  if (useColor) {
    return `\n  ${colors.section(`${icon} ${title}`)}`
  }
  return `\n  ${icon} ${title}`
}

/**
 * Render a separator line
 */
export function renderSeparator(width: number, useColor = true): string {
  const line = boxChars.horizontal.repeat(Math.max(20, width - 4))
  if (useColor) {
    return `\n${colors.separator(line)}\n`
  }
  return `\n${line}\n`
}

/**
 * Render the complete menu
 */
export function renderMenu(
  title: string,
  items: MenuItem[],
  options: Partial<MenuRenderOptions> = {},
): string {
  const opts = { ...defaultRenderOptions, ...options }
  const lines: string[] = []

  // Title
  if (opts.useColor) {
    lines.push(colors.title.bold(t(title, title)))
  }
  else {
    lines.push(t(title, title))
  }
  lines.push('')

  // Group into sections
  const sections = groupItemsIntoSections(items, opts)

  // Render each section
  let itemNumber = 1
  for (const section of sections) {
    // Section header
    if (sections.length > 1) {
      lines.push(renderSectionHeader(section, opts.useColor))
    }

    // Section items
    for (const item of section.items) {
      const data = formatMenuItem(item, itemNumber++, opts)
      lines.push(renderMenuItemLine(data, opts))
    }

    // Section separator (except last section)
    if (section !== sections[sections.length - 1]) {
      lines.push('')
    }
  }

  // Footer with global shortcuts
  lines.push('')
  lines.push(renderFooter(opts))

  return lines.join('\n')
}

/**
 * Render menu footer with global shortcuts
 */
export function renderFooter(options: Partial<MenuRenderOptions> = {}): string {
  const opts = { ...defaultRenderOptions, ...options }
  const parts: string[] = []

  // Language
  const langLabel = t('menu:menuOptions.changeLanguage', 'Language')
  if (opts.showShortcuts) {
    parts.push(`${colors.shortcut('0')} ${colors.itemText(langLabel)}`)
  }
  else {
    parts.push(`0. ${langLabel}`)
  }

  // More
  if (opts.showShortcuts) {
    parts.push(`${colors.shortcut('M')} ${colors.itemText(t('menu:oneClick.more', 'More'))}`)
  }
  else {
    parts.push(`M. ${t('menu:oneClick.more', 'More')}`)
  }

  // Quit
  const quitLabel = t('menu:menuOptions.exit', 'Exit')
  if (opts.showShortcuts) {
    parts.push(`${colors.error('Q')} ${colors.itemText(quitLabel)}`)
  }
  else {
    parts.push(`Q. ${quitLabel}`)
  }

  return `  ${parts.join('  ')}`
}

/**
 * Render a simple list (for submenus)
 */
export function renderSimpleList(
  title: string,
  items: MenuItem[],
  options: Partial<MenuRenderOptions> = {},
): string {
  const opts = { ...defaultRenderOptions, ...options }
  const lines: string[] = []

  // Title
  if (opts.useColor) {
    lines.push(colors.success(t(title, title)))
  }
  else {
    lines.push(t(title, title))
  }

  // Items
  let itemNumber = 1
  for (const item of items) {
    const data = formatMenuItem(item, itemNumber++, opts)
    lines.push(renderMenuItemLine(data, opts))
  }

  // Back option
  const backLabel = t('common:back', 'Back')
  if (opts.showShortcuts) {
    lines.push(`  ${colors.shortcut('0')}. ${colors.itemText(backLabel)}`)
  }
  else {
    lines.push(`  0. ${backLabel}`)
  }

  lines.push('')
  lines.push('')

  return lines.join('\n')
}

/**
 * Render a box (ASCII art) for special menus
 */
export function renderBox(
  title: string,
  content: string[],
  width: number,
  useColor = true,
): string {
  const lines: string[] = []

  // Top border
  const topBorder = boxChars.topLeft + boxChars.horizontal.repeat(width - 2) + boxChars.topRight
  lines.push(useColor ? colors.separator(topBorder) : topBorder)

  // Title line
  if (title) {
    const padding = (width - 2 - title.length - 2) / 2
    const leftPad = ' '.repeat(Math.floor(padding))
    const rightPad = ' '.repeat(Math.ceil(padding))
    const titleLine = boxChars.vertical + leftPad + (useColor ? colors.title.bold(title) : title) + rightPad + boxChars.vertical
    lines.push(titleLine)

    const separator = boxChars.leftT + boxChars.horizontal.repeat(width - 2) + boxChars.rightT
    lines.push(useColor ? colors.separator(separator) : separator)
  }

  // Content
  for (const line of content) {
    const padding = width - 2 - line.replace(/\x1B\[[0-9;]*m/g, '').length
    lines.push(`${boxChars.vertical} ${line}${' '.repeat(Math.max(0, padding))}${boxChars.vertical}`)
  }

  // Bottom border
  const bottomBorder = boxChars.bottomLeft + boxChars.horizontal.repeat(width - 2) + boxChars.bottomRight
  lines.push(useColor ? colors.separator(bottomBorder) : bottomBorder)

  return lines.join('\n')
}

/**
 * Render progress indicator
 */
export function renderProgress(current: number, total: number, width = 30): string {
  const filled = Math.round((current / total) * width)
  const empty = width - filled
  const bar = colors.success('█'.repeat(filled)) + colors.dim('░'.repeat(empty))
  return `[${bar}] ${current}/${total}`
}

/**
 * Render a notification/warning box
 */
export function renderNotification(
  message: string,
  type: 'info' | 'warning' | 'error' | 'success',
  width = 60,
): string {
  const icon = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  }[type]

  const colorFn = {
    info: ansis.blue,
    warning: ansis.yellow,
    error: ansis.red,
    success: ansis.green,
  }[type]

  return renderBox(
    `${icon} ${type.toUpperCase()}`,
    [message],
    width,
    true,
  )
}

/**
 * Calculate layout dimensions based on terminal width
 */
export function calculateLayout(terminalWidth: number): {
  menuWidth: number
  descriptionIndent: number
  maxDescriptionLength: number
} {
  const menuWidth = Math.min(terminalWidth - 4, 100)
  const descriptionIndent = Math.max(35, Math.floor(menuWidth * 0.35))
  const maxDescriptionLength = menuWidth - descriptionIndent - 4

  return {
    menuWidth,
    descriptionIndent,
    maxDescriptionLength,
  }
}

/**
 * Truncate text to fit width
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  const cleanText = text.replace(/\x1B\[[0-9;]*m/g, '') // Remove ANSI codes
  if (cleanText.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Measure text width (ignoring ANSI codes)
 */
export function measureText(text: string): number {
  return text.replace(/\x1B\[[0-9;]*m/g, '').length
}

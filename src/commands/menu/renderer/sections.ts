/**
 * Menu Section Definitions
 *
 * Defines all menu sections with their titles, icons, and items.
 * Sections are organized by category and can be dynamically shown/hidden.
 */

import type { MenuCategory, MenuItem, MenuLevel, MenuSection } from '../types'
import { i18n } from '../../../i18n/index'
import { menuItemsByCategory } from '../main-menu'
import { getCategoryIcon } from './layout'

/**
 * Get translated category title
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

  const key = titles[category] || category
  try {
    return i18n.t(key) !== key ? i18n.t(key) : category
  }
  catch {
    return category
  }
}

/**
 * Create a menu section from a category
 */
export function createSection(
  category: MenuCategory,
  level: MenuLevel = 'basic',
  collapsed = false,
): MenuSection {
  const allItems = menuItemsByCategory[category] || []

  // Filter items by level
  const levels = level === 'basic' ? ['basic'] : level === 'intermediate' ? ['basic', 'intermediate'] : ['basic', 'intermediate', 'expert']
  const items = allItems.filter(item => levels.includes(item.level))

  return {
    title: getCategoryTitle(category),
    icon: getCategoryIcon(category),
    items,
    collapsed,
  }
}

/**
 * Create all sections for a given level
 */
export function createAllSections(level: MenuLevel = 'basic'): MenuSection[] {
  const categories: MenuCategory[] = ['quick', 'config', 'extensions', 'tools', 'cloud', 'system']
  const sections: MenuSection[] = []

  for (const category of categories) {
    const section = createSection(category, level)
    if (section.items.length > 0) {
      sections.push(section)
    }
  }

  return sections
}

/**
 * Get visible items count across all sections
 */
export function getVisibleItemCount(sections: MenuSection[]): number {
  return sections.reduce((total, section) => total + (section.collapsed ? 0 : section.items.length), 0)
}

/**
 * Filter sections to show based on available width
 * Returns sections that should be visible given item limit
 */
export function filterSectionsByItemLimit(
  sections: MenuSection[],
  maxItems: number,
): MenuSection[] {
  const result: MenuSection[] = []
  let count = 0

  for (const section of sections) {
    const sectionItemCount = section.items.length

    if (count + sectionItemCount <= maxItems) {
      result.push(section)
      count += sectionItemCount
    }
    else {
      // Partial section - show items up to limit
      const remaining = maxItems - count
      if (remaining > 0) {
        result.push({
          ...section,
          items: section.items.slice(0, remaining),
        })
      }
      break
    }
  }

  return result
}

/**
 * Find a menu item by ID across all sections
 */
export function findItemById(sections: MenuSection[], id: string): MenuItem | undefined {
  for (const section of sections) {
    const item = section.items.find(i => i.id === id)
    if (item) {
      return item
    }
  }
  return undefined
}

/**
 * Find a menu item by shortcut across all sections
 */
export function findItemByShortcut(sections: MenuSection[], shortcut: string): MenuItem | undefined {
  for (const section of sections) {
    const item = section.items.find(i => i.shortcut === shortcut.toLowerCase())
    if (item) {
      return item
    }
  }
  return undefined
}

/**
 * Get item number across all sections
 */
export function getItemNumber(sections: MenuSection[], itemId: string): number | undefined {
  let number = 1

  for (const section of sections) {
    if (section.collapsed) {
      continue
    }

    for (const item of section.items) {
      if (item.id === itemId) {
        return number
      }
      number++
    }
  }

  return undefined
}

/**
 * Get item by number across all sections
 */
export function getItemByNumber(sections: MenuSection[], number: number): MenuItem | undefined {
  let current = 1

  for (const section of sections) {
    if (section.collapsed) {
      continue
    }

    for (const item of section.items) {
      if (current === number) {
        return item
      }
      current++
    }
  }

  return undefined
}

/**
 * Section priority for display ordering
 */
export const sectionPriority: Record<MenuCategory, number> = {
  quick: 1,
  config: 2,
  extensions: 3,
  tools: 4,
  cloud: 5,
  system: 6,
  advanced: 7,
}

/**
 * Sort sections by priority
 */
export function sortSectionsByPriority(sections: MenuSection[]): MenuSection[] {
  return [...sections].sort((a, b) => {
    const aCategory = getCategoryFromTitle(a.title)
    const bCategory = getCategoryFromTitle(b.title)
    return (sectionPriority[aCategory] || 99) - (sectionPriority[bCategory] || 99)
  })
}

/**
 * Get category from title (reverse lookup)
 */
function getCategoryFromTitle(title: string): MenuCategory {
  const allTitles: Record<MenuCategory, string> = {
    quick: 'menu:menuSections.quickStart',
    config: 'menu:menuSections.configCenter',
    tools: 'menu:menuSections.extensions',
    advanced: 'menu:menuSections.systemSettings',
    system: 'menu:menuSections.systemSettings',
    cloud: 'menu:menuSections.cloudServices',
    extensions: 'menu:menuSections.smartFeatures',
  }

  for (const [category, key] of Object.entries(allTitles)) {
    try {
      if (i18n.t(key) === title) {
        return category as MenuCategory
      }
    }
    catch {
      // Continue
    }
  }

  return 'system'
}

/**
 * Toggle section collapsed state
 */
export function toggleSectionCollapsed(sections: MenuSection[], sectionIndex: number): MenuSection[] {
  return sections.map((section, index) => {
    if (index === sectionIndex) {
      return { ...section, collapsed: !section.collapsed }
    }
    return section
  })
}

/**
 * Expand all sections
 */
export function expandAllSections(sections: MenuSection[]): MenuSection[] {
  return sections.map(section => ({ ...section, collapsed: false }))
}

/**
 * Collapse all sections except the first one
 */
export function collapseSecondarySections(sections: MenuSection[]): MenuSection[] {
  return sections.map((section, index) => ({
    ...section,
    collapsed: index > 0,
  }))
}

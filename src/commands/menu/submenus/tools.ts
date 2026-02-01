/**
 * Tools Submenu
 *
 * Handles external tool integrations including:
 * - CCR (Claude Code Router)
 * - CCUsage (usage analytics)
 * - Cometix (status line tool)
 * - Superpowers (skills system)
 */

import type { MenuDefinition, MenuItem } from '../types'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../../../utils/tools'

/**
 * Tools submenu items
 */
export const toolsMenuItems: MenuItem[] = [
  {
    id: 'ccr',
    label: 'pluginsMenu.ccr',
    description: 'pluginsMenu.ccrDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'command',
    icon: '🔀',
    shortcut: '1',
    handler: async () => {
      await runCcrMenuFeature()
    },
  },
  {
    id: 'ccusage',
    label: 'pluginsMenu.ccusage',
    description: 'pluginsMenu.ccusageDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'command',
    icon: '📊',
    shortcut: '2',
    handler: async () => {
      await runCcusageFeature()
    },
  },
  {
    id: 'cometix',
    label: 'pluginsMenu.cometix',
    description: 'pluginsMenu.cometixDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'command',
    icon: '📈',
    shortcut: '3',
    handler: async () => {
      await runCometixMenuFeature()
    },
  },
  {
    id: 'superpowers',
    label: 'pluginsMenu.superpowers',
    description: 'pluginsMenu.superpowersDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'submenu',
    icon: '⚡',
    shortcut: '4',
    handler: async () => {
      // Delegate to superpowers submenu
      const { showSuperpowersMenu } = await import('./cloud')
      await showSuperpowersMenu()
    },
  },
]

/**
 * Get tools menu definition
 */
export function getToolsMenu(): MenuDefinition {
  return {
    title: 'menu:moreMenu.extensions',
    subtitle: 'menu:moreMenu.extensionsDesc',
    items: toolsMenuItems,
    showCategories: false,
    maxVisible: 8,
  }
}

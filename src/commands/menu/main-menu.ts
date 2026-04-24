/**
 * Main Menu Item Definitions
 *
 * This file defines all menu items organized by category and level.
 * Items are progressively shown based on user's selected complexity level.
 *
 * Level Structure:
 * - basic: Essential items for new users (8 visible items max)
 * - intermediate: Additional power-user features
 * - expert: All available options including experimental features
 */

import type { CodeToolType } from '../../constants'
import type { RuntimeCapabilityDescriptor } from '../../code-tools/core/types'
import type { MenuCategory, MenuItem } from './types'
import { getRuntimeCapabilityDescriptor } from '../../code-tools'

const NON_CODEX_TOOLS: CodeToolType[] = ['claude-code', 'clavue', 'aider', 'continue', 'cline', 'cursor']

type MenuCapabilityRule = (descriptor: RuntimeCapabilityDescriptor) => boolean

const CLAUDE_FAMILY_SLASH_RULE: MenuCapabilityRule = descriptor => descriptor.native.slashCommands && descriptor.configBackend === 'claude-family'

const MENU_ITEM_CAPABILITY_RULES: Partial<Record<string, MenuCapabilityRule>> = {
  'diagnostics': descriptor => descriptor.managedByCcjk.doctor,
  'doctor': descriptor => descriptor.managedByCcjk.doctor,
  'workspace': descriptor => descriptor.managedByCcjk.doctor,
  'api-config': descriptor => descriptor.managedByCcjk.configSync || descriptor.managedByCcjk.providerProfiles,
  'mcp-config': descriptor => descriptor.native.mcp && descriptor.managedByCcjk.mcpBundles,
  'model-config': descriptor => descriptor.managedByCcjk.modelRouting,
  'memory-config': descriptor => descriptor.native.memory,
  'permission-config': descriptor => descriptor.native.permissions && descriptor.managedByCcjk.permissionRepair,
  'config-switch': descriptor => descriptor.managedByCcjk.configSync || descriptor.managedByCcjk.providerProfiles,
  'ccr': descriptor => descriptor.configBackend === 'claude-family',
  'ccusage': descriptor => descriptor.configBackend === 'claude-family',
  'cometix': descriptor => descriptor.native.statusline,
  'superpowers': CLAUDE_FAMILY_SLASH_RULE,
  'mcp-market': descriptor => descriptor.native.mcp && descriptor.managedByCcjk.mcpBundles,
  'marketplace': descriptor => descriptor.configBackend === 'claude-family',
  'hooks-sync': descriptor => descriptor.configBackend === 'claude-family',
  'quick-actions': CLAUDE_FAMILY_SLASH_RULE,
  'smart-guide': CLAUDE_FAMILY_SLASH_RULE,
  'workflows': CLAUDE_FAMILY_SLASH_RULE,
  'output-styles': CLAUDE_FAMILY_SLASH_RULE,
}

/**
 * Quick Actions Category - Always visible first
 * API Configuration is the #1 feature - one-click setup for all providers
 */
export const quickActionsItems: MenuItem[] = [
  {
    id: 'init',
    label: 'menu:oneClick.setup',
    description: 'menu:oneClick.setupDesc',
    category: 'quick',
    level: 'basic',
    action: 'command',
    icon: '⚡',
    shortcut: '1',
  },
  {
    id: 'diagnostics',
    label: 'menu:oneClick.fix',
    description: 'menu:oneClick.fixDesc',
    category: 'quick',
    level: 'basic',
    action: 'command',
    icon: '🔧',
    shortcut: '2',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'api-config',
    label: 'menu:configCenter.api',
    description: 'menu:configCenter.apiDesc',
    category: 'quick',
    level: 'basic',
    action: 'command',
    icon: '🔑',
    shortcut: '3',
  },
  {
    id: 'workflow-import',
    label: 'menu:menuOptions.codexImportWorkflow',
    description: 'menu:menuDescriptions.codexImportWorkflow',
    category: 'quick',
    level: 'basic',
    action: 'command',
    icon: '📦',
    shortcut: '4',
    supportedTools: ['codex'],
  },
  {
    id: 'codex-preset',
    label: 'menu:menuOptions.codexPreset',
    description: 'menu:menuDescriptions.codexPreset',
    category: 'quick',
    level: 'basic',
    action: 'command',
    icon: '🧩',
    shortcut: '5',
    supportedTools: ['codex'],
  },
  {
    id: 'update',
    label: 'menu:oneClick.update',
    description: 'menu:oneClick.updateDesc',
    category: 'quick',
    level: 'intermediate',
    action: 'command',
    icon: '🔄',
    shortcut: '+',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'notifications',
    label: 'menu:oneClick.notify',
    description: 'menu:oneClick.notifyDesc',
    category: 'quick',
    level: 'intermediate',
    action: 'command',
    icon: '📱',
    shortcut: 'n',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * Configuration Category - Core settings
 * Essential configuration options (API config moved to quick actions)
 */
export const configItems: MenuItem[] = [
  {
    id: 'mcp-config',
    label: 'menu:configCenter.mcp',
    description: 'menu:configCenter.mcpDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🔌',
    shortcut: '4',
  },
  {
    id: 'model-config',
    label: 'menu:configCenter.model',
    description: 'menu:configCenter.modelDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🤖',
    shortcut: '5',
  },
  {
    id: 'memory-config',
    label: 'menu:configCenter.memory',
    description: 'menu:configCenter.memoryDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🧠',
    shortcut: '6',
  },
  {
    id: 'permission-config',
    label: 'menu:configCenter.permission',
    description: 'menu:configCenter.permissionDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🛡️',
    shortcut: '7',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'config-switch',
    label: 'menu:configCenter.configSwitch',
    description: 'menu:configCenter.configSwitchDesc',
    category: 'config',
    level: 'intermediate',
    action: 'command',
    icon: '🔀',
    shortcut: 's',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'context-config',
    label: 'menu:configCenter.context',
    description: 'menu:configCenter.contextDesc',
    category: 'config',
    level: 'expert',
    action: 'submenu',
    icon: '📊',
    shortcut: 'x',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * Tools Category - External integrations
 * Recommended plugins and tools
 */
export const toolsItems: MenuItem[] = [
  {
    id: 'ccr',
    label: 'pluginsMenu.ccr',
    description: 'pluginsMenu.ccrDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'submenu',
    icon: '🔀',
    shortcut: 'r',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'ccusage',
    label: 'pluginsMenu.ccusage',
    description: 'pluginsMenu.ccusageDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'command',
    icon: '📊',
    shortcut: 'u',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'cometix',
    label: 'pluginsMenu.cometix',
    description: 'pluginsMenu.cometixDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'submenu',
    icon: '📈',
    shortcut: 'l',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'superpowers',
    label: 'pluginsMenu.superpowers',
    description: 'pluginsMenu.superpowersDesc',
    category: 'tools',
    level: 'intermediate',
    action: 'submenu',
    icon: '⚡',
    shortcut: 'e',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * Cloud Services Category - Cloud-based features
 */
export const cloudItems: MenuItem[] = [
  {
    id: 'mcp-market',
    label: 'menuOptions.mcpMarket',
    description: 'menuDescriptions.mcpMarket',
    category: 'cloud',
    level: 'intermediate',
    action: 'submenu',
    icon: '🏪',
    shortcut: 'k',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'marketplace',
    label: 'menuOptions.marketplace',
    description: 'menuDescriptions.marketplace',
    category: 'cloud',
    level: 'intermediate',
    action: 'submenu',
    icon: '📦',
    shortcut: 'm',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'hooks-sync',
    label: 'menuOptions.hooksSync',
    description: 'menuDescriptions.hooksSync',
    category: 'cloud',
    level: 'expert',
    action: 'submenu',
    icon: '🔄',
    shortcut: 'h',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * Smart Features Category - CCJK intelligent features
 */
export const smartFeaturesItems: MenuItem[] = [
  {
    id: 'quick-actions',
    label: 'menuOptions.quickActions',
    description: 'menuDescriptions.quickActions',
    category: 'extensions',
    level: 'intermediate',
    action: 'submenu',
    icon: '🚀',
    shortcut: 'a',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'smart-guide',
    label: 'menuOptions.smartGuide',
    description: 'menuDescriptions.smartGuide',
    category: 'extensions',
    level: 'intermediate',
    action: 'submenu',
    icon: '🎯',
    shortcut: 'g',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * CCJK Features Category - Workflow and skills management
 */
export const ccjkFeaturesItems: MenuItem[] = [
  {
    id: 'workflows',
    label: 'menuOptions.workflowsAndSkills',
    description: 'menuDescriptions.workflowsAndSkills',
    category: 'extensions',
    level: 'intermediate',
    action: 'submenu',
    icon: '📋',
    shortcut: 'w',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'output-styles',
    label: 'menuOptions.outputStyles',
    description: 'menuDescriptions.outputStyles',
    category: 'extensions',
    level: 'expert',
    action: 'submenu',
    icon: '🎨',
    shortcut: 'o',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * System Category - System-level settings
 */
export const systemItems: MenuItem[] = [
  {
    id: 'codex-switch-tool',
    label: 'menuOptions.switchCodeTool',
    description: 'menuDescriptions.switchCodeTool',
    category: 'quick',
    level: 'basic',
    action: 'command',
    icon: '🔄',
    shortcut: 's',
    supportedTools: ['codex'],
  },
  {
    id: 'doctor',
    label: 'menuOptions.doctor',
    description: 'menuDescriptions.doctor',
    category: 'system',
    level: 'basic',
    action: 'command',
    icon: '🔍',
    shortcut: 'd',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'workspace',
    label: 'categorizedMenu.workspace',
    description: 'categorizedMenu.workspaceDesc',
    category: 'system',
    level: 'expert',
    action: 'command',
    icon: '📁',
    shortcut: 'z',
    supportedTools: NON_CODEX_TOOLS,
  },
  {
    id: 'uninstall',
    label: 'menuOptions.uninstall',
    description: 'menuDescriptions.uninstall',
    category: 'system',
    level: 'expert',
    action: 'command',
    icon: '🗑️',
    confirm: true,
    confirmMessage: 'uninstall.confirm',
    supportedTools: NON_CODEX_TOOLS,
  },
]

/**
 * All menu items grouped by category
 */
export const menuItemsByCategory: Record<MenuCategory, MenuItem[]> = {
  quick: quickActionsItems,
  config: configItems,
  tools: toolsItems,
  cloud: cloudItems,
  extensions: [...smartFeaturesItems, ...ccjkFeaturesItems],
  advanced: [], // Reserved for experimental features
  system: systemItems,
}

/**
 * Get visible menu items based on level
 */
function isItemSupportedByCapabilities(
  item: MenuItem,
  codeTool: CodeToolType,
): boolean {
  const descriptor = getRuntimeCapabilityDescriptor(codeTool)
  if (!descriptor) {
    return true
  }

  const rule = MENU_ITEM_CAPABILITY_RULES[item.id]
  return rule ? rule(descriptor) : true
}

export function isItemSupportedForTool(
  item: MenuItem,
  codeTool: CodeToolType,
): boolean {
  const toolSupported = !item.supportedTools || item.supportedTools.includes(codeTool)
  if (!toolSupported) {
    return false
  }

  return isItemSupportedByCapabilities(item, codeTool)
}

export function getVisibleItems(
  level: 'basic' | 'intermediate' | 'expert',
  codeTool: CodeToolType = 'claude-code',
): MenuItem[] {
  const visible: MenuItem[] = []
  const levels = level === 'basic' ? ['basic'] : level === 'intermediate' ? ['basic', 'intermediate'] : ['basic', 'intermediate', 'expert']

  for (const items of Object.values(menuItemsByCategory)) {
    for (const item of items) {
      if (levels.includes(item.level) && isItemSupportedForTool(item, codeTool)) {
        visible.push(item)
      }
    }
  }

  return visible
}

/**
 * Get menu items for a specific category
 */
export function getItemsByCategory(
  category: MenuCategory,
  level: 'basic' | 'intermediate' | 'expert',
  codeTool: CodeToolType = 'claude-code',
): MenuItem[] {
  const items = menuItemsByCategory[category] || []
  const levels = level === 'basic' ? ['basic'] : level === 'intermediate' ? ['basic', 'intermediate'] : ['basic', 'intermediate', 'expert']

  return items.filter(item => levels.includes(item.level) && isItemSupportedForTool(item, codeTool))
}

/**
 * Get a menu item by ID
 */
export function getItemById(id: string): MenuItem | undefined {
  for (const items of Object.values(menuItemsByCategory)) {
    const item = items.find(i => i.id === id)
    if (item) {
      return item
    }
  }
  return undefined
}

/**
 * Map of legacy menu keys to new menu item IDs
 * For backward compatibility during migration
 */
export const __testUtils = {
  isItemSupportedByCapabilities,
}

export const legacyKeyToItemId: Record<string, string> = {
  // Quick Actions
  '1': 'init',
  '2': 'diagnostics',
  '3': 'api-config',
  '4': 'update',
  '5': 'notifications',
  // Config
  '6': 'mcp-config',
  '7': 'model-config',
  'y': 'memory-config',
  // Smart Features
  'a': 'quick-actions',
  'g': 'smart-guide',
  'd': 'doctor',
  // CCJK Features
  'w': 'workflows',
  'o': 'output-styles',
  'c': 'config-switch',
  // Tools
  'r': 'ccr',
  'u': 'ccusage',
  'l': 'cometix',
  'p': 'superpowers',
  'm': 'marketplace',
  // Cloud
  'n': 'notifications',
  'k': 'mcp-market',
  'h': 'hooks-sync',
  // System
  's': 'switch-code-tool',
  '0': 'language',
  '-': 'uninstall',
  '+': 'check-updates',
  'q': 'exit',
}

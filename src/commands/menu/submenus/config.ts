/**
 * Configuration Submenu
 *
 * Handles all configuration-related options including:
 * - API configuration
 * - MCP services
 * - Model settings
 * - AI memory
 * - Permissions
 * - Config switching
 * - Context management
 */

import type { SupportedLang } from '../../../constants'
import type { MenuDefinition, MenuItem } from '../types'
import { i18n } from '../../../i18n/index'
import { configureAiMemoryFeature, configureApiFeature, configureDefaultModelFeature, configureEnvPermissionFeature, configureMcpFeature } from '../../../utils/features'
import { showContextMenu } from '../../context-menu'

/**
 * Configuration submenu items
 */
export const configMenuItems: MenuItem[] = [
  {
    id: 'api-config',
    label: 'configCenter.api',
    description: 'configCenter.apiDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🔑',
    shortcut: '1',
    handler: async () => {
      await configureApiFeature()
    },
  },
  {
    id: 'mcp-config',
    label: 'configCenter.mcp',
    description: 'configCenter.mcpDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🔌',
    shortcut: '2',
    handler: async () => {
      await configureMcpFeature()
    },
  },
  {
    id: 'model-config',
    label: 'configCenter.model',
    description: 'configCenter.modelDesc',
    category: 'config',
    level: 'basic',
    action: 'command',
    icon: '🤖',
    shortcut: '3',
    handler: async () => {
      await configureDefaultModelFeature()
    },
  },
  {
    id: 'memory-config',
    label: 'configCenter.memory',
    description: 'configCenter.memoryDesc',
    category: 'config',
    level: 'intermediate',
    action: 'command',
    icon: '🧠',
    shortcut: '4',
    handler: async () => {
      await configureAiMemoryFeature()
    },
  },
  {
    id: 'permission-config',
    label: 'configCenter.permission',
    description: 'configCenter.permissionDesc',
    category: 'config',
    level: 'intermediate',
    action: 'command',
    icon: '🛡️',
    shortcut: '5',
    handler: async () => {
      await configureEnvPermissionFeature()
    },
  },
  {
    id: 'config-switch',
    label: 'configCenter.configSwitch',
    description: 'configCenter.configSwitchDesc',
    category: 'config',
    level: 'intermediate',
    action: 'command',
    icon: '🔀',
    shortcut: '6',
    handler: async () => {
      const { configSwitchCommand } = await import('../../config-switch')
      await configSwitchCommand({ codeType: 'claude-code' })
    },
  },
  {
    id: 'context-config',
    label: 'configCenter.context',
    description: 'configCenter.contextDesc',
    category: 'config',
    level: 'expert',
    action: 'command',
    icon: '📊',
    shortcut: '7',
    handler: async () => {
      await showContextMenu()
    },
  },
]

/**
 * Get configuration menu definition
 */
export function getConfigMenu(): MenuDefinition {
  return {
    title: 'configCenter.title',
    subtitle: 'configCenter.apiDesc',
    items: configMenuItems,
    showCategories: false,
    maxVisible: 10,
  }
}

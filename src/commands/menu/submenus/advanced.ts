/**
 * Advanced Features Submenu
 *
 * Handles advanced and expert features including:
 * - Quick Actions panel
 * - Smart Guide configuration
 * - Workflows and Skills management
 * - Output Styles configuration
 * - Diagnostics and Doctor
 * - Workspace diagnostics
 * - System settings
 */

import type { MenuDefinition, MenuItem } from '../types'
import { showOutputStylesMenu, showQuickActionsMenu, showSmartGuideMenu, showWorkflowsAndSkillsMenu } from '../../utils/smart-guide'
import { doctor, workspaceDiagnostics } from '../doctor'

/**
 * Advanced features submenu items
 */
export const advancedMenuItems: MenuItem[] = [
  {
    id: 'quick-actions',
    label: 'menuOptions.quickActions',
    description: 'menuDescriptions.quickActions',
    category: 'extensions',
    level: 'intermediate',
    action: 'submenu',
    icon: '🚀',
    shortcut: '1',
    handler: async () => {
      await showQuickActionsMenu()
    },
  },
  {
    id: 'smart-guide',
    label: 'menuOptions.smartGuide',
    description: 'menuDescriptions.smartGuide',
    category: 'extensions',
    level: 'intermediate',
    action: 'submenu',
    icon: '🎯',
    shortcut: '2',
    handler: async () => {
      await showSmartGuideMenu()
    },
  },
  {
    id: 'workflows',
    label: 'menuOptions.workflowsAndSkills',
    description: 'menuDescriptions.workflowsAndSkills',
    category: 'extensions',
    level: 'intermediate',
    action: 'submenu',
    icon: '📋',
    shortcut: '3',
    handler: async () => {
      await showWorkflowsAndSkillsMenu()
    },
  },
  {
    id: 'output-styles',
    label: 'menuOptions.outputStyles',
    description: 'menuDescriptions.outputStyles',
    category: 'extensions',
    level: 'expert',
    action: 'submenu',
    icon: '🎨',
    shortcut: '4',
    handler: async () => {
      await showOutputStylesMenu()
    },
  },
  {
    id: 'doctor',
    label: 'menuOptions.doctor',
    description: 'menuDescriptions.doctor',
    category: 'system',
    level: 'basic',
    action: 'command',
    icon: '🔍',
    shortcut: '5',
    handler: async () => {
      await doctor()
    },
  },
  {
    id: 'workspace',
    label: 'categorizedMenu.workspace',
    description: 'categorizedMenu.workspaceDesc',
    category: 'system',
    level: 'expert',
    action: 'command',
    icon: '📁',
    shortcut: '6',
    handler: async () => {
      await workspaceDiagnostics()
    },
  },
]

/**
 * Get advanced features menu definition
 */
export function getAdvancedMenu(): MenuDefinition {
  return {
    title: 'menu:menuSections.smartTools',
    subtitle: 'Advanced features and tools',
    items: advancedMenuItems,
    showCategories: false,
    maxVisible: 10,
  }
}

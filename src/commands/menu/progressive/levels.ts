/**
 * Progressive Menu Levels
 *
 * Defines the three complexity levels for progressive disclosure:
 * - Basic: Essential features for new users (9 items max)
 * - Intermediate: Power-user features (15 items max)
 * - Expert: All available options (unlimited)
 *
 * Users can unlock higher levels through:
 * 1. Using the menu multiple times
 * 2. Explicitly selecting the level
 * 3. Setting a preference in config
 */

import type { MenuItem, MenuLevel } from '../types'
import { getVisibleItems } from '../main-menu'

/**
 * Level definitions with descriptions
 */
export const levelDefinitions = {
  basic: {
    name: 'Basic',
    description: 'Essential features for getting started',
    maxItems: 9,
    icon: '🌱',
    categories: ['quick', 'config'],
    features: [
      'API config', // #1 Core feature - one-click API setup
      'One-click setup',
      'Diagnostics',
      'Update all',
      'Notifications',
      'MCP config',
      'Model config',
      'Doctor',
    ],
  },
  intermediate: {
    name: 'Intermediate',
    description: 'Power-user features for productivity',
    maxItems: 15,
    icon: '🚀',
    categories: ['quick', 'config', 'extensions', 'tools', 'cloud'],
    features: [
      'All basic features',
      'Quick Actions',
      'Smart Guide',
      'CCR integration',
      'CCUsage analytics',
      'Cometix statusline',
      'Superpowers',
      'MCP Market',
      'Plugin Marketplace',
      'Memory management',
      'Config switching',
    ],
  },
  expert: {
    name: 'Expert',
    description: 'All features including experimental options',
    maxItems: Infinity,
    icon: '🔬',
    categories: ['quick', 'config', 'extensions', 'tools', 'cloud', 'system', 'advanced'],
    features: [
      'All intermediate features',
      'Hooks Cloud Sync',
      'Output Styles',
      'Context Management',
      'Workspace Diagnostics',
      'Switch Code Tool',
      'Advanced Configuration',
    ],
  },
} as const

/**
 * Get items for a specific level
 */
export function getItemsForLevel(level: MenuLevel): MenuItem[] {
  return getVisibleItems(level)
}

/**
 * Get the next level
 */
export function getNextLevel(current: MenuLevel): MenuLevel {
  switch (current) {
    case 'basic':
      return 'intermediate'
    case 'intermediate':
      return 'expert'
    case 'expert':
      return 'basic' // Cycle back
  }
}

/**
 * Get the previous level
 */
export function getPreviousLevel(current: MenuLevel): MenuLevel {
  switch (current) {
    case 'basic':
      return 'expert' // Cycle back
    case 'intermediate':
      return 'basic'
    case 'expert':
      return 'intermediate'
  }
}

/**
 * Check if a level has access to a feature
 */
export function hasAccessToFeature(level: MenuLevel, featureId: string): boolean {
  const items = getItemsForLevel(level)
  return items.some(item => item.id === featureId)
}

/**
 * Get level progress (how many more items until next level)
 */
export function getLevelProgress(level: MenuLevel): {
  current: number
  nextLevel?: MenuLevel
  itemsToUnlock: number
  progressPercent: number
} {
  const currentItems = getItemsForLevel(level).length

  if (level === 'basic') {
    const nextItems = getItemsForLevel('intermediate').length
    return {
      current: currentItems,
      nextLevel: 'intermediate',
      itemsToUnlock: nextItems - currentItems,
      progressPercent: Math.round((currentItems / levelDefinitions.basic.maxItems) * 100),
    }
  }

  if (level === 'intermediate') {
    const nextItems = getItemsForLevel('expert').length
    return {
      current: currentItems,
      nextLevel: 'expert',
      itemsToUnlock: nextItems - currentItems,
      progressPercent: Math.round((currentItems / levelDefinitions.intermediate.maxItems) * 100),
    }
  }

  return {
    current: currentItems,
    itemsToUnlock: 0,
    progressPercent: 100,
  }
}

/**
 * Level selection menu items
 */
export const levelSelectionItems: MenuItem[] = [
  {
    id: 'level-basic',
    label: 'Basic',
    description: 'Essential features for new users',
    category: 'system',
    level: 'basic',
    action: 'command',
    icon: '🌱',
  },
  {
    id: 'level-intermediate',
    label: 'Intermediate',
    description: 'Power-user features for productivity',
    category: 'system',
    level: 'intermediate',
    action: 'command',
    icon: '🚀',
  },
  {
    id: 'level-expert',
    label: 'Expert',
    description: 'All features including experimental',
    category: 'system',
    level: 'expert',
    action: 'command',
    icon: '🔬',
  },
]

/**
 * User level preference storage key
 */
const LEVEL_PREFERENCE_KEY = 'ccjk:menu:level'

/**
 * Save user's level preference (for future implementation)
 */
export function saveLevelPreference(level: MenuLevel): void {
  // TODO: Implement persistence when config system is ready
  // For now, this is a placeholder
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEVEL_PREFERENCE_KEY, level)
    }
  }
  catch {
    // Ignore errors
  }
}

/**
 * Load user's level preference (for future implementation)
 */
export function loadLevelPreference(): MenuLevel | null {
  // TODO: Implement persistence when config system is ready
  // For now, this is a placeholder
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LEVEL_PREFERENCE_KEY)
      if (saved === 'basic' || saved === 'intermediate' || saved === 'expert') {
        return saved
      }
    }
  }
  catch {
    // Ignore errors
  }
  return null
}

/**
 * Determine appropriate level for user
 */
export function determineAutoLevel(usageCount: number): MenuLevel {
  if (usageCount < 3) {
    return 'basic'
  }
  if (usageCount < 10) {
    return 'intermediate'
  }
  return 'expert'
}

/**
 * Get level recommendation based on user actions
 */
export function getLevelRecommendation(
  level: MenuLevel,
  actionsPerformed: string[],
): {
  recommendedLevel: MenuLevel
  reason: string
} | null {
  const advancedActions = ['ccr', 'ccusage', 'mcp-market', 'workflows']
  const expertActions = ['hooks-sync', 'workspace', 'context-config']

  const hasAdvancedActions = actionsPerformed.some(a => advancedActions.includes(a))
  const hasExpertActions = actionsPerformed.some(a => expertActions.includes(a))

  if (level === 'basic') {
    if (hasAdvancedActions) {
      return {
        recommendedLevel: 'intermediate',
        reason: 'You\'re using advanced features. Unlock intermediate mode for more options!',
      }
    }
  }

  if (level === 'intermediate') {
    if (hasExpertActions) {
      return {
        recommendedLevel: 'expert',
        reason: 'You\'re exploring expert features. Unlock expert mode for full access!',
      }
    }
  }

  return null
}

/**
 * Level transition messages
 */
export const levelTransitionMessages = {
  'basic-to-intermediate': {
    title: '🎉 Level Up!',
    message: 'You\'ve unlocked Intermediate mode! Enjoy new features like Quick Actions, Smart Guide, and tool integrations.',
  },
  'intermediate-to-expert': {
    title: '🚀 Expert Mode Unlocked!',
    message: 'You now have access to all features including Hooks Sync, Context Management, and advanced diagnostics.',
  },
  'expert-to-basic': {
    title: '🌱 Back to Basics',
    message: 'Simplified menu activated. Essential features only for a cleaner experience.',
  },
}

/**
 * Get transition message when changing levels
 */
export function getTransitionMessage(from: MenuLevel, to: MenuLevel): {
  title: string
  message: string
} | null {
  const key = `${from}-to-${to}` as keyof typeof levelTransitionMessages
  return levelTransitionMessages[key] || null
}

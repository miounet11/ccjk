// Built-in plugins
export { default as analyticsPlugin } from './analytics'
export { default as ccmPlugin } from './ccm'

export * from './manager'
export { default as performancePlugin } from './performance'
// CCJK Plugin System
export * from './types'

/**
 * All built-in plugins
 */
export const builtInPlugins = {
  analytics: () => import('./analytics').then(m => m.default),
  performance: () => import('./performance').then(m => m.default),
  ccm: () => import('./ccm').then(m => m.default),
} as const

/**
 * Plugin categories
 */
export enum PluginCategory {
  /** Analytics and tracking plugins */
  Analytics = 'analytics',
  /** Performance monitoring plugins */
  Performance = 'performance',
  /** Tool integration plugins */
  Integration = 'integration',
  /** Development utilities */
  Utility = 'utility',
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin category */
  category: PluginCategory
  /** Plugin tags for discovery */
  tags: string[]
  /** Whether the plugin is experimental */
  experimental?: boolean
  /** Plugin documentation URL */
  docsUrl?: string
}

/**
 * Built-in plugin metadata
 */
export const pluginMetadata: Record<string, PluginMetadata> = {
  'ccjk-analytics': {
    category: PluginCategory.Analytics,
    tags: ['analytics', 'tracking', 'usage', 'statistics'],
    docsUrl: 'https://ccjk.dev/plugins/analytics',
  },
  'ccjk-performance': {
    category: PluginCategory.Performance,
    tags: ['performance', 'monitoring', 'profiling', 'metrics'],
    docsUrl: 'https://ccjk.dev/plugins/performance',
  },
  'ccjk-ccm': {
    category: PluginCategory.Integration,
    tags: ['ccm', 'claude-code', 'version-management', 'installation'],
    docsUrl: 'https://ccjk.dev/plugins/ccm',
  },
}

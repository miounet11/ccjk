/**
 * CCJK - Claude Code JinKu
 * Advanced AI-powered development assistant
 *
 * @packageDocumentation
 */

// Original exports
export { init } from './commands/init'
export * from './constants'
export * from './types'
export * from './utils/claude-config'
export * from './utils/config'
export * from './utils/installer'
export { cleanupPermissions, mergeAndCleanPermissions } from './utils/permission-cleaner'
export { commandExists, getPlatform } from './utils/platform'
export { importRecommendedEnv, importRecommendedPermissions, openSettingsJson } from './utils/simple-config'

// CCJK New Features
export * from './skills'
export * from './plugins'
export * from './subagent-groups'
export * from './shencha'

// CCJK Utilities
export * from './utils/banner'
export * from './utils/auto-config'
export * from './utils/ui'
export * from './utils/health-check'
export * from './utils/upgrade-manager'
export * from './utils/config-consolidator'
export * from './utils/permission-manager'
export * from './utils/onboarding'

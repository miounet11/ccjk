/**
 * CCJK - Claude Code JinKu
 * Advanced AI-powered development assistant
 *
 * @packageDocumentation
 */

// Original exports
export { init } from './commands/init'
export * from './constants'
export * from './plugins'
// Shencha module removed in v2.x cleanup (replaced by doctor command)
// CCJK New Features
export * from './skills'
export * from './subagent-groups'
export * from './types'
// API Router (exclude ApiConfig to avoid conflict)
export {
  displayCurrentStatus,
  runConfigWizard,
} from './utils/api-router'
export * from './utils/auto-config'

// CCJK Utilities
export * from './utils/banner'
export * from './utils/claude-config'
// Multi-Tool Support (Claude Code, Codex, Aider, Continue, Cline, Cursor)
export * from './utils/code-tools'
export * from './utils/config'

export * from './utils/config-consolidator'
// Context Management
export * from './utils/context-manager'
export * from './utils/health-check'
export * from './utils/installer'
export * from './utils/onboarding'
export { cleanupPermissions, mergeAndCleanPermissions } from './utils/permission-cleaner'
export * from './utils/permission-manager'
export { commandExists, getPlatform } from './utils/platform'

export { importRecommendedEnv, importRecommendedPermissions, openSettingsJson } from './utils/simple-config'

export * from './utils/ui'

export * from './utils/upgrade-manager'

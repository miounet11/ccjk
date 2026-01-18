/**
 * Migration types for CCJK v3 to v4 upgrade
 */

import type { ClaudeSettings } from './config'
import type { WorkflowConfig } from './workflow'

/**
 * V3 configuration structure (legacy)
 */
export interface V3Config {
  // V3 settings.json structure
  settings?: {
    model?: string
    env?: Record<string, string>
    permissions?: {
      allow?: string[]
    }
    chat?: {
      alwaysApprove?: string[]
    }
    statusLine?: {
      type: string
      command: string
    }
    outputStyle?: string
  }

  // V3 workflow structure
  workflows?: {
    id: string
    nameKey: string
    category: 'common' | 'plan' | 'sixStep' | 'bmad' | 'git'
  }[]

  // V3 MCP services
  mcpServers?: Record<string, {
    command: string
    args?: string[]
    env?: Record<string, string>
  }>

  // V3 CLI command syntax
  cliCommands?: {
    init?: string
    update?: string
    ccr?: string
  }

  // V3 plugin API
  plugins?: {
    id: string
    version: string
    config?: Record<string, any>
  }[]

  // V3 environment variables
  envVars?: Record<string, string>
}

/**
 * V4 configuration structure (new)
 */
export interface V4Config {
  // V4 settings.json structure
  settings?: ClaudeSettings

  // V4 workflow structure
  workflows?: WorkflowConfig[]

  // V4 MCP services (unchanged)
  mcpServers?: Record<string, {
    command: string
    args?: string[]
    env?: Record<string, string>
  }>

  // V4 CLI command syntax
  cliCommands?: {
    init?: string
    update?: string
    migrate?: string
  }

  // V4 plugin API
  plugins?: {
    id: string
    version: string
    config?: Record<string, any>
  }[]

  // V4 environment variables
  envVars?: Record<string, string>
}

/**
 * Migration result with detailed changes
 */
export interface MigrationResult {
  success: boolean
  backupPath?: string
  changes: MigrationChange[]
  errors?: string[]
  warnings?: string[]
}

/**
 * Individual migration change
 */
export interface MigrationChange {
  type: 'added' | 'modified' | 'removed' | 'renamed'
  category: 'settings' | 'workflow' | 'mcp' | 'cli' | 'plugin' | 'env'
  path: string
  oldValue?: any
  newValue?: any
  description: string
}

/**
 * Migration options
 */
export interface MigrationOptions {
  dryRun?: boolean
  backup?: boolean
  force?: boolean
  skipPrompts?: boolean
  lang?: 'zh-CN' | 'en'
}

/**
 * Breaking changes in v4
 */
export interface BreakingChange {
  id: string
  category: 'settings' | 'workflow' | 'cli' | 'plugin' | 'api'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  migration: string
  affectedUsers: 'all' | 'some' | 'few'
}

/**
 * Migration step
 */
export interface MigrationStep {
  id: string
  name: string
  description: string
  execute: (v3Config: V3Config, options: MigrationOptions) => Promise<MigrationStepResult>
}

/**
 * Migration step result
 */
export interface MigrationStepResult {
  success: boolean
  changes: MigrationChange[]
  errors?: string[]
  warnings?: string[]
}

/**
 * Workflow category mapping from v3 to v4
 */
export const WORKFLOW_CATEGORY_MAPPING: Record<string, string> = {
  common: 'essential',
  plan: 'planning',
  sixStep: 'sixStep',
  bmad: 'development',
  git: 'git',
}

/**
 * CLI command mapping from v3 to v4
 */
export const CLI_COMMAND_MAPPING: Record<string, string> = {
  'ccjk i': 'ccjk init',
  'ccjk u': 'ccjk update',
  'ccjk ccr': 'ccjk ccr',
  'ccjk ccu': 'ccjk ccu',
}

/**
 * Environment variable mapping from v3 to v4
 */
export const ENV_VAR_MAPPING: Record<string, string> = {
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  ANTHROPIC_AUTH_TOKEN: 'ANTHROPIC_AUTH_TOKEN',
  ANTHROPIC_BASE_URL: 'ANTHROPIC_BASE_URL',
}

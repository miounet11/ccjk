/**
 * CCJK Configuration Manager
 *
 * Manages ~/.ccjk/config.toml - the main CCJK preferences file
 * This replaces the functionality from ccjk-config.ts with a cleaner API
 */

import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../../constants'
import type { ClaudeCodeProfile } from '../../types/claude-code-config'
import type { ZcfTomlConfig } from '../../types/toml-config'
import type { CcjkConfig, ClaudeCodeToolConfig, CodexToolConfig, GeneralConfig, PartialCcjkConfig, ToolsConfig } from './types'

import { dirname } from 'pathe'
import { parse, stringify } from 'smol-toml'
import { CCJK_CONFIG_DIR, CCJK_CONFIG_FILE, DEFAULT_CODE_TOOL_TYPE, SUPPORTED_LANGS } from '../../constants'
import { ensureDir, exists, readFile, writeFileAtomic } from '../../utils/fs-operations'

/**
 * Default CCJK configuration version
 */
const DEFAULT_CONFIG_VERSION = '4.0.0'

/**
 * Create default CCJK configuration
 */
export function createDefaultCcjkConfig(
  preferredLang: SupportedLang = 'en',
  claudeCodeInstallType: 'global' | 'local' = 'global',
): CcjkConfig {
  return {
    version: DEFAULT_CONFIG_VERSION,
    lastUpdated: new Date().toISOString(),
    general: {
      preferredLang,
      templateLang: preferredLang,
      aiOutputLang: preferredLang === 'zh-CN' ? 'zh-CN' : undefined,
      currentTool: DEFAULT_CODE_TOOL_TYPE,
    },
    tools: {
      claudeCode: {
        enabled: true,
        installType: claudeCodeInstallType,
        outputStyles: ['speed-coder', 'senior-architect', 'pair-programmer'],
        defaultOutputStyle: 'senior-architect',
        currentProfile: '',
        profiles: {},
      },
      codex: {
        enabled: false,
        systemPromptStyle: 'senior-architect',
      },
    },
  }
}

/**
 * Read CCJK TOML configuration from file
 */
export function readCcjkConfig(configPath: string = CCJK_CONFIG_FILE): CcjkConfig | null {
  try {
    if (!exists(configPath)) {
      return null
    }

    const content = readFile(configPath)
    const parsed = parse(content) as unknown as ZcfTomlConfig

    // Convert legacy ZcfTomlConfig to new CcjkConfig
    return convertTomlToCcjkConfig(parsed)
  }
  catch (error) {
    console.error(`Failed to read CCJK config from ${configPath}:`, error)
    return null
  }
}

/**
 * Write CCJK TOML configuration to file
 */
export function writeCcjkConfig(
  config: CcjkConfig,
  configPath: string = CCJK_CONFIG_FILE,
): void {
  try {
    // Ensure parent directory exists
    const configDir = dirname(configPath)
    ensureDir(configDir)

    // Update timestamp
    config.lastUpdated = new Date().toISOString()

    // Serialize to TOML and write atomically
    const tomlContent = stringify(config as unknown as Record<string, unknown>)
    writeFileAtomic(configPath, tomlContent)
  }
  catch (error) {
    console.error(`Failed to write CCJK config to ${configPath}:`, error)
    throw new Error(`Failed to write CCJK config: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Update CCJK configuration with partial changes
 */
export function updateCcjkConfig(
  updates: PartialCcjkConfig,
  configPath: string = CCJK_CONFIG_FILE,
): CcjkConfig {
  const existingConfig = readCcjkConfig(configPath) || createDefaultCcjkConfig()

  const updatedConfig: CcjkConfig = {
    version: updates.version || existingConfig.version,
    lastUpdated: new Date().toISOString(),
    general: {
      ...existingConfig.general,
      ...updates.general,
    },
    tools: {
      ...existingConfig.tools,
      ...updates.tools,
      claudeCode: {
        ...existingConfig.tools.claudeCode,
        ...updates.tools?.claudeCode,
      },
      codex: {
        ...existingConfig.tools.codex,
        ...updates.tools?.codex,
      },
    },
  }

  writeCcjkConfig(updatedConfig, configPath)
  return updatedConfig
}

/**
 * Get or create CCJK configuration
 */
export function getCcjkConfig(configPath: string = CCJK_CONFIG_FILE): CcjkConfig {
  const config = readCcjkConfig(configPath)
  return config || createDefaultCcjkConfig()
}

/**
 * Validate CCJK configuration
 */
export function validateCcjkConfig(config: unknown): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'] }
  }

  const cfg = config as Partial<CcjkConfig>

  // Validate version
  if (!cfg.version || typeof cfg.version !== 'string') {
    errors.push('Invalid or missing version')
  }

  // Validate general section
  if (!cfg.general || typeof cfg.general !== 'object') {
    errors.push('Invalid or missing general section')
  }
  else {
    if (!cfg.general.preferredLang || !SUPPORTED_LANGS.includes(cfg.general.preferredLang as SupportedLang)) {
      errors.push(`Invalid preferredLang: ${cfg.general.preferredLang}`)
    }
    if (cfg.general.templateLang && !SUPPORTED_LANGS.includes(cfg.general.templateLang as SupportedLang)) {
      errors.push(`Invalid templateLang: ${cfg.general.templateLang}`)
    }
  }

  // Validate tools section
  if (!cfg.tools || typeof cfg.tools !== 'object') {
    errors.push('Invalid or missing tools section')
  }
  else {
    if (!cfg.tools.claudeCode || typeof cfg.tools.claudeCode !== 'object') {
      errors.push('Invalid or missing claudeCode tool config')
    }
    if (!cfg.tools.codex || typeof cfg.tools.codex !== 'object') {
      errors.push('Invalid or missing codex tool config')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Convert legacy ZcfTomlConfig to new CcjkConfig
 */
function convertTomlToCcjkConfig(tomlConfig: ZcfTomlConfig | null): CcjkConfig | null {
  if (!tomlConfig) {
    return null
  }

  return {
    version: tomlConfig.version || DEFAULT_CONFIG_VERSION,
    lastUpdated: tomlConfig.lastUpdated || new Date().toISOString(),
    general: {
      preferredLang: tomlConfig.general?.preferredLang || 'en',
      templateLang: tomlConfig.general?.templateLang,
      aiOutputLang: tomlConfig.general?.aiOutputLang,
      currentTool: tomlConfig.general?.currentTool || DEFAULT_CODE_TOOL_TYPE,
    },
    tools: {
      claudeCode: {
        enabled: tomlConfig.claudeCode?.enabled ?? true,
        installType: tomlConfig.claudeCode?.installType || 'global',
        installMethod: tomlConfig.claudeCode?.installMethod,
        outputStyles: tomlConfig.claudeCode?.outputStyles || [],
        defaultOutputStyle: tomlConfig.claudeCode?.defaultOutputStyle,
        currentProfile: tomlConfig.claudeCode?.currentProfile || '',
        profiles: (tomlConfig.claudeCode?.profiles || {}) as Record<string, ClaudeCodeProfile>,
        version: tomlConfig.claudeCode?.version,
      },
      codex: {
        enabled: tomlConfig.codex?.enabled ?? false,
        systemPromptStyle: tomlConfig.codex?.systemPromptStyle || 'senior-architect',
        installMethod: tomlConfig.codex?.installMethod,
        envKeyMigrated: tomlConfig.codex?.envKeyMigrated,
      },
    },
  }
}

/**
 * Convert new CcjkConfig to legacy ZcfTomlConfig format
 */
export function convertCcjkConfigToToml(ccjkConfig: CcjkConfig): ZcfTomlConfig {
  return {
    version: ccjkConfig.version,
    lastUpdated: ccjkConfig.lastUpdated,
    general: {
      preferredLang: ccjkConfig.general.preferredLang,
      templateLang: ccjkConfig.general.templateLang,
      aiOutputLang: ccjkConfig.general.aiOutputLang,
      currentTool: ccjkConfig.general.currentTool,
    },
    claudeCode: {
      enabled: ccjkConfig.tools.claudeCode.enabled,
      installType: ccjkConfig.tools.claudeCode.installType,
      installMethod: ccjkConfig.tools.claudeCode.installMethod,
      outputStyles: ccjkConfig.tools.claudeCode.outputStyles,
      defaultOutputStyle: ccjkConfig.tools.claudeCode.defaultOutputStyle,
      currentProfile: ccjkConfig.tools.claudeCode.currentProfile,
      profiles: ccjkConfig.tools.claudeCode.profiles as Record<string, ClaudeCodeProfile>,
      version: ccjkConfig.tools.claudeCode.version,
    },
    codex: {
      enabled: ccjkConfig.tools.codex.enabled,
      systemPromptStyle: ccjkConfig.tools.codex.systemPromptStyle,
      installMethod: ccjkConfig.tools.codex.installMethod,
      envKeyMigrated: ccjkConfig.tools.codex.envKeyMigrated,
    },
  }
}

/**
 * Get general configuration values
 */
export function getGeneralConfig(): GeneralConfig {
  const config = getCcjkConfig()
  return config.general
}

/**
 * Update general configuration
 */
export function updateGeneralConfig(updates: Partial<GeneralConfig>): void {
  const config = getCcjkConfig()
  updateCcjkConfig({ general: { ...config.general, ...updates } })
}

/**
 * Get current tool type
 */
export function getCurrentTool(): CodeToolType {
  const config = getCcjkConfig()
  return config.general.currentTool
}

/**
 * Set current tool type
 */
export function setCurrentTool(tool: CodeToolType): void {
  updateGeneralConfig({ currentTool: tool })
}

/**
 * Get preferred language
 */
export function getPreferredLang(): SupportedLang {
  const config = getCcjkConfig()
  return config.general.preferredLang
}

/**
 * Set preferred language
 */
export function setPreferredLang(lang: SupportedLang): void {
  updateGeneralConfig({ preferredLang: lang })
}

/**
 * Get Claude Code tool configuration
 */
export function getClaudeCodeToolConfig(): ClaudeCodeToolConfig {
  const config = getCcjkConfig()
  return config.tools.claudeCode
}

/**
 * Update Claude Code tool configuration
 */
export function updateClaudeCodeToolConfig(updates: Partial<ClaudeCodeToolConfig>): void {
  const existing = getCcjkConfig()
  updateCcjkConfig({
    tools: {
      ...existing.tools,
      claudeCode: {
        ...existing.tools.claudeCode,
        ...updates,
      },
    },
  })
}

/**
 * Get Codex tool configuration
 */
export function getCodexToolConfig(): CodexToolConfig {
  const config = getCcjkConfig()
  return config.tools.codex
}

/**
 * Update Codex tool configuration
 */
export function updateCodexToolConfig(updates: Partial<CodexToolConfig>): void {
  const existing = getCcjkConfig()
  updateCcjkConfig({
    tools: {
      ...existing.tools,
      codex: {
        ...existing.tools.codex,
        ...updates,
      },
    },
  })
}

/**
 * Backup CCJK configuration
 */
export function backupCcjkConfig(configPath: string = CCJK_CONFIG_FILE): string | null {
  const config = readCcjkConfig(configPath)
  if (!config) {
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupPath = `${configPath}.backup.${timestamp}`

  try {
    writeCcjkConfig(config, backupPath)
    return backupPath
  }
  catch {
    return null
  }
}

/**
 * Ensure CCJK config directory exists
 */
export function ensureCcjkConfigDir(): void {
  ensureDir(CCJK_CONFIG_DIR)
}

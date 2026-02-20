import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType as resolveCodeToolTypeAlias, SETTINGS_FILE } from '../constants'
import { getMcpServices, MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { i18n } from '../i18n'
import { displayBanner } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { readMcpConfig } from '../utils/claude-config'
import { runCodexUpdate } from '../utils/code-tools/codex'
import { copyConfigFiles } from '../utils/config'
import {
  displayMigrationResult,
  migrateSettingsForTokenRetrieval,
  needsMigration,
  promptMigration,
} from '../utils/config-migration'
import { updatePromptOnly } from '../utils/config-operations'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { installMcpServices } from '../utils/mcp-installer'
import { resolveAiOutputLanguage } from '../utils/prompts'
import { checkClaudeCodeVersionAndPrompt } from '../utils/version-checker'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'

export interface UpdateOptions {
  configLang?: SupportedLang
  aiOutputLang?: AiOutputLanguage | string
  skipBanner?: boolean
  skipPrompt?: boolean
  codeType?: CodeToolType
}

function resolveCodeToolType(optionValue: unknown, savedValue?: CodeToolType | null): CodeToolType {
  // First try to use the option value (supports short aliases)
  if (optionValue !== undefined) {
    const resolved = resolveCodeToolTypeAlias(optionValue)
    if (resolved !== DEFAULT_CODE_TOOL_TYPE || optionValue === DEFAULT_CODE_TOOL_TYPE) {
      return resolved
    }
  }

  // Fall back to saved value
  if (savedValue && isCodeToolType(savedValue)) {
    return savedValue
  }

  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Check for newly added recommended MCP services not yet installed,
 * and prompt the user to install them.
 */
async function checkAndPromptNewMcpServices(skipPrompt?: boolean): Promise<void> {
  try {
    // Get currently installed MCP servers
    const mcpConfig = readMcpConfig()
    const installedIds = new Set(Object.keys(mcpConfig?.mcpServers || {}))

    // Find defaultSelected services that aren't installed yet
    const newServices = MCP_SERVICE_CONFIGS.filter(
      c => c.defaultSelected && !installedIds.has(c.id),
    )

    if (newServices.length === 0) return

    const allServices = await getMcpServices()
    const newServiceNames = newServices
      .map(c => allServices.find(s => s.id === c.id)?.name || c.id)
      .join(', ')

    console.log(ansis.cyan(`\n✨ New recommended services available: ${ansis.bold(newServiceNames)}`))

    if (skipPrompt) {
      // Auto-install in non-interactive mode
      await installMcpServices(newServices.map(s => s.id))
      console.log(ansis.green('✓ New services installed automatically'))
      return
    }

    const { install } = await inquirer.prompt<{ install: boolean }>([
      {
        type: 'confirm',
        name: 'install',
        message: `Install new recommended MCP services? (${newServiceNames})`,
        default: true,
      },
    ])

    if (install) {
      await installMcpServices(newServices.map(s => s.id))
      console.log(ansis.green('✓ New services installed'))
    }
  }
  catch {
    // Non-fatal — don't block the update flow
  }
}

export async function update(options: UpdateOptions = {}): Promise<void> {
  try {
    // Display banner
    if (!options.skipBanner) {
      displayBanner(i18n.t('cli:banner.updateSubtitle'))
    }

    // Get configuration
    const zcfConfig = readZcfConfig()
    const codeToolType = resolveCodeToolType(options.codeType, zcfConfig?.codeToolType)
    options.codeType = codeToolType

    if (codeToolType === 'codex') {
      await runCodexUpdate()

      const newPreferredLang = options.configLang || zcfConfig?.preferredLang
      if (newPreferredLang) {
        updateZcfConfig({
          version,
          preferredLang: newPreferredLang,
          codeToolType,
        })
      }
      else {
        updateZcfConfig({
          version,
          codeToolType,
        })
      }
      return
    }

    // Use intelligent template language selection
    const { resolveTemplateLanguage } = await import('../utils/prompts')
    const configLang = await resolveTemplateLanguage(
      options.configLang, // Command line option
      zcfConfig,
      options.skipPrompt, // Non-interactive mode flag
    )

    // Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language as SupportedLang, options.aiOutputLang, zcfConfig, options.skipPrompt)

    // Check for problematic config and offer migration
    if (existsSync(SETTINGS_FILE) && needsMigration()) {
      if (options.skipPrompt) {
        // Auto-migrate in non-interactive mode
        console.log(ansis.yellow('\n⚠️  Problematic configuration detected. Auto-fixing...\n'))
        const result = migrateSettingsForTokenRetrieval()
        displayMigrationResult(result)
      }
      else {
        // Interactive migration prompt
        const shouldMigrate = await promptMigration()
        if (shouldMigrate) {
          const result = migrateSettingsForTokenRetrieval()
          displayMigrationResult(result)
        }
      }
    }

    console.log(ansis.green(`\n${i18n.t('configuration:updatingPrompts')}\n`))

    // Auto-fix settings.json validation issues by merging with template
    // This ensures schema-critical fields are correct while preserving user's env vars
    console.log(ansis.dim('✔ Checking and fixing configuration format...\n'))
    copyConfigFiles(false)

    // Execute prompt-only update with AI language
    await updatePromptOnly(aiOutputLang)

    // Select and install workflows
    await selectAndInstallWorkflows(configLang)

    // Check for new recommended MCP services
    await checkAndPromptNewMcpServices(options.skipPrompt)

    // Check for Claude Code updates (update command always checks interactively)
    await checkClaudeCodeVersionAndPrompt(false)

    // Update ccjk config with new version, template language, and AI language preference
    updateZcfConfig({
      version,
      templateLang: configLang, // 保存模板语言选择
      aiOutputLang,
      codeToolType,
    })
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

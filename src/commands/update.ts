import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import ansis from 'ansis'
import { version } from '../../package.json'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType as resolveCodeToolTypeAlias, SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { displayBanner } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
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

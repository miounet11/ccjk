import type { AiOutputLanguage, CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import { version } from '../../package.json'
import { DEFAULT_CODE_TOOL_TYPE, isCodeToolType, resolveCodeToolType as resolveCodeToolTypeAlias } from '../constants'
import { getClaudeFamilyRuntimeLabel } from '../utils/code-tool-labels'
import { isClaudeFamilyCodeTool } from '../utils/runtime-settings'
import { i18n } from '../i18n'
import { displayBanner } from '../utils/banner'
import { runCodexUpdate } from '../utils/code-tools/codex'
import { updatePromptOnly } from '../utils/config-operations'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { resolveAiOutputLanguage } from '../utils/prompts'
import { checkClaudeCodeVersionAndPrompt } from '../utils/version-checker'
import { selectAndInstallWorkflows } from '../utils/workflow-installer'
import { readCcjkConfig, updateCcjkConfig } from '../utils/ccjk-config'

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
    const ccjkConfig = readCcjkConfig()
    const codeToolType = resolveCodeToolType(options.codeType, ccjkConfig?.codeToolType)
    options.codeType = codeToolType

    if (codeToolType === 'codex') {
      await runCodexUpdate()

      const newPreferredLang = options.configLang || ccjkConfig?.preferredLang
      if (newPreferredLang) {
        updateCcjkConfig({
          version,
          preferredLang: newPreferredLang,
          codeToolType,
        })
      }
      else {
        updateCcjkConfig({
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
      ccjkConfig,
      options.skipPrompt, // Non-interactive mode flag
    )

    // Select AI output language
    const aiOutputLang = await resolveAiOutputLanguage(i18n.language as SupportedLang, options.aiOutputLang, ccjkConfig, options.skipPrompt)

    const runtimeLabel = isClaudeFamilyCodeTool(codeToolType)
      ? getClaudeFamilyRuntimeLabel(codeToolType)
      : 'Claude Code'
    console.log(ansis.cyan(`\n${i18n.t('configuration:updatingPrompts', { runtime: runtimeLabel })}\n`))

    await updatePromptOnly(aiOutputLang)

    await selectAndInstallWorkflows(configLang, undefined, { codeToolType: isClaudeFamilyCodeTool(codeToolType) ? codeToolType : 'claude-code' })

    if (codeToolType === 'claude-code') {
      await checkClaudeCodeVersionAndPrompt(false)
    }

    // Update ccjk config with new version, template language, and AI language preference
    updateCcjkConfig({
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

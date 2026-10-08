import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { runDoctorHub } from '../utils/doctor-hub'
import { runOperatorHub } from '../utils/operator-hub'
import { configureCodexApi, manageCodexMcp, runCodexFullInit, runCodexUninstall, runCodexUpdate, runCodexWorkflowImportWithLanguageSelection } from '../utils/code-tools/codex'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import {
  changeScriptLanguageFeature,
  configureAiMemoryFeature,
  configureApiFeature,
  configureCodexAiMemoryFeature,
  configureCodexDefaultModelFeature,
  configureDefaultModelFeature,
  configureEnvPermissionFeature,
  configureMcpFeature,
} from '../utils/features'
import { buildMenuListChoices, getToolMenuLayout, printToolMenuHeader } from '../utils/menu-layout'
import { promptBoolean } from '../utils/toggle-prompt'
import { readCcjkConfig, updateCcjkConfig } from '../utils/ccjk-config'
import { checkUpdates } from './check-updates'
import { init } from './init'
import { uninstall } from './uninstall'
import { update } from './update'
import { grokCommand } from './grok'
import { reasonixCommand } from './reasonix'

import { runOnboardingWizard } from './onboarding-wizard'

type MenuResult = 'exit' | 'switch' | undefined

const CODE_TOOL_LABELS: Record<CodeToolType, string> = {
  'clavue': 'Clavue',
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'grok': 'Grok CLI',
}

function getCurrentCodeTool(): CodeToolType {
  const config = readCcjkConfig()
  if (config?.codeToolType && isCodeToolType(config.codeToolType)) {
    return config.codeToolType
  }
  return DEFAULT_CODE_TOOL_TYPE
}

function printSeparator(): void {
  console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
}

function getCodeToolLabel(codeTool: CodeToolType): string {
  return CODE_TOOL_LABELS[codeTool] || codeTool
}

async function promptCodeToolSelection(current: CodeToolType): Promise<CodeToolType | null> {
  const { addNumbersToChoices } = await import('../utils/prompt-helpers')
  const choices = addNumbersToChoices(Object.entries(CODE_TOOL_LABELS).map(([value, label]) => ({
    name: label,
    value,
    short: label,
  })))

  const { tool } = await inquirer.prompt<{ tool: CodeToolType | '' }>({
    type: 'list',
    name: 'tool',
    message: i18n.t('menu:switchCodeToolPrompt'),
    default: current,
    choices,
  })

  if (!tool) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return null
  }

  return tool
}

async function handleCodeToolSwitch(current: CodeToolType): Promise<boolean> {
  const newTool = await promptCodeToolSelection(current)
  if (!newTool || newTool === current) {
    return false
  }

  updateCcjkConfig({ codeToolType: newTool })
  console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(newTool) })}`))
  return true
}

async function handleClaudeFamilyChoice(
  tool: 'clavue' | 'claude-code',
  choice: string,
): Promise<MenuResult | 'handled'> {
  switch (choice) {
    case '1':
      await init({ skipBanner: true, codeType: tool })
      return 'handled'
    case '2':
      await update({ skipBanner: true, codeType: tool })
      return 'handled'
    case '3':
      await configureApiFeature()
      return 'handled'
    case '4':
      await configureMcpFeature()
      return 'handled'
    case '5':
      await configureDefaultModelFeature()
      return 'handled'
    case '6':
      await configureAiMemoryFeature()
      return 'handled'
    case '7':
      await configureEnvPermissionFeature()
      return 'handled'
    default:
      return undefined as never
  }
}

async function handleCodexChoice(choice: string): Promise<MenuResult | 'handled'> {
  switch (choice) {
    case '1':
      await runCodexFullInit()
      return 'handled'
    case '2':
      await runCodexWorkflowImportWithLanguageSelection()
      return 'handled'
    case '3':
      await configureCodexApi()
      return 'handled'
    case '4':
      await manageCodexMcp()
      return 'handled'
    case '5':
      await configureCodexDefaultModelFeature()
      return 'handled'
    case '6':
      await configureCodexAiMemoryFeature()
      return 'handled'
    default:
      return undefined as never
  }
}

async function handleGrokChoice(choice: string): Promise<MenuResult | 'handled'> {
  switch (choice) {
    case '1': {
      const { configureGrokApi } = await import('../utils/grok-config')
      await configureGrokApi()
      return 'handled'
    }
    case '2':
      await grokCommand()
      return 'handled'
    case '3': {
      const { configureGrokDefaultModel } = await import('../utils/grok-config')
      await configureGrokDefaultModel()
      return 'handled'
    }
    default:
      return undefined as never
  }
}

async function handleHubChoice(
  tool: CodeToolType,
  choice: string,
): Promise<MenuResult | 'handled' | 'continue'> {
  switch (choice) {
    case 'h':
      await runDoctorHub(tool)
      return 'continue'
    case 'w':
      await runOperatorHub(tool)
      return 'handled'
    default:
      return undefined as never
  }
}

async function handleSharedChoice(
  tool: CodeToolType,
  choice: string,
): Promise<MenuResult | 'handled' | 'continue'> {
  switch (choice) {
    case 'g':
      await grokCommand()
      return 'continue'
    case 'x':
      await reasonixCommand()
      return 'continue'
    case 'e': {
      const { listExternalClientsCommand } = await import('./external-clients')
      await listExternalClientsCommand()
      return 'continue'
    }
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      return 'continue'
    }
    case 's': {
      const switched = await handleCodeToolSwitch(tool)
      return switched ? 'switch' : 'continue'
    }
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    default:
      return undefined as never
  }
}

async function handleToolSpecificMaintenance(
  tool: CodeToolType,
  choice: string,
): Promise<MenuResult | 'handled' | 'continue'> {
  if (choice === '-') {
    if (tool === 'codex') {
      await runCodexUninstall()
    }
    else {
      await uninstall()
    }
    return 'continue'
  }

  if (choice === '+') {
    if (tool === 'codex') {
      await runCodexUpdate()
    }
    else {
      await checkUpdates()
    }
    return 'continue'
  }

  return undefined as never
}

async function dispatchMenuChoice(tool: CodeToolType, rawChoice: string): Promise<MenuResult | 'handled' | 'continue'> {
  const choice = rawChoice.toLowerCase()

  const hubResult = ['h', 'w'].includes(choice)
    ? await handleHubChoice(tool, choice)
    : undefined
  if (hubResult)
    return hubResult

  const sharedResult = await handleSharedChoice(tool, choice)
  if (sharedResult)
    return sharedResult

  const maintenanceResult = await handleToolSpecificMaintenance(tool, choice)
  if (maintenanceResult)
    return maintenanceResult

  const layout = getToolMenuLayout(tool)
  if (!layout.operatorLines.some(item => item.key === choice))
    return undefined

  if (tool === 'clavue' || tool === 'claude-code')
    return await handleClaudeFamilyChoice(tool, choice)
  if (tool === 'codex')
    return await handleCodexChoice(choice)
  if (tool === 'grok')
    return await handleGrokChoice(choice)

  return undefined
}

async function showToolMenu(tool: CodeToolType): Promise<MenuResult> {
  printToolMenuHeader(tool)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: i18n.t('menu:selectFunction'),
    choices: buildMenuListChoices(tool),
    pageSize: 20,
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const result = await dispatchMenuChoice(tool, choice)

  if (result === 'exit')
    return 'exit'
  if (result === 'switch')
    return 'switch'
  if (result === 'continue') {
    printSeparator()
    return undefined
  }

  printSeparator()

  const shouldContinue = await promptBoolean({
    message: i18n.t('common:returnToMenu'),
    defaultValue: true,
  })

  if (!shouldContinue) {
    console.log(ansis.cyan(i18n.t('common:goodbye')))
    return 'exit'
  }

  return undefined
}

export async function showMainMenu(options: { codeType?: string, skipOnboarding?: boolean } = {}): Promise<void> {
  try {
    if (!options.skipOnboarding) {
      await runOnboardingWizard({ preferredCodeTool: options.codeType })
    }

    if (options.codeType) {
      try {
        const resolvedType = await resolveCodeType(options.codeType)
        const currentType = getCurrentCodeTool()

        if (resolvedType !== currentType) {
          updateCcjkConfig({ codeToolType: resolvedType })
          console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(resolvedType) })}`))
        }
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(ansis.yellow(errorMessage))
      }
    }

    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

      const result = await showToolMenu(codeTool)

      if (result === 'exit') {
        exitMenu = true
      }
      else if (result === 'switch') {
        continue
      }
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { configureCodexApi, configureCodexMcp, runCodexFullInit, runCodexUninstall, runCodexUpdate, runCodexWorkflowImportWithLanguageSelection } from '../utils/code-tools/codex'
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
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { promptBoolean } from '../utils/toggle-prompt'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../utils/tools'
import { readCcjkConfig, updateCcjkConfig } from '../utils/ccjk-config'
import { checkUpdates } from './check-updates'
import { init } from './init'
import { uninstall } from './uninstall'
import { update } from './update'
import { grokCommand } from './grok'
import { reasonixCommand } from './reasonix'
import { probeCommand } from './probe'
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

function printOtherToolsSection(): void {
  console.log(`  --------- ${i18n.t('menu:menuSections.otherTools')} ----------`)
  console.log(
    `  ${ansis.cyan('R.')} ${i18n.t('menu:menuOptions.ccrManagement')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccrManagement')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('U.')} ${i18n.t('menu:menuOptions.ccusage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccusage')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('L.')} ${i18n.t('menu:menuOptions.cometixLine')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.cometixLine')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('P.')} Probe API ${ansis.gray('- HTTP 探活当前配置')}`,
  )
  console.log(
    `  ${ansis.cyan('G.')} Grok CLI ${ansis.gray('- 状态 / 启动指引')}`,
  )
  console.log(
    `  ${ansis.cyan('X.')} Reasonix ${ansis.gray('- DeepSeek agent 状态 / 启动指引')}`,
  )
  console.log('')
}

function printCcjkSection(options: {
  uninstallOption: string
  uninstallDescription: string
  updateOption: string
  updateDescription: string
}): void {
  console.log('  ------------ CCJK ------------')
  console.log(
    `  ${ansis.cyan('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('S.')} ${i18n.t('menu:menuOptions.switchCodeTool')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.switchCodeTool')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('-.')} ${options.uninstallOption} ${ansis.gray(`- ${options.uninstallDescription}`)}`,
  )
  console.log(
    `  ${ansis.cyan('+.')} ${options.updateOption} ${ansis.gray(`- ${options.updateDescription}`)}`,
  )
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')
}

async function showClaudeCodeMenu(currentTool: CodeToolType): Promise<MenuResult> {
  const sectionTitle = currentTool === 'clavue' ? 'Clavue' : 'Claude Code'
  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log(`  -------- ${sectionTitle} --------`)
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.fullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.fullInit')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('menu:menuOptions.importWorkflow')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.importWorkflow')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('3.')} ${i18n.t('menu:menuOptions.configureApiOrCcr')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureApiOrCcr')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('4.')} ${i18n.t('menu:menuOptions.configureMcp')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureMcp')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('5.')} ${i18n.t('menu:menuOptions.configureModel')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureModel')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('6.')} ${i18n.t('menu:menuOptions.configureAiMemory')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureAiMemory')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('7.')} ${i18n.t('menu:menuOptions.configureEnvPermission')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureEnvPermission')}`)}`,
  )
  console.log('')
  printOtherToolsSection()
  printCcjkSection({
    uninstallOption: i18n.t('menu:menuOptions.uninstall'),
    uninstallDescription: i18n.t('menu:menuDescriptions.uninstall'),
    updateOption: i18n.t('menu:menuOptions.checkUpdates'),
    updateDescription: i18n.t('menu:menuDescriptions.checkUpdates'),
  })

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '6', '7', 'r', 'R', 'u', 'U', 'l', 'L', 'p', 'P', 'g', 'G', '0', '-', '+', 's', 'S', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    case '1':
      await init({ skipBanner: true })
      break
    case '2':
      await update({ skipBanner: true })
      break
    case '3':
      await configureApiFeature()
      break
    case '4':
      await configureMcpFeature()
      break
    case '5':
      await configureDefaultModelFeature()
      break
    case '6':
      await configureAiMemoryFeature()
      break
    case '7':
      await configureEnvPermissionFeature()
      break
    case 'r':
      await runCcrMenuFeature()
      printSeparator()
      return undefined
    case 'u':
      await runCcusageFeature()
      printSeparator()
      return undefined
    case 'l':
      await runCometixMenuFeature()
      printSeparator()
      return undefined
    case 'p':
      await probeCommand()
      printSeparator()
      return undefined
    case 'g':
      await grokCommand()
      printSeparator()
      return undefined
    case 'x':
      await reasonixCommand()
      printSeparator()
      return undefined
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }
    case '-':
      await uninstall()
      printSeparator()
      return undefined
    case '+':
      await checkUpdates()
      printSeparator()
      return undefined
    case 's': {
      const switched = await handleCodeToolSwitch(currentTool)
      if (switched) {
        return 'switch'
      }
      printSeparator()
      return undefined
    }
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    default:
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

async function showCodexMenu(): Promise<MenuResult> {
  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log('  -------- Codex --------')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.codexFullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexFullInit')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('menu:menuOptions.codexImportWorkflow')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexImportWorkflow')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('3.')} ${i18n.t('menu:menuOptions.codexConfigureApi')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureApi')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('4.')} ${i18n.t('menu:menuOptions.codexConfigureMcp')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureMcp')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('5.')} ${i18n.t('menu:menuOptions.codexConfigureModel')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureModel')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('6.')} ${i18n.t('menu:menuOptions.codexConfigureAiMemory')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureAiMemory')}`)}`,
  )
  console.log('')
  printCcjkSection({
    uninstallOption: i18n.t('menu:menuOptions.codexUninstall'),
    uninstallDescription: i18n.t('menu:menuDescriptions.codexUninstall'),
    updateOption: i18n.t('menu:menuOptions.codexCheckUpdates'),
    updateDescription: i18n.t('menu:menuDescriptions.codexCheckUpdates'),
  })

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '6', '0', '-', '+', 's', 'S', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    case '1':
      await runCodexFullInit()
      break
    case '2':
      await runCodexWorkflowImportWithLanguageSelection()
      break
    case '3':
      await configureCodexApi()
      break
    case '4':
      await configureCodexMcp()
      break
    case '5':
      await configureCodexDefaultModelFeature()
      break
    case '6':
      await configureCodexAiMemoryFeature()
      break
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }
    case '-':
      await runCodexUninstall()
      printSeparator()
      return undefined
    case '+':
      await runCodexUpdate()
      printSeparator()
      return undefined
    case 's': {
      const switched = await handleCodeToolSwitch('codex')
      if (switched) {
        return 'switch'
      }
      printSeparator()
      return undefined
    }
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    default:
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

async function showGrokMenu(): Promise<MenuResult> {
  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log('  -------- Grok CLI --------')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.grokInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.grokInit')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('menu:menuOptions.grokStatus')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.grokStatus')}`)}`,
  )
  console.log('')
  printOtherToolsSection()
  printCcjkSection({
    uninstallOption: i18n.t('menu:menuOptions.uninstall'),
    uninstallDescription: i18n.t('menu:menuDescriptions.uninstall'),
    updateOption: i18n.t('menu:menuOptions.checkUpdates'),
    updateDescription: i18n.t('menu:menuDescriptions.checkUpdates'),
  })

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', 'r', 'R', 'u', 'U', 'l', 'L', 'p', 'P', 'g', 'G', 'x', 'X', '0', '-', '+', 's', 'S', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    case '1':
      await init({ skipBanner: true, codeType: 'grok' })
      break
    case '2':
      await grokCommand()
      break
    case 'r':
      await runCcrMenuFeature()
      printSeparator()
      return undefined
    case 'u':
      await runCcusageFeature()
      printSeparator()
      return undefined
    case 'l':
      await runCometixMenuFeature()
      printSeparator()
      return undefined
    case 'p':
      await probeCommand()
      printSeparator()
      return undefined
    case 'g':
      await grokCommand()
      printSeparator()
      return undefined
    case 'x':
      await reasonixCommand()
      printSeparator()
      return undefined
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }
    case '-':
      await uninstall()
      printSeparator()
      return undefined
    case '+':
      await checkUpdates()
      printSeparator()
      return undefined
    case 's': {
      const switched = await handleCodeToolSwitch('grok')
      if (switched) {
        return 'switch'
      }
      printSeparator()
      return undefined
    }
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    default:
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

    // Handle code type parameter if provided
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

    // Menu loop
    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

      const result = codeTool === 'codex'
        ? await showCodexMenu()
        : codeTool === 'grok'
          ? await showGrokMenu()
          : await showClaudeCodeMenu(codeTool)

      if (result === 'exit') {
        exitMenu = true
      }
      else if (result === 'switch') {
        // Loop will read updated config and refresh banner
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

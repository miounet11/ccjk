import type { CodeToolType } from '../constants'
import type { CodexSetupPresetId } from '../config/codex-presets'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { TOOL_MATRIX } from '../config/tool-matrix'
import { ensureI18nInitialized, i18n } from '../i18n'
import { cleanCommand } from '../commands/clean'
import { init } from '../commands/init'
import { update } from '../commands/update'
import { grokCommand } from '../commands/grok'
import {
  configureAiMemoryFeature,
  configureApiFeature,
  configureCodexAiMemoryFeature,
  configureCodexDefaultModelFeature,
  configureDefaultModelFeature,
  configureEnvPermissionFeature,
  configureMcpFeature,
} from './features'
import {
  configureCodexApi,
  manageCodexMcp,
  runCodexFullInit,
  runCodexWorkflowImportWithLanguageSelection,
} from './code-tools/codex'
import { printCodexReloadHint } from './codex-runtime'
import { addNumbersToChoices } from './prompt-helpers'
import { getToolMenuLayout } from './menu-layout'

async function finishCodexOperatorAction(): Promise<void> {
  printCodexReloadHint()
}

async function promptTuneSingle(tool: CodeToolType): Promise<void> {
  const layout = getToolMenuLayout(tool)
  const tuneLines = layout.operatorLines.filter(line => !['1', '2'].includes(line.key))

  const { picked } = await inquirer.prompt<{ picked: string }>({
    type: 'list',
    name: 'picked',
    message: i18n.t('hub:operator.pickTune'),
    choices: addNumbersToChoices(tuneLines.map(line => ({
      name: `${i18n.t(line.labelKey)} — ${ansis.gray(i18n.t(line.descKey))}`,
      value: line.key,
      short: i18n.t(line.labelKey),
    }))),
  })

  if (tool === 'codex') {
    switch (picked) {
      case '3': await configureCodexApi(); break
      case '4': await manageCodexMcp(); break
      case '5': await configureCodexDefaultModelFeature(); break
      case '6': await configureCodexAiMemoryFeature(); break
    }
    await finishCodexOperatorAction()
    return
  }

  if (tool === 'clavue' || tool === 'claude-code') {
    switch (picked) {
      case '3': await configureApiFeature(); break
      case '4': await configureMcpFeature(); break
      case '5': await configureDefaultModelFeature(); break
      case '6': await configureAiMemoryFeature(); break
      case '7': await configureEnvPermissionFeature(); break
    }
  }
}

async function runCodexFreshStart(): Promise<void> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>({
    type: 'confirm',
    name: 'confirmed',
    message: i18n.t('hub:operator.freshStartConfirm'),
    default: false,
  })
  if (!confirmed) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  await cleanCommand({ codeType: 'codex', purgeAll: true, skipPrompt: true })

  const { applyCodexSetupPreset, getCodexPresetChoices } = await import('../config/codex-presets')
  const { preset } = await inquirer.prompt<{ preset: CodexSetupPresetId }>({
    type: 'list',
    name: 'preset',
    message: i18n.t('codex:preset.selectPrompt'),
    choices: addNumbersToChoices(
      getCodexPresetChoices()
        .filter(choice => choice.id !== 'custom')
        .map(choice => ({
          name: `${choice.name} — ${ansis.gray(choice.description)}`,
          value: choice.id,
          short: choice.name,
        })),
    ),
    default: 'optimized',
  })

  const presetOptions = applyCodexSetupPreset(preset, { setupPreset: preset, skipPrompt: true })
  await runCodexFullInit(presetOptions)
  await finishCodexOperatorAction()
}

async function runCodexOperatorHub(): Promise<void> {
  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: i18n.t('menu:selectFunction'),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('hub:operator.fullInit')} — ${ansis.gray(i18n.t('menu:menuDescriptions.codexFullInitWithPreset'))}`,
        value: 'init',
      },
      {
        name: i18n.t('hub:operator.updateWorkflow'),
        value: 'workflow',
      },
      {
        name: `${i18n.t('hub:operator.tuneSingle')} — ${ansis.gray(i18n.t('hub:operator.tuneSingleDesc'))}`,
        value: 'tune',
      },
      {
        name: `${i18n.t('hub:operator.freshStart')} — ${ansis.gray(i18n.t('hub:operator.freshStartDesc'))}`,
        value: 'fresh',
      },
      { name: i18n.t('common:back'), value: 'back' },
    ]),
  })

  switch (action) {
    case 'init':
      await runCodexFullInit()
      await finishCodexOperatorAction()
      break
    case 'workflow':
      await runCodexWorkflowImportWithLanguageSelection()
      await finishCodexOperatorAction()
      break
    case 'tune':
      await promptTuneSingle('codex')
      break
    case 'fresh':
      await runCodexFreshStart()
      break
    default:
      break
  }
}

async function runClaudeFamilyOperatorHub(tool: 'clavue' | 'claude-code'): Promise<void> {
  const initDesc = tool === 'clavue'
    ? i18n.t('menu:menuDescriptions.clavueFullInit')
    : i18n.t('menu:menuDescriptions.fullInit')

  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: i18n.t('menu:selectFunction'),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('hub:operator.fullInit')} — ${ansis.gray(initDesc)}`,
        value: 'init',
      },
      {
        name: i18n.t('hub:operator.updateWorkflow'),
        value: 'workflow',
      },
      {
        name: `${i18n.t('hub:operator.tuneSingle')} — ${ansis.gray(i18n.t('hub:operator.tuneSingleDesc'))}`,
        value: 'tune',
      },
      { name: i18n.t('common:back'), value: 'back' },
    ]),
  })

  switch (action) {
    case 'init':
      await init({ skipBanner: true, codeType: tool })
      break
    case 'workflow':
      await update({ skipBanner: true, codeType: tool })
      break
    case 'tune':
      await promptTuneSingle(tool)
      break
    default:
      break
  }
}

async function runGrokOperatorHub(): Promise<void> {
  const { action } = await inquirer.prompt<{ action: string }>({
    type: 'list',
    name: 'action',
    message: i18n.t('menu:selectFunction'),
    choices: addNumbersToChoices([
      {
        name: `${i18n.t('hub:operator.grokProfile')} — ${ansis.gray(i18n.t('menu:menuDescriptions.grokInit'))}`,
        value: 'profile',
      },
      {
        name: `${i18n.t('hub:operator.grokLaunch')} — ${ansis.gray(i18n.t('menu:menuDescriptions.grokStatus'))}`,
        value: 'launch',
      },
      { name: i18n.t('common:back'), value: 'back' },
    ]),
  })

  switch (action) {
    case 'profile':
      await init({ skipBanner: true, codeType: 'grok' })
      break
    case 'launch':
      await grokCommand()
      break
    default:
      break
  }
}

export async function runOperatorHub(tool: CodeToolType): Promise<void> {
  ensureI18nInitialized()

  console.log(ansis.cyan(`\n${i18n.t('hub:operator.title')}`))
  console.log(ansis.gray(`  ${i18n.t('hub:operator.subtitle')}`))
  console.log(ansis.dim(`  ${TOOL_MATRIX[tool].displayName}\n`))

  if (tool === 'codex')
    return runCodexOperatorHub()
  if (tool === 'grok')
    return runGrokOperatorHub()
  return runClaudeFamilyOperatorHub(tool)
}

export function toolSupportsOperatorHub(tool: CodeToolType): boolean {
  return TOOL_MATRIX[tool].capabilities.fullInit
}
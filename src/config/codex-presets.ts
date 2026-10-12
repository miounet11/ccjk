import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../i18n'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { CODEX_WORKFLOW_CONFIG_BASE } from './codex-workflows'

export interface CodexPresetInitOptions {
  setupPreset?: CodexSetupPresetId
  systemPromptStyle?: string
  skipWorkflowInstall?: boolean
  skipAgentsLanguageDirective?: boolean
  mcpServices?: string[] | false
  workflows?: string[]
  skipPrompt?: boolean
}

export type CodexSetupPresetId = 'clean' | 'optimized' | 'custom'

export interface CodexSetupPresetDefinition {
  id: CodexSetupPresetId
  systemPromptStyle: 'none' | string
  skipWorkflowInstall: boolean
  skipAgentsLanguageDirective: boolean
  mcpServices: string[] | false
  workflowNames?: string[]
}

/** Optimized preset: one docs MCP only (OpenAI: add tools when they unlock a real workflow). */
export const OPTIMIZED_MCP_SERVICES = ['context7'] as const

export const CODEX_SETUP_PRESETS: Record<Exclude<CodexSetupPresetId, 'custom'>, CodexSetupPresetDefinition> = {
  clean: {
    id: 'clean',
    systemPromptStyle: 'none',
    skipWorkflowInstall: true,
    skipAgentsLanguageDirective: true,
    mcpServices: false,
  },
  optimized: {
    id: 'optimized',
    systemPromptStyle: 'agents-md-baseline',
    skipWorkflowInstall: false,
    skipAgentsLanguageDirective: false,
    mcpServices: [...OPTIMIZED_MCP_SERVICES],
    workflowNames: undefined,
  },
}

export function getDefaultCodexWorkflowNames(): string[] {
  ensureI18nInitialized()
  return CODEX_WORKFLOW_CONFIG_BASE
    .filter(config => config.defaultSelected)
    .map(config => i18n.t(`workflow:workflowOption.${config.id}`))
}

export function applyCodexSetupPreset(
  presetId: CodexSetupPresetId,
  options: CodexPresetInitOptions = {},
): CodexPresetInitOptions {
  if (presetId === 'custom')
    return { ...options, setupPreset: 'custom' }

  const preset = CODEX_SETUP_PRESETS[presetId]
  const workflowNames = preset.workflowNames ?? getDefaultCodexWorkflowNames()

  return {
    ...options,
    setupPreset: presetId,
    systemPromptStyle: preset.systemPromptStyle,
    skipWorkflowInstall: preset.skipWorkflowInstall,
    skipAgentsLanguageDirective: preset.skipAgentsLanguageDirective,
    mcpServices: preset.mcpServices,
    workflows: preset.skipWorkflowInstall ? [] : workflowNames,
    skipPrompt: options.skipPrompt ?? false,
  }
}

export function getCodexPresetChoices(): Array<{
  id: CodexSetupPresetId
  name: string
  description: string
}> {
  ensureI18nInitialized()
  return [
    {
      id: 'clean',
      name: i18n.t('codex:preset.clean.name'),
      description: i18n.t('codex:preset.clean.description'),
    },
    {
      id: 'optimized',
      name: i18n.t('codex:preset.optimized.name'),
      description: i18n.t('codex:preset.optimized.description'),
    },
    {
      id: 'custom',
      name: i18n.t('codex:preset.custom.name'),
      description: i18n.t('codex:preset.custom.description'),
    },
  ]
}

export async function promptCodexSetupPreset(): Promise<CodexSetupPresetId | null> {
  ensureI18nInitialized()

  console.log(ansis.dim(`\n  ${i18n.t('codex:preset.intro')}\n`))

  const { preset } = await inquirer.prompt<{ preset: CodexSetupPresetId }>({
    type: 'list',
    name: 'preset',
    message: i18n.t('codex:preset.selectPrompt'),
    choices: addNumbersToChoices(getCodexPresetChoices().map(choice => ({
      name: `${choice.name} - ${ansis.gray(choice.description)}`,
      value: choice.id,
      short: choice.name,
    }))),
    default: 'optimized',
  })

  return preset ?? null
}
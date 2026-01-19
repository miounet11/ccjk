import type { SupportedLang } from '../constants'
import type { WorkflowConfig, WorkflowInstallResult, WorkflowTag, WorkflowType } from '../types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { getOrderedWorkflows, getTagLabel, getWorkflowConfig } from '../config/workflows'
import { CLAUDE_DIR } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'

function getRootDir(): string {
  const currentFilePath = fileURLToPath(import.meta.url)
  const distDir = dirname(dirname(currentFilePath))
  return dirname(distDir)
}

const DEFAULT_CODE_TOOL_TEMPLATE = 'claude-code'

// Categories that use shared templates from common directory
const COMMON_TEMPLATE_CATEGORIES = ['git', 'sixStep']

// Format tags for display with colors
function formatTags(tags: WorkflowTag[]): string {
  const tagColors: Record<WorkflowTag, (text: string) => string> = {
    recommended: text => ansis.bgGreen.black(` ${text} `),
    popular: text => ansis.bgYellow.black(` ${text} `),
    new: text => ansis.bgCyan.black(` ${text} `),
    essential: text => ansis.bgBlue.white(` ${text} `),
    professional: text => ansis.bgMagenta.white(` ${text} `),
  }

  return tags
    .map(tag => tagColors[tag](getTagLabel(tag)))
    .join(' ')
}

// Build rich choice display for workflow selection
function buildWorkflowChoice(workflow: WorkflowConfig): { name: string, value: string, checked: boolean } {
  const tags = formatTags(workflow.metadata.tags)
  const stats = workflow.stats ? ansis.dim(workflow.stats) : ''
  const description = workflow.description ? ansis.gray(workflow.description) : ''

  // Build multi-line display
  const nameLine = `${workflow.name} ${tags}`
  const detailLine = stats ? `     ${stats}` : ''
  const descLine = description ? `     ${description}` : ''

  const displayName = [nameLine, detailLine, descLine].filter(Boolean).join('\n')

  return {
    name: displayName,
    value: workflow.id,
    checked: workflow.defaultSelected,
  }
}

export async function selectAndInstallWorkflows(
  configLang: SupportedLang,
  preselectedWorkflows?: string[],
): Promise<void> {
  ensureI18nInitialized()
  const workflows = getOrderedWorkflows()

  // Build rich choices from configuration
  const choices = workflows.map(workflow => buildWorkflowChoice(workflow))

  // Multi-select workflow types or use preselected
  let selectedWorkflows: WorkflowType[]

  if (preselectedWorkflows) {
    selectedWorkflows = preselectedWorkflows as WorkflowType[]
  }
  else {
    // Print header
    console.log('')
    console.log(ansis.bold.cyan('━'.repeat(60)))
    console.log(ansis.bold.white(`  🚀 ${i18n.t('workflow:selectWorkflowType')}`))
    console.log(ansis.bold.cyan('━'.repeat(60)))
    console.log('')

    const response = await inquirer.prompt<{ selectedWorkflows: WorkflowType[] }>({
      type: 'checkbox',
      name: 'selectedWorkflows',
      message: i18n.t('common:multiSelectHint'),
      choices,
      pageSize: 15,
    })
    selectedWorkflows = response.selectedWorkflows
  }

  if (!selectedWorkflows || selectedWorkflows.length === 0) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  // Clean up old version files before installation
  await cleanupOldVersionFiles()

  // Install selected workflows with their dependencies
  for (const workflowId of selectedWorkflows) {
    const config = getWorkflowConfig(workflowId)
    if (config) {
      await installWorkflowWithDependencies(config, configLang)
    }
  }
}

async function installWorkflowWithDependencies(
  config: WorkflowConfig,
  configLang: SupportedLang,
): Promise<WorkflowInstallResult> {
  const rootDir = getRootDir()
  ensureI18nInitialized()
  const result: WorkflowInstallResult = {
    workflow: config.id,
    success: true,
    installedCommands: [],
    installedAgents: [],
    errors: [],
  }

  // Create static workflow option keys for i18n-ally compatibility
  const WORKFLOW_OPTION_KEYS = {
    essentialTools: i18n.t('workflow:workflowOption.essentialTools'),
    sixStepsWorkflow: i18n.t('workflow:workflowOption.sixStepsWorkflow'),
    gitWorkflow: i18n.t('workflow:workflowOption.gitWorkflow'),
    interviewWorkflow: i18n.t('workflow:workflowOption.interviewWorkflow'),
  } as const

  const workflowName = WORKFLOW_OPTION_KEYS[config.id as keyof typeof WORKFLOW_OPTION_KEYS] || config.id
  console.log(ansis.green(`\n📦 ${i18n.t('workflow:installingWorkflow')}: ${workflowName}...`))

  // Install commands to new structure
  const commandsDir = join(CLAUDE_DIR, 'commands', 'ccjk')
  if (!existsSync(commandsDir)) {
    await mkdir(commandsDir, { recursive: true })
  }

  for (const commandFile of config.commands) {
    // Shared workflows (git, sixStep) use templates from common directory
    const isCommonTemplate = COMMON_TEMPLATE_CATEGORIES.includes(config.category)
    const commandSource = isCommonTemplate
      ? join(
          rootDir,
          'templates',
          'common',
          'workflow',
          config.category,
          configLang,
          commandFile,
        )
      : join(
          rootDir,
          'templates',
          DEFAULT_CODE_TOOL_TEMPLATE,
          configLang,
          'workflow',
          config.category,
          'commands',
          commandFile,
        )
    // Keep original file names for all commands
    const destFileName = commandFile
    const commandDest = join(commandsDir, destFileName)

    if (existsSync(commandSource)) {
      try {
        await copyFile(commandSource, commandDest)
        result.installedCommands.push(destFileName)
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedCommand')}: ccjk/${destFileName}`))
      }
      catch (error) {
        const errorMsg = `${i18n.t('workflow:failedToInstallCommand')} ${commandFile}: ${error}`
        result.errors?.push(errorMsg)
        console.error(ansis.red(`  ✗ ${errorMsg}`))
        result.success = false
      }
    }
  }

  // Install agents if autoInstallAgents is true
  if (config.autoInstallAgents && config.agents.length > 0) {
    const agentsCategoryDir = join(CLAUDE_DIR, 'agents', 'ccjk', config.category)
    if (!existsSync(agentsCategoryDir)) {
      await mkdir(agentsCategoryDir, { recursive: true })
    }

    for (const agent of config.agents) {
      const agentSource = join(
        rootDir,
        'templates',
        DEFAULT_CODE_TOOL_TEMPLATE,
        configLang,
        'workflow',
        config.category,
        'agents',
        agent.filename,
      )
      const agentDest = join(agentsCategoryDir, agent.filename)

      if (existsSync(agentSource)) {
        try {
          await copyFile(agentSource, agentDest)
          result.installedAgents.push(agent.filename)
          console.log(ansis.gray(`  ✔ ${i18n.t('workflow:installedAgent')}: ccjk/${config.category}/${agent.filename}`))
        }
        catch (error) {
          const errorMsg = `${i18n.t('workflow:failedToInstallAgent')} ${agent.filename}: ${error}`
          result.errors?.push(errorMsg)
          console.error(ansis.red(`  ✗ ${errorMsg}`))
          if (agent.required) {
            result.success = false
          }
        }
      }
    }
  }

  if (result.success) {
    console.log(ansis.green(`✔ ${workflowName} ${i18n.t('workflow:workflowInstallSuccess')}`))
  }
  else {
    console.log(ansis.red(`✗ ${workflowName} ${i18n.t('workflow:workflowInstallError')}`))
  }

  return result
}

async function cleanupOldVersionFiles(): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.green(`\n🧹 ${i18n.t('workflow:cleaningOldFiles')}...`))

  // Old command files to remove
  const oldCommandFiles = [
    join(CLAUDE_DIR, 'commands', 'workflow.md'),
    join(CLAUDE_DIR, 'commands', 'feat.md'),
  ]

  // Old agent files to remove
  const oldAgentFiles = [
    join(CLAUDE_DIR, 'agents', 'planner.md'),
    join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md'),
  ]

  // Clean up old command files
  for (const file of oldCommandFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true })
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedOldFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
      catch {
        console.error(ansis.yellow(`  ⚠ ${i18n.t('errors:failedToRemoveFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
    }
  }

  // Clean up old agent files
  for (const file of oldAgentFiles) {
    if (existsSync(file)) {
      try {
        await rm(file, { force: true })
        console.log(ansis.gray(`  ✔ ${i18n.t('workflow:removedOldFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
      catch {
        console.error(ansis.yellow(`  ⚠ ${i18n.t('errors:failedToRemoveFile')}: ${file.replace(CLAUDE_DIR, '~/.claude')}`))
      }
    }
  }
}

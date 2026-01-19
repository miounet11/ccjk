/**
 * Agents Sync CLI Commands
 *
 * Provides CLI interface for managing AI agent definitions:
 * - List installed agents
 * - Search agents in cloud
 * - Install agents from cloud or templates
 * - Uninstall agents
 * - Sync agents with cloud
 * - Create agents from templates
 * - Export/import agents
 * - Manage agent templates
 *
 * @module commands/agents-sync
 */

import type { CAC } from 'cac'
import type { AgentTemplate, CloudAgent, InstalledAgent } from '../types/agent.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { i18n } from '../i18n/index.js'
import {
  checkAgentUpdates,
  createAgentFromTemplate,
  exportAgent,
  getAgentsClient,
  getAgentTemplates,
  importAgent,
  installAgent,
  listLocalAgents,
  searchAgents,
  syncAgents,
  uninstallAgent,
} from '../services/cloud/agents-sync.js'

// ============================================================================
// Types
// ============================================================================

interface AgentsSyncOptions {
  lang?: string
  category?: string
  limit?: number
  json?: boolean
  force?: boolean
  dryRun?: boolean
  direction?: 'push' | 'pull' | 'both'
  format?: 'json' | 'yaml' | 'markdown'
  output?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get description in current language
 */
function getDescription(descriptions: Record<string, string>): string {
  const lang = i18n.language as 'en' | 'zh-CN'
  return descriptions[lang] || descriptions.en || Object.values(descriptions)[0]
}

/**
 * Format agent for display
 */
function formatAgent(agent: CloudAgent | InstalledAgent, index?: number): string {
  const agentData = 'agent' in agent ? agent.agent : agent
  const isInstalled = 'agent' in agent

  const installedMark = isInstalled ? ansis.green('✓') : ansis.gray('○')
  const indexStr = index !== undefined ? ansis.green(`${index + 1}.`) : ''

  const lines = [
    `${indexStr} ${installedMark} ${ansis.bold(agentData.name)} ${ansis.gray(`v${agentData.version}`)}`,
    `   ${getDescription(agentData.metadata.description)}`,
    `   ${ansis.gray(i18n.t('agents:info.category'))}: ${agentData.metadata.category} | ${ansis.gray(i18n.t('agents:info.author'))}: ${agentData.metadata.author}`,
  ]

  if (agentData.metadata.rating > 0) {
    lines.push(`   ${ansis.gray(i18n.t('agents:info.rating'))}: ${'★'.repeat(Math.round(agentData.metadata.rating))}${ansis.gray('☆'.repeat(5 - Math.round(agentData.metadata.rating)))} (${agentData.metadata.rating})`)
  }

  return lines.join('\n')
}

/**
 * Format template for display
 */
function formatTemplate(template: AgentTemplate, index?: number): string {
  const indexStr = index !== undefined ? ansis.green(`${index + 1}.`) : ''

  const lines = [
    `${indexStr} ${ansis.bold(template.name)} ${ansis.gray(`v${template.version}`)}`,
    `   ${getDescription(template.description)}`,
    `   ${ansis.gray(i18n.t('agents:info.category'))}: ${template.category} | ${ansis.gray(i18n.t('agents:info.author'))}: ${template.author}`,
    `   ${ansis.gray(i18n.t('agents:templates.variables'))}: ${template.variables.length}`,
  ]

  return lines.join('\n')
}

/**
 * Display agents in a formatted list
 */
function displayAgents(agents: (CloudAgent | InstalledAgent)[], title?: string): void {
  if (title) {
    console.log(ansis.green.bold(`\n${title}\n`))
  }

  if (agents.length === 0) {
    console.log(ansis.yellow(i18n.t('agents:noResults')))
    return
  }

  agents.forEach((agent, index) => {
    console.log(formatAgent(agent, index))
    console.log()
  })
}

/**
 * Display templates in a formatted list
 */
function displayTemplates(templates: AgentTemplate[], title?: string): void {
  if (title) {
    console.log(ansis.green.bold(`\n${title}\n`))
  }

  if (templates.length === 0) {
    console.log(ansis.yellow(i18n.t('agents:templates.noTemplates')))
    return
  }

  templates.forEach((template, index) => {
    console.log(formatTemplate(template, index))
    console.log()
  })
}

// ============================================================================
// Command Implementations
// ============================================================================

/**
 * List installed agents
 */
async function listCommand(options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:list.loading')).start()

  try {
    const agents = await listLocalAgents()

    spinner.succeed(i18n.t('agents:list.success', { count: agents.length }))

    if (options.json) {
      console.log(JSON.stringify(agents, null, 2))
      return
    }

    if (options.category) {
      const filtered = agents.filter(a => a.agent.metadata.category === options.category)
      displayAgents(filtered, i18n.t('agents:list.titleFiltered', { category: options.category }))
    }
    else {
      displayAgents(agents, i18n.t('agents:list.title'))
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:list.failed'))
    throw error
  }
}

/**
 * Search agents in cloud
 */
async function searchCommand(query: string, options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:search.searching', { query })).start()

  try {
    const result = await searchAgents({
      query,
      category: options.category as any,
      limit: options.limit || 10,
      lang: options.lang as any,
    })

    spinner.succeed(i18n.t('agents:search.found', { count: result.total, query }))

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    displayAgents(result.agents, i18n.t('agents:search.results'))
  }
  catch (error) {
    spinner.fail(i18n.t('agents:search.failed'))
    throw error
  }
}

/**
 * Install an agent
 */
async function installCommand(agentId: string, options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:install.installing', { id: agentId })).start()

  try {
    // First, try to find the agent in cloud
    const searchResult = await searchAgents({ query: agentId, limit: 1 })

    if (searchResult.agents.length === 0) {
      spinner.fail(i18n.t('agents:install.notFound', { id: agentId }))
      return
    }

    const agent = searchResult.agents[0]

    if (options.dryRun) {
      spinner.info(i18n.t('agents:install.dryRun'))
      console.log(formatAgent(agent))
      return
    }

    const result = await installAgent(agent, {
      force: options.force,
      lang: options.lang as any,
    })

    if (result.success) {
      if (result.alreadyInstalled) {
        spinner.info(i18n.t('agents:install.alreadyInstalled', { name: agent.name }))
      }
      else {
        spinner.succeed(i18n.t('agents:install.success', { name: agent.name }))
      }

      if (result.warnings && result.warnings.length > 0) {
        console.log(ansis.yellow(`\n${i18n.t('agents:install.warnings')}:`))
        result.warnings.forEach(w => console.log(`  - ${w}`))
      }

      console.log(ansis.gray(`\n${i18n.t('agents:install.location')}: ${result.installedPath}`))
    }
    else {
      spinner.fail(i18n.t('agents:install.failed', { name: agent.name }))
      if (result.error) {
        console.error(ansis.red(result.error))
      }
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:install.failed', { name: agentId }))
    throw error
  }
}

/**
 * Uninstall an agent
 */
async function uninstallCommand(agentId: string, options: AgentsSyncOptions): Promise<void> {
  const agents = await listLocalAgents()
  const agent = agents.find(a => a.agent.id === agentId)

  if (!agent) {
    console.log(ansis.red(i18n.t('agents:uninstall.notFound', { id: agentId })))
    return
  }

  // Confirm uninstall
  if (!options.force) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('agents:uninstall.confirm', { name: agent.agent.name }),
      default: false,
    }])

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('agents:uninstall.cancelled')))
      return
    }
  }

  const spinner = ora(i18n.t('agents:uninstall.uninstalling', { name: agent.agent.name })).start()

  try {
    const success = await uninstallAgent(agentId)

    if (success) {
      spinner.succeed(i18n.t('agents:uninstall.success', { name: agent.agent.name }))
    }
    else {
      spinner.fail(i18n.t('agents:uninstall.failed', { name: agent.agent.name }))
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:uninstall.failed', { name: agent.agent.name }))
    throw error
  }
}

/**
 * Sync agents with cloud
 */
async function syncCommand(options: AgentsSyncOptions): Promise<void> {
  const client = getAgentsClient()

  if (!client.isAuthenticated()) {
    console.log(ansis.red(i18n.t('agents:sync.notAuthenticated')))
    console.log(ansis.gray(i18n.t('agents:sync.bindHint')))
    return
  }

  const spinner = ora(i18n.t('agents:sync.syncing')).start()

  try {
    const result = await syncAgents({
      direction: options.direction,
      force: options.force,
      dryRun: options.dryRun,
      lang: options.lang as any,
    })

    if (result.success) {
      spinner.succeed(i18n.t('agents:sync.success'))

      console.log()
      console.log(ansis.green(`${i18n.t('agents:sync.pushed')}: ${result.pushed.length}`))
      if (result.pushed.length > 0) {
        result.pushed.forEach(id => console.log(`  - ${id}`))
      }

      console.log()
      console.log(ansis.green(`${i18n.t('agents:sync.pulled')}: ${result.pulled.length}`))
      if (result.pulled.length > 0) {
        result.pulled.forEach(id => console.log(`  - ${id}`))
      }

      if (result.conflicts.length > 0) {
        console.log()
        console.log(ansis.yellow(`${i18n.t('agents:sync.conflicts')}: ${result.conflicts.length}`))
        result.conflicts.forEach(c => console.log(`  - ${c.agentId}: ${c.reason}`))
      }

      if (result.skipped.length > 0) {
        console.log()
        console.log(ansis.gray(`${i18n.t('agents:sync.skipped')}: ${result.skipped.length}`))
      }
    }
    else {
      spinner.fail(i18n.t('agents:sync.failed'))
      if (result.error) {
        console.error(ansis.red(result.error))
      }
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:sync.failed'))
    throw error
  }
}

/**
 * List agent templates
 */
async function templatesCommand(options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:templates.loading')).start()

  try {
    const templates = await getAgentTemplates()

    spinner.succeed(i18n.t('agents:templates.success', { count: templates.length }))

    if (options.json) {
      console.log(JSON.stringify(templates, null, 2))
      return
    }

    if (options.category) {
      const filtered = templates.filter(t => t.category === options.category)
      displayTemplates(filtered, i18n.t('agents:templates.titleFiltered', { category: options.category }))
    }
    else {
      displayTemplates(templates, i18n.t('agents:templates.title'))
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:templates.failed'))
    throw error
  }
}

/**
 * Create agent from template
 */
async function createCommand(templateId: string, options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:create.loading')).start()

  try {
    const templates = await getAgentTemplates()
    const template = templates.find(t => t.id === templateId)

    if (!template) {
      spinner.fail(i18n.t('agents:create.templateNotFound', { id: templateId }))
      return
    }

    spinner.succeed(i18n.t('agents:create.templateLoaded'))

    // Prompt for agent name
    const { agentName } = await inquirer.prompt([{
      type: 'input',
      name: 'agentName',
      message: i18n.t('agents:create.namePrompt'),
      default: template.name,
      validate: (input: string) => input.trim().length > 0 || i18n.t('agents:create.nameRequired'),
    }])

    // Prompt for variables
    const variables: Record<string, any> = {}

    for (const variable of template.variables) {
      const label = getDescription(variable.label)
      const description = getDescription(variable.description)

      if (variable.type === 'select') {
        const { value } = await inquirer.prompt([{
          type: 'list' as const,
          name: 'value',
          message: `${label} - ${description}`,
          choices: variable.options?.map(opt => ({
            name: getDescription(opt.label),
            value: opt.value,
          })) || [],
          default: variable.default,
        }])
        variables[variable.name] = value
      }
      else if (variable.type === 'multiselect') {
        const { value } = await inquirer.prompt({
          type: 'checkbox' as const,
          name: 'value',
          message: `${label} - ${description}`,
          choices: variable.options?.map(opt => ({
            name: getDescription(opt.label),
            value: opt.value,
          })) || [],
          default: variable.default as string[] | undefined,
        })
        variables[variable.name] = value
      }
      else if (variable.type === 'boolean') {
        const { value } = await inquirer.prompt({
          type: 'confirm' as const,
          name: 'value',
          message: `${label} - ${description}`,
          default: variable.default as boolean | undefined,
        })
        variables[variable.name] = value
      }
      else {
        const { value } = await inquirer.prompt({
          type: 'input' as const,
          name: 'value',
          message: `${label} - ${description}`,
          default: variable.default as string | undefined,
          validate: (input: string) => {
            if (variable.required && input.trim().length === 0) {
              return i18n.t('agents:create.variableRequired')
            }
            if (variable.pattern && !new RegExp(variable.pattern).test(input)) {
              return i18n.t('agents:create.variableInvalid')
            }
            return true
          },
        })
        variables[variable.name] = variable.type === 'number' ? Number(value) : value
      }
    }

    // Create agent
    const createSpinner = ora(i18n.t('agents:create.creating')).start()

    const agent = await createAgentFromTemplate(templateId, variables, agentName)
    const result = await installAgent(agent, {
      lang: options.lang as any,
    })

    if (result.success) {
      createSpinner.succeed(i18n.t('agents:create.success', { name: agentName }))
      console.log(ansis.gray(`\n${i18n.t('agents:create.location')}: ${result.installedPath}`))
    }
    else {
      createSpinner.fail(i18n.t('agents:create.failed'))
      if (result.error) {
        console.error(ansis.red(result.error))
      }
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:create.failed'))
    throw error
  }
}

/**
 * Export agent
 */
async function exportCommand(agentId: string, options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:export.exporting', { id: agentId })).start()

  try {
    const outputPath = await exportAgent(agentId, {
      format: options.format,
      outputPath: options.output,
      pretty: true,
    })

    spinner.succeed(i18n.t('agents:export.success', { path: outputPath }))
  }
  catch (error) {
    spinner.fail(i18n.t('agents:export.failed'))
    throw error
  }
}

/**
 * Import agent
 */
async function importCommand(filePath: string, options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:import.importing', { path: filePath })).start()

  try {
    const result = await importAgent({
      sourcePath: filePath,
      format: options.format,
      overwrite: options.force,
      validate: true,
      lang: options.lang as any,
    })

    if (result.success) {
      spinner.succeed(i18n.t('agents:import.success', { name: result.agent.name }))
      console.log(ansis.gray(`\n${i18n.t('agents:import.location')}: ${result.installedPath}`))
    }
    else {
      spinner.fail(i18n.t('agents:import.failed'))
      if (result.error) {
        console.error(ansis.red(result.error))
      }
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:import.failed'))
    throw error
  }
}

/**
 * Check for agent updates
 */
async function updateCommand(_options: AgentsSyncOptions): Promise<void> {
  const spinner = ora(i18n.t('agents:update.checking')).start()

  try {
    const updates = await checkAgentUpdates()

    spinner.succeed(i18n.t('agents:update.checkComplete'))

    if (updates.length === 0) {
      console.log(ansis.green(`\n${i18n.t('agents:update.noUpdates')}`))
    }
    else {
      console.log(ansis.yellow(`\n${i18n.t('agents:update.available', { count: updates.length })}\n`))
      updates.forEach((update) => {
        console.log(`  ${ansis.bold(update.agentId)}: ${ansis.gray(update.currentVersion)} → ${ansis.green(update.latestVersion)}`)
        if (update.breaking) {
          console.log(`    ${ansis.red('⚠ Breaking changes')}`)
        }
        if (update.changelog) {
          console.log(`    ${ansis.gray(update.changelog)}`)
        }
      })
      console.log(ansis.gray(`\n${i18n.t('agents:update.hint')}`))
    }
  }
  catch (error) {
    spinner.fail(i18n.t('agents:update.checkFailed'))
    throw error
  }
}

/**
 * Interactive menu
 */
async function showInteractiveMenu(): Promise<void> {
  while (true) {
    console.log(ansis.green.bold(`\n${i18n.t('agents:menu.title')}\n`))

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: i18n.t('agents:menu.selectAction'),
      choices: [
        { name: `📦 ${i18n.t('agents:menu.list')}`, value: 'list' },
        { name: `🔍 ${i18n.t('agents:menu.search')}`, value: 'search' },
        { name: `⬇️  ${i18n.t('agents:menu.install')}`, value: 'install' },
        { name: `🗑️  ${i18n.t('agents:menu.uninstall')}`, value: 'uninstall' },
        { name: `🔄 ${i18n.t('agents:menu.sync')}`, value: 'sync' },
        { name: `📋 ${i18n.t('agents:menu.templates')}`, value: 'templates' },
        { name: `✨ ${i18n.t('agents:menu.create')}`, value: 'create' },
        { name: `📤 ${i18n.t('agents:menu.export')}`, value: 'export' },
        { name: `📥 ${i18n.t('agents:menu.import')}`, value: 'import' },
        { name: `🔄 ${i18n.t('agents:menu.update')}`, value: 'update' },
        new inquirer.Separator(),
        { name: ansis.gray(`↩️  ${i18n.t('common:back')}`), value: 'back' },
      ],
    }])

    if (action === 'back') {
      break
    }

    try {
      switch (action) {
        case 'list':
          await listCommand({})
          break
        case 'search': {
          const { query } = await inquirer.prompt([{
            type: 'input',
            name: 'query',
            message: i18n.t('agents:menu.searchPrompt'),
          }])
          if (query) {
            await searchCommand(query, {})
          }
          break
        }
        case 'install': {
          const { agentId } = await inquirer.prompt([{
            type: 'input',
            name: 'agentId',
            message: i18n.t('agents:menu.installPrompt'),
          }])
          if (agentId) {
            await installCommand(agentId, {})
          }
          break
        }
        case 'uninstall': {
          const agents = await listLocalAgents()
          if (agents.length === 0) {
            console.log(ansis.yellow(i18n.t('agents:menu.noAgentsInstalled')))
            break
          }
          const { agentId } = await inquirer.prompt([{
            type: 'list',
            name: 'agentId',
            message: i18n.t('agents:menu.uninstallPrompt'),
            choices: agents.map(a => ({
              name: `${a.agent.name} (${a.agent.id})`,
              value: a.agent.id,
            })),
          }])
          await uninstallCommand(agentId, {})
          break
        }
        case 'sync':
          await syncCommand({})
          break
        case 'templates':
          await templatesCommand({})
          break
        case 'create': {
          const templates = await getAgentTemplates()
          const { templateId } = await inquirer.prompt([{
            type: 'list',
            name: 'templateId',
            message: i18n.t('agents:menu.createPrompt'),
            choices: templates.map(t => ({
              name: `${t.name} - ${getDescription(t.description)}`,
              value: t.id,
            })),
          }])
          await createCommand(templateId, {})
          break
        }
        case 'export': {
          const agents = await listLocalAgents()
          if (agents.length === 0) {
            console.log(ansis.yellow(i18n.t('agents:menu.noAgentsInstalled')))
            break
          }
          const { agentId } = await inquirer.prompt([{
            type: 'list',
            name: 'agentId',
            message: i18n.t('agents:menu.exportPrompt'),
            choices: agents.map(a => ({
              name: `${a.agent.name} (${a.agent.id})`,
              value: a.agent.id,
            })),
          }])
          await exportCommand(agentId, {})
          break
        }
        case 'import': {
          const { filePath } = await inquirer.prompt([{
            type: 'input',
            name: 'filePath',
            message: i18n.t('agents:menu.importPrompt'),
          }])
          if (filePath) {
            await importCommand(filePath, {})
          }
          break
        }
        case 'update':
          await updateCommand({})
          break
      }
    }
    catch (error) {
      console.error(ansis.red(`\n${i18n.t('common:error')}: ${error}`))
    }

    // Pause before showing menu again
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray(i18n.t('common:pressEnterToContinue')),
    }])
  }
}

// ============================================================================
// CLI Registration
// ============================================================================

/**
 * Register agents sync commands with the CLI
 */
export async function registerAgentsSyncCommand(
  cli: CAC,
  withLanguageResolution: <T extends any[]>(
    action: (...args: T) => Promise<void>,
    skipPrompt?: boolean,
  ) => Promise<(...args: T) => Promise<void>>,
): Promise<void> {
  // Main agents command with action-based subcommands
  cli
    .command('agents [action] [target]', i18n.t('agents:command.description'))
    .option('--category <cat>', i18n.t('agents:options.category'))
    .option('--limit <n>', i18n.t('agents:options.limit'), { default: 10 })
    .option('--json', i18n.t('agents:options.json'))
    .option('--force', i18n.t('agents:options.force'))
    .option('--dry-run', i18n.t('agents:options.dryRun'))
    .option('--direction <dir>', i18n.t('agents:options.direction'), { default: 'both' })
    .option('--format <fmt>', i18n.t('agents:options.format'), { default: 'json' })
    .option('--output <path>', i18n.t('agents:options.output'))
    .action(await withLanguageResolution(async (action?: string, target?: string, options?: AgentsSyncOptions) => {
      const opts = options || {}

      switch (action) {
        case 'list':
          await listCommand(opts)
          break
        case 'search':
          if (!target) {
            console.error(i18n.t('agents:errors.searchQueryRequired'))
            return
          }
          await searchCommand(target, opts)
          break
        case 'install':
          if (!target) {
            console.error(i18n.t('agents:errors.agentIdRequired'))
            return
          }
          await installCommand(target, opts)
          break
        case 'uninstall':
          if (!target) {
            console.error(i18n.t('agents:errors.agentIdRequired'))
            return
          }
          await uninstallCommand(target, opts)
          break
        case 'sync':
          await syncCommand(opts)
          break
        case 'templates':
          await templatesCommand(opts)
          break
        case 'create':
          if (!target) {
            console.error(i18n.t('agents:errors.templateIdRequired'))
            return
          }
          await createCommand(target, opts)
          break
        case 'export':
          if (!target) {
            console.error(i18n.t('agents:errors.agentIdRequired'))
            return
          }
          await exportCommand(target, opts)
          break
        case 'import':
          if (!target) {
            console.error(i18n.t('agents:errors.filePathRequired'))
            return
          }
          await importCommand(target, opts)
          break
        case 'update':
          await updateCommand(opts)
          break
        default:
          // No action or unknown action - show interactive menu
          await showInteractiveMenu()
      }
    }))
}

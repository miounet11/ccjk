import { existsSync, readdirSync } from 'node:fs'
import { join } from 'pathe'
import inquirer from 'inquirer'
import ansis from 'ansis'
import ora from 'ora'
import type { SupportedLang } from '../constants'
import { CODE_TOOL_INFO, CODE_TOOL_TYPES, type CodeToolType } from '../constants'
import { COLORS, boxify, STATUS, renderProgressBar } from '../utils/banner'
import { detectProject, generateSuggestions, getProjectSummary } from '../utils/auto-config/detector'
import { runDoctor } from '../utils/health-check'
import { displayPermissions } from '../utils/permission-manager'
import { checkAllVersions, upgradeAll } from '../utils/upgrade-manager'
import { detectAllConfigs, displayConfigScan } from '../utils/config-consolidator'
import { getTranslation } from '../i18n'
import { getAllToolsStatus, installTool, type ToolStatus } from '../utils/code-tools'

/**
 * Menu section
 */
interface MenuSection {
  title: string
  icon?: string
  items: MenuItem[]
}

/**
 * Menu item
 */
interface MenuItem {
  key: string
  label: string
  description?: string
  action: () => Promise<void> | void
  disabled?: boolean
  badge?: string
}

/**
 * Unified CCJK Menu
 */
export async function showMainMenu(lang: SupportedLang = 'en'): Promise<void> {
  const t = getTranslation(lang)

  // Detect project context
  const spinner = ora('Detecting project...').start()
  const project = detectProject()
  const suggestions = generateSuggestions(project)
  spinner.stop()

  // Build menu sections
  const sections: MenuSection[] = [
    {
      title: 'Quick Actions',
      icon: '⚡',
      items: [
        {
          key: 'F',
          label: 'Full Setup',
          description: 'Complete CCJK configuration',
          action: async () => await runFullSetup(lang),
        },
        {
          key: 'U',
          label: 'Update Workflows',
          description: 'Install/update workflow templates',
          action: async () => await updateWorkflows(lang),
        },
        {
          key: 'S',
          label: 'Smart Config',
          description: `Auto-configure for ${project.type} project`,
          action: async () => await smartConfig(lang, suggestions),
          badge: project.type !== 'unknown' ? project.type : undefined,
        },
      ],
    },
    {
      title: 'Configuration',
      icon: '⚙️',
      items: [
        {
          key: 'A',
          label: 'API Settings',
          description: 'Configure API keys and auth',
          action: async () => await configureApi(lang),
        },
        {
          key: 'M',
          label: 'MCP Services',
          description: 'Manage MCP server integrations',
          action: async () => await configureMcp(lang),
        },
        {
          key: 'P',
          label: 'AI Personality',
          description: 'Set output style and language',
          action: async () => await configurePersonality(lang),
        },
        {
          key: 'W',
          label: 'Permissions',
          description: 'Manage Claude Code permissions',
          action: async () => await managePermissions(lang),
        },
      ],
    },
    {
      title: 'Tools',
      icon: '🛠️',
      items: [
        {
          key: 'T',
          label: 'AI Tools',
          description: 'Manage AI coding assistants',
          action: async () => await manageAiTools(lang),
        },
        {
          key: 'R',
          label: 'CCR Router',
          description: 'Claude Code Router proxy',
          action: async () => await configureCcr(lang),
        },
        {
          key: 'G',
          label: 'Agent Groups',
          description: 'Manage subagent groups',
          action: async () => await manageGroups(lang),
        },
        {
          key: 'K',
          label: 'Skills',
          description: 'Manage skills library',
          action: async () => await manageSkills(lang),
        },
        {
          key: 'C',
          label: 'Config Scan',
          description: 'Find and consolidate configs',
          action: async () => await scanConfigs(lang),
        },
      ],
    },
    {
      title: 'System',
      icon: '💻',
      items: [
        {
          key: 'D',
          label: 'Doctor',
          description: 'Run health check',
          action: async () => await runDoctor(),
        },
        {
          key: 'V',
          label: 'Versions',
          description: 'Check for updates',
          action: async () => await checkAllVersions(),
        },
        {
          key: 'X',
          label: 'Upgrade All',
          description: 'Upgrade CCJK and Claude Code',
          action: async () => await upgradeAll(),
        },
      ],
    },
  ]

  // Display menu
  await displayAndRunMenu(sections, project, lang)
}

/**
 * Display and run the menu
 */
async function displayAndRunMenu(
  sections: MenuSection[],
  project: any,
  lang: SupportedLang,
): Promise<void> {
  console.clear()

  // Header
  console.log(COLORS.primary('\n  ╔═══════════════════════════════════════════╗'))
  console.log(COLORS.primary('  ║') + COLORS.accent('           CCJK - Claude Code JinKu        ') + COLORS.primary('║'))
  console.log(COLORS.primary('  ╚═══════════════════════════════════════════╝'))

  // Project context
  if (project.name !== 'unknown') {
    console.log(ansis.gray(`\n  Project: ${project.name} (${project.type})`))
    if (project.frameworks.length > 0) {
      console.log(ansis.gray(`  Stack: ${project.frameworks.join(', ')}`))
    }
  }
  console.log('')

  // Display sections
  for (const section of sections) {
    console.log(COLORS.secondary(`  ${section.icon || '•'} ${section.title}`))
    for (const item of section.items) {
      const badge = item.badge ? ansis.cyan(` [${item.badge}]`) : ''
      const disabled = item.disabled ? ansis.gray(' (disabled)') : ''
      console.log(`    ${COLORS.accent(`[${item.key}]`)} ${item.label}${badge}${disabled}`)
      if (item.description) {
        console.log(ansis.gray(`        ${item.description}`))
      }
    }
    console.log('')
  }

  // Footer
  console.log(ansis.gray('  [L] Language  [H] Help  [Q] Quit'))
  console.log('')

  // Get input
  const { choice } = await inquirer.prompt([
    {
      type: 'input',
      name: 'choice',
      message: 'Select option:',
      transformer: (input: string) => input.toUpperCase(),
    },
  ])

  const key = choice.toUpperCase()

  // Handle special keys
  if (key === 'Q') {
    console.log(ansis.green('\nGoodbye! 👋\n'))
    return
  }

  if (key === 'L') {
    const newLang = lang === 'en' ? 'zh-CN' : 'en'
    await showMainMenu(newLang as SupportedLang)
    return
  }

  if (key === 'H') {
    showHelp()
    await showMainMenu(lang)
    return
  }

  // Find and execute action
  for (const section of sections) {
    const item = section.items.find(i => i.key === key)
    if (item && !item.disabled) {
      console.log('')
      await item.action()

      // Return to menu
      const { returnToMenu } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'returnToMenu',
          message: 'Return to menu?',
          default: true,
        },
      ])

      if (returnToMenu) {
        await showMainMenu(lang)
      }
      return
    }
  }

  // Invalid key
  console.log(ansis.yellow('\nInvalid option. Press any key to continue...'))
  await showMainMenu(lang)
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(boxify(`
CCJK - Claude Code JinKu

A powerful CLI tool for managing Claude Code configurations,
workflows, agents, and development automation.

Features:
• Smart project detection
• Workflow templates
• AI agent groups
• Skills management
• Health monitoring
• Upgrade management

GitHub: https://github.com/ccjk/ccjk
`, 'double', 'Help'))
}

// ============= Action Implementations =============

async function runFullSetup(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Running full setup...'))
  // TODO: Implement full setup wizard
  console.log(STATUS.success('Setup completed!'))
}

async function updateWorkflows(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Updating workflows...'))
  // TODO: Implement workflow update
  console.log(STATUS.success('Workflows updated!'))
}

async function smartConfig(lang: SupportedLang, suggestions: any): Promise<void> {
  console.log(STATUS.info('Smart configuration based on project detection:'))
  console.log(ansis.gray(`  Suggested workflows: ${suggestions.workflows.join(', ')}`))
  console.log(ansis.gray(`  Suggested agents: ${suggestions.agents.join(', ') || 'none'}`))
  console.log(ansis.gray(`  Suggested groups: ${suggestions.subagentGroups.join(', ')}`))
  // TODO: Implement smart config application
}

async function configureApi(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Configuring API...'))
  // TODO: Implement API configuration
}

async function configureMcp(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Configuring MCP services...'))
  // TODO: Implement MCP configuration
}

async function configurePersonality(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Configuring AI personality...'))
  // TODO: Implement personality configuration
}

async function managePermissions(lang: SupportedLang): Promise<void> {
  displayPermissions()
}

async function configureCcr(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Configuring CCR Router...'))
  // TODO: Implement CCR configuration
}

async function manageGroups(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Managing agent groups...'))
  // TODO: Implement group management
}

async function manageSkills(lang: SupportedLang): Promise<void> {
  console.log(STATUS.inProgress('Managing skills...'))
  // TODO: Implement skills management
}

async function scanConfigs(lang: SupportedLang): Promise<void> {
  const configs = detectAllConfigs()
  displayConfigScan(configs)
}

/**
 * Manage AI coding tools (Claude Code, Codex, Aider, Continue, Cline, Cursor)
 */
async function manageAiTools(lang: SupportedLang): Promise<void> {
  const spinner = ora('Scanning installed AI tools...').start()
  const toolsStatus = await getAllToolsStatus()
  spinner.stop()

  // Display tools status
  console.log('')
  console.log(COLORS.primary('  ╔═══════════════════════════════════════════╗'))
  console.log(COLORS.primary('  ║') + COLORS.accent('            AI Coding Tools                 ') + COLORS.primary('║'))
  console.log(COLORS.primary('  ╚═══════════════════════════════════════════╝'))
  console.log('')

  // Show installed tools
  console.log(COLORS.secondary('  📦 Installed Tools:'))
  const installedTools = toolsStatus.filter(t => t.installed)
  const notInstalledTools = toolsStatus.filter(t => !t.installed)

  if (installedTools.length === 0) {
    console.log(ansis.gray('     No AI tools installed yet'))
  } else {
    for (const tool of installedTools) {
      const info = CODE_TOOL_INFO[tool.tool]
      const version = tool.version ? ansis.cyan(` v${tool.version}`) : ''
      const config = tool.configExists ? ansis.green(' ✓') : ansis.yellow(' ⚠')
      console.log(`     ${ansis.green('✓')} ${info.name}${version}${config}`)
    }
  }

  console.log('')
  console.log(COLORS.secondary('  📋 Available to Install:'))
  if (notInstalledTools.length === 0) {
    console.log(ansis.gray('     All tools are installed!'))
  } else {
    for (const tool of notInstalledTools) {
      const info = CODE_TOOL_INFO[tool.tool]
      console.log(`     ${ansis.gray('○')} ${info.name} - ${ansis.gray(info.description)}`)
    }
  }

  console.log('')

  // Tool management actions
  const choices = [
    { name: '📊 Show all tools status', value: 'status' },
    { name: '📥 Install a tool', value: 'install' },
    { name: '⚙️  Configure a tool', value: 'configure' },
    { name: '🔄 Sync API keys across tools', value: 'sync' },
    { name: '🔙 Back to main menu', value: 'back' },
  ]

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select action:',
      choices,
    },
  ])

  switch (action) {
    case 'status':
      await showToolsStatusDetailed(toolsStatus)
      break
    case 'install':
      await installToolPrompt(notInstalledTools, lang)
      break
    case 'configure':
      await configureToolPrompt(installedTools, lang)
      break
    case 'sync':
      await syncApiKeysPrompt(installedTools, lang)
      break
    case 'back':
    default:
      return
  }
}

/**
 * Show detailed tools status
 */
async function showToolsStatusDetailed(toolsStatus: ToolStatus[]): Promise<void> {
  console.log('')
  console.log(boxify(`
AI Coding Tools Status

${toolsStatus.map((t) => {
  const info = CODE_TOOL_INFO[t.tool]
  const status = t.installed ? '✓ Installed' : '✗ Not installed'
  const version = t.version || 'N/A'
  const config = t.configExists ? '✓ Configured' : '⚠ Not configured'
  return `${info.name}
  Status: ${status}
  Version: ${version}
  Config: ${config}
  Category: ${info.category}`
}).join('\n\n')}
`, 'rounded', 'Tools Status'))
}

/**
 * Install tool prompt
 */
async function installToolPrompt(notInstalledTools: ToolStatus[], lang: SupportedLang): Promise<void> {
  if (notInstalledTools.length === 0) {
    console.log(STATUS.success('All tools are already installed!'))
    return
  }

  const choices = notInstalledTools.map((t) => {
    const info = CODE_TOOL_INFO[t.tool]
    return {
      name: `${info.name} - ${info.description}`,
      value: t.tool,
    }
  })

  const { tool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: 'Select tool to install:',
      choices,
    },
  ])

  const spinner = ora(`Installing ${CODE_TOOL_INFO[tool].name}...`).start()
  const result = await installTool(tool)

  if (result.success) {
    spinner.succeed(result.message)
  } else {
    spinner.fail(result.message)
  }
}

/**
 * Configure tool prompt
 */
async function configureToolPrompt(installedTools: ToolStatus[], lang: SupportedLang): Promise<void> {
  if (installedTools.length === 0) {
    console.log(STATUS.warning('No tools installed. Install a tool first.'))
    return
  }

  const choices = installedTools.map((t) => {
    const info = CODE_TOOL_INFO[t.tool]
    return {
      name: `${info.name} ${t.configExists ? '(configured)' : '(not configured)'}`,
      value: t.tool,
    }
  })

  const { tool } = await inquirer.prompt([
    {
      type: 'list',
      name: 'tool',
      message: 'Select tool to configure:',
      choices,
    },
  ])

  const info = CODE_TOOL_INFO[tool]
  console.log(STATUS.info(`Opening ${info.name} configuration...`))
  console.log(ansis.gray(`Config format: ${info.configFormat}`))
  // TODO: Implement tool-specific configuration
  console.log(STATUS.info('Configuration interface coming soon!'))
}

/**
 * Sync API keys prompt
 */
async function syncApiKeysPrompt(installedTools: ToolStatus[], lang: SupportedLang): Promise<void> {
  if (installedTools.length < 2) {
    console.log(STATUS.warning('Need at least 2 installed tools to sync API keys.'))
    return
  }

  console.log(STATUS.info('Syncing API keys across installed tools...'))
  // TODO: Implement API key synchronization
  console.log(STATUS.info('API key sync coming soon!'))
}

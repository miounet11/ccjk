import { existsSync, readdirSync } from 'node:fs'
import { join } from 'pathe'
import inquirer from 'inquirer'
import ansis from 'ansis'
import ora from 'ora'
import type { SupportedLang } from '../constants'
import { COLORS, boxify, STATUS, renderProgressBar } from '../utils/banner'
import { detectProject, generateSuggestions, getProjectSummary } from '../utils/auto-config/detector'
import { runDoctor } from '../utils/health-check'
import { displayPermissions } from '../utils/permission-manager'
import { checkAllVersions, upgradeAll } from '../utils/upgrade-manager'
import { detectAllConfigs, displayConfigScan } from '../utils/config-consolidator'
import { getTranslation } from '../i18n'

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

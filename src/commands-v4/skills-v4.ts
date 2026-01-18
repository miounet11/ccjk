/**
 * CCJK v4.0.0 - Skills Command
 *
 * Manage CCJK skills (custom AI capabilities)
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'
import type { SkillCategory } from '../skills/types.js'

export interface SkillsOptions extends GlobalOptions {
  category?: SkillCategory
  showDisabled?: boolean
  format?: 'table' | 'json' | 'list'
  batch?: boolean
}

/**
 * Register the skills command with subcommands
 */
export function registerSkillsCommand(program: Command): void {
  const skills = program
    .command('skills')
    .alias('sk')
    .description('Manage CCJK skills (custom AI capabilities)')
    .option('-c, --category <category>', 'Filter by category')
    .option('--show-disabled', 'Show disabled skills')
    .option('-f, --format <format>', 'Output format (table, json, list)', 'table')
    .option('--batch', 'Batch create skills from templates')
    .addHelpText('after', `

Examples:
  $ ccjk skills                    # Interactive skills menu
  $ ccjk skills list               # List all skills
  $ ccjk skills list --category dev # List dev skills only
  $ ccjk skills run <name>         # Run a skill
  $ ccjk skills info <name>        # Show skill details
  $ ccjk skills create <name>      # Create a new skill
  $ ccjk skills enable <name>      # Enable a skill
  $ ccjk skills disable <name>     # Disable a skill
  $ ccjk skills delete <name>      # Delete a skill

Skill Categories:
  dev         - Development tools
  test        - Testing utilities
  docs        - Documentation generators
  refactor    - Code refactoring
  security    - Security analysis
  performance - Performance optimization
  custom      - User-defined skills
`)

  // Subcommand: list
  skills
    .command('list')
    .alias('ls')
    .description('List all available skills')
    .action(async (options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { listSkills } = await import('../commands/skills')
      await listSkills(options)
    })

  // Subcommand: run
  skills
    .command('run <name>')
    .description('Run a skill')
    .action(async (name: string, options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { runSkill } = await import('../commands/skills')
      await runSkill(name, options)
    })

  // Subcommand: info
  skills
    .command('info <name>')
    .description('Show detailed skill information')
    .action(async (name: string, options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { showSkillInfo } = await import('../commands/skills')
      await showSkillInfo(name, options)
    })

  // Subcommand: create
  skills
    .command('create <name>')
    .description('Create a new skill')
    .action(async (name: string, options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { createSkill } = await import('../commands/skills')
      await createSkill(name, options)
    })

  // Subcommand: enable
  skills
    .command('enable <name>')
    .description('Enable a skill')
    .action(async (name: string, options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { enableSkill } = await import('../commands/skills')
      await enableSkill(name, options)
    })

  // Subcommand: disable
  skills
    .command('disable <name>')
    .description('Disable a skill')
    .action(async (name: string, options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { disableSkill } = await import('../commands/skills')
      await disableSkill(name, options)
    })

  // Subcommand: delete
  skills
    .command('delete <name>')
    .alias('remove')
    .alias('rm')
    .description('Delete a skill')
    .action(async (name: string, options: SkillsOptions) => {
      const { initI18n } = await import('../i18n/index.js')
      await initI18n(options.lang || 'zh-CN')
      const { deleteSkill } = await import('../commands/skills')
      await deleteSkill(name, options)
    })

  // Default action (no subcommand = interactive menu)
  skills.action(async (options: SkillsOptions) => {
    const { initI18n } = await import('../i18n/index.js')
    await initI18n(options.lang || 'zh-CN')
    const { skillsMenu } = await import('../commands/skills')
    await skillsMenu(options)
  })
}

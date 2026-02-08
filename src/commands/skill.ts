/**
 * Skill CLI Command
 *
 * Manage skills (SKILL.md based plugins)
 *
 * Commands:
 * - skill install <source>  - Install a skill from GitHub/local
 * - skill create <name>     - Create a new skill from template
 * - skill list              - List installed skills
 * - skill info <id>         - Show skill details
 * - skill remove <id>       - Remove a skill
 * - skill search <query>    - Search for skills
 *
 * @module commands/skill
 */

import type { SkillCategory } from '../types/skill-md'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import ansis from 'ansis'
import * as Handlebars from 'handlebars'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { getPluginManager } from '../plugins-v2'

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ============================================================================
// Command Handler
// ============================================================================

export interface SkillCommandOptions {
  force?: boolean
  json?: boolean
}

/**
 * Handle skill command
 */
export async function handleSkillCommand(
  args: string[],
  options: SkillCommandOptions = {},
): Promise<void> {
  const subcommand = args[0]
  const restArgs = args.slice(1)

  switch (subcommand) {
    case 'install':
    case 'add':
      await installSkill(restArgs[0], options)
      break

    case 'create':
    case 'new':
    case 'init':
      await createSkill(restArgs[0], options)
      break

    case 'list':
    case 'ls':
      await listSkills(options)
      break

    case 'info':
    case 'show':
      await showSkillInfo(restArgs[0], options)
      break

    case 'remove':
    case 'rm':
    case 'uninstall':
      await removeSkill(restArgs[0], options)
      break

    case 'search':
      await searchSkills(restArgs.join(' '), options)
      break

    default:
      showSkillHelp()
  }
}

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Get templates directory path
 */
function getTemplatesDir(): string {
  // Try to find templates in package directory
  const possiblePaths = [
    join(__dirname, '../../templates/skills'),
    join(__dirname, '../../../templates/skills'),
    join(process.cwd(), 'templates/skills'),
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p
    }
  }

  return possiblePaths[0]
}

/**
 * Get available skill templates
 */
function getAvailableTemplates(): string[] {
  const templatesDir = getTemplatesDir()
  if (!existsSync(templatesDir)) {
    return ['basic']
  }

  const { readdirSync } = require('node:fs')
  const files = readdirSync(templatesDir) as string[]
  return files
    .filter((f: string) => f.endsWith('.hbs'))
    .map((f: string) => f.replace('.hbs', ''))
}

/**
 * Load and compile a Handlebars template
 */
function loadTemplate(templateName: string): HandlebarsTemplateDelegate | null {
  const templatesDir = getTemplatesDir()
  const templatePath = join(templatesDir, `${templateName}.hbs`)

  if (!existsSync(templatePath)) {
    return null
  }

  const templateContent = readFileSync(templatePath, 'utf-8')
  return Handlebars.compile(templateContent)
}

// ============================================================================
// Subcommands
// ============================================================================

/**
 * Create a new skill from template
 */
async function createSkill(name: string | undefined, _options: SkillCommandOptions): Promise<void> {
  console.log(ansis.cyan('\n🎨 Create New Skill\n'))

  const availableTemplates = getAvailableTemplates()
  const categories: SkillCategory[] = ['dev', 'git', 'review', 'testing', 'docs', 'devops', 'planning', 'debugging', 'custom']

  // Interactive prompts - collect answers step by step for better type inference
  const { name: skillName } = await inquirer.prompt<{ name: string }>({
    type: 'input',
    name: 'name',
    message: 'Skill name (kebab-case):',
    default: name || 'my-skill',
    validate: (input: string) => {
      if (!/^[a-z][a-z0-9-]*$/.test(input)) {
        return 'Name must be kebab-case (lowercase letters, numbers, hyphens)'
      }
      return true
    },
  })

  const { title } = await inquirer.prompt<{ title: string }>({
    type: 'input',
    name: 'title',
    message: 'Skill title:',
    default: skillName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  })

  const { description } = await inquirer.prompt<{ description: string }>({
    type: 'input',
    name: 'description',
    message: 'Brief description:',
    default: 'A custom skill for CCJK',
  })

  const { template: selectedTemplate } = await inquirer.prompt<{ template: string }>({
    type: 'list',
    name: 'template',
    message: 'Select template:',
    choices: availableTemplates.map(t => ({
      name: t === 'basic' ? `${t} (blank template)` : t,
      value: t,
    })),
    default: 'basic',
  })

  const { category } = await inquirer.prompt<{ category: SkillCategory }>({
    type: 'list',
    name: 'category',
    message: 'Category:',
    choices: categories,
    default: 'custom',
  })

  const { use_when } = await inquirer.prompt<{ use_when: string }>({
    type: 'input',
    name: 'use_when',
    message: 'When should this skill activate? (natural language):',
    default: 'When user requests this functionality',
  })

  const { auto_activate } = await inquirer.prompt<{ auto_activate: boolean }>({
    type: 'confirm',
    name: 'auto_activate',
    message: 'Auto-activate based on context?',
    default: true,
  })

  const { context } = await inquirer.prompt<{ context: string }>({
    type: 'list',
    name: 'context',
    message: 'Execution context:',
    choices: [
      { name: 'inherit - Share parent context', value: 'inherit' },
      { name: 'fork - Isolated context', value: 'fork' },
    ],
    default: 'inherit',
  })

  const { priority } = await inquirer.prompt<{ priority: number }>({
    type: 'number',
    name: 'priority',
    message: 'Priority (1-10, higher = more priority):',
    default: 5,
    validate: (input: number | undefined) => {
      if (input === undefined)
        return 'Please enter a number'
      return input >= 1 && input <= 10 ? true : 'Must be between 1 and 10'
    },
  })

  const { hasArgs } = await inquirer.prompt<{ hasArgs: boolean }>({
    type: 'confirm',
    name: 'hasArgs',
    message: 'Does this skill accept arguments ($0, $1, etc.)?',
    default: false,
  })

  let argNames = ''
  if (hasArgs) {
    const result = await inquirer.prompt<{ argNames: string }>({
      type: 'input',
      name: 'argNames',
      message: 'Argument names (comma-separated):',
      default: 'file,options',
    })
    argNames = result.argNames
  }

  const { targetDir } = await inquirer.prompt<{ targetDir: string }>({
    type: 'list',
    name: 'targetDir',
    message: 'Where to create the skill?',
    choices: [
      { name: `~/.claude/skills (global)`, value: join(homedir(), '.claude', 'skills') },
      { name: `.claude/skills (project)`, value: join(process.cwd(), '.claude', 'skills') },
    ],
    default: join(homedir(), '.claude', 'skills'),
  })

  const answers = {
    name: skillName,
    title,
    description,
    template: selectedTemplate,
    category,
    use_when,
    auto_activate,
    context,
    priority,
    hasArgs,
    argNames,
    targetDir,
  }

  // Process arguments
  const args: Array<{ name: string, description: string, required: boolean }> | undefined = answers.hasArgs && answers.argNames
    ? answers.argNames.split(',').map((name: string, index: number) => ({
        name: name.trim(),
        description: `Argument ${index + 1}`,
        required: index === 0,
      }))
    : undefined

  // Prepare template data
  const templateData = {
    name: answers.name,
    title: answers.title,
    description: answers.description,
    author: process.env.USER || 'CCJK User',
    category: answers.category,
    use_when: answers.use_when,
    auto_activate: answers.auto_activate,
    context: answers.context,
    priority: answers.priority,
    timeout: 300,
    args,
    instructions: `Implement the ${answers.title} functionality here.\n\nAdd your specific instructions for Claude.`,
  }

  // Load and render template
  let template = loadTemplate(answers.template)
  if (!template) {
    // Fallback to basic template
    template = loadTemplate('basic')
    if (!template) {
      console.log(ansis.red('Error: Could not load template'))
      return
    }
  }

  const content = template(templateData)

  // Ensure target directory exists
  if (!existsSync(answers.targetDir)) {
    mkdirSync(answers.targetDir, { recursive: true })
  }

  // Write skill file
  const skillPath = join(answers.targetDir, `${answers.name}.md`)

  if (existsSync(skillPath)) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>({
      type: 'confirm',
      name: 'overwrite',
      message: `Skill ${answers.name}.md already exists. Overwrite?`,
      default: false,
    })

    if (!overwrite) {
      console.log(ansis.yellow('\nSkill creation cancelled.'))
      return
    }
  }

  writeFileSync(skillPath, content, 'utf-8')

  console.log(ansis.green(`\n✅ Skill created successfully!`))
  console.log(ansis.dim(`   Path: ${skillPath}`))
  console.log('')
  console.log(ansis.bold('Next steps:'))
  console.log(ansis.dim(`   1. Edit ${skillPath} to customize the skill`))
  console.log(ansis.dim(`   2. The skill will be auto-loaded (hot-reload enabled)`))
  console.log(ansis.dim(`   3. Use /${answers.name} to invoke the skill`))

  if (args && args.length > 0) {
    console.log('')
    console.log(ansis.bold('Arguments:'))
    args.forEach((arg: { name: string, required: boolean }, i: number) => {
      console.log(ansis.dim(`   $${i} - ${arg.name}${arg.required ? ' (required)' : ''}`))
    })
  }
}

/**
 * Install a skill
 */
async function installSkill(source: string, options: SkillCommandOptions): Promise<void> {
  if (!source) {
    console.log(ansis.red('Error: Please specify a skill source'))
    console.log(ansis.dim('Example: skill install vercel-labs/agent-skills/skills/react-best-practices'))
    return
  }

  console.log(ansis.cyan(`\n📦 Installing skill from: ${source}\n`))

  const manager = await getPluginManager()
  const result = await manager.install(source, { force: options.force })

  if (result.success) {
    console.log(ansis.green(`✅ Successfully installed: ${result.pluginId}`))
    console.log(ansis.dim(`   Version: ${result.version}`))
    console.log(ansis.dim(`   Path: ${result.path}`))

    // Show skill info
    const plugin = manager.getPlugin(result.pluginId)
    if (plugin?.skill) {
      console.log('')
      console.log(ansis.bold('Skill Info:'))
      console.log(ansis.dim(`   ${plugin.skill.description}`))

      if (plugin.skill.applicability.taskTypes.length > 0) {
        console.log('')
        console.log(ansis.bold('When to use:'))
        for (const task of plugin.skill.applicability.taskTypes.slice(0, 3)) {
          console.log(ansis.dim(`   • ${task}`))
        }
      }
    }
  }
  else {
    console.log(ansis.red(`❌ Installation failed: ${result.error}`))
  }
}

/**
 * List installed skills
 */
async function listSkills(options: SkillCommandOptions): Promise<void> {
  const manager = await getPluginManager()
  const plugins = manager.listPlugins()

  // Filter to only skills (v2 format with SKILL.md)
  const skills = plugins.filter(p => p.skill || p.manifest.formatVersion === '2.0')

  if (options.json) {
    console.log(JSON.stringify(skills.map(s => ({
      id: s.manifest.id,
      name: s.manifest.name.en,
      version: s.manifest.version,
      hasSkill: !!s.skill,
      scripts: s.scripts?.length ?? 0,
    })), null, 2))
    return
  }

  console.log(ansis.cyan('\n📚 Installed Skills\n'))

  if (skills.length === 0) {
    console.log(ansis.dim('No skills installed yet.'))
    console.log(ansis.dim('\nInstall skills with:'))
    console.log(ansis.dim('  skill install vercel-labs/agent-skills/skills/react-best-practices'))
    return
  }

  for (const skill of skills) {
    const name = skill.manifest.name.en || skill.manifest.id
    const version = skill.manifest.version
    const hasScripts = skill.scripts && skill.scripts.length > 0

    console.log(`  ${ansis.bold(name)} ${ansis.dim(`(${skill.manifest.id})`)} ${ansis.dim(`v${version}`)}`)

    if (skill.skill) {
      console.log(ansis.dim(`    ${skill.skill.description.substring(0, 60)}...`))
    }

    const badges: string[] = []
    if (hasScripts)
      badges.push('📜 scripts')
    if (skill.intents?.length)
      badges.push('🎯 intents')
    if (skill.skill?.rules?.length)
      badges.push(`📋 ${skill.skill.rules.length} rules`)

    if (badges.length > 0) {
      console.log(ansis.dim(`    ${badges.join(' • ')}`))
    }

    console.log('')
  }

  console.log(ansis.dim(`Total: ${skills.length} skills`))
}

/**
 * Show skill info
 */
async function showSkillInfo(skillId: string, options: SkillCommandOptions): Promise<void> {
  if (!skillId) {
    console.log(ansis.red('Error: Please specify a skill ID'))
    return
  }

  const manager = await getPluginManager()
  const plugin = manager.getPlugin(skillId)

  if (!plugin) {
    console.log(ansis.red(`Skill not found: ${skillId}`))
    return
  }

  if (options.json) {
    console.log(JSON.stringify({
      manifest: plugin.manifest,
      skill: plugin.skill
        ? {
            title: plugin.skill.title,
            description: plugin.skill.description,
            applicability: plugin.skill.applicability,
            rulesCount: plugin.skill.rules?.length ?? 0,
            sectionsCount: plugin.skill.sections.length,
          }
        : null,
      scripts: plugin.scripts,
      intents: plugin.intents,
    }, null, 2))
    return
  }

  console.log('')
  console.log(ansis.bold(ansis.cyan(`📦 ${plugin.manifest.name.en}`)))
  console.log(ansis.dim(`ID: ${plugin.manifest.id}`))
  console.log(ansis.dim(`Version: ${plugin.manifest.version}`))
  console.log(ansis.dim(`Category: ${plugin.manifest.category}`))
  console.log('')

  if (plugin.skill) {
    console.log(ansis.bold('📖 Skill Document'))
    console.log(ansis.dim(`Title: ${plugin.skill.title}`))
    console.log(ansis.dim(`Description: ${plugin.skill.description}`))
    console.log('')

    if (plugin.skill.applicability.taskTypes.length > 0) {
      console.log(ansis.bold('🎯 When to Apply'))
      for (const task of plugin.skill.applicability.taskTypes) {
        console.log(ansis.dim(`  • ${task}`))
      }
      console.log('')
    }

    if (plugin.skill.rules && plugin.skill.rules.length > 0) {
      console.log(ansis.bold(`📋 Rules (${plugin.skill.rules.length} total)`))

      // Group by priority
      const byPriority = {
        critical: plugin.skill.rules.filter(r => r.priority === 'critical'),
        high: plugin.skill.rules.filter(r => r.priority === 'high'),
        medium: plugin.skill.rules.filter(r => r.priority === 'medium'),
        low: plugin.skill.rules.filter(r => r.priority === 'low'),
      }

      if (byPriority.critical.length > 0) {
        console.log(ansis.red(`  🔴 Critical (${byPriority.critical.length})`))
        for (const rule of byPriority.critical.slice(0, 3)) {
          console.log(ansis.dim(`     ${rule.id}: ${rule.title}`))
        }
      }

      if (byPriority.high.length > 0) {
        console.log(ansis.yellow(`  🟡 High (${byPriority.high.length})`))
        for (const rule of byPriority.high.slice(0, 3)) {
          console.log(ansis.dim(`     ${rule.id}: ${rule.title}`))
        }
      }

      console.log('')
    }

    if (plugin.skill.sections.length > 0) {
      console.log(ansis.bold('📑 Sections'))
      for (const section of plugin.skill.sections) {
        console.log(ansis.dim(`  • ${section.title}`))
      }
      console.log('')
    }
  }

  if (plugin.scripts && plugin.scripts.length > 0) {
    console.log(ansis.bold('📜 Scripts'))
    for (const script of plugin.scripts) {
      console.log(ansis.dim(`  • ${script.name} (${script.type})`))
    }
    console.log('')
  }

  if (plugin.intents && plugin.intents.length > 0) {
    console.log(ansis.bold('🎯 Auto-Activation Intents'))
    for (const intent of plugin.intents) {
      console.log(ansis.dim(`  • ${intent.name.en}`))
      console.log(ansis.dim(`    Patterns: ${intent.patterns.slice(0, 2).join(', ')}...`))
    }
    console.log('')
  }

  // Source info
  console.log(ansis.bold('📍 Source'))
  console.log(ansis.dim(`  Type: ${plugin.source.type}`))
  if (plugin.source.type === 'local') {
    console.log(ansis.dim(`  Path: ${plugin.source.path}`))
  }
  else if (plugin.source.type === 'github') {
    console.log(ansis.dim(`  Repo: ${plugin.source.repo}`))
  }
}

/**
 * Remove a skill
 */
async function removeSkill(skillId: string, _options: SkillCommandOptions): Promise<void> {
  if (!skillId) {
    console.log(ansis.red('Error: Please specify a skill ID'))
    return
  }

  const manager = await getPluginManager()
  const plugin = manager.getPlugin(skillId)

  if (!plugin) {
    console.log(ansis.red(`Skill not found: ${skillId}`))
    return
  }

  console.log(ansis.yellow(`\n⚠️  Removing skill: ${plugin.manifest.name.en}`))

  const success = await manager.uninstall(skillId)

  if (success) {
    console.log(ansis.green(`✅ Successfully removed: ${skillId}`))
  }
  else {
    console.log(ansis.red(`❌ Failed to remove: ${skillId}`))
  }
}

/**
 * Search for skills
 */
async function searchSkills(query: string, _options: SkillCommandOptions): Promise<void> {
  console.log(ansis.cyan(`\n🔍 Searching for skills: "${query}"\n`))

  // TODO: Implement skill search from registry
  // For now, show popular skills from GitHub

  const popularSkills = [
    {
      source: 'vercel-labs/agent-skills/skills/react-best-practices',
      name: 'React Best Practices',
      description: '40+ React/Next.js performance optimization rules',
    },
    {
      source: 'vercel-labs/agent-skills/skills/web-design-guidelines',
      name: 'Web Design Guidelines',
      description: '100+ UI/UX rules for accessibility and performance',
    },
    {
      source: 'vercel-labs/agent-skills/skills/vercel-deploy-claimable',
      name: 'Vercel Deploy',
      description: 'One-click deployment with framework auto-detection',
    },
  ]

  console.log(ansis.bold('Popular Skills:'))
  console.log('')

  for (const skill of popularSkills) {
    console.log(`  ${ansis.bold(skill.name)}`)
    console.log(ansis.dim(`    ${skill.description}`))
    console.log(ansis.dim(`    Install: skill install ${skill.source}`))
    console.log('')
  }

  console.log(ansis.dim('More skills coming soon...'))
}

/**
 * Show help
 */
function showSkillHelp(): void {
  console.log(`
${ansis.bold(ansis.cyan('📚 Skill Command'))}

${ansis.bold('Usage:')}
  skill <command> [options]

${ansis.bold('Commands:')}
  ${ansis.green('create')} [name]     Create a new skill from template (interactive)
  ${ansis.green('install')} <source>  Install a skill from GitHub or local path
  ${ansis.green('list')}              List installed skills
  ${ansis.green('info')} <id>         Show detailed skill information
  ${ansis.green('remove')} <id>       Remove an installed skill
  ${ansis.green('search')} <query>    Search for skills

${ansis.bold('Options:')}
  --force            Force reinstall
  --json             Output as JSON

${ansis.bold('Examples:')}
  ${ansis.dim('# Create a new skill (interactive wizard)')}
  skill create my-skill

  ${ansis.dim('# Install from GitHub')}
  skill install vercel-labs/agent-skills/skills/react-best-practices

  ${ansis.dim('# Install from local path')}
  skill install ./my-skill

  ${ansis.dim('# List installed skills')}
  skill list

  ${ansis.dim('# Show skill details')}
  skill info react-best-practices

${ansis.bold('Skill Format:')}
  Skills follow the SKILL.md format with optional scripts:

  my-skill/
  ├── SKILL.md          # AI instructions
  ├── plugin.json       # Metadata (optional)
  ├── scripts/          # Executable scripts
  │   └── main.sh
  └── references/       # Reference documents
      └── rules/

${ansis.bold('Argument Shorthand (v2.1.19+):')}
  Skills can use $0, $1, $2... for argument interpolation:

  ${ansis.dim('# In skill content:')}
  ${ansis.dim('Edit file $0 with message: $1')}

  ${ansis.dim('# Usage:')}
  ${ansis.dim('/my-skill src/app.ts "Fix bug"')}
`)
}

// ============================================================================
// Export
// ============================================================================

export default handleSkillCommand

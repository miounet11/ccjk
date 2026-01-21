/**
 * Skill CLI Command
 *
 * Manage skills (SKILL.md based plugins)
 *
 * Commands:
 * - skill install <source>  - Install a skill from GitHub/local
 * - skill list              - List installed skills
 * - skill info <id>         - Show skill details
 * - skill remove <id>       - Remove a skill
 * - skill search <query>    - Search for skills
 *
 * @module commands/skill
 */

import ansis from 'ansis'
import { getPluginManager } from '../plugins-v2'

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
// Subcommands
// ============================================================================

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
  ${ansis.green('install')} <source>   Install a skill from GitHub or local path
  ${ansis.green('list')}              List installed skills
  ${ansis.green('info')} <id>         Show detailed skill information
  ${ansis.green('remove')} <id>       Remove an installed skill
  ${ansis.green('search')} <query>    Search for skills

${ansis.bold('Options:')}
  --force            Force reinstall
  --json             Output as JSON

${ansis.bold('Examples:')}
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
`)
}

// ============================================================================
// Export
// ============================================================================

export default handleSkillCommand

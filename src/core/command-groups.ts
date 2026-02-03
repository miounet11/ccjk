/**
 * Unified Command Groups System
 *
 * Reorganizes 70+ commands into 10 logical groups for better UX.
 * Implements lazy loading for performance optimization.
 *
 * Command Groups:
 * 1. init     - Initialization and setup
 * 2. config   - Configuration management
 * 3. mcp      - MCP service management
 * 4. skills   - Skills management
 * 5. workflows - Workflow management
 * 6. brain    - AI agent system
 * 7. sync     - Cloud synchronization
 * 8. session  - Session management
 * 9. tools    - External tool integration
 * 10. help    - Help and documentation
 *
 * @module core/command-groups
 */

import type { CAC } from 'cac'

// ============================================================================
// Types
// ============================================================================

/**
 * Command group definition
 */
export interface CommandGroup {
  id: string
  name: string
  description: string
  aliases: string[]
  commands: CommandDefinition[]
  hidden?: boolean
}

/**
 * Individual command definition
 */
export interface CommandDefinition {
  name: string
  description: string
  aliases?: string[]
  handler: string // Module path for lazy loading
  options?: CommandOption[]
  hidden?: boolean
}

/**
 * Command option definition
 */
export interface CommandOption {
  name: string
  description: string
  type: 'string' | 'boolean' | 'number'
  default?: unknown
  required?: boolean
}

// ============================================================================
// Command Groups Definition
// ============================================================================

/**
 * Core command groups (10 groups)
 */
export const COMMAND_GROUPS: CommandGroup[] = [
  // =========================================================================
  // Group 1: init - Initialization and Setup
  // =========================================================================
  {
    id: 'init',
    name: 'Initialize',
    description: 'Initialize and setup CCJK environment',
    aliases: ['i', 'setup'],
    commands: [
      {
        name: 'full',
        description: 'Full initialization with all options',
        handler: 'commands/init',
        aliases: ['all'],
      },
      {
        name: 'quick',
        description: 'Quick setup with defaults',
        handler: 'commands/quick-setup',
        aliases: ['q'],
      },
      {
        name: 'project',
        description: 'Initialize project-specific settings',
        handler: 'commands/ccjk-setup',
      },
      {
        name: 'doctor',
        description: 'Diagnose and fix setup issues',
        handler: 'commands/doctor',
      },
    ],
  },

  // =========================================================================
  // Group 2: config - Configuration Management
  // =========================================================================
  {
    id: 'config',
    name: 'Configuration',
    description: 'Manage CCJK and Claude Code configuration',
    aliases: ['c', 'cfg'],
    commands: [
      {
        name: 'show',
        description: 'Show current configuration',
        handler: 'commands/config',
        aliases: ['list', 'ls'],
      },
      {
        name: 'set',
        description: 'Set configuration value',
        handler: 'commands/config',
      },
      {
        name: 'switch',
        description: 'Switch between configurations',
        handler: 'commands/config-switch',
        aliases: ['sw'],
      },
      {
        name: 'api',
        description: 'Configure API settings',
        handler: 'commands/api-config-selector',
      },
      {
        name: 'providers',
        description: 'Manage API providers',
        handler: 'commands/providers',
      },
      {
        name: 'backup',
        description: 'Backup current configuration',
        handler: 'commands/config',
      },
      {
        name: 'restore',
        description: 'Restore configuration from backup',
        handler: 'commands/config',
      },
    ],
  },

  // =========================================================================
  // Group 3: mcp - MCP Service Management
  // =========================================================================
  {
    id: 'mcp',
    name: 'MCP Services',
    description: 'Manage Model Context Protocol services',
    aliases: ['m'],
    commands: [
      {
        name: 'install',
        description: 'Install MCP service',
        handler: 'commands/mcp',
        aliases: ['add', 'i'],
      },
      {
        name: 'uninstall',
        description: 'Uninstall MCP service',
        handler: 'commands/mcp',
        aliases: ['remove', 'rm'],
      },
      {
        name: 'list',
        description: 'List installed MCP services',
        handler: 'commands/mcp',
        aliases: ['ls'],
      },
      {
        name: 'search',
        description: 'Search MCP marketplace',
        handler: 'commands/mcp-search',
        aliases: ['find'],
      },
      {
        name: 'doctor',
        description: 'Diagnose MCP issues',
        handler: 'commands/mcp-doctor',
      },
      {
        name: 'market',
        description: 'Browse MCP marketplace',
        handler: 'commands/mcp-market',
      },
      {
        name: 'profile',
        description: 'Manage MCP profiles',
        handler: 'commands/mcp-profile',
      },
    ],
  },

  // =========================================================================
  // Group 4: skills - Skills Management
  // =========================================================================
  {
    id: 'skills',
    name: 'Skills',
    description: 'Manage AI skills and capabilities',
    aliases: ['s', 'skill'],
    commands: [
      {
        name: 'create',
        description: 'Create a new skill',
        handler: 'commands/skill',
        aliases: ['new'],
      },
      {
        name: 'install',
        description: 'Install a skill',
        handler: 'commands/skill',
        aliases: ['add', 'i'],
      },
      {
        name: 'list',
        description: 'List installed skills',
        handler: 'commands/skill',
        aliases: ['ls'],
      },
      {
        name: 'info',
        description: 'Show skill details',
        handler: 'commands/skill',
        aliases: ['show'],
      },
      {
        name: 'remove',
        description: 'Remove a skill',
        handler: 'commands/skill',
        aliases: ['rm', 'uninstall'],
      },
      {
        name: 'sync',
        description: 'Sync skills with cloud',
        handler: 'commands/skills-sync',
      },
      {
        name: 'reload',
        description: 'Reload all skills',
        handler: 'commands/skills',
      },
    ],
  },

  // =========================================================================
  // Group 5: workflows - Workflow Management
  // =========================================================================
  {
    id: 'workflows',
    name: 'Workflows',
    description: 'Manage development workflows',
    aliases: ['w', 'wf', 'workflow'],
    commands: [
      {
        name: 'install',
        description: 'Install workflows',
        handler: 'commands/workflows',
        aliases: ['add', 'i'],
      },
      {
        name: 'list',
        description: 'List available workflows',
        handler: 'commands/workflows',
        aliases: ['ls'],
      },
      {
        name: 'update',
        description: 'Update installed workflows',
        handler: 'commands/update',
      },
      {
        name: 'remove',
        description: 'Remove a workflow',
        handler: 'commands/workflows',
        aliases: ['rm'],
      },
    ],
  },

  // =========================================================================
  // Group 6: brain - AI Agent System
  // =========================================================================
  {
    id: 'brain',
    name: 'Brain System',
    description: 'Manage AI agent orchestration',
    aliases: ['b', 'agent', 'agents'],
    commands: [
      {
        name: 'status',
        description: 'Show brain system status',
        handler: 'commands/brain',
      },
      {
        name: 'agents',
        description: 'List available agents',
        handler: 'commands/agent',
        aliases: ['list'],
      },
      {
        name: 'thinking',
        description: 'Control thinking mode',
        handler: 'commands/thinking',
      },
      {
        name: 'background',
        description: 'Manage background tasks',
        handler: 'commands/background',
      },
      {
        name: 'monitor',
        description: 'Monitor agent activity',
        handler: 'commands/monitor',
      },
    ],
  },

  // =========================================================================
  // Group 7: sync - Cloud Synchronization
  // =========================================================================
  {
    id: 'sync',
    name: 'Cloud Sync',
    description: 'Manage cloud synchronization',
    aliases: ['cloud'],
    commands: [
      {
        name: 'status',
        description: 'Show sync status',
        handler: 'commands/cloud-sync',
      },
      {
        name: 'push',
        description: 'Push local changes to cloud',
        handler: 'commands/cloud-sync',
      },
      {
        name: 'pull',
        description: 'Pull changes from cloud',
        handler: 'commands/cloud-sync',
      },
      {
        name: 'setup',
        description: 'Setup cloud sync',
        handler: 'commands/cloud-sync',
      },
      {
        name: 'teleport',
        description: 'Teleport session to another device',
        handler: 'commands/teleport',
      },
    ],
  },

  // =========================================================================
  // Group 8: session - Session Management
  // =========================================================================
  {
    id: 'session',
    name: 'Sessions',
    description: 'Manage Claude Code sessions',
    aliases: ['sess'],
    commands: [
      {
        name: 'list',
        description: 'List saved sessions',
        handler: 'commands/session',
        aliases: ['ls'],
      },
      {
        name: 'save',
        description: 'Save current session',
        handler: 'commands/session',
      },
      {
        name: 'restore',
        description: 'Restore a session',
        handler: 'commands/session-resume',
        // Note: 'resume' alias removed to avoid conflict with Claude Code's built-in /resume command
      },
      {
        name: 'delete',
        description: 'Delete a session',
        handler: 'commands/session',
        aliases: ['rm'],
      },
      {
        name: 'history',
        description: 'Show session history',
        handler: 'commands/history',
      },
    ],
  },

  // =========================================================================
  // Group 9: tools - External Tool Integration
  // =========================================================================
  {
    id: 'tools',
    name: 'Tools',
    description: 'External tool integration',
    aliases: ['t', 'tool'],
    commands: [
      {
        name: 'ccr',
        description: 'Claude Code Router management',
        handler: 'commands/ccr',
      },
      {
        name: 'ccu',
        description: 'CCusage analytics',
        handler: 'commands/ccu',
      },
      {
        name: 'browser',
        description: 'Browser automation',
        handler: 'commands/browser',
      },
      {
        name: 'sandbox',
        description: 'Sandbox environment',
        handler: 'commands/sandbox',
      },
      {
        name: 'check-updates',
        description: 'Check for tool updates',
        handler: 'commands/check-updates',
      },
    ],
  },

  // =========================================================================
  // Group 10: help - Help and Documentation
  // =========================================================================
  {
    id: 'help',
    name: 'Help',
    description: 'Help and documentation',
    aliases: ['h', '?'],
    commands: [
      {
        name: 'commands',
        description: 'List all commands',
        handler: 'commands/help',
      },
      {
        name: 'docs',
        description: 'Open documentation',
        handler: 'commands/help',
      },
      {
        name: 'examples',
        description: 'Show usage examples',
        handler: 'commands/help',
      },
      {
        name: 'about',
        description: 'About CCJK',
        handler: 'commands/help',
      },
    ],
  },
]

// ============================================================================
// Command Group Registry
// ============================================================================

/**
 * Get command group by ID or alias
 */
export function getCommandGroup(idOrAlias: string): CommandGroup | undefined {
  return COMMAND_GROUPS.find(
    g => g.id === idOrAlias || g.aliases.includes(idOrAlias),
  )
}

/**
 * Get all visible command groups
 */
export function getVisibleGroups(): CommandGroup[] {
  return COMMAND_GROUPS.filter(g => !g.hidden)
}

/**
 * Get command from group
 */
export function getCommand(
  groupId: string,
  commandName: string,
): CommandDefinition | undefined {
  const group = getCommandGroup(groupId)
  if (!group)
    return undefined

  return group.commands.find(
    c => c.name === commandName || c.aliases?.includes(commandName),
  )
}

/**
 * Get all commands (flattened)
 */
export function getAllCommands(): Array<{ group: string, command: CommandDefinition }> {
  const commands: Array<{ group: string, command: CommandDefinition }> = []

  for (const group of COMMAND_GROUPS) {
    for (const command of group.commands) {
      commands.push({ group: group.id, command })
    }
  }

  return commands
}

// ============================================================================
// CLI Registration
// ============================================================================

/**
 * Register command groups with CAC
 */
export function registerCommandGroups(cli: CAC): void {
  for (const group of COMMAND_GROUPS) {
    if (group.hidden)
      continue

    // Register group command
    const groupCmd = cli.command(
      `${group.id} [action] [...args]`,
      group.description,
    )

    // Add aliases
    for (const alias of group.aliases) {
      groupCmd.alias(alias)
    }

    // Add action handler
    groupCmd.action(async (action: string | undefined, args: string[], options: Record<string, unknown>) => {
      await handleGroupCommand(group.id, action, args, options)
    })
  }
}

/**
 * Handle group command execution
 */
async function handleGroupCommand(
  groupId: string,
  action: string | undefined,
  args: string[],
  options: Record<string, unknown>,
): Promise<void> {
  const group = getCommandGroup(groupId)
  if (!group) {
    console.error(`Unknown command group: ${groupId}`)
    return
  }

  // If no action, show group help
  if (!action) {
    showGroupHelp(group)
    return
  }

  // Find command
  const command = getCommand(groupId, action)
  if (!command) {
    console.error(`Unknown command: ${groupId} ${action}`)
    showGroupHelp(group)
    return
  }

  // Lazy load and execute command handler
  try {
    const handler = await import(`../${command.handler}`)
    const handlerFn = handler.default || handler[`handle${capitalize(command.name)}Command`]

    if (typeof handlerFn === 'function') {
      await handlerFn(args, options)
    }
    else {
      console.error(`Command handler not found: ${command.handler}`)
    }
  }
  catch (error) {
    console.error(`Failed to execute command: ${error}`)
  }
}

/**
 * Show help for a command group
 */
function showGroupHelp(group: CommandGroup): void {
  const ansis = require('ansis').default

  console.log('')
  console.log(ansis.bold(ansis.cyan(`📦 ${group.name}`)))
  console.log(ansis.dim(group.description))
  console.log('')
  console.log(ansis.bold('Commands:'))

  for (const cmd of group.commands) {
    if (cmd.hidden)
      continue

    const aliases = cmd.aliases?.length ? ansis.dim(` (${cmd.aliases.join(', ')})`) : ''
    console.log(`  ${ansis.green(cmd.name)}${aliases}`)
    console.log(ansis.dim(`    ${cmd.description}`))
  }

  console.log('')
  console.log(ansis.dim(`Usage: ccjk ${group.id} <command> [options]`))
  console.log('')
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============================================================================
// Help Generation
// ============================================================================

/**
 * Generate main help text
 */
export function generateMainHelp(): string {
  const ansis = require('ansis').default
  const lines: string[] = []

  lines.push('')
  lines.push(ansis.bold(ansis.cyan('🚀 CCJK - Claude Code Enhancement Layer')))
  lines.push(ansis.dim('"Not replacement, but enhancement"'))
  lines.push('')
  lines.push(ansis.bold('Command Groups:'))
  lines.push('')

  for (const group of getVisibleGroups()) {
    const aliases = group.aliases.length ? ansis.dim(` (${group.aliases.join(', ')})`) : ''
    lines.push(`  ${ansis.green(group.id)}${aliases}`)
    lines.push(ansis.dim(`    ${group.description}`))
  }

  lines.push('')
  lines.push(ansis.bold('Quick Start:'))
  lines.push(ansis.dim('  ccjk init full      # Full initialization'))
  lines.push(ansis.dim('  ccjk init quick     # Quick setup'))
  lines.push(ansis.dim('  ccjk mcp install    # Install MCP service'))
  lines.push(ansis.dim('  ccjk skills create  # Create a new skill'))
  lines.push('')
  lines.push(ansis.dim('Run "ccjk <group>" to see group commands'))
  lines.push(ansis.dim('Run "ccjk <group> <command> --help" for command help'))
  lines.push('')

  return lines.join('\n')
}

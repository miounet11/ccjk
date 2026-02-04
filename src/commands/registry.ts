/**
 * Command Registry System
 *
 * Centralized command management for CCJK v4
 * Provides lazy loading, deprecation warnings, and categorization
 */

import type { CAC } from 'cac'
import ansis from 'ansis'
import { getTranslation } from '../i18n'

/**
 * Command category for organization
 */
export type CommandCategory = 'core' | 'config' | 'tools' | 'advanced' | 'deprecated'

/**
 * Command definition interface
 */
export interface CommandDefinition {
  /** Unique command identifier */
  id: string

  /** Command name (e.g., 'init', 'config') */
  name: string

  /** Command aliases (deprecated) */
  alias?: string[]

  /** Category for organization */
  category: CommandCategory

  /** Description key (i18n) */
  description: string

  /** Whether this command is deprecated */
  deprecated?: boolean

  /** Version where deprecated */
  deprecatedIn?: string

  /** Version where will be removed */
  removedIn?: string

  /** Replacement command suggestion */
  replacement?: string

  /** Reason for deprecation */
  deprecationReason?: string

  /** Lazy import function for the command handler */
  lazyImport?: () => Promise<{ default: () => Promise<void> } | { handleCommand: () => Promise<void>, handler?: () => Promise<void> }>

  /** Direct handler (for core commands) */
  handler?: () => Promise<void>
}

/**
 * Command registry class
 */
export class CommandRegistry {
  private commands = new Map<string, CommandDefinition>()
  private aliases = new Map<string, string>()

  /**
   * Register a command
   */
  register(def: CommandDefinition): void {
    this.commands.set(def.id, def)

    // Register aliases
    if (def.alias) {
      for (const a of def.alias) {
        this.aliases.set(a, def.id)
      }
    }
  }

  /**
   * Get a command by ID or alias
   */
  get(id: string): CommandDefinition | undefined {
    const commandId = this.aliases.get(id) || id
    return this.commands.get(commandId)
  }

  /**
   * Get all commands in a category
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return Array.from(this.commands.values())
      .filter(cmd => cmd.category === category)
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  /**
   * Get all commands
   */
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values())
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  /**
   * Get non-deprecated commands
   */
  getActive(): CommandDefinition[] {
    return this.getAll().filter(cmd => !cmd.deprecated)
  }

  /**
   * Get deprecated commands
   */
  getDeprecated(): CommandDefinition[] {
    return this.getAll().filter(cmd => cmd.deprecated)
  }

  /**
   * Check if a command is deprecated
   */
  isDeprecated(id: string): boolean {
    const cmd = this.get(id)
    return cmd?.deprecated ?? false
  }

  /**
   * Show deprecation warning for a command
   */
  showDeprecationWarning(id: string): void {
    const cmd = this.get(id)
    if (!cmd?.deprecated)
      return

    const t = getTranslation()

    console.warn(ansis.yellow(`⚠️  ${t('commands.deprecation.warning', { command: cmd.name })}`))

    if (cmd.removedIn) {
      console.warn(ansis.yellow(`   ${t('commands.deprecation.removedIn', { version: cmd.removedIn })}`))
    }

    if (cmd.replacement) {
      console.warn(ansis.green(`   ${t('commands.deprecation.replacement', { replacement: cmd.replacement })}`))
    }

    if (cmd.deprecationReason) {
      console.warn(ansis.dim(`   ${t('commands.deprecation.reason', { reason: cmd.deprecationReason })}`))
    }

    console.warn()
  }

  /**
   * Execute a command with lazy loading
   */
  async execute(id: string): Promise<void> {
    const cmd = this.get(id)
    if (!cmd) {
      console.error(ansis.red(`Command not found: ${id}`))
      return
    }

    // Show deprecation warning
    if (cmd.deprecated) {
      this.showDeprecationWarning(id)
    }

    // Execute handler
    if (cmd.handler) {
      await cmd.handler()
      return
    }

    // Lazy load and execute
    if (cmd.lazyImport) {
      const module = await cmd.lazyImport()
      const handler = 'default' in module ? module.default : module.handler
      if (handler) {
        await handler()
      }
      return
    }

    console.error(ansis.red(`No handler for command: ${id}`))
  }

  /**
   * Register command with CAC CLI
   */
  registerWithCli(command: CommandDefinition, cli: CAC): void {
    const cliCmd = cli.command(command.name, command.description)

    if (command.alias) {
      for (const a of command.alias) {
        cliCmd.alias(a)
      }
    }

    cliCmd.action(async () => {
      await this.execute(command.id)
    })
  }
}

/**
 * Global command registry instance
 */
export const commandRegistry = new CommandRegistry()

/**
 * Core command definitions
 */
export const coreCommands: CommandDefinition[] = [
  {
    id: 'init',
    name: 'init',
    category: 'core',
    description: 'commands.init.description',
    lazyImport: () => import('../commands/init').then(m => ({ default: (m as any).default })),
  },
  {
    id: 'update',
    name: 'update',
    category: 'core',
    description: 'commands.update.description',
    lazyImport: () => import('../commands/update').then(m => ({ default: (m as any).default })),
  },
  {
    id: 'doctor',
    name: 'doctor',
    category: 'core',
    description: 'commands.doctor.description',
    lazyImport: () => import('../commands/doctor').then(m => ({ default: (m as any).default })),
  },
  {
    id: 'help',
    name: 'help',
    alias: ['h'],
    category: 'core',
    description: 'commands.help.description',
    lazyImport: () => import('../commands/help').then(m => ({ default: (m as any).default })),
  },
  {
    id: 'menu',
    name: 'menu',
    category: 'core',
    description: 'commands.menu.description',
    lazyImport: () => import('../commands/menu').then(m => ({ default: (m as any).showMainMenu })),
  },
]

/**
 * Deprecated command definitions
 */
export const deprecatedCommands: CommandDefinition[] = [
  {
    id: 'daemon',
    name: 'daemon',
    category: 'deprecated',
    description: 'commands.daemon.description',
    deprecated: true,
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'session',
    deprecationReason: 'Remote control feature is over-engineered for a CLI tool',
  },
  {
    id: 'claude-wrapper',
    name: 'claude-wrapper',
    category: 'deprecated',
    description: 'commands.claude-wrapper.description',
    deprecated: true,
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'init',
    deprecationReason: 'Transparent wrapper has low usage',
  },
  {
    id: 'claude-md',
    name: 'claude-md',
    category: 'deprecated',
    description: 'commands.claude-md.description',
    deprecated: true,
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'init',
    deprecationReason: 'CLAUDE.md generation is now part of init',
  },
  {
    id: 'mcp-doctor',
    name: 'mcp-doctor',
    category: 'deprecated',
    description: 'commands.mcp-doctor.description',
    deprecated: true,
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'mcp doctor',
    deprecationReason: 'Use `ccjk mcp doctor` instead',
  },
  {
    id: 'mcp-profile',
    name: 'mcp-profile',
    category: 'deprecated',
    description: 'commands.mcp-profile.description',
    deprecated: true,
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'mcp profile',
    deprecationReason: 'Use `ccjk mcp profile` instead',
  },
  {
    id: 'mcp-market',
    name: 'mcp-market',
    category: 'deprecated',
    description: 'commands.mcp-market.description',
    deprecated: true,
    deprecatedIn: '3.9.0',
    removedIn: '4.0.0',
    replacement: 'mcp search',
    deprecationReason: 'Use `ccjk mcp search` instead',
  },
]

/**
 * Initialize the registry with all commands
 */
export function initializeRegistry(): void {
  // Register core commands
  for (const cmd of coreCommands) {
    commandRegistry.register(cmd)
  }

  // Register deprecated commands (for backward compatibility with warnings)
  for (const cmd of deprecatedCommands) {
    commandRegistry.register(cmd)
  }

  // TODO: Register config, tools, and advanced commands
}

// Auto-initialize on import
initializeRegistry()

/**
 * CCJK CLI Completion System
 *
 * Provides shell completion support for Bash, Zsh, Fish, and PowerShell.
 * Features:
 * - Command name completion
 * - Option completion (--lang, --force, etc.)
 * - Subcommand completion (mcp install, mcp list, etc.)
 * - File path completion
 * - Dynamic value completion (installed MCP services, etc.)
 */

import type { SupportedLang } from '../constants'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import ansis from 'ansis'
import { i18n } from '../i18n'

// ============================================================================
// Types
// ============================================================================

export type ShellType = 'bash' | 'zsh' | 'fish' | 'powershell'

export interface CommandInfo {
  name: string
  description: string
  aliases?: string[]
  options?: OptionInfo[]
  subcommands?: SubcommandInfo[]
}

export interface OptionInfo {
  flags: string
  description: string
  values?: string[] | (() => Promise<string[]>)
}

export interface SubcommandInfo {
  name: string
  description: string
  options?: OptionInfo[]
}

export interface CompletionProvider {
  getCommands(): CommandInfo[]
  getOptions(command: string): OptionInfo[]
  getSubcommands(command: string): SubcommandInfo[]
  getValues(command: string, option: string): Promise<string[]>
  generateScript(shell: ShellType): Promise<string>
}

export interface CompletionOptions {
  lang?: SupportedLang
}

// ============================================================================
// Command Registry for Completion
// ============================================================================

const COMPLETION_COMMANDS: CommandInfo[] = [
  // Core Commands
  {
    name: 'init',
    description: 'Initialize Claude Code configuration',
    aliases: ['i'],
    options: [
      { flags: '--lang, -l', description: 'Display language', values: ['zh-CN', 'en'] },
      { flags: '--config-lang, -c', description: 'Configuration language', values: ['zh-CN', 'en'] },
      { flags: '--force, -f', description: 'Force overwrite' },
      { flags: '--skip-prompt, -s', description: 'Skip prompts' },
      { flags: '--code-type, -T', description: 'Code tool type', values: ['claude-code', 'codex', 'aider', 'continue', 'cline', 'cursor'] },
    ],
  },
  {
    name: 'update',
    description: 'Update Claude Code prompts',
    aliases: ['u'],
    options: [
      { flags: '--lang, -l', description: 'Display language', values: ['zh-CN', 'en'] },
      { flags: '--config-lang, -c', description: 'Configuration language', values: ['zh-CN', 'en'] },
    ],
  },
  {
    name: 'doctor',
    description: 'Run environment health check',
    options: [
      { flags: '--check-providers', description: 'Check API provider health' },
      { flags: '--code-type, -T', description: 'Code tool type', values: ['claude-code', 'codex'] },
      { flags: '--fix-settings', description: 'Fix settings.json validation issues' },
    ],
  },
  {
    name: 'help',
    description: 'Show help and quick reference',
    aliases: ['h', '?'],
  },

  // MCP Commands
  {
    name: 'mcp',
    description: 'MCP Server management',
    options: [
      { flags: '--verbose, -v', description: 'Verbose output' },
      { flags: '--dry-run, -d', description: 'Preview changes' },
    ],
    subcommands: [
      { name: 'status', description: 'Quick MCP status overview' },
      { name: 'doctor', description: 'Health check and diagnostics' },
      { name: 'profile', description: 'Switch profile (minimal/dev/full)' },
      { name: 'release', description: 'Release idle services' },
      { name: 'market', description: 'MCP service marketplace' },
      { name: 'list', description: 'List installed services' },
      { name: 'search', description: 'Search MCP services' },
      { name: 'install', description: 'Install MCP service' },
      { name: 'uninstall', description: 'Uninstall MCP service' },
      { name: 'help', description: 'Show MCP help' },
    ],
  },

  // Browser Commands
  {
    name: 'browser',
    description: 'Agent Browser management',
    aliases: ['ab'],
    options: [
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    subcommands: [
      { name: 'install', description: 'Install Agent Browser' },
      { name: 'uninstall', description: 'Uninstall Agent Browser' },
      { name: 'status', description: 'Show browser status' },
      { name: 'start', description: 'Start browser session' },
      { name: 'stop', description: 'Stop browser session' },
      { name: 'config', description: 'Configure browser' },
    ],
  },

  // Skills Commands
  {
    name: 'skills',
    description: 'Manage CCJK skills',
    aliases: ['sk'],
    options: [
      { flags: '--category, -c', description: 'Filter by category' },
      { flags: '--show-disabled', description: 'Show disabled skills' },
      { flags: '--format, -f', description: 'Output format', values: ['table', 'json', 'list'] },
      { flags: '--batch', description: 'Batch create skills' },
    ],
    subcommands: [
      { name: 'list', description: 'List all skills' },
      { name: 'run', description: 'Run a skill' },
      { name: 'info', description: 'Show skill info' },
      { name: 'create', description: 'Create a new skill' },
      { name: 'enable', description: 'Enable a skill' },
      { name: 'disable', description: 'Disable a skill' },
      { name: 'delete', description: 'Delete a skill' },
    ],
  },

  // Config Commands
  {
    name: 'config',
    description: 'Manage CCJK configuration',
    options: [
      { flags: '--format, -f', description: 'Output format', values: ['table', 'json', 'yaml'] },
      { flags: '--global, -g', description: 'Use global config' },
    ],
    subcommands: [
      { name: 'list', description: 'List all configuration' },
      { name: 'get', description: 'Get configuration value' },
      { name: 'set', description: 'Set configuration value' },
      { name: 'unset', description: 'Unset configuration value' },
      { name: 'reset', description: 'Reset configuration' },
      { name: 'edit', description: 'Edit configuration file' },
      { name: 'validate', description: 'Validate configuration' },
    ],
  },

  // Agent Commands
  {
    name: 'agent',
    description: 'Manage AI agents',
    aliases: ['ag'],
    options: [
      { flags: '--template, -t', description: 'Use agent template' },
      { flags: '--skills, -s', description: 'Comma-separated skill IDs' },
      { flags: '--mcp, -m', description: 'Comma-separated MCP servers' },
      { flags: '--persona, -p', description: 'Custom persona' },
      { flags: '--json', description: 'Output as JSON' },
    ],
    subcommands: [
      { name: 'list', description: 'List agents' },
      { name: 'create', description: 'Create agent' },
      { name: 'delete', description: 'Delete agent' },
      { name: 'run', description: 'Run agent' },
      { name: 'info', description: 'Show agent info' },
    ],
  },

  // Interview Commands
  {
    name: 'interview',
    description: 'Interview-Driven Development',
    aliases: ['iv'],
    options: [
      { flags: '--template, -t', description: 'Interview template' },
      { flags: '--depth, -d', description: 'Interview depth', values: ['quick', 'standard', 'deep'] },
      { flags: '--resume, -r', description: 'Resume session' },
      { flags: '--list', description: 'List sessions' },
    ],
  },

  // Commit Command
  {
    name: 'commit',
    description: 'Smart git commit',
    options: [
      { flags: '--auto, -a', description: 'Auto-generate message' },
      { flags: '--dry-run, -d', description: 'Preview only' },
      { flags: '--message, -m', description: 'Custom message' },
    ],
  },

  // Providers Commands
  {
    name: 'providers',
    description: 'Manage API providers',
    options: [
      { flags: '--format, -f', description: 'Output format', values: ['table', 'json'] },
      { flags: '--code-type, -T', description: 'Code tool type' },
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    subcommands: [
      { name: 'list', description: 'List providers' },
      { name: 'add', description: 'Add provider' },
      { name: 'remove', description: 'Remove provider' },
      { name: 'switch', description: 'Switch provider' },
    ],
  },

  // Thinking Commands
  {
    name: 'thinking',
    description: 'Thinking Mode (Opus 4.5+ extended reasoning)',
    aliases: ['think'],
    options: [
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    subcommands: [
      { name: 'enable', description: 'Enable thinking mode' },
      { name: 'disable', description: 'Disable thinking mode' },
      { name: 'status', description: 'Show thinking mode status' },
      { name: 'config', description: 'Configure thinking mode' },
    ],
  },

  // Postmortem Commands
  {
    name: 'postmortem',
    description: 'Postmortem Intelligence',
    aliases: ['pm'],
    options: [
      { flags: '--severity', description: 'Filter by severity', values: ['critical', 'high', 'medium', 'low'] },
      { flags: '--category', description: 'Filter by category' },
      { flags: '--status', description: 'Filter by status' },
      { flags: '--staged', description: 'Check staged files only' },
      { flags: '--ci', description: 'CI mode' },
    ],
    subcommands: [
      { name: 'init', description: 'Initialize system' },
      { name: 'generate', description: 'Generate from commits' },
      { name: 'list', description: 'List all reports' },
      { name: 'show', description: 'Show report details' },
      { name: 'check', description: 'Check code for issues' },
      { name: 'sync', description: 'Sync to CLAUDE.md' },
      { name: 'stats', description: 'Show statistics' },
    ],
  },

  // Session Commands
  {
    name: 'session',
    description: 'Session management',
    options: [
      { flags: '--name, -n', description: 'Session name' },
    ],
    subcommands: [
      { name: 'save', description: 'Save session' },
      { name: 'restore', description: 'Restore session' },
      { name: 'list', description: 'List sessions' },
      { name: 'delete', description: 'Delete session' },
      { name: 'resume', description: 'Resume session' },
    ],
  },

  // Context Commands
  {
    name: 'context',
    description: 'Context management',
    aliases: ['ctx'],
    options: [
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    subcommands: [
      { name: 'analyze', description: 'Analyze context' },
      { name: 'compress', description: 'Compress context' },
      { name: 'optimize', description: 'Optimize context' },
      { name: 'status', description: 'Show context status' },
    ],
  },

  // Cloud Commands
  {
    name: 'cloud',
    description: 'Cloud sync',
    aliases: ['c'],
    options: [
      { flags: '--dry-run, -d', description: 'Preview changes' },
      { flags: '--force, -f', description: 'Force sync' },
    ],
    subcommands: [
      { name: 'skills', description: 'Sync custom skills' },
      { name: 'agents', description: 'Sync AI agents' },
      { name: 'plugins', description: 'Plugin marketplace' },
    ],
  },

  // System Commands
  {
    name: 'system',
    description: 'System management',
    aliases: ['sys'],
    subcommands: [
      { name: 'setup', description: 'First-time setup' },
      { name: 'sync', description: 'Quick knowledge sync' },
      { name: 'versions', description: 'Check all versions' },
      { name: 'upgrade', description: 'Upgrade all components' },
      { name: 'permissions', description: 'Show permissions' },
      { name: 'config', description: 'Scan config files' },
      { name: 'workspace', description: 'Workspace diagnostics' },
    ],
  },

  // Completion Command (self-referential)
  {
    name: 'completion',
    description: 'Shell completion management',
    subcommands: [
      { name: 'install', description: 'Install completion script' },
      { name: 'uninstall', description: 'Uninstall completion script' },
      { name: 'show', description: 'Show completion script' },
    ],
  },

  // Other Commands
  { name: 'ccr', description: 'Configure Claude Code Router' },
  { name: 'ccu', description: 'Claude Code usage analysis' },
  { name: 'vim', description: 'Vim mode configuration' },
  { name: 'workflows', description: 'Manage workflows', aliases: ['wf'] },
  { name: 'stats', description: 'Usage statistics' },
  { name: 'uninstall', description: 'Remove CCJK configurations' },
  { name: 'check-updates', description: 'Check for updates', aliases: ['check'] },
  { name: 'config-switch', description: 'Switch configuration', aliases: ['cs'] },
]

// ============================================================================
// Completion Provider Implementation
// ============================================================================

class CCJKCompletionProvider implements CompletionProvider {
  getCommands(): CommandInfo[] {
    return COMPLETION_COMMANDS
  }

  getOptions(command: string): OptionInfo[] {
    const cmd = COMPLETION_COMMANDS.find(
      c => c.name === command || c.aliases?.includes(command),
    )
    return cmd?.options || []
  }

  getSubcommands(command: string): SubcommandInfo[] {
    const cmd = COMPLETION_COMMANDS.find(
      c => c.name === command || c.aliases?.includes(command),
    )
    return cmd?.subcommands || []
  }

  async getValues(command: string, option: string): Promise<string[]> {
    const cmd = COMPLETION_COMMANDS.find(
      c => c.name === command || c.aliases?.includes(command),
    )
    if (!cmd?.options)
      return []

    const opt = cmd.options.find(o => o.flags.includes(option))
    if (!opt?.values)
      return []

    if (typeof opt.values === 'function') {
      return await opt.values()
    }
    return opt.values
  }

  async generateScript(shell: ShellType): Promise<string> {
    switch (shell) {
      case 'bash':
        return await this.generateBashScript()
      case 'zsh':
        return await this.generateZshScript()
      case 'fish':
        return await this.generateFishScript()
      case 'powershell':
        return await this.generatePowerShellScript()
      default:
        throw new Error(`Unsupported shell: ${shell}`)
    }
  }

  private async generateBashScript(): Promise<string> {
    const { generateBashCompletion } = await import('./completions/bash')
    return generateBashCompletion(this.getCommands())
  }

  private async generateZshScript(): Promise<string> {
    const { generateZshCompletion } = await import('./completions/zsh')
    return generateZshCompletion(this.getCommands())
  }

  private async generateFishScript(): Promise<string> {
    const { generateFishCompletion } = await import('./completions/fish')
    return generateFishCompletion(this.getCommands())
  }

  private async generatePowerShellScript(): Promise<string> {
    const { generatePowerShellCompletion } = await import('./completions/powershell')
    return generatePowerShellCompletion(this.getCommands())
  }
}

// ============================================================================
// Dynamic Value Providers
// ============================================================================

/**
 * Get list of installed MCP services
 */
export async function getInstalledMcpServices(): Promise<string[]> {
  try {
    const { readMcpConfig } = await import('../utils/claude-config')
    const config = await readMcpConfig()
    return Object.keys(config?.mcpServers || {})
  }
  catch {
    return []
  }
}

/**
 * Get list of available skills
 */
export async function getAvailableSkills(): Promise<string[]> {
  try {
    const { getSkillRegistry } = await import('../brain/skill-registry')
    const registry = getSkillRegistry()
    const skills = registry.getAll()
    return skills.map(s => s.id)
  }
  catch {
    return []
  }
}

/**
 * Get list of available agents
 */
export async function getAvailableAgents(): Promise<string[]> {
  try {
    // Return hardcoded agent list for now
    const agents = [
      'typescript-cli-architect',
      'ccjk-i18n-specialist',
      'ccjk-tools-integration-specialist',
      'ccjk-config-architect',
    ]
    return agents
  }
  catch {
    return []
  }
}

// ============================================================================
// Completion Command Handler
// ============================================================================

const provider = new CCJKCompletionProvider()

/**
 * Install completion script for specified shell
 */
export async function installCompletion(shell: ShellType, options: CompletionOptions = {}): Promise<void> {
  const isZh = (options.lang || i18n.language) === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? `Installing ${shell} completion...` : `Installing ${shell} completion...`))

  const script = await provider.generateScript(shell)
  const installPath = getCompletionInstallPath(shell)

  if (!installPath) {
    console.log(ansis.red(isZh ? `Cannot determine install path for ${shell}` : `Cannot determine install path for ${shell}`))
    return
  }

  // Ensure directory exists
  const dir = join(installPath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Write completion script
  writeFileSync(installPath, script, 'utf-8')

  console.log(ansis.green(isZh ? `Completion script installed to: ${installPath}` : `Completion script installed to: ${installPath}`))
  console.log('')

  // Show activation instructions
  showActivationInstructions(shell, installPath, isZh)
}

/**
 * Uninstall completion script for specified shell
 */
export async function uninstallCompletion(shell: ShellType, options: CompletionOptions = {}): Promise<void> {
  const isZh = (options.lang || i18n.language) === 'zh-CN'
  const installPath = getCompletionInstallPath(shell)

  if (!installPath || !existsSync(installPath)) {
    console.log(ansis.yellow(isZh ? `No completion script found for ${shell}` : `No completion script found for ${shell}`))
    return
  }

  const { unlinkSync } = await import('node:fs')
  unlinkSync(installPath)

  console.log(ansis.green(isZh ? `Completion script removed: ${installPath}` : `Completion script removed: ${installPath}`))
}

/**
 * Show completion script for specified shell
 */
export async function showCompletion(shell: ShellType, _options: CompletionOptions = {}): Promise<void> {
  const script = await provider.generateScript(shell)
  console.log(script)
}

/**
 * Get completion install path for shell
 */
function getCompletionInstallPath(shell: ShellType): string | null {
  const home = homedir()

  switch (shell) {
    case 'bash':
      // Check for bash-completion directory
      if (existsSync('/etc/bash_completion.d')) {
        return '/etc/bash_completion.d/ccjk'
      }
      return join(home, '.bash_completion.d', 'ccjk')

    case 'zsh':
      // Check for oh-my-zsh or standard zsh completion
      const omzPath = join(home, '.oh-my-zsh', 'completions')
      if (existsSync(omzPath)) {
        return join(omzPath, '_ccjk')
      }
      return join(home, '.zsh', 'completions', '_ccjk')

    case 'fish':
      return join(home, '.config', 'fish', 'completions', 'ccjk.fish')

    case 'powershell':
      return join(home, 'Documents', 'PowerShell', 'Scripts', 'ccjk-completion.ps1')

    default:
      return null
  }
}

/**
 * Show activation instructions for shell
 */
function showActivationInstructions(shell: ShellType, installPath: string, isZh: boolean): void {
  console.log(ansis.bold(isZh ? 'Activation Instructions:' : 'Activation Instructions:'))
  console.log('')

  switch (shell) {
    case 'bash':
      console.log(ansis.dim(isZh ? 'Add the following to your ~/.bashrc:' : 'Add the following to your ~/.bashrc:'))
      console.log('')
      console.log(ansis.green(`  source ${installPath}`))
      console.log('')
      console.log(ansis.dim(isZh ? 'Then reload your shell:' : 'Then reload your shell:'))
      console.log(ansis.green('  source ~/.bashrc'))
      break

    case 'zsh':
      console.log(ansis.dim(isZh ? 'Add the following to your ~/.zshrc:' : 'Add the following to your ~/.zshrc:'))
      console.log('')
      console.log(ansis.green(`  fpath=(${join(installPath, '..')} $fpath)`))
      console.log(ansis.green('  autoload -Uz compinit && compinit'))
      console.log('')
      console.log(ansis.dim(isZh ? 'Then reload your shell:' : 'Then reload your shell:'))
      console.log(ansis.green('  source ~/.zshrc'))
      break

    case 'fish':
      console.log(ansis.dim(isZh ? 'Fish completions are automatically loaded.' : 'Fish completions are automatically loaded.'))
      console.log(ansis.dim(isZh ? 'Restart your shell or run:' : 'Restart your shell or run:'))
      console.log(ansis.green('  source ~/.config/fish/config.fish'))
      break

    case 'powershell':
      console.log(ansis.dim(isZh ? 'Add the following to your PowerShell profile:' : 'Add the following to your PowerShell profile:'))
      console.log('')
      console.log(ansis.green(`  . ${installPath}`))
      console.log('')
      console.log(ansis.dim(isZh ? 'To find your profile path, run:' : 'To find your profile path, run:'))
      console.log(ansis.green('  $PROFILE'))
      break
  }

  console.log('')
}

/**
 * Main completion command handler
 */
export async function completionCommand(
  action: string,
  shell?: string,
  options: CompletionOptions = {},
): Promise<void> {
  const isZh = (options.lang || i18n.language) === 'zh-CN'

  if (!action) {
    showCompletionHelp(isZh)
    return
  }

  const validShells: ShellType[] = ['bash', 'zsh', 'fish', 'powershell']

  switch (action) {
    case 'install':
      if (!shell || !validShells.includes(shell as ShellType)) {
        console.log(ansis.red(isZh
          ? `Please specify a valid shell: ${validShells.join(', ')}`
          : `Please specify a valid shell: ${validShells.join(', ')}`))
        return
      }
      await installCompletion(shell as ShellType, options)
      break

    case 'uninstall':
      if (!shell || !validShells.includes(shell as ShellType)) {
        console.log(ansis.red(isZh
          ? `Please specify a valid shell: ${validShells.join(', ')}`
          : `Please specify a valid shell: ${validShells.join(', ')}`))
        return
      }
      await uninstallCompletion(shell as ShellType, options)
      break

    case 'show':
      if (!shell || !validShells.includes(shell as ShellType)) {
        console.log(ansis.red(isZh
          ? `Please specify a valid shell: ${validShells.join(', ')}`
          : `Please specify a valid shell: ${validShells.join(', ')}`))
        return
      }
      await showCompletion(shell as ShellType, options)
      break

    default:
      showCompletionHelp(isZh)
  }
}

/**
 * Show completion help
 */
function showCompletionHelp(isZh: boolean): void {
  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'Shell Completion Commands' : 'Shell Completion Commands'))
  console.log(ansis.dim('-'.repeat(50)))
  console.log('')
  console.log(`  ${ansis.green('ccjk completion install <shell>')}`)
  console.log(`    ${ansis.dim(isZh ? 'Install completion script' : 'Install completion script')}`)
  console.log('')
  console.log(`  ${ansis.green('ccjk completion uninstall <shell>')}`)
  console.log(`    ${ansis.dim(isZh ? 'Uninstall completion script' : 'Uninstall completion script')}`)
  console.log('')
  console.log(`  ${ansis.green('ccjk completion show <shell>')}`)
  console.log(`    ${ansis.dim(isZh ? 'Show completion script' : 'Show completion script')}`)
  console.log('')
  console.log(ansis.bold(isZh ? 'Supported Shells:' : 'Supported Shells:'))
  console.log(`  ${ansis.yellow('bash')}       - Bash shell`)
  console.log(`  ${ansis.yellow('zsh')}        - Zsh shell`)
  console.log(`  ${ansis.yellow('fish')}       - Fish shell`)
  console.log(`  ${ansis.yellow('powershell')} - PowerShell`)
  console.log('')
  console.log(ansis.bold(isZh ? 'Examples:' : 'Examples:'))
  console.log(ansis.dim('  ccjk completion install bash'))
  console.log(ansis.dim('  ccjk completion install zsh'))
  console.log(ansis.dim('  ccjk completion show fish'))
  console.log('')
}

// Export provider for external use
export { provider as completionProvider }

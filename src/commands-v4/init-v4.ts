/**
 * CCJK v4.0.0 - Init Command
 *
 * Initialize Claude Code environment with comprehensive configuration
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface InitOptions extends GlobalOptions {
  force?: boolean
  skipPrompt?: boolean
  configLang?: 'zh-CN' | 'en'
  apiType?: string
  apiKey?: string
}

/**
 * Register the init command
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .alias('i')
    .description('Initialize Claude Code configuration')
    .option('-f, --force', 'Force overwrite existing configuration')
    .option('-s, --skip-prompt', 'Skip interactive prompts (use defaults)')
    .option('-c, --config-lang <lang>', 'Configuration language (zh-CN, en)')
    .option('-t, --api-type <type>', 'API authentication type (auth-token, api-key, ccr-proxy)')
    .option('-k, --api-key <key>', 'API key for authentication')
    .addHelpText('after', `

Examples:
  $ ccjk init                           # Interactive initialization
  $ ccjk init --skip-prompt             # Use default settings
  $ ccjk init --force                   # Overwrite existing config
  $ ccjk init --config-lang zh-CN       # Use Chinese configuration
  $ ccjk init --api-type api-key        # Specify API type

What it does:
  1. Detects your code tool (Claude Code, Codex, etc.)
  2. Configures API authentication
  3. Sets up MCP services
  4. Installs AI workflows and prompts
  5. Creates CLAUDE.md documentation
  6. Configures output styles and personalities
`)
    .action(async (options: InitOptions) => {
      // Lazy load the actual init implementation
      const { init } = await import('../commands/init')
      // Cast to any to avoid type conflicts between command versions
      await init(options as any)
    })
}

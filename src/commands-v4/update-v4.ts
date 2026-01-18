/**
 * CCJK v4.0.0 - Update Command
 *
 * Update Claude Code prompts and workflows
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface UpdateOptions extends GlobalOptions {
  configLang?: 'zh-CN' | 'en'
  aiOutputLang?: string
}

/**
 * Register the update command
 */
export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .alias('u')
    .description('Update Claude Code prompts and workflows')
    .option('-c, --config-lang <lang>', 'Configuration language (zh-CN, en)')
    .option('--ai-output-lang <lang>', 'AI output language preference')
    .addHelpText('after', `

Examples:
  $ ccjk update                        # Update all prompts and workflows
  $ ccjk update --config-lang zh-CN    # Update with Chinese configuration
  $ ccjk update --code-type codex      # Update for Codex

What it updates:
  ✓ AI workflow prompts
  ✓ Output style configurations
  ✓ CLAUDE.md documentation
  ✓ Git workflow templates
  ✓ Six-step workflow templates
  ✓ Agent configurations

Note:
  - Existing configurations are preserved
  - Backups are created automatically
  - Only new/changed files are updated
`)
    .action(async (options: UpdateOptions) => {
      const { update } = await import('../commands/update')
      await update({
        codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
        configLang: options.configLang,
        aiOutputLang: options.aiOutputLang,
      })
    })
}

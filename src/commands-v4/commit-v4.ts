/**
 * CCJK v4.0.0 - Commit Command
 *
 * Smart git commit with AI-generated messages
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface CommitOptions extends GlobalOptions {
  auto?: boolean
  dryRun?: boolean
  message?: string
}

/**
 * Register the commit command
 */
export function registerCommitCommand(program: Command): void {
  program
    .command('commit')
    .description('Smart git commit with AI-generated messages')
    .option('-a, --auto', 'Auto-generate commit message from changes')
    .option('-d, --dry-run', 'Preview commit message without committing')
    .option('-m, --message <msg>', 'Custom commit message')
    .addHelpText('after', `

Examples:
  $ ccjk commit                    # Interactive commit with AI suggestions
  $ ccjk commit --auto             # Auto-generate and commit
  $ ccjk commit --dry-run          # Preview message only
  $ ccjk commit -m "fix: bug"      # Use custom message

Features:
  ✓ AI-generated commit messages following Conventional Commits
  ✓ Analyzes git diff to understand changes
  ✓ Suggests appropriate commit type (feat, fix, docs, etc.)
  ✓ Generates detailed commit body
  ✓ Supports interactive editing

Commit Types:
  feat     - New feature
  fix      - Bug fix
  docs     - Documentation changes
  style    - Code style changes (formatting, etc.)
  refactor - Code refactoring
  perf     - Performance improvements
  test     - Adding or updating tests
  chore    - Maintenance tasks
`)
    .action(async (options: CommitOptions) => {
      const { commit } = await import('../commands/commit')
      await commit({
        auto: options.auto,
        dryRun: options.dryRun,
        message: options.message,
      })
    })
}

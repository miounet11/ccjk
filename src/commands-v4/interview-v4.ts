/**
 * CCJK v4.0.0 - Interview Command
 *
 * Interview-Driven Development (IDD)
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface InterviewOptions extends GlobalOptions {
  template?: string
  depth?: 'quick' | 'standard' | 'deep'
  resume?: boolean
  list?: boolean
}

/**
 * Register the interview command
 */
export function registerInterviewCommand(program: Command): void {
  program
    .command('interview [specFile]')
    .alias('iv')
    .description('Interview-Driven Development (IDD)')
    .option('-t, --template <template>', 'Interview template to use')
    .option('-d, --depth <depth>', 'Interview depth (quick, standard, deep)', 'standard')
    .option('-r, --resume', 'Resume previous interview session')
    .option('--list', 'List all interview sessions')
    .addHelpText('after', `

Examples:
  $ ccjk interview                    # Start interactive interview
  $ ccjk interview spec.md            # Interview from spec file
  $ ccjk interview -d quick           # Quick interview (5 questions)
  $ ccjk interview -d deep            # Deep interview (20+ questions)
  $ ccjk interview --resume           # Resume last session
  $ ccjk interview --list             # List all sessions

Interview Depths:
  quick    - 5-7 questions, 5-10 minutes
  standard - 10-15 questions, 15-20 minutes (default)
  deep     - 20+ questions, 30+ minutes

What is IDD?
  Interview-Driven Development is a methodology where AI interviews
  you about your requirements before writing code. This ensures:
  - Clear understanding of requirements
  - Better architecture decisions
  - Fewer iterations and rewrites
  - Comprehensive documentation

Process:
  1. AI asks clarifying questions
  2. You provide answers and context
  3. AI generates detailed specification
  4. AI implements based on spec
  5. Review and iterate
`)
    .action(async (specFile: string | undefined, options: InterviewOptions) => {
      const { interview, quickInterview, deepInterview, listInterviewSessions, resumeInterview } = await import('../commands/interview')

      if (options.list) {
        await listInterviewSessions()
      }
      else if (options.resume) {
        await resumeInterview()
      }
      else if (options.depth === 'quick') {
        await quickInterview(specFile, {
          specFile,
          depth: 'quick',
          resume: !!options.resume,
          lang: options.lang,
        })
      }
      else if (options.depth === 'deep') {
        await deepInterview(specFile, {
          specFile,
          depth: 'deep',
          resume: !!options.resume,
          lang: options.lang,
        })
      }
      else {
        await interview({
          specFile,
          depth: options.depth,
          template: options.template,
          resume: !!options.resume,
          lang: options.lang,
        })
      }
    })
}

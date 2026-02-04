/**
 * CAC Type Extensions
 * Extends the CAC Command type to support nested subcommands
 */

import type { CommandConfig } from 'cac'

declare module 'cac' {
  interface Command {
    /**
     * Add a sub-command to this command
     * @param rawName Command name with optional arguments
     * @param description Command description
     * @param config Command configuration
     */
    command(rawName: string, description?: string, config?: CommandConfig): Command
  }
}

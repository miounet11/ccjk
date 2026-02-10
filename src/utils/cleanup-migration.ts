import { existsSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'

/**
 * Clean up legacy zcf namespace artifacts.
 * Removes ~/.claude/commands/zcf/ and ~/.claude/agents/zcf/
 * to prevent duplicate skills/agents.
 *
 * The project was renamed from 'zcf' to 'ccjk' but the old namespace
 * directories may persist on disk, causing duplicate slash commands
 * in Claude Code.
 */
export function cleanupZcfNamespace(): { removed: string[] } {
  const removed: string[] = []
  const dirs = [
    join(homedir(), '.claude', 'commands', 'zcf'),
    join(homedir(), '.claude', 'agents', 'zcf'),
  ]
  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
      removed.push(dir)
    }
  }
  return { removed }
}

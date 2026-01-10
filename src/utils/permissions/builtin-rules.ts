/**
 * Built-in permission rules for common operations
 * Provides sensible defaults for Claude Code tool usage
 * @module permissions/builtin-rules
 */

import type { PermissionRule } from './types'

/**
 * Built-in permission rules
 * These rules provide sensible defaults for common operations
 *
 * Priority levels:
 * - 0-19: Low priority (general rules)
 * - 20-49: Medium priority (specific tool rules)
 * - 50-79: High priority (security-sensitive rules)
 * - 80-99: Critical priority (dangerous operations)
 * - 100+: Override priority (user-defined overrides)
 */
export const builtinRules: PermissionRule[] = [
  // ============================================================================
  // SAFE READ OPERATIONS (Auto-allow)
  // ============================================================================
  {
    pattern: 'Read',
    action: 'allow',
    priority: 10,
    reason: 'Reading files is safe and commonly needed',
    source: 'builtin',
  },
  {
    pattern: 'Grep',
    action: 'allow',
    priority: 10,
    reason: 'Searching files is safe and commonly needed',
    source: 'builtin',
  },
  {
    pattern: 'Glob',
    action: 'allow',
    priority: 10,
    reason: 'Finding files is safe and commonly needed',
    source: 'builtin',
  },

  // ============================================================================
  // SAFE WRITE OPERATIONS (Ask for confirmation)
  // ============================================================================
  {
    pattern: 'Write',
    action: 'ask',
    priority: 20,
    reason: 'Writing files should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'Edit',
    action: 'ask',
    priority: 20,
    reason: 'Editing files should be confirmed',
    source: 'builtin',
  },

  // ============================================================================
  // BASH COMMANDS - Safe operations
  // ============================================================================
  {
    pattern: 'Bash(npm install *)',
    action: 'allow',
    priority: 30,
    reason: 'npm install is safe for package management',
    source: 'builtin',
  },
  {
    pattern: 'Bash(npm *)',
    action: 'ask',
    priority: 25,
    reason: 'npm commands should be reviewed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(pnpm install *)',
    action: 'allow',
    priority: 30,
    reason: 'pnpm install is safe for package management',
    source: 'builtin',
  },
  {
    pattern: 'Bash(pnpm *)',
    action: 'ask',
    priority: 25,
    reason: 'pnpm commands should be reviewed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(yarn install *)',
    action: 'allow',
    priority: 30,
    reason: 'yarn install is safe for package management',
    source: 'builtin',
  },
  {
    pattern: 'Bash(yarn *)',
    action: 'ask',
    priority: 25,
    reason: 'yarn commands should be reviewed',
    source: 'builtin',
  },

  // ============================================================================
  // GIT OPERATIONS - Branch-specific rules
  // ============================================================================
  {
    pattern: 'Bash(git status*)',
    action: 'allow',
    priority: 30,
    reason: 'git status is safe and read-only',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git log*)',
    action: 'allow',
    priority: 30,
    reason: 'git log is safe and read-only',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git diff*)',
    action: 'allow',
    priority: 30,
    reason: 'git diff is safe and read-only',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git branch*)',
    action: 'allow',
    priority: 30,
    reason: 'git branch is safe for viewing branches',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git * main*)',
    action: 'ask',
    priority: 60,
    reason: 'Operations on main branch should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git * master*)',
    action: 'ask',
    priority: 60,
    reason: 'Operations on master branch should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git push*)',
    action: 'ask',
    priority: 50,
    reason: 'git push should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(git *)',
    action: 'ask',
    priority: 25,
    reason: 'git commands should be reviewed',
    source: 'builtin',
  },

  // ============================================================================
  // BUILD AND TEST COMMANDS
  // ============================================================================
  {
    pattern: 'Bash(npm run build*)',
    action: 'allow',
    priority: 30,
    reason: 'Build commands are safe',
    source: 'builtin',
  },
  {
    pattern: 'Bash(npm run test*)',
    action: 'allow',
    priority: 30,
    reason: 'Test commands are safe',
    source: 'builtin',
  },
  {
    pattern: 'Bash(npm test*)',
    action: 'allow',
    priority: 30,
    reason: 'Test commands are safe',
    source: 'builtin',
  },
  {
    pattern: 'Bash(pnpm run build*)',
    action: 'allow',
    priority: 30,
    reason: 'Build commands are safe',
    source: 'builtin',
  },
  {
    pattern: 'Bash(pnpm run test*)',
    action: 'allow',
    priority: 30,
    reason: 'Test commands are safe',
    source: 'builtin',
  },
  {
    pattern: 'Bash(pnpm test*)',
    action: 'allow',
    priority: 30,
    reason: 'Test commands are safe',
    source: 'builtin',
  },

  // ============================================================================
  // DANGEROUS OPERATIONS (Deny by default)
  // ============================================================================
  {
    pattern: 'Bash(rm -rf *)',
    action: 'deny',
    priority: 90,
    reason: 'rm -rf is dangerous and can delete important files',
    source: 'builtin',
  },
  {
    pattern: 'Bash(rm -r *)',
    action: 'ask',
    priority: 80,
    reason: 'Recursive deletion should be carefully reviewed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(sudo *)',
    action: 'deny',
    priority: 90,
    reason: 'sudo commands require elevated privileges and should not be automated',
    source: 'builtin',
  },
  {
    pattern: 'Bash(chmod 777 *)',
    action: 'deny',
    priority: 85,
    reason: 'chmod 777 is a security risk',
    source: 'builtin',
  },
  {
    pattern: 'Bash(curl * | bash*)',
    action: 'deny',
    priority: 90,
    reason: 'Piping curl to bash is dangerous',
    source: 'builtin',
  },
  {
    pattern: 'Bash(wget * | bash*)',
    action: 'deny',
    priority: 90,
    reason: 'Piping wget to bash is dangerous',
    source: 'builtin',
  },
  {
    pattern: 'Bash(* > /dev/null*)',
    action: 'ask',
    priority: 70,
    reason: 'Redirecting to /dev/null may hide important output',
    source: 'builtin',
  },

  // ============================================================================
  // SYSTEM OPERATIONS
  // ============================================================================
  {
    pattern: 'Bash(kill *)',
    action: 'ask',
    priority: 70,
    reason: 'Killing processes should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(pkill *)',
    action: 'ask',
    priority: 70,
    reason: 'Killing processes should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'Bash(reboot*)',
    action: 'deny',
    priority: 95,
    reason: 'System reboot should not be automated',
    source: 'builtin',
  },
  {
    pattern: 'Bash(shutdown*)',
    action: 'deny',
    priority: 95,
    reason: 'System shutdown should not be automated',
    source: 'builtin',
  },

  // ============================================================================
  // MCP TOOLS (Model Context Protocol)
  // ============================================================================
  {
    pattern: 'mcp__*',
    action: 'ask',
    priority: 20,
    reason: 'MCP tools should be reviewed',
    source: 'builtin',
  },

  // ============================================================================
  // NOTEBOOK OPERATIONS
  // ============================================================================
  {
    pattern: 'NotebookEdit',
    action: 'ask',
    priority: 20,
    reason: 'Notebook edits should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'mcp__ide__executeCode',
    action: 'ask',
    priority: 30,
    reason: 'Code execution should be confirmed',
    source: 'builtin',
  },

  // ============================================================================
  // WEB OPERATIONS
  // ============================================================================
  {
    pattern: 'WebFetch',
    action: 'allow',
    priority: 10,
    reason: 'Fetching web content is safe',
    source: 'builtin',
  },
  {
    pattern: 'WebSearch',
    action: 'allow',
    priority: 10,
    reason: 'Web search is safe',
    source: 'builtin',
  },

  // ============================================================================
  // BROWSER AUTOMATION
  // ============================================================================
  {
    pattern: 'mcp__Playwright__browser_navigate',
    action: 'allow',
    priority: 20,
    reason: 'Browser navigation is safe',
    source: 'builtin',
  },
  {
    pattern: 'mcp__Playwright__browser_click',
    action: 'ask',
    priority: 30,
    reason: 'Browser clicks should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'mcp__Playwright__browser_fill_form',
    action: 'ask',
    priority: 40,
    reason: 'Form filling should be confirmed',
    source: 'builtin',
  },
  {
    pattern: 'mcp__Playwright__*',
    action: 'ask',
    priority: 20,
    reason: 'Browser automation should be reviewed',
    source: 'builtin',
  },

  // ============================================================================
  // DEFAULT FALLBACK (Lowest priority)
  // ============================================================================
  {
    pattern: 'Bash(*)',
    action: 'ask',
    priority: 5,
    reason: 'Bash commands should be reviewed by default',
    source: 'builtin',
  },
  {
    pattern: '*',
    action: 'ask',
    priority: 0,
    reason: 'Unknown operations should be reviewed',
    source: 'builtin',
  },
]

/**
 * Get built-in rules filtered by action
 *
 * @param action - The action to filter by
 * @returns Array of rules with the specified action
 */
export function getBuiltinRulesByAction(action: 'allow' | 'deny' | 'ask'): PermissionRule[] {
  return builtinRules.filter(rule => rule.action === action)
}

/**
 * Get built-in rules for a specific tool
 *
 * @param tool - The tool name to filter by
 * @returns Array of rules matching the tool
 */
export function getBuiltinRulesForTool(tool: string): PermissionRule[] {
  return builtinRules.filter((rule) => {
    // Simple pattern matching
    const pattern = rule.pattern.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}$`, 'i')
    return regex.test(tool) || regex.test(`${tool}(`)
  })
}

/**
 * Get high-priority security rules
 *
 * @returns Array of security-critical rules (priority >= 80)
 */
export function getSecurityRules(): PermissionRule[] {
  return builtinRules.filter(rule => (rule.priority ?? 0) >= 80)
}

/**
 * Get safe auto-allow rules
 *
 * @returns Array of rules that auto-allow operations
 */
export function getSafeRules(): PermissionRule[] {
  return builtinRules.filter(rule => rule.action === 'allow')
}

import type { CodeToolType } from '../constants'
import type { StatusLineConfig } from '../types/config'
import { normalizeClaudeSettings as guardNormalize } from './claude-settings-guard'

export type ClaudeFamilyPermissionTier = 'safe' | 'standard' | 'yolo'

export interface ClaudeFamilyPermissionTierDefinition {
  id: ClaudeFamilyPermissionTier
  name: string
  allow: string[]
  deny: string[]
  defaultMode: 'default' | 'acceptEdits' | 'bypassPermissions'
  allowUnsandboxedCommands: boolean
  trustedOperatorMode: boolean
}

const COMMON_DENY_RULES = [
  'Bash(rm -rf /)',
  'Bash(rm -rf /*)',
  'Bash(rm -rf ~)',
  'Bash(rm -rf ~/*)',
  'Bash(rm -rf $HOME)',
  'Bash(rm -rf $HOME/*)',
  'Bash(rm -rf --no-preserve-root *)',
  'Bash(git push --force *)',
  'Bash(git push -f *)',
  'Bash(git push --force-with-lease *)',
  'Bash(git push --mirror *)',
  'Bash(npm publish *)',
  'Bash(npm publish)',
  'Bash(pnpm publish *)',
  'Bash(pnpm publish)',
  'Bash(yarn publish *)',
  'Bash(yarn publish)',
  'Bash(sudo *)',
  'Bash(su *)',
  'Bash(su)',
  'Bash(curl * | sh)',
  'Bash(curl * | bash)',
  'Bash(wget * | sh)',
  'Bash(wget * | bash)',
] as const

export const CLAUDE_FAMILY_PERMISSION_TIERS: Record<ClaudeFamilyPermissionTier, ClaudeFamilyPermissionTierDefinition> = {
  safe: {
    id: 'safe',
    name: 'Safe',
    allow: ['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch'],
    deny: [...COMMON_DENY_RULES],
    defaultMode: 'default',
    allowUnsandboxedCommands: false,
    trustedOperatorMode: false,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    allow: [
      'Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch',
      'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'NotebookRead',
      'TodoWrite', 'Task', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskOutput', 'TaskStop', 'TaskUpdate', 'Skill',
      'Bash(git status *)', 'Bash(git status)', 'Bash(git diff *)', 'Bash(git log *)', 'Bash(git show *)',
      'Bash(git add *)', 'Bash(git commit *)', 'Bash(git fetch *)', 'Bash(git pull *)', 'Bash(git push *)',
      'Bash(npm *)', 'Bash(pnpm *)', 'Bash(yarn *)', 'Bash(bun *)', 'Bash(npx *)', 'Bash(pnpx *)',
      'Bash(node *)', 'Bash(tsx *)', 'Bash(python *)', 'Bash(python3 *)', 'Bash(cargo *)', 'Bash(go *)',
      'Bash(ls *)', 'Bash(ls)', 'Bash(pwd)', 'Bash(rg *)', 'Bash(grep *)', 'Bash(find *)', 'Bash(cat *)',
      'Bash(head *)', 'Bash(tail *)', 'Bash(jq *)', 'Bash(curl *)', 'Bash(open *)', 'Bash(code *)',
      'Bash(clavue *)', 'Bash(claude *)', 'Bash(codex *)', 'Bash(ccjk *)',
    ],
    deny: [...COMMON_DENY_RULES],
    defaultMode: 'acceptEdits',
    allowUnsandboxedCommands: false,
    trustedOperatorMode: false,
  },
  yolo: {
    id: 'yolo',
    name: 'YOLO',
    allow: [
      'Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch',
      'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'NotebookRead',
      'TodoWrite', 'Task', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskOutput', 'TaskStop', 'TaskUpdate', 'Skill',
      'Bash',
    ],
    deny: [...COMMON_DENY_RULES],
    defaultMode: 'bypassPermissions',
    allowUnsandboxedCommands: true,
    trustedOperatorMode: true,
  },
}

export const TRUSTED_OPERATOR_ASK_RULES = COMMON_DENY_RULES

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function mergeStringArray(existing: unknown, additions: readonly string[]): string[] {
  const merged = stringArray(existing)
  for (const item of additions) {
    if (!merged.includes(item)) {
      merged.push(item)
    }
  }
  return merged
}

export function isValidStatusLineConfig(value: unknown): value is StatusLineConfig {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as StatusLineConfig).type === 'command'
    && typeof (value as StatusLineConfig).command === 'string',
  )
}

export interface ClaudeFamilySettingsNormalizeOptions {
  codeTool?: CodeToolType
}

export function normalizeClaudeFamilySettings<T extends Record<string, any>>(
  settings: T,
  options: ClaudeFamilySettingsNormalizeOptions = {},
): T {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return settings
  }

  // Crash-prevention whitelist (dirty keys / bad fileSuggestion / thinking migration)
  const guarded = guardNormalize(settings).settings as T
  settings = guarded

  const mutableSettings = settings as Record<string, unknown>
  if (options.codeTool === 'clavue' && mutableSettings.plansDirectory === '.claude/plans') {
    mutableSettings.plansDirectory = '.clavue/plans'
  }

  if (hasOwn(mutableSettings, 'statusLine')) {
    const statusLine = mutableSettings.statusLine
    if (
      statusLine
      && typeof statusLine === 'object'
      && !Array.isArray(statusLine)
      && typeof (statusLine as Record<string, unknown>).command === 'string'
    ) {
      mutableSettings.statusLine = {
        ...statusLine,
        type: 'command',
      }
    }
    else {
      delete mutableSettings.statusLine
    }
  }

  return settings
}

function allTierAllowRules(): Set<string> {
  const rules = new Set<string>()
  for (const tier of Object.values(CLAUDE_FAMILY_PERMISSION_TIERS)) {
    for (const rule of tier.allow) {
      rules.add(rule)
    }
  }
  return rules
}

function isLegacyPermissionRule(rule: string): boolean {
  return /^Bash\(.+:\*\)$/.test(rule)
    || /^(Read|Grep|Glob|LS|WebFetch|WebSearch|Edit|Write|NotebookEdit|MultiEdit|NotebookRead|TodoWrite|Task|Skill)\(\*\)$/.test(rule)
}

export function applyClaudeFamilyPermissionTier<T extends Record<string, any>>(
  settings: T,
  tierId: ClaudeFamilyPermissionTier,
  options: { reset?: boolean } = {},
): T {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return settings
  }

  const tier = CLAUDE_FAMILY_PERMISSION_TIERS[tierId]
  const mutableSettings = settings as Record<string, any>
  mutableSettings.permissions = mutableSettings.permissions && typeof mutableSettings.permissions === 'object' && !Array.isArray(mutableSettings.permissions)
    ? mutableSettings.permissions
    : {}

  const currentAllow = stringArray(mutableSettings.permissions.allow)
  const templateRules = allTierAllowRules()
  const customAllow = options.reset
    ? []
    : currentAllow.filter(rule => !templateRules.has(rule) && !isLegacyPermissionRule(rule))

  mutableSettings.permissions.allow = mergeStringArray(tier.allow, customAllow)
  mutableSettings.permissions.deny = [...tier.deny]
  mutableSettings.permissions.defaultMode = tier.defaultMode
  mutableSettings.permissions.trustedOperatorMode = tier.trustedOperatorMode
  mutableSettings.allowUnsandboxedCommands = tier.allowUnsandboxedCommands

  return settings
}

export function applyTrustedOperatorPermissions<T extends Record<string, any>>(settings: T): T {
  return applyClaudeFamilyPermissionTier(settings, 'yolo')
}
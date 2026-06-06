import type { CodeToolType } from '../constants'
import type { StatusLineConfig } from '../types/config'

export const TRUSTED_OPERATOR_ASK_RULES = [
  'Bash(git push:*)',
  'Bash(rm:*)',
  'Bash(rm -rf:*)',
  'Bash(git push --force:*)',
  'Bash(git reset --hard:*)',
  'Bash(npm publish:*)',
  'Bash(npm login:*)',
  'Bash(docker:*)',
  'Bash(kubectl:*)',
  'Bash(terraform apply:*)',
  'Bash(gh release:*)',
  'Bash(git tag:*)',
  'Bash(gh pr merge:*)',
] as const

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

export function applyTrustedOperatorPermissions<T extends Record<string, any>>(settings: T): T {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return settings
  }

  const mutableSettings = settings as Record<string, any>
  mutableSettings.permissions = mutableSettings.permissions && typeof mutableSettings.permissions === 'object' && !Array.isArray(mutableSettings.permissions)
    ? mutableSettings.permissions
    : {}

  mutableSettings.permissions.defaultMode = 'bypassPermissions'
  mutableSettings.permissions.trustedOperatorMode = true
  mutableSettings.permissions.ask = mergeStringArray(mutableSettings.permissions.ask, TRUSTED_OPERATOR_ASK_RULES)

  return settings
}
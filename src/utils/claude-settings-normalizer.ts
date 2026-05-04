import type { ClaudeSettings, StatusLineConfig } from '../types/config'

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key)
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

export function hasInvalidStatusLineConfig(settings: unknown): boolean {
  return Boolean(
    settings
    && typeof settings === 'object'
    && !Array.isArray(settings)
    && hasOwn(settings, 'statusLine')
    && !isValidStatusLineConfig((settings as ClaudeSettings).statusLine),
  )
}

/**
 * Keep Claude-family settings safe for both Claude Code and Clavue.
 *
 * Clavue rejects an incomplete statusLine object before startup. The historical
 * CCJK template used `statusLine: {}`, so repair that shape at every write site.
 */
export function normalizeClaudeFamilySettings<T extends Record<string, any>>(settings: T): T {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return settings
  }

  const mutableSettings = settings as Record<string, unknown>
  if (!hasOwn(mutableSettings, 'statusLine')) {
    return settings
  }

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
    return settings
  }

  delete mutableSettings.statusLine
  return settings
}

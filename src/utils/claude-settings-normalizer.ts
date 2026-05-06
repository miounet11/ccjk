import type { ClaudeSettings, StatusLineConfig } from '../types/config';

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
] as const;

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mergeStringArray(existing: unknown, additions: readonly string[]): string[] {
  const merged = stringArray(existing);
  for (const item of additions) {
    if (!merged.includes(item)) {
      merged.push(item);
    }
  }
  return merged;
}

function hasBroadBashPermission(settings: Record<string, any>): boolean {
  return stringArray(settings.permissions?.allow).some(permission => permission === 'Bash(*)' || permission === 'Bash(*:*)');
}

export function isValidStatusLineConfig(value: unknown): value is StatusLineConfig {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as StatusLineConfig).type === 'command'
    && typeof (value as StatusLineConfig).command === 'string',
  );
}

export function hasInvalidStatusLineConfig(settings: unknown): boolean {
  return Boolean(
    settings
    && typeof settings === 'object'
    && !Array.isArray(settings)
    && hasOwn(settings, 'statusLine')
    && !isValidStatusLineConfig((settings as ClaudeSettings).statusLine),
  );
}

/**
 * Keep Claude-family settings safe for both Claude Code and Clavue.
 *
 * Clavue rejects an incomplete statusLine object before startup. The historical
 * CCJK template used `statusLine: {}`, so repair that shape at every write site.
 */
export function normalizeClaudeFamilySettings<T extends Record<string, any>>(settings: T): T {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return settings;
  }

  const mutableSettings = settings as Record<string, unknown>;
  if (hasOwn(mutableSettings, 'statusLine')) {
    const statusLine = mutableSettings.statusLine;
    if (
      statusLine
      && typeof statusLine === 'object'
      && !Array.isArray(statusLine)
      && typeof (statusLine as Record<string, unknown>).command === 'string'
    ) {
      mutableSettings.statusLine = {
        ...statusLine,
        type: 'command',
      };
    }
    else {
      delete mutableSettings.statusLine;
    }
  }

  return settings;
}

export function applyTrustedOperatorPermissions<T extends Record<string, any>>(settings: T): T {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return settings;
  }

  const mutableSettings = settings as Record<string, any>;
  mutableSettings.permissions = mutableSettings.permissions && typeof mutableSettings.permissions === 'object' && !Array.isArray(mutableSettings.permissions)
    ? mutableSettings.permissions
    : {};

  mutableSettings.permissions.defaultMode = 'bypassPermissions';
  mutableSettings.permissions.trustedOperatorMode = true;
  mutableSettings.permissions.ask = mergeStringArray(mutableSettings.permissions.ask, TRUSTED_OPERATOR_ASK_RULES);

  return settings;
}

export function getBroadPermissionAutoModeWarning(settings: Record<string, any>): string | null {
  if (!hasBroadBashPermission(settings) || settings.permissions?.defaultMode) {
    return null;
  }

  return 'Broad Bash permissions are configured, but permissions.defaultMode is unset. The runtime may fall back to auto mode and ignore broad dangerous allow rules. Set permissions.defaultMode to bypassPermissions for an intentional trusted-operator setup.';
}

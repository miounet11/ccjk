import type { InstallationStatus } from './installer'
import { CLAUDE_DIR, ZCF_CONFIG_FILE } from '../constants'
import { ensureI18nInitialized } from '../i18n'
import { updateTomlConfig } from './ccjk-config'

/**
 * Installation method type
 * Note: 'local' is deprecated and kept only for backward compatibility
 */
export type InstallationMethod = 'global' | 'local' | 'none'

/**
 * Handle installation status - simplified since local installation is no longer supported
 * @deprecated Local installation handling has been removed. This function now only checks for global installation.
 */
export async function handleMultipleInstallations(
  status: InstallationStatus,
): Promise<InstallationMethod> {
  ensureI18nInitialized()

  // No installation found
  if (!status.hasGlobal) {
    return 'none'
  }

  // Global installation exists - use it and save to config
  updateTomlConfig(ZCF_CONFIG_FILE, {
    claudeCode: {
      installType: 'global',
    },
  } as any) // Type assertion for partial update

  return 'global'
}

/**
 * Get Claude Code configuration directory based on saved preference
 */
export function getClaudeCodeConfigDir(): string {
  // Always use standard Claude directory since we simplified the config structure
  return CLAUDE_DIR
}

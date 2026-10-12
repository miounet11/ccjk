import type { ClaudeSettings } from '../types/config'
import { ensureI18nInitialized, i18n } from '../i18n'
import { normalizeClaudeSettings } from './claude-settings-guard'

/**
 * Validate Claude settings configuration
 */
export function validateClaudeSettings(settings: any): settings is ClaudeSettings {
  ensureI18nInitialized()

  if (!settings || typeof settings !== 'object') {
    return false
  }

  // Validate model if present
  // Model field now only accepts built-in presets; default/custom handled via env
  if (settings.model && !['opus', 'sonnet', 'sonnet[1m]'].includes(settings.model)) {
    console.log(i18n.t('errors:invalidModel', { model: settings.model }))
    return false
  }

  // Validate env object if present
  if (settings.env) {
    if (typeof settings.env !== 'object') {
      console.log(i18n.t('errors:invalidEnvConfig'))
      return false
    }

    // Validate API configuration
    const { ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL } = settings.env

    if (ANTHROPIC_BASE_URL && typeof ANTHROPIC_BASE_URL !== 'string') {
      console.log(i18n.t('errors:invalidBaseUrl'))
      return false
    }

    if (ANTHROPIC_API_KEY && typeof ANTHROPIC_API_KEY !== 'string') {
      console.log(i18n.t('errors:invalidApiKeyConfig'))
      return false
    }

    if (ANTHROPIC_AUTH_TOKEN && typeof ANTHROPIC_AUTH_TOKEN !== 'string') {
      console.log(i18n.t('errors:invalidAuthTokenConfig'))
      return false
    }
  }

  // Validate permissions if present
  if (settings.permissions) {
    if (typeof settings.permissions !== 'object') {
      console.log(i18n.t('errors:invalidPermissionsConfig'))
      return false
    }

    if (settings.permissions.allow && !Array.isArray(settings.permissions.allow)) {
      console.log(i18n.t('errors:invalidPermissionsAllow'))
      return false
    }

    if (settings.permissions.deny && !Array.isArray(settings.permissions.deny)) {
      console.log(i18n.t('errors:invalidPermissionsAllow'))
      return false
    }
  }

  return true
}

/**
 * Sanitize and fix common configuration issues
 */
/**
 * Sanitize and fix common configuration issues.
 * Uses Claude Settings Guard (whitelist + migrations).
 */
export function sanitizeClaudeSettings(settings: any): ClaudeSettings {
  if (!settings || typeof settings !== 'object') {
    return {}
  }
  const { settings: cleaned } = normalizeClaudeSettings(settings)
  return cleaned
}


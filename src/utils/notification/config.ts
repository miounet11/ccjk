/**
 * CCJK Notification System - Configuration Management
 *
 * Handles loading, saving, and managing notification configuration.
 * Configuration is stored in ~/.ccjk/config.toml under [notification] section.
 */

import type {
  ChannelConfigs,
  CloudChannelConfig,
  ConfigValidationResult,
  NotificationChannel,
  NotificationConfig,
  QuietHoursConfig,
} from './types'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import { writeFileAtomic } from '../fs-operations'
import {
  decryptToken,
  encryptToken,
  generateDeviceToken,
  isValidTokenFormat,
  maskToken,
} from './token'
import {
  DEFAULT_NOTIFICATION_CONFIG,
  validateNotificationConfig,
} from './types'

// ============================================================================
// Constants
// ============================================================================

/** CCJK config directory */
const CCJK_CONFIG_DIR = path.join(os.homedir(), '.ccjk')

/** Main config file path */
const CONFIG_FILE_PATH = path.join(CCJK_CONFIG_DIR, 'config.toml')

/** Notification secrets file (encrypted tokens, etc.) */
const SECRETS_FILE_PATH = path.join(CCJK_CONFIG_DIR, '.notification-secrets')

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Load notification configuration from config.toml
 *
 * @returns Notification configuration
 */
export async function loadNotificationConfig(): Promise<NotificationConfig> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CCJK_CONFIG_DIR)) {
      fs.mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
    }

    // Check if config file exists
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      return { ...DEFAULT_NOTIFICATION_CONFIG }
    }

    // Read and parse config file
    const configContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
    const config = parseToml(configContent) as Record<string, unknown>

    // Extract notification section
    const notificationConfig = config.notification as Partial<NotificationConfig> | undefined

    if (!notificationConfig) {
      return { ...DEFAULT_NOTIFICATION_CONFIG }
    }

    // Load encrypted token from secrets file
    const deviceToken = await loadDeviceToken()

    // Merge with defaults
    const quietHoursConfig = (notificationConfig.quietHours || {}) as Partial<QuietHoursConfig>
    const defaultQuietHours: QuietHoursConfig = DEFAULT_NOTIFICATION_CONFIG.quietHours || {
      enabled: false,
      startHour: 22,
      endHour: 8,
      timezone: 'local',
    }
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...notificationConfig,
      deviceToken: deviceToken || notificationConfig.deviceToken || '',
      channels: {
        ...DEFAULT_NOTIFICATION_CONFIG.channels,
        ...notificationConfig.channels,
      },
      quietHours: {
        enabled: quietHoursConfig.enabled ?? defaultQuietHours.enabled,
        startHour: quietHoursConfig.startHour ?? defaultQuietHours.startHour,
        endHour: quietHoursConfig.endHour ?? defaultQuietHours.endHour,
        timezone: quietHoursConfig.timezone ?? defaultQuietHours.timezone,
      },
    }
  }
  catch (error) {
    console.error('Failed to load notification config:', error)
    return { ...DEFAULT_NOTIFICATION_CONFIG }
  }
}

/**
 * Load device token from secrets file
 *
 * @returns Decrypted device token or null
 */
async function loadDeviceToken(): Promise<string | null> {
  try {
    if (!fs.existsSync(SECRETS_FILE_PATH)) {
      return null
    }

    const secretsContent = fs.readFileSync(SECRETS_FILE_PATH, 'utf-8')
    const secrets = JSON.parse(secretsContent) as { deviceToken?: string }

    if (!secrets.deviceToken) {
      return null
    }

    // Decrypt the token
    const decryptedToken = decryptToken(secrets.deviceToken)
    return decryptedToken
  }
  catch {
    return null
  }
}

// ============================================================================
// Configuration Saving
// ============================================================================

/**
 * Save notification configuration to config.toml
 *
 * @param config - Configuration to save
 */
export async function saveNotificationConfig(config: Partial<NotificationConfig>): Promise<void> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CCJK_CONFIG_DIR)) {
      fs.mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
    }

    // Load existing config
    let existingConfig: Record<string, unknown> = {}
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
      existingConfig = parseToml(configContent) as Record<string, unknown>
    }

    // Prepare notification config (without sensitive data)
    const notificationConfig = { ...config }

    // Remove device token from main config (stored separately)
    if (notificationConfig.deviceToken) {
      await saveDeviceToken(notificationConfig.deviceToken)
      delete notificationConfig.deviceToken
    }

    // Update notification section
    existingConfig.notification = {
      ...(existingConfig.notification as object || {}),
      ...notificationConfig,
    }

    // Write config file
    const tomlContent = stringifyToml(existingConfig as any)
    writeFileAtomic(CONFIG_FILE_PATH, tomlContent)
  }
  catch (error) {
    throw new Error(`Failed to save notification config: ${error}`)
  }
}

/**
 * Save device token to secrets file (encrypted)
 *
 * @param token - Device token to save
 */
async function saveDeviceToken(token: string): Promise<void> {
  try {
    // Encrypt the token
    const encryptedToken = encryptToken(token)

    // Load existing secrets
    let secrets: Record<string, unknown> = {}
    if (fs.existsSync(SECRETS_FILE_PATH)) {
      const secretsContent = fs.readFileSync(SECRETS_FILE_PATH, 'utf-8')
      secrets = JSON.parse(secretsContent)
    }

    // Update token
    secrets.deviceToken = encryptedToken
    secrets.updatedAt = new Date().toISOString()

    // Write secrets file with restricted permissions (atomic write)
    writeFileAtomic(SECRETS_FILE_PATH, JSON.stringify(secrets, null, 2), {
      encoding: 'utf-8',
      mode: 0o600, // Owner read/write only
    })
  }
  catch (error) {
    throw new Error(`Failed to save device token: ${error}`)
  }
}

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Initialize notification configuration
 *
 * Creates default configuration and generates a new device token if needed.
 *
 * @returns Initialized configuration
 */
export async function initializeNotificationConfig(): Promise<NotificationConfig> {
  const existingConfig = await loadNotificationConfig()

  // Generate new token if not exists or invalid
  if (!existingConfig.deviceToken || !isValidTokenFormat(existingConfig.deviceToken)) {
    existingConfig.deviceToken = generateDeviceToken()
    await saveNotificationConfig(existingConfig)
  }

  return existingConfig
}

/**
 * Update notification configuration
 *
 * @param updates - Configuration updates
 * @returns Updated configuration
 */
export async function updateNotificationConfig(
  updates: Partial<NotificationConfig>,
): Promise<NotificationConfig> {
  const currentConfig = await loadNotificationConfig()
  const updatesQuietHours = (updates.quietHours || {}) as Partial<QuietHoursConfig>
  const currentQuietHours: QuietHoursConfig = currentConfig.quietHours || {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: 'local',
  }
  const newConfig: NotificationConfig = {
    ...currentConfig,
    ...updates,
    channels: {
      ...currentConfig.channels,
      ...updates.channels,
    },
    quietHours: {
      enabled: updatesQuietHours.enabled ?? currentQuietHours.enabled,
      startHour: updatesQuietHours.startHour ?? currentQuietHours.startHour,
      endHour: updatesQuietHours.endHour ?? currentQuietHours.endHour,
      timezone: updatesQuietHours.timezone ?? currentQuietHours.timezone,
    },
  }

  await saveNotificationConfig(newConfig)
  return newConfig
}

/**
 * Reset notification configuration to defaults
 *
 * @param keepToken - Whether to keep the existing device token
 * @returns Reset configuration
 */
export async function resetNotificationConfig(keepToken: boolean = true): Promise<NotificationConfig> {
  const currentConfig = await loadNotificationConfig()
  const newConfig = {
    ...DEFAULT_NOTIFICATION_CONFIG,
    deviceToken: keepToken ? currentConfig.deviceToken : generateDeviceToken(),
  }

  await saveNotificationConfig(newConfig)
  return newConfig
}

// ============================================================================
// Channel Management
// ============================================================================

/**
 * Enable a notification channel
 *
 * @param channel - Channel to enable
 * @param config - Channel configuration
 */
export async function enableChannel(
  channel: NotificationChannel,
  config: ChannelConfigs[typeof channel],
): Promise<void> {
  const currentConfig = await loadNotificationConfig()

  currentConfig.channels[channel] = {
    ...config,
    enabled: true,
  } as any

  await saveNotificationConfig(currentConfig)
}

/**
 * Disable a notification channel
 *
 * @param channel - Channel to disable
 */
export async function disableChannel(channel: NotificationChannel): Promise<void> {
  const currentConfig = await loadNotificationConfig()

  if (currentConfig.channels[channel]) {
    (currentConfig.channels[channel] as any).enabled = false
    await saveNotificationConfig(currentConfig)
  }
}

/**
 * Get enabled notification channels
 *
 * @returns List of enabled channels
 */
export async function getEnabledChannels(): Promise<NotificationChannel[]> {
  const config = await loadNotificationConfig()
  const enabledChannels: NotificationChannel[] = []

  if (config.channels.feishu?.enabled) {
    enabledChannels.push('feishu')
  }
  if (config.channels.wechat?.enabled) {
    enabledChannels.push('wechat')
  }
  if (config.channels.email?.enabled) {
    enabledChannels.push('email')
  }
  if (config.channels.sms?.enabled) {
    enabledChannels.push('sms')
  }

  return enabledChannels
}

// ============================================================================
// Configuration Validation
// ============================================================================

/**
 * Validate current notification configuration
 *
 * @returns Validation result
 */
export async function validateCurrentConfig(): Promise<ConfigValidationResult> {
  const config = await loadNotificationConfig()
  return validateNotificationConfig(config)
}

// ============================================================================
// Configuration Display
// ============================================================================

/**
 * Get configuration summary for display
 *
 * @returns Configuration summary object
 */
export async function getConfigSummary(): Promise<{
  enabled: boolean
  deviceToken: string
  threshold: number
  enabledChannels: NotificationChannel[]
  quietHours: { enabled: boolean, hours?: string }
}> {
  const config = await loadNotificationConfig()
  const enabledChannels = await getEnabledChannels()

  return {
    enabled: config.enabled,
    deviceToken: maskToken(config.deviceToken),
    threshold: config.threshold,
    enabledChannels,
    quietHours: {
      enabled: config.quietHours?.enabled || false,
      hours: config.quietHours?.enabled
        ? `${config.quietHours.startHour}:00 - ${config.quietHours.endHour}:00`
        : undefined,
    },
  }
}

// ============================================================================
// Threshold Management
// ============================================================================

/**
 * Predefined threshold options (in minutes)
 */
export const THRESHOLD_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
] as const

/**
 * Set notification threshold
 *
 * @param minutes - Threshold in minutes
 */
export async function setThreshold(minutes: number): Promise<void> {
  if (minutes < 1) {
    throw new Error('Threshold must be at least 1 minute')
  }

  await updateNotificationConfig({ threshold: minutes })
}

// ============================================================================
// Quick Enable/Disable
// ============================================================================

/**
 * Enable notification system
 */
export async function enableNotifications(): Promise<void> {
  await updateNotificationConfig({ enabled: true })
}

/**
 * Disable notification system
 */
export async function disableNotifications(): Promise<void> {
  await updateNotificationConfig({ enabled: false })
}

/**
 * Toggle notification system
 *
 * @returns New enabled state
 */
export async function toggleNotifications(): Promise<boolean> {
  const config = await loadNotificationConfig()
  const newState = !config.enabled
  await updateNotificationConfig({ enabled: newState })
  return newState
}

// ============================================================================
// Channel Format Conversion
// ============================================================================

/**
 * Convert channels from local object format to cloud array format
 *
 * The local configuration stores channels as an object keyed by channel type,
 * while the cloud API expects an array of channel configurations.
 *
 * @param channels - Local channel configurations object
 * @returns Array of cloud channel configurations
 *
 * @example
 * ```typescript
 * const localChannels = {
 *   feishu: { enabled: true, webhookUrl: 'https://...' },
 *   email: { enabled: false, address: 'user@example.com' }
 * }
 * const cloudChannels = convertChannelsToCloudFormat(localChannels)
 * // Result: [
 * //   { type: 'feishu', enabled: true, config: { webhookUrl: 'https://...' } },
 * //   { type: 'email', enabled: false, config: { address: 'user@example.com' } }
 * // ]
 * ```
 */
export function convertChannelsToCloudFormat(channels: ChannelConfigs): CloudChannelConfig[] {
  const cloudChannels: CloudChannelConfig[] = []
  const channelTypes: NotificationChannel[] = ['feishu', 'wechat', 'email', 'sms']

  for (const type of channelTypes) {
    const channelConfig = channels[type]
    if (channelConfig) {
      // Extract enabled flag and remaining config properties
      const { enabled, ...config } = channelConfig
      cloudChannels.push({
        type,
        enabled,
        config: config as Record<string, unknown>,
      })
    }
  }

  return cloudChannels
}

/**
 * Convert channels from cloud array format back to local object format
 *
 * The cloud API returns channels as an array, which needs to be converted
 * back to the local object format keyed by channel type.
 *
 * @param cloudChannels - Array of cloud channel configurations
 * @returns Local channel configurations object
 *
 * @example
 * ```typescript
 * const cloudChannels = [
 *   { type: 'feishu', enabled: true, config: { webhookUrl: 'https://...' } },
 *   { type: 'email', enabled: false, config: { address: 'user@example.com' } }
 * ]
 * const localChannels = convertChannelsFromCloudFormat(cloudChannels)
 * // Result: {
 * //   feishu: { enabled: true, webhookUrl: 'https://...' },
 * //   email: { enabled: false, address: 'user@example.com' }
 * // }
 * ```
 */
export function convertChannelsFromCloudFormat(cloudChannels: CloudChannelConfig[]): ChannelConfigs {
  const channels: ChannelConfigs = {}

  for (const cloudChannel of cloudChannels) {
    const { type, enabled, config } = cloudChannel

    switch (type) {
      case 'feishu':
        channels.feishu = {
          enabled,
          webhookUrl: (config.webhookUrl as string) || '',
          ...(config.secret ? { secret: config.secret as string } : {}),
        }
        break
      case 'wechat':
        channels.wechat = {
          enabled,
          corpId: (config.corpId as string) || '',
          agentId: (config.agentId as string) || '',
          secret: (config.secret as string) || '',
        }
        break
      case 'email':
        channels.email = {
          enabled,
          address: (config.address as string) || '',
        }
        break
      case 'sms':
        channels.sms = {
          enabled,
          phone: (config.phone as string) || '',
          ...(config.countryCode ? { countryCode: config.countryCode as string } : {}),
        }
        break
    }
  }

  return channels
}

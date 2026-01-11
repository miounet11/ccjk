/**
 * CCJK Local Notification Service
 *
 * Provides local notification support for macOS using:
 * - macOS Shortcuts (when screen is unlocked)
 * - Bark push notifications (when screen is locked or as fallback)
 *
 * @module services/local-notification
 */

import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { writeFileAtomic } from '../utils/fs-operations'

const execAsync = promisify(exec)

// ============================================================================
// Types
// ============================================================================

/**
 * Notification options for sending notifications
 */
export interface NotificationOptions {
  /** Notification title */
  title: string
  /** Notification body/message */
  body: string
  /** Whether to play a sound (default: true) */
  sound?: boolean
  /** Optional URL to open when notification is clicked */
  url?: string
  /** Optional group identifier for notification grouping */
  group?: string
  /** Optional icon URL (for Bark) */
  icon?: string
}

/**
 * Local notification configuration stored in ~/.ccjk/notification-config.json
 */
export interface LocalNotificationConfig {
  /** macOS Shortcut name to run for local notifications */
  shortcutName: string
  /** Bark API URL (e.g., https://api.day.app/YOUR_KEY) */
  barkUrl: string
  /** Prefer local notification over Bark when screen is unlocked */
  preferLocal: boolean
  /** Enable smart notification (auto-detect screen lock status) */
  smartNotify: boolean
  /** Fallback to Bark if shortcut fails */
  fallbackToBark: boolean
}

/**
 * Notification result
 */
export interface LocalNotificationResult {
  /** Whether notification was sent successfully */
  success: boolean
  /** Method used to send notification */
  method: 'shortcut' | 'bark' | 'none'
  /** Error message if failed */
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

/** Default configuration */
const DEFAULT_CONFIG: LocalNotificationConfig = {
  shortcutName: 'ClaudeNotify',
  barkUrl: '',
  preferLocal: true,
  smartNotify: true,
  fallbackToBark: true,
}

/** Config file path */
const CONFIG_DIR = path.join(os.homedir(), '.ccjk')
const CONFIG_FILE = path.join(CONFIG_DIR, 'notification-config.json')

/** Temp file for shortcut input */
const TEMP_NOTIFICATION_FILE = '/tmp/ccjk-notification.json'

// ============================================================================
// LocalNotificationService Class
// ============================================================================

/**
 * Local Notification Service
 *
 * Provides intelligent notification delivery based on screen lock status.
 * Uses macOS Shortcuts when the screen is unlocked, and Bark push
 * notifications when the screen is locked.
 */
export class LocalNotificationService {
  private config: LocalNotificationConfig

  constructor(config?: Partial<LocalNotificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ==========================================================================
  // Screen Lock Detection
  // ==========================================================================

  /**
   * Check if the macOS screen is locked
   *
   * Uses Python with Quartz framework to detect screen lock status.
   *
   * @returns true if screen is locked, false otherwise
   */
  async isScreenLocked(): Promise<boolean> {
    // Only works on macOS
    if (process.platform !== 'darwin') {
      return false
    }

    try {
      const pythonScript = `
import Quartz
session_dict = Quartz.CGSessionCopyCurrentDictionary()
if session_dict:
    locked = session_dict.get('CGSSessionScreenIsLocked', False)
    print('true' if locked else 'false')
else:
    print('false')
`
      const { stdout } = await execAsync(`python3 -c "${pythonScript}"`, {
        timeout: 5000,
      })

      return stdout.trim().toLowerCase() === 'true'
    }
    catch (error) {
      // If detection fails, assume screen is not locked
      console.error('Failed to detect screen lock status:', error)
      return false
    }
  }

  // ==========================================================================
  // macOS Shortcut Notification
  // ==========================================================================

  /**
   * Send notification via macOS Shortcuts
   *
   * Creates a JSON file with notification data and runs the specified shortcut.
   * The shortcut should be configured to read the JSON and display a notification.
   *
   * @param shortcutName - Name of the macOS Shortcut to run
   * @param options - Notification options
   */
  async sendShortcutNotification(
    shortcutName: string,
    options: NotificationOptions,
  ): Promise<void> {
    // Only works on macOS
    if (process.platform !== 'darwin') {
      throw new Error('macOS Shortcuts are only available on macOS')
    }

    // Prepare notification data
    const notificationData = {
      title: options.title,
      body: options.body,
      sound: options.sound !== false,
      url: options.url || '',
      group: options.group || 'ccjk',
      timestamp: new Date().toISOString(),
    }

    // Write notification data to temp file
    writeFileAtomic(TEMP_NOTIFICATION_FILE, JSON.stringify(notificationData, null, 2), 'utf-8')

    try {
      // Run the shortcut with input file
      await execAsync(`shortcuts run "${shortcutName}" --input-path "${TEMP_NOTIFICATION_FILE}"`, {
        timeout: 30000, // 30 second timeout
      })
    }
    finally {
      // Clean up temp file
      try {
        if (fs.existsSync(TEMP_NOTIFICATION_FILE)) {
          fs.unlinkSync(TEMP_NOTIFICATION_FILE)
        }
      }
      catch {
        // Ignore cleanup errors
      }
    }
  }

  // ==========================================================================
  // Bark Push Notification
  // ==========================================================================

  /**
   * Send notification via Bark push service
   *
   * Bark is an iOS app that allows sending push notifications via HTTP API.
   * API format: https://api.day.app/YOUR_KEY/title/body
   *
   * @param barkUrl - Bark API URL (e.g., https://api.day.app/YOUR_KEY)
   * @param options - Notification options
   */
  async sendBarkNotification(
    barkUrl: string,
    options: NotificationOptions,
  ): Promise<void> {
    if (!barkUrl) {
      throw new Error('Bark URL is not configured')
    }

    // Build Bark API URL
    // URL encode title and body
    const encodedTitle = encodeURIComponent(options.title)
    const encodedBody = encodeURIComponent(options.body)

    // Build query parameters
    const params = new URLSearchParams()

    if (options.sound !== false) {
      params.append('sound', 'default')
    }

    if (options.url) {
      params.append('url', options.url)
    }

    if (options.group) {
      params.append('group', options.group)
    }

    if (options.icon) {
      params.append('icon', options.icon)
    }

    // Construct full URL
    const baseUrl = barkUrl.endsWith('/') ? barkUrl.slice(0, -1) : barkUrl
    let fullUrl = `${baseUrl}/${encodedTitle}/${encodedBody}`

    const queryString = params.toString()
    if (queryString) {
      fullUrl += `?${queryString}`
    }

    // Send request using curl (more reliable than fetch in some environments)
    try {
      await execAsync(`curl -s -o /dev/null -w "%{http_code}" "${fullUrl}"`, {
        timeout: 10000,
      })
    }
    catch (error) {
      throw new Error(`Failed to send Bark notification: ${error}`)
    }
  }

  // ==========================================================================
  // Smart Notification
  // ==========================================================================

  /**
   * Smart notification - automatically choose notification method
   *
   * Logic:
   * 1. If screen is unlocked and preferLocal is true, use macOS Shortcut
   * 2. If screen is locked or shortcut fails, use Bark
   * 3. If both fail, throw error
   *
   * @param options - Notification options
   * @returns Notification result
   */
  async smartNotify(options: NotificationOptions): Promise<LocalNotificationResult> {
    const isLocked = await this.isScreenLocked()

    // If screen is unlocked and we prefer local notifications
    if (!isLocked && this.config.preferLocal && this.config.shortcutName) {
      try {
        await this.sendShortcutNotification(this.config.shortcutName, options)
        return {
          success: true,
          method: 'shortcut',
        }
      }
      catch (error) {
        // If fallback is enabled and Bark is configured, try Bark
        if (this.config.fallbackToBark && this.config.barkUrl) {
          try {
            await this.sendBarkNotification(this.config.barkUrl, options)
            return {
              success: true,
              method: 'bark',
            }
          }
          catch (barkError) {
            return {
              success: false,
              method: 'none',
              error: `Shortcut failed: ${error}. Bark also failed: ${barkError}`,
            }
          }
        }

        return {
          success: false,
          method: 'none',
          error: `Shortcut notification failed: ${error}`,
        }
      }
    }

    // Screen is locked or we don't prefer local - use Bark
    if (this.config.barkUrl) {
      try {
        await this.sendBarkNotification(this.config.barkUrl, options)
        return {
          success: true,
          method: 'bark',
        }
      }
      catch (error) {
        return {
          success: false,
          method: 'none',
          error: `Bark notification failed: ${error}`,
        }
      }
    }

    // No Bark configured, try shortcut as last resort
    if (this.config.shortcutName) {
      try {
        await this.sendShortcutNotification(this.config.shortcutName, options)
        return {
          success: true,
          method: 'shortcut',
        }
      }
      catch (error) {
        return {
          success: false,
          method: 'none',
          error: `Shortcut notification failed: ${error}`,
        }
      }
    }

    return {
      success: false,
      method: 'none',
      error: 'No notification method configured',
    }
  }

  // ==========================================================================
  // Configuration Management
  // ==========================================================================

  /**
   * Update service configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<LocalNotificationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   *
   * @returns Current configuration
   */
  getConfig(): LocalNotificationConfig {
    return { ...this.config }
  }
}

// ============================================================================
// Configuration File Management
// ============================================================================

/**
 * Load local notification configuration from file
 *
 * @returns Configuration object
 */
export async function loadLocalNotificationConfig(): Promise<LocalNotificationConfig> {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG }
    }

    const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
    const config = JSON.parse(content) as Partial<LocalNotificationConfig>

    return {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }
  catch (error) {
    console.error('Failed to load local notification config:', error)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Save local notification configuration to file
 *
 * @param config - Configuration to save
 */
export async function saveLocalNotificationConfig(
  config: Partial<LocalNotificationConfig>,
): Promise<void> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }

    // Load existing config and merge
    const existingConfig = await loadLocalNotificationConfig()
    const newConfig = { ...existingConfig, ...config }

    // Write config file with atomic write for safety
    writeFileAtomic(CONFIG_FILE, JSON.stringify(newConfig, null, 2))
  }
  catch (error) {
    throw new Error(`Failed to save local notification config: ${error}`)
  }
}

/**
 * Reset local notification configuration to defaults
 */
export async function resetLocalNotificationConfig(): Promise<void> {
  await saveLocalNotificationConfig(DEFAULT_CONFIG)
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: LocalNotificationService | null = null

/**
 * Get or create the LocalNotificationService singleton instance
 *
 * @returns LocalNotificationService instance
 */
export async function getLocalNotificationService(): Promise<LocalNotificationService> {
  if (!serviceInstance) {
    const config = await loadLocalNotificationConfig()
    serviceInstance = new LocalNotificationService(config)
  }
  return serviceInstance
}

/**
 * Initialize the LocalNotificationService with fresh configuration
 *
 * @returns LocalNotificationService instance
 */
export async function initializeLocalNotificationService(): Promise<LocalNotificationService> {
  const config = await loadLocalNotificationConfig()
  serviceInstance = new LocalNotificationService(config)
  return serviceInstance
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if macOS Shortcuts is available
 *
 * @returns true if shortcuts command is available
 */
export async function isShortcutsAvailable(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return false
  }

  try {
    await execAsync('which shortcuts', { timeout: 5000 })
    return true
  }
  catch {
    return false
  }
}

/**
 * List available macOS Shortcuts
 *
 * @returns Array of shortcut names
 */
export async function listShortcuts(): Promise<string[]> {
  if (process.platform !== 'darwin') {
    return []
  }

  try {
    const { stdout } = await execAsync('shortcuts list', { timeout: 10000 })
    return stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }
  catch {
    return []
  }
}

/**
 * Validate Bark URL format
 *
 * @param url - URL to validate
 * @returns true if URL is valid Bark format
 */
export function isValidBarkUrl(url: string): boolean {
  if (!url) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  }
  catch {
    return false
  }
}

/**
 * Test Bark connection by sending a test notification
 *
 * @param barkUrl - Bark API URL
 * @returns true if test notification was sent successfully
 */
export async function testBarkConnection(barkUrl: string): Promise<boolean> {
  if (!isValidBarkUrl(barkUrl)) {
    return false
  }

  try {
    const service = new LocalNotificationService({ barkUrl, preferLocal: false })
    await service.sendBarkNotification(barkUrl, {
      title: 'CCJK Test',
      body: 'This is a test notification from CCJK.',
      sound: true,
      group: 'ccjk-test',
    })
    return true
  }
  catch {
    return false
  }
}

/**
 * Test macOS Shortcut by running it with test data
 *
 * @param shortcutName - Name of the shortcut to test
 * @returns true if shortcut ran successfully
 */
export async function testShortcut(shortcutName: string): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return false
  }

  try {
    const service = new LocalNotificationService({ shortcutName, preferLocal: true })
    await service.sendShortcutNotification(shortcutName, {
      title: 'CCJK Test',
      body: 'This is a test notification from CCJK.',
      sound: true,
      group: 'ccjk-test',
    })
    return true
  }
  catch {
    return false
  }
}

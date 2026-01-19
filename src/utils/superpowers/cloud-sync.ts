/**
 * Superpowers Cloud Sync Module
 *
 * Provides cloud synchronization capabilities for Superpowers skills,
 * enabling users to sync their skills across devices and share with team members.
 *
 * Features:
 * - Bidirectional sync with conflict resolution
 * - Skill marketplace integration
 * - Offline mode support with caching
 * - Progress tracking and error recovery
 */

import type { CloudProvider, SyncableItem, SyncConfig, SyncResult } from '../../cloud-sync/types'
import type { SupportedLang } from '../../constants'
import { existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { createSyncEngine } from '../../cloud-sync/sync-engine'
import { i18n } from '../../i18n'
import { getSuperpowersPath } from './installer'

/**
 * Cloud sync configuration options
 */
export interface CloudSyncOptions {
  /** Language for user messages */
  lang: SupportedLang
  /** Cloud provider type */
  provider?: 'github-gist' | 'webdav' | 'local'
  /** Provider credentials */
  credentials?: {
    token?: string
    username?: string
    password?: string
  }
  /** Sync direction */
  direction?: 'push' | 'pull' | 'bidirectional'
  /** Enable verbose logging */
  verbose?: boolean
}

/**
 * Cloud sync result
 */
export interface CloudSyncResult {
  success: boolean
  message: string
  syncedSkills?: string[]
  conflicts?: string[]
  error?: string
}

/**
 * Skill update information
 */
export interface SkillUpdate {
  skillName: string
  currentVersion?: string
  latestVersion: string
  hasUpdate: boolean
}

/**
 * Cloud sync configuration storage
 */
interface CloudSyncConfig {
  provider: 'github-gist' | 'webdav' | 'local'
  credentials: Record<string, string>
  lastSyncAt?: string
  autoSync?: boolean
  syncInterval?: number
}

/**
 * Get cloud sync configuration file path
 */
function getCloudSyncConfigPath(): string {
  return join(homedir(), '.claude', 'superpowers-cloud-sync.json')
}

/**
 * Read cloud sync configuration
 */
export async function readCloudSyncConfig(): Promise<CloudSyncConfig | null> {
  try {
    const configPath = getCloudSyncConfigPath()
    if (!existsSync(configPath)) {
      return null
    }

    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content)
  }
  catch (error) {
    console.error('Failed to read cloud sync config:', error)
    return null
  }
}

/**
 * Write cloud sync configuration
 */
export async function writeCloudSyncConfig(config: CloudSyncConfig): Promise<void> {
  try {
    const configPath = getCloudSyncConfigPath()
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  }
  catch (error) {
    console.error('Failed to write cloud sync config:', error)
    throw error
  }
}

/**
 * Check if cloud sync is configured
 */
export async function isCloudSyncConfigured(): Promise<boolean> {
  const config = await readCloudSyncConfig()
  return config !== null && config.provider !== undefined
}

/**
 * Get list of local skills as syncable items
 */
async function getLocalSkillsAsSyncableItems(): Promise<SyncableItem[]> {
  const superpowersPath = getSuperpowersPath()
  const skillsDir = join(superpowersPath, 'skills')

  if (!existsSync(skillsDir)) {
    return []
  }

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })
    const skillDirs = entries.filter(e => e.isDirectory())

    const items: SyncableItem[] = []

    for (const dir of skillDirs) {
      const skillPath = join(skillsDir, dir.name)
      const manifestPath = join(skillPath, 'manifest.json')

      // Read skill manifest if exists
      let version = 1
      let description = ''

      if (existsSync(manifestPath)) {
        try {
          const manifestContent = await readFile(manifestPath, 'utf-8')
          const manifest = JSON.parse(manifestContent)
          // Parse version string to number (e.g., "1.0.0" -> 1)
          version = manifest.version ? Number.parseInt(manifest.version.split('.')[0]) || 1 : 1
          description = manifest.description || ''
        }
        catch {
          // Use defaults if manifest is invalid
        }
      }

      // Get file stats for lastModified
      const stats = await stat(skillPath)

      // Create syncable item
      const item: SyncableItem = {
        id: `skill-${dir.name}`,
        type: 'skills',
        name: dir.name,
        version,
        contentHash: '', // Will be calculated by sync engine
        lastModified: stats.mtime.toISOString(),
        content: '', // Will be populated during sync
        metadata: {
          skillPath,
          description,
        },
      }

      items.push(item)
    }

    return items
  }
  catch (error) {
    console.error('Failed to get local skills:', error)
    return []
  }
}

/**
 * Sync skills from cloud to local
 *
 * @param options - Cloud sync options
 * @returns Sync result with details
 */
export async function syncSkillsFromCloud(options: CloudSyncOptions): Promise<CloudSyncResult> {
  try {
    // Check if Superpowers is installed
    const superpowersPath = getSuperpowersPath()
    if (!existsSync(superpowersPath)) {
      return {
        success: false,
        message: i18n.t('superpowers:notInstalled'),
        error: 'Superpowers not installed',
      }
    }

    // Read cloud sync configuration
    const config = await readCloudSyncConfig()
    if (!config && !options.credentials) {
      return {
        success: false,
        message: i18n.t('superpowers:cloudSync.notConfigured'),
        error: 'Cloud sync not configured',
      }
    }

    // Prepare sync configuration
    const syncConfig: Partial<SyncConfig> = {
      provider: {
        type: (options.provider || config?.provider || 'github-gist') as CloudProvider,
        credentials: options.credentials || config?.credentials || {},
      },
      direction: options.direction || 'pull',
      verbose: options.verbose || false,
    }

    // Create sync engine
    const engine = createSyncEngine(syncConfig)

    // Initialize engine
    console.log(i18n.t('superpowers:cloudSync.initializing'))
    await engine.initialize()

    // Get local skills
    const localSkills = await getLocalSkillsAsSyncableItems()
    engine.setLocalItems(localSkills)

    // Perform sync
    console.log(i18n.t('superpowers:cloudSync.syncing'))
    const result: SyncResult = await engine.pull()

    // Stop engine
    await engine.stop()

    // Update last sync time
    if (config) {
      config.lastSyncAt = new Date().toISOString()
      await writeCloudSyncConfig(config)
    }

    return {
      success: result.success,
      message: result.success
        ? i18n.t('superpowers:cloudSync.syncSuccess', { count: result.pulled.length })
        : i18n.t('superpowers:cloudSync.syncFailed'),
      syncedSkills: result.pulled.map(item => item.name),
      conflicts: result.conflicts.map(c => c.itemId),
      error: result.errors.length > 0 ? result.errors[0].message : undefined,
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: i18n.t('superpowers:cloudSync.syncFailed'),
      error: errorMessage,
    }
  }
}

/**
 * Upload local skills to cloud
 *
 * @param options - Cloud sync options
 * @returns Sync result with details
 */
export async function uploadSkillToCloud(options: CloudSyncOptions): Promise<CloudSyncResult> {
  try {
    // Check if Superpowers is installed
    const superpowersPath = getSuperpowersPath()
    if (!existsSync(superpowersPath)) {
      return {
        success: false,
        message: i18n.t('superpowers:notInstalled'),
        error: 'Superpowers not installed',
      }
    }

    // Read cloud sync configuration
    const config = await readCloudSyncConfig()
    if (!config && !options.credentials) {
      return {
        success: false,
        message: i18n.t('superpowers:cloudSync.notConfigured'),
        error: 'Cloud sync not configured',
      }
    }

    // Prepare sync configuration
    const syncConfig: Partial<SyncConfig> = {
      provider: {
        type: (options.provider || config?.provider || 'github-gist') as CloudProvider,
        credentials: options.credentials || config?.credentials || {},
      },
      direction: options.direction || 'push',
      verbose: options.verbose || false,
    }

    // Create sync engine
    const engine = createSyncEngine(syncConfig)

    // Initialize engine
    console.log(i18n.t('superpowers:cloudSync.initializing'))
    await engine.initialize()

    // Get local skills
    const localSkills = await getLocalSkillsAsSyncableItems()
    engine.setLocalItems(localSkills)

    // Perform sync
    console.log(i18n.t('superpowers:cloudSync.uploading'))
    const result: SyncResult = await engine.push()

    // Stop engine
    await engine.stop()

    // Update last sync time
    if (config) {
      config.lastSyncAt = new Date().toISOString()
      await writeCloudSyncConfig(config)
    }

    return {
      success: result.success,
      message: result.success
        ? i18n.t('superpowers:cloudSync.uploadSuccess', { count: result.pushed.length })
        : i18n.t('superpowers:cloudSync.uploadFailed'),
      syncedSkills: result.pushed.map(item => item.name),
      conflicts: result.conflicts.map(c => c.itemId),
      error: result.errors.length > 0 ? result.errors[0].message : undefined,
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: i18n.t('superpowers:cloudSync.uploadFailed'),
      error: errorMessage,
    }
  }
}

/**
 * Check for skill updates from cloud
 *
 * @param options - Cloud sync options
 * @returns List of skills with available updates
 */
export async function checkSkillUpdates(options: CloudSyncOptions): Promise<SkillUpdate[]> {
  try {
    // Check if Superpowers is installed
    const superpowersPath = getSuperpowersPath()
    if (!existsSync(superpowersPath)) {
      return []
    }

    // Read cloud sync configuration
    const config = await readCloudSyncConfig()
    if (!config && !options.credentials) {
      return []
    }

    // Prepare sync configuration
    const syncConfig: Partial<SyncConfig> = {
      provider: {
        type: (options.provider || config?.provider || 'github-gist') as CloudProvider,
        credentials: options.credentials || config?.credentials || {},
      },
      direction: 'pull',
      verbose: options.verbose || false,
    }

    // Create sync engine
    const engine = createSyncEngine(syncConfig)

    // Initialize engine
    await engine.initialize()

    // Get local skills
    const localSkills = await getLocalSkillsAsSyncableItems()
    engine.setLocalItems(localSkills)

    // Get remote items by performing a pull operation
    const result: SyncResult = await engine.pull()

    // Stop engine
    await engine.stop()

    // Compare versions
    const updates: SkillUpdate[] = []

    for (const localSkill of localSkills) {
      const remoteSkill = result.pulled.find(r => r.id === localSkill.id)

      if (remoteSkill) {
        const hasUpdate = remoteSkill.version !== localSkill.version
          && remoteSkill.lastModified > localSkill.lastModified

        updates.push({
          skillName: localSkill.name,
          currentVersion: localSkill.version.toString(),
          latestVersion: remoteSkill.version.toString(),
          hasUpdate,
        })
      }
    }

    return updates.filter(u => u.hasUpdate)
  }
  catch (error) {
    console.error('Failed to check skill updates:', error)
    return []
  }
}

/**
 * Configure cloud sync settings
 *
 * @param provider - Cloud provider type
 * @param credentials - Provider credentials
 * @param options - Additional options
 */
export async function configureCloudSync(
  provider: 'github-gist' | 'webdav' | 'local',
  credentials: Record<string, string>,
  options?: {
    autoSync?: boolean
    syncInterval?: number
  },
): Promise<void> {
  const config: CloudSyncConfig = {
    provider,
    credentials,
    autoSync: options?.autoSync || false,
    syncInterval: options?.syncInterval || 3600000, // 1 hour default
  }

  await writeCloudSyncConfig(config)
}

/**
 * Get cloud sync status
 */
export async function getCloudSyncStatus(): Promise<{
  configured: boolean
  provider?: string
  lastSyncAt?: string
  autoSync?: boolean
}> {
  const config = await readCloudSyncConfig()

  if (!config) {
    return { configured: false }
  }

  return {
    configured: true,
    provider: config.provider,
    lastSyncAt: config.lastSyncAt,
    autoSync: config.autoSync,
  }
}

/**
 * Disable cloud sync
 */
export async function disableCloudSync(): Promise<void> {
  const configPath = getCloudSyncConfigPath()
  if (existsSync(configPath)) {
    const { rm } = await import('node:fs/promises')
    await rm(configPath, { force: true })
  }
}

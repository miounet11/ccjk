/**
 * Cloud Plugin Manager
 *
 * High-level manager that coordinates cloud client, cache, and recommendation engine
 */

import type { CloudApiResponse } from './cloud-client'
import type {
  CacheStats,
  CloudPlugin,
  PluginCategory,
  PluginInstallOptions,
  PluginInstallResult,
  PluginSearchParams,
  RecommendationResult,
} from './types'
import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import {
  CCJK_CLOUD_PLUGINS_CACHE_DIR,
  CCJK_CLOUD_PLUGINS_DIR,
  CCJK_CLOUD_PLUGINS_INSTALLED_DIR,
} from '../constants'
import { i18n } from '../i18n'
import { writeFileAtomic } from '../utils/fs-operations'
import { LocalPluginCache } from './cache'
import { CloudRecommendationClient } from './cloud-client'
import { RecommendationEngine } from './recommendation-engine'

// Singleton instance
let managerInstance: CloudPluginManager | null = null

/**
 * Get the singleton CloudPluginManager instance
 */
export function getCloudPluginManager(): CloudPluginManager {
  if (!managerInstance) {
    managerInstance = new CloudPluginManager()
  }
  return managerInstance
}

/**
 * CloudPluginManager - Main entry point for cloud plugin operations
 */
export class CloudPluginManager {
  private client: CloudRecommendationClient
  private cache: LocalPluginCache
  private engine: RecommendationEngine

  constructor() {
    this.ensureDirectories()
    this.client = new CloudRecommendationClient()
    this.cache = new LocalPluginCache()
    this.engine = new RecommendationEngine(this.client, this.cache)
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      CCJK_CLOUD_PLUGINS_DIR,
      CCJK_CLOUD_PLUGINS_CACHE_DIR,
      CCJK_CLOUD_PLUGINS_INSTALLED_DIR,
    ]

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  /**
   * Get plugin recommendations for current project
   */
  async getRecommendations(projectPath?: string): Promise<RecommendationResult> {
    return this.engine.getRecommendations(projectPath)
  }

  /**
   * Search for plugins
   */
  async searchPlugins(params: PluginSearchParams): Promise<CloudApiResponse<CloudPlugin[]>> {
    // Try cloud first
    const cloudResult = await this.client.searchPlugins(params)

    if (cloudResult.success && cloudResult.data) {
      // Update cache with search results
      this.cache.updateCache(cloudResult.data)
      return cloudResult
    }

    // Fallback to cache
    const cachedPlugins = this.cache.getCachedPlugins()
    let filtered = cachedPlugins

    if (params.query) {
      const query = params.query.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.en.toLowerCase().includes(query)
        || p.name['zh-CN'].toLowerCase().includes(query)
        || p.tags.some(t => t.toLowerCase().includes(query)),
      )
    }

    if (params.category) {
      filtered = filtered.filter(p => p.category === params.category)
    }

    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(p =>
        params.tags!.some(tag => p.tags.includes(tag)),
      )
    }

    // Sort
    if (params.sortBy) {
      filtered.sort((a, b) => {
        const order = params.order === 'asc' ? 1 : -1
        switch (params.sortBy) {
          case 'downloads':
            return (a.downloads - b.downloads) * order
          case 'rating':
            return (a.rating - b.rating) * order
          case 'updated':
            return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order
          case 'name':
            return a.name.en.localeCompare(b.name.en) * order
          default:
            return 0
        }
      })
    }

    // Pagination
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    return {
      success: true,
      data: paged,
    }
  }

  /**
   * Get plugin details
   */
  async getPlugin(id: string): Promise<CloudApiResponse<CloudPlugin>> {
    // Try cloud first
    const cloudResult = await this.client.getPlugin(id)

    if (cloudResult.success && cloudResult.data) {
      return cloudResult
    }

    // Fallback to cache
    const cached = this.cache.getCachedPlugin(id)
    if (cached) {
      return { success: true, data: cached }
    }

    return {
      success: false,
      error: i18n.t('cloudPlugins.errors.notFound'),
    }
  }

  /**
   * Get popular plugins
   */
  async getPopularPlugins(limit = 10): Promise<CloudApiResponse<CloudPlugin[]>> {
    const cloudResult = await this.client.getPopularPlugins(limit)

    if (cloudResult.success && cloudResult.data) {
      this.cache.updateCache(cloudResult.data)
      return cloudResult
    }

    // Fallback to cache, sorted by downloads
    const cached = this.cache.getCachedPlugins()
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit)

    return { success: true, data: cached }
  }

  /**
   * Get plugin categories
   */
  async getCategories(): Promise<CloudApiResponse<Array<{ id: PluginCategory, name: Record<string, string>, count: number }>>> {
    return this.client.getCategories()
  }

  /**
   * Install a plugin
   */
  async installPlugin(id: string, options: PluginInstallOptions = {}): Promise<PluginInstallResult> {
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id)

    // Check if already installed
    if (existsSync(installDir) && !options.force) {
      return {
        pluginId: id,
        success: false,
        error: 'Plugin already installed. Use --force to reinstall.',
      }
    }

    // Dry run
    if (options.dryRun) {
      return {
        pluginId: id,
        success: true,
        installedPath: installDir,
      }
    }

    try {
      // Get plugin info
      const pluginResult = await this.getPlugin(id)
      if (!pluginResult.success || !pluginResult.data) {
        return {
          pluginId: id,
          success: false,
          error: pluginResult.error || 'Plugin not found',
        }
      }

      const plugin = pluginResult.data

      // Download plugin content
      const downloadResult = await this.client.downloadPlugin(id)
      if (!downloadResult.success || !downloadResult.data) {
        return {
          pluginId: id,
          success: false,
          error: downloadResult.error || 'Failed to download plugin',
        }
      }

      // Create install directory
      if (existsSync(installDir)) {
        rmSync(installDir, { recursive: true })
      }
      mkdirSync(installDir, { recursive: true })

      // Save plugin metadata
      writeFileAtomic(
        join(installDir, 'plugin.json'),
        JSON.stringify(plugin, null, 2),
      )

      // Save plugin content
      const content = Buffer.from(downloadResult.data.content, 'base64').toString('utf-8')
      writeFileAtomic(join(installDir, 'content.json'), content)

      // Install dependencies if needed
      const installedDeps: string[] = []
      if (!options.skipDependencies && plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          const depResult = await this.installPlugin(dep, { skipDependencies: true })
          if (depResult.success) {
            installedDeps.push(dep)
          }
        }
      }

      return {
        pluginId: id,
        success: true,
        installedPath: installDir,
        dependencies: installedDeps,
      }
    }
    catch (error) {
      return {
        pluginId: id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(id: string): Promise<PluginInstallResult> {
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id)

    if (!existsSync(installDir)) {
      return {
        pluginId: id,
        success: false,
        error: 'Plugin not installed',
      }
    }

    try {
      rmSync(installDir, { recursive: true })
      return {
        pluginId: id,
        success: true,
      }
    }
    catch (error) {
      return {
        pluginId: id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get installed plugins
   */
  getInstalledPlugins(): CloudPlugin[] {
    if (!existsSync(CCJK_CLOUD_PLUGINS_INSTALLED_DIR)) {
      return []
    }

    const plugins: CloudPlugin[] = []
    const dirs = readdirSync(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const dir of dirs) {
      const metaPath = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, dir, 'plugin.json')
      if (existsSync(metaPath)) {
        try {
          const plugin = JSON.parse(readFileSync(metaPath, 'utf-8')) as CloudPlugin
          plugins.push(plugin)
        }
        catch {
          // Skip invalid plugins
        }
      }
    }

    return plugins
  }

  /**
   * Check if a plugin is installed
   */
  isPluginInstalled(id: string): boolean {
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id)
    return existsSync(join(installDir, 'plugin.json'))
  }

  /**
   * Update installed plugins
   */
  async updatePlugins(ids?: string[]): Promise<PluginInstallResult[]> {
    const installed = this.getInstalledPlugins()
    const toUpdate = ids
      ? installed.filter(p => ids.includes(p.id))
      : installed

    const results: PluginInstallResult[] = []

    for (const plugin of toUpdate) {
      // Check for updates
      const cloudResult = await this.getPlugin(plugin.id)
      if (cloudResult.success && cloudResult.data) {
        const cloudPlugin = cloudResult.data
        if (cloudPlugin.version !== plugin.version) {
          // Update available
          const result = await this.installPlugin(plugin.id, { force: true })
          results.push(result)
        }
        else {
          results.push({
            pluginId: plugin.id,
            success: true,
            installedPath: join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, plugin.id),
          })
        }
      }
    }

    return results
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getCacheStats()
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clearCache()
  }

  /**
   * Refresh cache from cloud
   */
  async refreshCache(): Promise<void> {
    const result = await this.client.getPopularPlugins(100)
    if (result.success && result.data) {
      this.cache.updateCache(result.data)
    }
  }

  /**
   * Get plugin info (alias for getPlugin with simplified return)
   */
  async getPluginInfo(id: string): Promise<CloudPlugin | null> {
    const result = await this.getPlugin(id)
    return result.success && result.data ? result.data : null
  }

  /**
   * Get featured/popular plugins
   */
  async getFeaturedPlugins(limit = 10): Promise<CloudPlugin[]> {
    const result = await this.getPopularPlugins(limit)
    return result.success && result.data ? result.data : []
  }

  /**
   * Update a single plugin
   */
  async updatePlugin(id: string): Promise<{
    success: boolean
    pluginId: string
    updated: boolean
    oldVersion?: string
    newVersion?: string
    error?: string
  }> {
    // Check if installed
    if (!this.isPluginInstalled(id)) {
      return {
        success: false,
        pluginId: id,
        updated: false,
        error: 'Plugin not installed',
      }
    }

    // Get current version
    const installDir = join(CCJK_CLOUD_PLUGINS_INSTALLED_DIR, id)
    const metaPath = join(installDir, 'plugin.json')
    let currentVersion = '0.0.0'

    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      currentVersion = meta.version || '0.0.0'
    }
    catch {
      // Ignore
    }

    // Check for updates
    const cloudResult = await this.getPlugin(id)
    if (!cloudResult.success || !cloudResult.data) {
      return {
        success: false,
        pluginId: id,
        updated: false,
        error: cloudResult.error || 'Failed to fetch plugin info',
      }
    }

    const cloudPlugin = cloudResult.data
    if (cloudPlugin.version === currentVersion) {
      return {
        success: true,
        pluginId: id,
        updated: false,
        oldVersion: currentVersion,
        newVersion: currentVersion,
      }
    }

    // Update
    const installResult = await this.installPlugin(id, { force: true })
    if (!installResult.success) {
      return {
        success: false,
        pluginId: id,
        updated: false,
        error: installResult.error,
      }
    }

    return {
      success: true,
      pluginId: id,
      updated: true,
      oldVersion: currentVersion,
      newVersion: cloudPlugin.version,
    }
  }

  /**
   * Update all installed plugins
   */
  async updateAllPlugins(): Promise<Array<{
    success: boolean
    pluginId: string
    updated: boolean
    oldVersion?: string
    newVersion?: string
    error?: string
  }>> {
    const installed = this.getInstalledPlugins()
    const results = []

    for (const plugin of installed) {
      const result = await this.updatePlugin(plugin.id)
      results.push(result)
    }

    return results
  }
}

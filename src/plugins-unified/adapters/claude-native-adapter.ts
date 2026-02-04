import type {
  InstallOptions,
  InstallResult,
  PluginSourceType,
  SearchOptions,
  UnifiedPlugin,
  UninstallResult,
  UpdateResult,
} from '../types'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BasePluginAdapter } from './base'

/**
 * Adapter for Claude Native Plugins
 * Manages locally installed Claude native plugins
 */
export class ClaudeNativeAdapter extends BasePluginAdapter {
  protected sourceType: PluginSourceType = 'native'
  private pluginsDir: string

  constructor() {
    super()
    // Use Claude's native plugins directory
    this.pluginsDir = path.join(os.homedir(), '.claude', 'plugins')
  }

  /**
   * Ensure plugins directory exists
   */
  private async ensurePluginsDir(): Promise<void> {
    try {
      await fs.mkdir(this.pluginsDir, { recursive: true })
    }
    catch (error) {
      console.error('Failed to create plugins directory:', error)
    }
  }

  /**
   * Read plugin manifest from directory
   */
  private async readPluginManifest(pluginDir: string): Promise<UnifiedPlugin | null> {
    try {
      const manifestPath = path.join(pluginDir, 'manifest.json')
      const content = await fs.readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(content)

      // Convert to unified format
      return {
        id: manifest.id || path.basename(pluginDir),
        name: manifest.name,
        version: manifest.version,
        source: 'native',
        description: manifest.description,
        author: manifest.author,
        category: manifest.category,
        status: 'installed',
        commands: manifest.commands,
        skills: manifest.skills,
        features: manifest.features,
        tags: manifest.tags,
        homepage: manifest.homepage,
        repository: manifest.repository,
        dependencies: manifest.dependencies,
        metadata: manifest.metadata,
        enabled: manifest.enabled ?? true,
        verified: manifest.verified ?? false,
        installedAt: manifest.installedAt,
        updatedAt: manifest.updatedAt,
        marketplace: 'native',
      }
    }
    catch (error) {
      console.error(`Failed to read manifest from ${pluginDir}:`, error)
      return null
    }
  }

  /**
   * Write plugin manifest to directory
   */
  private async writePluginManifest(pluginDir: string, plugin: UnifiedPlugin): Promise<void> {
    const manifestPath = path.join(pluginDir, 'manifest.json')
    const manifest = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      category: plugin.category,
      commands: plugin.commands,
      skills: plugin.skills,
      features: plugin.features,
      tags: plugin.tags,
      homepage: plugin.homepage,
      repository: plugin.repository,
      dependencies: plugin.dependencies,
      metadata: plugin.metadata,
      enabled: plugin.enabled,
      verified: plugin.verified,
      installedAt: plugin.installedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  }

  /**
   * Search for plugins (native plugins don't have a remote search)
   */
  async search(options: SearchOptions): Promise<UnifiedPlugin[]> {
    // For native plugins, we can only search installed ones
    const installed = await this.listInstalled()

    if (!options.query) {
      return installed
    }

    const query = options.query.toLowerCase()
    return installed.filter(plugin =>
      plugin.name.toLowerCase().includes(query)
      || plugin.description?.toLowerCase().includes(query)
      || plugin.tags?.some(tag => tag.toLowerCase().includes(query)),
    )
  }

  /**
   * Get a specific plugin by ID
   */
  async getPlugin(id: string): Promise<UnifiedPlugin | null> {
    await this.ensurePluginsDir()
    const pluginDir = path.join(this.pluginsDir, id)

    try {
      await fs.access(pluginDir)
      return await this.readPluginManifest(pluginDir)
    }
    catch {
      return null
    }
  }

  /**
   * Install a native plugin
   * For native plugins, this typically means copying files or creating a manifest
   */
  async install(id: string, options: InstallOptions = {}): Promise<InstallResult> {
    try {
      await this.ensurePluginsDir()

      // Check if already installed
      if (!options.force) {
        const isInstalled = await this.isInstalled(id)
        if (isInstalled) {
          return this.createInstallError('Plugin is already installed. Use force option to reinstall.')
        }
      }

      const pluginDir = path.join(this.pluginsDir, id)
      await fs.mkdir(pluginDir, { recursive: true })

      // Create a basic manifest
      const plugin: UnifiedPlugin = {
        id,
        name: id,
        version: options.version || '1.0.0',
        source: 'native',
        status: 'installed',
        enabled: options.autoEnable ?? true,
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await this.writePluginManifest(pluginDir, plugin)

      return {
        success: true,
        plugin,
      }
    }
    catch (error) {
      return this.createInstallError(
        error instanceof Error ? error.message : 'Failed to install plugin',
      )
    }
  }

  /**
   * Uninstall a native plugin
   */
  async uninstall(id: string): Promise<UninstallResult> {
    try {
      const pluginDir = path.join(this.pluginsDir, id)

      // Check if plugin exists
      try {
        await fs.access(pluginDir)
      }
      catch {
        return this.createUninstallError('Plugin is not installed')
      }

      // Remove plugin directory
      await fs.rm(pluginDir, { recursive: true, force: true })

      return { success: true }
    }
    catch (error) {
      return this.createUninstallError(
        error instanceof Error ? error.message : 'Failed to uninstall plugin',
      )
    }
  }

  /**
   * Update a native plugin
   */
  async update(id: string): Promise<UpdateResult> {
    try {
      const plugin = await this.getPlugin(id)
      if (!plugin) {
        return this.createUpdateError('Plugin is not installed')
      }

      // For native plugins, update typically means updating the manifest
      // In a real implementation, this would check for updates from a source
      const previousVersion = plugin.version
      const newVersion = previousVersion // No actual update for now

      plugin.updatedAt = new Date().toISOString()
      const pluginDir = path.join(this.pluginsDir, id)
      await this.writePluginManifest(pluginDir, plugin)

      return {
        success: true,
        previousVersion,
        newVersion,
        plugin,
      }
    }
    catch (error) {
      return this.createUpdateError(
        error instanceof Error ? error.message : 'Failed to update plugin',
      )
    }
  }

  /**
   * List all installed native plugins
   */
  async listInstalled(): Promise<UnifiedPlugin[]> {
    try {
      await this.ensurePluginsDir()
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true })

      const plugins: UnifiedPlugin[] = []
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const plugin = await this.readPluginManifest(
            path.join(this.pluginsDir, entry.name),
          )
          if (plugin) {
            plugins.push(plugin)
          }
        }
      }

      return plugins
    }
    catch (error) {
      console.error('Failed to list installed plugins:', error)
      return []
    }
  }

  /**
   * Check if a plugin is installed
   */
  async isInstalled(id: string): Promise<boolean> {
    try {
      const pluginDir = path.join(this.pluginsDir, id)
      await fs.access(pluginDir)
      return true
    }
    catch {
      return false
    }
  }
}

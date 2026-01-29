import type { UnifiedPlugin } from './types'

/**
 * Unified plugin registry
 */
export class UnifiedRegistry {
  private plugins: Map<string, UnifiedPlugin> = new Map()
  private commandIndex: Map<string, string> = new Map()
  private skillIndex: Map<string, string> = new Map()
  private featureIndex: Map<string, string> = new Map()

  /**
   * Register a plugin
   */
  async register(plugin: UnifiedPlugin): Promise<void> {
    this.plugins.set(plugin.name, plugin)

    // Index commands
    for (const cmd of plugin.commands || []) {
      this.commandIndex.set(cmd, plugin.name)
    }

    // Index skills
    for (const skill of plugin.skills || []) {
      this.skillIndex.set(skill, plugin.name)
    }

    // Index features
    for (const feature of plugin.features || []) {
      this.featureIndex.set(feature, plugin.name)
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) return

    // Remove from command index
    for (const cmd of plugin.commands || []) {
      if (this.commandIndex.get(cmd) === name) {
        this.commandIndex.delete(cmd)
      }
    }

    // Remove from skill index
    for (const skill of plugin.skills || []) {
      if (this.skillIndex.get(skill) === name) {
        this.skillIndex.delete(skill)
      }
    }

    // Remove from feature index
    for (const feature of plugin.features || []) {
      if (this.featureIndex.get(feature) === name) {
        this.featureIndex.delete(feature)
      }
    }

    this.plugins.delete(name)
  }

  /**
   * Find plugin by name
   */
  findByName(name: string): UnifiedPlugin | undefined {
    return this.plugins.get(name)
  }

  /**
   * Find plugin by command
   */
  findByCommand(command: string): UnifiedPlugin | undefined {
    const pluginName = this.commandIndex.get(command)
    return pluginName ? this.plugins.get(pluginName) : undefined
  }

  /**
   * Find plugin by skill
   */
  findBySkill(skill: string): UnifiedPlugin | undefined {
    const pluginName = this.skillIndex.get(skill)
    return pluginName ? this.plugins.get(pluginName) : undefined
  }

  /**
   * Find plugin by feature
   */
  findByFeature(feature: string): UnifiedPlugin | undefined {
    const pluginName = this.featureIndex.get(feature)
    return pluginName ? this.plugins.get(pluginName) : undefined
  }

  /**
   * Get all registered plugins
   */
  getAll(): UnifiedPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }
}

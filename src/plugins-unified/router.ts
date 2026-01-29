import type { UnifiedPlugin, UnifiedPluginConfig, PluginSourceType, SearchOptions } from './types'
import { AdapterFactory } from './adapters/factory'

export interface RouterContext {
  config: UnifiedPluginConfig
  lang?: string
  explicitSource?: PluginSourceType
}

export interface ParsedPluginId {
  name: string
  marketplace?: string
  source?: PluginSourceType
}

export class PluginRouter {
  private config: UnifiedPluginConfig

  constructor(config: UnifiedPluginConfig) {
    this.config = config
  }

  /**
   * Parse plugin ID
   * Supported formats:
   * - "plugin-name" - plain name
   * - "plugin-name@marketplace" - specify marketplace
   * - "ccjk:plugin-name" - specify source
   */
  parsePluginId(id: string): ParsedPluginId {
    // Check source prefix (ccjk:xxx, native:xxx)
    if (id.includes(':')) {
      const [source, name] = id.split(':')
      if (['ccjk', 'native', 'github', 'local', 'npm'].includes(source)) {
        return { name, source: source as PluginSourceType }
      }
    }

    // Check marketplace suffix (xxx@marketplace)
    if (id.includes('@')) {
      const [name, marketplace] = id.split('@')
      return { name, marketplace, source: 'native' }
    }

    return { name: id }
  }

  /**
   * Intelligently determine which source to use
   */
  async resolveSource(
    pluginId: string,
    context: RouterContext,
  ): Promise<PluginSourceType> {
    const parsed = this.parsePluginId(pluginId)

    // 1. Explicitly specified source
    if (parsed.source)
      return parsed.source
    if (context.explicitSource)
      return context.explicitSource

    // 2. Marketplace specified, use native
    if (parsed.marketplace)
      return 'native'

    // 3. User configured default source
    if (context.config.defaultSource !== 'auto') {
      return context.config.defaultSource
    }

    // 4. Smart selection
    return this.smartSelect(parsed.name, context)
  }

  /**
   * Smart select the best source
   */
  private async smartSelect(
    name: string,
    context: RouterContext,
  ): Promise<PluginSourceType> {
    // Parallel search both sources
    const [ccjkResults, nativeResults] = await Promise.all([
      this.searchSource('ccjk', name),
      this.searchSource('native', name),
    ])

    const ccjkPlugin = ccjkResults[0]
    const nativePlugin = nativeResults[0]

    // Neither found
    if (!ccjkPlugin && !nativePlugin) {
      return this.config.defaultSource === 'auto' ? 'ccjk' : this.config.defaultSource
    }

    // Only one found
    if (ccjkPlugin && !nativePlugin)
      return 'ccjk'
    if (nativePlugin && !ccjkPlugin)
      return 'native'

    // Both found - compare and select best
    return this.compareAndSelect(ccjkPlugin!, nativePlugin!, context)
  }

  /**
   * Compare plugins from different sources and select the best one
   */
  private compareAndSelect(
    ccjkPlugin: UnifiedPlugin,
    nativePlugin: UnifiedPlugin,
    context: RouterContext,
  ): PluginSourceType {
    // Priority 1: User preference from config
    const preferredSources = context.config.preferredSources
    if (preferredSources && preferredSources.length > 0) {
      for (const source of preferredSources) {
        if (source === 'ccjk' && ccjkPlugin)
          return 'ccjk'
        if (source === 'native' && nativePlugin)
          return 'native'
      }
    }

    // Priority 2: Compare download counts (popularity)
    const ccjkDownloads = ccjkPlugin.stats?.downloads ?? 0
    const nativeDownloads = nativePlugin.stats?.downloads ?? 0

    if (ccjkDownloads > nativeDownloads * 2)
      return 'ccjk'
    if (nativeDownloads > ccjkDownloads * 2)
      return 'native'

    // Priority 3: Compare ratings
    const ccjkRating = ccjkPlugin.stats?.rating ?? 0
    const nativeRating = nativePlugin.stats?.rating ?? 0

    if (ccjkRating > nativeRating + 0.5)
      return 'ccjk'
    if (nativeRating > ccjkRating + 0.5)
      return 'native'

    // Priority 4: Compare last update time (freshness)
    const ccjkUpdated = ccjkPlugin.updatedAt ? new Date(ccjkPlugin.updatedAt).getTime() : 0
    const nativeUpdated = nativePlugin.updatedAt ? new Date(nativePlugin.updatedAt).getTime() : 0

    if (ccjkUpdated > nativeUpdated)
      return 'ccjk'
    if (nativeUpdated > ccjkUpdated)
      return 'native'

    // Priority 5: CCJK plugins may have better CJK support
    if (context.lang && ['zh-CN', 'zh-TW', 'ja', 'ko'].includes(context.lang)) {
      return 'ccjk'
    }

    // Default to native
    return 'native'
  }

  /**
   * Search a specific source for plugins
   */
  private async searchSource(
    source: PluginSourceType,
    query: string,
  ): Promise<UnifiedPlugin[]> {
    try {
      const adapter = AdapterFactory.getAdapter(source)
      const options: SearchOptions = {
        query,
        limit: 1,
      }
      return await adapter.search(options)
    }
    catch {
      // Source unavailable or error, return empty
      return []
    }
  }

  /**
   * Get plugin from resolved source
   */
  async getPlugin(
    pluginId: string,
    context: RouterContext,
  ): Promise<UnifiedPlugin | null> {
    const parsed = this.parsePluginId(pluginId)
    const source = await this.resolveSource(pluginId, context)

    try {
      const adapter = AdapterFactory.getAdapter(source)
      return await adapter.getPlugin(parsed.name)
    }
    catch {
      return null
    }
  }

  /**
   * Search plugins across all sources or specific source
   */
  async search(
    query: string,
    context: RouterContext,
    options?: Partial<SearchOptions>,
  ): Promise<UnifiedPlugin[]> {
    const searchOptions: SearchOptions = {
      query,
      limit: options?.limit ?? 20,
      ...options,
    }

    // If explicit source specified, search only that source
    if (context.explicitSource) {
      const adapter = AdapterFactory.create(context.explicitSource, this.config)
      return adapter.search(searchOptions)
    }

    // Search all enabled sources in parallel
    const sources: PluginSourceType[] = ['ccjk', 'native']
    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const adapter = AdapterFactory.getAdapter(source)
          const plugins = await adapter.search(searchOptions)
          // Tag each plugin with its source
          return plugins.map(p => ({ ...p, source }))
        }
        catch {
          return []
        }
      }),
    )

    // Merge and deduplicate results
    return this.mergeResults(results.flat(), context)
  }

  /**
   * Merge and deduplicate search results from multiple sources
   */
  private mergeResults(
    plugins: UnifiedPlugin[],
    context: RouterContext,
  ): UnifiedPlugin[] {
    const seen = new Map<string, UnifiedPlugin>()

    for (const plugin of plugins) {
      const existing = seen.get(plugin.name)

      if (!existing) {
        seen.set(plugin.name, plugin)
        continue
      }

      // If duplicate, keep the one from preferred source
      const preferredSource = this.compareAndSelect(
        plugin.source === 'ccjk' ? plugin : existing,
        plugin.source === 'native' ? plugin : existing,
        context,
      )

      if (plugin.source === preferredSource) {
        seen.set(plugin.name, plugin)
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Install plugin from the best source
   */
  async install(
    pluginId: string,
    context: RouterContext,
  ): Promise<{ success: boolean, source: PluginSourceType, error?: string }> {
    const source = await this.resolveSource(pluginId, context)
    const parsed = this.parsePluginId(pluginId)

    try {
      const adapter = AdapterFactory.getAdapter(source)
      await adapter.install(parsed.name)
      return { success: true, source }
    }
    catch (error) {
      return {
        success: false,
        source,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstall(
    pluginId: string,
    context: RouterContext,
  ): Promise<{ success: boolean, error?: string }> {
    const parsed = this.parsePluginId(pluginId)

    // Try to find which source the plugin is installed from
    const sources: PluginSourceType[] = ['ccjk', 'native', 'local']

    for (const source of sources) {
      try {
        const adapter = AdapterFactory.getAdapter(source)
        const installed = await adapter.listInstalled()

        if (installed.some(p => p.name === parsed.name)) {
          await adapter.uninstall(parsed.name)
          return { success: true }
        }
      }
      catch {
        // Continue to next source
      }
    }

    return { success: false, error: `Plugin "${parsed.name}" not found in any source` }
  }
}

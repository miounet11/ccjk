import type {
  CcjkPlugin,
  LoadedPlugin,
  PluginConfig,
  PluginContext,
  PluginDiscoveryResult,
  PluginInfo,
  PluginLogger,
  PluginStorage,
} from './types'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { env } from 'node:process'
import { join } from 'pathe'
import { version } from '../../package.json'
import { CCJK_PLUGINS_DIR } from '../constants'
import { i18n } from '../i18n'
import { writeFileAtomic } from '../utils/fs-operations'

// In-memory plugin registry
const loadedPlugins = new Map<string, LoadedPlugin>()

// Plugin config file
const PLUGIN_CONFIG_FILE = join(CCJK_PLUGINS_DIR, 'plugins.json')

/**
 * Ensure plugins directory exists
 */
export function ensurePluginsDir(): void {
  if (!existsSync(CCJK_PLUGINS_DIR)) {
    mkdirSync(CCJK_PLUGINS_DIR, { recursive: true })
  }
}

/**
 * Create plugin logger
 */
function createLogger(pluginName: string): PluginLogger {
  const prefix = `[${pluginName}]`
  return {
    info: (msg: string) => console.log(`${prefix} ${msg}`),
    warn: (msg: string) => console.warn(`${prefix} ${msg}`),
    error: (msg: string) => console.error(`${prefix} ${msg}`),
    debug: (msg: string) => {
      if (env.DEBUG)
        console.log(`${prefix} [DEBUG] ${msg}`)
    },
  }
}

/**
 * Create plugin storage
 */
function createStorage(pluginName: string): PluginStorage {
  const storageFile = join(CCJK_PLUGINS_DIR, pluginName, 'storage.json')
  let data: Record<string, any> = {}

  // Load existing storage
  if (existsSync(storageFile)) {
    try {
      data = JSON.parse(readFileSync(storageFile, 'utf-8'))
    }
    catch {
      data = {}
    }
  }

  const save = (): void => {
    const dir = join(CCJK_PLUGINS_DIR, pluginName)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileAtomic(storageFile, JSON.stringify(data, null, 2))
  }

  return {
    get: <T>(key: string) => data[key] as T | undefined,
    set: <T>(key: string, value: T) => {
      data[key] = value
      save()
    },
    delete: (key: string) => {
      delete data[key]
      save()
    },
    clear: () => {
      data = {}
      save()
    },
  }
}

/**
 * Create plugin context
 */
function createContext(pluginName: string): PluginContext {
  return {
    ccjkVersion: version,
    configDir: join(CCJK_PLUGINS_DIR, pluginName),
    i18n,
    logger: createLogger(pluginName),
    storage: createStorage(pluginName),
  }
}

/**
 * Read plugin configuration
 */
export function readPluginConfig(): PluginConfig {
  ensurePluginsDir()

  if (existsSync(PLUGIN_CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(PLUGIN_CONFIG_FILE, 'utf-8'))
    }
    catch {
      // Return default
    }
  }

  return {
    enabled: [],
    disabled: [],
    settings: {},
  }
}

/**
 * Write plugin configuration
 */
export function writePluginConfig(config: PluginConfig): void {
  ensurePluginsDir()
  writeFileAtomic(PLUGIN_CONFIG_FILE, JSON.stringify(config, null, 2))
}

/**
 * Discover plugins in the plugins directory
 */
export async function discoverPlugins(): Promise<PluginDiscoveryResult[]> {
  ensurePluginsDir()

  const results: PluginDiscoveryResult[] = []
  const dirs = readdirSync(CCJK_PLUGINS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const dir of dirs) {
    const pluginPath = join(CCJK_PLUGINS_DIR, dir)
    const packagePath = join(pluginPath, 'package.json')

    if (!existsSync(packagePath)) {
      results.push({
        name: dir,
        path: pluginPath,
        metadata: { name: dir, version: '0.0.0', description: '' },
        valid: false,
        error: 'Missing package.json',
      })
      continue
    }

    try {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'))
      results.push({
        name: pkg.name || dir,
        path: pluginPath,
        metadata: {
          name: pkg.name || dir,
          version: pkg.version || '0.0.0',
          description: pkg.description || '',
          author: pkg.author,
          license: pkg.license,
          keywords: pkg.keywords,
        },
        valid: true,
      })
    }
    catch (error) {
      results.push({
        name: dir,
        path: pluginPath,
        metadata: { name: dir, version: '0.0.0', description: '' },
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid package.json',
      })
    }
  }

  return results
}

/**
 * Load a plugin
 */
export async function loadPlugin(pathOrName: string): Promise<LoadedPlugin | null> {
  const isPath = pathOrName.includes('/') || pathOrName.includes('\\')
  const pluginPath = isPath ? pathOrName : join(CCJK_PLUGINS_DIR, pathOrName)

  if (!existsSync(pluginPath)) {
    console.error(`Plugin not found: ${pluginPath}`)
    return null
  }

  try {
    // Try to load plugin module
    const indexPath = join(pluginPath, 'index.js')
    const tsIndexPath = join(pluginPath, 'index.ts')

    let plugin: CcjkPlugin
    let loadedModule: any

    if (existsSync(indexPath)) {
      loadedModule = await import(indexPath)
      plugin = loadedModule.default || loadedModule
    }
    else if (existsSync(tsIndexPath)) {
      // For development, use tsx
      loadedModule = await import(tsIndexPath)
      plugin = loadedModule.default || loadedModule
    }
    else {
      // Try package.json main field
      const pkg = JSON.parse(readFileSync(join(pluginPath, 'package.json'), 'utf-8'))
      if (pkg.main) {
        const mainPath = join(pluginPath, pkg.main)
        loadedModule = await import(mainPath)
        plugin = loadedModule.default || loadedModule
      }
      else {
        throw new Error('No entry point found')
      }
    }

    const context = createContext(plugin.metadata.name)

    // Call onLoad hook
    if (plugin.onLoad) {
      await plugin.onLoad(context)
    }

    const loaded: LoadedPlugin = {
      plugin,
      path: pluginPath,
      enabled: true,
      loadedAt: new Date(),
    }

    loadedPlugins.set(plugin.metadata.name, loaded)
    return loaded
  }
  catch (error) {
    console.error(`Failed to load plugin: ${pathOrName}`, error)
    return null
  }
}

/**
 * Unload a plugin
 */
export async function unloadPlugin(name: string): Promise<boolean> {
  const loaded = loadedPlugins.get(name)
  if (!loaded)
    return false

  try {
    if (loaded.plugin.onUnload) {
      await loaded.plugin.onUnload()
    }
    loadedPlugins.delete(name)
    return true
  }
  catch (error) {
    console.error(`Failed to unload plugin: ${name}`, error)
    return false
  }
}

/**
 * Get all loaded plugins
 */
export function getLoadedPlugins(): LoadedPlugin[] {
  return Array.from(loadedPlugins.values())
}

/**
 * Get plugin info
 */
export function getPluginInfo(name: string): PluginInfo | null {
  const loaded = loadedPlugins.get(name)
  if (!loaded)
    return null

  return {
    name: loaded.plugin.metadata.name,
    version: loaded.plugin.metadata.version,
    description: loaded.plugin.metadata.description,
    enabled: loaded.enabled,
    path: loaded.path,
    author: loaded.plugin.metadata.author,
  }
}

/**
 * List all plugins (loaded and discovered)
 */
export async function listPlugins(): Promise<PluginInfo[]> {
  const discovered = await discoverPlugins()
  const config = readPluginConfig()

  return discovered.map((d) => {
    const loaded = loadedPlugins.get(d.name)
    return {
      name: d.name,
      version: d.metadata.version,
      description: d.metadata.description,
      enabled: loaded?.enabled ?? !config.disabled.includes(d.name),
      path: d.path,
      author: d.metadata.author,
    }
  })
}

/**
 * Enable a plugin
 */
export async function enablePlugin(name: string): Promise<boolean> {
  const config = readPluginConfig()
  config.disabled = config.disabled.filter(n => n !== name)
  if (!config.enabled.includes(name)) {
    config.enabled.push(name)
  }
  writePluginConfig(config)

  // Load if not already loaded
  if (!loadedPlugins.has(name)) {
    await loadPlugin(name)
  }
  else {
    const loaded = loadedPlugins.get(name)!
    loaded.enabled = true
  }

  return true
}

/**
 * Disable a plugin
 */
export async function disablePlugin(name: string): Promise<boolean> {
  const config = readPluginConfig()
  config.enabled = config.enabled.filter(n => n !== name)
  if (!config.disabled.includes(name)) {
    config.disabled.push(name)
  }
  writePluginConfig(config)

  // Unload if loaded
  if (loadedPlugins.has(name)) {
    await unloadPlugin(name)
  }

  return true
}

/**
 * Get all workflows from plugins
 */
export function getPluginWorkflows(): any[] {
  const workflows: any[] = []
  for (const loaded of loadedPlugins.values()) {
    if (loaded.enabled && loaded.plugin.workflows) {
      workflows.push(...loaded.plugin.workflows)
    }
  }
  return workflows
}

/**
 * Get all agents from plugins
 */
export function getPluginAgents(): any[] {
  const agents: any[] = []
  for (const loaded of loadedPlugins.values()) {
    if (loaded.enabled && loaded.plugin.agents) {
      agents.push(...loaded.plugin.agents)
    }
  }
  return agents
}

/**
 * Get all MCP services from plugins
 */
export function getPluginMcpServices(): any[] {
  const services: any[] = []
  for (const loaded of loadedPlugins.values()) {
    if (loaded.enabled && loaded.plugin.mcpServices) {
      services.push(...loaded.plugin.mcpServices)
    }
  }
  return services
}

/**
 * Get all output styles from plugins
 */
export function getPluginOutputStyles(): any[] {
  const styles: any[] = []
  for (const loaded of loadedPlugins.values()) {
    if (loaded.enabled && loaded.plugin.outputStyles) {
      styles.push(...loaded.plugin.outputStyles)
    }
  }
  return styles
}

/**
 * Get all skills from plugins
 */
export function getPluginSkills(): any[] {
  const skills: any[] = []
  for (const loaded of loadedPlugins.values()) {
    if (loaded.enabled && loaded.plugin.skills) {
      skills.push(...loaded.plugin.skills)
    }
  }
  return skills
}

/**
 * Initialize all enabled plugins
 */
export async function initializePlugins(): Promise<void> {
  const config = readPluginConfig()
  const discovered = await discoverPlugins()

  for (const plugin of discovered) {
    if (plugin.valid && !config.disabled.includes(plugin.name)) {
      await loadPlugin(plugin.path)
    }
  }
}

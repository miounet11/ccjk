/**
 * Lazy Loader - Progressive loading for CCJK modules
 *
 * Improves startup performance by loading commands and modules on-demand
 * rather than all at once. This reduces initial load time and memory footprint.
 */

import { join } from 'pathe'

/**
 * Loading state tracker
 */
interface LoadingState {
  loading: Set<string>
  loaded: Set<string>
  failed: Set<string>
}

const state: LoadingState = {
  loading: new Set(),
  loaded: new Set(),
  failed: new Set(),
}

// Static module cache shared across all static methods
const moduleCache = new Map<string, any>()

/**
 * Progressive load order - frequently used modules load first
 */
const LOAD_ORDER = [
  // Core utilities - always needed
  'src/utils/config',
  'src/utils/platform',

  // Most common commands
  'src/commands/init',
  'src/commands/menu',
  'src/commands/config',

  // Common features
  'src/config/mcp-services',
  'src/brain/orchestrator',

  // Less common features
  'src/commands/ccr',
  'src/commands/lsp',
  'src/commands/vim',

  // Rare features
  'src/commands/teleport',
  'src/commands/background',
]

/**
 * Loading statistics
 */
interface LoadStats {
  total: number
  loaded: number
  loading: number
  failed: number
  cached: number
}

/**
 * LazyLoader class
 */
export class LazyLoader {
  /**
   * Load a command module by name
   */
  static async loadCommand(name: string): Promise<any> {
    const commandPath = `src/commands/${name}`

    // Return cached if available
    if (state.loaded.has(commandPath)) {
      return getModule(commandPath)
    }

    // Check if currently loading
    if (state.loading.has(commandPath)) {
      // Wait for existing load to complete
      while (state.loading.has(commandPath)) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      return getModule(commandPath)
    }

    // Mark as loading
    state.loading.add(commandPath)

    try {
      const module = await import(commandPath)
      state.loaded.add(commandPath)
      return module
    }
    catch (error) {
      state.failed.add(commandPath)
      throw error
    }
    finally {
      state.loading.delete(commandPath)
    }
  }

  /**
   * Load a module by path
   */
  static async loadModule<T = any>(path: string): Promise<T> {
    // Resolve relative paths
    const absolutePath = isAbsolute(path)
      ? path
      : join(process.cwd(), path)

    // Check cache
    if (moduleCache.has(absolutePath)) {
      return moduleCache.get(absolutePath) as T
    }

    // Mark as loading
    const fullPath = `${absolutePath}.ts`
    state.loading.add(fullPath)

    try {
      const module = await import(fullPath)
      moduleCache.set(absolutePath, module)
      state.loaded.add(fullPath)
      return module as T
    }
    catch (error) {
      state.failed.add(fullPath)
      throw error
    }
    finally {
      state.loading.delete(fullPath)
    }
  }

  /**
   * Preload common commands in background
   */
  static async preloadCommonCommands(): Promise<void> {
    const commonCommands = ['init', 'menu', 'config']

    // Use setTimeout for scheduling (requestIdleCallback is not available in Node.js)
    const schedulePreload = () => {
      commonCommands.forEach((cmd) => {
        this.loadCommand(cmd).catch(() => {
          // Ignore preload failures
        })
      })
    }

    // Schedule preload after a short delay
    setTimeout(schedulePreload, 100)
  }

  /**
   * Get load order for modules
   */
  static getLoadOrder(): string[] {
    return [...LOAD_ORDER]
  }

  /**
   * Check if a module is loaded
   */
  static isLoaded(path: string): boolean {
    return state.loaded.has(path) || state.loaded.has(`${path}.ts`)
  }

  /**
   * Get loading statistics
   */
  static getStats(): LoadStats {
    return {
      total: LOAD_ORDER.length,
      loaded: state.loaded.size,
      loading: state.loading.size,
      failed: state.failed.size,
      cached: moduleCache.size,
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    moduleCache.clear()
    state.loaded.clear()
    state.failed.clear()
  }
}

/**
 * Check if path is absolute
 */
function isAbsolute(path: string): boolean {
  return path.startsWith('/') || /^[a-z]:/i.test(path)
}

/**
 * Helper function to get a module by path
 */
async function getModule(path: string): Promise<any> {
  return import(path)
}

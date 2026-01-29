import type { PluginSourceAdapter, PluginSourceType } from '../types'
import { CcjkAdapter } from './ccjk-adapter.js'
import { ClaudeNativeAdapter } from './claude-native-adapter.js'

/**
 * Factory for creating and managing plugin source adapters.
 * Uses singleton pattern to ensure only one instance of each adapter exists.
 */
export class AdapterFactory {
  private static adapters: Map<PluginSourceType, PluginSourceAdapter> = new Map()

  /**
   * Get an adapter for the specified source type.
   * Creates the adapter if it doesn't exist yet.
   */
  static getAdapter(type: PluginSourceType): PluginSourceAdapter {
    if (!this.adapters.has(type)) {
      this.adapters.set(type, this.createAdapter(type))
    }
    return this.adapters.get(type)!
  }

  /**
   * Get all available adapters.
   * Useful for operations that need to query all sources.
   */
  static getAllAdapters(): PluginSourceAdapter[] {
    const types: PluginSourceType[] = ['ccjk', 'native']
    return types.map(type => this.getAdapter(type))
  }

  /**
   * Check if an adapter type is supported
   */
  static isSupported(type: string): type is PluginSourceType {
    return type === 'ccjk' || type === 'native'
  }

  /**
   * Clear all cached adapters.
   * Useful for testing or when adapters need to be re-initialized.
   */
  static clearCache(): void {
    this.adapters.clear()
  }

  /**
   * Create a new adapter instance for the specified type
   */
  private static createAdapter(type: PluginSourceType): PluginSourceAdapter {
    switch (type) {
      case 'ccjk':
        return new CcjkAdapter()
      case 'native':
        return new ClaudeNativeAdapter()
      default:
        throw new Error(`Unknown adapter type: ${type}`)
    }
  }
}

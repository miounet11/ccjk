/**
 * Configuration Manager
 * Provides utilities for loading, saving, and managing configuration files
 */

import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export interface ConfigOptions {
  configDir?: string
  fileName?: string
  createIfMissing?: boolean
  validate?: (config: any) => boolean
}

/**
 * Configuration Manager class
 * Handles configuration file operations with validation and error handling
 */
export class ConfigManager<T = any> {
  private configPath: string
  private options: Required<ConfigOptions>
  private cache?: T

  constructor(
    private readonly namespace: string,
    options: ConfigOptions = {},
  ) {
    this.options = {
      configDir: options.configDir || this.getDefaultConfigDir(),
      fileName: options.fileName || `${namespace}.json`,
      createIfMissing: options.createIfMissing ?? true,
      validate: options.validate || (() => true),
    }

    this.configPath = path.join(this.options.configDir, this.options.fileName)
  }

  /**
   * Get the default configuration directory
   */
  private getDefaultConfigDir(): string {
    return path.join(os.homedir(), '.ccjk')
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<T | null> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const config = JSON.parse(data) as T

      if (!this.options.validate(config)) {
        throw new Error('Configuration validation failed')
      }

      this.cache = config
      return config
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: T): Promise<void> {
    if (!this.options.validate(config)) {
      throw new Error('Configuration validation failed')
    }

    await fs.mkdir(this.options.configDir, { recursive: true })
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
    this.cache = config
  }

  /**
   * Update configuration (merge with existing)
   */
  async update(updates: Partial<T>): Promise<T> {
    const current = (await this.load()) || ({} as T)
    const updated = { ...current, ...updates }
    await this.save(updated)
    return updated
  }

  /**
   * Delete configuration file
   */
  async delete(): Promise<void> {
    try {
      await fs.unlink(this.configPath)
      this.cache = undefined
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  /**
   * Check if configuration file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Get configuration path
   */
  getPath(): string {
    return this.configPath
  }

  /**
   * Get cached configuration (without file I/O)
   */
  getCached(): T | undefined {
    return this.cache
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = undefined
  }
}

/**
 * Create a configuration manager instance
 */
export function createConfigManager<T = any>(
  namespace: string,
  options?: ConfigOptions,
): ConfigManager<T> {
  return new ConfigManager<T>(namespace, options)
}

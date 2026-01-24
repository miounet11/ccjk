/**
 * Keybinding Manager
 * 快捷键管理器
 *
 * @version 8.0.0
 * @module keybinding
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import type {
  Keybinding,
  KeybindingConfig,
  KeyEvent,
  KeybindingManagerOptions,
  KeybindingConflict,
  KeybindingContext,
} from './types'
import { DEFAULT_KEYBINDINGS } from './defaults'

/**
 * Keybinding Manager class
 */
export class KeybindingManager {
  private keybindings: Map<string, Keybinding>
  private configPath: string
  private storageType: 'local' | 'cloud'
  private cloudEndpoint?: string

  constructor(options?: KeybindingManagerOptions) {
    this.keybindings = new Map()
    this.storageType = options?.storageType || 'local'
    this.cloudEndpoint = options?.cloudEndpoint
    this.configPath = path.join(os.homedir(), '.claude', 'keybindings.json')

    // Load defaults if enabled
    if (options?.enableDefaults !== false) {
      this.loadDefaults()
    }
  }

  /**
   * Initialize keybinding manager
   */
  async initialize(): Promise<void> {
    await this.load()
  }

  /**
   * Add a keybinding
   */
  async add(keybinding: Omit<Keybinding, 'id'>): Promise<Keybinding> {
    // Check for conflicts
    const conflict = this.checkConflict(keybinding.key, keybinding.when)
    if (conflict) {
      throw new Error(
        `Keybinding conflict: ${keybinding.key} is already bound to ${conflict.command}`
      )
    }

    const id = this.generateId()
    const newBinding: Keybinding = {
      id,
      ...keybinding,
      enabled: keybinding.enabled ?? true,
    }

    this.keybindings.set(id, newBinding)
    await this.save()

    return newBinding
  }

  /**
   * Remove a keybinding
   */
  async remove(id: string): Promise<boolean> {
    const existed = this.keybindings.has(id)
    this.keybindings.delete(id)

    if (existed) {
      await this.save()
    }

    return existed
  }

  /**
   * Update a keybinding
   */
  async update(id: string, updates: Partial<Keybinding>): Promise<Keybinding | null> {
    const binding = this.keybindings.get(id)
    if (!binding) {
      return null
    }

    // Check for conflicts if key is being changed
    if (updates.key && updates.key !== binding.key) {
      const conflict = this.checkConflict(updates.key, updates.when || binding.when)
      if (conflict && conflict.id !== id) {
        throw new Error(
          `Keybinding conflict: ${updates.key} is already bound to ${conflict.command}`
        )
      }
    }

    const updated: Keybinding = {
      ...binding,
      ...updates,
    }

    this.keybindings.set(id, updated)
    await this.save()

    return updated
  }

  /**
   * Get a keybinding by ID
   */
  get(id: string): Keybinding | undefined {
    return this.keybindings.get(id)
  }

  /**
   * List all keybindings
   */
  list(context?: KeybindingContext): Keybinding[] {
    const bindings = Array.from(this.keybindings.values())

    if (context) {
      return bindings.filter(b => b.when === context || b.when === 'global')
    }

    return bindings
  }

  /**
   * Find keybinding by key combination
   */
  findByKey(key: string, context?: KeybindingContext): Keybinding | undefined {
    const normalized = this.normalizeKey(key)

    for (const binding of this.keybindings.values()) {
      if (!binding.enabled) {
        continue
      }

      if (this.normalizeKey(binding.key) === normalized) {
        // Check context
        if (!context || binding.when === 'global' || binding.when === context) {
          return binding
        }
      }
    }

    return undefined
  }

  /**
   * Handle key event
   */
  handleKeyEvent(event: KeyEvent, context: KeybindingContext): Keybinding | undefined {
    const key = this.eventToKeyString(event)
    return this.findByKey(key, context)
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<void> {
    this.keybindings.clear()
    this.loadDefaults()
    await this.save()
  }

  /**
   * Check for keybinding conflicts
   */
  private checkConflict(key: string, when?: KeybindingContext): Keybinding | null {
    const normalized = this.normalizeKey(key)

    for (const binding of this.keybindings.values()) {
      if (this.normalizeKey(binding.key) === normalized) {
        // Check if contexts overlap
        if (!when || !binding.when || binding.when === 'global' || when === 'global' || binding.when === when) {
          return binding
        }
      }
    }

    return null
  }

  /**
   * Load defaults
   */
  private loadDefaults(): void {
    for (const binding of DEFAULT_KEYBINDINGS) {
      this.keybindings.set(binding.id, binding)
    }
  }

  /**
   * Load keybindings from storage
   */
  private async load(): Promise<void> {
    if (this.storageType === 'local') {
      await this.loadFromLocal()
    } else {
      await this.loadFromCloud()
    }
  }

  /**
   * Save keybindings to storage
   */
  private async save(): Promise<void> {
    if (this.storageType === 'local') {
      await this.saveToLocal()
    } else {
      await this.saveToCloud()
    }
  }

  /**
   * Load from local file
   */
  private async loadFromLocal(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const config: KeybindingConfig = JSON.parse(data)

      // Merge with defaults
      for (const binding of config.keybindings) {
        this.keybindings.set(binding.id, binding)
      }
    } catch (error) {
      // File doesn't exist, use defaults
    }
  }

  /**
   * Save to local file
   */
  private async saveToLocal(): Promise<void> {
    const dir = path.dirname(this.configPath)
    await fs.mkdir(dir, { recursive: true })

    const config: KeybindingConfig = {
      version: '8.0.0',
      keybindings: Array.from(this.keybindings.values()),
    }

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
  }

  /**
   * Load from cloud
   */
  private async loadFromCloud(): Promise<void> {
    // TODO: Implement cloud API
  }

  /**
   * Save to cloud
   */
  private async saveToCloud(): Promise<void> {
    // TODO: Implement cloud API
  }

  /**
   * Normalize key string
   */
  private normalizeKey(key: string): string {
    return key.toLowerCase().split('+').sort().join('+')
  }

  /**
   * Convert key event to key string
   */
  private eventToKeyString(event: KeyEvent): string {
    const parts: string[] = []

    if (event.ctrl) parts.push('ctrl')
    if (event.alt) parts.push('alt')
    if (event.shift) parts.push('shift')
    if (event.meta) parts.push('meta')

    parts.push(event.key.toLowerCase())

    return parts.join('+')
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

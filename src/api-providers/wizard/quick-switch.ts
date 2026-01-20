/**
 * Quick Switch
 * Allows users to quickly switch between configured providers
 */

import type { ProviderSetup } from '../core/provider-interface'
import { providerRegistry } from '../core/provider-registry'

export interface SavedProvider {
  id: string
  name: string
  setup: ProviderSetup
  lastUsed: Date
  nickname?: string
}

export class QuickSwitch {
  private savedProviders: Map<string, SavedProvider> = new Map()
  private currentProviderId?: string

  /**
   * Save a provider configuration
   */
  saveProvider(setup: ProviderSetup, nickname?: string): void {
    const saved: SavedProvider = {
      id: setup.provider.id,
      name: setup.provider.name,
      setup,
      lastUsed: new Date(),
      nickname,
    }

    this.savedProviders.set(setup.provider.id, saved)
  }

  /**
   * Get all saved providers
   */
  getSavedProviders(): SavedProvider[] {
    return Array.from(this.savedProviders.values()).sort(
      (a, b) => b.lastUsed.getTime() - a.lastUsed.getTime(),
    )
  }

  /**
   * Switch to a saved provider
   */
  switchTo(providerId: string): ProviderSetup {
    const saved = this.savedProviders.get(providerId)
    if (!saved) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    saved.lastUsed = new Date()
    this.currentProviderId = providerId
    return saved.setup
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): SavedProvider | undefined {
    if (!this.currentProviderId) {
      return undefined
    }
    return this.savedProviders.get(this.currentProviderId)
  }

  /**
   * Remove a saved provider
   */
  removeProvider(providerId: string): void {
    this.savedProviders.delete(providerId)
    if (this.currentProviderId === providerId) {
      this.currentProviderId = undefined
    }
  }

  /**
   * Update provider nickname
   */
  setNickname(providerId: string, nickname: string): void {
    const saved = this.savedProviders.get(providerId)
    if (saved) {
      saved.nickname = nickname
    }
  }

  /**
   * Get recently used providers
   */
  getRecentProviders(limit = 5): SavedProvider[] {
    return this.getSavedProviders().slice(0, limit)
  }

  /**
   * Check if provider is saved
   */
  hasProvider(providerId: string): boolean {
    return this.savedProviders.has(providerId)
  }

  /**
   * Export saved providers to JSON
   */
  export(includeCredentials = false): string {
    const data = Array.from(this.savedProviders.values()).map(saved => ({
      id: saved.id,
      name: saved.name,
      nickname: saved.nickname,
      lastUsed: saved.lastUsed.toISOString(),
      setup: {
        providerId: saved.setup.provider.id,
        model: saved.setup.model,
        ...(includeCredentials && { credentials: saved.setup.credentials }),
      },
    }))

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import saved providers from JSON
   */
  async import(json: string): Promise<void> {
    const data = JSON.parse(json)

    for (const item of data) {
      const provider = providerRegistry.getProvider(item.setup.providerId)
      if (!provider) {
        console.warn(`Provider not found: ${item.setup.providerId}`)
        continue
      }

      const setup: ProviderSetup = {
        provider: provider.getConfig(),
        credentials: item.setup.credentials || {},
        model: item.setup.model,
      }

      const saved: SavedProvider = {
        id: item.id,
        name: item.name,
        setup,
        lastUsed: new Date(item.lastUsed),
        nickname: item.nickname,
      }

      this.savedProviders.set(item.id, saved)
    }
  }

  /**
   * Clear all saved providers
   */
  clear(): void {
    this.savedProviders.clear()
    this.currentProviderId = undefined
  }

  /**
   * Get provider count
   */
  getCount(): number {
    return this.savedProviders.size
  }

  /**
   * Quick switch menu data
   */
  getQuickSwitchMenu(): Array<{
    id: string
    label: string
    description: string
    isCurrent: boolean
  }> {
    return this.getSavedProviders().map(saved => ({
      id: saved.id,
      label: saved.nickname || saved.name,
      description: `Model: ${saved.setup.model} | Last used: ${this.formatDate(saved.lastUsed)}`,
      isCurrent: saved.id === this.currentProviderId,
    }))
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1)
      return 'Just now'
    if (minutes < 60)
      return `${minutes}m ago`
    if (hours < 24)
      return `${hours}h ago`
    if (days < 7)
      return `${days}d ago`
    return date.toLocaleDateString()
  }
}

/**
 * Create a new quick switch instance
 */
export function createQuickSwitch(): QuickSwitch {
  return new QuickSwitch()
}

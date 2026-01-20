/**
 * Provider Registry
 * Central registry for all API providers
 */

import type { IProvider, ProviderMetadata } from './provider-interface'

export class ProviderRegistry {
  private static instance: ProviderRegistry
  private providers: Map<string, IProvider> = new Map()
  private metadata: Map<string, ProviderMetadata> = new Map()

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry()
    }
    return ProviderRegistry.instance
  }

  /**
   * Register a provider
   */
  register(provider: IProvider, metadata?: Partial<ProviderMetadata>): void {
    const config = provider.getConfig()
    this.providers.set(config.id, provider)

    // Store metadata
    const fullMetadata: ProviderMetadata = {
      id: config.id,
      name: config.name,
      description: config.description,
      icon: config.icon,
      popular: metadata?.popular ?? false,
      setupTime: metadata?.setupTime ?? '1 minute',
      difficulty: metadata?.difficulty ?? 'easy',
    }
    this.metadata.set(config.id, fullMetadata)
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): IProvider | undefined {
    return this.providers.get(id)
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Get provider metadata
   */
  getMetadata(id: string): ProviderMetadata | undefined {
    return this.metadata.get(id)
  }

  /**
   * Get all provider metadata
   */
  getAllMetadata(): ProviderMetadata[] {
    return Array.from(this.metadata.values())
  }

  /**
   * Get popular providers
   */
  getPopularProviders(): ProviderMetadata[] {
    return this.getAllMetadata()
      .filter(m => m.popular)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Search providers by name or description
   */
  searchProviders(query: string): ProviderMetadata[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllMetadata().filter(
      m =>
        m.name.toLowerCase().includes(lowerQuery)
        || m.description.toLowerCase().includes(lowerQuery),
    )
  }

  /**
   * Check if provider exists
   */
  hasProvider(id: string): boolean {
    return this.providers.has(id)
  }

  /**
   * Unregister a provider (for testing)
   */
  unregister(id: string): void {
    this.providers.delete(id)
    this.metadata.delete(id)
  }

  /**
   * Clear all providers (for testing)
   */
  clear(): void {
    this.providers.clear()
    this.metadata.clear()
  }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance()

/**
 * Load Balancer Module
 * Provides intelligent load balancing and failover strategies for API providers
 */

import type { ApiProviderPreset } from '../config/api-providers'
import type { ProviderHealthMonitor } from './provider-health'

/**
 * Load balancing strategy types
 */
export type LoadBalancingStrategy = 'round-robin' | 'weighted' | 'least-latency' | 'random'

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  /** Load balancing strategy (default: 'weighted') */
  strategy?: LoadBalancingStrategy
  /** Whether to enable automatic failover (default: true) */
  enableFailover?: boolean
  /** Maximum failover attempts (default: 3) */
  maxFailoverAttempts?: number
  /** Whether to exclude unhealthy providers (default: true) */
  excludeUnhealthy?: boolean
  /** Whether to prefer healthy providers (default: true) */
  preferHealthy?: boolean
}

/**
 * Provider selection result
 */
export interface ProviderSelectionResult {
  /** Selected provider */
  provider: ApiProviderPreset
  /** Selection reason */
  reason: string
  /** Whether this is a failover selection */
  isFailover: boolean
  /** Attempt number (for failover) */
  attemptNumber: number
}

/**
 * Default load balancer configuration
 */
const DEFAULT_CONFIG: Required<LoadBalancerConfig> = {
  strategy: 'weighted',
  enableFailover: true,
  maxFailoverAttempts: 3,
  excludeUnhealthy: true,
  preferHealthy: true,
}

/**
 * Load Balancer
 * Intelligently distributes requests across API providers
 */
export class LoadBalancer {
  private config: Required<LoadBalancerConfig>
  private healthMonitor: ProviderHealthMonitor | null = null
  private roundRobinIndex = 0
  private failedProviders: Set<string> = new Set()
  private lastSelectedProvider: ApiProviderPreset | null = null

  constructor(config?: LoadBalancerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Set health monitor for health-aware load balancing
   */
  setHealthMonitor(monitor: ProviderHealthMonitor): void {
    this.healthMonitor = monitor
  }

  /**
   * Select a provider based on the configured strategy
   */
  selectProvider(providers: ApiProviderPreset[]): ProviderSelectionResult | null {
    if (providers.length === 0) {
      return null
    }

    // Filter providers based on health status
    const availableProviders = this.filterProviders(providers)

    if (availableProviders.length === 0) {
      // No healthy providers available, try all providers as fallback
      return this.selectFromProviders(providers, 'fallback-all-unhealthy', false, 1)
    }

    return this.selectFromProviders(availableProviders, 'normal-selection', false, 1)
  }

  /**
   * Filter providers based on health and configuration
   */
  private filterProviders(providers: ApiProviderPreset[]): ApiProviderPreset[] {
    if (!this.healthMonitor) {
      return providers
    }

    let filtered = providers

    // Exclude unhealthy providers if configured
    if (this.config.excludeUnhealthy) {
      filtered = filtered.filter((provider) => {
        const health = this.healthMonitor!.getProviderHealth(provider.id)
        return !health || health.status !== 'unhealthy'
      })
    }

    // Prefer healthy providers if configured
    if (this.config.preferHealthy && filtered.length > 0) {
      const healthyProviders = filtered.filter((provider) => {
        const health = this.healthMonitor!.getProviderHealth(provider.id)
        return health && health.status === 'healthy'
      })

      if (healthyProviders.length > 0) {
        filtered = healthyProviders
      }
    }

    // Exclude failed providers
    filtered = filtered.filter(provider => !this.failedProviders.has(provider.id))

    return filtered
  }

  /**
   * Select provider from filtered list based on strategy
   */
  private selectFromProviders(
    providers: ApiProviderPreset[],
    reason: string,
    isFailover: boolean,
    attemptNumber: number,
  ): ProviderSelectionResult | null {
    if (providers.length === 0) {
      return null
    }

    let selectedProvider: ApiProviderPreset

    switch (this.config.strategy) {
      case 'round-robin':
        selectedProvider = this.selectRoundRobin(providers)
        break
      case 'weighted':
        selectedProvider = this.selectWeighted(providers)
        break
      case 'least-latency':
        selectedProvider = this.selectLeastLatency(providers)
        break
      case 'random':
        selectedProvider = this.selectRandom(providers)
        break
      default:
        selectedProvider = providers[0]
    }

    this.lastSelectedProvider = selectedProvider

    return {
      provider: selectedProvider,
      reason: `${reason} (strategy: ${this.config.strategy})`,
      isFailover,
      attemptNumber,
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(providers: ApiProviderPreset[]): ApiProviderPreset {
    const provider = providers[this.roundRobinIndex % providers.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % providers.length
    return provider
  }

  /**
   * Weighted selection based on health metrics
   */
  private selectWeighted(providers: ApiProviderPreset[]): ApiProviderPreset {
    if (!this.healthMonitor) {
      return this.selectRandom(providers)
    }

    // Calculate weights based on health scores
    const weights = providers.map((provider) => {
      const health = this.healthMonitor!.getProviderHealth(provider.id)
      if (!health) {
        return 1 // Default weight for unknown health
      }

      // Calculate weight based on success rate and latency
      const successWeight = health.successRate
      const latencyWeight = Math.max(0, 1 - health.latency / 10000) // Normalize to 0-1
      const statusWeight = {
        healthy: 1.0,
        degraded: 0.6,
        unhealthy: 0.2,
        unknown: 0.5,
      }[health.status]

      return successWeight * 0.4 + latencyWeight * 0.3 + statusWeight * 0.3
    })

    // Select based on weighted random
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < providers.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return providers[i]
      }
    }

    return providers[providers.length - 1]
  }

  /**
   * Select provider with least latency
   */
  private selectLeastLatency(providers: ApiProviderPreset[]): ApiProviderPreset {
    if (!this.healthMonitor) {
      return this.selectRandom(providers)
    }

    let bestProvider = providers[0]
    let bestLatency = Number.POSITIVE_INFINITY

    for (const provider of providers) {
      const health = this.healthMonitor.getProviderHealth(provider.id)
      if (health && health.latency < bestLatency && health.successfulRequests > 0) {
        bestLatency = health.latency
        bestProvider = provider
      }
    }

    return bestProvider
  }

  /**
   * Random selection
   */
  private selectRandom(providers: ApiProviderPreset[]): ApiProviderPreset {
    const index = Math.floor(Math.random() * providers.length)
    return providers[index]
  }

  /**
   * Perform failover to next available provider
   */
  failover(
    currentProvider: ApiProviderPreset,
    allProviders: ApiProviderPreset[],
  ): ProviderSelectionResult | null {
    if (!this.config.enableFailover) {
      return null
    }

    // Mark current provider as failed
    this.failedProviders.add(currentProvider.id)

    // Calculate attempt number
    const attemptNumber = this.failedProviders.size + 1

    // Check if we've exceeded max attempts
    if (attemptNumber > this.config.maxFailoverAttempts) {
      return null
    }

    // Get available providers (excluding failed ones)
    const availableProviders = allProviders.filter(
      provider => !this.failedProviders.has(provider.id),
    )

    if (availableProviders.length === 0) {
      return null
    }

    // Select next provider
    return this.selectFromProviders(
      availableProviders,
      `failover-from-${currentProvider.id}`,
      true,
      attemptNumber,
    )
  }

  /**
   * Mark a provider as failed
   */
  markProviderFailed(providerId: string): void {
    this.failedProviders.add(providerId)
  }

  /**
   * Mark a provider as recovered
   */
  markProviderRecovered(providerId: string): void {
    this.failedProviders.delete(providerId)
  }

  /**
   * Reset all failed providers
   */
  resetFailedProviders(): void {
    this.failedProviders.clear()
  }

  /**
   * Get list of failed provider IDs
   */
  getFailedProviders(): string[] {
    return Array.from(this.failedProviders)
  }

  /**
   * Get the last selected provider
   */
  getLastSelectedProvider(): ApiProviderPreset | null {
    return this.lastSelectedProvider
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.config.strategy = strategy
  }

  /**
   * Get current strategy
   */
  getStrategy(): LoadBalancingStrategy {
    return this.config.strategy
  }

  /**
   * Enable or disable failover
   */
  setFailoverEnabled(enabled: boolean): void {
    this.config.enableFailover = enabled
  }

  /**
   * Check if failover is enabled
   */
  isFailoverEnabled(): boolean {
    return this.config.enableFailover
  }

  /**
   * Get configuration
   */
  getConfig(): Required<LoadBalancerConfig> {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    strategy: LoadBalancingStrategy
    failoverEnabled: boolean
    failedProvidersCount: number
    lastSelectedProvider: string | null
  } {
    return {
      strategy: this.config.strategy,
      failoverEnabled: this.config.enableFailover,
      failedProvidersCount: this.failedProviders.size,
      lastSelectedProvider: this.lastSelectedProvider?.id || null,
    }
  }
}

/**
 * Create a load balancer with health monitoring
 */
export function createLoadBalancer(
  healthMonitor: ProviderHealthMonitor,
  config?: LoadBalancerConfig,
): LoadBalancer {
  const loadBalancer = new LoadBalancer(config)
  loadBalancer.setHealthMonitor(healthMonitor)
  return loadBalancer
}

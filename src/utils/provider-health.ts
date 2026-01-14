/**
 * Provider Health Monitoring Module
 * Monitors API provider health status, latency, and success rates
 */

import type { ApiProviderPreset } from '../config/api-providers'

/**
 * Provider health status
 */
export type ProviderStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/**
 * Provider health information
 */
export interface ProviderHealth {
  /** Provider ID */
  providerId: string
  /** Average latency in milliseconds */
  latency: number
  /** Success rate (0-1) */
  successRate: number
  /** Last health check timestamp */
  lastCheck: number
  /** Current health status */
  status: ProviderStatus
  /** Number of consecutive failures */
  consecutiveFailures: number
  /** Total requests made */
  totalRequests: number
  /** Successful requests */
  successfulRequests: number
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  success: boolean
  latency: number
  error?: string
  timestamp: number
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  /** Health check interval in milliseconds (default: 5 minutes) */
  checkInterval?: number
  /** Request timeout in milliseconds (default: 10 seconds) */
  timeout?: number
  /** Latency threshold for degraded status in ms (default: 2000) */
  degradedLatencyThreshold?: number
  /** Latency threshold for unhealthy status in ms (default: 5000) */
  unhealthyLatencyThreshold?: number
  /** Success rate threshold for degraded status (default: 0.8) */
  degradedSuccessRateThreshold?: number
  /** Success rate threshold for unhealthy status (default: 0.5) */
  unhealthySuccessRateThreshold?: number
  /** Number of consecutive failures before marking unhealthy (default: 3) */
  maxConsecutiveFailures?: number
}

/**
 * Default health monitoring configuration
 */
const DEFAULT_CONFIG: Required<HealthMonitorConfig> = {
  checkInterval: 5 * 60 * 1000, // 5 minutes
  timeout: 10000, // 10 seconds
  degradedLatencyThreshold: 2000, // 2 seconds
  unhealthyLatencyThreshold: 5000, // 5 seconds
  degradedSuccessRateThreshold: 0.8, // 80%
  unhealthySuccessRateThreshold: 0.5, // 50%
  maxConsecutiveFailures: 3,
}

/**
 * Provider Health Monitor
 * Monitors and tracks health status of API providers
 */
export class ProviderHealthMonitor {
  private healthData: Map<string, ProviderHealth> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private config: Required<HealthMonitorConfig>
  private providers: ApiProviderPreset[] = []

  constructor(config?: HealthMonitorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Set providers to monitor
   */
  setProviders(providers: ApiProviderPreset[]): void {
    this.providers = providers

    // Initialize health data for new providers
    for (const provider of providers) {
      if (!this.healthData.has(provider.id)) {
        this.healthData.set(provider.id, {
          providerId: provider.id,
          latency: 0,
          successRate: 1,
          lastCheck: 0,
          status: 'unknown',
          consecutiveFailures: 0,
          totalRequests: 0,
          successfulRequests: 0,
        })
      }
    }
  }

  /**
   * Check health of a single provider
   */
  async checkHealth(provider: ApiProviderPreset): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      // Determine which endpoint to test based on provider configuration
      const baseUrl = provider.claudeCode?.baseUrl || provider.codex?.baseUrl
      if (!baseUrl) {
        return {
          success: false,
          latency: 0,
          error: 'No base URL configured',
          timestamp: Date.now(),
        }
      }

      // Perform a lightweight health check (HEAD request or simple GET)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      try {
        // Try to fetch a health endpoint or the base URL
        const response = await fetch(baseUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'CCJK-Health-Monitor/1.0',
          },
        })

        clearTimeout(timeoutId)

        const latency = Date.now() - startTime
        const success = response.ok || response.status === 404 // 404 is acceptable for health check

        return {
          success,
          latency,
          timestamp: Date.now(),
        }
      }
      catch (error) {
        clearTimeout(timeoutId)

        // Check if it's a timeout
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            latency: this.config.timeout,
            error: 'Request timeout',
            timestamp: Date.now(),
          }
        }

        return {
          success: false,
          latency: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        }
      }
    }
    catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Update health data based on check result
   */
  private updateHealthData(providerId: string, result: HealthCheckResult): void {
    const health = this.healthData.get(providerId)
    if (!health) {
      return
    }

    // Update request counters
    health.totalRequests++
    if (result.success) {
      health.successfulRequests++
      health.consecutiveFailures = 0
    }
    else {
      health.consecutiveFailures++
    }

    // Calculate success rate
    health.successRate = health.successfulRequests / health.totalRequests

    // Update latency (exponential moving average)
    if (result.success) {
      health.latency = health.latency === 0
        ? result.latency
        : health.latency * 0.7 + result.latency * 0.3
    }

    // Update last check timestamp
    health.lastCheck = result.timestamp

    // Determine status
    health.status = this.determineStatus(health)

    this.healthData.set(providerId, health)
  }

  /**
   * Determine provider status based on health metrics
   */
  private determineStatus(health: ProviderHealth): ProviderStatus {
    // Check consecutive failures
    if (health.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return 'unhealthy'
    }

    // Check success rate
    if (health.successRate < this.config.unhealthySuccessRateThreshold) {
      return 'unhealthy'
    }
    if (health.successRate < this.config.degradedSuccessRateThreshold) {
      return 'degraded'
    }

    // Check latency (only if we have successful requests)
    if (health.successfulRequests > 0) {
      if (health.latency > this.config.unhealthyLatencyThreshold) {
        return 'unhealthy'
      }
      if (health.latency > this.config.degradedLatencyThreshold) {
        return 'degraded'
      }
    }

    return 'healthy'
  }

  /**
   * Get health data for a specific provider
   */
  getProviderHealth(providerId: string): ProviderHealth | undefined {
    return this.healthData.get(providerId)
  }

  /**
   * Get all healthy providers
   */
  getHealthyProviders(): ApiProviderPreset[] {
    return this.providers.filter((provider) => {
      const health = this.healthData.get(provider.id)
      return health && health.status === 'healthy'
    })
  }

  /**
   * Get all providers sorted by health score
   */
  getProvidersByHealth(): ApiProviderPreset[] {
    return [...this.providers].sort((a, b) => {
      const healthA = this.healthData.get(a.id)
      const healthB = this.healthData.get(b.id)

      if (!healthA || !healthB) {
        return 0
      }

      // Calculate health score (higher is better)
      const scoreA = this.calculateHealthScore(healthA)
      const scoreB = this.calculateHealthScore(healthB)

      return scoreB - scoreA
    })
  }

  /**
   * Calculate health score for a provider
   */
  private calculateHealthScore(health: ProviderHealth): number {
    // Status weight
    const statusWeight = {
      healthy: 1.0,
      degraded: 0.6,
      unhealthy: 0.2,
      unknown: 0.5,
    }

    // Normalize latency (lower is better, max 10 seconds)
    const normalizedLatency = Math.max(0, 1 - health.latency / 10000)

    // Combine metrics
    return (
      statusWeight[health.status] * 0.4
      + health.successRate * 0.4
      + normalizedLatency * 0.2
    )
  }

  /**
   * Get the best provider based on health metrics
   */
  getBestProvider(): ApiProviderPreset | null {
    const sortedProviders = this.getProvidersByHealth()
    return sortedProviders.length > 0 ? sortedProviders[0] : null
  }

  /**
   * Start monitoring all providers
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      return // Already monitoring
    }

    // Perform initial health check
    await this.checkAllProviders()

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllProviders()
    }, this.config.checkInterval)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Check health of all providers
   */
  private async checkAllProviders(): Promise<void> {
    const checks = this.providers.map(async (provider) => {
      const result = await this.checkHealth(provider)
      this.updateHealthData(provider.id, result)
    })

    await Promise.all(checks)
  }

  /**
   * Get all health data
   */
  getAllHealthData(): Map<string, ProviderHealth> {
    return new Map(this.healthData)
  }

  /**
   * Reset health data for a provider
   */
  resetProviderHealth(providerId: string): void {
    const health = this.healthData.get(providerId)
    if (health) {
      health.consecutiveFailures = 0
      health.totalRequests = 0
      health.successfulRequests = 0
      health.successRate = 1
      health.latency = 0
      health.status = 'unknown'
      this.healthData.set(providerId, health)
    }
  }

  /**
   * Clear all health data
   */
  clearAllHealthData(): void {
    this.healthData.clear()
  }
}

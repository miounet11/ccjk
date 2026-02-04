/**
 * MCP Cloud Integration - Main Entry Point
 * Comprehensive MCP service integration system with cloud synchronization
 */

import type { CloudAPIConfig, UserProfile } from './types'
import { ServiceAnalytics } from './analytics'
import { OneClickInstaller } from './installer'
import { MCPUpdateManager } from './installer/update-manager'
import { RecommendationEngine, SearchEngine, ServiceBrowser, TrendingTracker } from './marketplace'
// Main MCP Cloud Manager
import { CloudMCPRegistry } from './registry'

export * from './analytics'
export * from './bundles'
export * from './installer'
export * from './marketplace'
export * from './registry'
export * from './types'

export class MCPCloudManager {
  private registry: CloudMCPRegistry
  private browser: ServiceBrowser
  private search: SearchEngine
  private recommendations: RecommendationEngine
  private trending: TrendingTracker
  private installer: OneClickInstaller
  private analytics: ServiceAnalytics
  private updateManager: MCPUpdateManager

  constructor(config?: Partial<CloudAPIConfig>) {
    this.registry = new CloudMCPRegistry(config)
    this.browser = new ServiceBrowser(this.registry)
    this.search = new SearchEngine(this.registry)
    this.recommendations = new RecommendationEngine()
    this.trending = new TrendingTracker()
    this.installer = new OneClickInstaller()
    this.analytics = new ServiceAnalytics()
    this.updateManager = new MCPUpdateManager()
  }

  /**
   * Initialize the MCP Cloud Manager
   */
  async initialize(): Promise<void> {
    await Promise.all([
      this.registry.initialize(),
      this.browser.initialize(),
      this.analytics.initialize(),
      this.updateManager.initialize(),
    ])
  }

  /**
   * Get the registry
   */
  getRegistry(): CloudMCPRegistry {
    return this.registry
  }

  /**
   * Get the service browser
   */
  getBrowser(): ServiceBrowser {
    return this.browser
  }

  /**
   * Get the search engine
   */
  getSearch(): SearchEngine {
    return this.search
  }

  /**
   * Get the recommendation engine
   */
  getRecommendations(): RecommendationEngine {
    return this.recommendations
  }

  /**
   * Get the trending tracker
   */
  getTrending(): TrendingTracker {
    return this.trending
  }

  /**
   * Get the installer
   */
  getInstaller(): OneClickInstaller {
    return this.installer
  }

  /**
   * Get the analytics
   */
  getAnalytics(): ServiceAnalytics {
    return this.analytics
  }

  /**
   * Get the update manager
   */
  getUpdateManager(): MCPUpdateManager {
    return this.updateManager
  }

  /**
   * Quick search for services
   */
  async searchServices(query: string) {
    return await this.search.search(query)
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(userProfile: UserProfile, limit: number = 10) {
    const services = await this.registry.getAvailableServices()
    return await this.recommendations.getPersonalizedRecommendations(
      services,
      userProfile,
      limit,
    )
  }

  /**
   * Install a service by ID
   */
  async installService(serviceId: string, options?: any) {
    const service = await this.registry.getService(serviceId)
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`)
    }

    const result = await this.installer.installService(service, options)

    // Track installation
    if (result.success) {
      this.analytics.trackUsage(serviceId, 'install', {
        version: result.version,
      })
    }

    return result
  }

  /**
   * Check for updates
   */
  async checkUpdates() {
    const services = await this.registry.getAvailableServices()
    return await this.updateManager.checkUpdates(services)
  }

  /**
   * Stop all background processes
   */
  stop(): void {
    this.registry.stop()
  }
}

/**
 * Create a new MCP Cloud Manager instance
 */
export function createMCPCloudManager(config?: Partial<CloudAPIConfig>): MCPCloudManager {
  return new MCPCloudManager(config)
}

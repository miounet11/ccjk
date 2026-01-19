/**
 * Service Browser
 * Browse and explore available MCP services
 */

import {
  MCPService,
  SearchFilters,
  MarketplaceState,
} from '../types';
import { CloudMCPRegistry } from '../registry/cloud-registry';

export class ServiceBrowser {
  private registry: CloudMCPRegistry;
  private state: MarketplaceState;

  constructor(registry: CloudMCPRegistry) {
    this.registry = registry;
    this.state = {
      services: [],
      trending: [],
      featured: [],
      categories: [],
      tags: [],
      lastUpdated: '',
    };
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    await this.refreshState();
  }

  /**
   * Refresh marketplace state
   */
  async refreshState(): Promise<void> {
    const [services, trending, categories, tags] = await Promise.all([
      this.registry.getAvailableServices(),
      this.registry.getTrending(10),
      this.registry.getCategories(),
      this.registry.getTags(),
    ]);

    const featured = services.filter((s) => s.featured);

    this.state = {
      services,
      trending,
      featured,
      categories,
      tags,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Browse all services
   */
  async browseAll(filters?: SearchFilters): Promise<MCPService[]> {
    let services = this.state.services;

    if (filters) {
      services = await this.registry.searchServices('', filters);
    }

    return services;
  }

  /**
   * Browse by category
   */
  async browseByCategory(category: string): Promise<MCPService[]> {
    return await this.registry.getByCategory(category);
  }

  /**
   * Browse trending
   */
  async browseTrending(limit: number = 10): Promise<MCPService[]> {
    return await this.registry.getTrending(limit);
  }

  /**
   * Browse featured
   */
  browseFeatured(): MCPService[] {
    return this.state.featured;
  }

  /**
   * Get service details
   */
  async getServiceDetails(id: string) {
    return await this.registry.getService(id);
  }

  /**
   * Get categories
   */
  getCategories(): string[] {
    return this.state.categories;
  }

  /**
   * Get tags
   */
  getTags(): string[] {
    return this.state.tags;
  }

  /**
   * Get marketplace state
   */
  getState(): MarketplaceState {
    return { ...this.state };
  }

  /**
   * Get service count
   */
  getServiceCount(): number {
    return this.state.services.length;
  }

  /**
   * Get services by tags
   */
  async getByTags(tags: string[]): Promise<MCPService[]> {
    return this.state.services.filter((service) =>
      tags.some((tag) => service.tags.includes(tag))
    );
  }

  /**
   * Get verified services
   */
  getVerified(): MCPService[] {
    return this.state.services.filter((s) => s.verified);
  }

  /**
   * Get new services (last 30 days)
   */
  getNewServices(): MCPService[] {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.state.services.filter(
      (service) => new Date(service.lastUpdated) > thirtyDaysAgo
    );
  }

  /**
   * Get popular services (by downloads)
   */
  getPopular(limit: number = 10): MCPService[] {
    return [...this.state.services]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Get top rated services
   */
  getTopRated(limit: number = 10): MCPService[] {
    return [...this.state.services]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
}

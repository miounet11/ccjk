/**
 * Cloud MCP Service Registry
 * Manages fetching and caching of MCP services from the cloud
 */

import {
  MCPService,
  MCPServiceDetail,
  SearchFilters,
  ServiceRatings,
  CloudAPIConfig,
  SyncStatus,
  UserProfile,
} from '../types';
import { ServiceFetcher } from './service-fetcher';
import { CacheManager } from './cache-manager';
import { SyncScheduler } from './sync-scheduler';

export class CloudMCPRegistry {
  private fetcher: ServiceFetcher;
  private cache: CacheManager;
  private scheduler: SyncScheduler;
  private config: CloudAPIConfig;
  private syncStatus: SyncStatus;

  constructor(config: Partial<CloudAPIConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.ccjk.dev/mcp',
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600000, // 1 hour
    };

    this.fetcher = new ServiceFetcher(this.config);
    this.cache = new CacheManager(this.config.cacheTTL);
    this.scheduler = new SyncScheduler(this);

    this.syncStatus = {
      lastSync: '',
      nextSync: '',
      status: 'idle',
      servicesCount: 0,
    };
  }

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    // Load cached data
    await this.cache.load();

    // Start sync scheduler
    this.scheduler.start();

    // Perform initial sync if cache is empty
    const cachedServices = this.cache.get<MCPService[]>('services');
    if (!cachedServices || cachedServices.length === 0) {
      await this.syncFromCloud();
    }
  }

  /**
   * Sync services from cloud
   */
  async syncFromCloud(): Promise<void> {
    this.syncStatus.status = 'syncing';

    try {
      const services = await this.fetcher.fetchAllServices();

      // Update cache
      this.cache.set('services', services);
      await this.cache.save();

      // Update sync status
      this.syncStatus = {
        lastSync: new Date().toISOString(),
        nextSync: new Date(Date.now() + 3600000).toISOString(),
        status: 'idle',
        servicesCount: services.length,
      };
    } catch (error) {
      this.syncStatus.status = 'error';
      this.syncStatus.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Get all available services
   */
  async getAvailableServices(): Promise<MCPService[]> {
    // Try cache first
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<MCPService[]>('services');
      if (cached) {
        return cached;
      }
    }

    // Fetch from cloud
    const services = await this.fetcher.fetchAllServices();
    this.cache.set('services', services);
    await this.cache.save();

    return services;
  }

  /**
   * Get service by ID
   */
  async getService(id: string): Promise<MCPServiceDetail | null> {
    // Try cache first
    const cacheKey = `service:${id}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<MCPServiceDetail>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from cloud
    const service = await this.fetcher.fetchService(id);
    if (service) {
      this.cache.set(cacheKey, service);
      await this.cache.save();
    }

    return service;
  }

  /**
   * Search services
   */
  async searchServices(query: string, filters?: SearchFilters): Promise<MCPService[]> {
    const services = await this.getAvailableServices();

    // Filter by query
    let results = services.filter((service) => {
      const searchText = `${service.name} ${service.description} ${service.tags.join(' ')}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    // Apply filters
    if (filters) {
      results = this.applyFilters(results, filters);
    }

    return results;
  }

  /**
   * Get services by category
   */
  async getByCategory(category: string): Promise<MCPService[]> {
    const services = await this.getAvailableServices();
    return services.filter((service) => service.category.includes(category));
  }

  /**
   * Get trending services
   */
  async getTrending(limit: number = 10): Promise<MCPService[]> {
    // Try cache first
    const cacheKey = `trending:${limit}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<MCPService[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from cloud
    const trending = await this.fetcher.fetchTrending(limit);
    this.cache.set(cacheKey, trending);
    await this.cache.save();

    return trending;
  }

  /**
   * Get recommended services
   */
  async getRecommended(userProfile: UserProfile, limit: number = 10): Promise<MCPService[]> {
    // Fetch from cloud with user profile
    return await this.fetcher.fetchRecommended(userProfile, limit);
  }

  /**
   * Get service ratings
   */
  async getRatings(serviceId: string): Promise<ServiceRatings | null> {
    const cacheKey = `ratings:${serviceId}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ServiceRatings>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const ratings = await this.fetcher.fetchRatings(serviceId);
    if (ratings) {
      this.cache.set(cacheKey, ratings);
      await this.cache.save();
    }

    return ratings;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const services = await this.getAvailableServices();
    const categories = new Set<string>();

    services.forEach((service) => {
      service.category.forEach((cat) => categories.add(cat));
    });

    return Array.from(categories).sort();
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<string[]> {
    const services = await this.getAvailableServices();
    const tags = new Set<string>();

    services.forEach((service) => {
      service.tags.forEach((tag) => tags.add(tag));
    });

    return Array.from(tags).sort();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    this.scheduler.stop();
  }

  /**
   * Apply filters to services
   */
  private applyFilters(services: MCPService[], filters: SearchFilters): MCPService[] {
    let results = [...services];

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter((service) =>
        filters.categories!.some((cat) => service.category.includes(cat))
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((service) =>
        filters.tags!.some((tag) => service.tags.includes(tag))
      );
    }

    // Rating filter
    if (filters.minRating !== undefined) {
      results = results.filter((service) => service.rating >= filters.minRating!);
    }

    // Downloads filter
    if (filters.minDownloads !== undefined) {
      results = results.filter((service) => service.downloads >= filters.minDownloads!);
    }

    // Verified filter
    if (filters.verified !== undefined) {
      results = results.filter((service) => service.verified === filters.verified);
    }

    // Trending filter
    if (filters.trending !== undefined) {
      results = results.filter((service) => service.trending === filters.trending);
    }

    // Featured filter
    if (filters.featured !== undefined) {
      results = results.filter((service) => service.featured === filters.featured);
    }

    // License filter
    if (filters.license && filters.license.length > 0) {
      results = results.filter((service) => filters.license!.includes(service.license));
    }

    // Sort
    if (filters.sortBy) {
      results = this.sortServices(results, filters.sortBy, filters.sortOrder || 'desc');
    }

    // Pagination
    if (filters.offset !== undefined) {
      results = results.slice(filters.offset);
    }
    if (filters.limit !== undefined) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Sort services
   */
  private sortServices(
    services: MCPService[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): MCPService[] {
    const sorted = [...services];
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'updated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = 0;
      }

      return comparison * multiplier;
    });

    return sorted;
  }
}

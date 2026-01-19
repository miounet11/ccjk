/**
 * Search Engine
 * Advanced search and filtering for MCP services
 */

import {
  MCPService,
  SearchFilters,
} from '../types';
import { CloudMCPRegistry } from '../registry/cloud-registry';

export class SearchEngine {
  private registry: CloudMCPRegistry;

  constructor(registry: CloudMCPRegistry) {
    this.registry = registry;
  }

  /**
   * Search services with advanced filters
   */
  async search(query: string, filters?: SearchFilters): Promise<MCPService[]> {
    return await this.registry.searchServices(query, filters);
  }

  /**
   * Fuzzy search
   */
  async fuzzySearch(query: string): Promise<MCPService[]> {
    const services = await this.registry.getAvailableServices();
    const lowerQuery = query.toLowerCase();

    return services.filter((service) => {
      const searchText = `${service.name} ${service.description} ${service.tags.join(' ')} ${service.category.join(' ')}`.toLowerCase();

      // Check for partial matches
      const words = lowerQuery.split(' ');
      return words.every((word) => searchText.includes(word));
    });
  }

  /**
   * Search by category
   */
  async searchByCategory(categories: string[]): Promise<MCPService[]> {
    const services = await this.registry.getAvailableServices();

    return services.filter((service) =>
      categories.some((cat) => service.category.includes(cat))
    );
  }

  /**
   * Search by tags
   */
  async searchByTags(tags: string[]): Promise<MCPService[]> {
    const services = await this.registry.getAvailableServices();

    return services.filter((service) =>
      tags.some((tag) => service.tags.includes(tag))
    );
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(criteria: {
    query?: string;
    categories?: string[];
    tags?: string[];
    minRating?: number;
    minDownloads?: number;
    verified?: boolean;
    trending?: boolean;
    featured?: boolean;
  }): Promise<MCPService[]> {
    const filters: SearchFilters = {
      categories: criteria.categories,
      tags: criteria.tags,
      minRating: criteria.minRating,
      minDownloads: criteria.minDownloads,
      verified: criteria.verified,
      trending: criteria.trending,
      featured: criteria.featured,
    };

    return await this.registry.searchServices(criteria.query || '', filters);
  }

  /**
   * Search suggestions
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    const services = await this.registry.getAvailableServices();
    const suggestions = new Set<string>();

    const lowerQuery = query.toLowerCase();

    // Add matching service names
    services.forEach((service) => {
      if (service.name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(service.name);
      }
    });

    // Add matching tags
    services.forEach((service) => {
      service.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          suggestions.add(tag);
        }
      });
    });

    // Add matching categories
    services.forEach((service) => {
      service.category.forEach((cat) => {
        if (cat.toLowerCase().includes(lowerQuery)) {
          suggestions.add(cat);
        }
      });
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Search by author
   */
  async searchByAuthor(author: string): Promise<MCPService[]> {
    const services = await this.registry.getAvailableServices();

    return services.filter((service) =>
      service.author.toLowerCase().includes(author.toLowerCase())
    );
  }

  /**
   * Search similar services
   */
  async searchSimilar(serviceId: string, limit: number = 5): Promise<MCPService[]> {
    const services = await this.registry.getAvailableServices();
    const targetService = services.find((s) => s.id === serviceId);

    if (!targetService) {
      return [];
    }

    // Calculate similarity scores
    const scored = services
      .filter((s) => s.id !== serviceId)
      .map((service) => ({
        service,
        score: this.calculateSimilarity(targetService, service),
      }));

    // Sort by score and return top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((item) => item.service);
  }

  /**
   * Calculate similarity between two services
   */
  private calculateSimilarity(a: MCPService, b: MCPService): number {
    let score = 0;

    // Category overlap
    const categoryOverlap = a.category.filter((cat) => b.category.includes(cat)).length;
    score += categoryOverlap * 10;

    // Tag overlap
    const tagOverlap = a.tags.filter((tag) => b.tags.includes(tag)).length;
    score += tagOverlap * 5;

    // Same author
    if (a.author === b.author) {
      score += 15;
    }

    return score;
  }

  /**
   * Get popular searches
   */
  getPopularSearches(): string[] {
    return [
      'database',
      'api',
      'cloud',
      'docker',
      'git',
      'testing',
      'automation',
      'file system',
      'http',
      'documentation',
    ];
  }
}

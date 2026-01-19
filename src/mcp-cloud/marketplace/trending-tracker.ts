/**
 * Trending Tracker
 * Tracks and analyzes trending MCP services
 */

import { MCPService } from '../types';

export class TrendingTracker {
  private trendingHistory: Map<string, number[]> = new Map();

  /**
   * Track service popularity
   */
  trackPopularity(serviceId: string, score: number): void {
    if (!this.trendingHistory.has(serviceId)) {
      this.trendingHistory.set(serviceId, []);
    }

    const history = this.trendingHistory.get(serviceId)!;
    history.push(score);

    // Keep only last 30 data points
    if (history.length > 30) {
      history.shift();
    }
  }

  /**
   * Calculate trending score
   */
  calculateTrendingScore(service: MCPService): number {
    let score = 0;

    // Recent downloads (weighted more)
    score += Math.log10(service.downloads + 1) * 10;

    // Rating
    score += service.rating * 5;

    // Reviews
    score += Math.log10(service.reviews + 1) * 3;

    // Recent update (within 30 days)
    const daysSinceUpdate = this.getDaysSinceUpdate(service.lastUpdated);
    if (daysSinceUpdate < 30) {
      score += (30 - daysSinceUpdate) * 0.5;
    }

    // Verified boost
    if (service.verified) {
      score += 10;
    }

    // Featured boost
    if (service.featured) {
      score += 5;
    }

    return score;
  }

  /**
   * Get trending services
   */
  getTrending(services: MCPService[], limit: number = 10): MCPService[] {
    const scored = services.map((service) => ({
      service,
      score: this.calculateTrendingScore(service),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((item) => item.service);
  }

  /**
   * Get rising stars (new services gaining traction)
   */
  getRisingStars(services: MCPService[], limit: number = 5): MCPService[] {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newServices = services.filter(
      (service) => new Date(service.lastUpdated) > thirtyDaysAgo
    );

    return this.getTrending(newServices, limit);
  }

  /**
   * Get trending by category
   */
  getTrendingByCategory(
    services: MCPService[],
    category: string,
    limit: number = 5
  ): MCPService[] {
    const filtered = services.filter((service) => service.category.includes(category));
    return this.getTrending(filtered, limit);
  }

  /**
   * Predict future trending
   */
  predictTrending(services: MCPService[], limit: number = 5): MCPService[] {
    const predictions = services.map((service) => {
      const history = this.trendingHistory.get(service.id) || [];
      const trend = this.calculateTrend(history);

      return {
        service,
        score: this.calculateTrendingScore(service) + trend * 10,
      };
    });

    predictions.sort((a, b) => b.score - a.score);
    return predictions.slice(0, limit).map((item) => item.service);
  }

  /**
   * Calculate trend from history
   */
  private calculateTrend(history: number[]): number {
    if (history.length < 2) {
      return 0;
    }

    // Simple linear regression
    const n = history.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i];
      sumXY += i * history[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Get days since last update
   */
  private getDaysSinceUpdate(lastUpdated: string): number {
    const now = new Date();
    const updated = new Date(lastUpdated);
    const diff = now.getTime() - updated.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get trending tags
   */
  getTrendingTags(services: MCPService[], limit: number = 10): string[] {
    const tagCounts = new Map<string, number>();

    // Count tags from trending services
    const trending = this.getTrending(services, 20);

    trending.forEach((service) => {
      service.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Sort by count
    const sorted = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, limit).map((item) => item[0]);
  }

  /**
   * Get trending categories
   */
  getTrendingCategories(services: MCPService[], limit: number = 5): string[] {
    const categoryCounts = new Map<string, number>();

    // Count categories from trending services
    const trending = this.getTrending(services, 20);

    trending.forEach((service) => {
      service.category.forEach((cat) => {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      });
    });

    // Sort by count
    const sorted = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, limit).map((item) => item[0]);
  }
}

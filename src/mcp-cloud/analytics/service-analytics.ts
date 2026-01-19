/**
 * Service Analytics
 * Track and analyze service usage and performance
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  AnalyticsEvent,
  UsageStats,
  PerformanceMetrics,
} from '../types';

export class ServiceAnalytics {
  private eventsPath: string;
  private events: AnalyticsEvent[];
  private sessionId: string;

  constructor() {
    this.eventsPath = path.join(os.homedir(), '.ccjk', 'analytics.json');
    this.events = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize analytics
   */
  async initialize(): Promise<void> {
    await this.loadEvents();
  }

  /**
   * Track service usage
   */
  trackUsage(serviceId: string, action: string, metadata?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      serviceId,
      action,
      timestamp: new Date().toISOString(),
      metadata,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // Save periodically (every 10 events)
    if (this.events.length % 10 === 0) {
      this.saveEvents();
    }
  }

  /**
   * Get usage statistics for a service
   */
  getUsageStats(serviceId: string): UsageStats {
    const serviceEvents = this.events.filter((e) => e.serviceId === serviceId);

    const totalCalls = serviceEvents.length;
    const successfulCalls = serviceEvents.filter(
      (e) => e.action === 'success' || !e.action.includes('error')
    ).length;
    const failedCalls = totalCalls - successfulCalls;

    // Calculate average response time
    const responseTimes = serviceEvents
      .filter((e) => e.metadata?.responseTime)
      .map((e) => e.metadata!.responseTime as number);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Get last used
    const lastUsed =
      serviceEvents.length > 0
        ? serviceEvents[serviceEvents.length - 1].timestamp
        : '';

    // Get most used features
    const featureCounts = new Map<string, number>();
    serviceEvents.forEach((e) => {
      if (e.metadata?.feature) {
        const feature = e.metadata.feature as string;
        featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
      }
    });

    const mostUsedFeatures = Array.from(featureCounts.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get daily usage
    const dailyUsage = this.calculateDailyUsage(serviceEvents);

    return {
      serviceId,
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      lastUsed,
      mostUsedFeatures,
      dailyUsage,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(serviceId: string): PerformanceMetrics {
    const serviceEvents = this.events.filter((e) => e.serviceId === serviceId);

    const responseTimes = serviceEvents
      .filter((e) => e.metadata?.responseTime)
      .map((e) => e.metadata!.responseTime as number)
      .sort((a, b) => a - b);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const p50ResponseTime = this.percentile(responseTimes, 50);
    const p95ResponseTime = this.percentile(responseTimes, 95);
    const p99ResponseTime = this.percentile(responseTimes, 99);

    const totalCalls = serviceEvents.length;
    const failedCalls = serviceEvents.filter((e) =>
      e.action.includes('error')
    ).length;
    const errorRate = totalCalls > 0 ? failedCalls / totalCalls : 0;

    // Calculate uptime (simplified)
    const uptime = totalCalls > 0 ? 1 - errorRate : 1;

    return {
      serviceId,
      averageResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      uptime,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Get satisfaction score (based on success rate and performance)
   */
  getSatisfactionScore(serviceId: string): number {
    const stats = this.getUsageStats(serviceId);
    const metrics = this.getPerformanceMetrics(serviceId);

    if (stats.totalCalls === 0) {
      return 0;
    }

    // Success rate (0-50 points)
    const successRate = stats.successfulCalls / stats.totalCalls;
    const successScore = successRate * 50;

    // Performance score (0-30 points)
    const performanceScore = Math.max(0, 30 - metrics.averageResponseTime / 100);

    // Uptime score (0-20 points)
    const uptimeScore = metrics.uptime * 20;

    return Math.round(successScore + performanceScore + uptimeScore);
  }

  /**
   * Get all service statistics
   */
  getAllStats(): Map<string, UsageStats> {
    const serviceIds = new Set(this.events.map((e) => e.serviceId));
    const stats = new Map<string, UsageStats>();

    serviceIds.forEach((serviceId) => {
      stats.set(serviceId, this.getUsageStats(serviceId));
    });

    return stats;
  }

  /**
   * Get top services by usage
   */
  getTopServices(limit: number = 10): Array<{ serviceId: string; calls: number }> {
    const serviceCounts = new Map<string, number>();

    this.events.forEach((e) => {
      serviceCounts.set(e.serviceId, (serviceCounts.get(e.serviceId) || 0) + 1);
    });

    return Array.from(serviceCounts.entries())
      .map(([serviceId, calls]) => ({ serviceId, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);
  }

  /**
   * Clear analytics data
   */
  async clearAnalytics(): Promise<void> {
    this.events = [];
    await this.saveEvents();
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(outputPath: string): Promise<void> {
    const data = {
      events: this.events,
      summary: {
        totalEvents: this.events.length,
        services: Array.from(new Set(this.events.map((e) => e.serviceId))),
        dateRange: {
          start: this.events[0]?.timestamp || '',
          end: this.events[this.events.length - 1]?.timestamp || '',
        },
      },
    };

    await fs.promises.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Calculate daily usage
   */
  private calculateDailyUsage(
    events: AnalyticsEvent[]
  ): Array<{ date: string; calls: number }> {
    const dailyCounts = new Map<string, number>();

    events.forEach((e) => {
      const date = e.timestamp.split('T')[0];
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    return Array.from(dailyCounts.entries())
      .map(([date, calls]) => ({ date, calls }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load events from disk
   */
  private async loadEvents(): Promise<void> {
    try {
      if (!fs.existsSync(this.eventsPath)) {
        return;
      }

      const data = await fs.promises.readFile(this.eventsPath, 'utf-8');
      this.events = JSON.parse(data);
    } catch (error) {
      this.events = [];
    }
  }

  /**
   * Save events to disk
   */
  private async saveEvents(): Promise<void> {
    try {
      const dir = path.dirname(this.eventsPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      await fs.promises.writeFile(
        this.eventsPath,
        JSON.stringify(this.events, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save analytics:', error);
    }
  }
}

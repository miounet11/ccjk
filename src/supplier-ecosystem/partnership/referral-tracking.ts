/**
 * Referral Tracking System
 * Tracks referrals from supplier websites and measures conversion
 */

import { ReferralTracking } from '../types';

export interface ReferralStats {
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  averageConversionTime: number;
  topSources: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
}

export class ReferralTracker {
  private referrals: Map<string, ReferralTracking>;
  private storage: ReferralStorage;

  constructor(storage?: ReferralStorage) {
    this.referrals = new Map();
    this.storage = storage || new InMemoryReferralStorage();
    this.loadReferrals();
  }

  /**
   * Track a new referral
   */
  async trackReferral(data: {
    supplierId: string;
    source: string;
    referralCode?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const referralId = this.generateReferralId();
    const referral: ReferralTracking = {
      referralId,
      supplierId: data.supplierId,
      source: data.source,
      timestamp: new Date(),
      userId: data.userId,
      converted: false,
      metadata: data.metadata,
    };

    this.referrals.set(referralId, referral);
    await this.storage.save(referralId, referral);

    return referralId;
  }

  /**
   * Mark referral as converted
   */
  async markConverted(referralId: string, userId?: string): Promise<boolean> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      return false;
    }

    referral.converted = true;
    referral.conversionTimestamp = new Date();
    if (userId) {
      referral.userId = userId;
    }

    await this.storage.save(referralId, referral);
    return true;
  }

  /**
   * Get referral by ID
   */
  getReferral(referralId: string): ReferralTracking | undefined {
    return this.referrals.get(referralId);
  }

  /**
   * Get all referrals for a supplier
   */
  getSupplierReferrals(supplierId: string): ReferralTracking[] {
    return Array.from(this.referrals.values()).filter(
      r => r.supplierId === supplierId
    );
  }

  /**
   * Get referral statistics for a supplier
   */
  getSupplierStats(supplierId: string, period?: { start: Date; end: Date }): ReferralStats {
    let referrals = this.getSupplierReferrals(supplierId);

    // Filter by period if provided
    if (period) {
      referrals = referrals.filter(
        r => r.timestamp >= period.start && r.timestamp <= period.end
      );
    }

    const totalReferrals = referrals.length;
    const convertedReferrals = referrals.filter(r => r.converted).length;
    const conversionRate = totalReferrals > 0 ? convertedReferrals / totalReferrals : 0;

    // Calculate average conversion time
    const conversionTimes = referrals
      .filter(r => r.converted && r.conversionTimestamp)
      .map(r => {
        const conversionTime = r.conversionTimestamp!.getTime() - r.timestamp.getTime();
        return conversionTime;
      });

    const averageConversionTime = conversionTimes.length > 0
      ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
      : 0;

    // Calculate top sources
    const sourceStats = new Map<string, { count: number; converted: number }>();
    referrals.forEach(r => {
      const stats = sourceStats.get(r.source) || { count: 0, converted: 0 };
      stats.count++;
      if (r.converted) {
        stats.converted++;
      }
      sourceStats.set(r.source, stats);
    });

    const topSources = Array.from(sourceStats.entries())
      .map(([source, stats]) => ({
        source,
        count: stats.count,
        conversionRate: stats.count > 0 ? stats.converted / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalReferrals,
      convertedReferrals,
      conversionRate,
      averageConversionTime,
      topSources,
    };
  }

  /**
   * Get global referral statistics
   */
  getGlobalStats(period?: { start: Date; end: Date }): ReferralStats {
    let allReferrals = Array.from(this.referrals.values());

    if (period) {
      allReferrals = allReferrals.filter(
        r => r.timestamp >= period.start && r.timestamp <= period.end
      );
    }

    const totalReferrals = allReferrals.length;
    const convertedReferrals = allReferrals.filter(r => r.converted).length;
    const conversionRate = totalReferrals > 0 ? convertedReferrals / totalReferrals : 0;

    const conversionTimes = allReferrals
      .filter(r => r.converted && r.conversionTimestamp)
      .map(r => r.conversionTimestamp!.getTime() - r.timestamp.getTime());

    const averageConversionTime = conversionTimes.length > 0
      ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
      : 0;

    // Top sources across all suppliers
    const sourceStats = new Map<string, { count: number; converted: number }>();
    allReferrals.forEach(r => {
      const stats = sourceStats.get(r.source) || { count: 0, converted: 0 };
      stats.count++;
      if (r.converted) {
        stats.converted++;
      }
      sourceStats.set(r.source, stats);
    });

    const topSources = Array.from(sourceStats.entries())
      .map(([source, stats]) => ({
        source,
        count: stats.count,
        conversionRate: stats.count > 0 ? stats.converted / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalReferrals,
      convertedReferrals,
      conversionRate,
      averageConversionTime,
      topSources,
    };
  }

  /**
   * Generate referral report
   */
  generateReport(supplierId: string, period?: { start: Date; end: Date }): string {
    const stats = this.getSupplierStats(supplierId, period);
    const periodStr = period
      ? `${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}`
      : 'All time';

    return `
# Referral Report for ${supplierId}
Period: ${periodStr}

## Overview
- Total Referrals: ${stats.totalReferrals}
- Converted: ${stats.convertedReferrals}
- Conversion Rate: ${(stats.conversionRate * 100).toFixed(2)}%
- Avg. Conversion Time: ${this.formatDuration(stats.averageConversionTime)}

## Top Referral Sources
${stats.topSources.map((source, i) => `
${i + 1}. ${source.source}
   - Referrals: ${source.count}
   - Conversion Rate: ${(source.conversionRate * 100).toFixed(2)}%
`).join('')}

## Insights
${this.generateInsights(stats)}
    `.trim();
  }

  /**
   * Generate insights from statistics
   */
  private generateInsights(stats: ReferralStats): string {
    const insights: string[] = [];

    if (stats.conversionRate > 0.5) {
      insights.push('✅ Excellent conversion rate! Your integration is working well.');
    } else if (stats.conversionRate > 0.3) {
      insights.push('👍 Good conversion rate. Consider optimizing the setup flow.');
    } else if (stats.conversionRate > 0) {
      insights.push('⚠️  Low conversion rate. Users may be encountering setup issues.');
    }

    if (stats.averageConversionTime < 60000) {
      insights.push('⚡ Very fast conversions! Users are setting up quickly.');
    } else if (stats.averageConversionTime < 300000) {
      insights.push('✓ Reasonable conversion time.');
    } else {
      insights.push('🐌 Slow conversions. Consider simplifying the setup process.');
    }

    if (stats.topSources.length > 0) {
      const topSource = stats.topSources[0];
      insights.push(`🎯 Best performing source: ${topSource.source} (${(topSource.conversionRate * 100).toFixed(1)}% conversion)`);
    }

    return insights.join('\n');
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate unique referral ID
   */
  private generateReferralId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load referrals from storage
   */
  private async loadReferrals(): Promise<void> {
    const stored = await this.storage.loadAll();
    stored.forEach(referral => {
      this.referrals.set(referral.referralId, referral);
    });
  }

  /**
   * Export referral data
   */
  exportData(supplierId?: string): ReferralTracking[] {
    if (supplierId) {
      return this.getSupplierReferrals(supplierId);
    }
    return Array.from(this.referrals.values());
  }

  /**
   * Clear old referrals
   */
  async clearOldReferrals(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleared = 0;
    for (const [id, referral] of this.referrals.entries()) {
      if (referral.timestamp < cutoffDate) {
        this.referrals.delete(id);
        await this.storage.delete(id);
        cleared++;
      }
    }

    return cleared;
  }
}

/**
 * Referral Storage Interface
 */
export interface ReferralStorage {
  save(id: string, referral: ReferralTracking): Promise<void>;
  load(id: string): Promise<ReferralTracking | null>;
  loadAll(): Promise<ReferralTracking[]>;
  delete(id: string): Promise<void>;
}

/**
 * In-Memory Referral Storage (for testing/development)
 */
export class InMemoryReferralStorage implements ReferralStorage {
  private data: Map<string, ReferralTracking> = new Map();

  async save(id: string, referral: ReferralTracking): Promise<void> {
    this.data.set(id, referral);
  }

  async load(id: string): Promise<ReferralTracking | null> {
    return this.data.get(id) || null;
  }

  async loadAll(): Promise<ReferralTracking[]> {
    return Array.from(this.data.values());
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }
}

/**
 * File-based Referral Storage
 */
export class FileReferralStorage implements ReferralStorage {
  private filePath: string;

  constructor(filePath: string = '.ccjk-referrals.json') {
    this.filePath = filePath;
  }

  async save(id: string, referral: ReferralTracking): Promise<void> {
    const all = await this.loadAll();
    const index = all.findIndex(r => r.referralId === id);
    if (index >= 0) {
      all[index] = referral;
    } else {
      all.push(referral);
    }
    await this.writeFile(all);
  }

  async load(id: string): Promise<ReferralTracking | null> {
    const all = await this.loadAll();
    return all.find(r => r.referralId === id) || null;
  }

  async loadAll(): Promise<ReferralTracking[]> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    const all = await this.loadAll();
    const filtered = all.filter(r => r.referralId !== id);
    await this.writeFile(filtered);
  }

  private async writeFile(data: ReferralTracking[]): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

/**
 * Create a referral tracker instance
 */
export function createReferralTracker(storage?: ReferralStorage): ReferralTracker {
  return new ReferralTracker(storage);
}

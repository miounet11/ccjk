/**
 * Analytics API Client for api.claudehome.cn
 * Handles analytics events and reporting
 */

import type {
  AnalyticsEvent,
  SkillAnalytics,
  UserAnalytics,
} from './types.js'
import { APIClient } from './client.js'
import { API_PATHS } from './config.js'

export class AnalyticsAPIClient extends APIClient {
  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    await this.post(API_PATHS.ANALYTICS_EVENT, event)
  }

  /**
   * Track skill download
   */
  async trackDownload(skillId: string, userId?: string): Promise<void> {
    await this.trackEvent({
      eventType: 'download',
      skillId,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track skill view
   */
  async trackView(skillId: string, userId?: string): Promise<void> {
    await this.trackEvent({
      eventType: 'view',
      skillId,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track skill rating
   */
  async trackRating(skillId: string, rating: number, userId?: string): Promise<void> {
    await this.trackEvent({
      eventType: 'rating',
      skillId,
      userId,
      metadata: { rating },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track search query
   */
  async trackSearch(query: string, results: number, userId?: string): Promise<void> {
    await this.trackEvent({
      eventType: 'search',
      userId,
      metadata: { query, results },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track skill install
   */
  async trackInstall(skillId: string, userId?: string): Promise<void> {
    await this.trackEvent({
      eventType: 'install',
      skillId,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track skill uninstall
   */
  async trackUninstall(skillId: string, userId?: string, reason?: string): Promise<void> {
    await this.trackEvent({
      eventType: 'uninstall',
      skillId,
      userId,
      metadata: { reason },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Batch track events
   */
  async batchTrackEvents(events: AnalyticsEvent[]): Promise<void> {
    await this.post('/analytics/events/batch', { events })
  }

  /**
   * Get skill analytics
   */
  async getSkillAnalytics(
    skillId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  ): Promise<SkillAnalytics> {
    return this.get<SkillAnalytics>(API_PATHS.ANALYTICS_SKILL(skillId), {
      params: { period },
      cache: true,
    })
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  ): Promise<UserAnalytics> {
    return this.get<UserAnalytics>(API_PATHS.ANALYTICS_USER(userId), {
      params: { period },
      cache: true,
    })
  }

  /**
   * Get skill download trends
   */
  async getSkillDownloadTrends(
    skillId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30,
  ): Promise<{
    skillId: string
    period: string
    data: Array<{
      date: string
      downloads: number
    }>
  }> {
    return this.get<any>(`${API_PATHS.ANALYTICS_SKILL(skillId)}/downloads`, {
      params: { period, days },
      cache: true,
    })
  }

  /**
   * Get skill view trends
   */
  async getSkillViewTrends(
    skillId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30,
  ): Promise<{
    skillId: string
    period: string
    data: Array<{
      date: string
      views: number
    }>
  }> {
    return this.get<any>(`${API_PATHS.ANALYTICS_SKILL(skillId)}/views`, {
      params: { period, days },
      cache: true,
    })
  }

  /**
   * Get skill rating trends
   */
  async getSkillRatingTrends(
    skillId: string,
    days: number = 30,
  ): Promise<{
    skillId: string
    data: Array<{
      date: string
      averageRating: number
      ratingCount: number
    }>
  }> {
    return this.get<any>(`${API_PATHS.ANALYTICS_SKILL(skillId)}/ratings`, {
      params: { days },
      cache: true,
    })
  }

  /**
   * Get top performing skills
   */
  async getTopPerformingSkills(options?: {
    sortBy: 'downloads' | 'views' | 'rating' | 'installs'
    period?: 'daily' | 'weekly' | 'monthly'
    limit?: number
  }): Promise<Array<{
    skillId: string
    name: string
    value: number
    change: number
  }>> {
    return this.get<any>('/analytics/top-skills', {
      params: options,
      cache: true,
    })
  }

  /**
   * Get overall analytics summary
   */
  async getAnalyticsSummary(): Promise<{
    totalViews: number
    totalDownloads: number
    totalInstalls: number
    totalUninstalls: number
    averageRating: number
    activeSkills: number
    activeUsers: number
    period: string
  }> {
    return this.get<any>('/analytics/summary', { cache: true })
  }

  /**
   * Get skill comparison
   */
  async compareSkills(skillIds: string[]): Promise<{
    skills: Array<{
      skillId: string
      name: string
      views: number
      downloads: number
      rating: number
      installs: number
    }>
    comparison: {
      highestViews: string
      highestDownloads: string
      highestRating: string
      highestInstalls: string
    }
  }> {
    return this.post<any>('/analytics/compare', { skillIds })
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<{
    userId: string
    period: string
    metrics: {
      totalSkills: number
      totalDownloads: number
      totalInstalls: number
      totalReviews: number
      totalComments: number
      averageSessionDuration: number
      lastActive: string
    }
    trends: {
      skills: number
      downloads: number
      installs: number
    }
  }> {
    return this.get<any>(`/analytics/users/${userId}/engagement`, {
      params: { period },
      cache: true,
    })
  }

  /**
   * Export analytics report
   */
  async exportAnalyticsReport(options: {
    skillId?: string
    userId?: string
    period: 'daily' | 'weekly' | 'monthly'
    format: 'json' | 'csv'
  }): Promise<Buffer> {
    const buffer = await this.download('/analytics/export', {
      params: options,
    })
    return buffer
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(): Promise<{
    timestamp: string
    currentUsers: number
    activeDownloads: number
    activeViews: number
    topSkills: Array<{
      skillId: string
      name: string
      views: number
      downloads: number
    }>
  }> {
    return this.get<any>('/analytics/realtime', {
      cache: false,
    })
  }

  /**
   * Get skill retention metrics
   */
  async getSkillRetentionMetrics(skillId: string): Promise<{
    skillId: string
    retention: {
      day1: number
      day7: number
      day30: number
      day90: number
    }
    uninstallRate: number
    avgUsageDuration: number
  }> {
    return this.get<any>(`/analytics/skills/${skillId}/retention`, {
      cache: true,
    })
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<{
    period: string
    totalSearches: number
    topQueries: Array<{
      query: string
      count: number
      avgResults: number
    }>
    zeroResultQueries: string[]
    popularFilters: Array<{
      filter: string
      count: number
    }>
  }> {
    return this.get<any>('/analytics/search', {
      params: { period },
      cache: true,
    })
  }

  /**
   * Track custom event
   */
  async trackCustomEvent(
    eventType: string,
    data: Record<string, any>,
    userId?: string,
  ): Promise<void> {
    await this.trackEvent({
      eventType: eventType as any,
      userId,
      metadata: data,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Get funnel analytics
   */
  async getFunnelAnalytics(funnelName: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<{
    funnelName: string
    period: string
    steps: Array<{
      stepName: string
      count: number
      conversionRate: number
      dropOffRate: number
    }>
    overallConversionRate: number
  }> {
    return this.get<any>(`/analytics/funnels/${funnelName}`, {
      params: { period },
      cache: true,
    })
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(cohortType: 'install_date' | 'signup_date', period: string): Promise<{
    cohortType: string
    period: string
    cohorts: Array<{
      cohort: string
      size: number
      retention: number[]
    }>
  }> {
    return this.get<any>('/analytics/cohorts', {
      params: { cohortType, period },
      cache: true,
    })
  }
}

/**
 * Factory function to create Analytics API client
 */
export function createAnalyticsClient(config?: import('./client.js').ClientConfig): AnalyticsAPIClient {
  return new AnalyticsAPIClient(config)
}

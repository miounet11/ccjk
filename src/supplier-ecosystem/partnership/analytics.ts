/**
 * Supplier Analytics System
 * Provides detailed analytics for API providers
 */

import type { SupplierActivity, SupplierAnalytics, SupplierInsight } from '../types'
import { ReferralTracker } from './referral-tracking'

export interface UsageEvent {
  timestamp: Date
  userId: string
  supplierId: string
  eventType: 'setup' | 'request' | 'error' | 'switch'
  model?: string
  tokens?: number
  success: boolean
  duration?: number
  metadata?: Record<string, any>
}

export interface SatisfactionFeedback {
  timestamp: Date
  userId: string
  supplierId: string
  score: number // 1-5
  comment?: string
  category: 'setup' | 'performance' | 'support' | 'overall'
}

export class SupplierAnalyticsEngine {
  private usageEvents: UsageEvent[] = []
  private satisfactionFeedback: SatisfactionFeedback[] = []
  private referralTracker: ReferralTracker

  constructor(referralTracker?: ReferralTracker) {
    this.referralTracker = referralTracker || new ReferralTracker()
  }

  /**
   * Track usage event
   */
  trackEvent(event: UsageEvent): void {
    this.usageEvents.push(event)
  }

  /**
   * Track satisfaction feedback
   */
  trackSatisfaction(feedback: SatisfactionFeedback): void {
    this.satisfactionFeedback.push(feedback)
  }

  /**
   * Generate analytics for a supplier
   */
  generateAnalytics(
    supplierId: string,
    period: { start: Date, end: Date },
  ): SupplierAnalytics {
    // Filter events for this supplier and period
    const events = this.usageEvents.filter(
      e =>
        e.supplierId === supplierId
        && e.timestamp >= period.start
        && e.timestamp <= period.end,
    )

    const feedback = this.satisfactionFeedback.filter(
      f =>
        f.supplierId === supplierId
        && f.timestamp >= period.start
        && f.timestamp <= period.end,
    )

    // Calculate metrics
    const metrics = this.calculateMetrics(events, feedback)
    const referrals = this.calculateReferralMetrics(supplierId, period)
    const usage = this.calculateUsageMetrics(events)
    const revenue = this.calculateRevenueMetrics(events)

    return {
      supplierId,
      period,
      metrics,
      referrals,
      usage,
      revenue,
    }
  }

  /**
   * Calculate core metrics
   */
  private calculateMetrics(
    events: UsageEvent[],
    feedback: SatisfactionFeedback[],
  ): SupplierAnalytics['metrics'] {
    const setupEvents = events.filter(e => e.eventType === 'setup')
    const uniqueUsers = new Set(events.map(e => e.userId))
    const newUsers = new Set(setupEvents.map(e => e.userId))
    const activeUsers = new Set(
      events.filter(e => e.eventType === 'request').map(e => e.userId),
    )

    const setupsCompleted = setupEvents.filter(e => e.success).length
    const setupsAbandoned = setupEvents.filter(e => !e.success).length

    const setupTimes = setupEvents
      .filter(e => e.success && e.duration)
      .map(e => e.duration!)
    const averageSetupTime
      = setupTimes.length > 0
        ? setupTimes.reduce((a, b) => a + b, 0) / setupTimes.length
        : 0

    const successRate
      = events.length > 0 ? events.filter(e => e.success).length / events.length : 0

    const satisfactionScore
      = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length
        : 0

    return {
      totalUsers: uniqueUsers.size,
      newUsers: newUsers.size,
      activeUsers: activeUsers.size,
      setupsCompleted,
      setupsAbandoned,
      averageSetupTime,
      successRate,
      satisfactionScore,
    }
  }

  /**
   * Calculate referral metrics
   */
  private calculateReferralMetrics(
    supplierId: string,
    period: { start: Date, end: Date },
  ): SupplierAnalytics['referrals'] {
    const stats = this.referralTracker.getSupplierStats(supplierId, period)

    return {
      totalReferrals: stats.totalReferrals,
      conversionRate: stats.conversionRate,
      topSources: stats.topSources,
    }
  }

  /**
   * Calculate usage metrics
   */
  private calculateUsageMetrics(events: UsageEvent[]): SupplierAnalytics['usage'] {
    const requestEvents = events.filter(e => e.eventType === 'request')

    const totalTokens = requestEvents.reduce((sum, e) => sum + (e.tokens || 0), 0)
    const totalRequests = requestEvents.length
    const averageTokensPerRequest
      = totalRequests > 0 ? totalTokens / totalRequests : 0

    // Calculate top models
    const modelUsage = new Map<string, number>()
    requestEvents.forEach((e) => {
      if (e.model) {
        modelUsage.set(e.model, (modelUsage.get(e.model) || 0) + (e.tokens || 1))
      }
    })

    const topModels = Array.from(modelUsage.entries())
      .map(([model, usage]) => ({
        model,
        usage,
        percentage: totalTokens > 0 ? usage / totalTokens : 0,
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5)

    return {
      totalTokens,
      totalRequests,
      averageTokensPerRequest,
      topModels,
    }
  }

  /**
   * Calculate revenue metrics
   */
  private calculateRevenueMetrics(events: UsageEvent[]): SupplierAnalytics['revenue'] {
    const requestEvents = events.filter(e => e.eventType === 'request')
    const totalTokens = requestEvents.reduce((sum, e) => sum + (e.tokens || 0), 0)

    // Estimate revenue (assuming $0.01 per 1K tokens as baseline)
    const estimatedRevenue = (totalTokens / 1000) * 0.01

    // Calculate growth (compare to previous period)
    // This is simplified - in production, you'd compare to actual previous period
    const revenueGrowth = 0.15 // 15% growth placeholder

    const uniqueUsers = new Set(requestEvents.map(e => e.userId)).size
    const averageRevenuePerUser = uniqueUsers > 0 ? estimatedRevenue / uniqueUsers : 0

    return {
      estimatedRevenue,
      revenueGrowth,
      averageRevenuePerUser,
    }
  }

  /**
   * Get recent activity
   */
  getRecentActivity(supplierId: string, limit: number = 50): SupplierActivity[] {
    return this.usageEvents
      .filter(e => e.supplierId === supplierId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map(e => ({
        timestamp: e.timestamp,
        type: e.eventType === 'request' ? 'usage' as const : e.eventType === 'error' ? 'usage' as const : e.eventType as 'setup' | 'switch',
        userId: e.userId,
        details: this.formatEventDetails(e),
        success: e.success,
      }))
  }

  /**
   * Generate insights
   */
  generateInsights(analytics: SupplierAnalytics): SupplierInsight[] {
    const insights: SupplierInsight[] = []

    // Setup success rate insight
    const setupSuccessRate
      = analytics.metrics.setupsCompleted
        / (analytics.metrics.setupsCompleted + analytics.metrics.setupsAbandoned)

    if (setupSuccessRate < 0.7) {
      insights.push({
        type: 'warning',
        title: 'Low Setup Success Rate',
        description: `Only ${(setupSuccessRate * 100).toFixed(1)}% of setup attempts succeed. Users may be encountering issues.`,
        actionable: true,
        action: 'Review setup flow and error messages',
      })
    }
    else if (setupSuccessRate > 0.9) {
      insights.push({
        type: 'success',
        title: 'Excellent Setup Success Rate',
        description: `${(setupSuccessRate * 100).toFixed(1)}% of setup attempts succeed. Great job!`,
        actionable: false,
      })
    }

    // Satisfaction score insight
    if (analytics.metrics.satisfactionScore < 3.5) {
      insights.push({
        type: 'warning',
        title: 'Low Satisfaction Score',
        description: `Average satisfaction is ${analytics.metrics.satisfactionScore.toFixed(1)}/5. Users are not fully satisfied.`,
        actionable: true,
        action: 'Collect detailed feedback and improve user experience',
      })
    }
    else if (analytics.metrics.satisfactionScore > 4.5) {
      insights.push({
        type: 'success',
        title: 'High Satisfaction Score',
        description: `Users love your service! Average score: ${analytics.metrics.satisfactionScore.toFixed(1)}/5`,
        actionable: false,
      })
    }

    // Referral conversion insight
    if (analytics.referrals.conversionRate < 0.3) {
      insights.push({
        type: 'warning',
        title: 'Low Referral Conversion',
        description: `Only ${(analytics.referrals.conversionRate * 100).toFixed(1)}% of referrals convert. Improve your landing page.`,
        actionable: true,
        action: 'Optimize referral landing page and setup flow',
      })
    }
    else if (analytics.referrals.conversionRate > 0.6) {
      insights.push({
        type: 'success',
        title: 'Excellent Referral Conversion',
        description: `${(analytics.referrals.conversionRate * 100).toFixed(1)}% of referrals convert. Your integration is working great!`,
        actionable: false,
      })
    }

    // Growth insight
    if (analytics.revenue.revenueGrowth > 0.2) {
      insights.push({
        type: 'success',
        title: 'Strong Growth',
        description: `Revenue growing at ${(analytics.revenue.revenueGrowth * 100).toFixed(1)}% - keep it up!`,
        actionable: false,
      })
    }
    else if (analytics.revenue.revenueGrowth < 0) {
      insights.push({
        type: 'warning',
        title: 'Declining Revenue',
        description: `Revenue is declining. Consider promotional campaigns or feature improvements.`,
        actionable: true,
        action: 'Launch promotional campaign or add new features',
      })
    }

    // Setup time insight
    if (analytics.metrics.averageSetupTime > 120000) {
      // 2 minutes
      insights.push({
        type: 'info',
        title: 'Setup Time Could Be Faster',
        description: `Average setup takes ${(analytics.metrics.averageSetupTime / 1000).toFixed(0)}s. Consider simplifying.`,
        actionable: true,
        action: 'Simplify setup process or add auto-configuration',
      })
    }
    else if (analytics.metrics.averageSetupTime < 30000) {
      // 30 seconds
      insights.push({
        type: 'success',
        title: 'Lightning Fast Setup',
        description: `Average setup takes only ${(analytics.metrics.averageSetupTime / 1000).toFixed(0)}s!`,
        actionable: false,
      })
    }

    return insights
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analytics: SupplierAnalytics): string[] {
    const recommendations: string[] = []

    // Based on metrics
    if (analytics.metrics.setupsAbandoned > analytics.metrics.setupsCompleted * 0.3) {
      recommendations.push('Add better error messages and help text during setup')
    }

    if (analytics.metrics.satisfactionScore < 4.0) {
      recommendations.push('Conduct user surveys to identify pain points')
    }

    if (analytics.referrals.conversionRate < 0.4) {
      recommendations.push('Optimize your referral landing page with clear CTAs')
    }

    if (analytics.metrics.averageSetupTime > 60000) {
      recommendations.push('Implement one-click setup or auto-configuration')
    }

    // Based on top sources
    if (analytics.referrals.topSources.length > 0) {
      const topSource = analytics.referrals.topSources[0]
      recommendations.push(
        `Focus marketing efforts on ${topSource.source} - it's your best performing channel`,
      )
    }

    // Based on usage patterns
    if (analytics.usage.topModels.length > 0) {
      const topModel = analytics.usage.topModels[0]
      recommendations.push(
        `Highlight ${topModel.model} in your marketing - it's your most popular model`,
      )
    }

    return recommendations
  }

  /**
   * Format event details
   */
  private formatEventDetails(event: UsageEvent): string {
    switch (event.eventType) {
      case 'setup':
        return event.success ? 'Setup completed' : 'Setup failed'
      case 'request':
        return `API request (${event.tokens || 0} tokens)`
      case 'error':
        return 'Error occurred'
      case 'switch':
        return 'Switched provider'
      default:
        return 'Unknown event'
    }
  }

  /**
   * Export analytics data
   */
  exportAnalytics(supplierId: string, period: { start: Date, end: Date }): string {
    const analytics = this.generateAnalytics(supplierId, period)
    return JSON.stringify(analytics, null, 2)
  }

  /**
   * Generate analytics report
   */
  generateReport(supplierId: string, period: { start: Date, end: Date }): string {
    const analytics = this.generateAnalytics(supplierId, period)
    const insights = this.generateInsights(analytics)
    const recommendations = this.generateRecommendations(analytics)

    return `
# Analytics Report for ${supplierId}
Period: ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}

## Key Metrics
- Total Users: ${analytics.metrics.totalUsers}
- New Users: ${analytics.metrics.newUsers}
- Active Users: ${analytics.metrics.activeUsers}
- Setup Success Rate: ${(analytics.metrics.successRate * 100).toFixed(1)}%
- Satisfaction Score: ${analytics.metrics.satisfactionScore.toFixed(1)}/5

## Usage Statistics
- Total Requests: ${analytics.usage.totalRequests}
- Total Tokens: ${analytics.usage.totalTokens.toLocaleString()}
- Avg Tokens/Request: ${analytics.usage.averageTokensPerRequest.toFixed(0)}

## Top Models
${analytics.usage.topModels.map((m, i) => `${i + 1}. ${m.model} - ${(m.percentage * 100).toFixed(1)}%`).join('\n')}

## Referrals
- Total Referrals: ${analytics.referrals.totalReferrals}
- Conversion Rate: ${(analytics.referrals.conversionRate * 100).toFixed(1)}%

## Top Referral Sources
${analytics.referrals.topSources.map((s, i) => `${i + 1}. ${s.source} - ${s.count} referrals (${(s.conversionRate * 100).toFixed(1)}% conversion)`).join('\n')}

## Revenue Estimate
- Estimated Revenue: $${analytics.revenue.estimatedRevenue.toFixed(2)}
- Growth: ${(analytics.revenue.revenueGrowth * 100).toFixed(1)}%
- Avg Revenue/User: $${analytics.revenue.averageRevenuePerUser.toFixed(2)}

## Insights
${insights.map(i => `${i.type === 'success' ? '✅' : i.type === 'warning' ? '⚠️' : 'ℹ️'} ${i.title}\n   ${i.description}`).join('\n\n')}

## Recommendations
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim()
  }
}

/**
 * Create an analytics engine instance
 */
export function createAnalyticsEngine(referralTracker?: ReferralTracker): SupplierAnalyticsEngine {
  return new SupplierAnalyticsEngine(referralTracker)
}

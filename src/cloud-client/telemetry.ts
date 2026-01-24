/**
 * Telemetry System for Cloud Client
 *
 * Anonymous usage reporting with batching and opt-out support
 * @module cloud-client/telemetry
 */

import type { CloudClient } from './client'
import type { UsageReport, UsageReportResponse, MetricType, TelemetryEvent, TelemetryConfig } from './types'
import consola from 'consola'
import { randomUUID } from 'node:crypto'

/**
 * Default telemetry configuration
 */
const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: true,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
}

/**
 * Telemetry reporter with batching
 */
export class TelemetryReporter {
  private client: CloudClient
  private config: TelemetryConfig
  private events: TelemetryEvent[] = []
  private flushTimer?: NodeJS.Timeout
  private userId: string

  constructor(client: CloudClient, config: Partial<TelemetryConfig> = {}) {
    this.client = client
    this.config = { ...DEFAULT_TELEMETRY_CONFIG, ...config }
    this.userId = this.config.userId || this.generateUserId()

    // Start flush timer if enabled
    if (this.config.enabled) {
      this.startFlushTimer()
    }
  }

  /**
   * Generate or load anonymous user ID
   */
  private generateUserId(): string {
    // Try to load from environment or generate new
    const envUserId = process.env.CCJK_TELEMETRY_USER_ID
    if (envUserId) {
      return envUserId
    }

    // Generate anonymous ID
    return randomUUID()
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.flush().catch(error => {
          consola.warn('Failed to flush telemetry events:', error)
        })
      }
    }, this.config.flushInterval)

    // Ensure timer doesn't keep process alive
    this.flushTimer.unref()
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    // Check environment variable
    if (process.env.CCJK_TELEMETRY === 'false') {
      return false
    }

    // Check config
    return this.config.enabled
  }

  /**
   * Track an event
   *
   * @param type - Event type
   * @param data - Additional event data
   */
  track(type: MetricType, data?: Record<string, any>): void {
    if (!this.isEnabled()) {
      return
    }

    const event: TelemetryEvent = {
      type,
      data: {
        ...data,
        userId: this.userId,
      },
      timestamp: new Date().toISOString(),
    }

    this.events.push(event)
    consola.debug(`Telemetry event tracked: ${type}`, data)

    // Flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush().catch(error => {
        consola.warn('Failed to flush telemetry events:', error)
      })
    }
  }

  /**
   * Track template download
   */
  trackTemplateDownload(templateId: string, templateType: string): void {
    this.track('template_download', {
      templateId,
      templateType,
      timestamp: Date.now(),
    })
  }

  /**
   * Track recommendation shown
   */
  trackRecommendationShown(recommendationId: string, category: string): void {
    this.track('recommendation_shown', {
      recommendationId,
      category,
      timestamp: Date.now(),
    })
  }

  /**
   * Track recommendation accepted
   */
  trackRecommendationAccepted(recommendationId: string, category: string): void {
    this.track('recommendation_accepted', {
      recommendationId,
      category,
      timestamp: Date.now(),
    })
  }

  /**
   * Track analysis completed
   */
  trackAnalysisCompleted(projectType?: string, frameworks?: string[]): void {
    this.track('analysis_completed', {
      projectType,
      frameworks,
      recommendationCount: frameworks?.length || 0,
      timestamp: Date.now(),
    })
  }

  /**
   * Track error occurred
   */
  trackError(errorType: string, errorMessage?: string, context?: string): void {
    this.track('error_occurred', {
      errorType,
      errorMessage,
      context,
      timestamp: Date.now(),
    })
  }

  /**
   * Flush pending events to server
   */
  async flush(): Promise<void> {
    if (!this.isEnabled() || this.events.length === 0) {
      return
    }

    const eventsToSend = [...this.events]
    this.events = []

    try {
      consola.debug(`Flushing ${eventsToSend.length} telemetry events`)

      // Send events in batches
      const batchSize = 100 // API batch limit
      for (let i = 0; i < eventsToSend.length; i += batchSize) {
        const batch = eventsToSend.slice(i, i + batchSize)
        await this.sendBatch(batch)
      }

      consola.debug('Telemetry events flushed successfully')
    }
    catch (error) {
      // Re-add events to queue if sending fails
      this.events.unshift(...eventsToSend)
      throw error
    }
  }

  /**
   * Send a batch of events
   */
  private async sendBatch(events: TelemetryEvent[]): Promise<void> {
    // Create usage report for batch
    const report: UsageReport = {
      reportId: randomUUID(),
      metricType: 'analysis_completed', // Batch metric type
      timestamp: new Date().toISOString(),
      ccjkVersion: process.env.npm_package_version || '8.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      data: {
        events,
        batchSize: events.length,
        userId: this.userId,
      },
    }

    // Send report
    await this.client.reportUsage(report)
  }

  /**
   * Stop telemetry and flush remaining events
   */
  async stop(): Promise<void> {
    this.stopFlushTimer()

    // Flush remaining events
    if (this.events.length > 0) {
      await this.flush()
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.events.length
  }

  /**
   * Get telemetry status
   */
  getStatus(): { enabled: boolean; queueSize: number; userId: string } {
    return {
      enabled: this.isEnabled(),
      queueSize: this.getQueueSize(),
      userId: this.userId,
    }
  }
}

/**
 * Global telemetry instance
 */
let globalTelemetry: TelemetryReporter | undefined

/**
 * Initialize telemetry
 */
export function initializeTelemetry(
  client: CloudClient,
  config?: Partial<TelemetryConfig>,
): TelemetryReporter {
  if (globalTelemetry) {
    globalTelemetry.stop().catch(() => {})
  }

  globalTelemetry = new TelemetryReporter(client, config)
  return globalTelemetry
}

/**
 * Get global telemetry instance
 */
export function getTelemetry(): TelemetryReporter | undefined {
  return globalTelemetry
}

/**
 * Stop global telemetry
 */
export async function stopTelemetry(): Promise<void> {
  if (globalTelemetry) {
    await globalTelemetry.stop()
    globalTelemetry = undefined
  }
}

/**
 * Track event using global telemetry
 */
export function trackEvent(type: MetricType, data?: Record<string, any>): void {
  if (globalTelemetry) {
    globalTelemetry.track(type, data)
  }
}

/**
 * Telemetry utilities
 */
export const telemetryUtils = {
  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    if (globalTelemetry) {
      return globalTelemetry.isEnabled()
    }
    return process.env.CCJK_TELEMETRY !== 'false'
  },

  /**
   * Track with automatic error handling
   */
  trackSafe(type: MetricType, data?: Record<string, any>): void {
    try {
      trackEvent(type, data)
    }
    catch (error) {
      consola.warn('Failed to track telemetry event:', error)
    }
  },

  /**
   * Get telemetry status
   */
  getStatus() {
    if (globalTelemetry) {
      return globalTelemetry.getStatus()
    }
    return { enabled: false, queueSize: 0, userId: '' }
  },
}

// Export types
export type { TelemetryConfig, TelemetryEvent } from './types'
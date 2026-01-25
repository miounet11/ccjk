/**
 * CCJK Performance Monitoring Module
 *
 * Comprehensive performance monitoring system for CCJK including:
 * - Metrics collection (commands, API, cache, errors, agents)
 * - Performance tracking utilities
 * - Terminal dashboard with real-time updates
 * - Report generation with trend analysis
 *
 * @module monitoring
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types'

// ============================================================================
// Metrics Collector Exports
// ============================================================================

export { MetricsCollector, getMetricsCollector, resetMetricsCollector } from './metrics-collector'

// ============================================================================
// Performance Tracker Exports
// ============================================================================

export {
  PerformanceTracker,
  CommandTracker,
  ApiCallTracker,
  AgentTaskTracker,
  getPerformanceTracker,
  resetPerformanceTracker,
  trackPerformance,
  trackErrors,
} from './performance-tracker'

// ============================================================================
// Dashboard Exports
// ============================================================================

export { PerformanceDashboard, DashboardRenderer, createDashboard } from './dashboard'

// ============================================================================
// Reporter Exports
// ============================================================================

export {
  PerformanceReporter,
  createReporter,
  generateQuickReport,
} from './reporter'

// ============================================================================
// Convenience Functions
// ============================================================================

import { getMetricsCollector } from './metrics-collector'
import { getPerformanceTracker } from './performance-tracker'
import { createDashboard } from './dashboard'
import { createReporter } from './reporter'
import type { Dashboard, DashboardConfig, PerformanceReport, ReportConfig } from './types'

/**
 * Get the monitoring system singleton
 */
export function getMonitoring() {
  return {
    collector: getMetricsCollector(),
    tracker: getPerformanceTracker(),
  }
}

/**
 * Start the performance dashboard
 */
export function startDashboard(config?: Partial<DashboardConfig>): Dashboard {
  const dashboard = createDashboard(config)
  dashboard.show()
  return dashboard
}

/**
 * Generate a performance report
 */
export function generateReport(config?: Partial<ReportConfig>): PerformanceReport {
  const reporter = createReporter(config)
  return reporter.generateReport()
}

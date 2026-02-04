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

// ============================================================================
// Convenience Functions
// ============================================================================

import type { Dashboard, DashboardConfig, PerformanceReport, ReportConfig } from './types'
import { createDashboard } from './dashboard'
import { getMetricsCollector } from './metrics-collector'
import { getPerformanceTracker } from './performance-tracker'
import { createReporter } from './reporter'

export { createDashboard, PerformanceDashboard } from './dashboard'

// ============================================================================
// Metrics Collector Exports
// ============================================================================

export { getMetricsCollector, MetricsCollector, resetMetricsCollector } from './metrics-collector'

// ============================================================================
// Performance Tracker Exports
// ============================================================================

export {
  AgentTaskTracker,
  ApiCallTracker,
  CommandTracker,
  getPerformanceTracker,
  PerformanceTracker,
  resetPerformanceTracker,
  trackErrors,
  trackPerformance,
} from './performance-tracker'

// ============================================================================
// Dashboard Exports
// ============================================================================

export {
  createReporter,
  generateQuickReport,
  PerformanceReporter,
} from './reporter'

// ============================================================================
// Reporter Exports
// ============================================================================

export * from './types'

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

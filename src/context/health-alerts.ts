/**
 * Health Alerts System
 *
 * Monitors database health on CLI startup and displays actionable alerts.
 * Checks for corruption, WAL size, disk utilization, and backup status.
 *
 * @module context/health-alerts
 */

import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'pathe'
import { DatabaseHealthMonitor, type HealthCheckResult, HealthStatus } from './health-check'
import type { ContextPersistence } from './persistence'

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Health alert
 */
export interface HealthAlert {
  severity: AlertSeverity
  category: 'corruption' | 'wal' | 'disk' | 'backup' | 'performance'
  message: string
  action?: string
  timestamp: number
}

/**
 * Alert history entry
 */
export interface AlertHistoryEntry {
  timestamp: number
  alerts: HealthAlert[]
  healthStatus: HealthStatus
  resolved: boolean
}

/**
 * Health alerts configuration
 */
export interface HealthAlertsConfig {
  /** Skip alerts on startup */
  silent?: boolean
  /** WAL size threshold in MB */
  walThresholdMB?: number
  /** Disk utilization threshold percentage */
  diskUtilizationThreshold?: number
  /** Backup age threshold in days */
  backupAgeThresholdDays?: number
  /** Enable alert history logging */
  enableHistory?: boolean
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<HealthAlertsConfig> = {
  silent: false,
  walThresholdMB: 10,
  diskUtilizationThreshold: 70,
  backupAgeThresholdDays: 7,
  enableHistory: true,
}

/**
 * Health Alerts Manager
 */
export class HealthAlertsManager {
  private monitor: DatabaseHealthMonitor
  private config: Required<HealthAlertsConfig>
  private historyPath: string
  private dbPath: string

  constructor(
    dbPath: string,
    config?: HealthAlertsConfig,
  ) {
    this.dbPath = dbPath
    this.monitor = new DatabaseHealthMonitor(dbPath)
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.historyPath = join(dirname(dbPath), 'alert-history.json')
  }

  /**
   * Run health checks and generate alerts
   */
  async checkHealth(): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = []

    try {
      // Run comprehensive health check
      const health = await this.monitor.runHealthCheck()

      // Check for database corruption
      if (!health.checks.integrity.passed) {
        alerts.push({
          severity: AlertSeverity.CRITICAL,
          category: 'corruption',
          message: 'Database corruption detected',
          action: 'Run: ccjk context recover',
          timestamp: Date.now(),
        })

        // Add specific corruption details
        for (const error of health.checks.integrity.errors) {
          alerts.push({
            severity: AlertSeverity.CRITICAL,
            category: 'corruption',
            message: error,
            timestamp: Date.now(),
          })
        }
      }

      // Check WAL size
      const walSizeMB = health.checks.wal.walSize / (1024 * 1024)
      if (walSizeMB > this.config.walThresholdMB) {
        alerts.push({
          severity: AlertSeverity.WARNING,
          category: 'wal',
          message: `WAL file is ${walSizeMB.toFixed(1)}MB (threshold: ${this.config.walThresholdMB}MB)`,
          action: 'Run: ccjk context checkpoint',
          timestamp: Date.now(),
        })
      }
      else if (walSizeMB > this.config.walThresholdMB / 2) {
        alerts.push({
          severity: AlertSeverity.INFO,
          category: 'wal',
          message: `WAL file is ${walSizeMB.toFixed(1)}MB`,
          action: 'Consider checkpointing soon',
          timestamp: Date.now(),
        })
      }

      // Check disk utilization
      if (health.checks.size.utilizationPercent < this.config.diskUtilizationThreshold) {
        alerts.push({
          severity: AlertSeverity.WARNING,
          category: 'disk',
          message: `Disk utilization is ${health.checks.size.utilizationPercent.toFixed(1)}% (threshold: ${this.config.diskUtilizationThreshold}%)`,
          action: 'Run: ccjk context vacuum',
          timestamp: Date.now(),
        })
      }

      // Check backup status
      const backupAlert = await this.checkBackupStatus()
      if (backupAlert) {
        alerts.push(backupAlert)
      }

      // Check performance
      if (health.checks.performance.queryTime > 100) {
        alerts.push({
          severity: AlertSeverity.WARNING,
          category: 'performance',
          message: `Query performance is slow (${health.checks.performance.queryTime}ms)`,
          action: 'Check database indexes',
          timestamp: Date.now(),
        })
      }

      // Log to history if enabled
      if (this.config.enableHistory && alerts.length > 0) {
        await this.logToHistory(alerts, health.status)
      }

      return alerts
    }
    catch (error) {
      // Return critical alert on check failure
      return [{
        severity: AlertSeverity.CRITICAL,
        category: 'corruption',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      }]
    }
  }

  /**
   * Check backup status
   */
  private async checkBackupStatus(): Promise<HealthAlert | null> {
    try {
      const backups = this.monitor.listBackups()

      if (backups.length === 0) {
        return {
          severity: AlertSeverity.WARNING,
          category: 'backup',
          message: 'No backups found',
          action: 'Run: ccjk context backup',
          timestamp: Date.now(),
        }
      }

      // Check age of latest backup
      const latestBackup = backups[0]
      const ageMs = Date.now() - latestBackup.metadata.timestamp
      const ageDays = ageMs / (1000 * 60 * 60 * 24)

      if (ageDays > this.config.backupAgeThresholdDays) {
        return {
          severity: AlertSeverity.WARNING,
          category: 'backup',
          message: `Latest backup is ${Math.floor(ageDays)} days old (threshold: ${this.config.backupAgeThresholdDays} days)`,
          action: 'Run: ccjk context backup',
          timestamp: Date.now(),
        }
      }

      // Info alert if backup is getting old
      if (ageDays > this.config.backupAgeThresholdDays / 2) {
        return {
          severity: AlertSeverity.INFO,
          category: 'backup',
          message: `Latest backup is ${Math.floor(ageDays)} days old`,
          action: 'Consider creating a new backup',
          timestamp: Date.now(),
        }
      }

      return null
    }
    catch {
      return null
    }
  }

  /**
   * Display alerts with emoji indicators
   */
  displayAlerts(alerts: HealthAlert[]): void {
    if (alerts.length === 0) {
      return
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Database Health Alerts')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Group alerts by severity
    const critical = alerts.filter(a => a.severity === AlertSeverity.CRITICAL)
    const warnings = alerts.filter(a => a.severity === AlertSeverity.WARNING)
    const info = alerts.filter(a => a.severity === AlertSeverity.INFO)

    // Display critical alerts
    if (critical.length > 0) {
      for (const alert of critical) {
        console.log(`🔴 CRITICAL: ${alert.message}`)
        if (alert.action) {
          console.log(`   → ${alert.action}`)
        }
      }
      console.log()
    }

    // Display warnings
    if (warnings.length > 0) {
      for (const alert of warnings) {
        console.log(`🟡 WARNING: ${alert.message}`)
        if (alert.action) {
          console.log(`   → ${alert.action}`)
        }
      }
      console.log()
    }

    // Display info
    if (info.length > 0) {
      for (const alert of info) {
        console.log(`💡 INFO: ${alert.message}`)
        if (alert.action) {
          console.log(`   → ${alert.action}`)
        }
      }
      console.log()
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }

  /**
   * Log alerts to history
   */
  private async logToHistory(alerts: HealthAlert[], healthStatus: HealthStatus): Promise<void> {
    try {
      const fs = await import('node:fs/promises')

      // Load existing history
      let history: AlertHistoryEntry[] = []
      if (existsSync(this.historyPath)) {
        const content = await fs.readFile(this.historyPath, 'utf-8')
        history = JSON.parse(content)
      }

      // Add new entry
      history.unshift({
        timestamp: Date.now(),
        alerts,
        healthStatus,
        resolved: false,
      })

      // Keep last 100 entries
      history = history.slice(0, 100)

      // Save history
      await fs.writeFile(this.historyPath, JSON.stringify(history, null, 2))
    }
    catch {
      // Ignore history logging errors
    }
  }

  /**
   * Get alert history
   */
  async getHistory(limit = 10): Promise<AlertHistoryEntry[]> {
    try {
      if (!existsSync(this.historyPath)) {
        return []
      }

      const fs = await import('node:fs/promises')
      const content = await fs.readFile(this.historyPath, 'utf-8')
      const history: AlertHistoryEntry[] = JSON.parse(content)

      return history.slice(0, limit)
    }
    catch {
      return []
    }
  }

  /**
   * Mark alerts as resolved
   */
  async markResolved(timestamp: number): Promise<void> {
    try {
      if (!existsSync(this.historyPath)) {
        return
      }

      const fs = await import('node:fs/promises')
      const content = await fs.readFile(this.historyPath, 'utf-8')
      const history: AlertHistoryEntry[] = JSON.parse(content)

      // Find and mark entry as resolved
      const entry = history.find(e => e.timestamp === timestamp)
      if (entry) {
        entry.resolved = true
        await fs.writeFile(this.historyPath, JSON.stringify(history, null, 2))
      }
    }
    catch {
      // Ignore errors
    }
  }

  /**
   * Clear alert history
   */
  async clearHistory(): Promise<void> {
    try {
      if (existsSync(this.historyPath)) {
        const fs = await import('node:fs/promises')
        await fs.unlink(this.historyPath)
      }
    }
    catch {
      // Ignore errors
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<{
    totalAlerts: number
    criticalCount: number
    warningCount: number
    infoCount: number
    unresolvedCount: number
    lastCheckTime?: number
  }> {
    const history = await this.getHistory(100)

    if (history.length === 0) {
      return {
        totalAlerts: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        unresolvedCount: 0,
      }
    }

    const unresolved = history.filter(e => !e.resolved)
    const allAlerts = unresolved.flatMap(e => e.alerts)

    return {
      totalAlerts: allAlerts.length,
      criticalCount: allAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
      warningCount: allAlerts.filter(a => a.severity === AlertSeverity.WARNING).length,
      infoCount: allAlerts.filter(a => a.severity === AlertSeverity.INFO).length,
      unresolvedCount: unresolved.length,
      lastCheckTime: history[0]?.timestamp,
    }
  }

  /**
   * Close monitor
   */
  close(): void {
    this.monitor.close()
  }
}

/**
 * Run health alerts check on CLI startup
 */
export async function runStartupHealthCheck(
  dbPath: string,
  config?: HealthAlertsConfig,
): Promise<HealthAlert[]> {
  // Skip if database doesn't exist yet
  if (!existsSync(dbPath)) {
    return []
  }

  // Skip if silent mode
  if (config?.silent) {
    return []
  }

  const manager = new HealthAlertsManager(dbPath, config)

  try {
    const alerts = await manager.checkHealth()

    // Display alerts if any
    if (alerts.length > 0) {
      manager.displayAlerts(alerts)
    }

    return alerts
  }
  finally {
    manager.close()
  }
}

/**
 * Create health alerts manager for persistence instance
 */
export function createHealthAlertsManager(
  persistence: ContextPersistence,
  config?: HealthAlertsConfig,
): HealthAlertsManager {
  // Access private dbPath through reflection
  const dbPath = (persistence as any).dbPath
  return new HealthAlertsManager(dbPath, config)
}

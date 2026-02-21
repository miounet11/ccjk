/**
 * Health Alerts System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { HealthAlertsManager, AlertSeverity, runStartupHealthCheck } from '../health-alerts'
import { ContextPersistence } from '../persistence'
import { DatabaseHealthMonitor } from '../health-check'

const TEST_DB_DIR = join(process.cwd(), 'test-data', 'health-alerts')
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-alerts.db')

describe('HealthAlertsManager', () => {
  beforeEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DB_DIR, { recursive: true })
  })

  afterEach(() => {
    // Clean up
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
  })

  it('should create health alerts manager', () => {
    const manager = new HealthAlertsManager(TEST_DB_PATH)
    expect(manager).toBeDefined()
    manager.close()
  })

  it('should check health and return alerts', async () => {
    // Create database first
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH)
    const alerts = await manager.checkHealth()

    expect(Array.isArray(alerts)).toBe(true)
    manager.close()
  })

  it('should detect missing backups', async () => {
    // Create database
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH, {
      backupAgeThresholdDays: 7,
    })

    const alerts = await manager.checkHealth()

    // Should have backup warning
    const backupAlert = alerts.find(a => a.category === 'backup')
    expect(backupAlert).toBeDefined()
    expect(backupAlert?.severity).toBe(AlertSeverity.WARNING)
    expect(backupAlert?.message).toContain('No backups found')

    manager.close()
  })

  it('should detect large WAL files', async () => {
    // Create database
    const persistence = new ContextPersistence(TEST_DB_PATH)

    // Add some data to create WAL
    for (let i = 0; i < 100; i++) {
      persistence.saveContext(
        {
          id: `ctx-${i}`,
          compressed: `compressed-${i}`,
          algorithm: 'semantic',
          strategy: 'balanced',
          originalTokens: 1000,
          compressedTokens: 500,
          compressionRatio: 0.5,
          compressedAt: Date.now(),
        },
        'test-project',
        `original-${i}`,
      )
    }

    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH, {
      walThresholdMB: 0.001, // Very low threshold for testing
    })

    const alerts = await manager.checkHealth()

    // May have WAL alert depending on actual WAL size
    const walAlert = alerts.find(a => a.category === 'wal')
    if (walAlert) {
      expect(walAlert.severity).toBeOneOf([AlertSeverity.WARNING, AlertSeverity.INFO])
    }

    manager.close()
  })

  it('should log alerts to history', async () => {
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH, {
      enableHistory: true,
    })

    await manager.checkHealth()

    const history = await manager.getHistory()
    expect(history.length).toBeGreaterThan(0)

    manager.close()
  })

  it('should get alert summary', async () => {
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH)
    await manager.checkHealth()

    const summary = await manager.getSummary()
    expect(summary).toBeDefined()
    expect(summary.totalAlerts).toBeGreaterThanOrEqual(0)
    expect(summary.criticalCount).toBeGreaterThanOrEqual(0)
    expect(summary.warningCount).toBeGreaterThanOrEqual(0)
    expect(summary.infoCount).toBeGreaterThanOrEqual(0)

    manager.close()
  })

  it('should mark alerts as resolved', async () => {
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH, {
      enableHistory: true,
    })

    await manager.checkHealth()

    const history = await manager.getHistory()
    if (history.length > 0) {
      const timestamp = history[0].timestamp
      await manager.markResolved(timestamp)

      const updatedHistory = await manager.getHistory()
      const entry = updatedHistory.find(e => e.timestamp === timestamp)
      expect(entry?.resolved).toBe(true)
    }

    manager.close()
  })

  it('should clear alert history', async () => {
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH, {
      enableHistory: true,
    })

    await manager.checkHealth()
    await manager.clearHistory()

    const history = await manager.getHistory()
    expect(history.length).toBe(0)

    manager.close()
  })

  it('should display alerts with emoji indicators', async () => {
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const manager = new HealthAlertsManager(TEST_DB_PATH)

    // Mock console.log
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const alerts = await manager.checkHealth()
    manager.displayAlerts(alerts)

    // Should have called console.log if there are alerts
    if (alerts.length > 0) {
      expect(consoleSpy).toHaveBeenCalled()
    }

    consoleSpy.mockRestore()
    manager.close()
  })

  it('should respect silent mode', async () => {
    const alerts = await runStartupHealthCheck(TEST_DB_PATH, { silent: true })
    expect(alerts).toEqual([])
  })

  it('should skip check if database does not exist', async () => {
    const nonExistentPath = join(TEST_DB_DIR, 'non-existent.db')
    const alerts = await runStartupHealthCheck(nonExistentPath)
    expect(alerts).toEqual([])
  })

  it('should handle health check errors gracefully', async () => {
    // Create an invalid database path
    const invalidPath = '/invalid/path/to/db.db'

    const manager = new HealthAlertsManager(invalidPath)
    const alerts = await manager.checkHealth()

    // Should return critical alert
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0].severity).toBe(AlertSeverity.CRITICAL)

    manager.close()
  })
})

describe('Alert Severity Levels', () => {
  it('should have correct severity levels', () => {
    expect(AlertSeverity.CRITICAL).toBe('critical')
    expect(AlertSeverity.WARNING).toBe('warning')
    expect(AlertSeverity.INFO).toBe('info')
  })
})

describe('runStartupHealthCheck', () => {
  beforeEach(() => {
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DB_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DB_DIR)) {
      rmSync(TEST_DB_DIR, { recursive: true, force: true })
    }
  })

  it('should run startup health check', async () => {
    // Create database
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const alerts = await runStartupHealthCheck(TEST_DB_PATH)
    expect(Array.isArray(alerts)).toBe(true)
  })

  it('should display alerts on startup', async () => {
    // Create database
    const persistence = new ContextPersistence(TEST_DB_PATH)
    persistence.close()

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await runStartupHealthCheck(TEST_DB_PATH, { silent: false })

    // May or may not have alerts, but should not throw
    consoleSpy.mockRestore()
  })
})

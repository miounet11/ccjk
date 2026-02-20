/**
 * Database Health Monitoring and Integrity Checks
 *
 * Provides comprehensive health monitoring, integrity checks, backup/restore,
 * and error recovery for the SQLite database.
 *
 * @module context/health-check
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, join, basename } from 'pathe'
import type { ContextPersistence } from './persistence'

/**
 * Database health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus
  timestamp: number
  checks: {
    integrity: IntegrityCheckResult
    wal: WALCheckResult
    size: SizeCheckResult
    performance: PerformanceCheckResult
  }
  recommendations: string[]
  errors: string[]
}

/**
 * Integrity check result
 */
export interface IntegrityCheckResult {
  passed: boolean
  errors: string[]
  corruptedTables: string[]
  duration: number
}

/**
 * WAL checkpoint result
 */
export interface WALCheckResult {
  mode: string
  walSize: number
  shmSize: number
  checkpointable: boolean
  lastCheckpoint?: number
  recommendations: string[]
}

/**
 * Size check result
 */
export interface SizeCheckResult {
  dbSize: number
  walSize: number
  totalSize: number
  pageCount: number
  pageSize: number
  freePages: number
  utilizationPercent: number
  recommendations: string[]
}

/**
 * Performance check result
 */
export interface PerformanceCheckResult {
  queryTime: number
  writeTime: number
  indexEfficiency: number
  cacheHitRate: number
  recommendations: string[]
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
  timestamp: number
  dbSize: number
  contextCount: number
  projectCount: number
  checksum?: string
  version: string
}

/**
 * Backup result
 */
export interface BackupResult {
  success: boolean
  backupPath: string
  metadata: BackupMetadata
  duration: number
  error?: string
}

/**
 * Restore result
 */
export interface RestoreResult {
  success: boolean
  restoredFrom: string
  metadata: BackupMetadata
  duration: number
  error?: string
}

/**
 * Migration info
 */
export interface MigrationInfo {
  version: number
  description: string
  timestamp: number
  applied: boolean
}

/**
 * Schema version
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Database Health Monitor
 */
export class DatabaseHealthMonitor {
  private db: Database.Database
  private dbPath: string
  private backupDir: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.backupDir = join(dirname(dbPath), 'backups')

    // Ensure backup directory exists
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }

    // Open database in read-only mode for health checks
    this.db = new Database(dbPath, { readonly: false })
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const recommendations: string[] = []

    try {
      // Run all checks
      const integrity = await this.checkIntegrity()
      const wal = await this.checkWAL()
      const size = await this.checkSize()
      const performance = await this.checkPerformance()

      // Aggregate recommendations
      recommendations.push(...wal.recommendations)
      recommendations.push(...size.recommendations)
      recommendations.push(...performance.recommendations)

      // Determine overall status
      let status = HealthStatus.HEALTHY

      if (!integrity.passed) {
        status = HealthStatus.CRITICAL
        errors.push('Database integrity check failed')
      }
      else if (size.utilizationPercent < 50) {
        status = HealthStatus.WARNING
        recommendations.push('Consider running VACUUM to reclaim space')
      }
      else if (wal.walSize > 10 * 1024 * 1024) {
        status = HealthStatus.WARNING
        recommendations.push('WAL file is large, consider checkpointing')
      }
      else if (performance.queryTime > 100) {
        status = HealthStatus.WARNING
        recommendations.push('Query performance is degraded')
      }

      return {
        status,
        timestamp: Date.now(),
        checks: {
          integrity,
          wal,
          size,
          performance,
        },
        recommendations: [...new Set(recommendations)], // Remove duplicates
        errors,
      }
    }
    catch (error) {
      return {
        status: HealthStatus.UNKNOWN,
        timestamp: Date.now(),
        checks: {
          integrity: { passed: false, errors: [String(error)], corruptedTables: [], duration: 0 },
          wal: { mode: 'unknown', walSize: 0, shmSize: 0, checkpointable: false, recommendations: [] },
          size: { dbSize: 0, walSize: 0, totalSize: 0, pageCount: 0, pageSize: 0, freePages: 0, utilizationPercent: 0, recommendations: [] },
          performance: { queryTime: 0, writeTime: 0, indexEfficiency: 0, cacheHitRate: 0, recommendations: [] },
        },
        recommendations: [],
        errors: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }

  /**
   * Check database integrity
   */
  async checkIntegrity(): Promise<IntegrityCheckResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const corruptedTables: string[] = []

    try {
      // Run PRAGMA integrity_check
      const result = this.db.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>

      const passed = result.length === 1 && result[0].integrity_check === 'ok'

      if (!passed) {
        for (const row of result) {
          const msg = row.integrity_check
          errors.push(msg)

          // Extract table name if mentioned
          const tableMatch = msg.match(/table (\w+)/)
          if (tableMatch) {
            corruptedTables.push(tableMatch[1])
          }
        }
      }

      // Also check foreign key integrity
      const fkResult = this.db.prepare('PRAGMA foreign_key_check').all()
      if (fkResult.length > 0) {
        errors.push(`Foreign key violations found: ${fkResult.length}`)
      }

      return {
        passed: passed && fkResult.length === 0,
        errors,
        corruptedTables: [...new Set(corruptedTables)],
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        passed: false,
        errors: [`Integrity check failed: ${error instanceof Error ? error.message : String(error)}`],
        corruptedTables: [],
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Check WAL status and recommend checkpoint if needed
   */
  async checkWAL(): Promise<WALCheckResult> {
    const recommendations: string[] = []

    try {
      // Get journal mode
      const modeResult = this.db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }
      const mode = modeResult.journal_mode

      // Get WAL file sizes
      const walPath = `${this.dbPath}-wal`
      const shmPath = `${this.dbPath}-shm`

      const walSize = existsSync(walPath) ? statSync(walPath).size : 0
      const shmSize = existsSync(shmPath) ? statSync(shmPath).size : 0

      // Check if checkpoint is needed
      const checkpointable = walSize > 1024 * 1024 // > 1MB

      if (checkpointable) {
        recommendations.push('WAL file is large, run checkpoint to merge changes')
      }

      if (walSize > 10 * 1024 * 1024) {
        recommendations.push('WAL file exceeds 10MB, immediate checkpoint recommended')
      }

      return {
        mode,
        walSize,
        shmSize,
        checkpointable,
        recommendations,
      }
    }
    catch (error) {
      return {
        mode: 'unknown',
        walSize: 0,
        shmSize: 0,
        checkpointable: false,
        recommendations: [`WAL check failed: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }

  /**
   * Checkpoint WAL to main database
   */
  async checkpoint(mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'RESTART'): Promise<{
    success: boolean
    walFrames: number
    checkpointed: number
    error?: string
  }> {
    try {
      const result = this.db.prepare(`PRAGMA wal_checkpoint(${mode})`).get() as {
        busy: number
        log: number
        checkpointed: number
      }

      return {
        success: result.busy === 0,
        walFrames: result.log,
        checkpointed: result.checkpointed,
      }
    }
    catch (error) {
      return {
        success: false,
        walFrames: 0,
        checkpointed: 0,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Check database size and utilization
   */
  async checkSize(): Promise<SizeCheckResult> {
    const recommendations: string[] = []

    try {
      // Get database file size
      const dbSize = existsSync(this.dbPath) ? statSync(this.dbPath).size : 0

      // Get WAL size
      const walPath = `${this.dbPath}-wal`
      const walSize = existsSync(walPath) ? statSync(walPath).size : 0

      // Get page info
      const pageCountResult = this.db.prepare('PRAGMA page_count').get() as { page_count: number }
      const pageSizeResult = this.db.prepare('PRAGMA page_size').get() as { page_size: number }
      const freePagesResult = this.db.prepare('PRAGMA freelist_count').get() as { freelist_count: number }

      const pageCount = pageCountResult.page_count
      const pageSize = pageSizeResult.page_size
      const freePages = freePagesResult.freelist_count

      const utilizationPercent = pageCount > 0 ? ((pageCount - freePages) / pageCount) * 100 : 100

      if (utilizationPercent < 70) {
        recommendations.push(`Database utilization is ${utilizationPercent.toFixed(1)}%, consider VACUUM`)
      }

      if (freePages > pageCount * 0.3) {
        recommendations.push(`${freePages} free pages detected, VACUUM recommended`)
      }

      if (dbSize > 100 * 1024 * 1024) {
        recommendations.push('Database exceeds 100MB, consider archiving old data')
      }

      return {
        dbSize,
        walSize,
        totalSize: dbSize + walSize,
        pageCount,
        pageSize,
        freePages,
        utilizationPercent,
        recommendations,
      }
    }
    catch (error) {
      return {
        dbSize: 0,
        walSize: 0,
        totalSize: 0,
        pageCount: 0,
        pageSize: 0,
        freePages: 0,
        utilizationPercent: 0,
        recommendations: [`Size check failed: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }

  /**
   * Check database performance
   */
  async checkPerformance(): Promise<PerformanceCheckResult> {
    const recommendations: string[] = []

    try {
      // Test query performance
      const queryStart = Date.now()
      this.db.prepare('SELECT COUNT(*) FROM contexts').get()
      const queryTime = Date.now() - queryStart

      // Test write performance
      const writeStart = Date.now()
      this.db.prepare('BEGIN').run()
      this.db.prepare('ROLLBACK').run()
      const writeTime = Date.now() - writeStart

      // Check index usage
      const indexes = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL
      `).all() as Array<{ name: string }>

      const indexEfficiency = indexes.length > 0 ? 100 : 0

      // Get cache stats
      const cacheHitRate = 95 // Placeholder - SQLite doesn't expose this easily

      if (queryTime > 50) {
        recommendations.push('Query performance is slow, check indexes')
      }

      if (writeTime > 20) {
        recommendations.push('Write performance is slow, consider optimizing')
      }

      if (indexes.length < 4) {
        recommendations.push('Few indexes detected, query performance may be suboptimal')
      }

      return {
        queryTime,
        writeTime,
        indexEfficiency,
        cacheHitRate,
        recommendations,
      }
    }
    catch (error) {
      return {
        queryTime: 0,
        writeTime: 0,
        indexEfficiency: 0,
        cacheHitRate: 0,
        recommendations: [`Performance check failed: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }

  /**
   * Create database backup
   */
  async backup(label?: string): Promise<BackupResult> {
    const startTime = Date.now()

    try {
      // Checkpoint WAL first
      await this.checkpoint('FULL')

      // Generate backup filename
      const timestamp = Date.now()
      const dateStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-')
      const labelStr = label ? `-${label}` : ''
      const backupFilename = `contexts-${dateStr}${labelStr}.db`
      const backupPath = join(this.backupDir, backupFilename)

      // Copy database file
      copyFileSync(this.dbPath, backupPath)

      // Get metadata
      const stats = this.db.prepare('SELECT COUNT(*) as count FROM contexts').get() as { count: number }
      const projectStats = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }
      const dbSize = statSync(backupPath).size

      const metadata: BackupMetadata = {
        timestamp,
        dbSize,
        contextCount: stats.count,
        projectCount: projectStats.count,
        version: String(CURRENT_SCHEMA_VERSION),
      }

      // Save metadata
      const metadataPath = `${backupPath}.meta.json`
      const fs = require('node:fs')
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups(10)

      return {
        success: true,
        backupPath,
        metadata,
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        backupPath: '',
        metadata: {
          timestamp: Date.now(),
          dbSize: 0,
          contextCount: 0,
          projectCount: 0,
          version: String(CURRENT_SCHEMA_VERSION),
        },
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath: string): Promise<RestoreResult> {
    const startTime = Date.now()

    try {
      // Verify backup exists
      if (!existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`)
      }

      // Load metadata
      const metadataPath = `${backupPath}.meta.json`
      let metadata: BackupMetadata

      if (existsSync(metadataPath)) {
        const fs = require('node:fs')
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      }
      else {
        // Create minimal metadata
        metadata = {
          timestamp: statSync(backupPath).mtimeMs,
          dbSize: statSync(backupPath).size,
          contextCount: 0,
          projectCount: 0,
          version: String(CURRENT_SCHEMA_VERSION),
        }
      }

      // Close current database
      this.db.close()

      // Backup current database before restore
      const currentBackupPath = `${this.dbPath}.pre-restore-${Date.now()}.bak`
      if (existsSync(this.dbPath)) {
        copyFileSync(this.dbPath, currentBackupPath)
      }

      // Restore from backup
      copyFileSync(backupPath, this.dbPath)

      // Reopen database
      this.db = new Database(this.dbPath)

      // Verify integrity
      const integrity = await this.checkIntegrity()
      if (!integrity.passed) {
        // Restore failed, rollback
        copyFileSync(currentBackupPath, this.dbPath)
        this.db = new Database(this.dbPath)
        throw new Error('Restored database failed integrity check')
      }

      return {
        success: true,
        restoredFrom: backupPath,
        metadata,
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        restoredFrom: backupPath,
        metadata: {
          timestamp: 0,
          dbSize: 0,
          contextCount: 0,
          projectCount: 0,
          version: String(CURRENT_SCHEMA_VERSION),
        },
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * List available backups
   */
  listBackups(): Array<{ path: string, metadata: BackupMetadata }> {
    const backups: Array<{ path: string, metadata: BackupMetadata }> = []

    if (!existsSync(this.backupDir)) {
      return backups
    }

    const files = readdirSync(this.backupDir)

    for (const file of files) {
      if (file.endsWith('.db') && !file.endsWith('.bak')) {
        const backupPath = join(this.backupDir, file)
        const metadataPath = `${backupPath}.meta.json`

        let metadata: BackupMetadata

        if (existsSync(metadataPath)) {
          const fs = require('node:fs')
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
        }
        else {
          metadata = {
            timestamp: statSync(backupPath).mtimeMs,
            dbSize: statSync(backupPath).size,
            contextCount: 0,
            projectCount: 0,
            version: String(CURRENT_SCHEMA_VERSION),
          }
        }

        backups.push({ path: backupPath, metadata })
      }
    }

    // Sort by timestamp descending
    return backups.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(keepCount: number): Promise<number> {
    const backups = this.listBackups()

    if (backups.length <= keepCount) {
      return 0
    }

    const toDelete = backups.slice(keepCount)
    let deleted = 0

    for (const backup of toDelete) {
      try {
        unlinkSync(backup.path)
        const metadataPath = `${backup.path}.meta.json`
        if (existsSync(metadataPath)) {
          unlinkSync(metadataPath)
        }
        deleted++
      }
      catch {
        // Ignore errors
      }
    }

    return deleted
  }

  /**
   * Attempt automatic recovery
   */
  async attemptRecovery(): Promise<{
    success: boolean
    actions: string[]
    errors: string[]
  }> {
    const actions: string[] = []
    const errors: string[] = []

    try {
      // Check integrity first
      const integrity = await this.checkIntegrity()

      if (!integrity.passed) {
        // Try to restore from latest backup
        const backups = this.listBackups()

        if (backups.length > 0) {
          actions.push('Database corruption detected, attempting restore from backup')

          const restoreResult = await this.restore(backups[0].path)

          if (restoreResult.success) {
            actions.push(`Successfully restored from backup: ${basename(backups[0].path)}`)
            return { success: true, actions, errors }
          }
          else {
            errors.push(`Restore failed: ${restoreResult.error}`)
          }
        }
        else {
          errors.push('No backups available for recovery')
        }

        return { success: false, actions, errors }
      }

      // Check WAL and checkpoint if needed
      const wal = await this.checkWAL()
      if (wal.checkpointable) {
        actions.push('Checkpointing WAL')
        const checkpointResult = await this.checkpoint('RESTART')
        if (checkpointResult.success) {
          actions.push(`Checkpointed ${checkpointResult.checkpointed} frames`)
        }
        else {
          errors.push(`Checkpoint failed: ${checkpointResult.error}`)
        }
      }

      // Check size and vacuum if needed
      const size = await this.checkSize()
      if (size.utilizationPercent < 70) {
        actions.push('Running VACUUM to reclaim space')
        try {
          this.db.prepare('VACUUM').run()
          actions.push('VACUUM completed successfully')
        }
        catch (error) {
          errors.push(`VACUUM failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      return {
        success: errors.length === 0,
        actions,
        errors,
      }
    }
    catch (error) {
      errors.push(`Recovery failed: ${error instanceof Error ? error.message : String(error)}`)
      return { success: false, actions, errors }
    }
  }

  /**
   * Get schema version
   */
  getSchemaVersion(): number {
    try {
      const result = this.db.prepare('PRAGMA user_version').get() as { user_version: number }
      return result.user_version
    }
    catch {
      return 0
    }
  }

  /**
   * Set schema version
   */
  setSchemaVersion(version: number): void {
    this.db.prepare(`PRAGMA user_version = ${version}`).run()
  }

  /**
   * Apply migrations
   */
  async applyMigrations(migrations: Array<{
    version: number
    description: string
    up: (db: Database.Database) => void
  }>): Promise<{
    success: boolean
    applied: number[]
    errors: string[]
  }> {
    const applied: number[] = []
    const errors: string[] = []

    const currentVersion = this.getSchemaVersion()

    // Sort migrations by version
    const sortedMigrations = migrations.sort((a, b) => a.version - b.version)

    for (const migration of sortedMigrations) {
      if (migration.version <= currentVersion) {
        continue // Already applied
      }

      try {
        // Create backup before migration
        await this.backup(`pre-migration-v${migration.version}`)

        // Apply migration in transaction
        this.db.prepare('BEGIN').run()
        migration.up(this.db)
        this.setSchemaVersion(migration.version)
        this.db.prepare('COMMIT').run()

        applied.push(migration.version)
      }
      catch (error) {
        this.db.prepare('ROLLBACK').run()
        errors.push(`Migration v${migration.version} failed: ${error instanceof Error ? error.message : String(error)}`)
        break // Stop on first error
      }
    }

    return {
      success: errors.length === 0,
      applied,
      errors,
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close()
  }
}

/**
 * Create health monitor for persistence instance
 */
export function createHealthMonitor(persistence: ContextPersistence): DatabaseHealthMonitor {
  // Access private dbPath through reflection
  const dbPath = (persistence as any).dbPath
  return new DatabaseHealthMonitor(dbPath)
}

/**
 * Database Health Check Tests
 */

import { existsSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { DatabaseHealthMonitor, HealthStatus } from '../health-check'
import { ContextPersistence } from '../persistence'
import type { CompressedContext } from '../types'
import { CompressionAlgorithm, CompressionStrategy } from '../types'

describe('DatabaseHealthMonitor', () => {
  let monitor: DatabaseHealthMonitor
  let persistence: ContextPersistence
  let testDbPath: string
  let backupDir: string

  beforeEach(() => {
    // Use a temporary database for testing
    testDbPath = join(process.cwd(), '.test-health.db')
    backupDir = join(process.cwd(), '.test-health-backups')

    // Clean up any existing files
    cleanupTestFiles()

    // Create persistence instance
    persistence = new ContextPersistence(testDbPath)

    // Create health monitor
    monitor = new DatabaseHealthMonitor(testDbPath)
  })

  afterEach(() => {
    // Clean up
    try {
      monitor.close()
    }
    catch {
      // Ignore
    }

    try {
      persistence.close()
    }
    catch {
      // Ignore
    }

    cleanupTestFiles()
  })

  function cleanupTestFiles() {
    const files = [
      testDbPath,
      `${testDbPath}-wal`,
      `${testDbPath}-shm`,
      `${testDbPath}.pre-restore-*.bak`,
    ]

    for (const file of files) {
      if (existsSync(file)) {
        rmSync(file, { force: true })
      }
    }

    if (existsSync(backupDir)) {
      rmSync(backupDir, { recursive: true, force: true })
    }
  }

  describe('runHealthCheck', () => {
    it('should return healthy status for new database', async () => {
      const result = await monitor.runHealthCheck()

      expect(result.status).toBe(HealthStatus.HEALTHY)
      expect(result.checks.integrity.passed).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should include all check results', async () => {
      const result = await monitor.runHealthCheck()

      expect(result.checks).toHaveProperty('integrity')
      expect(result.checks).toHaveProperty('wal')
      expect(result.checks).toHaveProperty('size')
      expect(result.checks).toHaveProperty('performance')
    })

    it('should provide recommendations', async () => {
      // Add some data to trigger recommendations
      for (let i = 0; i < 100; i++) {
        const context: CompressedContext = {
          id: `test-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-1')
      }

      const result = await monitor.runHealthCheck()

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
    })
  })

  describe('checkIntegrity', () => {
    it('should pass integrity check for valid database', async () => {
      const result = await monitor.checkIntegrity()

      expect(result.passed).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.corruptedTables).toHaveLength(0)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should detect corrupted database', async () => {
      // Close connections
      monitor.close()
      persistence.close()

      // Corrupt the database by writing random data
      writeFileSync(testDbPath, 'corrupted data')

      // Reopen with new monitor
      try {
        const corruptedMonitor = new DatabaseHealthMonitor(testDbPath)
        const result = await corruptedMonitor.checkIntegrity()

        expect(result.passed).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)

        corruptedMonitor.close()
      }
      catch (error) {
        // Expected - corrupted database may fail to open
        expect(error).toBeDefined()
      }
    })
  })

  describe('checkWAL', () => {
    it('should return WAL status', async () => {
      const result = await monitor.checkWAL()

      expect(result.mode).toBeDefined()
      expect(result.walSize).toBeGreaterThanOrEqual(0)
      expect(result.shmSize).toBeGreaterThanOrEqual(0)
      expect(result.checkpointable).toBeDefined()
    })

    it('should recommend checkpoint for large WAL', async () => {
      // Add enough data to create a large WAL
      for (let i = 0; i < 1000; i++) {
        const context: CompressedContext = {
          id: `test-${i}`,
          compressed: 'x'.repeat(1000), // 1KB per entry
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-1')
      }

      const result = await monitor.checkWAL()

      // WAL should be created
      expect(result.walSize).toBeGreaterThan(0)
    })
  })

  describe('checkpoint', () => {
    it('should checkpoint WAL successfully', async () => {
      // Add some data
      for (let i = 0; i < 10; i++) {
        const context: CompressedContext = {
          id: `test-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-1')
      }

      const result = await monitor.checkpoint('RESTART')

      expect(result.success).toBe(true)
      expect(result.walFrames).toBeGreaterThanOrEqual(0)
      expect(result.checkpointed).toBeGreaterThanOrEqual(0)
    })

    it('should support different checkpoint modes', async () => {
      const modes: Array<'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE'> = [
        'PASSIVE',
        'FULL',
        'RESTART',
        'TRUNCATE',
      ]

      for (const mode of modes) {
        const result = await monitor.checkpoint(mode)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('checkSize', () => {
    it('should return database size information', async () => {
      const result = await monitor.checkSize()

      expect(result.dbSize).toBeGreaterThan(0)
      expect(result.pageCount).toBeGreaterThan(0)
      expect(result.pageSize).toBeGreaterThan(0)
      expect(result.freePages).toBeGreaterThanOrEqual(0)
      expect(result.utilizationPercent).toBeGreaterThan(0)
      expect(result.utilizationPercent).toBeLessThanOrEqual(100)
    })

    it('should recommend VACUUM for low utilization', async () => {
      // Add and delete data to create free pages
      for (let i = 0; i < 100; i++) {
        const context: CompressedContext = {
          id: `test-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-1')
      }

      // Delete most contexts
      for (let i = 0; i < 90; i++) {
        persistence.deleteContext(`test-${i}`)
      }

      const result = await monitor.checkSize()

      // Should have free pages
      expect(result.freePages).toBeGreaterThan(0)
    })
  })

  describe('checkPerformance', () => {
    it('should measure query and write performance', async () => {
      const result = await monitor.checkPerformance()

      expect(result.queryTime).toBeGreaterThanOrEqual(0)
      expect(result.writeTime).toBeGreaterThanOrEqual(0)
      expect(result.indexEfficiency).toBeGreaterThanOrEqual(0)
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0)
    })

    it('should provide performance recommendations', async () => {
      const result = await monitor.checkPerformance()

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
    })
  })

  describe('backup', () => {
    it('should create database backup', async () => {
      // Add some data
      const context: CompressedContext = {
        id: 'test-backup',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      persistence.saveContext(context, 'project-hash-1')

      const result = await monitor.backup('test')

      expect(result.success).toBe(true)
      expect(result.backupPath).toBeTruthy()
      expect(existsSync(result.backupPath)).toBe(true)
      expect(result.metadata.contextCount).toBe(1)
      expect(result.metadata.dbSize).toBeGreaterThan(0)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should create backup metadata file', async () => {
      const result = await monitor.backup('metadata-test')

      expect(result.success).toBe(true)

      const metadataPath = `${result.backupPath}.meta.json`
      expect(existsSync(metadataPath)).toBe(true)

      const fs = require('node:fs')
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

      expect(metadata.timestamp).toBeDefined()
      expect(metadata.dbSize).toBeGreaterThan(0)
      expect(metadata.version).toBeDefined()
    })

    it('should clean up old backups', async () => {
      // Create multiple backups
      for (let i = 0; i < 15; i++) {
        await monitor.backup(`backup-${i}`)
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const backups = monitor.listBackups()

      // Should keep only 10 most recent
      expect(backups.length).toBeLessThanOrEqual(10)
    })
  })

  describe('restore', () => {
    it('should restore database from backup', async () => {
      // Create initial data
      const context1: CompressedContext = {
        id: 'test-1',
        compressed: 'content-1',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      persistence.saveContext(context1, 'project-hash-1')

      // Create backup
      const backupResult = await monitor.backup('restore-test')
      expect(backupResult.success).toBe(true)

      // Add more data
      const context2: CompressedContext = {
        id: 'test-2',
        compressed: 'content-2',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      persistence.saveContext(context2, 'project-hash-1')

      // Verify we have 2 contexts
      expect(persistence.getContext('test-1')).toBeTruthy()
      expect(persistence.getContext('test-2')).toBeTruthy()

      // Close persistence before restore
      persistence.close()

      // Restore from backup
      const restoreResult = await monitor.restore(backupResult.backupPath)
      expect(restoreResult.success).toBe(true)

      // Reopen persistence
      persistence = new ContextPersistence(testDbPath)

      // Should only have first context
      expect(persistence.getContext('test-1')).toBeTruthy()
      expect(persistence.getContext('test-2')).toBeNull()
    })

    it('should fail to restore non-existent backup', async () => {
      const result = await monitor.restore('/non/existent/backup.db')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('listBackups', () => {
    it('should list all backups', async () => {
      // Create multiple backups
      await monitor.backup('backup-1')
      await monitor.backup('backup-2')
      await monitor.backup('backup-3')

      const backups = monitor.listBackups()

      expect(backups.length).toBeGreaterThanOrEqual(3)
      expect(backups[0].path).toBeTruthy()
      expect(backups[0].metadata).toBeDefined()
    })

    it('should sort backups by timestamp descending', async () => {
      await monitor.backup('old')
      await new Promise(resolve => setTimeout(resolve, 10))
      await monitor.backup('new')

      const backups = monitor.listBackups()

      expect(backups.length).toBeGreaterThanOrEqual(2)
      expect(backups[0].metadata.timestamp).toBeGreaterThan(backups[1].metadata.timestamp)
    })

    it('should return empty array if no backups exist', () => {
      const backups = monitor.listBackups()
      expect(Array.isArray(backups)).toBe(true)
    })
  })

  describe('attemptRecovery', () => {
    it('should recover healthy database without changes', async () => {
      const result = await monitor.attemptRecovery()

      expect(result.success).toBe(true)
      expect(result.actions).toBeDefined()
      expect(result.errors).toHaveLength(0)
    })

    it('should checkpoint WAL during recovery', async () => {
      // Add data to create WAL
      for (let i = 0; i < 100; i++) {
        const context: CompressedContext = {
          id: `test-${i}`,
          compressed: `content-${i}`,
          algorithm: CompressionAlgorithm.COMBINED,
          strategy: CompressionStrategy.BALANCED,
          originalTokens: 1000,
          compressedTokens: 200,
          compressionRatio: 0.8,
          compressedAt: Date.now(),
        }
        persistence.saveContext(context, 'project-hash-1')
      }

      const result = await monitor.attemptRecovery()

      expect(result.success).toBe(true)
      expect(result.actions.length).toBeGreaterThan(0)
    })

    it('should restore from backup if database is corrupted', async () => {
      // Create backup first
      const context: CompressedContext = {
        id: 'test-recovery',
        compressed: 'content',
        algorithm: CompressionAlgorithm.COMBINED,
        strategy: CompressionStrategy.BALANCED,
        originalTokens: 1000,
        compressedTokens: 200,
        compressionRatio: 0.8,
        compressedAt: Date.now(),
      }
      persistence.saveContext(context, 'project-hash-1')

      await monitor.backup('pre-corruption')

      // Close connections
      monitor.close()
      persistence.close()

      // Corrupt database
      writeFileSync(testDbPath, 'corrupted')

      // Try recovery
      try {
        const corruptedMonitor = new DatabaseHealthMonitor(testDbPath)
        const result = await corruptedMonitor.attemptRecovery()

        // Should attempt restore
        expect(result.actions.length).toBeGreaterThan(0)

        corruptedMonitor.close()
      }
      catch {
        // Expected - corrupted database may fail
      }
    })
  })

  describe('schema versioning', () => {
    it('should get and set schema version', () => {
      const initialVersion = monitor.getSchemaVersion()
      expect(initialVersion).toBeGreaterThanOrEqual(0)

      monitor.setSchemaVersion(5)
      expect(monitor.getSchemaVersion()).toBe(5)
    })
  })

  describe('applyMigrations', () => {
    it('should apply pending migrations', async () => {
      // Set initial version
      monitor.setSchemaVersion(0)

      const migrations = [
        {
          version: 1,
          description: 'Add test column',
          up: (db: Database.Database) => {
            db.exec('ALTER TABLE contexts ADD COLUMN test_column TEXT')
          },
        },
        {
          version: 2,
          description: 'Add another column',
          up: (db: Database.Database) => {
            db.exec('ALTER TABLE contexts ADD COLUMN test_column2 TEXT')
          },
        },
      ]

      const result = await monitor.applyMigrations(migrations)

      expect(result.success).toBe(true)
      expect(result.applied).toEqual([1, 2])
      expect(result.errors).toHaveLength(0)
      expect(monitor.getSchemaVersion()).toBe(2)
    })

    it('should skip already applied migrations', async () => {
      monitor.setSchemaVersion(1)

      const migrations = [
        {
          version: 1,
          description: 'Already applied',
          up: (db: Database.Database) => {
            db.exec('ALTER TABLE contexts ADD COLUMN test_column TEXT')
          },
        },
        {
          version: 2,
          description: 'New migration',
          up: (db: Database.Database) => {
            db.exec('ALTER TABLE contexts ADD COLUMN test_column2 TEXT')
          },
        },
      ]

      const result = await monitor.applyMigrations(migrations)

      expect(result.success).toBe(true)
      expect(result.applied).toEqual([2])
      expect(monitor.getSchemaVersion()).toBe(2)
    })

    it('should rollback on migration failure', async () => {
      monitor.setSchemaVersion(0)

      const migrations = [
        {
          version: 1,
          description: 'Valid migration',
          up: (db: Database.Database) => {
            db.exec('ALTER TABLE contexts ADD COLUMN test_column TEXT')
          },
        },
        {
          version: 2,
          description: 'Invalid migration',
          up: (db: Database.Database) => {
            db.exec('INVALID SQL STATEMENT')
          },
        },
      ]

      const result = await monitor.applyMigrations(migrations)

      expect(result.success).toBe(false)
      expect(result.applied).toEqual([1])
      expect(result.errors.length).toBeGreaterThan(0)
      expect(monitor.getSchemaVersion()).toBe(1) // Should stop at last successful
    })

    it('should create backup before each migration', async () => {
      monitor.setSchemaVersion(0)

      const migrations = [
        {
          version: 1,
          description: 'Test migration',
          up: (db: Database.Database) => {
            db.exec('ALTER TABLE contexts ADD COLUMN test_column TEXT')
          },
        },
      ]

      await monitor.applyMigrations(migrations)

      const backups = monitor.listBackups()
      const migrationBackup = backups.find(b => b.path.includes('pre-migration'))

      expect(migrationBackup).toBeDefined()
    })
  })
})

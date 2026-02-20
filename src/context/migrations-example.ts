/**
 * Database Migration Examples
 *
 * Template migrations for common schema changes.
 * Copy and modify these for your own migrations.
 *
 * @module context/migrations-example
 */

import type Database from 'better-sqlite3'

/**
 * Migration template
 */
export interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
  down?: (db: Database.Database) => void // Optional rollback
}

/**
 * Example migrations for the context database
 */
export const exampleMigrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema (already applied in persistence.ts)',
    up: (db) => {
      // This migration is already applied by ContextPersistence
      // Included here for reference only
    },
  },

  {
    version: 2,
    description: 'Add tags column for context categorization',
    up: (db) => {
      db.exec(`
        ALTER TABLE contexts ADD COLUMN tags TEXT DEFAULT '[]';
        CREATE INDEX idx_contexts_tags ON contexts(tags);
      `)
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_contexts_tags;
        ALTER TABLE contexts DROP COLUMN tags;
      `)
    },
  },

  {
    version: 3,
    description: 'Add quality score for context ranking',
    up: (db) => {
      db.exec(`
        ALTER TABLE contexts ADD COLUMN quality_score REAL DEFAULT 0.0;
        CREATE INDEX idx_contexts_quality ON contexts(quality_score);
      `)
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_contexts_quality;
        ALTER TABLE contexts DROP COLUMN quality_score;
      `)
    },
  },

  {
    version: 4,
    description: 'Add context relationships table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS context_relationships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id TEXT NOT NULL,
          child_id TEXT NOT NULL,
          relationship_type TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (parent_id) REFERENCES contexts(id) ON DELETE CASCADE,
          FOREIGN KEY (child_id) REFERENCES contexts(id) ON DELETE CASCADE,
          UNIQUE(parent_id, child_id, relationship_type)
        );

        CREATE INDEX idx_relationships_parent ON context_relationships(parent_id);
        CREATE INDEX idx_relationships_child ON context_relationships(child_id);
        CREATE INDEX idx_relationships_type ON context_relationships(relationship_type);
      `)
    },
    down: (db) => {
      db.exec('DROP TABLE IF EXISTS context_relationships')
    },
  },

  {
    version: 5,
    description: 'Add full-text search support',
    up: (db) => {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS contexts_fts USING fts5(
          content,
          compressed,
          content='contexts',
          content_rowid='rowid'
        );

        -- Populate FTS table
        INSERT INTO contexts_fts(rowid, content, compressed)
        SELECT rowid, content, compressed FROM contexts;

        -- Trigger to keep FTS in sync
        CREATE TRIGGER contexts_fts_insert AFTER INSERT ON contexts BEGIN
          INSERT INTO contexts_fts(rowid, content, compressed)
          VALUES (new.rowid, new.content, new.compressed);
        END;

        CREATE TRIGGER contexts_fts_delete AFTER DELETE ON contexts BEGIN
          DELETE FROM contexts_fts WHERE rowid = old.rowid;
        END;

        CREATE TRIGGER contexts_fts_update AFTER UPDATE ON contexts BEGIN
          DELETE FROM contexts_fts WHERE rowid = old.rowid;
          INSERT INTO contexts_fts(rowid, content, compressed)
          VALUES (new.rowid, new.content, new.compressed);
        END;
      `)
    },
    down: (db) => {
      db.exec(`
        DROP TRIGGER IF EXISTS contexts_fts_update;
        DROP TRIGGER IF EXISTS contexts_fts_delete;
        DROP TRIGGER IF EXISTS contexts_fts_insert;
        DROP TABLE IF EXISTS contexts_fts;
      `)
    },
  },

  {
    version: 6,
    description: 'Add context usage statistics',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS context_stats (
          context_id TEXT PRIMARY KEY,
          total_accesses INTEGER DEFAULT 0,
          last_accessed INTEGER,
          avg_access_interval REAL,
          access_pattern TEXT DEFAULT '{}',
          FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
        );

        CREATE INDEX idx_stats_accessed ON context_stats(last_accessed);
        CREATE INDEX idx_stats_accesses ON context_stats(total_accesses);

        -- Populate from existing data
        INSERT INTO context_stats (context_id, total_accesses, last_accessed)
        SELECT id, access_count, last_accessed FROM contexts;
      `)
    },
    down: (db) => {
      db.exec('DROP TABLE IF EXISTS context_stats')
    },
  },

  {
    version: 7,
    description: 'Add compression algorithm versioning',
    up: (db) => {
      db.exec(`
        ALTER TABLE contexts ADD COLUMN algorithm_version TEXT DEFAULT '1.0';
        ALTER TABLE contexts ADD COLUMN decompression_hint TEXT;
        CREATE INDEX idx_contexts_algo_version ON contexts(algorithm_version);
      `)
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_contexts_algo_version;
        ALTER TABLE contexts DROP COLUMN decompression_hint;
        ALTER TABLE contexts DROP COLUMN algorithm_version;
      `)
    },
  },

  {
    version: 8,
    description: 'Add project metadata enhancements',
    up: (db) => {
      db.exec(`
        ALTER TABLE projects ADD COLUMN language TEXT;
        ALTER TABLE projects ADD COLUMN framework TEXT;
        ALTER TABLE projects ADD COLUMN last_health_check INTEGER;
        ALTER TABLE projects ADD COLUMN health_status TEXT DEFAULT 'unknown';

        CREATE INDEX idx_projects_language ON projects(language);
        CREATE INDEX idx_projects_framework ON projects(framework);
        CREATE INDEX idx_projects_health ON projects(health_status);
      `)
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_projects_health;
        DROP INDEX IF EXISTS idx_projects_framework;
        DROP INDEX IF EXISTS idx_projects_language;
        ALTER TABLE projects DROP COLUMN health_status;
        ALTER TABLE projects DROP COLUMN last_health_check;
        ALTER TABLE projects DROP COLUMN framework;
        ALTER TABLE projects DROP COLUMN language;
      `)
    },
  },

  {
    version: 9,
    description: 'Add context archival support',
    up: (db) => {
      db.exec(`
        ALTER TABLE contexts ADD COLUMN archived INTEGER DEFAULT 0;
        ALTER TABLE contexts ADD COLUMN archived_at INTEGER;
        ALTER TABLE contexts ADD COLUMN archive_reason TEXT;

        CREATE INDEX idx_contexts_archived ON contexts(archived);
        CREATE INDEX idx_contexts_archived_at ON contexts(archived_at);

        -- Create archived contexts view
        CREATE VIEW IF NOT EXISTS archived_contexts AS
        SELECT * FROM contexts WHERE archived = 1;

        -- Create active contexts view
        CREATE VIEW IF NOT EXISTS active_contexts AS
        SELECT * FROM contexts WHERE archived = 0;
      `)
    },
    down: (db) => {
      db.exec(`
        DROP VIEW IF EXISTS active_contexts;
        DROP VIEW IF EXISTS archived_contexts;
        DROP INDEX IF EXISTS idx_contexts_archived_at;
        DROP INDEX IF EXISTS idx_contexts_archived;
        ALTER TABLE contexts DROP COLUMN archive_reason;
        ALTER TABLE contexts DROP COLUMN archived_at;
        ALTER TABLE contexts DROP COLUMN archived;
      `)
    },
  },

  {
    version: 10,
    description: 'Add performance optimization indexes',
    up: (db) => {
      db.exec(`
        -- Composite indexes for common queries
        CREATE INDEX idx_contexts_project_timestamp
          ON contexts(project_hash, timestamp DESC);

        CREATE INDEX idx_contexts_project_accessed
          ON contexts(project_hash, last_accessed DESC);

        CREATE INDEX idx_contexts_project_ratio
          ON contexts(project_hash, compression_ratio);

        -- Covering index for stats queries
        CREATE INDEX idx_contexts_stats
          ON contexts(project_hash, original_tokens, compressed_tokens, compression_ratio);

        -- Analyze tables for query optimizer
        ANALYZE;
      `)
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_contexts_stats;
        DROP INDEX IF EXISTS idx_contexts_project_ratio;
        DROP INDEX IF EXISTS idx_contexts_project_accessed;
        DROP INDEX IF EXISTS idx_contexts_project_timestamp;
      `)
    },
  },
]

/**
 * Apply migrations to database
 *
 * @example
 * ```typescript
 * import { applyExampleMigrations } from './migrations-example'
 * import { createHealthMonitor } from './health-check'
 * import { getContextPersistence } from './persistence'
 *
 * const persistence = getContextPersistence()
 * const monitor = createHealthMonitor(persistence)
 *
 * const result = await applyExampleMigrations(monitor)
 * console.log(`Applied ${result.applied.length} migrations`)
 * ```
 */
export async function applyExampleMigrations(
  monitor: any, // DatabaseHealthMonitor
  startVersion?: number,
  endVersion?: number,
): Promise<any> {
  let migrations = exampleMigrations

  // Filter by version range
  if (startVersion !== undefined) {
    migrations = migrations.filter(m => m.version >= startVersion)
  }
  if (endVersion !== undefined) {
    migrations = migrations.filter(m => m.version <= endVersion)
  }

  return await monitor.applyMigrations(migrations)
}

/**
 * Create a custom migration
 *
 * @example
 * ```typescript
 * const migration = createMigration({
 *   version: 11,
 *   description: 'Add custom field',
 *   up: (db) => {
 *     db.exec('ALTER TABLE contexts ADD COLUMN custom_field TEXT')
 *   },
 * })
 * ```
 */
export function createMigration(config: {
  version: number
  description: string
  up: (db: Database.Database) => void
  down?: (db: Database.Database) => void
}): Migration {
  return {
    version: config.version,
    description: config.description,
    up: config.up,
    down: config.down,
  }
}

/**
 * Validate migration sequence
 *
 * Ensures migrations are in order and have no gaps
 */
export function validateMigrations(migrations: Migration[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const versions = migrations.map(m => m.version).sort((a, b) => a - b)

  // Check for duplicates
  const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i)
  if (duplicates.length > 0) {
    errors.push(`Duplicate versions: ${duplicates.join(', ')}`)
  }

  // Check for gaps
  for (let i = 1; i < versions.length; i++) {
    if (versions[i] !== versions[i - 1] + 1) {
      errors.push(`Gap in versions: ${versions[i - 1]} -> ${versions[i]}`)
    }
  }

  // Check for missing descriptions
  migrations.forEach(m => {
    if (!m.description || m.description.trim() === '') {
      errors.push(`Migration v${m.version} missing description`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

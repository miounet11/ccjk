/**
 * Context Persistence
 *
 * SQLite-based context persistence for CCJK Context Compression System.
 * Provides persistent storage for compressed contexts across sessions.
 *
 * @module context/persistence
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'pathe'
import type { CompressedContext, ContextData } from './types'

/**
 * Persisted context entry
 */
export interface PersistedContext {
  id: string
  projectHash: string
  content: string
  compressed: string
  algorithm: string
  strategy: string
  originalTokens: number
  compressedTokens: number
  compressionRatio: number
  metadata: string // JSON
  timestamp: number
  lastAccessed: number
  accessCount: number
}

/**
 * Context query options
 */
export interface ContextQueryOptions {
  projectHash?: string
  startTime?: number
  endTime?: number
  limit?: number
  sortBy?: 'timestamp' | 'lastAccessed' | 'accessCount' | 'relevance'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Search result with ranking
 */
export interface SearchResult extends PersistedContext {
  rank: number
  snippet?: string
}

/**
 * Context statistics
 */
export interface ContextStats {
  totalContexts: number
  totalProjects: number
  totalOriginalTokens: number
  totalCompressedTokens: number
  averageCompressionRatio: number
  totalSize: number
  oldestContext?: number
  newestContext?: number
}

/**
 * Context Persistence Manager
 */
export class ContextPersistence {
  private db: Database.Database
  private dbPath: string

  constructor(dbPath?: string) {
    // Default to ~/.ccjk/context/contexts.db
    this.dbPath = dbPath || join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.ccjk',
      'context',
      'contexts.db',
    )

    // Ensure directory exists
    const dir = dirname(this.dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Open database
    this.db = new Database(this.dbPath)

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL')

    // Initialize schema
    this.initSchema()
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        project_hash TEXT NOT NULL,
        content TEXT NOT NULL,
        compressed TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        strategy TEXT NOT NULL,
        original_tokens INTEGER NOT NULL,
        compressed_tokens INTEGER NOT NULL,
        compression_ratio REAL NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        timestamp INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_contexts_project ON contexts(project_hash);
      CREATE INDEX IF NOT EXISTS idx_contexts_timestamp ON contexts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_contexts_last_accessed ON contexts(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_contexts_access_count ON contexts(access_count);

      -- FTS5 virtual table for full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS contexts_fts USING fts5(
        id UNINDEXED,
        content,
        compressed,
        metadata,
        tokenize = 'porter unicode61'
      );

      -- Triggers to keep FTS5 in sync with main table
      CREATE TRIGGER IF NOT EXISTS contexts_ai AFTER INSERT ON contexts BEGIN
        INSERT INTO contexts_fts(id, content, compressed, metadata)
        VALUES (new.id, new.content, new.compressed, new.metadata);
      END;

      CREATE TRIGGER IF NOT EXISTS contexts_ad AFTER DELETE ON contexts BEGIN
        DELETE FROM contexts_fts WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS contexts_au AFTER UPDATE ON contexts BEGIN
        UPDATE contexts_fts
        SET content = new.content,
            compressed = new.compressed,
            metadata = new.metadata
        WHERE id = old.id;
      END;

      CREATE TABLE IF NOT EXISTS projects (
        hash TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        context_count INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
      CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at);

      -- Composite indexes for hot/warm/cold queries
      CREATE INDEX IF NOT EXISTS idx_contexts_hot ON contexts(project_hash, last_accessed DESC, access_count DESC);
      CREATE INDEX IF NOT EXISTS idx_contexts_warm ON contexts(project_hash, timestamp DESC) WHERE access_count > 1;
      CREATE INDEX IF NOT EXISTS idx_contexts_cold ON contexts(project_hash, timestamp ASC) WHERE access_count = 1;
    `)
  }

  /**
   * Save a compressed context
   */
  saveContext(context: CompressedContext, projectHash: string, originalContent?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO contexts (
        id, project_hash, content, compressed, algorithm, strategy,
        original_tokens, compressed_tokens, compression_ratio,
        metadata, timestamp, last_accessed, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    const existingContext = this.getContext(context.id)
    const accessCount = existingContext ? existingContext.accessCount + 1 : 1

    stmt.run(
      context.id,
      projectHash,
      originalContent || '', // Store original content if provided
      context.compressed,
      context.algorithm,
      context.strategy,
      context.originalTokens,
      context.compressedTokens,
      context.compressionRatio,
      JSON.stringify(context.metadata || {}),
      context.compressedAt || now,
      now,
      accessCount,
    )

    // Update project metadata
    this.updateProjectStats(projectHash)
  }

  /**
   * Get context by ID
   */
  getContext(contextId: string): PersistedContext | null {
    const stmt = this.db.prepare(`
      SELECT * FROM contexts WHERE id = ?
    `)

    const row = stmt.get(contextId) as any
    if (!row) return null

    // Update last accessed time
    this.updateLastAccessed(contextId)

    return this.rowToContext(row)
  }

  /**
   * Get contexts for a project
   */
  getProjectContexts(projectHash: string, options?: ContextQueryOptions): PersistedContext[] {
    let query = 'SELECT * FROM contexts WHERE project_hash = ?'
    const params: any[] = [projectHash]

    // Apply time filters
    if (options?.startTime) {
      query += ' AND timestamp >= ?'
      params.push(options.startTime)
    }

    if (options?.endTime) {
      query += ' AND timestamp <= ?'
      params.push(options.endTime)
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'timestamp'
    const sortOrder = options?.sortOrder || 'desc'
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`

    // Apply limit
    if (options?.limit) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => this.rowToContext(row))
  }

  /**
   * Query contexts with filters
   */
  queryContexts(options?: ContextQueryOptions): PersistedContext[] {
    let query = 'SELECT * FROM contexts WHERE 1=1'
    const params: any[] = []

    // Apply filters
    if (options?.projectHash) {
      query += ' AND project_hash = ?'
      params.push(options.projectHash)
    }

    if (options?.startTime) {
      query += ' AND timestamp >= ?'
      params.push(options.startTime)
    }

    if (options?.endTime) {
      query += ' AND timestamp <= ?'
      params.push(options.endTime)
    }

    // Apply sorting
    const sortBy = options?.sortBy || 'timestamp'
    const sortOrder = options?.sortOrder || 'desc'
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`

    // Apply limit
    if (options?.limit) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => this.rowToContext(row))
  }

  /**
   * Search contexts using FTS5 full-text search
   * @param searchQuery - Search query (supports FTS5 syntax: AND, OR, NOT, NEAR, "phrases")
   * @param options - Query options
   * @returns Search results with ranking
   */
  searchContexts(searchQuery: string, options?: ContextQueryOptions): SearchResult[] {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return []
    }

    let query = `
      SELECT
        c.*,
        bm25(contexts_fts) as rank,
        snippet(contexts_fts, 1, '<mark>', '</mark>', '...', 32) as snippet
      FROM contexts c
      INNER JOIN contexts_fts ON contexts_fts.id = c.id
      WHERE contexts_fts MATCH ?
    `
    const params: any[] = [searchQuery]

    // Apply filters
    if (options?.projectHash) {
      query += ' AND c.project_hash = ?'
      params.push(options.projectHash)
    }

    if (options?.startTime) {
      query += ' AND c.timestamp >= ?'
      params.push(options.startTime)
    }

    if (options?.endTime) {
      query += ' AND c.timestamp <= ?'
      params.push(options.endTime)
    }

    // Apply sorting (default to relevance for search)
    const sortBy = options?.sortBy || 'relevance'
    const sortOrder = options?.sortOrder || 'desc'

    if (sortBy === 'relevance') {
      query += ` ORDER BY rank ${sortOrder === 'asc' ? 'DESC' : 'ASC'}` // BM25 returns negative scores
    }
    else {
      query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`
    }

    // Apply limit
    if (options?.limit) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => ({
      ...this.rowToContext(row),
      rank: row.rank,
      snippet: row.snippet,
    }))
  }

  /**
   * Get hot contexts (frequently accessed, recently used)
   * @param projectHash - Project hash
   * @param limit - Maximum number of results
   */
  getHotContexts(projectHash: string, limit = 10): PersistedContext[] {
    const stmt = this.db.prepare(`
      SELECT * FROM contexts
      WHERE project_hash = ?
      ORDER BY last_accessed DESC, access_count DESC
      LIMIT ?
    `)
    const rows = stmt.all(projectHash, limit) as any[]
    return rows.map(row => this.rowToContext(row))
  }

  /**
   * Get warm contexts (accessed multiple times but not recently)
   * @param projectHash - Project hash
   * @param limit - Maximum number of results
   */
  getWarmContexts(projectHash: string, limit = 10): PersistedContext[] {
    const stmt = this.db.prepare(`
      SELECT * FROM contexts
      WHERE project_hash = ? AND access_count > 1
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    const rows = stmt.all(projectHash, limit) as any[]
    return rows.map(row => this.rowToContext(row))
  }

  /**
   * Get cold contexts (rarely accessed, older)
   * @param projectHash - Project hash
   * @param limit - Maximum number of results
   */
  getColdContexts(projectHash: string, limit = 10): PersistedContext[] {
    const stmt = this.db.prepare(`
      SELECT * FROM contexts
      WHERE project_hash = ? AND access_count = 1
      ORDER BY timestamp ASC
      LIMIT ?
    `)
    const rows = stmt.all(projectHash, limit) as any[]
    return rows.map(row => this.rowToContext(row))
  }

  /**
   * Delete context by ID
   */
  deleteContext(contextId: string): boolean {
    const context = this.getContext(contextId)
    if (!context) return false

    const stmt = this.db.prepare('DELETE FROM contexts WHERE id = ?')
    const result = stmt.run(contextId)

    // Update project stats
    if (context.projectHash) {
      this.updateProjectStats(context.projectHash)
    }

    return result.changes > 0
  }

  /**
   * Delete all contexts for a project
   */
  deleteProjectContexts(projectHash: string): number {
    const stmt = this.db.prepare('DELETE FROM contexts WHERE project_hash = ?')
    const result = stmt.run(projectHash)

    // Update project stats
    this.updateProjectStats(projectHash)

    return result.changes
  }

  /**
   * Register or update project
   */
  registerProject(projectHash: string, projectPath: string, projectName?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects (hash, path, name, created_at, updated_at, context_count, total_tokens, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const now = Date.now()
    const existing = this.getProject(projectHash)
    const createdAt = existing?.created_at || now

    stmt.run(
      projectHash,
      projectPath,
      projectName || null,
      createdAt,
      now,
      existing?.context_count || 0,
      existing?.total_tokens || 0,
      JSON.stringify(existing?.metadata || {}),
    )
  }

  /**
   * Get project info
   */
  getProject(projectHash: string): any {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE hash = ?')
    return stmt.get(projectHash)
  }

  /**
   * List all projects
   */
  listProjects(): any[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    return stmt.all()
  }

  /**
   * Get context statistics
   */
  getStats(projectHash?: string): ContextStats {
    let query = 'SELECT COUNT(*) as count, SUM(original_tokens) as orig, SUM(compressed_tokens) as comp, MIN(timestamp) as oldest, MAX(timestamp) as newest FROM contexts'
    const params: any[] = []

    if (projectHash) {
      query += ' WHERE project_hash = ?'
      params.push(projectHash)
    }

    const stmt = this.db.prepare(query)
    const row = stmt.get(...params) as any

    const totalProjects = projectHash
      ? 1
      : (this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as any).count

    const avgRatio = row.orig > 0
      ? (row.orig - row.comp) / row.orig
      : 0

    return {
      totalContexts: row.count || 0,
      totalProjects,
      totalOriginalTokens: row.orig || 0,
      totalCompressedTokens: row.comp || 0,
      averageCompressionRatio: avgRatio,
      totalSize: this.getDatabaseSize(),
      oldestContext: row.oldest || undefined,
      newestContext: row.newest || undefined,
    }
  }

  /**
   * Clean up old contexts
   */
  cleanup(maxAge: number): number {
    const cutoff = Date.now() - maxAge

    const stmt = this.db.prepare('DELETE FROM contexts WHERE timestamp < ?')
    const result = stmt.run(cutoff)

    // Update all project stats
    const projects = this.listProjects()
    for (const project of projects) {
      this.updateProjectStats(project.hash)
    }

    return result.changes
  }

  /**
   * Vacuum database to reclaim space
   */
  vacuum(): void {
    this.db.exec('VACUUM')
  }

  /**
   * Close database
   */
  close(): void {
    this.db.close()
  }

  /**
   * Get database size in bytes
   */
  getDatabaseSize(): number {
    try {
      const fs = require('node:fs')
      const stats = fs.statSync(this.dbPath)
      return stats.size
    }
    catch {
      return 0
    }
  }

  /**
   * Export contexts to JSON
   */
  exportContexts(projectHash?: string): PersistedContext[] {
    return this.queryContexts({ projectHash })
  }

  /**
   * Import contexts from JSON
   */
  importContexts(contexts: PersistedContext[]): number {
    let imported = 0

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO contexts (
        id, project_hash, content, compressed, algorithm, strategy,
        original_tokens, compressed_tokens, compression_ratio,
        metadata, timestamp, last_accessed, access_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const context of contexts) {
      try {
        stmt.run(
          context.id,
          context.projectHash,
          context.content,
          context.compressed,
          context.algorithm,
          context.strategy,
          context.originalTokens,
          context.compressedTokens,
          context.compressionRatio,
          context.metadata,
          context.timestamp,
          context.lastAccessed,
          context.accessCount,
        )
        imported++
      }
      catch {
        // Skip invalid entries
      }
    }

    return imported
  }

  /**
   * Update last accessed time
   */
  private updateLastAccessed(contextId: string): void {
    const stmt = this.db.prepare(`
      UPDATE contexts
      SET last_accessed = ?, access_count = access_count + 1
      WHERE id = ?
    `)
    stmt.run(Date.now(), contextId)
  }

  /**
   * Update project statistics
   */
  private updateProjectStats(projectHash: string): void {
    const stmt = this.db.prepare(`
      UPDATE projects
      SET
        context_count = (SELECT COUNT(*) FROM contexts WHERE project_hash = ?),
        total_tokens = (SELECT COALESCE(SUM(original_tokens), 0) FROM contexts WHERE project_hash = ?),
        updated_at = ?
      WHERE hash = ?
    `)
    stmt.run(projectHash, projectHash, Date.now(), projectHash)
  }

  /**
   * Convert database row to PersistedContext
   */
  private rowToContext(row: any): PersistedContext {
    return {
      id: row.id,
      projectHash: row.project_hash,
      content: row.content,
      compressed: row.compressed,
      algorithm: row.algorithm,
      strategy: row.strategy,
      originalTokens: row.original_tokens,
      compressedTokens: row.compressed_tokens,
      compressionRatio: row.compression_ratio,
      metadata: row.metadata,
      timestamp: row.timestamp,
      lastAccessed: row.last_accessed,
      accessCount: row.access_count,
    }
  }
}

/**
 * Global context persistence instance
 */
let globalContextPersistence: ContextPersistence | null = null

/**
 * Get global context persistence instance
 */
export function getContextPersistence(dbPath?: string): ContextPersistence {
  if (!globalContextPersistence) {
    globalContextPersistence = new ContextPersistence(dbPath)
  }
  return globalContextPersistence
}

/**
 * Create a new context persistence instance
 */
export function createContextPersistence(dbPath?: string): ContextPersistence {
  return new ContextPersistence(dbPath)
}

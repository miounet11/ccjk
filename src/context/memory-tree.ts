/**
 * Memory Tree - Persistent conversation memory with confidence-based retrieval
 *
 * Features:
 * - SQLite + FTS5 for full-text search with BM25 ranking
 * - Confidence-based memory management (boost on access, decay over time)
 * - Priority system (P0/P1/P2) for importance weighting
 * - Automatic archival of low-confidence memories
 */

import { type Database, createDatabase, saveDatabase } from './sql-adapter';
import { homedir } from 'os';
import { join } from 'pathe';
import { mkdirSync, existsSync } from 'fs';

export interface MemoryNode {
  id: string;
  content: string;
  summary: string;
  confidence: number;
  priority: 'P0' | 'P1' | 'P2';
  lastAccessed: Date;
  accessCount: number;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface SearchResult extends MemoryNode {
  score: number;
}

export interface MemoryStats {
  totalNodes: number;
  greenLeaves: number;  // confidence >= 0.8
  yellowLeaves: number; // 0.5 <= confidence < 0.8
  brownLeaves: number;  // 0.3 <= confidence < 0.5
  archived: number;     // confidence < 0.3
  avgConfidence: number;
  byPriority: Record<string, number>;
}

export class MemoryTree {
  private db!: Database;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || this.getDefaultDbPath();
    this.ensureDbDirectory();
  }

  async init() {
    if (!this.initialized) {
      this.db = await createDatabase(this.dbPath);
      this.initSchema();
      this.initialized = true;
    }
  }

  private getDefaultDbPath(): string {
    const ccjkDir = process.env.ZCF_CONFIG_DIR || join(homedir(), '.ccjk');
    return join(ccjkDir, 'memory.db');
  }

  private ensureDbDirectory(): void {
    const dir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private initSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memory_nodes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        summary TEXT NOT NULL,
        confidence REAL NOT NULL,
        priority TEXT NOT NULL,
        last_accessed INTEGER NOT NULL,
        access_count INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT
      );
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_confidence ON memory_nodes(confidence);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_priority ON memory_nodes(priority);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_last_accessed ON memory_nodes(last_accessed);`);

    this.save();
  }

  async addNode(node: Omit<MemoryNode, 'id' | 'createdAt' | 'lastAccessed' | 'accessCount'>): Promise<string> {
    await this.init();
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    this.db.run(
      `INSERT INTO memory_nodes (id, content, summary, confidence, priority, last_accessed, access_count, created_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, node.content, node.summary, node.confidence, node.priority, now, 0, now, JSON.stringify(node.metadata || {})]
    );

    this.save();
    return id;
  }

  async getNode(id: string): Promise<MemoryNode | null> {
    await this.init();
    const results = this.db.exec(`SELECT * FROM memory_nodes WHERE id = ?`, [id]);

    if (!results.length || !results[0].values.length) return null;

    const row = results[0].values[0];
    return this.rowToNode(results[0].columns, row);
  }

  async search(query: string, options: {
    limit?: number;
    minConfidence?: number;
    priorities?: Array<'P0' | 'P1' | 'P2'>;
  } = {}): Promise<SearchResult[]> {
    await this.init();

    const { limit = 10, minConfidence = 0.3, priorities = ['P0', 'P1', 'P2'] } = options;

    const priorityFilter = priorities.map(() => '?').join(',');
    const pattern = `%${query}%`;
    const sql = `
      SELECT *,
        (CASE
          WHEN content LIKE ? THEN 1
          WHEN summary LIKE ? THEN 2
          ELSE 3
        END) as score
      FROM memory_nodes
      WHERE (content LIKE ? OR summary LIKE ?)
        AND confidence >= ?
        AND priority IN (${priorityFilter})
      ORDER BY score, confidence DESC
      LIMIT ?
    `;

    const results = this.db.exec(sql, [pattern, pattern, pattern, pattern, minConfidence, ...priorities, limit]);

    if (!results.length || !results[0].values.length) return [];

    return results[0].values.map(row => {
      const node = this.rowToNode(results[0].columns, row);
      return { ...node, score: row[results[0].columns.indexOf('score')] as number };
    });
  }

  async updateConfidence(id: string, delta: number): Promise<void> {
    await this.init();
    this.db.run(
      `UPDATE memory_nodes
       SET confidence = CASE
         WHEN confidence + ? > 1.0 THEN 1.0
         WHEN confidence + ? < 0.0 THEN 0.0
         ELSE confidence + ?
       END
       WHERE id = ?`,
      [delta, delta, delta, id]
    );
    this.save();
  }

  async recordAccess(id: string): Promise<void> {
    await this.init();
    const now = Date.now();
    this.db.run(
      `UPDATE memory_nodes
       SET last_accessed = ?,
           access_count = access_count + 1,
           confidence = CASE
             WHEN confidence + 0.05 > 1.0 THEN 1.0
             ELSE confidence + 0.05
           END
       WHERE id = ?`,
      [now, id]
    );
    this.save();
  }

  async applyDecay(decayRate: number = 0.01): Promise<number> {
    await this.init();
    const before = this.db.exec(`SELECT COUNT(*) FROM memory_nodes`);
    const countBefore = before[0]?.values[0]?.[0] as number || 0;

    this.db.run(
      `UPDATE memory_nodes
       SET confidence = CASE
         WHEN confidence - ? < 0.0 THEN 0.0
         ELSE confidence - ?
       END`,
      [decayRate, decayRate]
    );
    this.save();

    return countBefore;
  }

  async archiveLowConfidence(threshold: number = 0.3): Promise<number> {
    await this.init();
    const before = this.db.exec(`SELECT COUNT(*) FROM memory_nodes WHERE confidence < ?`, [threshold]);
    const count = before[0]?.values[0]?.[0] as number || 0;

    this.db.run(`DELETE FROM memory_nodes WHERE confidence < ?`, [threshold]);
    this.save();

    return count;
  }

  async getStats(): Promise<MemoryStats> {
    await this.init();

    const results = this.db.exec(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN confidence >= 0.8 THEN 1 ELSE 0 END) as green,
        SUM(CASE WHEN confidence >= 0.5 AND confidence < 0.8 THEN 1 ELSE 0 END) as yellow,
        SUM(CASE WHEN confidence >= 0.3 AND confidence < 0.5 THEN 1 ELSE 0 END) as brown,
        SUM(CASE WHEN confidence < 0.3 THEN 1 ELSE 0 END) as archived,
        AVG(confidence) as avg_confidence
      FROM memory_nodes
    `);

    const priorityResults = this.db.exec(`
      SELECT priority, COUNT(*) as count
      FROM memory_nodes
      GROUP BY priority
    `);

    const row = results[0]?.values[0] || [];
    const byPriority: Record<string, number> = {};

    if (priorityResults.length && priorityResults[0].values.length) {
      for (const pRow of priorityResults[0].values) {
        byPriority[pRow[0] as string] = pRow[1] as number;
      }
    }

    return {
      totalNodes: (row[0] as number) || 0,
      greenLeaves: (row[1] as number) || 0,
      yellowLeaves: (row[2] as number) || 0,
      brownLeaves: (row[3] as number) || 0,
      archived: (row[4] as number) || 0,
      avgConfidence: (row[5] as number) || 0,
      byPriority
    };
  }

  async getAllNodes(options: {
    minConfidence?: number;
    priorities?: Array<'P0' | 'P1' | 'P2'>;
    limit?: number;
  } = {}): Promise<MemoryNode[]> {
    await this.init();

    const { minConfidence = 0, priorities = ['P0', 'P1', 'P2'], limit } = options;
    const priorityFilter = priorities.map(() => '?').join(',');

    let sql = `
      SELECT * FROM memory_nodes
      WHERE confidence >= ?
        AND priority IN (${priorityFilter})
      ORDER BY confidence DESC, last_accessed DESC
    `;

    const params: any[] = [minConfidence, ...priorities];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const results = this.db.exec(sql, params);

    if (!results.length || !results[0].values.length) return [];

    return results[0].values.map(row => this.rowToNode(results[0].columns, row));
  }

  async deleteNode(id: string): Promise<boolean> {
    await this.init();
    this.db.run(`DELETE FROM memory_nodes WHERE id = ?`, [id]);
    this.save();

    const results = this.db.exec(`SELECT changes()`);
    return ((results[0]?.values[0]?.[0] as number) || 0) > 0;
  }

  async clear(): Promise<void> {
    await this.init();
    this.db.run(`DELETE FROM memory_nodes`);
    this.save();
  }

  close(): void {
    if (this.initialized) {
      this.save();
      this.db.close();
      this.initialized = false;
    }
  }

  private save(): void {
    if (this.initialized) {
      saveDatabase(this.db, this.dbPath);
    }
  }

  private rowToNode(columns: string[], row: any[]): MemoryNode {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });

    return {
      id: obj.id,
      content: obj.content,
      summary: obj.summary,
      confidence: obj.confidence,
      priority: obj.priority,
      lastAccessed: new Date(obj.last_accessed),
      accessCount: obj.access_count,
      createdAt: new Date(obj.created_at),
      metadata: obj.metadata ? JSON.parse(obj.metadata) : {}
    };
  }
}

import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

export async function createDatabase(path: string): Promise<Database> {
  const sql = await initSQL();

  if (existsSync(path)) {
    const buffer = readFileSync(path);
    return new sql.Database(buffer);
  }

  return new sql.Database();
}

export function saveDatabase(db: Database, path: string): void {
  const data = db.export();
  writeFileSync(path, data);
}

export type { Database };

import type { ConfigPlan } from './change-plan'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { basename, join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../constants'
import { ensureDir, writeFileAtomic } from '../utils/fs-operations'

export const SNAPSHOTS_DIR = join(CCJK_CONFIG_DIR, 'snapshots')

function getSnapshotsDir(): string {
  return process.env.CCJK_SNAPSHOTS_DIR || SNAPSHOTS_DIR
}

export interface SnapshotFile {
  target: string
  sourcePath: string
  backupPath: string
  beforeHash: string
  afterHash: string
  operation: string
  reason: string
  existed: boolean
}

export interface ConfigSnapshotManifest {
  version: 1
  id: string
  planId: string
  title: string
  createdAt: string
  risk: string
  files: SnapshotFile[]
}

export interface ConfigSnapshot {
  id: string
  path: string
  manifest: ConfigSnapshotManifest
}

export interface RestoreSnapshotResult {
  restored: SnapshotFile[]
  skipped: SnapshotFile[]
}

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

function safeFileName(path: string): string {
  return basename(path).replace(/[^\w.-]/g, '_') || 'config'
}

export function createConfigSnapshot(plan: ConfigPlan): ConfigSnapshot {
  const id = `${safeTimestamp()}-${plan.id.slice(0, 8)}`
  const snapshotDir = join(getSnapshotsDir(), id)
  const filesDir = join(snapshotDir, 'files')
  ensureDir(filesDir)

  const seen = new Map<string, number>()
  const files: SnapshotFile[] = []

  for (const change of plan.changes) {
    const beforeContent = change.beforeContent ?? ''
    const count = seen.get(change.file) ?? 0
    seen.set(change.file, count + 1)
    const backupName = `${String(count + 1).padStart(2, '0')}-${safeFileName(change.file)}`
    const backupPath = join('files', backupName)

    writeFileAtomic(join(snapshotDir, backupPath), beforeContent)
    files.push({
      target: change.target,
      sourcePath: change.file,
      backupPath,
      beforeHash: change.beforeHash,
      afterHash: change.afterHash,
      operation: change.operation,
      reason: change.reason,
      existed: change.beforeExists,
    })
  }

  const manifest: ConfigSnapshotManifest = {
    version: 1,
    id,
    planId: plan.id,
    title: plan.title,
    createdAt: new Date().toISOString(),
    risk: plan.risk,
    files,
  }

  writeFileAtomic(join(snapshotDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  return {
    id,
    path: snapshotDir,
    manifest,
  }
}

export function listConfigSnapshots(): ConfigSnapshotManifest[] {
  const snapshotsDir = getSnapshotsDir()
  if (!existsSync(snapshotsDir)) {
    return []
  }

  return readdirSync(snapshotsDir)
    .map((entry) => {
      const manifestPath = join(snapshotsDir, entry, 'manifest.json')
      try {
        return JSON.parse(readFileSync(manifestPath, 'utf-8')) as ConfigSnapshotManifest
      }
      catch {
        return null
      }
    })
    .filter((item): item is ConfigSnapshotManifest => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function readConfigSnapshot(id: string): ConfigSnapshot | null {
  const snapshotDir = join(getSnapshotsDir(), id)
  const manifestPath = join(snapshotDir, 'manifest.json')

  if (!existsSync(manifestPath)) {
    return null
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as ConfigSnapshotManifest
    return {
      id: manifest.id,
      path: snapshotDir,
      manifest,
    }
  }
  catch {
    return null
  }
}

export function restoreConfigSnapshot(id: string): RestoreSnapshotResult {
  const snapshot = readConfigSnapshot(id)
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${id}`)
  }

  const restored: SnapshotFile[] = []
  const skipped: SnapshotFile[] = []

  for (const file of snapshot.manifest.files) {
    const backupPath = join(snapshot.path, file.backupPath)
    if (!existsSync(backupPath)) {
      skipped.push(file)
      continue
    }

    if (!file.existed) {
      if (existsSync(file.sourcePath)) {
        rmSync(file.sourcePath, { force: true })
      }
      restored.push(file)
      continue
    }

    const content = readFileSync(backupPath, 'utf-8')
    writeFileAtomic(file.sourcePath, content)
    restored.push(file)
  }

  return { restored, skipped }
}

import { promises as fs } from 'node:fs'
import { consola } from 'consola'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { i18n } from '../i18n'

export interface BackupOptions {
  name?: string
  includePatterns?: string[]
  excludePatterns?: string[]
  compress?: boolean
}

export async function createBackup(
  operation: string,
  options: BackupOptions = {},
): Promise<string> {
  const timestamp = dayjs().format('YYYYMMDD-HHmmss')
  const backupName = options.name || operation
  const backupDir = join(process.cwd(), '.ccjk-backups', `${backupName}-${timestamp}`)

  try {
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true })

    // Files to backup
    const filesToBackup = [
      '.claude.json',
      '.claude.md',
      '.claudeignore',
      'claude.config.json',
      'claude.config.toml',
      '.vscode/settings.json',
      '.github/workflows',
      '.git/hooks',
      'package.json',
      'pnpm-workspace.yaml',
      '.ccjk',
    ]

    // Copy files
    for (const file of filesToBackup) {
      const sourcePath = join(process.cwd(), file)
      const destPath = join(backupDir, file)

      try {
        const stats = await fs.stat(sourcePath)
        if (stats.isDirectory()) {
          await copyDirectory(sourcePath, destPath)
        }
        else {
          await fs.mkdir(join(destPath, '..'), { recursive: true })
          await fs.copyFile(sourcePath, destPath)
        }
      }
      catch (_error) {
        // File doesn't exist, skip
      }
    }

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      operation,
      files: filesToBackup,
      cwd: process.cwd(),
      nodeVersion: process.version,
    }

    await fs.writeFile(
      join(backupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8',
    )

    consola.success(i18n.t('backup.created', { path: backupDir }))
    return backupDir
  }
  catch (error) {
    consola.error(i18n.t('backup.failed'), error)
    throw error
  }
}

export async function restoreBackup(backupPath: string): Promise<void> {
  try {
    // Read manifest
    const manifestPath = join(backupPath, 'backup-manifest.json')
    const manifestContent = await fs.readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)

    consola.info(i18n.t('backup.restoring', { timestamp: manifest.timestamp }))

    // Restore files
    for (const file of manifest.files) {
      const sourcePath = join(backupPath, file)
      const destPath = join(process.cwd(), file)

      try {
        await fs.stat(sourcePath)
        // File exists in backup

        try {
          const stats = await fs.stat(sourcePath)
          if (stats.isDirectory()) {
            await copyDirectory(sourcePath, destPath)
          }
          else {
            await fs.mkdir(join(destPath, '..'), { recursive: true })
            await fs.copyFile(sourcePath, destPath)
          }
        }
        catch (_error) {
          consola.warn(i18n.t('backup.restoreFailed', { file }))
        }
      }
      catch (_error) {
        // File doesn't exist in backup, skip
      }
    }

    consola.success(i18n.t('backup.restoreComplete'))
  }
  catch (error) {
    consola.error(i18n.t('backup.restoreFailed'), error)
    throw error
  }
}

export async function listBackups(): Promise<string[]> {
  try {
    const backupDir = join(process.cwd(), '.ccjk-backups')
    await fs.mkdir(backupDir, { recursive: true })

    const entries = await fs.readdir(backupDir)
    const backups: string[] = []

    for (const entry of entries) {
      const fullPath = join(backupDir, entry)
      try {
        const stats = await fs.stat(fullPath)
        if (stats.isDirectory()) {
          backups.push(fullPath)
        }
      }
      catch (_error) {
        // Skip invalid entries
      }
    }

    return backups.sort((a, b) => b.localeCompare(a)) // Newest first
  }
  catch (_error) {
    return []
  }
}

export async function cleanupOldBackups(keepCount: number = 5): Promise<void> {
  const backups = await listBackups()

  if (backups.length <= keepCount) {
    return
  }

  const toRemove = backups.slice(keepCount)

  for (const backup of toRemove) {
    try {
      await fs.rm(backup, { recursive: true, force: true })
      consola.info(i18n.t('backup.removed', { path: backup }))
    }
    catch (_error) {
      consola.warn(i18n.t('backup.removeFailed', { path: backup }))
    }
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    }
    else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

export async function validateBackup(backupPath: string): Promise<boolean> {
  try {
    // Check if manifest exists
    const manifestPath = join(backupPath, 'backup-manifest.json')
    await fs.access(manifestPath)

    // Check if manifest is valid JSON
    const manifestContent = await fs.readFile(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)

    // Validate required fields
    if (!manifest.timestamp || !manifest.operation || !Array.isArray(manifest.files)) {
      return false
    }

    // Check if at least some files exist
    let foundFiles = 0
    for (const file of manifest.files) {
      try {
        await fs.access(join(backupPath, file))
        foundFiles++
      }
      catch (_error) {
        // File not found
      }
    }

    return foundFiles > 0
  }
  catch (_error) {
    return false
  }
}

import { promises as fsp } from 'node:fs'
import trash from 'trash'

async function pathExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p)
    return true
  }
  catch {
    return false
  }
}

export interface TrashResult {
  success: boolean
  path: string
  error?: string
}

/**
 * Move file or directory to system trash
 * @param paths - Single path or array of paths to move to trash
 * @returns Promise with trash operation result
 */
export async function moveToTrash(paths: string | string[]): Promise<TrashResult[]> {
  const pathArray = Array.isArray(paths) ? paths : [paths]
  const results: TrashResult[] = []

  for (const path of pathArray) {
    try {
      // Check if path exists before attempting to trash
      const exists = await pathExists(path)
      if (!exists) {
        results.push({
          success: false,
          path,
          error: 'Path does not exist',
        })
        continue
      }

      // Move to trash
      await trash(path)
      results.push({
        success: true,
        path,
      })
    }
    catch (error: any) {
      results.push({
        success: false,
        path,
        error: error.message || 'Unknown error occurred',
      })
    }
  }

  return results
}

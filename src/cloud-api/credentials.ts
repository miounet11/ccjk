/**
 * CCJK Cloud API Credentials Manager
 *
 * Handles secure storage of device credentials.
 *
 * @module cloud-api/credentials
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { CloudCredentials } from '../types/cloud-api'

/**
 * Get credentials file path
 */
export function getCredentialsPath(): string {
  return join(homedir(), '.ccjk', 'cloud-credentials.json')
}

/**
 * Check if credentials exist
 */
export function hasCredentials(): boolean {
  return existsSync(getCredentialsPath())
}

/**
 * Get stored credentials
 *
 * @returns Credentials or null if not found
 */
export function getCredentials(): CloudCredentials | null {
  const path = getCredentialsPath()

  if (!existsSync(path)) {
    return null
  }

  try {
    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as CloudCredentials
  }
  catch {
    return null
  }
}

/**
 * Save credentials
 *
 * @param credentials - Credentials to save
 */
export function saveCredentials(credentials: CloudCredentials): void {
  const path = getCredentialsPath()
  const dir = join(homedir(), '.ccjk')

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(path, JSON.stringify(credentials, null, 2), {
    mode: 0o600, // Owner read/write only
  })
}

/**
 * Clear stored credentials
 */
export function clearCredentials(): void {
  const path = getCredentialsPath()

  if (existsSync(path)) {
    unlinkSync(path)
  }
}

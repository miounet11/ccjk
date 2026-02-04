/**
 * Runtime State Manager
 *
 * Manages ~/.ccjk/state.json - transient runtime state that doesn't belong in main config
 * This includes sessions, cache info, and update tracking
 */

import type { CodeToolType, SupportedLang } from '../../constants'
import type { CacheState, PartialRuntimeState, RuntimeState, SessionState, UpdateState } from './types'

import { join } from 'pathe'
import { CCJK_CONFIG_DIR } from '../../constants'
import { ensureDir, exists } from '../../utils/fs-operations'
import { readJsonConfig, writeJsonConfig } from '../../utils/json-config'

/**
 * Default state file path
 */
export const STATE_FILE = join(CCJK_CONFIG_DIR, 'state.json')

/**
 * Default state version
 */
const DEFAULT_STATE_VERSION = '4.0.0'

/**
 * Default cache TTL (24 hours)
 */
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000

/**
 * Create default runtime state
 */
export function createDefaultState(): RuntimeState {
  return {
    version: DEFAULT_STATE_VERSION,
    lastUpdated: new Date().toISOString(),
    sessions: [],
    cache: {
      lastCleanup: new Date().toISOString(),
      size: 0,
      maxAge: DEFAULT_CACHE_TTL,
    },
    updates: {
      lastCheck: new Date(0).toISOString(),
      lastVersion: '0.0.0',
      currentVersion: DEFAULT_STATE_VERSION,
      updateAvailable: false,
    },
  }
}

/**
 * Read runtime state from file
 */
export function readState(statePath: string = STATE_FILE): RuntimeState | null {
  try {
    if (!exists(statePath)) {
      return null
    }

    return readJsonConfig<RuntimeState>(statePath) || null
  }
  catch (error) {
    console.error(`Failed to read state from ${statePath}:`, error)
    return null
  }
}

/**
 * Write runtime state to file
 */
export function writeState(
  state: RuntimeState,
  statePath: string = STATE_FILE,
): void {
  try {
    // Ensure directory exists
    ensureDir(CCJK_CONFIG_DIR)

    // Update timestamp
    state.lastUpdated = new Date().toISOString()

    // Write state file
    writeJsonConfig(statePath, state, { pretty: true, atomic: true })
  }
  catch (error) {
    console.error(`Failed to write state to ${statePath}:`, error)
    throw new Error(`Failed to write state: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Update runtime state with partial changes
 */
export function updateState(
  updates: PartialRuntimeState,
  statePath: string = STATE_FILE,
): RuntimeState {
  const existingState = readState(statePath) || createDefaultState()

  const updatedState: RuntimeState = {
    version: updates.version || existingState.version,
    lastUpdated: new Date().toISOString(),
    sessions: updates.sessions !== undefined ? updates.sessions : existingState.sessions,
    cache: {
      ...existingState.cache,
      ...(updates.cache || {}),
    },
    updates: {
      ...existingState.updates,
      ...(updates.updates || {}),
    },
  }

  writeState(updatedState, statePath)
  return updatedState
}

/**
 * Get or create runtime state
 */
export function getState(statePath: string = STATE_FILE): RuntimeState {
  const state = readState(statePath)
  return state || createDefaultState()
}

/**
 * Create a new session
 */
export function createSession(
  tool: CodeToolType,
  lang: SupportedLang,
  profile?: string,
  statePath: string = STATE_FILE,
): SessionState {
  const session: SessionState = {
    id: generateSessionId(),
    startTime: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    tool,
    lang,
    profile,
  }

  const state = getState(statePath)
  state.sessions.unshift(session) // Add to beginning

  // Limit sessions to 100
  if (state.sessions.length > 100) {
    state.sessions = state.sessions.slice(0, 100)
  }

  writeState(state, statePath)
  return session
}

/**
 * Update session activity
 */
export function updateSessionActivity(
  sessionId: string,
  statePath: string = STATE_FILE,
): void {
  const state = readState(statePath)
  if (!state) {
    return
  }

  const session = state.sessions.find(s => s.id === sessionId)
  if (session) {
    session.lastActivity = new Date().toISOString()
    writeState(state, statePath)
  }
}

/**
 * End a session
 */
export function endSession(
  sessionId: string,
  statePath: string = STATE_FILE,
): void {
  const state = readState(statePath)
  if (!state) {
    return
  }

  const index = state.sessions.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    state.sessions.splice(index, 1)
    writeState(state, statePath)
  }
}

/**
 * Get active sessions (within last hour)
 */
export function getActiveSessions(statePath: string = STATE_FILE): SessionState[] {
  const state = readState(statePath)
  if (!state) {
    return []
  }

  const oneHourAgo = Date.now() - 60 * 60 * 1000
  return state.sessions.filter(s => new Date(s.lastActivity).getTime() > oneHourAgo)
}

/**
 * Get all sessions
 */
export function getAllSessions(statePath: string = STATE_FILE): SessionState[] {
  const state = readState(statePath)
  return state?.sessions || []
}

/**
 * Clear old sessions (older than specified days)
 */
export function clearOldSessions(
  days: number = 7,
  statePath: string = STATE_FILE,
): void {
  const state = readState(statePath)
  if (!state) {
    return
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const originalLength = state.sessions.length
  state.sessions = state.sessions.filter(s => new Date(s.lastActivity).getTime() > cutoff)

  if (state.sessions.length !== originalLength) {
    writeState(state, statePath)
  }
}

/**
 * Get cache state
 */
export function getCacheState(statePath: string = STATE_FILE): CacheState {
  const state = getState(statePath)
  return state.cache
}

/**
 * Update cache state
 */
export function updateCacheState(
  updates: Partial<CacheState>,
  statePath: string = STATE_FILE,
): void {
  updateState({ cache: updates as CacheState & Partial<CacheState> }, statePath)
}

/**
 * Record cache cleanup
 */
export function recordCacheCleanup(size: number, statePath: string = STATE_FILE): void {
  updateCacheState({
    lastCleanup: new Date().toISOString(),
    size,
  }, statePath)
}

/**
 * Get update state
 */
export function getUpdateState(statePath: string = STATE_FILE): UpdateState {
  const state = getState(statePath)
  return state.updates
}

/**
 * Update update state
 */
export function updateUpdateState(
  updates: Partial<UpdateState>,
  statePath: string = STATE_FILE,
): void {
  updateState({ updates: updates as UpdateState & Partial<UpdateState> }, statePath)
}

/**
 * Record update check
 */
export function recordUpdateCheck(
  currentVersion: string,
  latestVersion: string,
  updateAvailable: boolean,
  statePath: string = STATE_FILE,
): void {
  updateUpdateState({
    lastCheck: new Date().toISOString(),
    currentVersion,
    lastVersion: latestVersion,
    updateAvailable,
  }, statePath)
}

/**
 * Check if update check is needed (daily check)
 */
export function shouldCheckForUpdates(statePath: string = STATE_FILE): boolean {
  const state = readState(statePath)
  if (!state) {
    return true
  }

  const lastCheck = new Date(state.updates.lastCheck).getTime()
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

  return lastCheck < oneDayAgo
}

/**
 * Backup state file
 */
export function backupState(statePath: string = STATE_FILE): string | null {
  if (!exists(statePath)) {
    return null
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupPath = `${statePath}.backup.${timestamp}`

  try {
    const state = readState(statePath)
    if (state) {
      writeJsonConfig(backupPath, state, { pretty: true })
      return backupPath
    }
  }
  catch {
    // Ignore backup errors
  }

  return null
}

/**
 * Clean up old backup files
 */
export function cleanupOldBackups(
  keep: number = 5,
  statePath: string = STATE_FILE,
): void {
  const stateDir = CCJK_CONFIG_DIR
  const baseName = statePath.split('/').pop() || 'state.json'

  // This would require fs.readdir which we don't have in current utils
  // For now, manual cleanup is recommended
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Validate state structure
 */
export function validateState(state: unknown): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['State must be an object'] }
  }

  const s = state as Partial<RuntimeState>

  if (!s.version || typeof s.version !== 'string') {
    errors.push('Invalid or missing version')
  }

  if (!Array.isArray(s.sessions)) {
    errors.push('Invalid sessions array')
  }

  if (!s.cache || typeof s.cache !== 'object') {
    errors.push('Invalid or missing cache section')
  }

  if (!s.updates || typeof s.updates !== 'object') {
    errors.push('Invalid or missing updates section')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Ensure state directory exists
 */
export function ensureStateDir(): void {
  ensureDir(CCJK_CONFIG_DIR)
}

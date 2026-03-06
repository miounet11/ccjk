/**
 * Skills Cloud Synchronization Service
 *
 * Provides cloud synchronization functionality for SKILL.md files.
 * Handles upload, download, conflict detection, and resolution.
 *
 * @module services/cloud/skills-sync
 */

import type {
  SkillsApiClient,
} from '../../cloud-client/skills/index.js'
import type {
  CloudApiResponse,
  CloudSkill,
  CloudSkillMetadata,
  ListSkillsOptions,
  ListSkillsResponse,
  SkillSyncResult,
  SyncOptions,
  SyncResult,
  SyncState,
  SyncStateStorage,
  UploadSkillRequest,
} from '../../types/cloud-sync.js'
import type { SkillMdFile } from '../../types/skill-md.js'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { createGateway } from '../../cloud-client/gateway.js'

// ============================================================================
// Cloud API Client
// ============================================================================

import { createSkillsClient } from '../../cloud-client/skills/index.js'
import { CCJK_CONFIG_DIR, CCJK_SKILLS_DIR } from '../../constants.js'
import { writeFileAtomic } from '../../utils/fs-operations'

// ============================================================================
// Cloud Skills API
// ============================================================================

import { parseSkillMdFile } from '../../utils/skill-md/parser.js'

// ============================================================================
// Constants
// ============================================================================

const _CLOUD_API_BASE_URL = process.env.CCJK_CLOUD_API_URL || 'https://api.claudehome.cn/api/v1'
const SYNC_STATE_FILE = join(CCJK_CONFIG_DIR, 'skills-sync-state.json')
const DEFAULT_TIMEOUT = 30000 // 30 seconds

// ============================================================================
// Sync State Management
// ============================================================================

/**
 * Load sync state from disk
 */
export function loadSyncState(): SyncStateStorage {
  if (!existsSync(SYNC_STATE_FILE)) {
    return {
      version: '1.0.0',
      lastGlobalSync: new Date().toISOString(),
      skills: {},
    }
  }

  try {
    const content = readFileSync(SYNC_STATE_FILE, 'utf-8')
    return JSON.parse(content) as SyncStateStorage
  }
  catch (error) {
    console.warn('Failed to load sync state, using empty state:', error)
    return {
      version: '1.0.0',
      lastGlobalSync: new Date().toISOString(),
      skills: {},
    }
  }
}

/**
 * Save sync state to disk
 */
export function saveSyncState(state: SyncStateStorage): void {
  try {
    if (!existsSync(CCJK_CONFIG_DIR)) {
      mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
    }

    writeFileAtomic(SYNC_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
  }
  catch (error) {
    console.error('Failed to save sync state:', error)
    throw new Error(`Failed to save sync state: ${error}`)
  }
}

/**
 * Update sync state for a skill
 */
export function updateSyncState(
  skillId: string,
  localVersion: string,
  remoteVersion: string,
  localChecksum: string,
  remoteChecksum: string,
): void {
  const state = loadSyncState()

  // Determine sync status
  let status: SyncState['status'] = 'synced'
  if (localChecksum === remoteChecksum) {
    status = 'synced'
  }
  else if (!remoteChecksum) {
    status = 'local_only'
  }
  else if (!localChecksum) {
    status = 'remote_only'
  }
  else if (localVersion > remoteVersion) {
    status = 'local_ahead'
  }
  else if (remoteVersion > localVersion) {
    status = 'remote_ahead'
  }
  else {
    status = 'conflict'
  }

  state.skills[skillId] = {
    skillId,
    lastSyncTime: new Date().toISOString(),
    localVersion,
    remoteVersion,
    localChecksum,
    remoteChecksum,
    status,
  }

  state.lastGlobalSync = new Date().toISOString()
  saveSyncState(state)
}

// ============================================================================
// Local Skills Management
// ============================================================================

/**
 * Calculate checksum for skill content
 */
export function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Get all local skills
 */
export async function getLocalSkills(): Promise<SkillMdFile[]> {
  if (!existsSync(CCJK_SKILLS_DIR)) {
    return []
  }

  const skills: SkillMdFile[] = []
  const files = readdirSync(CCJK_SKILLS_DIR)

  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = join(CCJK_SKILLS_DIR, file)
      try {
        const skill = await parseSkillMdFile(filePath)
        skills.push(skill)
      }
      catch (error) {
        console.warn(`Failed to parse skill file ${file}:`, error)
      }
    }
  }

  return skills
}

/**
 * Get local skill by ID
 */
export async function getLocalSkill(skillId: string): Promise<SkillMdFile | null> {
  const filePath = join(CCJK_SKILLS_DIR, `${skillId}.md`)
  if (!existsSync(filePath)) {
    return null
  }

  try {
    return await parseSkillMdFile(filePath)
  }
  catch (error) {
    console.error(`Failed to parse skill ${skillId}:`, error)
    return null
  }
}

/**
 * Save skill to local storage
 */
export function saveLocalSkill(skillId: string, content: string): void {
  if (!existsSync(CCJK_SKILLS_DIR)) {
    mkdirSync(CCJK_SKILLS_DIR, { recursive: true })
  }

  const filePath = join(CCJK_SKILLS_DIR, `${skillId}.md`)
  writeFileAtomic(filePath, content, 'utf-8')
}

/**
 * Delete local skill
 */
export function deleteLocalSkill(skillId: string): void {
  const filePath = join(CCJK_SKILLS_DIR, `${skillId}.md`)
  if (existsSync(filePath)) {
    // Use trash for safe deletion
    import('trash').then(({ default: trash }) => {
      trash([filePath])
    }).catch(() => {
      // Fallback to direct deletion if trash is not available
      unlinkSync(filePath)
    })
  }
}

/**
 * Get authentication token from storage
 */
function getAuthToken(): string | null {
  const tokenFile = join(CCJK_CONFIG_DIR, 'cloud-token.json')
  if (!existsSync(tokenFile)) {
    return null
  }

  try {
    const content = readFileSync(tokenFile, 'utf-8')
    const data = JSON.parse(content)
    return data.deviceToken || null
  }
  catch {
    return null
  }
}

/**
 * Get or create skills API client
 */
let skillsClient: SkillsApiClient | null = null

function getSkillsClient(): SkillsApiClient {
  if (!skillsClient) {
    const token = getAuthToken()
    if (!token) {
      throw new Error('Not authenticated. Please bind device first using: npx ccjk notification bind')
    }

    const gateway = createGateway({
      authToken: token,
      timeout: DEFAULT_TIMEOUT,
    })
    skillsClient = createSkillsClient(gateway)
  }
  return skillsClient
}

/**
 * Reset skills client (for testing or token refresh)
 */
export function resetSkillsClient(): void {
  skillsClient = null
}

/**
 * List skills from cloud
 */
export async function listCloudSkills(
  options: ListSkillsOptions = {},
): Promise<CloudApiResponse<ListSkillsResponse>> {
  try {
    const client = getSkillsClient()
    const response = await client.list({
      privacy: options.privacy as any,
      author: options.author,
      tags: options.tags,
      query: options.query,
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy as any,
      sortDir: options.sortDir,
    })

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to list skills',
        code: response.code,
        timestamp: new Date().toISOString(),
      }
    }

    // Convert SkillListResponse to ListSkillsResponse
    const skills: CloudSkill[] = response.data.skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      version: skill.version,
      content: skill.content,
      metadata: skill.metadata as CloudSkillMetadata,
      privacy: skill.privacy as 'private' | 'team' | 'public',
      checksum: skill.checksum,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    }))

    return {
      success: true,
      data: {
        skills,
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
        totalPages: response.data.totalPages,
      },
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Get skill from cloud by ID
 */
export async function getCloudSkill(
  skillId: string,
  version?: string,
): Promise<CloudApiResponse<CloudSkill>> {
  try {
    const client = getSkillsClient()
    const response = await client.get({
      skillId,
      version,
    })

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to get skill',
        code: response.code,
        timestamp: new Date().toISOString(),
      }
    }

    // Convert SkillGetResponse to CloudSkill format
    const skill = response.data.skill
    return {
      success: true,
      data: {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        content: skill.content,
        checksum: skill.checksum,
        privacy: skill.privacy as 'private' | 'team' | 'public',
        metadata: skill.metadata as CloudSkillMetadata,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      } as CloudSkill,
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Upload skill to cloud
 */
export async function uploadSkill(
  request: UploadSkillRequest,
): Promise<CloudApiResponse<CloudSkill>> {
  try {
    const client = getSkillsClient()
    const response = await client.upload({
      name: request.name,
      version: request.version,
      content: request.content,
      metadata: request.metadata,
      privacy: request.privacy,
      checksum: request.checksum,
    })

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to upload skill',
        code: response.code,
        timestamp: new Date().toISOString(),
      }
    }

    // Convert SkillUploadResponse to CloudSkill format
    const skill = response.data.skill
    return {
      success: true,
      data: {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        content: skill.content,
        checksum: skill.checksum,
        privacy: skill.privacy as 'private' | 'team' | 'public',
        metadata: skill.metadata as CloudSkillMetadata,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      } as CloudSkill,
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Update skill in cloud
 */
export async function updateCloudSkill(
  skillId: string,
  request: Partial<UploadSkillRequest>,
): Promise<CloudApiResponse<CloudSkill>> {
  try {
    const client = getSkillsClient()
    const response = await client.update({
      skillId,
      version: request.version,
      content: request.content,
      metadata: request.metadata,
      privacy: request.privacy,
      checksum: request.checksum,
    })

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to update skill',
        code: response.code,
        timestamp: new Date().toISOString(),
      }
    }

    // Convert SkillUpdateResponse to CloudSkill format
    const skill = response.data.skill
    return {
      success: true,
      data: {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        content: skill.content,
        checksum: skill.checksum,
        privacy: skill.privacy as 'private' | 'team' | 'public',
        metadata: skill.metadata as CloudSkillMetadata,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      } as CloudSkill,
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Delete skill from cloud
 */
export async function deleteCloudSkill(
  skillId: string,
): Promise<CloudApiResponse<void>> {
  try {
    const client = getSkillsClient()
    const response = await client.delete({ skillId })

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to delete skill',
        code: response.code,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }
  }
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync a single skill
 */
export async function syncSkill(
  skillId: string,
  options: SyncOptions = {},
): Promise<SkillSyncResult> {
  try {
    // Get local skill
    const localSkill = await getLocalSkill(skillId)
    const localContent = localSkill
      ? readFileSync(join(CCJK_SKILLS_DIR, `${skillId}.md`), 'utf-8')
      : ''
    const localChecksum = localContent ? calculateChecksum(localContent) : ''
    const localVersion = localSkill?.metadata.version || ''

    // Get cloud skill
    const cloudResponse = await getCloudSkill(skillId)
    const cloudSkill = cloudResponse.success ? cloudResponse.data : null
    const remoteChecksum = cloudSkill?.checksum || ''
    const remoteVersion = cloudSkill?.version || ''

    // Get current sync state
    const syncState = loadSyncState()
    const previousState = syncState.skills[skillId]

    // Determine action based on state
    let action: SkillSyncResult['action'] = 'skipped'
    let newState: SyncState | undefined

    // Both exist - check for conflicts
    if (localSkill && cloudSkill) {
      if (localChecksum === remoteChecksum) {
        // Already synced
        action = 'skipped'
      }
      else if (options.force) {
        // Force upload
        if (!options.dryRun) {
          const uploadRequest: UploadSkillRequest = {
            name: localSkill.metadata.name,
            version: localSkill.metadata.version,
            content: localContent,
            metadata: {
              author: localSkill.metadata.author || 'unknown',
              description: localSkill.metadata.description,
              tags: localSkill.metadata.tags || [],
              category: localSkill.metadata.category,
            },
            privacy: 'private',
            checksum: localChecksum,
          }
          await updateCloudSkill(skillId, uploadRequest)
        }
        action = 'uploaded'
      }
      else {
        // Check conflict resolution strategy
        const resolution = options.conflictResolution || 'prompt'

        if (resolution === 'local') {
          // Upload local version
          if (!options.dryRun) {
            const uploadRequest: UploadSkillRequest = {
              name: localSkill.metadata.name,
              version: localSkill.metadata.version,
              content: localContent,
              metadata: {
                author: localSkill.metadata.author || 'unknown',
                description: localSkill.metadata.description,
                tags: localSkill.metadata.tags || [],
                category: localSkill.metadata.category,
              },
              privacy: 'private',
              checksum: localChecksum,
            }
            await updateCloudSkill(skillId, uploadRequest)
          }
          action = 'uploaded'
        }
        else if (resolution === 'remote') {
          // Download remote version
          if (!options.dryRun) {
            saveLocalSkill(skillId, cloudSkill.content)
          }
          action = 'downloaded'
        }
        else if (resolution === 'newer') {
          // Compare timestamps
          const localTime = localSkill.modifiedAt?.getTime() || 0
          const remoteTime = new Date(cloudSkill.updatedAt).getTime()

          if (localTime > remoteTime) {
            // Upload local version
            if (!options.dryRun) {
              const uploadRequest: UploadSkillRequest = {
                name: localSkill.metadata.name,
                version: localSkill.metadata.version,
                content: localContent,
                metadata: {
                  author: localSkill.metadata.author || 'unknown',
                  description: localSkill.metadata.description,
                  tags: localSkill.metadata.tags || [],
                  category: localSkill.metadata.category,
                },
                privacy: 'private',
                checksum: localChecksum,
              }
              await updateCloudSkill(skillId, uploadRequest)
            }
            action = 'uploaded'
          }
          else {
            // Download remote version
            if (!options.dryRun) {
              saveLocalSkill(skillId, cloudSkill.content)
            }
            action = 'downloaded'
          }
        }
        else {
          // Prompt - mark as conflict
          action = 'conflict'
        }
      }
    }
    // Only local exists - upload
    else if (localSkill && !cloudSkill) {
      if (!options.dryRun) {
        const uploadRequest: UploadSkillRequest = {
          name: localSkill.metadata.name,
          version: localSkill.metadata.version,
          content: localContent,
          metadata: {
            author: localSkill.metadata.author || 'unknown',
            description: localSkill.metadata.description,
            tags: localSkill.metadata.tags || [],
            category: localSkill.metadata.category,
          },
          privacy: 'private',
          checksum: localChecksum,
        }
        await uploadSkill(uploadRequest)
      }
      action = 'uploaded'
    }
    // Only remote exists - download
    else if (!localSkill && cloudSkill) {
      if (!options.dryRun) {
        saveLocalSkill(skillId, cloudSkill.content)
      }
      action = 'downloaded'
    }

    // Update sync state
    if (!options.dryRun && action !== 'conflict') {
      updateSyncState(skillId, localVersion, remoteVersion, localChecksum, remoteChecksum)
      newState = loadSyncState().skills[skillId]
    }

    return {
      skillId,
      skillName: localSkill?.metadata.name || cloudSkill?.name || skillId,
      success: true,
      action,
      previousState,
      newState,
    }
  }
  catch (error) {
    return {
      skillId,
      skillName: skillId,
      success: false,
      action: 'skipped',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Sync all skills
 */
export async function syncAllSkills(
  options: SyncOptions = {},
): Promise<SyncResult> {
  const startTime = Date.now()
  try {
    // Get all local skills
    const localSkills = await getLocalSkills()
    const localSkillIds = new Set(localSkills.map(s => s.metadata.name))

    // Get all cloud skills
    const cloudResponse = await listCloudSkills({ privacy: options.privacy })
    if (!cloudResponse.success) {
      throw new Error(cloudResponse.error || 'Failed to list cloud skills')
    }

    const cloudSkills = cloudResponse.data?.skills || []
    const cloudSkillIds = new Set(cloudSkills.map(s => s.id))

    // Combine all skill IDs
    const allSkillIds = new Set([...localSkillIds, ...cloudSkillIds])

    // Filter by options
    let skillIdsToSync = Array.from(allSkillIds)
    if (options.skillIds && options.skillIds.length > 0) {
      skillIdsToSync = skillIdsToSync.filter(id => options.skillIds!.includes(id))
    }

    // Sync each skill
    const results: SkillSyncResult[] = []
    for (const skillId of skillIdsToSync) {
      const result = await syncSkill(skillId, options)
      results.push(result)
    }

    // Calculate statistics
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const conflicts = results.filter(r => r.action === 'conflict').length
    const uploaded = results.filter(r => r.action === 'uploaded').length
    const downloaded = results.filter(r => r.action === 'downloaded').length
    const skipped = results.filter(r => r.action === 'skipped').length

    return {
      success: failed === 0,
      total: results.length,
      succeeded,
      failed,
      conflicts,
      uploaded,
      downloaded,
      skipped,
      results,
      durationMs: Date.now() - startTime,
    }
  }
  catch (error) {
    return {
      success: false,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Push local skills to cloud
 */
export async function pushSkills(
  skillIds?: string[],
  options: SyncOptions = {},
): Promise<SyncResult> {
  return syncAllSkills({
    ...options,
    skillIds,
    conflictResolution: options.conflictResolution || 'local',
  })
}

/**
 * Pull skills from cloud
 */
export async function pullSkills(
  skillIds?: string[],
  options: SyncOptions = {},
): Promise<SyncResult> {
  return syncAllSkills({
    ...options,
    skillIds,
    conflictResolution: options.conflictResolution || 'remote',
  })
}

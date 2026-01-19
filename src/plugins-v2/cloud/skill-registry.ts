/**
 * CCJK Plugin System 2.0 - Cloud Skill Registry
 *
 * Manages cloud-based skill synchronization with:
 * - Fetching available skills from cloud API
 * - Searching and filtering skills
 * - Downloading and installing skills
 * - Checking for skill updates
 * - Local cache management
 *
 * @module plugins-v2/cloud/skill-registry
 */

import type {
  InstallOptions,
  InstallResult,
  LocalizedString,
  Permission,
  PluginCategory,
  PluginManifest,
  PluginPackage,
  SearchOptions,
  UpdateInfo,
} from '../types'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { CCJK_CLOUD_PLUGINS_API } from '../../constants'

// ============================================================================
// Constants
// ============================================================================

const SKILLS_CACHE_DIR = join(homedir(), '.ccjk', 'skills-cache')
const SKILLS_CACHE_FILE = join(SKILLS_CACHE_DIR, 'registry.json')
const SKILLS_INSTALL_DIR = join(homedir(), '.ccjk', 'skills')

/** Cache TTL: 24 hours */
const CACHE_TTL = 24 * 60 * 60 * 1000

/** Request timeout: 30 seconds */
const REQUEST_TIMEOUT = 30000

/** Max retry attempts */
const MAX_RETRIES = 3

/** Retry delay: 1 second */
const RETRY_DELAY = 1000

// ============================================================================
// Types
// ============================================================================

/**
 * Cloud skill definition from API
 */
export interface CloudSkill {
  /** Unique skill ID */
  id: string
  /** Localized skill name */
  name: LocalizedString
  /** Localized skill description */
  description: LocalizedString
  /** Skill version (semver) */
  version: string
  /** Skill author */
  author: string
  /** Skill category */
  category: PluginCategory
  /** Search tags */
  tags: string[]
  /** Required permissions */
  permissions: Permission[]
  /** Download count */
  downloads: number
  /** Average rating (0-5) */
  rating: number
  /** File size in bytes */
  size: number
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
  /** Download URL */
  downloadUrl?: string
  /** SHA256 checksum */
  checksum?: string
  /** Dependencies on other skills */
  dependencies?: string[]
  /** Minimum CCJK version */
  minCcjkVersion?: string
  /** Skill content (for inline skills) */
  content?: string
}

/**
 * Skill registry cache structure
 */
export interface SkillRegistryCache {
  /** Cache version */
  version: string
  /** Cached skills */
  skills: CloudSkill[]
  /** Cache creation timestamp */
  createdAt: string
  /** Cache expiration timestamp */
  expiresAt: string
  /** Last update timestamp */
  lastUpdated: string
  /** Total skills count */
  totalSkills: number
}

/**
 * Skill search result
 */
export interface SkillSearchResult {
  /** Matching skills */
  skills: CloudSkill[]
  /** Total count (for pagination) */
  total: number
  /** Current page */
  page: number
  /** Page size */
  pageSize: number
}

/**
 * Skill download result
 */
export interface SkillDownloadResult {
  /** Skill ID */
  skillId: string
  /** Skill content */
  content: string
  /** SHA256 checksum */
  checksum: string
  /** Download timestamp */
  downloadedAt: string
}

/**
 * Cloud API response wrapper
 */
export interface CloudApiResponse<T> {
  /** Whether request succeeded */
  success: boolean
  /** Response data */
  data?: T
  /** Error message */
  error?: string
  /** Error code */
  code?: string
  /** Response timestamp */
  timestamp?: string
  /** Pagination metadata */
  meta?: {
    total?: number
    page?: number
    pageSize?: number
  }
}

/**
 * Registry options
 */
export interface SkillRegistryOptions {
  /** Base API URL */
  apiUrl?: string
  /** API key for authentication */
  apiKey?: string
  /** Request timeout in ms */
  timeout?: number
  /** Enable offline mode */
  offlineMode?: boolean
  /** Enable debug logging */
  enableLogging?: boolean
  /** Custom cache directory */
  cacheDir?: string
  /** Custom install directory */
  installDir?: string
}

// ============================================================================
// Skill Registry Class
// ============================================================================

/**
 * SkillRegistry - Cloud skill management
 *
 * Provides unified interface for:
 * - Fetching skills from cloud API
 * - Searching and filtering skills
 * - Downloading and installing skills
 * - Checking for updates
 * - Managing local cache
 *
 * @example
 * ```typescript
 * const registry = new SkillRegistry()
 * await registry.initialize()
 *
 * // Search for skills
 * const results = await registry.search({ query: 'git', category: 'development' })
 *
 * // Install a skill
 * const result = await registry.install('git-workflow-pro')
 *
 * // Check for updates
 * const updates = await registry.checkUpdates()
 * ```
 */
export class SkillRegistry {
  private apiUrl: string
  private apiKey?: string
  private timeout: number
  private offlineMode: boolean
  private enableLogging: boolean
  private cacheDir: string
  private installDir: string
  private cache: SkillRegistryCache | null = null
  private initialized = false

  constructor(options: SkillRegistryOptions = {}) {
    this.apiUrl = options.apiUrl || CCJK_CLOUD_PLUGINS_API
    this.apiKey = options.apiKey
    this.timeout = options.timeout || REQUEST_TIMEOUT
    this.offlineMode = options.offlineMode || false
    this.enableLogging = options.enableLogging || false
    this.cacheDir = options.cacheDir || SKILLS_CACHE_DIR
    this.installDir = options.installDir || SKILLS_INSTALL_DIR
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the skill registry
   */
  async initialize(): Promise<void> {
    if (this.initialized)
      return

    this.ensureDirectories()
    this.loadCache()

    // Refresh cache if expired
    if (this.isCacheExpired()) {
      await this.refreshCache()
    }

    this.initialized = true
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    for (const dir of [this.cacheDir, this.installDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  // ==========================================================================
  // Skill Listing & Search
  // ==========================================================================

  /**
   * Get all available skills from cloud
   *
   * @param forceRefresh - Force refresh from cloud
   * @returns List of available skills
   */
  async getAvailableSkills(forceRefresh = false): Promise<CloudSkill[]> {
    if (forceRefresh || this.isCacheExpired()) {
      await this.refreshCache()
    }

    return this.cache?.skills || []
  }

  /**
   * Search for skills
   *
   * @param options - Search options
   * @returns Search results with pagination
   */
  async search(options: SearchOptions = {}): Promise<SkillSearchResult> {
    this.log('Searching skills with options:', options)

    // Try cloud search first if online
    if (!this.offlineMode) {
      try {
        const cloudResult = await this.cloudSearch(options)
        if (cloudResult.success && cloudResult.data) {
          return {
            skills: cloudResult.data,
            total: cloudResult.meta?.total || cloudResult.data.length,
            page: options.page || 1,
            pageSize: options.pageSize || 20,
          }
        }
      }
      catch (error) {
        this.log('Cloud search failed, falling back to cache:', error)
      }
    }

    // Fallback to local cache search
    return this.localSearch(options)
  }

  /**
   * Search skills via cloud API
   */
  private async cloudSearch(options: SearchOptions): Promise<CloudApiResponse<CloudSkill[]>> {
    const params = new URLSearchParams()

    if (options.query)
      params.append('q', options.query)
    if (options.category)
      params.append('category', options.category)
    if (options.tags?.length)
      params.append('tags', options.tags.join(','))
    if (options.sortBy)
      params.append('sortBy', options.sortBy)
    if (options.order)
      params.append('order', options.order)
    if (options.page)
      params.append('page', String(options.page))
    if (options.pageSize)
      params.append('pageSize', String(options.pageSize))

    const url = `${this.apiUrl}/skills?${params.toString()}`
    return this.request<CloudSkill[]>(url)
  }

  /**
   * Search skills in local cache
   */
  private localSearch(options: SearchOptions): SkillSearchResult {
    let skills = this.cache?.skills || []

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase()
      skills = skills.filter(s =>
        s.name.en.toLowerCase().includes(query)
        || s.name['zh-CN'].toLowerCase().includes(query)
        || s.description.en.toLowerCase().includes(query)
        || s.description['zh-CN'].toLowerCase().includes(query)
        || s.tags.some(t => t.toLowerCase().includes(query)),
      )
    }

    // Filter by category
    if (options.category) {
      skills = skills.filter(s => s.category === options.category)
    }

    // Filter by tags
    if (options.tags?.length) {
      skills = skills.filter(s =>
        options.tags!.some(tag => s.tags.includes(tag)),
      )
    }

    // Sort
    if (options.sortBy) {
      const order = options.order === 'asc' ? 1 : -1
      skills = [...skills].sort((a, b) => {
        switch (options.sortBy) {
          case 'downloads':
            return (a.downloads - b.downloads) * order
          case 'rating':
            return (a.rating - b.rating) * order
          case 'updated':
            return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order
          case 'name':
            return a.name.en.localeCompare(b.name.en) * order
          default:
            return 0
        }
      })
    }

    // Pagination
    const page = options.page || 1
    const pageSize = options.pageSize || 20
    const start = (page - 1) * pageSize
    const paged = skills.slice(start, start + pageSize)

    return {
      skills: paged,
      total: skills.length,
      page,
      pageSize,
    }
  }

  // ==========================================================================
  // Skill Details
  // ==========================================================================

  /**
   * Get detailed information about a skill
   *
   * @param skillId - Skill ID
   * @returns Skill details or null if not found
   */
  async getSkillDetails(skillId: string): Promise<CloudSkill | null> {
    this.log('Getting skill details:', skillId)

    // Try cloud first
    if (!this.offlineMode) {
      try {
        const result = await this.request<CloudSkill>(`${this.apiUrl}/skills/${skillId}`)
        if (result.success && result.data) {
          return result.data
        }
      }
      catch (error) {
        this.log('Cloud fetch failed, checking cache:', error)
      }
    }

    // Fallback to cache
    return this.cache?.skills.find(s => s.id === skillId) || null
  }

  /**
   * Get popular skills
   *
   * @param limit - Maximum number of skills to return
   * @returns Popular skills sorted by downloads
   */
  async getPopularSkills(limit = 10): Promise<CloudSkill[]> {
    const skills = await this.getAvailableSkills()
    return [...skills]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit)
  }

  /**
   * Get recently updated skills
   *
   * @param limit - Maximum number of skills to return
   * @returns Recently updated skills
   */
  async getRecentSkills(limit = 10): Promise<CloudSkill[]> {
    const skills = await this.getAvailableSkills()
    return [...skills]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
  }

  /**
   * Get skills by category
   *
   * @param category - Skill category
   * @returns Skills in the specified category
   */
  async getSkillsByCategory(category: PluginCategory): Promise<CloudSkill[]> {
    const skills = await this.getAvailableSkills()
    return skills.filter(s => s.category === category)
  }

  // ==========================================================================
  // Skill Installation
  // ==========================================================================

  /**
   * Download and install a skill
   *
   * @param skillId - Skill ID to install
   * @param options - Installation options
   * @returns Installation result
   */
  async install(skillId: string, options: InstallOptions = {}): Promise<InstallResult> {
    this.log('Installing skill:', skillId)

    const targetDir = join(this.installDir, skillId)

    // Check if already installed
    if (existsSync(targetDir) && !options.force) {
      return {
        success: false,
        pluginId: skillId,
        error: 'Skill already installed. Use force option to reinstall.',
      }
    }

    try {
      // Get skill details
      const skill = await this.getSkillDetails(skillId)
      if (!skill) {
        return {
          success: false,
          pluginId: skillId,
          error: 'Skill not found',
        }
      }

      // Download skill content
      const downloadResult = await this.downloadSkill(skillId)
      if (!downloadResult) {
        return {
          success: false,
          pluginId: skillId,
          error: 'Failed to download skill',
        }
      }

      // Create install directory
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true })
      }
      mkdirSync(targetDir, { recursive: true })

      // Generate plugin manifest
      const manifest = this.generateManifest(skill)
      writeFileSync(
        join(targetDir, 'plugin.json'),
        JSON.stringify(manifest, null, 2),
      )

      // Save skill content
      writeFileSync(
        join(targetDir, 'SKILL.md'),
        downloadResult.content,
      )

      // Install dependencies if needed
      const installedDeps: string[] = []
      if (!options.skipDependencies && skill.dependencies?.length) {
        for (const dep of skill.dependencies) {
          const depResult = await this.install(dep, { skipDependencies: true })
          if (depResult.success) {
            installedDeps.push(dep)
          }
        }
      }

      this.log('Skill installed successfully:', skillId)

      return {
        success: true,
        pluginId: skillId,
        version: skill.version,
        path: targetDir,
        dependencies: installedDeps,
      }
    }
    catch (error) {
      this.log('Installation failed:', error)

      // Cleanup on failure
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true })
      }

      return {
        success: false,
        pluginId: skillId,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Download skill content
   *
   * @param skillId - Skill ID
   * @returns Download result or null on failure
   */
  async downloadSkill(skillId: string): Promise<SkillDownloadResult | null> {
    this.log('Downloading skill:', skillId)

    try {
      const result = await this.request<SkillDownloadResult>(
        `${this.apiUrl}/skills/${skillId}/download`,
      )

      if (result.success && result.data) {
        return result.data
      }

      // Fallback: check if skill has inline content
      const skill = await this.getSkillDetails(skillId)
      if (skill?.content) {
        return {
          skillId,
          content: skill.content,
          checksum: '',
          downloadedAt: new Date().toISOString(),
        }
      }

      return null
    }
    catch (error) {
      this.log('Download failed:', error)
      return null
    }
  }

  /**
   * Uninstall a skill
   *
   * @param skillId - Skill ID to uninstall
   * @returns True if uninstalled successfully
   */
  async uninstall(skillId: string): Promise<boolean> {
    const targetDir = join(this.installDir, skillId)

    if (!existsSync(targetDir)) {
      return false
    }

    try {
      rmSync(targetDir, { recursive: true })
      this.log('Skill uninstalled:', skillId)
      return true
    }
    catch (error) {
      this.log('Uninstall failed:', error)
      return false
    }
  }

  /**
   * Get installed skills
   *
   * @returns List of installed skill IDs
   */
  getInstalledSkills(): string[] {
    if (!existsSync(this.installDir)) {
      return []
    }

    return readdirSync(this.installDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  }

  /**
   * Check if a skill is installed
   *
   * @param skillId - Skill ID
   * @returns True if installed
   */
  isInstalled(skillId: string): boolean {
    return existsSync(join(this.installDir, skillId, 'plugin.json'))
  }

  /**
   * Get installed skill as PluginPackage
   *
   * @param skillId - Skill ID
   * @returns PluginPackage or null if not installed
   */
  getInstalledSkill(skillId: string): PluginPackage | null {
    const targetDir = join(this.installDir, skillId)
    const manifestPath = join(targetDir, 'plugin.json')

    if (!existsSync(manifestPath)) {
      return null
    }

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PluginManifest
      const skillPath = join(targetDir, 'SKILL.md')
      const skillContent = existsSync(skillPath) ? readFileSync(skillPath, 'utf-8') : undefined

      return {
        manifest,
        skill: skillContent
          ? {
              title: manifest.name.en,
              description: manifest.description.en,
              applicability: { taskTypes: [] },
              sections: [],
              rawContent: skillContent,
            }
          : undefined,
        source: { type: 'local', path: targetDir },
      }
    }
    catch {
      return null
    }
  }

  // ==========================================================================
  // Update Management
  // ==========================================================================

  /**
   * Check for skill updates
   *
   * @param skillIds - Specific skill IDs to check (optional, checks all if not provided)
   * @returns List of available updates
   */
  async checkUpdates(skillIds?: string[]): Promise<UpdateInfo[]> {
    const installed = skillIds || this.getInstalledSkills()
    const updates: UpdateInfo[] = []

    for (const skillId of installed) {
      const installedSkill = this.getInstalledSkill(skillId)
      if (!installedSkill)
        continue

      const cloudSkill = await this.getSkillDetails(skillId)
      if (!cloudSkill)
        continue

      const currentVersion = installedSkill.manifest.version
      const latestVersion = cloudSkill.version

      updates.push({
        pluginId: skillId,
        currentVersion,
        latestVersion,
        hasUpdate: this.isNewerVersion(latestVersion, currentVersion),
        changelog: undefined, // Could be fetched from API if available
      })
    }

    return updates
  }

  /**
   * Update a skill to the latest version
   *
   * @param skillId - Skill ID to update
   * @returns Installation result
   */
  async update(skillId: string): Promise<InstallResult> {
    return this.install(skillId, { force: true })
  }

  /**
   * Update all installed skills
   *
   * @returns List of update results
   */
  async updateAll(): Promise<InstallResult[]> {
    const updates = await this.checkUpdates()
    const results: InstallResult[] = []

    for (const update of updates) {
      if (update.hasUpdate) {
        const result = await this.update(update.pluginId)
        results.push(result)
      }
    }

    return results
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Load cache from disk
   */
  private loadCache(): void {
    try {
      if (!existsSync(SKILLS_CACHE_FILE)) {
        return
      }

      const content = readFileSync(SKILLS_CACHE_FILE, 'utf-8')
      this.cache = JSON.parse(content) as SkillRegistryCache
    }
    catch (error) {
      this.log('Failed to load cache:', error)
      this.cache = null
    }
  }

  /**
   * Save cache to disk
   */
  private saveCache(): void {
    try {
      this.ensureDirectories()
      writeFileSync(SKILLS_CACHE_FILE, JSON.stringify(this.cache, null, 2))
    }
    catch (error) {
      this.log('Failed to save cache:', error)
    }
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(): boolean {
    if (!this.cache) {
      return true
    }

    const expiresAt = new Date(this.cache.expiresAt).getTime()
    return Date.now() >= expiresAt
  }

  /**
   * Refresh cache from cloud
   */
  async refreshCache(): Promise<void> {
    if (this.offlineMode) {
      this.log('Offline mode, skipping cache refresh')
      return
    }

    this.log('Refreshing skill cache from cloud')

    try {
      const result = await this.request<CloudSkill[]>(`${this.apiUrl}/skills`)

      if (result.success && result.data) {
        const now = new Date().toISOString()
        const expiresAt = new Date(Date.now() + CACHE_TTL).toISOString()

        this.cache = {
          version: '1.0.0',
          skills: result.data,
          createdAt: this.cache?.createdAt || now,
          expiresAt,
          lastUpdated: now,
          totalSkills: result.data.length,
        }

        this.saveCache()
        this.log('Cache refreshed with', result.data.length, 'skills')
      }
    }
    catch (error) {
      this.log('Failed to refresh cache:', error)
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = null
    if (existsSync(SKILLS_CACHE_FILE)) {
      rmSync(SKILLS_CACHE_FILE)
    }
    this.log('Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalSkills: number
    lastUpdated: string | null
    expiresAt: string | null
    isExpired: boolean
  } {
    return {
      totalSkills: this.cache?.totalSkills || 0,
      lastUpdated: this.cache?.lastUpdated || null,
      expiresAt: this.cache?.expiresAt || null,
      isExpired: this.isCacheExpired(),
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(url: string, options: RequestInit = {}): Promise<CloudApiResponse<T>> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CCJK-SkillRegistry/2.0',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            ...options.headers,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data = await response.json() as CloudApiResponse<T>

        if (!response.ok) {
          return {
            success: false,
            error: data.error || `HTTP ${response.status}`,
            code: data.code || `HTTP_${response.status}`,
          }
        }

        return {
          ...data,
          success: true,
          timestamp: new Date().toISOString(),
        }
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.log(`Request failed (attempt ${attempt}):`, lastError.message)

        if (lastError.name === 'AbortError') {
          break
        }

        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY * attempt)
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed',
      code: 'REQUEST_FAILED',
    }
  }

  /**
   * Generate plugin manifest from cloud skill
   */
  private generateManifest(skill: CloudSkill): PluginManifest {
    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      version: skill.version,
      author: { name: skill.author },
      category: skill.category,
      tags: skill.tags,
      permissions: skill.permissions,
      dependencies: skill.dependencies,
      minCcjkVersion: skill.minCcjkVersion,
      formatVersion: '2.0',
    }
  }

  /**
   * Compare versions (simple semver comparison)
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number)
    const currentParts = current.split('.').map(Number)

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0
      const c = currentParts[i] || 0
      if (l > c)
        return true
      if (l < c)
        return false
    }

    return false
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Log message if logging is enabled
   */
  private log(...args: any[]): void {
    if (this.enableLogging) {
      console.log('[SkillRegistry]', ...args)
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set offline mode
   */
  setOfflineMode(enabled: boolean): void {
    this.offlineMode = enabled
    this.log('Offline mode:', enabled ? 'enabled' : 'disabled')
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Get API URL
   */
  getApiUrl(): string {
    return this.apiUrl
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: SkillRegistry | null = null

/**
 * Get the singleton SkillRegistry instance
 */
export async function getSkillRegistry(): Promise<SkillRegistry> {
  if (!registryInstance) {
    registryInstance = new SkillRegistry()
    await registryInstance.initialize()
  }
  return registryInstance
}

/**
 * Reset the registry instance (for testing)
 */
export function resetSkillRegistry(): void {
  registryInstance = null
}

/**
 * Create a new SkillRegistry instance with custom options
 */
export function createSkillRegistry(options: SkillRegistryOptions): SkillRegistry {
  return new SkillRegistry(options)
}

/**
 * CCJK CLAUDE.md Cloud Sync Service
 *
 * Provides cloud synchronization functionality for CLAUDE.md files,
 * including template marketplace, version history, and multi-project sharing.
 *
 * @module services/cloud/claude-md-sync
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { writeFileAtomic } from '../../utils/fs-operations'

// ============================================================================
// Constants
// ============================================================================

const CLOUD_API_BASE_URL = 'https://api.claudehome.cn'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const TEMPLATES_FILE = join(process.cwd(), 'src', 'data', 'claude-md-templates.json')
const CACHE_DIR = join(homedir(), '.ccjk', 'claude-md-cache')
/** Cache file path for templates */
export const CACHE_FILE = join(CACHE_DIR, 'templates-cache.json')
/** Cache TTL in milliseconds (24 hours) */
export const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// ============================================================================
// Types
// ============================================================================

/**
 * Cloud CLAUDE.md configuration
 */
export interface CloudClaudeMd {
  /** Unique identifier */
  id: string
  /** Configuration name */
  name: string
  /** Project type */
  projectType: string
  /** CLAUDE.md content */
  content: string
  /** Metadata */
  metadata: {
    author: string
    description: string
    tags: string[]
    createdAt: string
    updatedAt: string
    usageCount: number
    rating: number
  }
  /** Privacy level */
  privacy: 'private' | 'team' | 'public'
  /** Whether this is a template */
  template: boolean
}

/**
 * CLAUDE.md template
 */
export interface ClaudeMdTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Category */
  category: string
  /** Description */
  description: string
  /** Template content */
  content: string
  /** Replaceable variables */
  variables: string[]
  /** Tags for searching */
  tags?: string[]
}

/**
 * Template category
 */
export interface TemplateCategory {
  /** Category ID */
  id: string
  /** Category name */
  name: string
  /** Description */
  description: string
}

/**
 * Template list options
 */
export interface ListTemplatesOptions {
  /** Filter by category */
  category?: string
  /** Search keyword */
  keyword?: string
  /** Tags to filter */
  tags?: string[]
}

/**
 * Apply template result
 */
export interface ApplyTemplateResult {
  /** Success status */
  success: boolean
  /** Generated content */
  content?: string
  /** File path if written */
  filePath?: string
  /** Error message */
  error?: string
}

/**
 * Upload result
 */
export interface UploadResult {
  /** Success status */
  success: boolean
  /** Cloud config ID */
  id?: string
  /** Error message */
  error?: string
}

/**
 * Download result
 */
export interface DownloadResult {
  /** Success status */
  success: boolean
  /** Downloaded content */
  content?: string
  /** File path if written */
  filePath?: string
  /** Error message */
  error?: string
}

/**
 * Version info
 */
export interface VersionInfo {
  /** Version ID */
  id: string
  /** Timestamp */
  timestamp: string
  /** Commit message */
  message: string
  /** Content snapshot */
  content: string
}

/**
 * Parsed CLAUDE.md structure
 */
export interface ParsedClaudeMd {
  /** Document title */
  title?: string
  /** Last updated timestamp */
  lastUpdated?: string
  /** Sections */
  sections: Array<{
    heading: string
    level: number
    content: string
  }>
  /** Raw content */
  raw: string
}

/**
 * Cloud API response
 */
export interface CloudApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// ============================================================================
// ClaudeMdSyncService Class
// ============================================================================

/**
 * CLAUDE.md Cloud Sync Service
 *
 * Manages CLAUDE.md templates, cloud synchronization, and version history.
 *
 * @example
 * ```typescript
 * const service = new ClaudeMdSyncService()
 *
 * // List templates
 * const templates = await service.listTemplates({ category: 'backend' })
 *
 * // Apply template
 * await service.applyTemplateToProject('nodejs-express', '/path/to/project', {
 *   projectName: 'my-api',
 *   author: 'John Doe'
 * })
 *
 * // Upload to cloud
 * await service.uploadClaudeMd('/path/to/CLAUDE.md', {
 *   name: 'My Config',
 *   projectType: 'nodejs',
 *   privacy: 'private'
 * })
 * ```
 */
export class ClaudeMdSyncService {
  private baseUrl: string
  private deviceToken: string | null = null

  /**
   * Create a new ClaudeMdSyncService instance
   *
   * @param baseUrl - Cloud API base URL
   */
  constructor(baseUrl: string = CLOUD_API_BASE_URL) {
    this.baseUrl = baseUrl
    this.loadDeviceToken()
  }

  // ==========================================================================
  // Template Management
  // ==========================================================================

  /**
   * List available templates
   *
   * @param options - Filter options
   * @returns Array of templates
   */
  async listTemplates(options: ListTemplatesOptions = {}): Promise<ClaudeMdTemplate[]> {
    try {
      const data = this.loadTemplatesData()
      let templates = data.templates

      // Filter by category
      if (options.category) {
        templates = templates.filter(t => t.category === options.category)
      }

      // Filter by keyword
      if (options.keyword) {
        const keyword = options.keyword.toLowerCase()
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(keyword)
          || t.description.toLowerCase().includes(keyword)
          || t.tags?.some(tag => tag.toLowerCase().includes(keyword)),
        )
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        templates = templates.filter(t =>
          options.tags!.some(tag => t.tags?.includes(tag)),
        )
      }

      return templates
    }
    catch (error) {
      console.error('Failed to list templates:', error)
      return []
    }
  }

  /**
   * Get template categories
   *
   * @returns Array of categories
   */
  async listCategories(): Promise<TemplateCategory[]> {
    try {
      const data = this.loadTemplatesData()
      return data.categories || []
    }
    catch (error) {
      console.error('Failed to list categories:', error)
      return []
    }
  }

  /**
   * Search templates by keyword
   *
   * @param keyword - Search keyword
   * @returns Matching templates
   */
  async searchTemplates(keyword: string): Promise<ClaudeMdTemplate[]> {
    return this.listTemplates({ keyword })
  }

  /**
   * Get template by ID
   *
   * @param templateId - Template ID
   * @returns Template or null
   */
  async getTemplate(templateId: string): Promise<ClaudeMdTemplate | null> {
    try {
      const data = this.loadTemplatesData()
      return data.templates.find(t => t.id === templateId) || null
    }
    catch (error) {
      console.error('Failed to get template:', error)
      return null
    }
  }

  // ==========================================================================
  // Template Application
  // ==========================================================================

  /**
   * Apply template with variable replacement
   *
   * @param templateId - Template ID
   * @param variables - Variable values
   * @returns Apply result with content
   */
  async applyTemplate(
    templateId: string,
    variables: Record<string, string> = {},
  ): Promise<ApplyTemplateResult> {
    try {
      const template = await this.getTemplate(templateId)
      if (!template) {
        return {
          success: false,
          error: `Template not found: ${templateId}`,
        }
      }

      // Add default variables
      const allVariables = {
        TIMESTAMP: new Date().toISOString().split('T')[0],
        PROJECT_NAME: 'My Project',
        AUTHOR: 'Unknown',
        DESCRIPTION: 'Project description',
        PORT: '3000',
        TECH_STACK: 'Technology stack',
        ...variables,
      }

      // Replace variables in content
      let content = template.content
      for (const [key, value] of Object.entries(allVariables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        content = content.replace(regex, value)
      }

      return {
        success: true,
        content,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Apply template to project directory
   *
   * @param templateId - Template ID
   * @param projectPath - Project directory path
   * @param variables - Variable values
   * @returns Apply result with file path
   */
  async applyTemplateToProject(
    templateId: string,
    projectPath: string,
    variables: Record<string, string> = {},
  ): Promise<ApplyTemplateResult> {
    try {
      const result = await this.applyTemplate(templateId, variables)
      if (!result.success || !result.content) {
        return result
      }

      // Write to CLAUDE.md file
      const filePath = join(projectPath, 'CLAUDE.md')
      writeFileAtomic(filePath, result.content, 'utf-8')

      return {
        success: true,
        content: result.content,
        filePath,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // ==========================================================================
  // Cloud Sync
  // ==========================================================================

  /**
   * Upload CLAUDE.md to cloud
   *
   * @param filePath - Path to CLAUDE.md file
   * @param metadata - Configuration metadata
   * @param metadata.name - Configuration name
   * @param metadata.projectType - Project type identifier
   * @param metadata.privacy - Privacy level for the upload
   * @param metadata.description - Optional description
   * @param metadata.tags - Optional tags for categorization
   * @returns Upload result
   */
  async uploadClaudeMd(
    filePath: string,
    metadata: {
      name: string
      projectType: string
      privacy: 'private' | 'team' | 'public'
      description?: string
      tags?: string[]
    },
  ): Promise<UploadResult> {
    try {
      // Read file content
      if (!existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        }
      }

      const content = readFileSync(filePath, 'utf-8')

      // Upload to cloud
      const response = await this.request<{ id: string }>('/claude-md/upload', {
        method: 'POST',
        body: JSON.stringify({
          content,
          name: metadata.name,
          projectType: metadata.projectType,
          privacy: metadata.privacy,
          description: metadata.description || '',
          tags: metadata.tags || [],
        }),
      })

      if (response.success && response.data) {
        return {
          success: true,
          id: response.data.id,
        }
      }

      return {
        success: false,
        error: response.error || 'Upload failed',
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Download CLAUDE.md from cloud
   *
   * @param configId - Cloud config ID
   * @param projectPath - Project directory path
   * @returns Download result
   */
  async downloadClaudeMd(
    configId: string,
    projectPath: string,
  ): Promise<DownloadResult> {
    try {
      const response = await this.request<{ content: string }>(
        `/claude-md/download/${configId}`,
        { method: 'GET' },
      )

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Download failed',
        }
      }

      // Write to file
      const filePath = join(projectPath, 'CLAUDE.md')
      writeFileAtomic(filePath, response.data.content, 'utf-8')

      return {
        success: true,
        content: response.data.content,
        filePath,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * List user's cloud configs
   *
   * @returns Array of cloud configs
   */
  async listCloudConfigs(): Promise<CloudClaudeMd[]> {
    try {
      const response = await this.request<{ configs: CloudClaudeMd[] }>(
        '/claude-md/list',
        { method: 'GET' },
      )

      if (response.success && response.data) {
        return response.data.configs
      }

      return []
    }
    catch (error) {
      console.error('Failed to list cloud configs:', error)
      return []
    }
  }

  /**
   * Delete cloud config
   *
   * @param configId - Config ID to delete
   * @returns Success status
   */
  async deleteCloudConfig(configId: string): Promise<{ success: boolean, error?: string }> {
    try {
      const response = await this.request(`/claude-md/delete/${configId}`, {
        method: 'DELETE',
      })

      return {
        success: response.success,
        error: response.error,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // ==========================================================================
  // CLAUDE.md Parsing and Merging
  // ==========================================================================

  /**
   * Parse CLAUDE.md content
   *
   * @param content - CLAUDE.md content
   * @returns Parsed structure
   */
  parseClaudeMd(content: string): ParsedClaudeMd {
    const lines = content.split('\n')
    const sections: ParsedClaudeMd['sections'] = []
    let title: string | undefined
    let lastUpdated: string | undefined

    let currentSection: { heading: string, level: number, content: string } | null = null

    for (const line of lines) {
      // Extract title (first # heading)
      if (!title && line.startsWith('# ')) {
        title = line.substring(2).trim()
        continue
      }

      // Extract last updated
      if (line.includes('**Last Updated**:')) {
        lastUpdated = line.split('**Last Updated**:')[1]?.trim()
        continue
      }

      // Detect section headings
      const headingMatch = line.match(/^(#{1,6})\s+(\S.*)$/)
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection)
        }

        // Start new section
        currentSection = {
          heading: headingMatch[2].trim(),
          level: headingMatch[1].length,
          content: '',
        }
      }
      else if (currentSection) {
        // Add content to current section
        currentSection.content += `${line}\n`
      }
    }

    // Save last section
    if (currentSection) {
      sections.push(currentSection)
    }

    return {
      title,
      lastUpdated,
      sections,
      raw: content,
    }
  }

  /**
   * Merge two CLAUDE.md contents
   *
   * @param baseContent - Base content
   * @param updateContent - Update content
   * @returns Merged content
   */
  mergeClaudeMd(baseContent: string, updateContent: string): string {
    const base = this.parseClaudeMd(baseContent)
    const update = this.parseClaudeMd(updateContent)

    // Use update title if available
    const title = update.title || base.title || 'Project'

    // Merge sections
    const sectionMap = new Map<string, { heading: string, level: number, content: string }>()

    // Add base sections
    for (const section of base.sections) {
      sectionMap.set(section.heading, section)
    }

    // Add/update with update sections
    for (const section of update.sections) {
      sectionMap.set(section.heading, section)
    }

    // Build merged content
    let merged = `# ${title}\n\n`
    merged += `**Last Updated**: ${new Date().toISOString().split('T')[0]}\n\n`

    for (const section of sectionMap.values()) {
      const headingPrefix = '#'.repeat(section.level)
      merged += `${headingPrefix} ${section.heading}\n\n`
      merged += section.content.trim()
      merged += '\n\n'
    }

    return merged.trim()
  }

  // ==========================================================================
  // Version History
  // ==========================================================================

  /**
   * Save version history
   *
   * @param configId - Config ID
   * @param message - Commit message
   * @returns Save result
   */
  async saveVersion(
    configId: string,
    message: string,
  ): Promise<{ success: boolean, versionId?: string, error?: string }> {
    try {
      const response = await this.request<{ versionId: string }>(
        `/claude-md/version/${configId}`,
        {
          method: 'POST',
          body: JSON.stringify({ message }),
        },
      )

      if (response.success && response.data) {
        return {
          success: true,
          versionId: response.data.versionId,
        }
      }

      return {
        success: false,
        error: response.error || 'Failed to save version',
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * List version history
   *
   * @param configId - Config ID
   * @returns Array of versions
   */
  async listVersions(configId: string): Promise<VersionInfo[]> {
    try {
      const response = await this.request<{ versions: VersionInfo[] }>(
        `/claude-md/versions/${configId}`,
        { method: 'GET' },
      )

      if (response.success && response.data) {
        return response.data.versions
      }

      return []
    }
    catch (error) {
      console.error('Failed to list versions:', error)
      return []
    }
  }

  /**
   * Rollback to previous version
   *
   * @param configId - Config ID
   * @param versionId - Version ID to rollback to
   * @returns Rollback result
   */
  async rollbackToVersion(
    configId: string,
    versionId: string,
  ): Promise<{ success: boolean, error?: string }> {
    try {
      const response = await this.request(
        `/claude-md/rollback/${configId}/${versionId}`,
        { method: 'POST' },
      )

      return {
        success: response.success,
        error: response.error,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Load templates data from file
   */
  private loadTemplatesData(): { templates: ClaudeMdTemplate[], categories: TemplateCategory[] } {
    try {
      const content = readFileSync(TEMPLATES_FILE, 'utf-8')
      return JSON.parse(content)
    }
    catch (error) {
      console.error('Failed to load templates data:', error)
      return { templates: [], categories: [] }
    }
  }

  /**
   * Load device token
   */
  private loadDeviceToken(): void {
    try {
      const tokenFile = join(homedir(), '.ccjk', 'cloud-token.json')
      if (existsSync(tokenFile)) {
        const data = JSON.parse(readFileSync(tokenFile, 'utf-8'))
        this.deviceToken = data.deviceToken
      }
    }
    catch {
      this.deviceToken = null
    }
  }

  /**
   * Make HTTP request to cloud service
   */
  private async request<T>(
    path: string,
    options: {
      method: string
      body?: string
      timeout?: number
    },
  ): Promise<CloudApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const timeout = options.timeout || DEFAULT_TIMEOUT

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (this.deviceToken) {
        headers['X-Device-Token'] = this.deviceToken
      }

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json() as CloudApiResponse<T>

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || `HTTP_${response.status}`,
        }
      }

      return data
    }
    catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
            code: 'TIMEOUT',
          }
        }
        return {
          success: false,
          error: error.message,
          code: 'NETWORK_ERROR',
        }
      }

      return {
        success: false,
        error: String(error),
        code: 'UNKNOWN_ERROR',
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let syncServiceInstance: ClaudeMdSyncService | null = null

/**
 * Get singleton ClaudeMdSyncService instance
 */
export function getClaudeMdSyncService(): ClaudeMdSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new ClaudeMdSyncService()
  }
  return syncServiceInstance
}

/**
 * Reset singleton instance (for testing)
 */
export function resetClaudeMdSyncService(): void {
  syncServiceInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * List available templates
 */
export async function listTemplates(options?: ListTemplatesOptions): Promise<ClaudeMdTemplate[]> {
  const service = getClaudeMdSyncService()
  return service.listTemplates(options)
}

/**
 * Apply template to project
 */
export async function applyTemplate(
  templateId: string,
  projectPath: string,
  variables?: Record<string, string>,
): Promise<ApplyTemplateResult> {
  const service = getClaudeMdSyncService()
  return service.applyTemplateToProject(templateId, projectPath, variables)
}

/**
 * Upload CLAUDE.md to cloud
 */
export async function uploadClaudeMd(
  filePath: string,
  metadata: {
    name: string
    projectType: string
    privacy: 'private' | 'team' | 'public'
    description?: string
    tags?: string[]
  },
): Promise<UploadResult> {
  const service = getClaudeMdSyncService()
  return service.uploadClaudeMd(filePath, metadata)
}

/**
 * Download CLAUDE.md from cloud
 */
export async function downloadClaudeMd(
  configId: string,
  projectPath: string,
): Promise<DownloadResult> {
  const service = getClaudeMdSyncService()
  return service.downloadClaudeMd(configId, projectPath)
}

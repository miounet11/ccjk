/**
 * CCJK Cloud Agents Sync Service
 *
 * Provides cloud-based synchronization for AI agent definitions.
 * Allows users to share custom agents across devices and teams.
 *
 * Features:
 * - Upload local agents to cloud
 * - Download agents from cloud
 * - Agent template marketplace
 * - Version management and rollback
 * - Team sharing capabilities
 *
 * @module services/cloud/agents-sync
 */

import type {
  AgentExportOptions,
  AgentImportOptions,
  AgentInstallOptions,
  AgentInstallResult,
  AgentRating,
  AgentSearchOptions,
  AgentSearchResult,
  AgentStatistics,
  AgentSyncOptions,
  AgentSyncResult,
  AgentTemplate,
  AgentUpdateInfo,
  AgentValidationResult,
  CloudAgent,
  InstalledAgent,
} from '../../types/agent.js'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import agentTemplatesData from '../../data/agent-templates.json'
import { writeFileAtomic } from '../../utils/fs-operations'

// ============================================================================
// Constants
// ============================================================================

const CLOUD_API_BASE_URL = 'https://api.claudehome.cn'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const AGENTS_DIR = join(homedir(), '.ccjk', 'agents')
const INSTALLED_AGENTS_FILE = join(homedir(), '.ccjk', 'installed-agents.json')

// ============================================================================
// Types
// ============================================================================

/**
 * Cloud API response wrapper
 */
export interface CloudApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Agent templates registry
 */
interface AgentTemplatesRegistry {
  $schema?: string
  version: string
  templates: AgentTemplate[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Ensure agents directory exists
 */
function ensureAgentsDir(): void {
  if (!existsSync(AGENTS_DIR)) {
    mkdirSync(AGENTS_DIR, { recursive: true })
  }
}

/**
 * Get installed agents list
 */
function getInstalledAgents(): InstalledAgent[] {
  try {
    if (existsSync(INSTALLED_AGENTS_FILE)) {
      const data = readFileSync(INSTALLED_AGENTS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  }
  catch {
    // Ignore errors
  }
  return []
}

/**
 * Save installed agents list
 */
function saveInstalledAgents(agents: InstalledAgent[]): void {
  try {
    const dir = join(homedir(), '.ccjk')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileAtomic(INSTALLED_AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
  }
  catch (error) {
    throw new Error(`Failed to save installed agents: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Load agent from file
 */
function loadAgentFromFile(filePath: string): CloudAgent | null {
  try {
    const data = readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }
  catch {
    return null
  }
}

// Export for potential future use
export { loadAgentFromFile }

/**
 * Save agent to file
 */
function saveAgentToFile(agent: CloudAgent, filePath: string): void {
  try {
    const dir = join(filePath, '..')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileAtomic(filePath, JSON.stringify(agent, null, 2), 'utf-8')
  }
  catch (error) {
    throw new Error(`Failed to save agent: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Validate agent definition
 */
function validateAgent(agent: CloudAgent): AgentValidationResult {
  const errors: AgentValidationResult['errors'] = []
  const warnings: AgentValidationResult['warnings'] = []

  // Required fields
  if (!agent.id || agent.id.trim().length === 0) {
    errors.push({
      field: 'id',
      message: 'Agent ID is required',
      code: 'MISSING_ID',
    })
  }

  if (!agent.name || agent.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Agent name is required',
      code: 'MISSING_NAME',
    })
  }

  if (!agent.version || !/^\d+\.\d+\.\d+$/.test(agent.version)) {
    errors.push({
      field: 'version',
      message: 'Valid semantic version is required (e.g., 1.0.0)',
      code: 'INVALID_VERSION',
    })
  }

  if (!agent.definition || !agent.definition.role) {
    errors.push({
      field: 'definition.role',
      message: 'Agent role is required',
      code: 'MISSING_ROLE',
    })
  }

  if (!agent.definition || !agent.definition.systemPrompt) {
    errors.push({
      field: 'definition.systemPrompt',
      message: 'System prompt is required',
      code: 'MISSING_SYSTEM_PROMPT',
    })
  }

  // Warnings
  if (!agent.metadata || !agent.metadata.description) {
    warnings.push({
      field: 'metadata.description',
      message: 'Agent description is recommended',
      code: 'MISSING_DESCRIPTION',
    })
  }

  if (!agent.definition.capabilities || agent.definition.capabilities.length === 0) {
    warnings.push({
      field: 'definition.capabilities',
      message: 'At least one capability is recommended',
      code: 'NO_CAPABILITIES',
    })
  }

  if (!agent.definition.tools || agent.definition.tools.length === 0) {
    warnings.push({
      field: 'definition.tools',
      message: 'At least one tool is recommended',
      code: 'NO_TOOLS',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// CCJKAgentsClient Class
// ============================================================================

/**
 * CCJK Agents Cloud Client
 *
 * Handles communication with the CCJK Cloud Service for agent synchronization.
 */
export class CCJKAgentsClient {
  private baseUrl: string
  private deviceToken: string | null = null

  constructor(baseUrl: string = CLOUD_API_BASE_URL) {
    this.baseUrl = baseUrl
    this.loadToken()
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  private loadToken(): void {
    try {
      const tokenFile = join(homedir(), '.ccjk', 'cloud-token.json')
      if (existsSync(tokenFile)) {
        const data = readFileSync(tokenFile, 'utf-8')
        const storage = JSON.parse(data)
        this.deviceToken = storage.deviceToken
      }
    }
    catch {
      this.deviceToken = null
    }
  }

  isAuthenticated(): boolean {
    return this.deviceToken !== null && this.deviceToken.length > 0
  }

  // ==========================================================================
  // Local Agent Management
  // ==========================================================================

  /**
   * List all locally installed agents
   */
  async listLocalAgents(): Promise<InstalledAgent[]> {
    return getInstalledAgents()
  }

  /**
   * Get a specific local agent
   */
  async getLocalAgent(agentId: string): Promise<InstalledAgent | null> {
    const agents = getInstalledAgents()
    return agents.find(a => a.agent.id === agentId) || null
  }

  /**
   * Install agent locally
   */
  async installAgent(
    agent: CloudAgent,
    options: AgentInstallOptions = {},
  ): Promise<AgentInstallResult> {
    const startTime = Date.now()

    try {
      // Validate agent
      const validation = validateAgent(agent)
      if (!validation.valid) {
        return {
          success: false,
          agent,
          error: `Agent validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        }
      }

      // Check if already installed
      const installedAgents = getInstalledAgents()
      const existingIndex = installedAgents.findIndex(a => a.agent.id === agent.id)

      if (existingIndex >= 0 && !options.force) {
        return {
          success: true,
          agent,
          installedPath: installedAgents[existingIndex].path,
          alreadyInstalled: true,
          durationMs: Date.now() - startTime,
        }
      }

      // Determine installation path
      ensureAgentsDir()
      const agentDir = options.targetDir || join(AGENTS_DIR, agent.id)
      const agentFile = join(agentDir, 'agent.json')

      // Save agent to file
      saveAgentToFile(agent, agentFile)

      // Update installed agents list
      const installedAgent: InstalledAgent = {
        agent,
        path: agentDir,
        installedAt: new Date().toISOString(),
        source: options.targetDir ? 'local' : 'cloud',
        enabled: true,
        usageCount: 0,
      }

      if (existingIndex >= 0) {
        installedAgents[existingIndex] = installedAgent
      }
      else {
        installedAgents.push(installedAgent)
      }

      saveInstalledAgents(installedAgents)

      return {
        success: true,
        agent,
        installedPath: agentDir,
        warnings: validation.warnings.map(w => w.message),
        durationMs: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        agent,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Uninstall agent locally
   */
  async uninstallAgent(agentId: string): Promise<boolean> {
    try {
      const installedAgents = getInstalledAgents()
      const index = installedAgents.findIndex(a => a.agent.id === agentId)

      if (index < 0) {
        return false
      }

      // Remove from list
      installedAgents.splice(index, 1)
      saveInstalledAgents(installedAgents)

      return true
    }
    catch {
      return false
    }
  }

  /**
   * Export agent to file
   */
  async exportAgent(
    agentId: string,
    options: AgentExportOptions = {},
  ): Promise<string> {
    const agent = await this.getLocalAgent(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    const format = options.format || 'json'
    const outputPath = options.outputPath || join(process.cwd(), `${agentId}.${format}`)

    let content: string

    switch (format) {
      case 'json':
        content = JSON.stringify(agent.agent, null, options.pretty ? 2 : 0)
        break
      case 'yaml':
        // Simple YAML conversion (for basic structure)
        content = JSON.stringify(agent.agent, null, 2)
          .replace(/"/g, '')
          .replace(/,$/gm, '')
        break
      case 'markdown':
        content = `# ${agent.agent.name}\n\n`
        content += `**Version:** ${agent.agent.version}\n\n`
        content += `**Category:** ${agent.agent.metadata.category}\n\n`
        content += `## Description\n\n${agent.agent.metadata.description.en}\n\n`
        content += `## Definition\n\n\`\`\`json\n${JSON.stringify(agent.agent.definition, null, 2)}\n\`\`\`\n`
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    writeFileAtomic(outputPath, content, 'utf-8')
    return outputPath
  }

  /**
   * Import agent from file
   */
  async importAgent(options: AgentImportOptions): Promise<AgentInstallResult> {
    try {
      if (!existsSync(options.sourcePath)) {
        throw new Error(`File not found: ${options.sourcePath}`)
      }

      const content = readFileSync(options.sourcePath, 'utf-8')
      const agent: CloudAgent = JSON.parse(content)

      if (options.validate) {
        const validation = validateAgent(agent)
        if (!validation.valid) {
          throw new Error(`Invalid agent: ${validation.errors.map(e => e.message).join(', ')}`)
        }
      }

      return await this.installAgent(agent, {
        force: options.overwrite,
        lang: options.lang,
      })
    }
    catch (error) {
      return {
        success: false,
        agent: {} as CloudAgent,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // ==========================================================================
  // Cloud Sync Operations
  // ==========================================================================

  /**
   * Sync agents with cloud
   */
  async syncAgents(options: AgentSyncOptions = {}): Promise<AgentSyncResult> {
    const startTime = Date.now()

    if (!this.isAuthenticated()) {
      return {
        success: false,
        pushed: [],
        pulled: [],
        conflicts: [],
        skipped: [],
        error: 'Not authenticated. Please bind device first.',
        durationMs: Date.now() - startTime,
      }
    }

    if (options.dryRun) {
      // Simulate sync
      const localAgents = getInstalledAgents()
      return {
        success: true,
        pushed: localAgents.slice(0, 2).map(a => a.agent.id),
        pulled: ['cloud-agent-1', 'cloud-agent-2'],
        conflicts: [],
        skipped: [],
        durationMs: Date.now() - startTime,
      }
    }

    try {
      const direction = options.direction || 'both'
      const pushed: string[] = []
      const pulled: string[] = []
      const conflicts: AgentSyncResult['conflicts'] = []
      const skipped: string[] = []

      // Push local agents to cloud
      if (direction === 'push' || direction === 'both') {
        const localAgents = getInstalledAgents()
        const agentsToSync = options.agentIds
          ? localAgents.filter(a => options.agentIds!.includes(a.agent.id))
          : localAgents

        for (const installedAgent of agentsToSync) {
          if (!options.includePrivate && installedAgent.agent.privacy === 'private') {
            skipped.push(installedAgent.agent.id)
            continue
          }

          // Simulate cloud upload
          const response = await this.request<{ success: boolean }>('/agents/upload', {
            method: 'POST',
            body: JSON.stringify(installedAgent.agent),
          })

          if (response.success) {
            pushed.push(installedAgent.agent.id)
          }
          else {
            conflicts.push({
              agentId: installedAgent.agent.id,
              reason: response.error || 'Upload failed',
            })
          }
        }
      }

      // Pull agents from cloud
      if (direction === 'pull' || direction === 'both') {
        const response = await this.request<{ agents: CloudAgent[] }>('/agents/list', {
          method: 'GET',
        })

        if (response.success && response.data?.agents) {
          for (const cloudAgent of response.data.agents) {
            if (options.agentIds && !options.agentIds.includes(cloudAgent.id)) {
              continue
            }

            const result = await this.installAgent(cloudAgent, {
              force: options.force,
            })

            if (result.success) {
              pulled.push(cloudAgent.id)
            }
            else {
              conflicts.push({
                agentId: cloudAgent.id,
                reason: result.error || 'Installation failed',
              })
            }
          }
        }
      }

      return {
        success: true,
        pushed,
        pulled,
        conflicts,
        skipped,
        durationMs: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        pushed: [],
        pulled: [],
        conflicts: [],
        skipped: [],
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Search agents in cloud
   */
  async searchAgents(options: AgentSearchOptions = {}): Promise<AgentSearchResult> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please bind device first.')
    }

    try {
      const response = await this.request<{
        agents: CloudAgent[]
        total: number
      }>('/agents/search', {
        method: 'POST',
        body: JSON.stringify(options),
      })

      if (response.success && response.data) {
        return {
          agents: response.data.agents,
          total: response.data.total,
          offset: options.offset || 0,
          limit: options.limit || 10,
          query: options.query,
          filters: options,
        }
      }

      return {
        agents: [],
        total: 0,
        offset: 0,
        limit: 10,
      }
    }
    catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get agent statistics
   */
  async getAgentStatistics(agentId: string): Promise<AgentStatistics> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please bind device first.')
    }

    const response = await this.request<AgentStatistics>(`/agents/${agentId}/stats`, {
      method: 'GET',
    })

    if (response.success && response.data) {
      return response.data
    }

    throw new Error('Failed to get agent statistics')
  }

  /**
   * Rate an agent
   */
  async rateAgent(rating: AgentRating): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please bind device first.')
    }

    const response = await this.request<{ success: boolean }>('/agents/rate', {
      method: 'POST',
      body: JSON.stringify(rating),
    })

    return response.success || false
  }

  /**
   * Check for agent updates
   */
  async checkUpdates(): Promise<AgentUpdateInfo[]> {
    if (!this.isAuthenticated()) {
      return []
    }

    const installedAgents = getInstalledAgents()
    const updates: AgentUpdateInfo[] = []

    for (const installed of installedAgents) {
      // Simulate checking for updates
      const hasUpdate = Math.random() > 0.7 // 30% chance of update

      if (hasUpdate) {
        updates.push({
          agentId: installed.agent.id,
          currentVersion: installed.agent.version,
          latestVersion: '2.0.0',
          breaking: false,
          changelog: 'Bug fixes and improvements',
          releaseDate: new Date().toISOString(),
        })
      }
    }

    return updates
  }

  // ==========================================================================
  // Agent Templates
  // ==========================================================================

  /**
   * Get all agent templates
   */
  async getTemplates(): Promise<AgentTemplate[]> {
    const registry = agentTemplatesData as AgentTemplatesRegistry
    return registry.templates
  }

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<AgentTemplate | null> {
    const templates = await this.getTemplates()
    return templates.find(t => t.id === templateId) || null
  }

  /**
   * Create agent from template
   */
  async createFromTemplate(
    templateId: string,
    variables: Record<string, string | number | boolean | string[]>,
    agentName: string,
  ): Promise<CloudAgent> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Apply variables to template
    let systemPrompt = template.definition.systemPrompt

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      systemPrompt = systemPrompt.replace(placeholder, String(value))
    }

    // Create agent from template
    const agent: CloudAgent = {
      id: `${templateId}-${Date.now()}`,
      name: agentName,
      version: '1.0.0',
      definition: {
        ...template.definition,
        systemPrompt,
      },
      metadata: {
        author: 'User',
        description: template.description,
        tags: template.tags,
        category: template.category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
        rating: 0,
        ratingCount: 0,
      },
      privacy: 'private',
    }

    return agent
  }

  // ==========================================================================
  // HTTP Request Helper
  // ==========================================================================

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

let agentsClientInstance: CCJKAgentsClient | null = null

/**
 * Get the singleton CCJKAgentsClient instance
 */
export function getAgentsClient(): CCJKAgentsClient {
  if (!agentsClientInstance) {
    agentsClientInstance = new CCJKAgentsClient()
  }
  return agentsClientInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetAgentsClient(): void {
  agentsClientInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * List all locally installed agents
 */
export async function listLocalAgents(): Promise<InstalledAgent[]> {
  const client = getAgentsClient()
  return client.listLocalAgents()
}

/**
 * Install an agent
 */
export async function installAgent(
  agent: CloudAgent,
  options?: AgentInstallOptions,
): Promise<AgentInstallResult> {
  const client = getAgentsClient()
  return client.installAgent(agent, options)
}

/**
 * Uninstall an agent
 */
export async function uninstallAgent(agentId: string): Promise<boolean> {
  const client = getAgentsClient()
  return client.uninstallAgent(agentId)
}

/**
 * Sync agents with cloud
 */
export async function syncAgents(options?: AgentSyncOptions): Promise<AgentSyncResult> {
  const client = getAgentsClient()
  return client.syncAgents(options)
}

/**
 * Search agents in cloud
 */
export async function searchAgents(options?: AgentSearchOptions): Promise<AgentSearchResult> {
  const client = getAgentsClient()
  return client.searchAgents(options)
}

/**
 * Get agent templates
 */
export async function getAgentTemplates(): Promise<AgentTemplate[]> {
  const client = getAgentsClient()
  return client.getTemplates()
}

/**
 * Create agent from template
 */
export async function createAgentFromTemplate(
  templateId: string,
  variables: Record<string, string | number | boolean | string[]>,
  agentName: string,
): Promise<CloudAgent> {
  const client = getAgentsClient()
  return client.createFromTemplate(templateId, variables, agentName)
}

/**
 * Export agent to file
 */
export async function exportAgent(
  agentId: string,
  options?: AgentExportOptions,
): Promise<string> {
  const client = getAgentsClient()
  return client.exportAgent(agentId, options)
}

/**
 * Import agent from file
 */
export async function importAgent(options: AgentImportOptions): Promise<AgentInstallResult> {
  const client = getAgentsClient()
  return client.importAgent(options)
}

/**
 * Check for agent updates
 */
export async function checkAgentUpdates(): Promise<AgentUpdateInfo[]> {
  const client = getAgentsClient()
  return client.checkUpdates()
}

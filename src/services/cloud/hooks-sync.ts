/**
 * CCJK Cloud Hooks Synchronization Service
 *
 * Provides cloud-based synchronization for automation hooks, enabling
 * users to share and sync hook rules across multiple devices.
 *
 * @module services/cloud/hooks-sync
 */

import type { SupportedLang } from '../../constants.js'
import type { Hook, HookType } from '../../utils/hooks/types.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Cloud hook trigger types
 */
export type CloudHookTriggerType = 'file_change' | 'command' | 'schedule' | 'event'

/**
 * Cloud hook action types
 */
export type CloudHookActionType = 'run_command' | 'call_api' | 'notify' | 'transform'

/**
 * Cloud hook condition operators
 */
export type CloudHookConditionOperator = 'eq' | 'ne' | 'contains' | 'matches'

/**
 * Cloud hook privacy levels
 */
export type CloudHookPrivacy = 'private' | 'team' | 'public'

/**
 * Cloud hook trigger configuration
 */
export interface CloudHookTrigger {
  /** Trigger type */
  type: CloudHookTriggerType
  /** File matching pattern (for file_change) */
  pattern?: string
  /** Trigger command (for command) */
  command?: string
  /** Cron expression (for schedule) */
  schedule?: string
  /** Event name (for event) */
  event?: string
}

/**
 * Cloud hook action configuration
 */
export interface CloudHookAction {
  /** Action type */
  type: CloudHookActionType
  /** Action configuration */
  config: Record<string, any>
}

/**
 * Cloud hook condition
 */
export interface CloudHookCondition {
  /** Field to check */
  field: string
  /** Comparison operator */
  operator: CloudHookConditionOperator
  /** Expected value */
  value: string
}

/**
 * Cloud hook metadata
 */
export interface CloudHookMetadata {
  /** Hook author */
  author: string
  /** Hook description */
  description: string
  /** Hook tags */
  tags: string[]
  /** Hook category */
  category: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
}

/**
 * Cloud hook definition
 */
export interface CloudHook {
  /** Unique hook identifier */
  id: string
  /** Hook name */
  name: string
  /** Hook version */
  version: string
  /** Trigger configuration */
  trigger: CloudHookTrigger
  /** Actions to execute */
  actions: CloudHookAction[]
  /** Execution conditions */
  conditions?: CloudHookCondition[]
  /** Hook metadata */
  metadata: CloudHookMetadata
  /** Privacy level */
  privacy: CloudHookPrivacy
  /** Whether hook is enabled */
  enabled: boolean
}

/**
 * Hook template definition
 */
export interface HookTemplate {
  /** Template identifier */
  id: string
  /** Template name */
  name: string
  /** Template category */
  category: string
  /** Template description */
  description: string
  /** Hook configuration (without id and metadata) */
  hook: Omit<CloudHook, 'id' | 'metadata'>
  /** Template variables */
  variables: string[]
}

/**
 * Hook sync options
 */
export interface HookSyncOptions {
  /** Direction: upload or download */
  direction: 'upload' | 'download' | 'bidirectional'
  /** Whether to overwrite existing hooks */
  overwrite?: boolean
  /** Filter by privacy level */
  privacy?: CloudHookPrivacy
  /** Filter by category */
  category?: string
  /** Filter by tags */
  tags?: string[]
}

/**
 * Hook sync result
 */
export interface HookSyncResult {
  /** Whether sync was successful */
  success: boolean
  /** Number of hooks uploaded */
  uploaded: number
  /** Number of hooks downloaded */
  downloaded: number
  /** Number of hooks skipped */
  skipped: number
  /** Number of hooks failed */
  failed: number
  /** Sync errors */
  errors: string[]
  /** Sync timestamp */
  timestamp: string
}

/**
 * Hook execution log entry
 */
export interface HookExecutionLog {
  /** Log entry ID */
  id: string
  /** Hook ID */
  hookId: string
  /** Hook name */
  hookName: string
  /** Execution timestamp */
  timestamp: string
  /** Execution status */
  status: 'success' | 'failed' | 'skipped'
  /** Execution duration in milliseconds */
  durationMs: number
  /** Trigger that caused execution */
  trigger: string
  /** Execution output */
  output?: string
  /** Error message (if failed) */
  error?: string
}

/**
 * Cloud API response
 */
export interface CloudApiResponse<T = unknown> {
  /** Whether request was successful */
  success: boolean
  /** Response data */
  data?: T
  /** Error message */
  error?: string
  /** Error code */
  code?: string
  /** Response timestamp */
  timestamp?: string
}

// ============================================================================
// Cloud Hooks Sync Client
// ============================================================================

/**
 * Cloud Hooks Synchronization Client
 *
 * Handles synchronization of automation hooks with the CCJK cloud service.
 * Supports uploading local hooks, downloading cloud hooks, and managing
 * hook templates.
 *
 * @example
 * ```typescript
 * const client = new CloudHooksSyncClient({
 *   baseUrl: 'https://api.api.claudehome.cn/v1/hooks',
 *   apiKey: 'your-api-key'
 * })
 *
 * // Upload local hooks
 * const uploadResult = await client.uploadHooks(localHooks)
 *
 * // Download cloud hooks
 * const downloadResult = await client.downloadHooks({ privacy: 'private' })
 *
 * // Get hook templates
 * const templates = await client.getTemplates({ category: 'git' })
 * ```
 */
export class CloudHooksSyncClient {
  private baseUrl: string
  private apiKey?: string
  private timeout: number
  private enableLogging: boolean

  constructor(options: {
    baseUrl?: string
    apiKey?: string
    timeout?: number
    enableLogging?: boolean
  } = {}) {
    this.baseUrl = options.baseUrl || 'https://api.api.claudehome.cn/v1/hooks'
    this.apiKey = options.apiKey
    this.timeout = options.timeout || 30000
    this.enableLogging = options.enableLogging || false
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Upload hooks to cloud
   *
   * @param hooks - Hooks to upload
   * @returns Upload result
   */
  async uploadHooks(hooks: CloudHook[]): Promise<CloudApiResponse<HookSyncResult>> {
    this.log('Uploading hooks:', hooks.length)

    return this.request<HookSyncResult>('/upload', {
      method: 'POST',
      body: JSON.stringify({ hooks }),
    })
  }

  /**
   * Download hooks from cloud
   *
   * @param options - Download options
   * @param options.privacy - Filter by privacy level
   * @param options.category - Filter by category
   * @param options.tags - Filter by tags
   * @returns Downloaded hooks
   */
  async downloadHooks(options?: {
    privacy?: CloudHookPrivacy
    category?: string
    tags?: string[]
  }): Promise<CloudApiResponse<CloudHook[]>> {
    this.log('Downloading hooks with options:', options)

    return this.request<CloudHook[]>('/download', {
      method: 'GET',
      params: options,
    })
  }

  /**
   * Sync hooks bidirectionally
   *
   * @param localHooks - Local hooks to sync
   * @param options - Sync options
   * @returns Sync result
   */
  async syncHooks(
    localHooks: CloudHook[],
    options?: HookSyncOptions,
  ): Promise<CloudApiResponse<HookSyncResult>> {
    this.log('Syncing hooks:', localHooks.length, 'options:', options)

    return this.request<HookSyncResult>('/sync', {
      method: 'POST',
      body: JSON.stringify({ hooks: localHooks, options }),
    })
  }

  /**
   * Get hook templates
   *
   * @param options - Filter options
   * @param options.category - Filter by category
   * @param options.tags - Filter by tags
   * @param options.language - Filter by language
   * @returns Hook templates
   */
  async getTemplates(options?: {
    category?: string
    tags?: string[]
    language?: SupportedLang
  }): Promise<CloudApiResponse<HookTemplate[]>> {
    this.log('Getting templates with options:', options)

    return this.request<HookTemplate[]>('/templates', {
      method: 'GET',
      params: options,
    })
  }

  /**
   * Get a specific hook template
   *
   * @param id - Template ID
   * @returns Hook template
   */
  async getTemplate(id: string): Promise<CloudApiResponse<HookTemplate>> {
    this.log('Getting template:', id)

    return this.request<HookTemplate>(`/templates/${id}`, {
      method: 'GET',
    })
  }

  /**
   * Get hook by ID
   *
   * @param id - Hook ID
   * @returns Hook details
   */
  async getHook(id: string): Promise<CloudApiResponse<CloudHook>> {
    this.log('Getting hook:', id)

    return this.request<CloudHook>(`/hooks/${id}`, {
      method: 'GET',
    })
  }

  /**
   * Delete hook from cloud
   *
   * @param id - Hook ID
   * @returns Deletion result
   */
  async deleteHook(id: string): Promise<CloudApiResponse<{ deleted: boolean }>> {
    this.log('Deleting hook:', id)

    return this.request<{ deleted: boolean }>(`/hooks/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get hook execution logs
   *
   * @param hookId - Hook ID
   * @param options - Filter options
   * @param options.limit - Maximum number of logs to return
   * @param options.offset - Offset for pagination
   * @param options.status - Filter by execution status
   * @returns Execution logs
   */
  async getExecutionLogs(
    hookId: string,
    options?: {
      limit?: number
      offset?: number
      status?: 'success' | 'failed' | 'skipped'
    },
  ): Promise<CloudApiResponse<HookExecutionLog[]>> {
    this.log('Getting execution logs for hook:', hookId, 'options:', options)

    return this.request<HookExecutionLog[]>(`/hooks/${hookId}/logs`, {
      method: 'GET',
      params: options,
    })
  }

  /**
   * Enable/disable hook
   *
   * @param id - Hook ID
   * @param enabled - Whether to enable or disable
   * @returns Update result
   */
  async setHookEnabled(
    id: string,
    enabled: boolean,
  ): Promise<CloudApiResponse<{ updated: boolean }>> {
    this.log('Setting hook enabled:', id, enabled)

    return this.request<{ updated: boolean }>(`/hooks/${id}/enabled`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Make HTTP request to cloud service
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: string
      params?: Record<string, any>
    } = {},
  ): Promise<CloudApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params)

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: this.getHeaders(),
        body: options.body,
        signal: AbortSignal.timeout(this.timeout),
      })

      const data = await response.json() as CloudApiResponse<T>

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          code: data.code || `HTTP_${response.status}`,
        }
      }

      return {
        ...data,
        timestamp: new Date().toISOString(),
      }
    }
    catch (error) {
      if (error instanceof Error) {
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

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseUrl)

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)))
          }
          else {
            url.searchParams.append(key, String(value))
          }
        }
      }
    }

    return url.toString()
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CCJK-Hooks-Sync/1.0',
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * Log message (if logging is enabled)
   */
  private log(...args: any[]): void {
    if (this.enableLogging) {
      console.log('[CloudHooksSyncClient]', ...args)
    }
  }
}

// ============================================================================
// Hook Conversion Utilities
// ============================================================================

/**
 * Convert local Hook to CloudHook format
 *
 * @param hook - Local hook
 * @param author - Hook author
 * @returns Cloud hook
 */
export function convertToCloudHook(hook: Hook, author: string = 'user'): CloudHook {
  return {
    id: hook.id,
    name: hook.name,
    version: hook.version || '1.0.0',
    trigger: {
      type: 'event',
      event: hook.type,
    },
    actions: [
      {
        type: 'run_command',
        config: {
          action: hook.action,
        },
      },
    ],
    conditions: hook.condition ? convertConditions(hook.condition) : undefined,
    metadata: {
      author,
      description: hook.description || '',
      tags: hook.tags || [],
      category: hook.source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    privacy: 'private',
    enabled: hook.enabled,
  }
}

/**
 * Convert CloudHook to local Hook format
 *
 * @param cloudHook - Cloud hook
 * @returns Local hook
 */
export function convertFromCloudHook(cloudHook: CloudHook): Hook {
  return {
    id: cloudHook.id,
    name: cloudHook.name,
    description: cloudHook.metadata.description,
    type: (cloudHook.trigger.event || 'pre-tool-use') as HookType,
    priority: 5,
    condition: cloudHook.conditions ? convertFromCloudConditions(cloudHook.conditions) : undefined,
    action: {
      execute: async () => {
        // Action will be reconstructed from cloudHook.actions
        return {
          success: true,
          status: 'success' as const,
          durationMs: 0,
          continueChain: true,
        }
      },
    },
    enabled: cloudHook.enabled,
    source: cloudHook.metadata.category as 'builtin' | 'plugin' | 'user',
    version: cloudHook.version,
    author: cloudHook.metadata.author,
    tags: cloudHook.metadata.tags,
  }
}

/**
 * Convert local hook conditions to cloud format
 */
function convertConditions(condition: any): CloudHookCondition[] {
  const conditions: CloudHookCondition[] = []

  if (condition.tool) {
    conditions.push({
      field: 'tool',
      operator: typeof condition.tool === 'string' ? 'eq' : 'matches',
      value: String(condition.tool),
    })
  }

  if (condition.skillId) {
    conditions.push({
      field: 'skillId',
      operator: typeof condition.skillId === 'string' ? 'eq' : 'matches',
      value: String(condition.skillId),
    })
  }

  if (condition.workflowId) {
    conditions.push({
      field: 'workflowId',
      operator: typeof condition.workflowId === 'string' ? 'eq' : 'matches',
      value: String(condition.workflowId),
    })
  }

  return conditions
}

/**
 * Convert cloud conditions to local format
 */
function convertFromCloudConditions(conditions: CloudHookCondition[]): any {
  const condition: any = {}

  for (const cond of conditions) {
    if (cond.field === 'tool') {
      condition.tool = cond.operator === 'matches' ? new RegExp(cond.value) : cond.value
    }
    else if (cond.field === 'skillId') {
      condition.skillId = cond.operator === 'matches' ? new RegExp(cond.value) : cond.value
    }
    else if (cond.field === 'workflowId') {
      condition.workflowId = cond.operator === 'matches' ? new RegExp(cond.value) : cond.value
    }
  }

  return condition
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a cloud hooks sync client instance
 */
export function createCloudHooksSyncClient(options?: {
  baseUrl?: string
  apiKey?: string
  timeout?: number
  enableLogging?: boolean
}): CloudHooksSyncClient {
  return new CloudHooksSyncClient(options)
}

/**
 * Get the default cloud hooks sync client instance (singleton)
 */
let defaultClientInstance: CloudHooksSyncClient | null = null

export function getDefaultCloudHooksSyncClient(): CloudHooksSyncClient {
  if (!defaultClientInstance) {
    defaultClientInstance = new CloudHooksSyncClient()
  }
  return defaultClientInstance
}

/**
 * Reset the default client instance (for testing)
 */
export function resetDefaultCloudHooksSyncClient(): void {
  defaultClientInstance = null
}

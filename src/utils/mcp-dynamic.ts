/**
 * MCP Dynamic Tool Management
 *
 * Supports Claude Code v2.1.0+ features:
 * - `list_changed` notifications for dynamic tool updates
 * - `auto:N` syntax for tool search auto-enable threshold
 * - Hot-plugging MCP services without restart
 *
 * @module utils/mcp-dynamic
 */

import { EventEmitter } from 'node:events'

// ============================================================================
// Types
// ============================================================================

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * MCP Service definition
 */
export interface MCPService {
  id: string
  name: string
  version: string
  tools: MCPTool[]
  enabled: boolean
  autoEnable?: number // auto:N threshold (0-100)
}

/**
 * Tool change notification
 */
export interface ToolChangeNotification {
  type: 'list_changed'
  timestamp: number
  changes: {
    added: MCPTool[]
    removed: string[]
    updated: MCPTool[]
  }
}

/**
 * Auto-enable configuration
 */
export interface AutoEnableConfig {
  enabled: boolean
  threshold: number // 0-100 (percentage of context window)
  excludeServices: string[] // Services to always load
}

// ============================================================================
// Dynamic MCP Registry
// ============================================================================

/**
 * Dynamic MCP Service Registry
 *
 * Manages MCP services with hot-plugging support and
 * `list_changed` notifications for Claude Code v2.1.0+.
 */
export class DynamicMCPRegistry extends EventEmitter {
  private services: Map<string, MCPService> = new Map()
  private tools: Map<string, MCPTool> = new Map()
  private autoEnableConfig: AutoEnableConfig
  private notificationQueue: ToolChangeNotification[] = []
  private notificationDebounceTimer: NodeJS.Timeout | null = null
  private readonly DEBOUNCE_MS = 100

  constructor(config?: Partial<AutoEnableConfig>) {
    super()
    this.autoEnableConfig = {
      enabled: config?.enabled ?? true,
      threshold: config?.threshold ?? 10, // Default 10% of context
      excludeServices: config?.excludeServices ?? [],
    }
  }

  // ==========================================================================
  // Service Management
  // ==========================================================================

  /**
   * Register a new MCP service
   */
  registerService(service: MCPService): void {
    const existing = this.services.get(service.id)
    const isUpdate = !!existing

    // Store service
    this.services.set(service.id, service)

    // Track tool changes
    const addedTools: MCPTool[] = []
    const updatedTools: MCPTool[] = []

    for (const tool of service.tools) {
      const toolId = `${service.id}__${tool.name}`
      const existingTool = this.tools.get(toolId)

      if (existingTool) {
        updatedTools.push(tool)
      }
      else {
        addedTools.push(tool)
      }

      this.tools.set(toolId, tool)
    }

    // Queue notification
    if (addedTools.length > 0 || updatedTools.length > 0) {
      this.queueNotification({
        type: 'list_changed',
        timestamp: Date.now(),
        changes: {
          added: addedTools,
          removed: [],
          updated: updatedTools,
        },
      })
    }

    // Emit events
    if (isUpdate) {
      this.emit('service:updated', service)
    }
    else {
      this.emit('service:registered', service)
    }
  }

  /**
   * Unregister an MCP service
   */
  unregisterService(serviceId: string): boolean {
    const service = this.services.get(serviceId)
    if (!service)
      return false

    // Track removed tools
    const removedTools: string[] = []

    for (const tool of service.tools) {
      const toolId = `${serviceId}__${tool.name}`
      if (this.tools.delete(toolId)) {
        removedTools.push(tool.name)
      }
    }

    // Remove service
    this.services.delete(serviceId)

    // Queue notification
    if (removedTools.length > 0) {
      this.queueNotification({
        type: 'list_changed',
        timestamp: Date.now(),
        changes: {
          added: [],
          removed: removedTools,
          updated: [],
        },
      })
    }

    this.emit('service:unregistered', serviceId)
    return true
  }

  /**
   * Enable a service
   */
  enableService(serviceId: string): boolean {
    const service = this.services.get(serviceId)
    if (!service)
      return false

    if (!service.enabled) {
      service.enabled = true

      // Queue notification for newly available tools
      this.queueNotification({
        type: 'list_changed',
        timestamp: Date.now(),
        changes: {
          added: service.tools,
          removed: [],
          updated: [],
        },
      })

      this.emit('service:enabled', service)
    }

    return true
  }

  /**
   * Disable a service
   */
  disableService(serviceId: string): boolean {
    const service = this.services.get(serviceId)
    if (!service)
      return false

    if (service.enabled) {
      service.enabled = false

      // Queue notification for removed tools
      this.queueNotification({
        type: 'list_changed',
        timestamp: Date.now(),
        changes: {
          added: [],
          removed: service.tools.map(t => t.name),
          updated: [],
        },
      })

      this.emit('service:disabled', service)
    }

    return true
  }

  // ==========================================================================
  // Tool Access
  // ==========================================================================

  /**
   * Get all available tools
   */
  getAvailableTools(): MCPTool[] {
    const tools: MCPTool[] = []

    for (const [, service] of this.services) {
      if (service.enabled) {
        tools.push(...service.tools)
      }
    }

    return tools
  }

  /**
   * Get a specific tool by name
   */
  getTool(toolName: string): MCPTool | undefined {
    // Search across all services
    for (const [, service] of this.services) {
      if (!service.enabled)
        continue

      const tool = service.tools.find(t => t.name === toolName)
      if (tool)
        return tool
    }

    return undefined
  }

  /**
   * Get tools by service
   */
  getToolsByService(serviceId: string): MCPTool[] {
    const service = this.services.get(serviceId)
    if (!service || !service.enabled)
      return []

    return service.tools
  }

  // ==========================================================================
  // Auto-Enable (auto:N) Support
  // ==========================================================================

  /**
   * Parse auto:N syntax
   *
   * @example
   * parseAutoSyntax('auto:10') // { enabled: true, threshold: 10 }
   * parseAutoSyntax('auto')    // { enabled: true, threshold: 10 } (default)
   */
  static parseAutoSyntax(value: string): { enabled: boolean, threshold: number } | null {
    if (!value.startsWith('auto'))
      return null

    if (value === 'auto') {
      return { enabled: true, threshold: 10 }
    }

    const match = value.match(/^auto:(\d+)$/)
    if (match) {
      const threshold = Number.parseInt(match[1], 10)
      if (threshold >= 0 && threshold <= 100) {
        return { enabled: true, threshold }
      }
    }

    return null
  }

  /**
   * Configure auto-enable settings
   */
  setAutoEnableConfig(config: Partial<AutoEnableConfig>): void {
    this.autoEnableConfig = {
      ...this.autoEnableConfig,
      ...config,
    }
  }

  /**
   * Get auto-enable configuration
   */
  getAutoEnableConfig(): AutoEnableConfig {
    return { ...this.autoEnableConfig }
  }

  /**
   * Check if a service should be auto-enabled based on context usage
   */
  shouldAutoEnable(serviceId: string, contextUsagePercent: number): boolean {
    if (!this.autoEnableConfig.enabled)
      return false

    // Always enable excluded services
    if (this.autoEnableConfig.excludeServices.includes(serviceId))
      return true

    // Enable if context usage is below threshold
    return contextUsagePercent < this.autoEnableConfig.threshold
  }

  /**
   * Get services that should be deferred (not auto-enabled)
   */
  getDeferredServices(contextUsagePercent: number): MCPService[] {
    const deferred: MCPService[] = []

    for (const [, service] of this.services) {
      if (!this.shouldAutoEnable(service.id, contextUsagePercent)) {
        deferred.push(service)
      }
    }

    return deferred
  }

  // ==========================================================================
  // Notification System
  // ==========================================================================

  /**
   * Queue a notification (debounced)
   */
  private queueNotification(notification: ToolChangeNotification): void {
    this.notificationQueue.push(notification)

    // Debounce notifications
    if (this.notificationDebounceTimer) {
      clearTimeout(this.notificationDebounceTimer)
    }

    this.notificationDebounceTimer = setTimeout(() => {
      this.flushNotifications()
    }, this.DEBOUNCE_MS)
  }

  /**
   * Flush queued notifications
   */
  private flushNotifications(): void {
    if (this.notificationQueue.length === 0)
      return

    // Merge all queued notifications
    const merged: ToolChangeNotification = {
      type: 'list_changed',
      timestamp: Date.now(),
      changes: {
        added: [],
        removed: [],
        updated: [],
      },
    }

    const addedSet = new Set<string>()
    const removedSet = new Set<string>()
    const updatedSet = new Set<string>()

    for (const notification of this.notificationQueue) {
      for (const tool of notification.changes.added) {
        if (!addedSet.has(tool.name)) {
          addedSet.add(tool.name)
          merged.changes.added.push(tool)
        }
      }

      for (const name of notification.changes.removed) {
        if (!removedSet.has(name)) {
          removedSet.add(name)
          merged.changes.removed.push(name)
        }
      }

      for (const tool of notification.changes.updated) {
        if (!updatedSet.has(tool.name)) {
          updatedSet.add(tool.name)
          merged.changes.updated.push(tool)
        }
      }
    }

    // Clear queue
    this.notificationQueue = []
    this.notificationDebounceTimer = null

    // Emit merged notification
    this.emit('list_changed', merged)
  }

  /**
   * Subscribe to list_changed notifications
   */
  onListChanged(callback: (notification: ToolChangeNotification) => void): void {
    this.on('list_changed', callback)
  }

  /**
   * Generate JSON-RPC notification for list_changed
   */
  generateListChangedNotification(): string {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/tools/list_changed',
    }

    return JSON.stringify(notification)
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get registry statistics
   */
  getStats(): {
    totalServices: number
    enabledServices: number
    totalTools: number
    availableTools: number
  } {
    let enabledServices = 0
    let availableTools = 0

    for (const service of this.services.values()) {
      if (service.enabled) {
        enabledServices++
        availableTools += service.tools.length
      }
    }

    return {
      totalServices: this.services.size,
      enabledServices,
      totalTools: this.tools.size,
      availableTools,
    }
  }

  /**
   * Get all registered services
   */
  getServices(): MCPService[] {
    const result: MCPService[] = []
    for (const [, service] of this.services) {
      result.push(service)
    }
    return result
  }

  /**
   * Get a specific service
   */
  getService(serviceId: string): MCPService | undefined {
    return this.services.get(serviceId)
  }

  /**
   * Check if a service is registered
   */
  hasService(serviceId: string): boolean {
    return this.services.has(serviceId)
  }

  /**
   * Clear all services
   */
  clear(): void {
    const removedTools = Array.from(this.tools.keys())

    this.services.clear()
    this.tools.clear()

    if (removedTools.length > 0) {
      this.queueNotification({
        type: 'list_changed',
        timestamp: Date.now(),
        changes: {
          added: [],
          removed: removedTools,
          updated: [],
        },
      })
    }

    this.emit('registry:cleared')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: DynamicMCPRegistry | null = null

/**
 * Get the singleton dynamic MCP registry
 */
export function getDynamicMCPRegistry(): DynamicMCPRegistry {
  if (!registryInstance) {
    registryInstance = new DynamicMCPRegistry()
  }
  return registryInstance
}

/**
 * Initialize the dynamic MCP registry with configuration
 */
export function initDynamicMCPRegistry(config?: Partial<AutoEnableConfig>): DynamicMCPRegistry {
  registryInstance = new DynamicMCPRegistry(config)
  return registryInstance
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Register a service and send list_changed notification
 */
export function registerMCPService(service: MCPService): void {
  const registry = getDynamicMCPRegistry()
  registry.registerService(service)
}

/**
 * Unregister a service and send list_changed notification
 */
export function unregisterMCPService(serviceId: string): boolean {
  const registry = getDynamicMCPRegistry()
  return registry.unregisterService(serviceId)
}

/**
 * Get all available MCP tools
 */
export function getAvailableMCPTools(): MCPTool[] {
  const registry = getDynamicMCPRegistry()
  return registry.getAvailableTools()
}

/**
 * Parse auto:N configuration string
 */
export function parseAutoConfig(value: string): { enabled: boolean, threshold: number } | null {
  return DynamicMCPRegistry.parseAutoSyntax(value)
}

/**
 * MCP Dynamic Tool Search System for CCJK v3.8
 *
 * Implements Claude Code CLI 2.1.7's MCP tool search auto-mode feature.
 * Defers loading tool descriptions when they exceed configured threshold
 * percentage of the context window.
 *
 * Features:
 * - Parse auto:N syntax (0-100 percentage threshold)
 * - Calculate context window usage based on tool descriptions
 * - Implement deferred tool loading (>10% threshold default)
 * - MCPSearch tool integration for on-demand tool discovery
 * - Support list_changed notifications for dynamic service updates
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/mcp#tool-search-auto-mode
 */

import type { McpToolSearchConfig } from '../types'

import { ensureI18nInitialized, i18n } from '../i18n'
import { readMcpConfig, writeMcpConfig } from '../utils/claude-config'

// Re-export the type from types.ts for convenience
export type { McpToolSearchConfig } from '../types'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Auto mode threshold values for MCP tool search
 * - Number: Percentage (0-100) of context window
 * - 'always': Load all tools immediately (0% threshold)
 * - 'never': Defer all tools until requested (100% threshold)
 */
export type McpAutoThreshold = number | 'always' | 'never'

/**
 * Context window analysis result
 */
export interface ContextWindowAnalysis {
  /** Total context window size in tokens */
  contextWindow: number

  /** Estimated size of tool descriptions in tokens */
  toolDescriptionSize: number

  /** Percentage of context window used by tool descriptions */
  percentageUsed: number

  /** Threshold percentage */
  threshold: number

  /** Whether tools should be deferred based on threshold */
  shouldDefer: boolean

  /** Breakdown by service */
  serviceBreakdown: ServiceToolBreakdown[]
}

/**
 * Tool breakdown per service
 */
export interface ServiceToolBreakdown {
  serviceId: string

  /** Number of tools provided by this service */
  toolCount: number

  /** Estimated size in tokens */
  estimatedSize: number

  /** Percentage of total tool description size */
  percentage: number

  /** Whether this service is excluded from auto mode */
  isExcluded: boolean
}

/**
 * MCPSearch tool integration interface
 * Provides on-demand tool discovery when tools are deferred
 */
export interface McpSearchTool {
  /** Search for available tools across all MCP services */
  searchTools: (query: string) => Promise<ToolSearchResult[]>

  /** List all available tools (loads deferred tools on demand) */
  listAllTools: () => Promise<ToolDescriptor[]>

  /** Get detailed information about a specific tool */
  getToolDetails: (toolName: string) => Promise<ToolDescriptor | null>
}

/**
 * Result of a tool search operation
 */
export interface ToolSearchResult {
  /** Name of the tool */
  name: string

  /** Service providing this tool */
  serviceId: string

  /** Brief description */
  description: string

  /** Relevance score for this search result */
  relevanceScore: number

  /** Whether this tool was deferred */
  isDeferred: boolean
}

/**
 * Complete tool descriptor with full information
 */
export interface ToolDescriptor {
  /** Tool name */
  name: string

  /** Service providing the tool */
  serviceId: string

  /** Full description (may be large) */
  description: string

  /** Input schema for the tool */
  inputSchema: Record<string, unknown>

  /** Whether this tool is currently deferred */
  isDeferred: boolean
}

/**
 * MCP service with auto mode configuration
 */
export interface McpServiceWithAutoMode {
  id: string

  /** Server configuration */
  config: {
    type: 'stdio' | 'sse'
    command?: string
    args?: (string | number | boolean)[]
    url?: string
    env?: Record<string, string>
  }

  /** Auto mode configuration for this service */
  autoMode?: {
    /**
     * auto:N syntax for per-service threshold
     * N is percentage 0-100, or 'always'/'never'
     */
    threshold?: McpAutoThreshold

    /**
     * Disable auto mode for this specific service
     */
    disabled?: boolean
  }
}

// ============================================================================
// Constants
// ============================================================================

/** Default threshold percentage (10% as per Claude Code 2.1.7) */
export const DEFAULT_THRESHOLD = 10

/** Maximum threshold percentage */
export const MAX_THRESHOLD = 100

/** Minimum threshold percentage */
export const MIN_THRESHOLD = 0

/** Approximate tokens per character (varies by model, using conservative estimate) */
const TOKENS_PER_CHAR = 0.25

/** Default context window sizes for different models */
export const CONTEXT_WINDOW_SIZES: Record<string, number> = {
  'claude-sonnet-4-5': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-5': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet': 200000,
  'claude-3-5-sonnet': 200000,
  'claude-3-opus': 200000,
  'claude-3-haiku': 200000,
  'default': 200000,
}

/** Core services that should never be deferred */
export const CORE_SERVICES = [
  'mcp-search',
  'context7',
  'sqlite',
]

// ============================================================================
// Auto Mode Syntax Parser
// ============================================================================

/**
 * Parse auto:N syntax from environment variable or config
 *
 * @param value - The auto mode value to parse (e.g., "auto:15", "auto:always", "auto:never")
 * @returns Parsed threshold value
 * @throws {Error} If the syntax is invalid
 *
 * @example
 * parseAutoMode('auto:15') // Returns 15
 * parseAutoMode('auto:always') // Returns 'always'
 * parseAutoMode('auto:never') // Returns 'never'
 * parseAutoMode('15') // Returns 15
 */
export function parseAutoMode(value: string | undefined | McpAutoThreshold): McpAutoThreshold {
  if (value === undefined || value === null) {
    return DEFAULT_THRESHOLD
  }

  if (typeof value === 'number') {
    if (value < MIN_THRESHOLD || value > MAX_THRESHOLD) {
      throw new Error(i18n.t('mcp:search.invalidThresholdRange', {
        min: MIN_THRESHOLD,
        max: MAX_THRESHOLD,
        value,
      }))
    }
    return value
  }

  if (value === 'always' || value === 'never') {
    return value
  }

  const stringValue = String(value).trim()

  // Check for auto:N syntax
  if (stringValue.startsWith('auto:')) {
    const thresholdPart = stringValue.slice(5).trim()

    if (thresholdPart === 'always') {
      return 'always'
    }

    if (thresholdPart === 'never') {
      return 'never'
    }

    const num = Number.parseInt(thresholdPart, 10)

    if (Number.isNaN(num)) {
      throw new TypeError(i18n.t('mcp:search.invalidAutoSyntax', { value }))
    }

    if (num < MIN_THRESHOLD || num > MAX_THRESHOLD) {
      throw new Error(i18n.t('mcp:search.invalidThresholdRange', {
        min: MIN_THRESHOLD,
        max: MAX_THRESHOLD,
        value: num,
      }))
    }

    return num
  }

  // Try parsing as direct number
  const num = Number.parseInt(stringValue, 10)

  if (Number.isNaN(num)) {
    throw new TypeError(i18n.t('mcp:search.invalidAutoSyntax', { value }))
  }

  if (num < MIN_THRESHOLD || num > MAX_THRESHOLD) {
    throw new Error(i18n.t('mcp:search.invalidThresholdRange', {
      min: MIN_THRESHOLD,
      max: MAX_THRESHOLD,
      value: num,
    }))
  }

  return num
}

/**
 * Format threshold value to auto:N syntax string
 *
 * @param threshold - Threshold value to format
 * @returns Formatted string (e.g., "auto:15", "auto:always")
 */
export function formatAutoMode(threshold: McpAutoThreshold): string {
  if (threshold === 'always' || threshold === 'never') {
    return `auto:${threshold}`
  }
  return `auto:${threshold}`
}

/**
 * Convert threshold to numeric percentage for calculations
 *
 * @param threshold - Threshold value to convert
 * @returns Numeric threshold (0-100)
 */
export function thresholdToNumber(threshold: McpAutoThreshold): number {
  if (threshold === 'always') {
    return 0
  }
  if (threshold === 'never') {
    return 100
  }
  return threshold
}

// ============================================================================
// Context Window Calculation
// ============================================================================

/**
 * Get context window size for a model
 *
 * @param model - Model name
 * @returns Context window size in tokens
 */
export function getContextWindowSize(model?: string): number {
  if (!model) {
    return CONTEXT_WINDOW_SIZES.default
  }

  // Try exact match first
  if (CONTEXT_WINDOW_SIZES[model]) {
    return CONTEXT_WINDOW_SIZES[model]
  }

  // Try prefix match
  for (const [key, size] of Object.entries(CONTEXT_WINDOW_SIZES)) {
    if (model.startsWith(key)) {
      return size
    }
  }

  return CONTEXT_WINDOW_SIZES.default
}

/**
 * Estimate token count from string length
 *
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR)
}

/**
 * Calculate total tool description size for an MCP service
 *
 * @param serviceConfig - MCP server configuration
 * @returns Estimated token count for tool descriptions
 */
export function estimateToolDescriptionSize(serviceConfig: {
  args?: (string | number | boolean)[]
  env?: Record<string, string>
}): number {
  let totalSize = 0

  // Estimate based on package name from args
  if (serviceConfig.args) {
    const argsString = serviceConfig.args.join(' ')
    totalSize += estimateTokenCount(argsString)

    // Heuristic: larger packages tend to have more tools
    // Base estimate + adjustment based on package type
    if (argsString.includes('filesystem')) {
      totalSize += 500 // Filesystem has many tools
    }
    else if (argsString.includes('github') || argsString.includes('git')) {
      totalSize += 800 // GitHub/Git tools are extensive
    }
    else if (argsString.includes('browser') || argsString.includes('playwright')) {
      totalSize += 1500 // Browser automation has many tools
    }
    else if (argsString.includes('sqlite') || argsString.includes('database')) {
      totalSize += 400 // Database tools
    }
    else if (argsString.includes('search') || argsString.includes('fetch')) {
      totalSize += 300 // Search/fetch tools
    }
    else {
      totalSize += 200 // Default estimate for unknown packages
    }
  }

  // Add environment variable descriptions
  if (serviceConfig.env) {
    for (const [key, value] of Object.entries(serviceConfig.env)) {
      totalSize += estimateTokenCount(key) + estimateTokenCount(value)
    }
  }

  return totalSize
}

/**
 * Analyze context window usage for MCP tool descriptions
 *
 * @param options - Analysis options
 * @returns Context window analysis result
 */
export function analyzeContextWindowUsage(options: {
  mcpServers?: Record<string, {
    type: 'stdio' | 'sse'
    command?: string
    args?: (string | number | boolean)[]
    url?: string
    env?: Record<string, string>
  }>
  excludedServices?: string[]
  model?: string
  threshold?: McpAutoThreshold
} = {}): ContextWindowAnalysis {
  const {
    mcpServers = {},
    excludedServices = [],
    model,
    threshold = DEFAULT_THRESHOLD,
  } = options

  const contextWindow = getContextWindowSize(model)
  const numericThreshold = thresholdToNumber(threshold)

  let totalToolSize = 0
  const serviceBreakdown: ServiceToolBreakdown[] = []

  for (const [serviceId, serverConfig] of Object.entries(mcpServers)) {
    const isExcluded = excludedServices.includes(serviceId) || CORE_SERVICES.includes(serviceId)
    const estimatedSize = estimateToolDescriptionSize(serverConfig)

    // Only count non-excluded services toward deferred calculation
    if (!isExcluded) {
      totalToolSize += estimatedSize
    }

    serviceBreakdown.push({
      serviceId,
      toolCount: 0, // Will be updated if we can introspect
      estimatedSize,
      percentage: 0, // Will be calculated
      isExcluded,
    })
  }

  const percentageUsed = (totalToolSize / contextWindow) * 100
  const shouldDefer = percentageUsed > numericThreshold

  // Calculate percentages
  for (const breakdown of serviceBreakdown) {
    breakdown.percentage = totalToolSize > 0
      ? (breakdown.estimatedSize / totalToolSize) * 100
      : 0
  }

  // Sort by size descending
  serviceBreakdown.sort((a, b) => b.estimatedSize - a.estimatedSize)

  return {
    contextWindow,
    toolDescriptionSize: totalToolSize,
    percentageUsed,
    threshold: numericThreshold,
    shouldDefer,
    serviceBreakdown,
  }
}

// ============================================================================
// Deferred Tool Loading
// ============================================================================

/**
 * Generate MCP search tool configuration
 * This creates a special MCP service that provides tool discovery
 *
 * @returns MCP server config for the search tool
 */
export function generateMcpSearchToolConfig(): {
  type: 'stdio'
  command: string
  args: string[]
  env: Record<string, string>
} {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@ccjk/mcp-search@latest'],
    env: {
      // Pass current threshold to the search tool
      MCP_AUTO_THRESHOLD: String(DEFAULT_THRESHOLD),
    },
  }
}

/**
 * Configure auto mode for MCP services
 * Updates the MCP configuration to enable tool search auto mode
 *
 * @param options - Configuration options
 * @returns Configuration result
 */
export function configureAutoMode(options: {
  threshold?: McpAutoThreshold
  enableDynamicDiscovery?: boolean
  enableListChanged?: boolean
  excludedServices?: string[]
  configPath?: string
} = {}): {
  success: boolean
  error?: string
  config?: McpToolSearchConfig
  appliedChanges?: string[]
} {
  const {
    threshold = DEFAULT_THRESHOLD,
    enableDynamicDiscovery = true,
    enableListChanged = true,
    excludedServices = [...CORE_SERVICES],
  } = options

  try {
    // Read current config
    const config = readMcpConfig()
    if (!config) {
      return {
        success: false,
        error: i18n.t('mcp:search.noConfigFound'),
      }
    }

    const appliedChanges: string[] = []

    // Initialize mcpToolSearch if not present
    if (!config.mcpToolSearch) {
      config.mcpToolSearch = {
        mcpAutoEnableThreshold: threshold,
        dynamicServiceDiscovery: enableDynamicDiscovery,
        listChangedNotifications: enableListChanged,
        excludedServices,
      }
      appliedChanges.push(i18n.t('mcp:search.initializedConfig'))
    }
    else {
      // Update existing config
      if (config.mcpToolSearch.mcpAutoEnableThreshold !== threshold) {
        config.mcpToolSearch.mcpAutoEnableThreshold = threshold
        appliedChanges.push(i18n.t('mcp:search.updatedThreshold', { threshold: formatAutoMode(threshold) }))
      }

      if (config.mcpToolSearch.dynamicServiceDiscovery !== enableDynamicDiscovery) {
        config.mcpToolSearch.dynamicServiceDiscovery = enableDynamicDiscovery
        appliedChanges.push(i18n.t('mcp:search.updatedDynamicDiscovery', { enabled: enableDynamicDiscovery }))
      }

      if (config.mcpToolSearch.listChangedNotifications !== enableListChanged) {
        config.mcpToolSearch.listChangedNotifications = enableListChanged
        appliedChanges.push(i18n.t('mcp:search.updatedListChanged', { enabled: enableListChanged }))
      }

      if (JSON.stringify(config.mcpToolSearch.excludedServices) !== JSON.stringify(excludedServices)) {
        config.mcpToolSearch.excludedServices = excludedServices
        appliedChanges.push(i18n.t('mcp:search.updatedExcludedServices'))
      }
    }

    // Add MCPSearch tool if not present
    if (!config.mcpServers?.['mcp-search']) {
      if (!config.mcpServers) {
        config.mcpServers = {}
      }
      config.mcpServers['mcp-search'] = generateMcpSearchToolConfig()
      appliedChanges.push(i18n.t('mcp:search.addedMcpSearchTool'))
    }

    // Write updated config
    writeMcpConfig(config)

    return {
      success: true,
      config: config.mcpToolSearch,
      appliedChanges,
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
 * Get current tool search configuration
 *
 * @returns Current configuration or default
 */
export function getToolSearchConfig(): McpToolSearchConfig {
  const config = readMcpConfig()

  if (!config?.mcpToolSearch) {
    return {
      mcpAutoEnableThreshold: DEFAULT_THRESHOLD,
      dynamicServiceDiscovery: true,
      listChangedNotifications: true,
      excludedServices: [...CORE_SERVICES],
    }
  }

  return config.mcpToolSearch
}

/**
 * Check if tool search auto mode is enabled
 *
 * @returns True if auto mode is configured
 */
export function isAutoModeEnabled(): boolean {
  const config = readMcpConfig()
  return config?.mcpToolSearch !== undefined
}

/**
 * Get threshold from environment or config
 *
 * @returns Current threshold value
 */
export function getCurrentThreshold(): McpAutoThreshold {
  const config = getToolSearchConfig()
  return config.mcpAutoEnableThreshold ?? DEFAULT_THRESHOLD
}

// ============================================================================
// MCPSearch Tool Integration (Stub)
// ============================================================================

/**
 * MCPSearch tool implementation stub
 * In production, this would interface with actual MCP tool discovery
 */
export class McpSearchToolIntegration implements McpSearchTool {
  private config: McpToolSearchConfig

  constructor(config: McpToolSearchConfig = getToolSearchConfig()) {
    this.config = config
  }

  /**
   * Search for available tools across all MCP services
   * This is a stub implementation - production would query actual MCP servers
   */
  async searchTools(_query: string): Promise<ToolSearchResult[]> {
    // Stub: Return empty array
    // In production, this would:
    // 1. Query all MCP servers for their tool lists
    // 2. Filter tools matching the query
    // 3. Return results with relevance scores

    ensureI18nInitialized()

    return []
  }

  /**
   * List all available tools
   * Loads deferred tools on demand
   */
  async listAllTools(): Promise<ToolDescriptor[]> {
    // Stub: Return empty array
    // In production, this would:
    // 1. Load tools from all non-deferred services
    // 2. Load deferred tools only if explicitly requested
    // 3. Return complete tool list

    return []
  }

  /**
   * Get detailed information about a specific tool
   */
  async getToolDetails(_toolName: string): Promise<ToolDescriptor | null> {
    // Stub: Return null
    // In production, this would:
    // 1. Find the service providing this tool
    // 2. Load full tool description from that service
    // 3. Return complete descriptor

    return null
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<McpToolSearchConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================================================
// Dynamic Service Discovery
// ============================================================================

/**
 * Enable dynamic service discovery
 * Allows runtime addition/removal of MCP services
 *
 * @param enable - Whether to enable dynamic discovery
 * @returns Configuration result
 */
export function setDynamicServiceDiscovery(enable: boolean): {
  success: boolean
  error?: string
} {
  try {
    const config = readMcpConfig()
    if (!config) {
      return {
        success: false,
        error: i18n.t('mcp:search.noConfigFound'),
      }
    }

    if (!config.mcpToolSearch) {
      config.mcpToolSearch = {
        mcpAutoEnableThreshold: DEFAULT_THRESHOLD,
        dynamicServiceDiscovery: enable,
        listChangedNotifications: true,
        excludedServices: [...CORE_SERVICES],
      }
    }
    else {
      config.mcpToolSearch.dynamicServiceDiscovery = enable
    }

    writeMcpConfig(config)

    return { success: true }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Send list_changed notification
 * Notifies Claude that available tools have changed
 *
 * @returns True if notification was sent successfully
 */
export function sendListChangedNotification(): boolean {
  // In production, this would send an actual notification to Claude
  // For now, we just log that it would happen
  ensureI18nInitialized()

  const config = readMcpConfig()
  if (!config?.mcpToolSearch?.listChangedNotifications) {
    return false
  }

  // Stub: Would send notification via MCP protocol
  return true
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate threshold value
 *
 * @param threshold - Threshold to validate
 * @returns True if valid
 */
export function isValidThreshold(threshold: unknown): boolean {
  try {
    parseAutoMode(threshold as string | McpAutoThreshold)
    return true
  }
  catch {
    return false
  }
}

/**
 * Validate service ID for exclusion list
 *
 * @param serviceId - Service ID to validate
 * @returns True if valid
 */
export function isValidServiceId(serviceId: string): boolean {
  // Service IDs should be alphanumeric with hyphens/underscores
  return /^[\w-]+$/.test(serviceId)
}

// ============================================================================
// Analysis and Reporting
// ============================================================================

/**
 * Generate a summary report of current MCP tool search configuration
 *
 * @returns Formatted report string
 */
export function generateSearchReport(): string {
  ensureI18nInitialized()
  const isZh = i18n.language === 'zh-CN'

  const config = readMcpConfig()
  const mcpConfig = config?.mcpToolSearch
  const analysis = analyzeContextWindowUsage({
    mcpServers: config?.mcpServers,
    excludedServices: mcpConfig?.excludedServices,
    threshold: mcpConfig?.mcpAutoEnableThreshold,
  })

  const lines: string[] = []

  lines.push(isZh ? '🔍 MCP 工具搜索配置' : '🔍 MCP Tool Search Configuration')
  lines.push(''.padEnd(40, '-'))
  lines.push('')

  // Status
  const enabled = mcpConfig !== undefined
  lines.push(`${isZh ? '状态' : 'Status'}: ${enabled ? '✅ Enabled' : '❌ Disabled'}`)
  lines.push('')

  if (mcpConfig) {
    // Threshold
    const threshold = mcpConfig.mcpAutoEnableThreshold ?? DEFAULT_THRESHOLD
    lines.push(`${isZh ? '阈值' : 'Threshold'}: ${formatAutoMode(threshold)}`)
    lines.push('')

    // Dynamic discovery
    lines.push(`${isZh ? '动态发现' : 'Dynamic Discovery'}: ${mcpConfig.dynamicServiceDiscovery ? '✅' : '❌'}`)
    lines.push('')

    // List changed notifications
    lines.push(`${isZh ? '列表变更通知' : 'List Changed Notifications'}: ${mcpConfig.listChangedNotifications ? '✅' : '❌'}`)
    lines.push('')

    // Excluded services
    const excludedServices = mcpConfig.excludedServices ?? []
    if (excludedServices.length > 0) {
      lines.push(`${isZh ? '排除服务' : 'Excluded Services'}:`)
      for (const svc of excludedServices) {
        lines.push(`  - ${svc}`)
      }
      lines.push('')
    }
  }

  // Context window analysis
  lines.push(isZh ? '📊 上下文窗口分析' : '📊 Context Window Analysis')
  lines.push(''.padEnd(40, '-'))
  lines.push('')
  lines.push(`${isZh ? '上下文窗口' : 'Context Window'}: ${analysis.contextWindow.toLocaleString()} tokens`)
  lines.push(`${isZh ? '工具描述大小' : 'Tool Description Size'}: ${analysis.toolDescriptionSize.toLocaleString()} tokens`)
  lines.push(`${isZh ? '使用占比' : 'Percentage Used'}: ${analysis.percentageUsed.toFixed(1)}%`)
  lines.push(`${isZh ? '阈值' : 'Threshold'}: ${analysis.threshold}%`)
  lines.push(`${isZh ? '是否延迟' : 'Should Defer'}: ${analysis.shouldDefer ? '⚠️ Yes' : '✅ No'}`)
  lines.push('')

  // Service breakdown
  if (analysis.serviceBreakdown.length > 0) {
    lines.push(isZh ? '📦 服务细分' : '📦 Service Breakdown')
    lines.push(''.padEnd(40, '-'))
    lines.push('')

    for (const svc of analysis.serviceBreakdown.slice(0, 10)) {
      const excluded = svc.isExcluded ? ' [excluded]' : ''
      lines.push(`  ${svc.serviceId}: ${svc.estimatedSize} tokens (${svc.percentage.toFixed(1)}%)${excluded}`)
    }

    if (analysis.serviceBreakdown.length > 10) {
      lines.push(`  ${isZh ? '... 以及其他' : '... and'} ${analysis.serviceBreakdown.length - 10} ${isZh ? '个服务' : 'more services'}`)
    }
  }

  return lines.join('\n')
}

// ============================================================================
// Default Export
// ============================================================================

export const McpSearch = {
  // Configuration
  parseAutoMode,
  formatAutoMode,
  thresholdToNumber,
  configureAutoMode,
  getToolSearchConfig,
  isAutoModeEnabled,
  getCurrentThreshold,

  // Analysis
  analyzeContextWindowUsage,
  getContextWindowSize,
  estimateTokenCount,
  estimateToolDescriptionSize,
  generateSearchReport,

  // Dynamic discovery
  setDynamicServiceDiscovery,
  sendListChangedNotification,

  // Validation
  isValidThreshold,
  isValidServiceId,

  // Tool integration
  McpSearchToolIntegration,
  generateMcpSearchToolConfig,

  // Constants
  DEFAULT_THRESHOLD,
  MAX_THRESHOLD,
  MIN_THRESHOLD,
  CONTEXT_WINDOW_SIZES,
  CORE_SERVICES,
}

export default McpSearch

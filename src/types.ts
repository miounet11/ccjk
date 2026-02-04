import type { McpAutoThreshold } from './core/mcp-search'
import type { InstallMethod } from './utils/platform'

// Re-export MCP search types for convenience
export type { ContextWindowAnalysis, McpAutoThreshold, ServiceToolBreakdown } from './core/mcp-search'

// Re-export LSP types for convenience (v3.8+)
export type * from './types/lsp'

export interface McpService {
  id: string
  name: string
  description: string
  requiresApiKey: boolean
  apiKeyPrompt?: string
  apiKeyPlaceholder?: string
  apiKeyEnvVar?: string
  config: McpServerConfig
}

export interface McpServerConfig {
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  startup_timeout_ms?: number
}

/**
 * MCP Tool Search configuration for Claude Code CLI 2.1.7+
 * Part of ClaudeConfiguration for deferred tool loading
 */
export interface McpToolSearchConfig {
  /**
   * Auto mode threshold percentage (0-100) or special values
   * - Number: Defer tool loading when descriptions exceed this % of context window
   * - 'always': Load all tools immediately (0% threshold)
   * - 'never': Defer all tools until requested (100% threshold)
   * @default 10 (per Claude Code 2.1.7 spec)
   */
  mcpAutoEnableThreshold?: McpAutoThreshold

  /**
   * Enable dynamic service discovery
   * Allows runtime addition/removal of MCP services without restart
   * @default true
   */
  dynamicServiceDiscovery?: boolean

  /**
   * Enable list_changed notifications
   * When enabled, Claude receives notifications when available tools change
   * @default true
   */
  listChangedNotifications?: boolean

  /**
   * Services excluded from auto-mode (always loaded immediately)
   * Core services like 'mcp-search', 'context7' are always excluded
   * @default ['mcp-search', 'context7', 'sqlite']
   */
  excludedServices?: string[]
}

export interface ClaudeConfiguration {
  mcpServers: Record<string, McpServerConfig>
  hasCompletedOnboarding?: boolean
  customApiKeyResponses?: {
    approved: string[]
    rejected: string[]
  }
  env?: Record<string, string>
  primaryApiKey?: string
  installMethod?: InstallMethod

  /**
   * MCP Tool Search configuration (v3.8+)
   * Enables auto-mode for deferred tool loading when descriptions exceed threshold
   * @see https://docs.anthropic.com/en/docs/build-with-claude/mcp#tool-search-auto-mode
   */
  mcpToolSearch?: McpToolSearchConfig
}

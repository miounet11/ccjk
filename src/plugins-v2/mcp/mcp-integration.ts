/**
 * MCP Integration Module
 *
 * Manages MCP (Model Context Protocol) server connections and provides
 * tool information for Agent composition.
 *
 * Features:
 * - Read MCP configuration from ~/.claude.json
 * - Discover available MCP tools from configured servers
 * - Provide tool information for AgentRuntime
 * - Optional tool call proxy for agent execution
 *
 * @module plugins-v2/mcp/mcp-integration
 */

import type { ClaudeConfiguration, McpServerConfig } from '../../types'
import type { AgentMcpRef, McpToolInfo } from '../types'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'

// ============================================================================
// Constants
// ============================================================================

/**
 * Default path to Claude desktop configuration file
 */
const CLAUDE_CONFIG_PATH = join(homedir(), '.claude.json')

/**
 * Cache TTL for tool information (ms)
 */
const TOOL_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// Types
// ============================================================================

/**
 * MCP server connection status
 */
export type McpServerStatus = 'connected' | 'disconnected' | 'error' | 'unknown'

/**
 * MCP server information with status
 */
export interface McpServerInfo {
  /** Server name */
  name: string
  /** Server configuration */
  config: McpServerConfig
  /** Connection status */
  status: McpServerStatus
  /** Available tools (if discovered) */
  tools?: McpToolInfo[]
  /** Last error message */
  error?: string
  /** Last update timestamp */
  lastUpdated?: number
}

/**
 * Tool call request
 */
export interface McpToolCallRequest {
  /** Server name */
  server: string
  /** Tool name */
  tool: string
  /** Tool arguments */
  arguments: Record<string, unknown>
}

/**
 * Tool call response
 */
export interface McpToolCallResponse {
  /** Whether the call succeeded */
  success: boolean
  /** Result data */
  result?: unknown
  /** Error message if failed */
  error?: string
  /** Execution duration (ms) */
  duration?: number
}

// ============================================================================
// MCP Server Manager Class
// ============================================================================

/**
 * McpServerManager
 *
 * Manages MCP server connections and tool discovery for the plugin system.
 * Reads configuration from Claude's config file and provides tool information
 * for agent composition.
 */
export class McpServerManager {
  private servers: Map<string, McpServerInfo> = new Map()
  private toolCache: Map<string, { tools: McpToolInfo[], timestamp: number }> = new Map()
  private configPath: string
  private initialized = false

  constructor(configPath: string = CLAUDE_CONFIG_PATH) {
    this.configPath = configPath
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the manager by loading MCP configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.loadConfiguration()
    this.initialized = true
  }

  /**
   * Load MCP configuration from file
   */
  private async loadConfiguration(): Promise<void> {
    const config = this.readConfigFile()
    if (!config?.mcpServers) {
      return
    }

    // Register all configured servers
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      this.servers.set(name, {
        name,
        config: serverConfig,
        status: 'unknown',
      })
    }
  }

  /**
   * Read the Claude configuration file
   */
  private readConfigFile(): ClaudeConfiguration | null {
    if (!existsSync(this.configPath)) {
      return null
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8')
      return JSON.parse(content) as ClaudeConfiguration
    }
    catch (error) {
      console.error(`Failed to read MCP config from ${this.configPath}:`, error)
      return null
    }
  }

  /**
   * Reload configuration (useful after config changes)
   */
  async reload(): Promise<void> {
    this.servers.clear()
    this.toolCache.clear()
    this.initialized = false
    await this.initialize()
  }

  // ==========================================================================
  // Server Management
  // ==========================================================================

  /**
   * Get all configured MCP servers
   */
  getServers(): McpServerInfo[] {
    return Array.from(this.servers.values())
  }

  /**
   * Get a specific server by name
   */
  getServer(name: string): McpServerInfo | undefined {
    return this.servers.get(name)
  }

  /**
   * Get server names
   */
  getServerNames(): string[] {
    return Array.from(this.servers.keys())
  }

  /**
   * Check if a server is configured
   */
  hasServer(name: string): boolean {
    return this.servers.has(name)
  }

  // ==========================================================================
  // Tool Discovery
  // ==========================================================================

  /**
   * Get available tools from a specific MCP server
   *
   * This method attempts to discover tools by querying the MCP server.
   * Results are cached to avoid repeated queries.
   */
  async getServerTools(serverName: string): Promise<McpToolInfo[]> {
    const server = this.servers.get(serverName)
    if (!server) {
      return []
    }

    // Check cache
    const cached = this.toolCache.get(serverName)
    if (cached && Date.now() - cached.timestamp < TOOL_CACHE_TTL) {
      return cached.tools
    }

    // Discover tools
    const tools = await this.discoverTools(server)

    // Update cache
    this.toolCache.set(serverName, {
      tools,
      timestamp: Date.now(),
    })

    // Update server info
    server.tools = tools
    server.lastUpdated = Date.now()

    return tools
  }

  /**
   * Get all available tools from all configured servers
   */
  async getAllTools(): Promise<McpToolInfo[]> {
    const allTools: McpToolInfo[] = []

    for (const serverName of this.servers.keys()) {
      const tools = await this.getServerTools(serverName)
      allTools.push(...tools)
    }

    return allTools
  }

  /**
   * Get tools for specific servers (used by AgentRuntime)
   *
   * @param mcpRefs - Array of MCP server references from agent definition
   */
  async getToolsForAgent(mcpRefs: AgentMcpRef[]): Promise<McpToolInfo[]> {
    const tools: McpToolInfo[] = []

    for (const ref of mcpRefs) {
      const serverTools = await this.getServerTools(ref.serverName)

      // Filter tools if specific tools are requested
      if (ref.tools && ref.tools.length > 0) {
        const filteredTools = serverTools.filter(t => ref.tools!.includes(t.name))
        tools.push(...filteredTools)
      }
      else {
        tools.push(...serverTools)
      }
    }

    return tools
  }

  /**
   * Discover tools from an MCP server
   *
   * This is a simplified implementation that returns predefined tools
   * based on known MCP server types. In a full implementation, this would
   * actually connect to the MCP server and query its capabilities.
   */
  private async discoverTools(server: McpServerInfo): Promise<McpToolInfo[]> {
    const tools: McpToolInfo[] = []

    try {
      // For stdio-based servers, we can try to query tools
      if (server.config.type === 'stdio' && server.config.command) {
        const discoveredTools = await this.queryStdioServerTools(server)
        if (discoveredTools.length > 0) {
          server.status = 'connected'
          return discoveredTools
        }
      }

      // For SSE-based servers, we would need HTTP connection
      if (server.config.type === 'sse' && server.config.url) {
        const discoveredTools = await this.querySseServerTools(server)
        if (discoveredTools.length > 0) {
          server.status = 'connected'
          return discoveredTools
        }
      }

      // Fallback: Return tools based on known server patterns
      const knownTools = this.getKnownServerTools(server.name, server.config)
      if (knownTools.length > 0) {
        server.status = 'unknown' // We don't know actual status
        return knownTools
      }

      server.status = 'unknown'
      return tools
    }
    catch (error) {
      server.status = 'error'
      server.error = error instanceof Error ? error.message : String(error)
      return tools
    }
  }

  /**
   * Query tools from a stdio-based MCP server
   *
   * Note: This is a placeholder implementation. Real MCP tool discovery
   * would require implementing the MCP protocol handshake.
   */
  private async queryStdioServerTools(_server: McpServerInfo): Promise<McpToolInfo[]> {
    // In a real implementation, we would:
    // 1. Spawn the MCP server process
    // 2. Send an initialize request
    // 3. Send a tools/list request
    // 4. Parse the response

    // For now, return empty and rely on known server patterns
    return []
  }

  /**
   * Query tools from an SSE-based MCP server
   *
   * Note: This is a placeholder implementation.
   */
  private async querySseServerTools(_server: McpServerInfo): Promise<McpToolInfo[]> {
    // In a real implementation, we would:
    // 1. Connect to the SSE endpoint
    // 2. Send a tools/list request
    // 3. Parse the response

    // For now, return empty and rely on known server patterns
    return []
  }

  /**
   * Get known tools for common MCP servers
   *
   * This provides tool information for well-known MCP servers
   * without needing to actually connect to them.
   */
  private getKnownServerTools(serverName: string, config: McpServerConfig): McpToolInfo[] {
    const tools: McpToolInfo[] = []

    // Detect server type from command or name
    const command = config.command || ''
    const args = config.args?.join(' ') || ''
    const identifier = `${serverName} ${command} ${args}`.toLowerCase()

    // Filesystem MCP server
    if (identifier.includes('filesystem') || identifier.includes('fs')) {
      tools.push(
        {
          server: serverName,
          name: 'read_file',
          description: 'Read the contents of a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the file to read' },
            },
            required: ['path'],
          },
        },
        {
          server: serverName,
          name: 'write_file',
          description: 'Write content to a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the file to write' },
              content: { type: 'string', description: 'Content to write' },
            },
            required: ['path', 'content'],
          },
        },
        {
          server: serverName,
          name: 'list_directory',
          description: 'List contents of a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the directory' },
            },
            required: ['path'],
          },
        },
      )
    }

    // Exa search MCP server
    if (identifier.includes('exa')) {
      tools.push(
        {
          server: serverName,
          name: 'web_search',
          description: 'Search the web using Exa',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              numResults: { type: 'number', description: 'Number of results to return' },
            },
            required: ['query'],
          },
        },
        {
          server: serverName,
          name: 'find_similar',
          description: 'Find similar content to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to find similar content for' },
            },
            required: ['url'],
          },
        },
      )
    }

    // GitHub MCP server
    if (identifier.includes('github')) {
      tools.push(
        {
          server: serverName,
          name: 'search_repositories',
          description: 'Search GitHub repositories',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
        {
          server: serverName,
          name: 'get_file_contents',
          description: 'Get contents of a file from a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              path: { type: 'string', description: 'File path' },
            },
            required: ['owner', 'repo', 'path'],
          },
        },
        {
          server: serverName,
          name: 'create_issue',
          description: 'Create a new issue in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              title: { type: 'string', description: 'Issue title' },
              body: { type: 'string', description: 'Issue body' },
            },
            required: ['owner', 'repo', 'title'],
          },
        },
      )
    }

    // Playwright MCP server
    if (identifier.includes('playwright')) {
      tools.push(
        {
          server: serverName,
          name: 'browser_navigate',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to navigate to' },
            },
            required: ['url'],
          },
        },
        {
          server: serverName,
          name: 'browser_snapshot',
          description: 'Take an accessibility snapshot of the page',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          server: serverName,
          name: 'browser_click',
          description: 'Click on an element',
          inputSchema: {
            type: 'object',
            properties: {
              element: { type: 'string', description: 'Element description' },
              ref: { type: 'string', description: 'Element reference' },
            },
            required: ['element', 'ref'],
          },
        },
      )
    }

    // Context7 MCP server
    if (identifier.includes('context7')) {
      tools.push(
        {
          server: serverName,
          name: 'resolve-library-id',
          description: 'Resolve a library name to Context7 library ID',
          inputSchema: {
            type: 'object',
            properties: {
              libraryName: { type: 'string', description: 'Library name to search for' },
            },
            required: ['libraryName'],
          },
        },
        {
          server: serverName,
          name: 'query-docs',
          description: 'Query documentation for a library',
          inputSchema: {
            type: 'object',
            properties: {
              libraryId: { type: 'string', description: 'Context7 library ID' },
              query: { type: 'string', description: 'Query string' },
            },
            required: ['libraryId', 'query'],
          },
        },
      )
    }

    // Fetch/HTTP MCP server
    if (identifier.includes('fetch') || identifier.includes('http')) {
      tools.push({
        server: serverName,
        name: 'fetch',
        description: 'Fetch content from a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to fetch' },
            method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
            headers: { type: 'object', description: 'Request headers' },
            body: { type: 'string', description: 'Request body' },
          },
          required: ['url'],
        },
      })
    }

    // Memory/Knowledge MCP server
    if (identifier.includes('memory') || identifier.includes('knowledge')) {
      tools.push(
        {
          server: serverName,
          name: 'store_memory',
          description: 'Store information in memory',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Memory key' },
              value: { type: 'string', description: 'Value to store' },
            },
            required: ['key', 'value'],
          },
        },
        {
          server: serverName,
          name: 'retrieve_memory',
          description: 'Retrieve information from memory',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Memory key' },
            },
            required: ['key'],
          },
        },
      )
    }

    return tools
  }

  // ==========================================================================
  // Tool Execution (Optional Proxy)
  // ==========================================================================

  /**
   * Execute a tool call through the MCP server
   *
   * Note: This is a placeholder for future implementation.
   * In a full implementation, this would:
   * 1. Connect to the appropriate MCP server
   * 2. Send the tool call request
   * 3. Return the response
   *
   * For now, agents should use Claude Code's native MCP integration.
   */
  async callTool(request: McpToolCallRequest): Promise<McpToolCallResponse> {
    const server = this.servers.get(request.server)
    if (!server) {
      return {
        success: false,
        error: `Server not found: ${request.server}`,
      }
    }

    const startTime = Date.now()

    try {
      // Placeholder: In a real implementation, we would execute the tool
      // through the MCP protocol

      return {
        success: false,
        error: 'Direct tool execution not yet implemented. Use Claude Code\'s native MCP integration.',
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get tool information formatted for agent system prompt
   */
  formatToolsForPrompt(tools: McpToolInfo[]): string {
    if (tools.length === 0) {
      return ''
    }

    const lines: string[] = ['## Available MCP Tools', '']

    // Group by server
    const byServer = new Map<string, McpToolInfo[]>()
    for (const tool of tools) {
      const serverTools = byServer.get(tool.server) || []
      serverTools.push(tool)
      byServer.set(tool.server, serverTools)
    }

    for (const [server, serverTools] of byServer) {
      lines.push(`### ${server}`)
      lines.push('')

      for (const tool of serverTools) {
        lines.push(`**${tool.name}**: ${tool.description}`)

        // Add parameter info
        const schema = tool.inputSchema as { properties?: Record<string, { type: string, description?: string }>, required?: string[] }
        if (schema.properties) {
          const params = Object.entries(schema.properties)
          if (params.length > 0) {
            lines.push('Parameters:')
            for (const [name, prop] of params) {
              const required = schema.required?.includes(name) ? ' (required)' : ''
              lines.push(`  - \`${name}\`: ${prop.description || prop.type}${required}`)
            }
          }
        }
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * Clear tool cache
   */
  clearCache(): void {
    this.toolCache.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: McpServerManager | null = null

/**
 * Get the singleton McpServerManager instance
 */
export async function getMcpServerManager(): Promise<McpServerManager> {
  if (!managerInstance) {
    managerInstance = new McpServerManager()
    await managerInstance.initialize()
  }
  return managerInstance
}

/**
 * Reset the manager instance (for testing)
 */
export function resetMcpServerManager(): void {
  managerInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get all available MCP tools
 */
export async function getAllMcpTools(): Promise<McpToolInfo[]> {
  const manager = await getMcpServerManager()
  return manager.getAllTools()
}

/**
 * Get MCP tools for an agent
 */
export async function getMcpToolsForAgent(mcpRefs: AgentMcpRef[]): Promise<McpToolInfo[]> {
  const manager = await getMcpServerManager()
  return manager.getToolsForAgent(mcpRefs)
}

/**
 * Get configured MCP server names
 */
export async function getMcpServerNames(): Promise<string[]> {
  const manager = await getMcpServerManager()
  return manager.getServerNames()
}

/**
 * Check if an MCP server is configured
 */
export async function hasMcpServer(name: string): Promise<boolean> {
  const manager = await getMcpServerManager()
  return manager.hasServer(name)
}

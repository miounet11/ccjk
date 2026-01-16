/**
 * Tool Router - Core Routing Logic
 *
 * Routes tool requests to the most appropriate tool based on priority configuration
 */

import type { ToolConflict } from './conflicts'
import type { ToolMetadata, ToolPriorityConfig } from './priorities'
import { ConflictDetector, ConflictResolver } from './conflicts'
import { DEFAULT_TOOL_PRIORITIES, TOOL_METADATA } from './priorities'

/**
 * Tool selection result
 */
export interface ToolSelection {
  /** Selected tool name */
  tool: string
  /** Category the tool belongs to */
  category: string
  /** Reason for selection */
  reason: string
  /** Alternative tools available */
  alternatives: string[]
  /** Whether this was a fallback selection */
  isFallback: boolean
}

/**
 * Tool routing options
 */
export interface RoutingOptions {
  /** Custom priority configuration */
  config?: ToolPriorityConfig
  /** Preferred tool (override priority) */
  preferredTool?: string
  /** Tools to exclude from selection */
  excludeTools?: string[]
  /** Known MCP tools for conflict detection */
  mcpTools?: string[]
}

/**
 * ToolRouter class
 *
 * Main class for routing tool requests to appropriate tools
 */
export class ToolRouter {
  private config: ToolPriorityConfig
  private conflictDetector: ConflictDetector
  private conflictResolver: ConflictResolver
  private mcpTools: string[]

  /**
   * Create a new ToolRouter instance
   *
   * @param config - Custom priority configuration (optional)
   * @param mcpTools - Known MCP tools for conflict detection
   */
  constructor(config?: ToolPriorityConfig, mcpTools: string[] = []) {
    this.config = config || DEFAULT_TOOL_PRIORITIES
    this.conflictDetector = new ConflictDetector()
    this.conflictResolver = new ConflictResolver()
    this.mcpTools = mcpTools
  }

  /**
   * Set known MCP tools for conflict detection
   */
  setMcpTools(mcpTools: string[]): void {
    this.mcpTools = mcpTools
  }

  /**
   * Check if a tool is available (not conflicting with higher priority tools)
   */
  private isToolAvailable(tool: string): boolean {
    // Check if tool exists in metadata
    if (!TOOL_METADATA[tool]) {
      return false
    }

    // Check for conflicts with MCP tools
    const conflicts = this.conflictDetector.detectConflicts([tool], this.mcpTools)
    if (conflicts.length === 0) {
      return true
    }

    // Tool is available if it's the preferred one in conflict resolution
    const conflict = conflicts[0]
    return conflict.resolution === 'prefer_skill'
  }

  /**
   * Select the best tool for a given category
   *
   * @param category - Tool category (e.g., 'browser', 'search')
   * @param options - Routing options
   * @returns Tool selection result or null if no tool available
   */
  selectTool(category: string, options: RoutingOptions = {}): ToolSelection | null {
    const categoryConfig = this.config.categories[category]
    if (!categoryConfig) {
      return null
    }

    const { preferredTool, excludeTools = [], mcpTools } = options

    // Update MCP tools if provided
    if (mcpTools) {
      this.mcpTools = mcpTools
    }

    // Filter available tools
    const availableTools = categoryConfig.tools.filter((tool) => {
      if (excludeTools.includes(tool)) {
        return false
      }
      return this.isToolAvailable(tool)
    })

    if (availableTools.length === 0) {
      return null
    }

    // Check for preferred tool
    if (preferredTool && availableTools.includes(preferredTool)) {
      return {
        tool: preferredTool,
        category,
        reason: 'User preferred tool',
        alternatives: availableTools.filter(t => t !== preferredTool),
        isFallback: false,
      }
    }

    // Select highest priority tool
    const selectedTool = availableTools[0]
    const metadata = TOOL_METADATA[selectedTool]

    return {
      tool: selectedTool,
      category,
      reason: this.generateSelectionReason(selectedTool, metadata),
      alternatives: availableTools.slice(1),
      isFallback: false,
    }
  }

  /**
   * Select tool with fallback behavior
   *
   * @param category - Tool category
   * @param primaryTool - Primary tool to try first
   * @param options - Routing options
   * @returns Tool selection result
   */
  selectWithFallback(
    category: string,
    primaryTool: string,
    options: RoutingOptions = {},
  ): ToolSelection | null {
    const categoryConfig = this.config.categories[category]
    if (!categoryConfig) {
      return null
    }

    // Check if primary tool is available
    if (this.isToolAvailable(primaryTool)) {
      const alternatives = categoryConfig.tools.filter(t => t !== primaryTool)
      return {
        tool: primaryTool,
        category,
        reason: 'Primary tool available',
        alternatives,
        isFallback: false,
      }
    }

    // Handle fallback based on configuration
    switch (categoryConfig.fallbackBehavior) {
      case 'next': {
        // Try next available tool
        const selection = this.selectTool(category, {
          ...options,
          excludeTools: [...(options.excludeTools || []), primaryTool],
        })

        if (selection) {
          return {
            ...selection,
            reason: `Fallback: ${primaryTool} unavailable, using ${selection.tool}`,
            isFallback: true,
          }
        }
        return null
      }

      case 'error':
        // Return null to indicate error
        return null

      case 'prompt':
        // Return selection with prompt flag
        return {
          tool: '',
          category,
          reason: `Primary tool ${primaryTool} unavailable, user selection required`,
          alternatives: categoryConfig.tools.filter(t => t !== primaryTool),
          isFallback: true,
        }

      default:
        return null
    }
  }

  /**
   * Get all available tools in a category
   *
   * @param category - Tool category
   * @returns Array of available tool names
   */
  getAvailableTools(category: string): string[] {
    const categoryConfig = this.config.categories[category]
    if (!categoryConfig) {
      return []
    }

    return categoryConfig.tools.filter(tool => this.isToolAvailable(tool))
  }

  /**
   * Get tool metadata
   *
   * @param tool - Tool name
   * @returns Tool metadata or undefined
   */
  getToolMetadata(tool: string): ToolMetadata | undefined {
    return TOOL_METADATA[tool]
  }

  /**
   * Detect conflicts in current configuration
   *
   * @returns Array of detected conflicts
   */
  detectConflicts(): ToolConflict[] {
    const skillNames = Object.keys(TOOL_METADATA).filter(
      tool => TOOL_METADATA[tool].type === 'skill' || TOOL_METADATA[tool].type === 'builtin',
    )
    return this.conflictDetector.detectConflicts(skillNames, this.mcpTools)
  }

  /**
   * Get recommended tool for a category
   *
   * @param category - Tool category
   * @returns Recommended tool name or null
   */
  getRecommendedTool(category: string): string | null {
    const selection = this.selectTool(category)
    return selection?.tool || null
  }

  /**
   * Update priority configuration
   *
   * @param config - New priority configuration
   */
  updateConfig(config: ToolPriorityConfig): void {
    this.config = config
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolPriorityConfig {
    return this.config
  }

  /**
   * Get conflict report
   */
  getConflictReport(): string {
    const skillNames = Object.keys(TOOL_METADATA).filter(
      tool => TOOL_METADATA[tool].type === 'skill' || TOOL_METADATA[tool].type === 'builtin',
    )
    return this.conflictResolver.getConflictReport(skillNames, this.mcpTools)
  }

  /**
   * Generate selection reason based on metadata
   */
  private generateSelectionReason(tool: string, metadata?: ToolMetadata): string {
    if (!metadata) {
      return `${tool} is the highest priority available tool`
    }

    const reasons: string[] = []

    if (metadata.performance?.speed === 'fast') {
      reasons.push('fast')
    }
    if (metadata.performance?.memory === 'light') {
      reasons.push('lightweight')
    }
    if (metadata.type === 'builtin' || metadata.type === 'skill') {
      reasons.push('built-in')
    }
    if (metadata.type === 'cli') {
      reasons.push('zero-config')
    }

    if (reasons.length === 0) {
      return `${tool} is the highest priority available tool`
    }

    return `${tool} selected: ${reasons.join(', ')}`
  }
}

/**
 * Create a default ToolRouter instance
 */
export function createToolRouter(mcpTools: string[] = []): ToolRouter {
  return new ToolRouter(undefined, mcpTools)
}

/**
 * Quick tool selection for common categories
 */
export function selectBrowserTool(options?: RoutingOptions): ToolSelection | null {
  const router = createToolRouter(options?.mcpTools)
  return router.selectTool('browser', options)
}

export function selectSearchTool(options?: RoutingOptions): ToolSelection | null {
  const router = createToolRouter(options?.mcpTools)
  return router.selectTool('search', options)
}

export function selectFileSearchTool(options?: RoutingOptions): ToolSelection | null {
  const router = createToolRouter(options?.mcpTools)
  return router.selectTool('fileSearch', options)
}

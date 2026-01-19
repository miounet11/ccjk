/**
 * Tool Router Module
 *
 * Implements Skills-over-MCP routing mechanism to prioritize
 * built-in tools over external MCP tools.
 *
 * @module tool-router
 */

export {
  checkToolAvailability,
  detectConflicts,
  formatConflictReport,
  generateSuggestions,
  getAvailableToolsInCategory,
  resolveConflict,
} from './conflicts'
export type { ToolAvailability, ToolConflict } from './conflicts'

export { DEFAULT_TOOL_PRIORITIES, TOOL_METADATA } from './priorities'
export type { FallbackBehavior, ToolCategory, ToolMetadata, ToolPriorityConfig } from './priorities'

export { createToolRouter, selectBrowserTool, selectFileSearchTool, selectSearchTool, ToolRouter } from './router'
export type { RoutingOptions, ToolSelection } from './router'

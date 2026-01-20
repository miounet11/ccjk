/**
 * Main entry point for code-tools module
 */

import { AiderTool } from './adapters/aider'
import { ClaudeCodeTool } from './adapters/claude-code'
import { ClineTool } from './adapters/cline'
import { CodexTool } from './adapters/codex'
import { ContinueTool } from './adapters/continue'
import { CursorTool } from './adapters/cursor'
// Export core types and interfaces
// Auto-register all tools
import { ToolRegistry } from './core/tool-registry'

export * from './adapters/aider'
// Export adapters
export * from './adapters/claude-code'
export * from './adapters/cline'
export * from './adapters/codex'
export * from './adapters/continue'

export * from './adapters/cursor'
export * from './core/base-tool'
export * from './core/interfaces'
export * from './core/tool-factory'
// Export convenience functions
export { createTool } from './core/tool-factory'
export * from './core/tool-registry'

// Get registry instance
const registry = ToolRegistry.getInstance()

// Register all tools
registry.registerToolClass('claude-code', ClaudeCodeTool)
registry.registerToolClass('codex', CodexTool)
registry.registerToolClass('aider', AiderTool)
registry.registerToolClass('continue', ContinueTool)
registry.registerToolClass('cline', ClineTool)
registry.registerToolClass('cursor', CursorTool)

export { getRegistry } from './core/tool-registry'
export * from './core/types'

/**
 * Main entry point for code-tools module
 */

import type { CodeToolType } from '../constants'
import type { RuntimeCapabilityDescriptor } from './core/types'
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

const RUNTIME_CAPABILITY_FALLBACKS: Partial<Record<CodeToolType, RuntimeCapabilityDescriptor>> = {
  myclaude: {
    runtime: 'myclaude',
    ownership: 'hybrid',
    configBackend: 'claude-family',
    native: {
      agentLoop: true,
      planTask: true,
      subagents: true,
      slashCommands: true,
      mcp: true,
      permissions: true,
      memory: true,
      ideIntegration: true,
      worktree: true,
      statusline: true,
    },
    managedByCcjk: {
      providerProfiles: true,
      modelRouting: true,
      configSync: true,
      permissionRepair: true,
      mcpBundles: true,
      doctor: true,
    },
  },
}

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

export function getRuntimeCapabilityDescriptor(name: CodeToolType | string): RuntimeCapabilityDescriptor | undefined {
  const normalizedName = name.toLowerCase() as CodeToolType
  return registry.getTool(normalizedName)?.getMetadata().runtime || RUNTIME_CAPABILITY_FALLBACKS[normalizedName]
}

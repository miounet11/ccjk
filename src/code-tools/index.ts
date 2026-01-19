/**
 * Main entry point for code-tools module
 */

// Export core types and interfaces
export * from './core/types';
export * from './core/interfaces';
export * from './core/base-tool';
export * from './core/tool-registry';
export * from './core/tool-factory';

// Export adapters
export * from './adapters/claude-code';
export * from './adapters/codex';
export * from './adapters/aider';
export * from './adapters/continue';
export * from './adapters/cline';
export * from './adapters/cursor';

// Auto-register all tools
import { ToolRegistry } from './core/tool-registry';
import { ClaudeCodeTool } from './adapters/claude-code';
import { CodexTool } from './adapters/codex';
import { AiderTool } from './adapters/aider';
import { ContinueTool } from './adapters/continue';
import { ClineTool } from './adapters/cline';
import { CursorTool } from './adapters/cursor';

// Get registry instance
const registry = ToolRegistry.getInstance();

// Register all tools
registry.registerToolClass('claude-code', ClaudeCodeTool);
registry.registerToolClass('codex', CodexTool);
registry.registerToolClass('aider', AiderTool);
registry.registerToolClass('continue', ContinueTool);
registry.registerToolClass('cline', ClineTool);
registry.registerToolClass('cursor', CursorTool);

// Export convenience functions
export { createTool } from './core/tool-factory';
export { getRegistry } from './core/tool-registry';

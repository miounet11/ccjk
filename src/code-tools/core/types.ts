/**
 * Core types for the code tool abstraction layer
 */

/**
 * Configuration for a code tool
 */
export interface ToolConfig {
  /** Tool name */
  name: string;
  /** Tool version */
  version?: string;
  /** Installation path */
  installPath?: string;
  /** API key or authentication token */
  apiKey?: string;
  /** Model to use (e.g., claude-opus-4, gpt-4) */
  model?: string;
  /** Additional tool-specific settings */
  settings?: Record<string, any>;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Installation status
 */
export interface InstallStatus {
  /** Whether the tool is installed */
  installed: boolean;
  /** Installation path if installed */
  path?: string;
  /** Version if installed */
  version?: string;
  /** Error message if check failed */
  error?: string;
}

/**
 * Tool execution result
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Output from the tool */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Exit code */
  exitCode?: number;
}

/**
 * Tool capabilities
 */
export interface ToolCapabilities {
  /** Supports chat/conversation mode */
  supportsChat: boolean;
  /** Supports file editing */
  supportsFileEdit: boolean;
  /** Supports code generation */
  supportsCodeGen: boolean;
  /** Supports code review */
  supportsReview: boolean;
  /** Supports testing */
  supportsTesting: boolean;
  /** Supports debugging */
  supportsDebugging: boolean;
  /** Custom capabilities */
  custom?: Record<string, boolean>;
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  /** Tool name */
  name: string;
  /** Display name */
  displayName: string;
  /** Tool description */
  description: string;
  /** Tool version */
  version: string;
  /** Tool homepage URL */
  homepage?: string;
  /** Tool documentation URL */
  documentation?: string;
  /** Tool capabilities */
  capabilities: ToolCapabilities;
}

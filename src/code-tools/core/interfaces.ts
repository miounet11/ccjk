/**
 * Core interfaces for the code tool abstraction layer
 */

import {
  ToolConfig,
  InstallStatus,
  ExecutionResult,
  ToolMetadata,
} from './types';

/**
 * Base interface that all code tools must implement
 */
export interface ICodeTool {
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata;

  /**
   * Check if the tool is installed
   */
  isInstalled(): Promise<InstallStatus>;

  /**
   * Install the tool
   */
  install(): Promise<ExecutionResult>;

  /**
   * Uninstall the tool
   */
  uninstall(): Promise<ExecutionResult>;

  /**
   * Get current configuration
   */
  getConfig(): Promise<ToolConfig>;

  /**
   * Update configuration
   * @param updates Partial configuration to update
   */
  updateConfig(updates: Partial<ToolConfig>): Promise<void>;

  /**
   * Configure the tool with full config
   * @param config Complete configuration
   */
  configure(config: ToolConfig): Promise<void>;

  /**
   * Validate configuration
   * @param config Configuration to validate
   */
  validateConfig(config: Partial<ToolConfig>): Promise<boolean>;

  /**
   * Execute a command with the tool
   * @param command Command to execute
   * @param args Command arguments
   */
  execute(command: string, args?: string[]): Promise<ExecutionResult>;

  /**
   * Get tool version
   */
  getVersion(): Promise<string | undefined>;

  /**
   * Reset tool to default configuration
   */
  reset(): Promise<void>;
}

/**
 * Interface for tools that support chat/conversation
 */
export interface IChatTool extends ICodeTool {
  /**
   * Start a chat session
   * @param prompt Initial prompt
   */
  chat(prompt: string): Promise<ExecutionResult>;

  /**
   * Continue a chat session
   * @param message Message to send
   */
  continueChat(message: string): Promise<ExecutionResult>;

  /**
   * End chat session
   */
  endChat(): Promise<void>;
}

/**
 * Interface for tools that support file editing
 */
export interface IFileEditTool extends ICodeTool {
  /**
   * Edit a file
   * @param filePath Path to file
   * @param instructions Edit instructions
   */
  editFile(filePath: string, instructions: string): Promise<ExecutionResult>;

  /**
   * Edit multiple files
   * @param files Array of file paths
   * @param instructions Edit instructions
   */
  editFiles(files: string[], instructions: string): Promise<ExecutionResult>;
}

/**
 * Interface for tools that support code generation
 */
export interface ICodeGenTool extends ICodeTool {
  /**
   * Generate code
   * @param prompt Generation prompt
   * @param outputPath Optional output path
   */
  generateCode(prompt: string, outputPath?: string): Promise<ExecutionResult>;
}

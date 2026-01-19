/**
 * Factory for creating code tool instances
 */

import { ICodeTool } from './interfaces';
import { ToolRegistry } from './tool-registry';
import { ToolConfig } from './types';

/**
 * Factory for creating code tool instances
 */
export class ToolFactory {
  private registry: ToolRegistry;

  constructor(registry?: ToolRegistry) {
    this.registry = registry || ToolRegistry.getInstance();
  }

  /**
   * Create a tool instance by name
   */
  createTool(name: string, config?: Partial<ToolConfig>): ICodeTool {
    const tool = this.registry.getTool(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found in registry. Available tools: ${this.registry.getToolNames().join(', ')}`);
    }

    // Configure if config provided
    if (config) {
      tool.configure({ name, ...config }).catch(err => {
        console.warn(`Failed to configure tool '${name}':`, err);
      });
    }

    return tool;
  }

  /**
   * Create multiple tool instances
   */
  createTools(names: string[]): ICodeTool[] {
    return names.map(name => this.createTool(name));
  }

  /**
   * Create all registered tools
   */
  createAllTools(): ICodeTool[] {
    const names = this.registry.getToolNames();
    return this.createTools(names);
  }

  /**
   * Check if a tool can be created
   */
  canCreateTool(name: string): boolean {
    return this.registry.hasTool(name);
  }

  /**
   * Get available tool names
   */
  getAvailableTools(): string[] {
    return this.registry.getToolNames();
  }
}

/**
 * Convenience function to create a tool
 */
export function createTool(name: string, config?: Partial<ToolConfig>): ICodeTool {
  const factory = new ToolFactory();
  return factory.createTool(name, config);
}

/**
 * Tool registry for managing code tool instances
 */

import type { ICodeTool } from './interfaces'
import type { ToolMetadata } from './types'

/**
 * Registry for managing code tool instances
 */
export class ToolRegistry {
  private static instance: ToolRegistry
  private tools: Map<string, ICodeTool>
  private toolClasses: Map<string, new () => ICodeTool>

  private constructor() {
    this.tools = new Map()
    this.toolClasses = new Map()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  /**
   * Register a tool class
   */
  registerToolClass(name: string, toolClass: new () => ICodeTool): void {
    this.toolClasses.set(name.toLowerCase(), toolClass)
  }

  /**
   * Register a tool instance
   */
  registerTool(tool: ICodeTool): void {
    const metadata = tool.getMetadata()
    this.tools.set(metadata.name.toLowerCase(), tool)
  }

  /**
   * Get a tool instance by name
   */
  getTool(name: string): ICodeTool | undefined {
    const normalizedName = name.toLowerCase()

    // Check if instance already exists
    if (this.tools.has(normalizedName)) {
      return this.tools.get(normalizedName)
    }

    // Try to create instance from registered class
    const ToolClass = this.toolClasses.get(normalizedName)
    if (ToolClass) {
      const tool = new ToolClass()
      this.tools.set(normalizedName, tool)
      return tool
    }

    return undefined
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.toolClasses.keys())
  }

  /**
   * Get all tool instances
   */
  getAllTools(): ICodeTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.toolClasses.has(name.toLowerCase())
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    const normalizedName = name.toLowerCase()
    this.tools.delete(normalizedName)
    this.toolClasses.delete(normalizedName)
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear()
    this.toolClasses.clear()
  }

  /**
   * Get metadata for all registered tools
   */
  async getAllMetadata(): Promise<ToolMetadata[]> {
    const metadata: ToolMetadata[] = []

    for (const name of this.toolClasses.keys()) {
      const tool = this.getTool(name)
      if (tool) {
        metadata.push(tool.getMetadata())
      }
    }

    return metadata
  }
}

/**
 * Convenience function to get the registry instance
 */
export function getRegistry(): ToolRegistry {
  return ToolRegistry.getInstance()
}

/**
 * Tests for ToolFactory
 */

import type { ICodeTool } from '../interfaces'
import type { ToolMetadata } from '../types'
import { ToolFactory } from '../tool-factory'
import { ToolRegistry } from '../tool-registry'

// Mock tool for testing
class MockTool implements ICodeTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'mock-tool',
      displayName: 'Mock Tool',
      description: 'A mock tool',
      version: '1.0.0',
      capabilities: {
        supportsChat: false,
        supportsFileEdit: false,
        supportsCodeGen: false,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false,
      },
    }
  }

  async isInstalled() {
    return { installed: true }
  }

  async install() {
    return { success: true }
  }

  async uninstall() {
    return { success: true }
  }

  async getConfig() {
    return { name: 'mock-tool' }
  }

  async updateConfig() {}

  async configure() {}

  async validateConfig() {
    return true
  }

  async execute() {
    return { success: true }
  }

  async getVersion() {
    return '1.0.0'
  }

  async reset() {}
}

describe('toolFactory', () => {
  let factory: ToolFactory
  let registry: ToolRegistry

  beforeEach(() => {
    registry = ToolRegistry.getInstance()
    registry.clear()
    registry.registerToolClass('mock-tool', MockTool)
    factory = new ToolFactory(registry)
  })

  describe('tool creation', () => {
    it('should create tool by name', () => {
      const tool = factory.createTool('mock-tool')
      expect(tool).toBeDefined()
      expect(tool.getMetadata().name).toBe('mock-tool')
    })

    it('should throw error for non-existent tool', () => {
      expect(() => factory.createTool('non-existent')).toThrow()
    })

    it('should create tool with config', () => {
      const config = { apiKey: 'test-key' }
      const tool = factory.createTool('mock-tool', config)
      expect(tool).toBeDefined()
    })
  })

  describe('multiple tool creation', () => {
    beforeEach(() => {
      registry.registerToolClass('mock-tool-2', MockTool)
    })

    it('should create multiple tools', () => {
      const tools = factory.createTools(['mock-tool', 'mock-tool-2'])
      expect(tools.length).toBe(2)
    })

    it('should create all registered tools', () => {
      const tools = factory.createAllTools()
      expect(tools.length).toBeGreaterThan(0)
    })
  })

  describe('tool availability', () => {
    it('should check if tool can be created', () => {
      expect(factory.canCreateTool('mock-tool')).toBe(true)
      expect(factory.canCreateTool('non-existent')).toBe(false)
    })

    it('should get available tool names', () => {
      const names = factory.getAvailableTools()
      expect(names).toContain('mock-tool')
    })
  })
})

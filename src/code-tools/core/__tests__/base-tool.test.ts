/**
 * Tests for BaseCodeTool
 */

import type { ToolConfig, ToolMetadata } from '../types'
import { BaseCodeTool } from '../base-tool'

// Mock implementation for testing
class MockTool extends BaseCodeTool {
  getMetadata(): ToolMetadata {
    return {
      name: 'mock-tool',
      displayName: 'Mock Tool',
      description: 'A mock tool for testing',
      version: '1.0.0',
      capabilities: {
        supportsChat: true,
        supportsFileEdit: true,
        supportsCodeGen: true,
        supportsReview: false,
        supportsTesting: false,
        supportsDebugging: false,
      },
    }
  }

  protected getInstallCheckCommand(): string {
    return 'mock-tool --version'
  }

  protected getInstallCommand(): string {
    return 'npm install -g mock-tool'
  }

  protected getUninstallCommand(): string {
    return 'npm uninstall -g mock-tool'
  }
}

describe('baseCodeTool', () => {
  let tool: MockTool

  beforeEach(() => {
    tool = new MockTool()
  })

  describe('getMetadata', () => {
    it('should return tool metadata', () => {
      const metadata = tool.getMetadata()
      expect(metadata.name).toBe('mock-tool')
      expect(metadata.displayName).toBe('Mock Tool')
      expect(metadata.version).toBe('1.0.0')
    })
  })

  describe('configuration', () => {
    it('should get default config', async () => {
      const config = await tool.getConfig()
      expect(config.name).toBe('mock-tool')
    })

    it('should update config', async () => {
      await tool.updateConfig({ apiKey: 'test-key' })
      const config = await tool.getConfig()
      expect(config.apiKey).toBe('test-key')
    })

    it('should configure with full config', async () => {
      const newConfig: ToolConfig = {
        name: 'mock-tool',
        version: '2.0.0',
        apiKey: 'new-key',
        model: 'gpt-4',
      }
      await tool.configure(newConfig)
      const config = await tool.getConfig()
      expect(config.version).toBe('2.0.0')
      expect(config.apiKey).toBe('new-key')
      expect(config.model).toBe('gpt-4')
    })

    it('should validate config', async () => {
      const validConfig = { name: 'mock-tool' }
      const invalidConfig = {}

      expect(await tool.validateConfig(validConfig)).toBe(true)
      expect(await tool.validateConfig(invalidConfig)).toBe(false)
    })

    it('should reset to default config', async () => {
      await tool.updateConfig({ apiKey: 'test-key', model: 'gpt-4' })
      await tool.reset()
      const config = await tool.getConfig()
      expect(config.apiKey).toBeUndefined()
      expect(config.model).toBeUndefined()
    })
  })

  describe('version parsing', () => {
    it('should parse version from output', () => {
      const outputs = [
        'version 1.2.3',
        'v1.2.3',
        '1.2.3',
        'mock-tool version 1.2.3',
      ]

      outputs.forEach((output) => {
        const version = (tool as any).parseVersion(output)
        expect(version).toBe('1.2.3')
      })
    })

    it('should return undefined for invalid version', () => {
      const version = (tool as any).parseVersion('no version here')
      expect(version).toBeUndefined()
    })
  })

  describe('command building', () => {
    it('should build command with args', () => {
      const command = (tool as any).buildCommand('test', ['arg1', 'arg2'])
      expect(command).toBe('test arg1 arg2')
    })

    it('should escape args with spaces', () => {
      const command = (tool as any).buildCommand('test', ['arg with spaces'])
      expect(command).toBe('test "arg with spaces"')
    })
  })
})

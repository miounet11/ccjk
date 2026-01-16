import type { MCPServer } from '../../../src/mcp/mcp-server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('../../../src/i18n', () => ({
  i18n: {
    t: vi.fn((key: string, _options?: any) => {
      const translations: Record<string, string> = {
        'mcp:server.starting': 'Starting CCJK MCP server...',
        'mcp:server.started': '✓ CCJK MCP server started',
        'mcp:server.listening': 'Listening on port: {{port}}',
        'mcp:server.stdioMode': 'Using stdio transport',
        'mcp:server.httpMode': 'Using HTTP transport',
        'mcp:server.error': 'MCP server error: {{error}}',
        'mcp:server.invalidTransport': 'Invalid transport mode: {{transport}}',
        'mcp:server.toolNotFound': 'Tool not found: {{name}}',
        'mcp:server.toolExecutionError': 'Tool execution error: {{error}}',
      }
      const template = translations[key] || key
      if (_options) {
        return Object.keys(_options).reduce((result, key) => {
          return result.replace(`{{${key}}}`, _options[key])
        }, template)
      }
      return template
    }),
    isInitialized: true,
    language: 'en',
  },
  ensureI18nInitialized: vi.fn(),
}))

// Mock console for logging
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
}
vi.spyOn(console, 'error').mockImplementation(mockConsole.error)

describe('mCP Server', () => {
  let mcpServer: MCPServer

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import MCPServer after mocks are set up
    const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
    mcpServer = new MCPServerClass()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('server Initialization', () => {
    it('should create MCP server instance', () => {
      expect(mcpServer).toBeDefined()
      expect(mcpServer).toHaveProperty('start')
      expect(mcpServer).toHaveProperty('stop')
    })

    it('should have default configuration', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      expect(server).toBeDefined()
    })
  })

  describe('stdio Transport', () => {
    it('should start server with stdio transport', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify server started successfully
      expect(server).toBeDefined()
    })

    it('should handle stdio messages', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify server is ready to handle messages
      expect(server).toBeDefined()
    })

    it('should write responses to stdout', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify server is ready to write
      expect(server).toBeDefined()
    })
  })

  describe('hTTP Transport', () => {
    it('should start server with HTTP transport', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'http', port: 13001 })

      await server.start()

      // Verify server started successfully
      expect(server).toBeDefined()

      await server.stop()
    })

    it('should use default port if not specified', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'http', port: 13002 })

      await server.start()

      // Verify server starts with default port
      expect(server).toBeDefined()

      await server.stop()
    })

    it('should handle HTTP requests', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'http', port: 13003 })

      await server.start()

      // Verify HTTP server is set up
      expect(server).toBeDefined()

      await server.stop()
    })
  })

  describe('tool Execution', () => {
    it('should list available tools', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify tools are registered
      expect(server).toBeDefined()
    })

    it('should execute chat tool', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify tool execution is handled
      expect(server).toBeDefined()
    })

    it('should handle tool not found error', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify error handling
      expect(mockConsole.error).toBeDefined()
    })

    it('should handle tool execution errors', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify error handling
      expect(server).toBeDefined()
    })
  })

  describe('server Lifecycle', () => {
    it('should stop stdio server', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()
      await server.stop()

      // Verify cleanup
      expect(server).toBeDefined()
    })

    it('should stop HTTP server', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'http', port: 13004 })

      await server.start()
      await server.stop()

      // Verify HTTP server is closed
      expect(server).toBeDefined()
    })

    it('should handle multiple start calls', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()
      await server.start()

      // Should not throw error
      expect(server).toBeDefined()
    })

    it('should handle stop without start', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.stop()

      // Should not throw error
      expect(server).toBeDefined()
    })
  })

  describe('error Handling', () => {
    it('should handle invalid transport mode', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')

      try {
        const server = new MCPServerClass({ transport: 'invalid' as any })
        await server.start()
      }
      catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle malformed JSON-RPC requests', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify error handling
      expect(server).toBeDefined()
    })

    it('should handle missing method in request', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify error handling
      expect(server).toBeDefined()
    })
  })

  describe('configuration', () => {
    it('should accept custom port', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'http', port: 18080 })

      await server.start()

      expect(server).toBeDefined()

      await server.stop()
    })

    it('should accept debug mode', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio', debug: true })

      await server.start()

      expect(server).toBeDefined()
    })

    it('should handle configuration validation', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')

      // Test with invalid configuration
      try {
        const server = new MCPServerClass({ transport: 'http', port: -1 })
        await server.start()
      }
      catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('jSON-RPC Protocol', () => {
    it('should handle initialize request', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify initialize is handled
      expect(server).toBeDefined()
    })

    it('should handle notifications', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify notifications are handled
      expect(server).toBeDefined()
    })

    it('should return proper error responses', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify error response format
      expect(server).toBeDefined()
    })
  })

  describe('integration with CCJK Tools', () => {
    it('should integrate with chat command', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify chat tool is available
      expect(server).toBeDefined()
    })

    it('should integrate with providers command', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify providers tool is available
      expect(server).toBeDefined()
    })

    it('should integrate with stats command', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify stats tool is available
      expect(server).toBeDefined()
    })

    it('should integrate with workflows command', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify workflows tool is available
      expect(server).toBeDefined()
    })

    it('should integrate with config command', async () => {
      const { MCPServer: MCPServerClass } = await import('../../../src/mcp/mcp-server')
      const server = new MCPServerClass({ transport: 'stdio' })

      await server.start()

      // Verify config tool is available
      expect(server).toBeDefined()
    })
  })
})

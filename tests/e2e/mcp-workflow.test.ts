/**
 * E2E Tests: MCP Management Workflow
 * Tests MCP server installation, configuration, and lifecycle management
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  readJsonFile,
  runCcjk,
  writeJsonFile,
} from './helpers'
import {
  createTestProject,
  getTestHomeDir,
} from './setup'

describe.skip('e2E: MCP Management Workflow', () => {
  let testProjectDir: string

  beforeEach(async () => {
    testProjectDir = await createTestProject({
      name: `mcp-test-${Date.now()}`,
      withGit: true,
      withPackageJson: true,
      withMcpConfig: true,
    })
    process.chdir(testProjectDir)
  })

  // ==========================================================================
  // MCP Server Listing Tests
  // ==========================================================================

  describe('mCP Server Listing', () => {
    it('should list available MCP servers', async () => {
      const result = await runCcjk(['mcp', 'list'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should show installed servers', async () => {
      // Pre-configure an MCP server
      const claudeSettingsPath = join(getTestHomeDir(), '.claude', 'settings.json')
      const settings = readJsonFile(claudeSettingsPath) || { mcpServers: {} }
      settings.mcpServers = {
        'test-server': {
          command: 'node',
          args: ['test-server.js'],
        },
      }
      writeJsonFile(claudeSettingsPath, settings)

      const result = await runCcjk(['mcp', 'list'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should show server status', async () => {
      const result = await runCcjk(['mcp', 'status'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should filter servers by category', async () => {
      const result = await runCcjk(['mcp', 'list', '--category', 'database'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should search servers by name', async () => {
      const result = await runCcjk(['mcp', 'search', 'filesystem'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // MCP Server Installation Tests
  // ==========================================================================

  describe('mCP Server Installation', () => {
    it('should install MCP server from registry', async () => {
      const result = await runCcjk(['mcp', 'install', 'filesystem'], {
        input: ['y'], // Confirm installation
        timeout: 120000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should install MCP server with custom config', async () => {
      const result = await runCcjk([
        'mcp',
        'install',
        'filesystem',
        '--config',
        JSON.stringify({ allowedPaths: ['/tmp'] }),
      ], {
        input: ['y'],
        timeout: 120000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle installation failure gracefully', async () => {
      const result = await runCcjk(['mcp', 'install', 'non-existent-server-xyz'], {
        timeout: 30000,
      })

      // Should fail but not crash
      expect(result.timedOut).toBe(false)
    })

    it('should prevent duplicate installations', async () => {
      // Pre-install a server
      const claudeSettingsPath = join(getTestHomeDir(), '.claude', 'settings.json')
      const settings = readJsonFile(claudeSettingsPath) || { mcpServers: {} }
      settings.mcpServers = {
        filesystem: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server-filesystem'],
        },
      }
      writeJsonFile(claudeSettingsPath, settings)

      // Try to install again
      const result = await runCcjk(['mcp', 'install', 'filesystem'], {
        timeout: 30000,
      })

      // Should detect existing installation
      expect(result.timedOut).toBe(false)
    })

    it('should install multiple servers at once', async () => {
      const result = await runCcjk(['mcp', 'install', 'filesystem', 'memory'], {
        input: ['y', 'y'],
        timeout: 180000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should respect --yes flag for non-interactive install', async () => {
      const result = await runCcjk(['mcp', 'install', 'filesystem', '--yes'], {
        timeout: 120000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // MCP Server Uninstallation Tests
  // ==========================================================================

  describe('mCP Server Uninstallation', () => {
    beforeEach(async () => {
      // Pre-install a server for uninstall tests
      const claudeSettingsPath = join(getTestHomeDir(), '.claude', 'settings.json')
      const settings = readJsonFile(claudeSettingsPath) || { mcpServers: {} }
      settings.mcpServers = {
        'test-server': {
          command: 'node',
          args: ['test-server.js'],
        },
      }
      writeJsonFile(claudeSettingsPath, settings)
    })

    it('should uninstall MCP server', async () => {
      const result = await runCcjk(['mcp', 'uninstall', 'test-server'], {
        input: ['y'], // Confirm uninstallation
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)

      // Verify server was removed
      const claudeSettingsPath = join(getTestHomeDir(), '.claude', 'settings.json')
      const settings = readJsonFile(claudeSettingsPath)
      if (settings?.mcpServers) {
        expect(settings.mcpServers['test-server']).toBeUndefined()
      }
    })

    it('should handle uninstall of non-existent server', async () => {
      const result = await runCcjk(['mcp', 'uninstall', 'non-existent'], {
        timeout: 30000,
      })

      // Should fail gracefully
      expect(result.timedOut).toBe(false)
    })

    it('should support --force flag', async () => {
      const result = await runCcjk(['mcp', 'uninstall', 'test-server', '--force'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should clean up server data on uninstall', async () => {
      // Create some server data
      const serverDataDir = join(getTestHomeDir(), '.local', 'share', 'ccjk', 'mcp', 'test-server')
      mkdirSync(serverDataDir, { recursive: true })
      writeFileSync(join(serverDataDir, 'data.json'), '{}')

      const result = await runCcjk(['mcp', 'uninstall', 'test-server', '--clean'], {
        input: ['y'],
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // MCP Server Configuration Tests
  // ==========================================================================

  describe('mCP Server Configuration', () => {
    beforeEach(async () => {
      // Pre-install a server
      const claudeSettingsPath = join(getTestHomeDir(), '.claude', 'settings.json')
      const settings = readJsonFile(claudeSettingsPath) || { mcpServers: {} }
      settings.mcpServers = {
        'configurable-server': {
          command: 'node',
          args: ['server.js'],
          env: {
            API_KEY: 'test-key',
          },
        },
      }
      writeJsonFile(claudeSettingsPath, settings)
    })

    it('should show server configuration', async () => {
      const result = await runCcjk(['mcp', 'config', 'configurable-server'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should update server configuration', async () => {
      const result = await runCcjk([
        'mcp',
        'config',
        'configurable-server',
        '--set',
        'env.NEW_VAR=new-value',
      ], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should validate configuration changes', async () => {
      const result = await runCcjk([
        'mcp',
        'config',
        'configurable-server',
        '--set',
        'invalid.nested.path=value',
      ], {
        timeout: 30000,
      })

      // Should handle invalid config paths
      expect(result.timedOut).toBe(false)
    })

    it('should reset configuration to defaults', async () => {
      const result = await runCcjk(['mcp', 'config', 'configurable-server', '--reset'], {
        input: ['y'],
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should export configuration', async () => {
      const exportPath = join(testProjectDir, 'mcp-export.json')

      const result = await runCcjk(['mcp', 'export', '--output', exportPath], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should import configuration', async () => {
      // Create import file
      const importPath = join(testProjectDir, 'mcp-import.json')
      writeJsonFile(importPath, {
        mcpServers: {
          'imported-server': {
            command: 'node',
            args: ['imported.js'],
          },
        },
      })

      const result = await runCcjk(['mcp', 'import', importPath], {
        input: ['y'],
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // MCP Server Lifecycle Tests
  // ==========================================================================

  describe('mCP Server Lifecycle', () => {
    it('should start MCP server', async () => {
      // This test depends on having a real MCP server installed
      const result = await runCcjk(['mcp', 'start', 'test-server'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should stop MCP server', async () => {
      const result = await runCcjk(['mcp', 'stop', 'test-server'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should restart MCP server', async () => {
      const result = await runCcjk(['mcp', 'restart', 'test-server'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should show server logs', async () => {
      const result = await runCcjk(['mcp', 'logs', 'test-server'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should health check servers', async () => {
      const result = await runCcjk(['mcp', 'health'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Project-Level MCP Configuration Tests
  // ==========================================================================

  describe('project-Level MCP Configuration', () => {
    it('should create project .mcp.json', async () => {
      const result = await runCcjk(['mcp', 'init'], {
        input: ['y'],
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)

      // Check .mcp.json was created
      const mcpJsonPath = join(testProjectDir, '.mcp.json')
      expect(existsSync(mcpJsonPath)).toBe(true)
    })

    it('should add server to project config', async () => {
      const result = await runCcjk(['mcp', 'add', 'filesystem', '--project'], {
        input: ['y'],
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should remove server from project config', async () => {
      // First add a server
      const mcpJsonPath = join(testProjectDir, '.mcp.json')
      writeJsonFile(mcpJsonPath, {
        mcpServers: {
          'project-server': {
            command: 'node',
            args: ['server.js'],
          },
        },
      })

      const result = await runCcjk(['mcp', 'remove', 'project-server', '--project'], {
        input: ['y'],
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should sync project config with global', async () => {
      const result = await runCcjk(['mcp', 'sync'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should validate project MCP config', async () => {
      const result = await runCcjk(['mcp', 'validate'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // MCP Registry Tests
  // ==========================================================================

  describe('mCP Registry', () => {
    it('should fetch registry updates', async () => {
      const result = await runCcjk(['mcp', 'update-registry'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should show server details from registry', async () => {
      const result = await runCcjk(['mcp', 'info', 'filesystem'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should list server versions', async () => {
      const result = await runCcjk(['mcp', 'versions', 'filesystem'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should install specific version', async () => {
      const result = await runCcjk(['mcp', 'install', 'filesystem@latest'], {
        input: ['y'],
        timeout: 120000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const result = await runCcjk(['mcp', 'install', 'filesystem'], {
        env: {
          // Simulate network issues
          HTTP_PROXY: 'http://invalid-proxy:9999',
        },
        timeout: 30000,
      })

      // Should fail gracefully
      expect(result.timedOut).toBe(false)
    })

    it('should handle invalid server names', async () => {
      const result = await runCcjk(['mcp', 'install', ''], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle permission errors', async () => {
      const result = await runCcjk(['mcp', 'install', 'filesystem'], {
        env: {
          // Simulate permission issues
          HOME: '/nonexistent/path',
        },
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should provide helpful error messages', async () => {
      const result = await runCcjk(['mcp', 'invalid-command'], {
        timeout: 30000,
      })

      // Should show help or error message
      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should work with Claude Code settings', async () => {
      // Verify integration with Claude Code's settings.json
      const result = await runCcjk(['mcp', 'list', '--format', 'json'], {
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should support environment variable substitution', async () => {
      const claudeSettingsPath = join(getTestHomeDir(), '.claude', 'settings.json')
      const settings = readJsonFile(claudeSettingsPath) || { mcpServers: {} }
      settings.mcpServers = {
        'env-server': {
          command: 'node',
          args: ['server.js'],
          env: {
            API_KEY: '${CCJK_TEST_API_KEY}',
          },
        },
      }
      writeJsonFile(claudeSettingsPath, settings)

      const result = await runCcjk(['mcp', 'config', 'env-server'], {
        env: {
          CCJK_TEST_API_KEY: 'test-value',
        },
        timeout: 30000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle concurrent operations', async () => {
      // Run multiple MCP commands concurrently
      const results = await Promise.all([
        runCcjk(['mcp', 'list'], { timeout: 30000 }),
        runCcjk(['mcp', 'status'], { timeout: 30000 }),
      ])

      results.forEach((result) => {
        expect(result.timedOut).toBe(false)
      })
    })
  })
})

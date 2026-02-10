import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  chmodSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

// Mock node:os
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

// Mock claude-config
vi.mock('../../src/utils/claude-config', () => ({
  readMcpConfig: vi.fn(),
}))

describe('mcp-gatekeeper', () => {
  let gatekeeper: typeof import('../../src/utils/mcp-gatekeeper')
  let readMcpConfig: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)

    const claudeConfig = await import('../../src/utils/claude-config')
    readMcpConfig = vi.mocked(claudeConfig.readMcpConfig)
    readMcpConfig.mockReturnValue(null)

    gatekeeper = await import('../../src/utils/mcp-gatekeeper')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('readGatekeeperConfig()', () => {
    it('should return null when config file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      expect(gatekeeper.readGatekeeperConfig()).toBeNull()
    })

    it('should read and parse config file', () => {
      const config = { enabled: true, services: { context7: { enabled: true, mode: 'always' } } }
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config))

      const result = gatekeeper.readGatekeeperConfig()
      expect(result).toEqual(config)
    })

    it('should return null on invalid JSON', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('invalid json')

      expect(gatekeeper.readGatekeeperConfig()).toBeNull()
    })
  })

  describe('writeGatekeeperConfig()', () => {
    it('should create directory and write config', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const config = { enabled: true, services: {} }
      gatekeeper.writeGatekeeperConfig(config)

      expect(mkdirSync).toHaveBeenCalled()
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('mcp-gatekeeper.json'),
        JSON.stringify(config, null, 2),
        'utf-8',
      )
    })
  })

  describe('getDefaultGatekeeperConfig()', () => {
    it('should return config with all services enabled when no MCP config', () => {
      readMcpConfig.mockReturnValue(null)

      const config = gatekeeper.getDefaultGatekeeperConfig()
      expect(config.enabled).toBe(true)
      expect(config.services).toEqual({})
    })

    it('should set Playwright to on-demand by default', () => {
      readMcpConfig.mockReturnValue({
        mcpServers: {
          context7: { command: 'npx', args: [] },
          Playwright: { command: 'npx', args: [] },
        },
      })

      const config = gatekeeper.getDefaultGatekeeperConfig()
      expect(config.services.context7.enabled).toBe(true)
      expect(config.services.context7.mode).toBe('always')
      expect(config.services.Playwright.enabled).toBe(false)
      expect(config.services.Playwright.mode).toBe('on-demand')
    })

    it('should set serena to on-demand by default', () => {
      readMcpConfig.mockReturnValue({
        mcpServers: {
          serena: { command: 'uvx', args: [] },
        },
      })

      const config = gatekeeper.getDefaultGatekeeperConfig()
      expect(config.services.serena.enabled).toBe(false)
      expect(config.services.serena.mode).toBe('on-demand')
    })
  })

  describe('syncGatekeeperFromMcp()', () => {
    it('should create config from MCP services when no existing config', () => {
      readMcpConfig.mockReturnValue({
        mcpServers: {
          'context7': { command: 'npx', args: [] },
          'mcp-deepwiki': { command: 'npx', args: [] },
        },
      })

      const config = gatekeeper.syncGatekeeperFromMcp()
      expect(config.services.context7.enabled).toBe(true)
      expect(config.services['mcp-deepwiki'].enabled).toBe(true)
    })

    it('should preserve existing user settings', () => {
      // Existing config has context7 disabled by user
      const existingConfig = {
        enabled: true,
        services: {
          context7: { enabled: false, mode: 'always' as const },
        },
      }
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('mcp-gatekeeper.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingConfig))

      readMcpConfig.mockReturnValue({
        mcpServers: {
          'context7': { command: 'npx', args: [] },
          'mcp-deepwiki': { command: 'npx', args: [] },
        },
      })

      const config = gatekeeper.syncGatekeeperFromMcp()
      // User's setting preserved
      expect(config.services.context7.enabled).toBe(false)
      // New service gets default
      expect(config.services['mcp-deepwiki'].enabled).toBe(true)
    })

    it('should remove stale services not in MCP config', () => {
      const existingConfig = {
        enabled: true,
        services: {
          'context7': { enabled: true, mode: 'always' as const },
          'old-service': { enabled: true, mode: 'always' as const },
        },
      }
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('mcp-gatekeeper.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingConfig))

      readMcpConfig.mockReturnValue({
        mcpServers: {
          context7: { command: 'npx', args: [] },
        },
      })

      const config = gatekeeper.syncGatekeeperFromMcp()
      expect(config.services.context7).toBeDefined()
      expect(config.services['old-service']).toBeUndefined()
    })
  })

  describe('enableService() / disableService()', () => {
    it('should enable a service', () => {
      const existingConfig = {
        enabled: true,
        services: {
          Playwright: { enabled: false, mode: 'on-demand' as const },
        },
      }
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('mcp-gatekeeper.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingConfig))

      const result = gatekeeper.enableService('Playwright')
      expect(result).toBe(true)

      // Verify writeFileSync was called with enabled: true
      const writtenConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string,
      )
      expect(writtenConfig.services.Playwright.enabled).toBe(true)
    })

    it('should disable a service', () => {
      const existingConfig = {
        enabled: true,
        services: {
          context7: { enabled: true, mode: 'always' as const },
        },
      }
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('mcp-gatekeeper.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingConfig))

      const result = gatekeeper.disableService('context7')
      expect(result).toBe(true)

      const writtenConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string,
      )
      expect(writtenConfig.services.context7.enabled).toBe(false)
    })

    it('should return false for unknown service', () => {
      readMcpConfig.mockReturnValue({ mcpServers: {} })
      expect(gatekeeper.enableService('nonexistent')).toBe(false)
      expect(gatekeeper.disableService('nonexistent')).toBe(false)
    })
  })

  describe('toggleGatekeeper()', () => {
    it('should toggle gatekeeper on/off', () => {
      readMcpConfig.mockReturnValue({ mcpServers: { context7: { command: 'npx' } } })

      gatekeeper.toggleGatekeeper(false)

      const writtenConfig = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string,
      )
      expect(writtenConfig.enabled).toBe(false)
    })
  })

  describe('generateHookScript()', () => {
    it('should generate a valid bash script', () => {
      const script = gatekeeper.generateHookScript()
      expect(script).toContain('#!/usr/bin/env bash')
      expect(script).toContain('mcp-gatekeeper.json')
      expect(script).toContain('mcp__')
      expect(script).toContain('exit 0')
      expect(script).toContain('process.exit(2)')
    })

    it('should use node for JSON parsing', () => {
      const script = gatekeeper.generateHookScript()
      expect(script).toContain('node -e')
    })
  })

  describe('registerHookInSettings()', () => {
    it('should add PreToolUse hook to empty settings', () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('settings.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ hooks: {} }))

      gatekeeper.registerHookInSettings()

      const writtenSettings = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string,
      )
      expect(writtenSettings.hooks.PreToolUse).toHaveLength(1)
      expect(writtenSettings.hooks.PreToolUse[0].matcher).toBe('mcp__.*')
    })

    it('should not duplicate hook if already registered', () => {
      const existingSettings = {
        hooks: {
          PreToolUse: [{
            matcher: 'mcp__.*',
            hooks: [{ type: 'command', command: '/mock/home/.claude/hooks/mcp-gatekeeper.sh' }],
          }],
        },
      }
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('settings.json')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingSettings))

      gatekeeper.registerHookInSettings()

      const writtenSettings = JSON.parse(
        vi.mocked(writeFileSync).mock.calls[0][1] as string,
      )
      expect(writtenSettings.hooks.PreToolUse).toHaveLength(1)
    })
  })

  describe('getGatekeeperStatus()', () => {
    it('should return not installed when no config or hook', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const status = gatekeeper.getGatekeeperStatus()
      expect(status.installed).toBe(false)
      expect(status.enabled).toBe(false)
      expect(status.services).toEqual([])
    })

    it('should return full status when configured', () => {
      const config = {
        enabled: true,
        services: {
          context7: { enabled: true, mode: 'always' },
          Playwright: { enabled: false, mode: 'on-demand' },
        },
      }
      vi.mocked(existsSync).mockImplementation((path) => {
        return String(path).includes('mcp-gatekeeper') || String(path).includes('hooks')
      })
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(config))

      const status = gatekeeper.getGatekeeperStatus()
      expect(status.installed).toBe(true)
      expect(status.enabled).toBe(true)
      expect(status.services).toHaveLength(2)
      expect(status.services.find(s => s.id === 'Playwright')?.enabled).toBe(false)
    })
  })
})

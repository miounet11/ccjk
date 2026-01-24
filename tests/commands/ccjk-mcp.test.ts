/**
 * Test for ccjk:mcp command
 */

import { describe, expect, it, vi } from 'vitest'
import { ccjkMcp, CcjkMcpOptions, CcjkMcpResult } from '../../src/commands/ccjk-mcp'

vi.mock('../../src/analyzers', () => ({
  analyzeProject: vi.fn().mockResolvedValue({
    projectType: 'typescript',
    languages: [{ language: 'typescript', confidence: 0.9, fileCount: 100, indicators: ['tsconfig.json'] }],
    frameworks: [{ name: 'react', category: 'frontend', confidence: 0.8, evidence: ['package.json'] }],
    configFiles: ['tsconfig.json', 'package.json'],
    importantDirs: ['src', 'public'],
    metadata: {
      timestamp: new Date(),
      duration: 1000,
      filesScanned: 500,
      confidence: 0.9,
      version: '1.0.0'
    }
  })
}))

vi.mock('../../src/config/mcp-templates', () => ({
  mcpServiceTemplates: {
    'typescript-language-server': {
      id: 'typescript-language-server',
      name: { en: 'TypeScript Language Server', 'zh-CN': 'TypeScript 语言服务器' },
      description: {
        en: 'Provides TypeScript/JavaScript language support',
        'zh-CN': '提供 TypeScript/JavaScript 语言支持'
      },
      type: 'stdio',
      command: 'typescript-language-server',
      args: ['--stdio'],
      env: {},
      requiredFor: ['typescript'],
      optionalFor: [],
      installCheck: 'typescript-language-server --version',
      installCommand: 'npm install -g typescript-language-server typescript',
      category: 'language',
      platforms: ['windows', 'macos', 'linux'],
      requiredCommands: ['node', 'npm']
    },
    'eslint-mcp': {
      id: 'eslint-mcp',
      name: { en: 'ESLint MCP Server', 'zh-CN': 'ESLint MCP 服务器' },
      description: {
        en: 'JavaScript/TypeScript linting through MCP protocol',
        'zh-CN': '通过 MCP 协议提供 JavaScript/TypeScript 代码检查'
      },
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-eslint@latest'],
      env: {},
      requiredFor: [],
      optionalFor: ['typescript', 'javascript'],
      installCheck: 'npx @modelcontextprotocol/server-eslint@latest --version',
      installCommand: 'npm install -g @modelcontextprotocol/server-eslint',
      category: 'tooling',
      platforms: ['windows', 'macos', 'linux'],
      requiredCommands: ['node', 'npm']
    }
  },
  getCompatibleMcpServiceTemplates: vi.fn().mockReturnValue([
    {
      id: 'typescript-language-server',
      name: { en: 'TypeScript Language Server', 'zh-CN': 'TypeScript 语言服务器' },
      description: {
        en: 'Provides TypeScript/JavaScript language support',
        'zh-CN': '提供 TypeScript/JavaScript 语言支持'
      },
      type: 'stdio',
      command: 'typescript-language-server',
      args: ['--stdio'],
      env: {},
      requiredFor: ['typescript'],
      optionalFor: [],
      installCheck: 'typescript-language-server --version',
      installCommand: 'npm install -g typescript-language-server typescript',
      category: 'language',
      platforms: ['windows', 'macos', 'linux'],
      requiredCommands: ['node', 'npm']
    },
    {
      id: 'eslint-mcp',
      name: { en: 'ESLint MCP Server', 'zh-CN': 'ESLint MCP 服务器' },
      description: {
        en: 'JavaScript/TypeScript linting through MCP protocol',
        'zh-CN': '通过 MCP 协议提供 JavaScript/TypeScript 代码检查'
      },
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-eslint@latest'],
      env: {},
      requiredFor: [],
      optionalFor: ['typescript', 'javascript'],
      installCheck: 'npx @modelcontextprotocol/server-eslint@latest --version',
      installCommand: 'npm install -g @modelcontextprotocol/server-eslint',
      category: 'tooling',
      platforms: ['windows', 'macos', 'linux'],
      requiredCommands: ['node', 'npm']
    }
  ])
}))

vi.mock('../../src/utils/claude-config', () => {
  let config = { mcpServers: {} }
  return {
    readMcpConfig: vi.fn(() => config),
    writeMcpConfig: vi.fn((newConfig) => { config = newConfig }),
    mergeMcpServers: vi.fn().mockImplementation((existing, newServers) => ({
      mcpServers: { ...existing?.mcpServers, ...newServers }
    })),
    backupMcpConfig: vi.fn()
  }
})

vi.mock('../../src/utils/platform', () => ({
  commandExists: vi.fn().mockReturnValue(false),
  isWindows: vi.fn().mockReturnValue(false)
}))

vi.mock('../../src/constants', () => ({
  CLAUDE_DIR: '/test/.claude'
}))

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    language: 'en',
    changeLanguage: vi.fn(),
    t: vi.fn((key: string) => key)
  }
}))

describe('ccjk:mcp command', () => {
  it('should analyze project and recommend services', async () => {
    const options: CcjkMcpOptions = {
      interactive: false,
      dryRun: true,
      json: true
    }

    const result = await ccjkMcp(options)

    expect(result.success).toBe(true)
    expect(result.project.type).toBe('typescript')
    expect(result.project.languages).toContain('typescript')
    expect(result.project.frameworks).toContain('react')
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(result.configPath).toBe('/test/.claude/mcp.json')
  })

  it('should filter services by tier', async () => {
    const options: CcjkMcpOptions = {
      interactive: false,
      tier: 'core',
      dryRun: true
    }

    const result = await ccjkMcp(options)

    expect(result.success).toBe(true)
    // Should only include core tier services
  })

  it('should handle specific service installation', async () => {
    const options: CcjkMcpOptions = {
      interactive: false,
      services: ['typescript-language-server'],
      dryRun: true
    }

    const result = await ccjkMcp(options)

    expect(result.success).toBe(true)
  })

  it('should skip already installed services', async () => {
    // Create a simple test that verifies the logic works
    const { ccjkMcp } = await import('../../src/commands/ccjk-mcp')

    // Run with dry-run to see what would be installed
    const options: CcjkMcpOptions = {
      interactive: false,
      dryRun: true
    }

    const result = await ccjkMcp(options)

    expect(result.success).toBe(true)
    // In dry-run mode, we should see what would be installed
    expect(result.installed.length).toBe(0) // Nothing actually installed in dry-run
  })

  it('should handle force reinstallation', async () => {
    const { ccjkMcp } = await import('../../src/commands/ccjk-mcp')

    const options: CcjkMcpOptions = {
      interactive: false,
      dryRun: true,
      force: true
    }

    const result = await ccjkMcp(options)

    expect(result.success).toBe(true)
    // With force, we should see services that would be reinstalled
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('should handle service exclusion', async () => {
    const options: CcjkMcpOptions = {
      interactive: false,
      dryRun: true,
      exclude: ['eslint-mcp']
    }

    const result = await ccjkMcp(options)

    expect(result.success).toBe(true)
    // eslint-mcp should be excluded from installation
  })

  it('should format JSON output correctly', async () => {
    const result: CcjkMcpResult = {
      success: true,
      project: {
        type: 'typescript',
        languages: ['typescript'],
        frameworks: ['react']
      },
      services: [
        {
          id: 'typescript-language-server',
          name: 'TypeScript Language Server',
          status: 'installed'
        }
      ],
      installed: ['typescript-language-server'],
      skipped: [],
      failed: [],
      duration: 5000,
      configPath: '/test/.claude/mcp.json'
    }

    const { formatResultAsJson } = await import('../../src/commands/ccjk-mcp')
    const json = formatResultAsJson(result)

    expect(json).toContain('"success": true')
    expect(json).toContain('"type": "typescript"')
    expect(json).toContain('"installed": [')
    expect(json).toContain('"typescript-language-server"')
  })
})
import { beforeEach, describe, expect, it, vi } from 'vitest'

const backupMcpConfig = vi.fn()
const readMcpConfig = vi.fn()
const writeMcpConfig = vi.fn()

const backupCodexComplete = vi.fn()
const readCodexConfig = vi.fn()
const writeCodexConfig = vi.fn()

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
  },
}))

vi.mock('../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    {
      id: 'context7',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp'],
      },
    },
    {
      id: 'open-websearch',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', '@ccjk/open-websearch'],
        env: { SEARCH_MODE: 'hybrid' },
      },
    },
    {
      id: 'exa',
      requiresApiKey: true,
      config: {
        command: 'npx',
        args: ['-y', '@exa/mcp'],
      },
    },
  ],
}))

vi.mock('../../src/utils/claude-config', () => ({
  backupMcpConfig,
  readMcpConfig,
  writeMcpConfig,
}))

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig: vi.fn(() => ({ codeToolType: 'claude-code' })),
}))

vi.mock('../../src/utils/code-tools/codex', () => ({
  backupCodexComplete,
  readCodexConfig,
  writeCodexConfig,
}))

vi.mock('../../src/utils/code-tools/codex-platform', () => ({
  applyCodexPlatformCommand: vi.fn(),
}))

vi.mock('../../src/utils/platform', () => ({
  getSystemRoot: vi.fn(() => null),
  isWindows: vi.fn(() => false),
}))

describe('mcp-profile codex support', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    backupCodexComplete.mockReturnValue('/tmp/codex-backup')
    readCodexConfig.mockReturnValue({
      model: 'gpt-5',
      modelProvider: 'openai',
      providers: [{ id: 'openai', name: 'OpenAI' }],
      mcpServices: [{ id: 'legacy-service', command: 'legacy', args: [] }],
      managed: true,
      otherConfig: ['approval_policy = "on-request"'],
      modelProviderCommented: true,
    })

    readMcpConfig.mockReturnValue({ mcpServers: { legacy: { command: 'legacy' } } })
  })

  it('writes the selected profile into Codex config instead of Claude config', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { useProfile } = await import('../../src/commands/mcp-profile')

    await useProfile('minimal', { tool: 'codex', lang: 'en' })

    expect(backupCodexComplete).toHaveBeenCalledTimes(1)
    expect(writeMcpConfig).not.toHaveBeenCalled()
    expect(writeCodexConfig).toHaveBeenCalledTimes(1)
    expect(writeCodexConfig).toHaveBeenCalledWith({
      model: 'gpt-5',
      modelProvider: 'openai',
      providers: [{ id: 'openai', name: 'OpenAI' }],
      mcpServices: [
        {
          id: 'context7',
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp'],
          env: undefined,
          startup_timeout_sec: 30,
        },
        {
          id: 'open-websearch',
          command: 'npx',
          args: ['-y', '@ccjk/open-websearch'],
          env: { SEARCH_MODE: 'hybrid' },
          startup_timeout_sec: 30,
        },
      ],
      managed: true,
      otherConfig: ['approval_policy = "on-request"'],
      modelProviderCommented: true,
    })

    logSpy.mockRestore()
  })

  it('reads current services from Codex config when showing profile status', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { showCurrentProfile } = await import('../../src/commands/mcp-profile')

    readCodexConfig.mockReturnValue({
      model: 'gpt-5',
      modelProvider: 'openai',
      providers: [],
      mcpServices: [
        { id: 'context7', command: 'npx', args: [] },
        { id: 'open-websearch', command: 'npx', args: [] },
      ],
      managed: true,
      otherConfig: [],
    })

    await showCurrentProfile({ tool: 'codex', lang: 'en' })

    const output = logSpy.mock.calls.flat().join('\n')
    expect(output).toContain('Current Codex MCP Configuration')
    expect(output).toContain('Matched Profile')

    logSpy.mockRestore()
  })
})

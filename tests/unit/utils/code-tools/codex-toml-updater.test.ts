import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/utils/fs-operations', () => ({
  ensureDir: vi.fn(),
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../../../src/utils/platform', () => ({
  normalizeTomlPath: vi.fn((str: string) => str.replace(/\\+/g, '/')),
}))

describe('codex-toml-updater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes MCP env as a valid TOML key-value line', async () => {
    const { exists, readFile, writeFile } = await import('../../../../src/utils/fs-operations')
    const { parseToml } = await import('../../../../src/utils/toml-edit')
    const { upsertCodexMcpService } = await import('../../../../src/utils/code-tools/codex-toml-updater')

    vi.mocked(exists).mockReturnValue(true)
    vi.mocked(readFile).mockReturnValue('')

    upsertCodexMcpService('open-websearch', {
      id: 'open-websearch',
      command: 'npx',
      args: ['-y', 'open-websearch@latest'],
      env: {
        MODE: 'stdio',
        DEFAULT_SEARCH_ENGINE: 'duckduckgo',
        ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
      },
      startup_timeout_sec: 30,
    })

    const written = vi.mocked(writeFile).mock.calls.at(-1)?.[1] as string

    expect(written).toContain('env = {')
    expect(written).not.toMatch(/^\s*\{\s*MODE\s*=/m)

    const parsed = parseToml<{ mcp_servers: Record<string, { env: Record<string, string> }> }>(written)
    expect(parsed.mcp_servers['open-websearch'].env).toEqual({
      MODE: 'stdio',
      DEFAULT_SEARCH_ENGINE: 'duckduckgo',
      ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
    })
  })

  it('repairs legacy bare inline-table env lines before updating MCP services', async () => {
    const { exists, readFile, writeFile } = await import('../../../../src/utils/fs-operations')
    const { parseToml } = await import('../../../../src/utils/toml-edit')
    const { upsertCodexMcpService } = await import('../../../../src/utils/code-tools/codex-toml-updater')

    vi.mocked(exists).mockReturnValue(true)
    vi.mocked(readFile).mockReturnValue(`
[mcp_servers.open-websearch]
command = "npx"
args = ["-y", "open-websearch@latest"]
{ ALLOWED_SEARCH_ENGINES = "duckduckgo,bing,brave", DEFAULT_SEARCH_ENGINE = "duckduckgo", MODE = "stdio" }
`)

    upsertCodexMcpService('open-websearch', {
      id: 'open-websearch',
      command: 'npx',
      args: ['-y', 'open-websearch@latest'],
      env: {
        MODE: 'stdio',
        DEFAULT_SEARCH_ENGINE: 'duckduckgo',
        ALLOWED_SEARCH_ENGINES: 'duckduckgo,bing,brave',
      },
    })

    const written = vi.mocked(writeFile).mock.calls.at(-1)?.[1] as string

    expect(written).not.toMatch(/^\s*\{\s*ALLOWED_SEARCH_ENGINES\s*=/m)
    expect((written.match(/^env\s*=/gm) || []).length).toBe(1)

    const parsed = parseToml<{ mcp_servers: Record<string, { env: Record<string, string> }> }>(written)
    expect(parsed.mcp_servers['open-websearch'].env.MODE).toBe('stdio')
  })

  it('deletes MCP service sections including nested sub-tables', async () => {
    const { exists, readFile, writeFile } = await import('../../../../src/utils/fs-operations')
    const { deleteCodexMcpService, listCodexMcpServiceIds } = await import('../../../../src/utils/code-tools/codex-toml-updater')

    vi.mocked(exists).mockReturnValue(true)
    vi.mocked(readFile).mockReturnValue(`
[model_providers.custom]
name = "custom"

[mcp_servers.open-websearch.env]
MODE = "stdio"
DEFAULT_SEARCH_ENGINE = "duckduckgo"

[mcp_servers.open-websearch.tools.search]
approval_mode = "approve"

[model_providers.other]
name = "other"
`)

    deleteCodexMcpService('open-websearch')

    const written = vi.mocked(writeFile).mock.calls.at(-1)?.[1] as string
    expect(written).not.toContain('[mcp_servers.open-websearch')
    expect(written).toContain('[model_providers.custom]')
    expect(written).toContain('[model_providers.other]')
    vi.mocked(readFile).mockReturnValue(written)
    expect(listCodexMcpServiceIds()).toEqual([])
  })

  it('deleteAllCodexMcpServices removes every mcp_servers section', async () => {
    const { exists, readFile, writeFile } = await import('../../../../src/utils/fs-operations')
    const { deleteAllCodexMcpServices, listCodexMcpServiceIds } = await import('../../../../src/utils/code-tools/codex-toml-updater')

    vi.mocked(exists).mockReturnValue(true)
    vi.mocked(readFile).mockReturnValue(`
[mcp_servers.context7]
command = "npx"

[mcp_servers.exa.env]
API_KEY = "secret"

[model_providers.custom]
name = "custom"
`)

    deleteAllCodexMcpServices()

    const written = vi.mocked(writeFile).mock.calls.at(-1)?.[1] as string
    expect(written).not.toContain('[mcp_servers.')
    expect(written).toContain('[model_providers.custom]')
    vi.mocked(readFile).mockReturnValue(written)
    expect(listCodexMcpServiceIds()).toEqual([])
  })
})

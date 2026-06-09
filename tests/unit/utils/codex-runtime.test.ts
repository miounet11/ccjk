import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: { t: vi.fn((key: string) => key) },
}))

describe('codex-runtime', () => {
  const originalEnv = process.env.CODEX_HOME

  beforeEach(() => {
    vi.resetModules()
    delete process.env.CODEX_HOME
  })

  afterEach(() => {
    if (originalEnv === undefined)
      delete process.env.CODEX_HOME
    else
      process.env.CODEX_HOME = originalEnv
  })

  it('resolveCodexHome should honor CODEX_HOME', async () => {
    process.env.CODEX_HOME = '/custom/codex-home'
    const { resolveCodexHome } = await import('../../../src/constants')
    expect(resolveCodexHome()).toBe('/custom/codex-home')
  })

  it('scanCodexConfigDoctorFindings should warn on third-party goals', async () => {
    vi.doMock('../../../src/utils/fs-operations', () => ({
      exists: vi.fn(() => true),
      readFile: vi.fn(() => `
model_provider = "ttkk"
[features]
goals = true
multi_agent = true
`),
    }))

    const { scanCodexConfigDoctorFindings } = await import('../../../src/utils/codex-runtime')
    const findings = scanCodexConfigDoctorFindings('/tmp/config.toml')

    expect(findings.some(f => f.id === 'feature-goals-third-party')).toBe(true)
    expect(findings.some(f => f.id === 'feature-multi-agent-third-party')).toBe(true)
  })

  it('detectCodexRuntimes should mark desktop weak signal when only data dir exists', async () => {
    const home = process.env.HOME || '/Users/test'
    const dataDir = `${home}/Library/Application Support/Codex`

    vi.doMock('../../../src/utils/fs-operations', () => ({
      exists: vi.fn((path: string) => String(path) === dataDir),
      readFile: vi.fn(() => ''),
    }))

    vi.doMock('../../../src/utils/platform', () => ({
      getPlatform: vi.fn(() => 'macos'),
    }))

    const { detectCodexRuntimes } = await import('../../../src/utils/codex-runtime')
    const summary = detectCodexRuntimes()
    const desktop = summary.runtimes.find(runtime => runtime.kind === 'desktop')

    expect(desktop?.detected).toBe(true)
    expect(desktop?.weakSignal).toBe(true)
    expect(desktop?.path).toBe(dataDir)
  })
})
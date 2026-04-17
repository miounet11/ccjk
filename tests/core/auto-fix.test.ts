import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  homeDir: '',
}))

vi.mock('node:os', () => ({
  homedir: () => mockState.homeDir,
}))

vi.mock('../../src/utils/config-migration', () => ({
  migrateSettingsForTokenRetrieval: vi.fn(() => ({ success: true, changes: [] })),
  needsMigration: vi.fn(() => false),
}))

describe('auto-fix settings detection', () => {
  let tempHome: string
  const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY
  const originalAnthropicAuthToken = process.env.ANTHROPIC_AUTH_TOKEN

  function settingsPath(): string {
    return join(tempHome, '.claude', 'settings.json')
  }

  function writeSettings(settings: Record<string, any>): void {
    mkdirSync(join(tempHome, '.claude'), { recursive: true })
    writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
  }

  beforeEach(() => {
    tempHome = mkdtempSync(join(process.env.TMPDIR || '/tmp', 'ccjk-auto-fix-'))
    mockState.homeDir = tempHome
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_AUTH_TOKEN
    vi.resetModules()
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey
    process.env.ANTHROPIC_AUTH_TOKEN = originalAnthropicAuthToken
    rmSync(tempHome, { recursive: true, force: true })
  })

  it('does not require legacy apiType when provider config is in env keys', async () => {
    writeSettings({
      env: {
        ANTHROPIC_API_KEY: 'sk-test',
        ANTHROPIC_BASE_URL: 'https://router.example.com',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'gpt-5.4',
        ANTHROPIC_SMALL_FAST_MODEL: 'gpt-5.4',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'gpt-5.4',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'gpt-5.4',
      },
    })

    const { detectSettingsIssues, autoFixAll } = await import('../../src/core/auto-fix')

    expect(await detectSettingsIssues()).toEqual([])
    expect(await autoFixAll(true)).toEqual({ fixed: 0, failed: 0, total: 0 })

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    expect(settings.apiType).toBeUndefined()
  })

  it('still repairs missing apiType for legacy top-level API config', async () => {
    writeSettings({
      baseUrl: 'https://legacy.example.com',
      apiKey: 'sk-legacy',
      env: {},
    })

    const { detectSettingsIssues, autoFixAll } = await import('../../src/core/auto-fix')
    const issues = await detectSettingsIssues()

    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      type: 'invalid',
      severity: 'critical',
      description: 'Missing apiType in settings.json',
    })

    expect(await autoFixAll(true)).toEqual({ fixed: 1, failed: 0, total: 1 })

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    expect(settings.apiType).toBe('anthropic')
  })

  it('does not report missing API key when anthropic mode uses env credentials', async () => {
    writeSettings({
      apiType: 'anthropic',
      env: {
        ANTHROPIC_API_KEY: 'sk-env',
      },
    })

    const { detectSettingsIssues } = await import('../../src/core/auto-fix')

    expect(await detectSettingsIssues()).toEqual([])
  })

  it('does not report missing API key when anthropic mode uses legacy auth token', async () => {
    writeSettings({
      apiType: 'anthropic',
      authToken: 'token-legacy',
      env: {},
    })

    const { detectSettingsIssues } = await import('../../src/core/auto-fix')

    expect(await detectSettingsIssues()).toEqual([])
  })

  it('keeps missing settings.json as a critical issue', async () => {
    const { detectSettingsIssues } = await import('../../src/core/auto-fix')

    expect(existsSync(settingsPath())).toBe(false)
    expect(await detectSettingsIssues()).toEqual([
      expect.objectContaining({
        type: 'missing',
        severity: 'critical',
        description: 'settings.json not found',
      }),
    ])
  })
})

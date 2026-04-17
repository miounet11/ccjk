import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const TEMP_BASE = join(tmpdir(), 'ccjk-quick-provider-fixed')

vi.mock('../../src/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/constants')>()
  const { join } = require('node:path')
  const { tmpdir } = require('node:os')
  const base = join(tmpdir(), 'ccjk-quick-provider-fixed')
  return {
    ...actual,
    SETTINGS_FILE: join(base, 'settings.json'),
  }
})

describe('quick provider config persistence', () => {
  function settingsPath(): string {
    return join(TEMP_BASE, 'settings.json')
  }

  beforeEach(() => {
    rmSync(TEMP_BASE, { recursive: true, force: true })
    mkdirSync(TEMP_BASE, { recursive: true })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(TEMP_BASE, { recursive: true, force: true })
  })

  it('writes env-based provider config and removes stale top-level runtime fields', async () => {
    mkdirSync(TEMP_BASE, { recursive: true })
    writeFileSync(settingsPath(), JSON.stringify({
      apiProvider: 'custom',
      apiUrl: 'https://stale.example.com',
      apiKey: 'sk-stale',
      authToken: 'token-stale',
      defaultModel: 'stale-default',
      preferredModel: 'stale-preferred',
      env: {
        ANTHROPIC_AUTH_TOKEN: 'token-stale',
      },
    }, null, 2))

    const { saveProviderConfig } = await import('../../src/commands/quick-provider')

    await saveProviderConfig({
      shortcode: 'glm',
      provider: {
        shortcode: 'glm',
        name: 'GLM',
        apiUrl: 'https://router.example.com/v1',
        verified: true,
        createdAt: new Date().toISOString(),
      },
      apiKey: 'sk-new',
      model: 'gpt-5.4',
    })

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    expect(settings.apiProvider).toBeUndefined()
    expect(settings.apiUrl).toBeUndefined()
    expect(settings.apiKey).toBeUndefined()
    expect(settings.authToken).toBeUndefined()
    expect(settings.defaultModel).toBeUndefined()
    expect(settings.preferredModel).toBeUndefined()
    expect(settings.model).toBe('gpt-5.4')
    expect(settings.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://router.example.com/v1',
      ANTHROPIC_API_KEY: 'sk-new',
    })
    expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBeUndefined()
  })

  it('creates settings.json when missing', async () => {
    expect(existsSync(settingsPath())).toBe(false)

    const { saveProviderConfig } = await import('../../src/commands/quick-provider')

    await saveProviderConfig({
      shortcode: 'kimi',
      provider: {
        shortcode: 'kimi',
        name: 'Kimi',
        apiUrl: 'https://kimi.example.com/v1',
        verified: false,
        createdAt: new Date().toISOString(),
      },
      apiKey: 'sk-kimi',
      model: 'kimi-k2',
    })

    const settings = JSON.parse(readFileSync(settingsPath(), 'utf-8'))
    expect(settings.env).toMatchObject({
      ANTHROPIC_BASE_URL: 'https://kimi.example.com/v1',
      ANTHROPIC_API_KEY: 'sk-kimi',
    })
    expect(settings.model).toBe('kimi-k2')
  })
})

import { describe, expect, it } from 'vitest'
import { EXTERNAL_CLIENTS, getExternalClient, opencodeConfigFile } from '../../../src/config/external-clients'
import {
  buildExternalClientHints,
  getExternalClientStatus,
  mapProfileToExternalClientEnv,
} from '../../../src/utils/external-clients-runtime'

describe('external-clients registry', () => {
  it('registers the requested clients', () => {
    const ids = EXTERNAL_CLIENTS.map(entry => entry.id)
    expect(ids).toEqual(['pi', 'opencode', 'zcode', 'grokbuild', 'claudework'])
  })

  it('resolves entries by id and returns null for unknown', () => {
    expect(getExternalClient('opencode')?.displayName).toBe('OpenCode')
    expect(getExternalClient('nonexistent')).toBeNull()
  })

  it('uses anthropic env strategy only for claudework', () => {
    for (const entry of EXTERNAL_CLIENTS) {
      if (entry.id === 'claudework')
        expect(entry.envStrategy).toBe('anthropic')
      else
        expect(entry.envStrategy).toBe('openai')
    }
  })

  it('has unique bins and ids', () => {
    const ids = new Set(EXTERNAL_CLIENTS.map(e => e.id))
    const bins = new Set(EXTERNAL_CLIENTS.map(e => e.bin))
    expect(ids.size).toBe(EXTERNAL_CLIENTS.length)
    expect(bins.size).toBe(EXTERNAL_CLIENTS.length)
  })
})

describe('external-clients-runtime', () => {
  it('maps openai env for openai-strategy clients', () => {
    const entry = getExternalClient('pi')!
    const env = mapProfileToExternalClientEnv(entry, {
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-x',
      model: 'gpt-5',
    })
    expect(env).toEqual({
      OPENAI_API_KEY: 'sk-x',
      OPENAI_BASE_URL: 'https://api.example.com/v1',
      OPENAI_MODEL: 'gpt-5',
    })
  })

  it('maps anthropic env for anthropic-strategy clients', () => {
    const entry = getExternalClient('claudework')!
    const env = mapProfileToExternalClientEnv(entry, {
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-a',
      model: 'claude-sonnet-4-5',
    })
    expect(env).toEqual({
      ANTHROPIC_API_KEY: 'sk-a',
      ANTHROPIC_BASE_URL: 'https://api.example.com',
      ANTHROPIC_MODEL: 'claude-sonnet-4-5',
    })
  })

  it('returns empty env when apiKey missing', () => {
    const entry = getExternalClient('opencode')!
    expect(mapProfileToExternalClientEnv(entry, { baseUrl: 'https://x' })).toEqual({})
  })

  it('status reports install and config presence', () => {
    const entry = getExternalClient('nonexistent-bin-tool') ?? getExternalClient('zcode')!
    const status = getExternalClientStatus(entry)
    expect(typeof status.installed).toBe('boolean')
    expect(typeof status.configDirExists).toBe('boolean')
    expect(status.hint.length).toBeGreaterThan(0)
  })

  it('builds hints for every registered client', () => {
    const hints = buildExternalClientHints().join('\n')
    for (const entry of EXTERNAL_CLIENTS)
      expect(hints).toContain(entry.displayName)
  })

  it('opencode config path ends with opencode.json', () => {
    expect(opencodeConfigFile().endsWith('opencode.json')).toBe(true)
  })
})

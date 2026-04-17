import type { ClaudeSettings } from '../../src/types/config'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SETTINGS_FILE } from '../../src/constants'
import { DEFAULT_MODEL_CHOICES } from '../../src/utils/features'
import { getExistingCustomModelConfig, getExistingModelConfig, updateCustomModel, updateDefaultModel } from '../../src/utils/config'
import { readJsonConfig } from '../../src/utils/json-config'

const STALE_RUNTIME_SETTINGS = {
  apiKey: 'sk-stale',
  authToken: 'token-stale',
  defaultModel: 'stale-default',
  preferredModel: 'stale-preferred',
  env: {
    ANTHROPIC_API_KEY: 'sk-test',
  },
}

describe('default model feature', () => {
  let originalSettings: string | null = null

  beforeEach(() => {
    originalSettings = existsSync(SETTINGS_FILE) ? readFileSync(SETTINGS_FILE, 'utf-8') : null
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
  })

  afterEach(() => {
    if (originalSettings === null) {
      rmSync(SETTINGS_FILE, { force: true })
    }
    else {
      writeFileSync(SETTINGS_FILE, originalSettings, 'utf-8')
    }
  })

  it('includes the full ZCF-style model choice set', () => {
    expect(DEFAULT_MODEL_CHOICES.map(choice => choice.value)).toEqual([
      'default',
      'opus',
      'sonnet',
      'sonnet[1m]',
      'custom',
    ])
  })

  it('persists sonnet as the selected built-in default model', () => {
    writeFileSync(SETTINGS_FILE, JSON.stringify(STALE_RUNTIME_SETTINGS, null, 2))

    updateDefaultModel('sonnet')

    const settings = readJsonConfig<ClaudeSettings & Record<string, any>>(SETTINGS_FILE)
    expect(settings?.model).toBe('sonnet')
    expect(settings?.apiKey).toBeUndefined()
    expect(settings?.authToken).toBeUndefined()
    expect(settings?.defaultModel).toBeUndefined()
    expect(settings?.preferredModel).toBeUndefined()
    expect(getExistingModelConfig()).toBe('sonnet')
  })

  it('persists custom primary model in settings.model', () => {
    writeFileSync(SETTINGS_FILE, JSON.stringify(STALE_RUNTIME_SETTINGS, null, 2))

    updateCustomModel('claude-opus-4.6')

    const settings = readJsonConfig<ClaudeSettings & Record<string, any>>(SETTINGS_FILE)
    expect(settings?.model).toBe('claude-opus-4.6')
    expect(settings?.apiKey).toBeUndefined()
    expect(settings?.authToken).toBeUndefined()
    expect(settings?.defaultModel).toBeUndefined()
    expect(settings?.preferredModel).toBeUndefined()
    expect(settings?.env?.ANTHROPIC_MODEL).toBeUndefined()
    expect(getExistingModelConfig()).toBe('custom')
    expect(getExistingCustomModelConfig()).toEqual({
      primaryModel: 'claude-opus-4.6',
      haikuModel: undefined,
      sonnetModel: undefined,
      opusModel: undefined,
    })
  })
})

import type { ClaudeSettings } from '../../src/types/config'
import type { ClaudeCodeConfigData } from '../../src/types/claude-code-config'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'pathe'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { SETTINGS_FILE, ZCF_CONFIG_FILE } from '../../src/constants'
import { initI18n } from '../../src/i18n'
import { migrateSettingsForTokenRetrieval, needsMigration } from '../../src/utils/config-migration'
import { ClaudeCodeConfigManager } from '../../src/utils/claude-code-config-manager'
import { updateCustomModel } from '../../src/utils/config'
import { readJsonConfig } from '../../src/utils/json-config'

describe('haiku model compatibility', () => {
  let originalSettings: string | null = null
  let originalConfig: string | null = null

  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    originalSettings = existsSync(SETTINGS_FILE) ? readFileSync(SETTINGS_FILE, 'utf-8') : null
    originalConfig = existsSync(ZCF_CONFIG_FILE) ? readFileSync(ZCF_CONFIG_FILE, 'utf-8') : null
  })

  afterEach(() => {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
    mkdirSync(dirname(ZCF_CONFIG_FILE), { recursive: true })

    if (originalSettings === null) {
      rmSync(SETTINGS_FILE, { force: true })
    }
    else {
      writeFileSync(SETTINGS_FILE, originalSettings, 'utf-8')
    }

    if (originalConfig === null) {
      rmSync(ZCF_CONFIG_FILE, { force: true })
    }
    else {
      writeFileSync(ZCF_CONFIG_FILE, originalConfig, 'utf-8')
    }
  })

  it('writes Haiku to both compatibility env keys for custom model config', () => {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })

    updateCustomModel(
      'claude-opus-4.6',
      'claude-haiku-4.5',
      'claude-sonnet-4.6',
      'claude-opus-4.6',
    )

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(settings?.model).toBe('claude-opus-4.6')
    expect(settings?.env?.ANTHROPIC_MODEL).toBeUndefined()
    expect(settings?.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')
    expect(settings?.env?.ANTHROPIC_SMALL_FAST_MODEL).toBe('claude-haiku-4.5')
    expect(settings?.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('claude-sonnet-4.6')
    expect(settings?.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('claude-opus-4.6')
  })

  it('applies profile settings with Haiku fast-model compatibility', async () => {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
    mkdirSync(dirname(ZCF_CONFIG_FILE), { recursive: true })

    const config: ClaudeCodeConfigData = {
      currentProfileId: 'haiku-profile',
      profiles: {
        'haiku-profile': {
          name: 'haiku-profile',
          authType: 'api_key',
          apiKey: 'sk-test',
          baseUrl: 'https://example.com',
          primaryModel: 'claude-opus-4.6',
          defaultHaikuModel: 'claude-haiku-4.5',
          defaultSonnetModel: 'claude-sonnet-4.6',
          defaultOpusModel: 'claude-opus-4.6',
        },
      },
    }

    ClaudeCodeConfigManager.writeConfig(config)
    await ClaudeCodeConfigManager.applyCurrentProfile()

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(settings?.env?.ANTHROPIC_API_KEY).toBe('sk-test')
    expect(settings?.env?.ANTHROPIC_BASE_URL).toBe('https://example.com')
    expect(settings?.model).toBe('claude-opus-4.6')
    expect(settings?.env?.ANTHROPIC_MODEL).toBeUndefined()
    expect(settings?.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')
    expect(settings?.env?.ANTHROPIC_SMALL_FAST_MODEL).toBe('claude-haiku-4.5')
  })

  it('repairs missing Haiku fast-model compatibility during migration', () => {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })

    const initialSettings: ClaudeSettings = {
      env: {
        ANTHROPIC_MODEL: 'claude-opus-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4.5',
      },
    }

    writeFileSync(SETTINGS_FILE, JSON.stringify(initialSettings, null, 2))

    expect(needsMigration()).toBe(true)

    const result = migrateSettingsForTokenRetrieval()
    expect(result.success).toBe(true)
    expect(result.changes.some(change => change.includes('ANTHROPIC_SMALL_FAST_MODEL'))).toBe(true)

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(settings?.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')
    expect(settings?.env?.ANTHROPIC_SMALL_FAST_MODEL).toBe('claude-haiku-4.5')
    expect(needsMigration()).toBe(false)
  })
})

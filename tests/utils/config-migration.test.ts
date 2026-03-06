import type { ClaudeSettings } from '../../src/types/config'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'pathe'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { SETTINGS_FILE, ZCF_CONFIG_FILE } from '../../src/constants'
import { initI18n } from '../../src/i18n'
import { ClaudeCodeConfigManager } from '../../src/utils/claude-code-config-manager'
import { migrateSettingsForTokenRetrieval, needsMigration } from '../../src/utils/config-migration'
import { writeJsonConfig } from '../../src/utils/json-config'

describe('config-migration adaptive model repair', () => {
  let originalSettings: string | null = null
  let originalCcjkConfig: string | null = null

  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    originalSettings = existsSync(SETTINGS_FILE) ? readFileSync(SETTINGS_FILE, 'utf-8') : null
    originalCcjkConfig = existsSync(ZCF_CONFIG_FILE) ? readFileSync(ZCF_CONFIG_FILE, 'utf-8') : null
  })

  afterEach(() => {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
    mkdirSync(dirname(ZCF_CONFIG_FILE), { recursive: true })

    if (originalSettings === null) {
      if (existsSync(SETTINGS_FILE))
        rmSync(SETTINGS_FILE, { force: true })
    }
    else {
      writeFileSync(SETTINGS_FILE, originalSettings, 'utf-8')
    }

    if (originalCcjkConfig === null) {
      if (existsSync(ZCF_CONFIG_FILE))
        rmSync(ZCF_CONFIG_FILE, { force: true })
    }
    else {
      writeFileSync(ZCF_CONFIG_FILE, originalCcjkConfig, 'utf-8')
    }
  })

  it('restores fast-model compatibility without deleting primary adaptive routing', () => {
    mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
    mkdirSync(dirname(ZCF_CONFIG_FILE), { recursive: true })

    const settings: ClaudeSettings = {
      model: 'custom',
      env: {
        ANTHROPIC_MODEL: 'claude-opus-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4.5',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4.6',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4.6',
      },
    }
    writeJsonConfig(SETTINGS_FILE, settings)

    ClaudeCodeConfigManager.writeConfig({
      currentProfileId: 'adaptive',
      profiles: {
        adaptive: {
          name: 'adaptive',
          authType: 'api_key',
          apiKey: 'sk-test',
          baseUrl: 'https://example.com',
          primaryModel: 'claude-opus-4.6',
          defaultHaikuModel: 'claude-haiku-4.5',
          defaultSonnetModel: 'claude-sonnet-4.6',
          defaultOpusModel: 'claude-opus-4.6',
        },
      },
    })

    expect(needsMigration()).toBe(true)

    const result = migrateSettingsForTokenRetrieval()
    expect(result.success).toBe(true)
    expect(result.changes.some(change => change.includes('ANTHROPIC_SMALL_FAST_MODEL'))).toBe(true)
    expect(result.changes.some(change => change.includes('settings.model override'))).toBe(true)
    expect(result.changes.some(change => change.includes('Preserved profile-level primaryModel'))).toBe(true)

    const updatedSettings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8')) as ClaudeSettings
    expect(updatedSettings.model).toBeUndefined()
    expect(updatedSettings.env?.ANTHROPIC_MODEL).toBe('claude-opus-4.6')
    expect(updatedSettings.env?.ANTHROPIC_SMALL_FAST_MODEL).toBe('claude-haiku-4.5')
    expect(updatedSettings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')

    const updatedConfig = ClaudeCodeConfigManager.readConfig()
    expect(updatedConfig?.profiles.adaptive.primaryModel).toBe('claude-opus-4.6')
    expect(needsMigration()).toBe(false)
  })
})

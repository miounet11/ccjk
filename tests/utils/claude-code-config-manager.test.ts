import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { ClaudeCodeConfigManager } from '../../src/utils/claude-code-config-manager'
import { readJsonConfig, writeJsonConfig } from '../../src/utils/json-config'
import type { ClaudeSettings } from '../../src/types/claude-code-config'
import type { ClaudeCodeProfile } from '../../src/types/claude-code-config'
import { join } from 'pathe'
import { homedir } from 'node:os'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { initI18n } from '../../src/i18n'

const SETTINGS_FILE = join(homedir(), '.claude', 'settings.json')

describe('ClaudeCodeConfigManager - Model Configuration', () => {
  let originalSettings: ClaudeSettings | null = null

  beforeAll(async () => {
    // Initialize i18n before running tests
    await initI18n('en')
  })

  beforeEach(() => {
    // Backup original settings
    originalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
  })

  afterEach(() => {
    // Restore original settings
    if (originalSettings) {
      writeJsonConfig(SETTINGS_FILE, originalSettings)
    }
  })

  it('should set ANTHROPIC_MODEL when primaryModel is configured', async () => {
    const initialSettings: ClaudeSettings = {
      env: {}
    }
    writeJsonConfig(SETTINGS_FILE, initialSettings)

    const profile: ClaudeCodeProfile = {
      name: 'test-profile',
      authType: 'api_key',
      primaryModel: 'claude-sonnet-4.6'
    }

    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    const finalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(finalSettings).toBeDefined()
    expect(finalSettings!.env?.ANTHROPIC_MODEL).toBe('claude-sonnet-4.6')
  })

  it('should set all model environment variables when configured', async () => {
    const initialSettings: ClaudeSettings = {
      env: {}
    }
    writeJsonConfig(SETTINGS_FILE, initialSettings)

    const profile: ClaudeCodeProfile = {
      name: 'test-profile',
      authType: 'api_key',
      primaryModel: 'claude-sonnet-4.6',
      defaultHaikuModel: 'claude-haiku-4.5',
      defaultSonnetModel: 'claude-sonnet-4.6',
      defaultOpusModel: 'claude-opus-4.6'
    }

    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    const finalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(finalSettings).toBeDefined()
    expect(finalSettings!.env?.ANTHROPIC_MODEL).toBe('claude-sonnet-4.6')
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('claude-sonnet-4.6')
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('claude-opus-4.6')
  })

  it('should clear model env vars when no custom models are configured', async () => {
    const initialSettings: ClaudeSettings = {
      env: {
        ANTHROPIC_MODEL: 'claude-sonnet-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4.5'
      }
    }
    writeJsonConfig(SETTINGS_FILE, initialSettings)

    const profile: ClaudeCodeProfile = {
      name: 'test-profile',
      authType: 'api_key'
      // No custom models
    }
    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    const finalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(finalSettings).toBeDefined()
    expect(finalSettings!.env?.ANTHROPIC_MODEL).toBeUndefined()
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined()
  })
})

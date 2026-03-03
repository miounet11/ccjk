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

describe('ClaudeCodeConfigManager - Model Priority Fix', () => {
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

  it('should delete settings.model when custom models are configured via env vars', async () => {
    // Step 1: Simulate Claude Code setting settings.model
    const initialSettings: ClaudeSettings = {
      model: 'claude-opus-4.6', // This should be deleted
      env: {}
    }
    writeJsonConfig(SETTINGS_FILE, initialSettings)

    // Step 2: Apply profile with custom models
    const profile: ClaudeCodeProfile = {
      name: 'test-profile',
      authType: 'api_key',
      primaryModel: 'claude-sonnet-4.6',
      defaultHaikuModel: 'claude-haiku-4.5',
      defaultSonnetModel: 'claude-sonnet-4.6',
      defaultOpusModel: 'claude-opus-4.6'
    }

    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    // Step 3: Verify settings.model is deleted
    const finalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(finalSettings).toBeDefined()
    expect(finalSettings!.model).toBeUndefined()
    expect(finalSettings!.env?.ANTHROPIC_MODEL).toBe('claude-sonnet-4.6')
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('claude-sonnet-4.6')
    expect(finalSettings!.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('claude-opus-4.6')
  })

  it('should preserve settings.model when no custom models are configured', async () => {
    // Step 1: Set settings.model without custom env vars
    const initialSettings: ClaudeSettings = {
      model: 'claude-opus-4.6',
      env: {}
    }
    writeJsonConfig(SETTINGS_FILE, initialSettings)

    // Step 2: Apply profile without custom models
    const profile: ClaudeCodeProfile = {
      name: 'test-profile',
      authType: 'api_key'
    }
    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    // Step 3: Verify settings.model is preserved
    const finalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(finalSettings).toBeDefined()
    expect(finalSettings!.model).toBe('claude-opus-4.6')
  })

  it('should handle the case where settings.model is already not present', async () => {
    // Step 1: Create settings without model field
    const initialSettings: ClaudeSettings = {
      env: {
        ANTHROPIC_MODEL: 'claude-sonnet-4.6'
      }
    }
    writeJsonConfig(SETTINGS_FILE, initialSettings)

    // Step 2: Apply profile with custom models
    const profile: ClaudeCodeProfile = {
      primaryModel: 'claude-sonnet-4.6'
    }

    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    // Step 3: Verify no errors and env vars are preserved
    const finalSettings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(finalSettings).toBeDefined()
    expect(finalSettings!.model).toBeUndefined()
    expect(finalSettings!.env?.ANTHROPIC_MODEL).toBe('claude-sonnet-4.6')
  })
})

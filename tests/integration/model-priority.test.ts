import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ClaudeSettings } from '../../src/types/claude-code-config'

describe('Model Priority Integration Test', () => {
  let tempHome: string
  let originalHome: string
  const CLI_PATH = join(process.cwd(), 'dist/cli.mjs')

  beforeAll(async () => {
    // Initialize i18n
    const { initI18n } = await import('../../dist/chunks/index6.mjs')
    await initI18n()
  })

  beforeEach(() => {
    // Create temp home directory
    originalHome = process.env.HOME || ''
    tempHome = join(tmpdir(), `ccjk-model-test-${Date.now()}`)
    mkdirSync(tempHome, { recursive: true })
    mkdirSync(join(tempHome, '.claude'), { recursive: true })
    mkdirSync(join(tempHome, '.ccjk'), { recursive: true })

    // Set temp HOME
    process.env.HOME = tempHome
  })

  afterEach(() => {
    // Restore original HOME
    process.env.HOME = originalHome

    // Clean up temp directory
    if (existsSync(tempHome)) {
      rmSync(tempHome, { recursive: true, force: true })
    }
  })

  it('should delete settings.model when custom models are configured', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json')

    // Step 1: Create initial settings with custom model env vars
    const initialSettings: ClaudeSettings = {
      env: {
        ANTHROPIC_MODEL: 'claude-sonnet-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4.5',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4.6',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4.6'
      }
    }
    writeFileSync(settingsPath, JSON.stringify(initialSettings, null, 2))

    // Step 2: Simulate Claude Code's /model command setting settings.model
    const settingsWithModel: ClaudeSettings = {
      ...initialSettings,
      model: 'claude-opus-4.6' // This should be deleted
    }
    writeFileSync(settingsPath, JSON.stringify(settingsWithModel, null, 2))

    // Verify settings.model is set
    let settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as ClaudeSettings
    expect(settings.model).toBe('claude-opus-4.6')

    // Step 3: Simulate applying profile (this triggers the fix)
    // We'll directly test the logic by importing and calling the function
    const { ClaudeCodeConfigManager } = await import('../../dist/chunks/claude-code-config-manager.mjs')
    const profile = {
      name: 'test-profile',
      authType: 'api_key' as const,
      primaryModel: 'claude-sonnet-4.6',
      defaultHaikuModel: 'claude-haiku-4.5',
      defaultSonnetModel: 'claude-sonnet-4.6',
      defaultOpusModel: 'claude-opus-4.6'
    }

    // Apply profile settings
    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    // Step 4: Verify settings.model is deleted
    settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as ClaudeSettings
    expect(settings.model).toBeUndefined()
    expect('model' in settings).toBe(false)

    // Verify env vars are preserved
    expect(settings.env?.ANTHROPIC_MODEL).toBe('claude-sonnet-4.6')
    expect(settings.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4.5')
    expect(settings.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('claude-sonnet-4.6')
    expect(settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('claude-opus-4.6')
  })

  it('should preserve settings.model when no custom models are configured', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json')

    // Step 1: Create settings with settings.model but no custom env vars
    const initialSettings: ClaudeSettings = {
      model: 'claude-opus-4.6'
    }
    writeFileSync(settingsPath, JSON.stringify(initialSettings, null, 2))

    // Step 2: Apply profile without custom models
    const { ClaudeCodeConfigManager } = await import('../../dist/chunks/claude-code-config-manager.mjs')
    const profile = {
      name: 'test-profile',
      authType: 'api_key' as const
      // No custom models
    }

    await ClaudeCodeConfigManager.applyProfileSettings(profile)

    // Step 3: Verify settings.model is preserved
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) as ClaudeSettings
    expect(settings.model).toBe('claude-opus-4.6')
  })
})

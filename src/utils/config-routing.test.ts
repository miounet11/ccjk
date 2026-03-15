import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { initI18n } from '../i18n'
import { mergeSettingsFile } from './config'
import { sanitizeClaudeSettings, validateClaudeSettings } from './config-validator'

beforeAll(async () => {
  await initI18n('zh-CN')
})

describe('mergeSettingsFile', () => {
  it('drops invalid default model during template merge', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'ccjk-config-merge-'))

    try {
      const templatePath = join(tempDir, 'template.json')
      const targetPath = join(tempDir, 'settings.json')

      writeFileSync(templatePath, JSON.stringify({
        $schema: 'https://json.schemastore.org/claude-code-settings.json',
        description: 'template',
        model: 'default',
        env: {
          ANTHROPIC_SMALL_FAST_MODEL: '',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
          ANTHROPIC_DEFAULT_SONNET_MODEL: '',
          ANTHROPIC_DEFAULT_OPUS_MODEL: '',
        },
        attribution: {},
        fileSuggestion: {
          type: 'command',
          command: 'git',
        },
        permissions: {
          allow: ['Read(*)'],
        },
      }, null, 2))

      writeFileSync(targetPath, JSON.stringify({
        env: {
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5-20251001',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-6',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-6',
        },
        permissions: {
          allow: ['Read(*)'],
        },
      }, null, 2))

      mergeSettingsFile(templatePath, targetPath)

      const merged = JSON.parse(readFileSync(targetPath, 'utf8'))
      expect(merged.model).toBeUndefined()
      expect(merged.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('claude-haiku-4-5-20251001')
    }
    finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

describe('config-validator', () => {
  it('treats model default as invalid runtime config', () => {
    expect(validateClaudeSettings({ model: 'default' })).toBe(false)
  })

  it('removes model default during sanitization', () => {
    expect(sanitizeClaudeSettings({ model: 'default', env: { ANTHROPIC_API_KEY: 'sk-test' } })).toEqual({
      env: { ANTHROPIC_API_KEY: 'sk-test' },
    })
  })
})

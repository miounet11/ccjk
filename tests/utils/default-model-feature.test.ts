import type { ClaudeSettings } from '../../src/types/config'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SETTINGS_FILE } from '../../src/constants'
import { DEFAULT_MODEL_CHOICES } from '../../src/utils/features'
import { getExistingModelConfig, updateDefaultModel } from '../../src/utils/config'
import { readJsonConfig } from '../../src/utils/json-config'

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
    updateDefaultModel('sonnet')

    const settings = readJsonConfig<ClaudeSettings>(SETTINGS_FILE)
    expect(settings?.model).toBe('sonnet')
    expect(getExistingModelConfig()).toBe('sonnet')
  })
})

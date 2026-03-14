import { describe, expect, it } from 'vitest'
import { CODEX_MODEL_CHOICES } from './features'

describe('codex model choices', () => {
  it('keeps the stable Codex model list in the recommended order', () => {
    expect(CODEX_MODEL_CHOICES.map(choice => choice.value)).toEqual([
      'gpt-5-codex',
      'codex-mini-latest',
      'gpt-5',
      'custom',
    ])
  })
})

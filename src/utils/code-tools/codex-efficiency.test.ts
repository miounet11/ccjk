import { describe, expect, it } from 'vitest'
import { getCodexEfficiencyActionIds } from './codex'

describe('getCodexEfficiencyActionIds', () => {
  it('exposes the Codex efficiency center actions in menu order', () => {
    expect(getCodexEfficiencyActionIds()).toEqual([
      'quick-optimize',
      'preset-bundles',
      'workflow-prompts',
      'model',
      'docs-mcp',
      'prompt-memory',
      'back',
    ])
  })
})

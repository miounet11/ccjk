import { describe, expect, it } from 'vitest'
import { buildMenuListChoices, getToolMenuLayout, TOOL_MENU_LAYOUTS } from '../../../src/utils/menu-layout'

describe('menu-layout', () => {
  it('defines layouts for all four tools', () => {
    expect(Object.keys(TOOL_MENU_LAYOUTS).sort()).toEqual(['claude-code', 'clavue', 'codex', 'grok'])
  })

  it('uses doctor hub entry instead of scattered doctor shortcuts', () => {
    for (const tool of ['clavue', 'claude-code', 'codex', 'grok'] as const) {
      const keys = getToolMenuLayout(tool).doctorLines.map(line => line.key)
      expect(keys).toEqual(['h'])
    }
  })

  it('builds grouped list choices with hub entries', () => {
    const values = buildMenuListChoices('codex')
      .filter(choice => !choice.disabled)
      .map(choice => choice.value)

    expect(values).toContain('w')
    expect(values).toContain('h')
    expect(values).toContain('1')
    expect(values).toContain('q')
  })

  it('includes operator wizard for grok', () => {
    const values = buildMenuListChoices('grok')
      .filter(choice => !choice.disabled)
      .map(choice => choice.value)

    expect(values).toContain('w')
    expect(values).toContain('h')
  })
})
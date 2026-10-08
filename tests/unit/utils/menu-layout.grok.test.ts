import { describe, expect, it } from 'vitest'
import { TOOL_MENU_LAYOUTS } from '../../../src/utils/menu-layout'

describe('grok menu layout', () => {
  it('only exposes implemented Grok operator entries', () => {
    const keys = TOOL_MENU_LAYOUTS.grok.operatorLines.map(line => line.key)
    const labels = TOOL_MENU_LAYOUTS.grok.operatorLines.map(line => line.labelKey)

    expect(keys).toEqual(['1', '2', '3'])
    expect(labels).toEqual([
      'menu:menuOptions.grokConfigureApi',
      'menu:menuOptions.grokStatus',
      'menu:menuOptions.grokConfigureModel',
    ])
    expect(labels).not.toContain('menu:menuOptions.grokConfigureMcp')
    expect(labels).not.toContain('menu:menuOptions.grokConfigureAiMemory')
  })
})

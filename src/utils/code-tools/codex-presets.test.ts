import { describe, expect, it } from 'vitest'

import { getCodexPresetDefinitions } from './codex'

describe('codex preset definitions', () => {
  it('exposes the expected preset tiers for quick Codex setup', () => {
    const presets = getCodexPresetDefinitions()

    expect(presets.map(preset => preset.id)).toEqual(['minimal', 'dev', 'full'])
  })

  it('keeps the full preset richer than the minimal preset', () => {
    const presets = getCodexPresetDefinitions()
    const minimal = presets.find(preset => preset.id === 'minimal')
    const full = presets.find(preset => preset.id === 'full')

    expect(minimal?.workflows).toEqual(['sixStepsWorkflow', 'gitWorkflow'])
    expect(minimal?.mcpServices).toEqual(['context7', 'open-websearch'])

    expect(full?.workflows).toEqual(['sixStepsWorkflow', 'gitWorkflow'])
    expect(full?.mcpServices).toEqual(['context7', 'open-websearch', 'mcp-deepwiki', 'serena'])
  })
})

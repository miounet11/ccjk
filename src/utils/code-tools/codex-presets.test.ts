import { describe, expect, it } from 'vitest'

import { getCodexPresetDefinitions, getCodexWorkflowOptionIds } from './codex'

describe('codex preset definitions', () => {
  it('exposes the expected preset tiers for quick Codex setup', () => {
    const presets = getCodexPresetDefinitions()

    expect(presets.map(preset => preset.id)).toEqual(['minimal', 'dev', 'full'])
  })

  it('keeps the full preset richer than the minimal preset', () => {
    const presets = getCodexPresetDefinitions()
    const minimal = presets.find(preset => preset.id === 'minimal')
    const dev = presets.find(preset => preset.id === 'dev')
    const full = presets.find(preset => preset.id === 'full')

    expect(minimal?.workflows).toEqual(['sixStepsWorkflow', 'gitWorkflow'])
    expect(minimal?.mcpServices).toEqual(['context7', 'open-websearch'])

    expect(dev?.workflows).toEqual(['sixStepsWorkflow', 'essentialTools', 'gitWorkflow'])
    expect(dev?.mcpServices).toEqual(['context7', 'open-websearch', 'mcp-deepwiki'])

    expect(full?.workflows).toEqual([
      'sixStepsWorkflow',
      'essentialTools',
      'gitWorkflow',
      'specFirstTDD',
      'refactoringMaster',
      'linearMethod',
      'interviewWorkflow',
    ])
    expect(full?.mcpServices).toEqual(['context7', 'open-websearch', 'mcp-deepwiki', 'serena'])
  })

  it('exposes the Codex workflow prompt catalog in stable menu order', () => {
    expect(getCodexWorkflowOptionIds()).toEqual([
      'sixStepsWorkflow',
      'essentialTools',
      'gitWorkflow',
      'interviewWorkflow',
      'specFirstTDD',
      'continuousDelivery',
      'refactoringMaster',
      'linearMethod',
    ])
  })
})

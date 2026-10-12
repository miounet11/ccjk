import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCodexSetupPreset, getDefaultCodexWorkflowNames } from '../../../src/config/codex-presets'

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}))

describe('codex-presets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should apply clean preset without workflows or mcp', () => {
    const result = applyCodexSetupPreset('clean', {})
    expect(result.setupPreset).toBe('clean')
    expect(result.systemPromptStyle).toBe('none')
    expect(result.skipWorkflowInstall).toBe(true)
    expect(result.mcpServices).toBe(false)
    expect(result.skipAgentsLanguageDirective).toBe(true)
  })

  it('should apply optimized preset with baseline style and context7', () => {
    const result = applyCodexSetupPreset('optimized', {})
    expect(result.setupPreset).toBe('optimized')
    expect(result.systemPromptStyle).toBe('agents-md-baseline')
    expect(result.skipWorkflowInstall).toBe(false)
    expect(result.mcpServices).toEqual(['context7'])
    expect(result.workflows?.length).toBeGreaterThan(0)
  })

  it('should leave custom preset options unchanged aside from marker', () => {
    const result = applyCodexSetupPreset('custom', { skipPrompt: true })
    expect(result.setupPreset).toBe('custom')
    expect(result.skipPrompt).toBe(true)
    expect(result.systemPromptStyle).toBeUndefined()
  })

  it('should expose default workflow names from config', () => {
    const names = getDefaultCodexWorkflowNames()
    expect(names.length).toBeGreaterThan(0)
    expect(names.every(name => typeof name === 'string')).toBe(true)
  })
})
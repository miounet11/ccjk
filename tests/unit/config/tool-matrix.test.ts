import { describe, expect, it } from 'vitest'
import {
  getDoctorScopeSummary,
  getToolMatrix,
  getToolsWithCapability,
  TOOL_MATRIX,
} from '../../../src/config/tool-matrix'

describe('tool-matrix', () => {
  it('covers all four code tools', () => {
    expect(Object.keys(TOOL_MATRIX).sort()).toEqual(['claude-code', 'clavue', 'codex', 'grok'])
  })

  it('marks codex as the only tool with setup presets', () => {
    expect(getToolsWithCapability('setupPresets')).toEqual(['codex'])
  })

  it('marks grok as profile/status/model operator only until handlers exist', () => {
    const grok = getToolMatrix('grok')
    expect(grok.profileStorage).toBe('ccjk-profile')
    expect(grok.capabilities.fullInit).toBe(true)
    expect(grok.capabilities.configureModel).toBe(true)
    expect(grok.capabilities.cleanEnvironment).toBe(true)
    expect(grok.capabilities.configureApi).toBe(false)
    expect(grok.capabilities.configureMcp).toBe(false)
    expect(grok.capabilities.configureAiMemory).toBe(false)
    expect(grok.capabilities.updateWorkflow).toBe(false)
    expect(grok.operatorActions).toEqual([
      'save-ccjk-profile',
      'launch-with-profile',
      'configure-model',
      'clean-environment',
    ])
    expect(grok.skillsDirs.length).toBeGreaterThan(0)
  })

  it('claude-family shares settings-json mcp format', () => {
    expect(getToolMatrix('clavue').mcpFormat).toBe('settings-json')
    expect(getToolMatrix('claude-code').mcpFormat).toBe('settings-json')
    expect(getToolMatrix('codex').mcpFormat).toBe('config-toml')
  })

  it('doctor scope summary includes codex orphan check', () => {
    const summary = getDoctorScopeSummary().join('\n')
    expect(summary).toContain('Codex')
    expect(summary).toContain('mcp-orphan-toml')
  })
})
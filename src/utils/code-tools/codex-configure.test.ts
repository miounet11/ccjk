import { describe, expect, it } from 'vitest'

import { MCP_SERVICE_CONFIGS } from '../../config/mcp-services'
import { getRecommendedCodexMcpServiceIds, reconcileCodexMcpServices } from './codex-configure'

describe('getRecommendedCodexMcpServiceIds', () => {
  it('keeps the Codex MCP recommendation set aligned with the shared registry', () => {
    const availableIds = new Set(MCP_SERVICE_CONFIGS.map(service => service.id))
    const recommendedIds = getRecommendedCodexMcpServiceIds()

    expect(recommendedIds.length).toBeGreaterThan(0)
    expect(recommendedIds.every(id => availableIds.has(id))).toBe(true)
    expect(recommendedIds).toContain('context7')
    expect(recommendedIds).toContain('open-websearch')
    expect(recommendedIds).toContain('mcp-deepwiki')
  })
})

describe('reconcileCodexMcpServices', () => {
  it('replaces CCJK-managed services while preserving unknown custom entries', () => {
    const existingServices = [
      { id: 'context7', command: 'npx', args: ['old-context7'] },
      { id: 'serena', command: 'uvx', args: ['old-serena'] },
      { id: 'custom-local', command: 'node', args: ['custom.js'] },
    ]

    const selectedServices = [
      { id: 'context7', command: 'npx', args: ['new-context7'] },
      { id: 'open-websearch', command: 'npx', args: ['new-websearch'] },
    ]

    expect(reconcileCodexMcpServices(existingServices, selectedServices)).toEqual([
      { id: 'custom-local', command: 'node', args: ['custom.js'] },
      { id: 'context7', command: 'npx', args: ['new-context7'] },
      { id: 'open-websearch', command: 'npx', args: ['new-websearch'] },
    ])
  })

  it('allows clearing all CCJK-managed Codex MCP services', () => {
    const existingServices = [
      { id: 'context7', command: 'npx', args: ['old-context7'] },
      { id: 'open-websearch', command: 'npx', args: ['old-websearch'] },
      { id: 'custom-local', command: 'node', args: ['custom.js'] },
    ]

    expect(reconcileCodexMcpServices(existingServices, [])).toEqual([
      { id: 'custom-local', command: 'node', args: ['custom.js'] },
    ])
  })
})

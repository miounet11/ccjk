import { describe, expect, it } from 'vitest'
import { levelDefinitions } from './progressive/levels'
import { __testUtils, getVisibleItems } from './main-menu'
import { parseMenuInput, validateMenuInput } from './renderer/input'
import { filterSectionsByItemLimit, createAllSections } from './renderer/sections'
import { getToolModeMenuTitle, renderFooter, renderToolModeHero } from './renderer/layout'

describe('tool-aware menu visibility', () => {
  it('keeps Claude basic quick actions ordered for setup-first onboarding', () => {
    const itemIds = getVisibleItems('basic', 'claude-code').slice(0, 3).map(item => item.id)

    expect(itemIds).toEqual([
      'init',
      'diagnostics',
      'api-config',
    ])
  })

  it('keeps Claude basic menu items Claude-focused', () => {
    const itemIds = getVisibleItems('basic', 'claude-code').map(item => item.id)

    expect(itemIds).toContain('diagnostics')
    expect(itemIds).toContain('permission-config')
    expect(itemIds).toContain('doctor')
    expect(itemIds).toContain('mcp-config')
    expect(itemIds).toContain('model-config')
    expect(itemIds).not.toContain('notifications')
    expect(itemIds).not.toContain('workflow-import')
  })

  it('shows Clavue core setup actions in basic mode', () => {
    const itemIds = getVisibleItems('basic', 'clavue').map(item => item.id)

    expect(itemIds).toEqual([
      'init',
      'diagnostics',
      'api-config',
      'mcp-config',
      'model-config',
      'memory-config',
      'permission-config',
      'doctor',
    ])
    expect(itemIds).not.toContain('workflow-import')
    expect(itemIds).not.toContain('codex-switch-tool')
  })

  it('keeps one-click permissions visible after basic menu item capping', () => {
    const claudeSections = filterSectionsByItemLimit(createAllSections('basic', 'claude-code'), levelDefinitions.basic.maxItems)
    const clavueSections = filterSectionsByItemLimit(createAllSections('basic', 'clavue'), levelDefinitions.basic.maxItems)

    const claudeItemIds = claudeSections.flatMap(section => section.items.map(item => item.id))
    const clavueItemIds = clavueSections.flatMap(section => section.items.map(item => item.id))

    expect(claudeItemIds).toContain('permission-config')
    expect(clavueItemIds).toContain('permission-config')
  })

  it('shows a reduced Codex basic menu', () => {
    const itemIds = getVisibleItems('basic', 'codex').map(item => item.id)

    expect(itemIds).toEqual([
      'init',
      'api-config',
      'workflow-import',
      'codex-preset',
      'mcp-config',
      'model-config',
      'memory-config',
      'codex-switch-tool',
    ])
  })

  it('hides Claude-only advanced entries in Codex mode', () => {
    const itemIds = getVisibleItems('expert', 'codex').map(item => item.id)

    expect(itemIds).not.toContain('notifications')
    expect(itemIds).not.toContain('config-switch')
    expect(itemIds).not.toContain('quick-actions')
    expect(itemIds).not.toContain('marketplace')
    expect(itemIds).not.toContain('doctor')
  })

  it('keeps slash-command-driven extensions on Clavue but hides them on codex', () => {
    const clavueItemIds = getVisibleItems('intermediate', 'clavue').map(item => item.id)
    const codexItemIds = getVisibleItems('intermediate', 'codex').map(item => item.id)

    expect(clavueItemIds).toContain('quick-actions')
    expect(clavueItemIds).toContain('smart-guide')
    expect(clavueItemIds).toContain('workflows')
    expect(codexItemIds).not.toContain('quick-actions')
    expect(codexItemIds).not.toContain('smart-guide')
    expect(codexItemIds).not.toContain('workflows')
  })

  it('applies capability rules directly for statusline and cloud features', () => {
    expect(__testUtils.isItemSupportedByCapabilities({ id: 'cometix' } as any, 'clavue')).toBe(true)
    expect(__testUtils.isItemSupportedByCapabilities({ id: 'cometix' } as any, 'codex')).toBe(false)
    expect(__testUtils.isItemSupportedByCapabilities({ id: 'marketplace' } as any, 'clavue')).toBe(true)
    expect(__testUtils.isItemSupportedByCapabilities({ id: 'marketplace' } as any, 'codex')).toBe(false)
  })
})

describe('tool-aware global commands', () => {
  it('accepts Codex footer commands when explicitly enabled', () => {
    const items = getVisibleItems('basic', 'codex')

    expect(validateMenuInput(parseMenuInput('s'), items.length, items, ['0', 'q', 's', '+', '-'])).toBe(true)
    expect(validateMenuInput(parseMenuInput('+'), items.length, items, ['0', 'q', 's', '+', '-'])).toBe(true)
    expect(validateMenuInput(parseMenuInput('-'), items.length, items, ['0', 'q', 's', '+', '-'])).toBe(true)
    expect(validateMenuInput(parseMenuInput('m'), items.length, items, ['0', 'q', 's', '+', '-'])).not.toBe(true)
  })

  it('renders Codex footer commands without the Claude more action', () => {
    const footer = renderFooter({
      showMoreCommand: false,
      extraFooterCommands: [
        { key: 's', label: 'Switch Code Tool' },
        { key: '+', label: 'Check Updates' },
        { key: '-', label: 'Uninstall', variant: 'danger' },
      ],
    })

    expect(footer).toContain('Switch Code Tool')
    expect(footer).toContain('Check Updates')
    expect(footer).toContain('Uninstall')
    expect(footer).not.toContain('More')
  })

  it('renders distinct top hero content for Claude and Codex', () => {
    const claudeHero = renderToolModeHero('claude-code')
    const codexHero = renderToolModeHero('codex')

    expect(claudeHero).toContain('Claude Workspace')
    expect(claudeHero).toContain('~/.claude/settings.json')
    expect(codexHero).toContain('Codex Workspace')
    expect(codexHero).toContain('~/.codex/config.toml')
    expect(getToolModeMenuTitle('claude-code')).toBe('Claude Control Center')
    expect(getToolModeMenuTitle('codex')).toBe('Codex Control Center')
  })
})

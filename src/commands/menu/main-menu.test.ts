import { describe, expect, it } from 'vitest'
import { getVisibleItems } from './main-menu'
import { parseMenuInput, validateMenuInput } from './renderer/input'
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
    expect(itemIds).toContain('notifications')
    expect(itemIds).toContain('doctor')
    expect(itemIds).not.toContain('workflow-import')
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

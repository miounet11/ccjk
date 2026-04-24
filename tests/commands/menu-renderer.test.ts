import { describe, expect, it } from 'vitest'
import { renderToolModeHero } from '../../src/commands/menu/renderer/layout'

describe('menu renderer Clavue hero', () => {
  it('renders explicit Clavue runtime status details', () => {
    const output = renderToolModeHero('clavue', 76, {
      runtimeLabel: 'clavue',
      profileLabel: 'TTQQ (ttqq)',
      modeLabel: 'OpenAI-native',
      sourceLabel: 'Imported from ccjk · Reusable profile imported from the compatible ccjk configuration.',
      routeLabel: 'OpenAI-family route through a compatible gateway · https://router.example.com/v1',
      strategyLabel: 'Custom routing · Advanced custom routing. Validate carefully when mixing model families.',
      modelLabel: 'primary claude-sonnet-4-6 · haiku claude-haiku-4-5 · sonnet claude-sonnet-4-6 · opus claude-opus-4-6',
    })

    expect(output).toContain('Clavue Workspace')
    expect(output).toContain('Runtime')
    expect(output).toContain('clavue')
    expect(output).toContain('Profile')
    expect(output).toContain('TTQQ (ttqq)')
    expect(output).toContain('Mode')
    expect(output).toContain('OpenAI-native')
    expect(output).toContain('Source')
    expect(output).toContain('Imported from ccjk · Reusable profile imported from the compatible ccjk configuration.')
    expect(output).toContain('Route')
    expect(output).toContain('OpenAI-family route through a compatible gateway · https://router.example.com/v1')
    expect(output).toContain('Strategy')
    expect(output).toContain('Custom routing · Advanced custom routing. Validate carefully when mixing model families.')
    expect(output).toContain('Models')
    expect(output).toContain('primary claude-sonnet-4-6 · haiku claude-haiku-4-5 · sonnet claude-sonnet-4-6 · opus claude-opus-4-6')
  })
})

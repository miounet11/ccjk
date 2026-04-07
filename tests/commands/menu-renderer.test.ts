import { describe, expect, it } from 'vitest'
import { renderToolModeHero } from '../../src/commands/menu/renderer/layout'

describe('menu renderer myclaude hero', () => {
  it('renders explicit myclaude runtime status details', () => {
    const output = renderToolModeHero('myclaude', 76, {
      runtimeLabel: 'myclaude',
      profileLabel: 'TTQQ (ttqq)',
      routeLabel: 'OpenAI-compatible gateway · https://router.example.com/v1',
      modelLabel: 'primary claude-sonnet-4-6 · fast claude-haiku-4-5',
    })

    expect(output).toContain('myclaude Workspace')
    expect(output).toContain('Runtime')
    expect(output).toContain('myclaude')
    expect(output).toContain('Profile')
    expect(output).toContain('TTQQ (ttqq)')
    expect(output).toContain('Route')
    expect(output).toContain('OpenAI-compatible gateway · https://router.example.com/v1')
    expect(output).toContain('Models')
    expect(output).toContain('primary claude-sonnet-4-6 · fast claude-haiku-4-5')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { showImpactReminder } from '../../src/utils/impact-reminder'

describe('impact reminder', () => {
  it('prints a recommendation to run ccjk impact', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    showImpactReminder('publish')

    const output = logSpy.mock.calls.map(call => String(call[0])).join('\n')
    expect(output).toContain('ccjk impact')
    expect(output).toContain('Impact tip')

    logSpy.mockRestore()
  })
})

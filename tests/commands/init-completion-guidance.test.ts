import { beforeEach, describe, expect, it } from 'vitest'
import { initI18n } from '../../src/i18n'
import { getSetupCompletionGuidance } from '../../src/commands/init'

describe('init completion guidance', () => {
  beforeEach(async () => {
    await initI18n('en')
  })

  it('uses myclaude-specific completion guidance without fake /ccjk overview command', () => {
    const guidance = getSetupCompletionGuidance('myclaude')

    expect(guidance.step1).toContain('myclaude')
    expect(guidance.step1Detail).toContain('/ccjk:feat')
    expect(guidance.step1Detail2).toContain('/commit')
    expect(guidance.step1Detail2).toContain('/workflow')
    expect(guidance.step1Detail2).not.toContain('/ccjk - View All')
    expect(guidance.step3Command).toBe('/commands')
  })

  it('keeps claude-code completion guidance for installed workflow commands', () => {
    const guidance = getSetupCompletionGuidance('claude-code')

    expect(guidance.step1).toContain('Claude Code')
    expect(guidance.step1Detail).toContain('/ccjk:feat')
    expect(guidance.step1Detail2).toContain('/commands')
    expect(guidance.step3Command).toBe('npx ccjk features')
  })
})

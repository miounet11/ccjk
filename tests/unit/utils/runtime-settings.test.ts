import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVUE_SETTINGS_FILE, SETTINGS_FILE } from '../../../src/constants'

vi.mock('../../../src/utils/ccjk-config', () => ({
  readCcjkConfig: vi.fn(),
}))

describe('runtime-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes clavue to ~/.clavue/settings.json', async () => {
    const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
    const { activeSettingsFile, resolveClaudeFamilySettingsTarget } = await import('../../../src/utils/runtime-settings')

    vi.mocked(readCcjkConfig).mockReturnValue({ codeToolType: 'clavue' } as any)

    expect(activeSettingsFile()).toBe(CLAVUE_SETTINGS_FILE)
    expect(resolveClaudeFamilySettingsTarget().displayName).toBe('Clavue')
    expect(resolveClaudeFamilySettingsTarget().configDirDisplay).toBe('~/.clavue')
  })

  it('routes claude-code to ~/.claude/settings.json', async () => {
    const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
    const { activeSettingsFile, resolveClaudeFamilySettingsTarget } = await import('../../../src/utils/runtime-settings')

    vi.mocked(readCcjkConfig).mockReturnValue({ codeToolType: 'claude-code' } as any)

    expect(activeSettingsFile()).toBe(SETTINGS_FILE)
    expect(resolveClaudeFamilySettingsTarget().displayName).toBe('Claude Code')
  })
})
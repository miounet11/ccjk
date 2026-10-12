import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClaudeCodeConfigManager } from '../../../src/utils/claude-code-config-manager'
import { listCcjkProfileNames, readCcjkProfileByName } from '../../../src/utils/ccjk-profile-reader'

vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    getProfileByName: vi.fn(),
    getProfileById: vi.fn(),
    listProfiles: vi.fn(),
  },
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
}))

describe('ccjk-profile-reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should read profile from TOML by display name', () => {
    vi.mocked(ClaudeCodeConfigManager.getProfileByName).mockReturnValue({
      name: 'work',
      authType: 'api_key',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      primaryModel: 'claude-sonnet-4-5',
    })
    vi.mocked(ClaudeCodeConfigManager.getProfileById).mockReturnValue(null)

    const profile = readCcjkProfileByName('work')
    expect(profile).toEqual({
      name: 'work',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      model: 'claude-sonnet-4-5',
    })
  })

  it('should fall back to profile id lookup', () => {
    vi.mocked(ClaudeCodeConfigManager.getProfileByName).mockReturnValue(null)
    vi.mocked(ClaudeCodeConfigManager.getProfileById).mockReturnValue({
      name: 'GLM',
      authType: 'auth_token',
      apiKey: 'token-1',
      id: 'glm',
    })

    const profile = readCcjkProfileByName('glm')
    expect(profile?.name).toBe('GLM')
    expect(profile?.apiKey).toBe('token-1')
  })

  it('should list profile names from TOML storage', () => {
    vi.mocked(ClaudeCodeConfigManager.listProfiles).mockReturnValue([
      { name: 'work', authType: 'api_key' },
      { name: 'free', authType: 'api_key' },
    ])

    expect(listCcjkProfileNames()).toEqual(['work', 'free'])
  })
})
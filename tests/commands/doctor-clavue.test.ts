import { beforeEach, describe, expect, it, vi } from 'vitest'

const commandExists = vi.fn()
const existsSync = vi.fn()
const readFileSync = vi.fn()

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync,
    readFileSync,
    readdirSync: vi.fn(() => []),
  }
})

vi.mock('../../src/utils/platform', () => ({
  commandExists,
}))

vi.mock('../../src/utils/claude-family-core-features', () => ({
  inspectClaudeFamilyCoreFeatures: vi.fn(() => Promise.resolve({
    workflows: { installed: 1, expected: 3, missing: [] },
    mcp: { installed: ['context7'], expected: ['context7'], missing: [] },
    permissions: { allowCount: 8, missing: [] },
    outputStyles: { installed: 6, expected: 6, missing: [] },
    ccr: { installed: true, hasCorrectPackage: true },
  })),
}))

vi.mock('../../src/utils/ccr/installer', () => ({
  isCcrInstalled: vi.fn(() => Promise.resolve({ isInstalled: true, hasCorrectPackage: true })),
}))

vi.mock('../../src/utils/code-tools/codex', () => ({
  readCodexGoalsFeatureEnabled: vi.fn(() => true),
}))

vi.mock('../../src/permissions/permission-manager', () => ({
  getPermissionManager: vi.fn((_configPath?: string, settingsPath?: string) => ({
    settingsPath,
    getAllDiagnostics: vi.fn(() => []),
    getStats: vi.fn(() => ({ total: 0 })),
    getUnreachableRules: vi.fn(() => []),
  })),
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}))

describe('doctor Clavue routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    commandExists.mockResolvedValue(true)
    existsSync.mockReturnValue(true)
    readFileSync.mockReturnValue(JSON.stringify({
      env: {},
      permissions: { allow: ['Read(*)', 'mcp__context7__*'] },
      mcpServers: { context7: { command: 'npx' } },
    }))
  })

  it('checks Clavue command and Clavue settings path when codeType is clavue', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { doctor } = await import('../../src/commands/doctor')

    await doctor({ codeType: 'clavue', json: true })

    expect(commandExists).toHaveBeenCalledWith('clavue')
    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining('.clavue/settings.json'), 'utf-8')

    const output = JSON.parse(String(logSpy.mock.calls[0][0]))
    expect(output.checks.some((check: any) => check.name === 'Clavue')).toBe(true)
    expect(output.checks.find((check: any) => check.name === 'settings.json').status).toBe('ok')
    expect(output.checks.find((check: any) => check.name === 'Native Goals')).toMatchObject({
      status: 'ok',
      message: 'Clavue /goal available',
    })

    logSpy.mockRestore()
  })
})

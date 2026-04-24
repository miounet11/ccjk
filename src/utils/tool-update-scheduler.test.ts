import { beforeEach, describe, expect, it, vi } from 'vitest'

const ensureI18nInitialized = vi.fn()
const checkAndUpdateTools = vi.fn()
const checkAndUpdateMyclaudeTools = vi.fn()
const runCodexUpdate = vi.fn()

vi.mock('../i18n', () => ({
  ensureI18nInitialized,
}))

vi.mock('./auto-updater', () => ({
  checkAndUpdateTools,
  checkAndUpdateMyclaudeTools,
}))

vi.mock('./code-tools/codex', () => ({
  runCodexUpdate,
}))

describe('ToolUpdateScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureI18nInitialized.mockResolvedValue(undefined)
    checkAndUpdateTools.mockResolvedValue(undefined)
    checkAndUpdateMyclaudeTools.mockResolvedValue(undefined)
    runCodexUpdate.mockResolvedValue(true)
  })

  it('dispatches Claude Code updates to the shared updater', async () => {
    const { ToolUpdateScheduler } = await import('./tool-update-scheduler')

    await new ToolUpdateScheduler().updateByCodeType('claude-code', true)

    expect(ensureI18nInitialized).toHaveBeenCalledTimes(1)
    expect(checkAndUpdateTools).toHaveBeenCalledWith(true)
    expect(checkAndUpdateMyclaudeTools).not.toHaveBeenCalled()
    expect(runCodexUpdate).not.toHaveBeenCalled()
  })

  it('dispatches Clavue updates to the Clavue updater path', async () => {
    const { ToolUpdateScheduler } = await import('./tool-update-scheduler')

    await new ToolUpdateScheduler().updateByCodeType('clavue', false)

    expect(ensureI18nInitialized).toHaveBeenCalledTimes(1)
    expect(checkAndUpdateMyclaudeTools).toHaveBeenCalledWith(false)
    expect(checkAndUpdateTools).not.toHaveBeenCalled()
    expect(runCodexUpdate).not.toHaveBeenCalled()
  })

  it('dispatches codex updates to the codex updater', async () => {
    const { ToolUpdateScheduler } = await import('./tool-update-scheduler')

    await new ToolUpdateScheduler().updateByCodeType('codex', true)

    expect(ensureI18nInitialized).toHaveBeenCalledTimes(1)
    expect(runCodexUpdate).toHaveBeenCalledWith(false, true)
    expect(checkAndUpdateTools).not.toHaveBeenCalled()
    expect(checkAndUpdateMyclaudeTools).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunCodexFullInit = vi.fn()
const mockRunCodexUninstall = vi.fn()
const mockInit = vi.fn()
const mockConfigureCodexPresetFeature = vi.fn()
const mockConfigureMemoryFeature = vi.fn()
const mockConfigureMergedPermissionsFeature = vi.fn()
const mockNotificationCommand = vi.fn()

vi.mock('../../utils/code-tools/codex', () => ({
  runCodexFullInit: mockRunCodexFullInit,
  runCodexUninstall: mockRunCodexUninstall,
  runCodexUpdate: vi.fn(),
  runCodexWorkflowImportWithLanguageSelection: vi.fn(),
  configureCodexPresetFeature: mockConfigureCodexPresetFeature,
  configureCodexApi: vi.fn(),
  configureCodexMcp: vi.fn(),
  configureCodexDefaultModelFeature: vi.fn(),
  configureCodexAiMemoryFeature: vi.fn(),
}))

vi.mock('../init', () => ({
  init: mockInit,
}))

vi.mock('../../utils/features', async () => {
  const actual = await vi.importActual<typeof import('../../utils/features')>('../../utils/features')
  return {
    ...actual,
    configureMemoryFeature: mockConfigureMemoryFeature,
    configureMergedPermissionsFeature: mockConfigureMergedPermissionsFeature,
  }
})

vi.mock('../notification', () => ({
  notificationCommand: mockNotificationCommand,
}))

describe('progressive menu handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches Codex init through the Codex flow', async () => {
    const { __testUtils } = await import('./index')
    const [item] = __testUtils.attachHandlers([
      {
        id: 'init',
        label: 'menu:oneClick.setup',
        description: 'menu:oneClick.setupDesc',
        category: 'quick',
        level: 'basic',
        action: 'command',
      },
    ] as any, 'codex')

    await item.handler?.()

    expect(mockRunCodexFullInit).toHaveBeenCalledTimes(1)
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('dispatches Claude init through the shared init command', async () => {
    const { __testUtils } = await import('./index')
    const [item] = __testUtils.attachHandlers([
      {
        id: 'init',
        label: 'menu:oneClick.setup',
        description: 'menu:oneClick.setupDesc',
        category: 'quick',
        level: 'basic',
        action: 'command',
      },
    ] as any, 'claude-code')

    await item.handler?.()

    expect(mockInit).toHaveBeenCalledWith({ skipBanner: true, codeType: 'claude-code' })
    expect(mockRunCodexFullInit).not.toHaveBeenCalled()
  })

  it('dispatches Codex efficiency center through the Codex preset entry', async () => {
    const { __testUtils } = await import('./index')
    const [item] = __testUtils.attachHandlers([
      {
        id: 'codex-preset',
        label: 'menu:menuOptions.codexPreset',
        description: 'menu:menuDescriptions.codexPreset',
        category: 'quick',
        level: 'basic',
        action: 'command',
      },
    ] as any, 'codex')

    await item.handler?.()

    expect(mockConfigureCodexPresetFeature).toHaveBeenCalledTimes(1)
  })

  it('uses separate menu shells for Claude and Codex', async () => {
    const { __testUtils } = await import('./index')

    expect(__testUtils.getMenuShellConfig('claude-code')).toMatchObject({
      allowMore: true,
      footerCommands: [],
      showHero: false,
    })

    expect(__testUtils.getMenuShellConfig('codex')).toMatchObject({
      allowMore: true,
      showHero: true,
    })
    expect(__testUtils.getMenuShellConfig('codex').footerCommands.map(command => command.key)).toEqual(['s', '+', '-'])

    expect(__testUtils.getMenuShellConfig('clavue')).toMatchObject({
      allowMore: false,
      showHero: true,
    })
    expect(__testUtils.getMenuShellConfig('clavue').footerCommands.map(command => command.key)).toEqual(['s', '+'])
  })

  it('routes Clavue memory config to the shared memory feature', async () => {
    const { __testUtils } = await import('./index')
    const [item] = __testUtils.attachHandlers([
      {
        id: 'memory-config',
        label: 'menu:configCenter.memory',
        description: 'menu:configCenter.memoryDesc',
        category: 'config',
        level: 'basic',
        action: 'command',
      },
    ] as any, 'clavue')

    await item.handler?.()

    expect(mockConfigureMemoryFeature).toHaveBeenCalledTimes(1)
  })

  it('routes Clavue permission config to the one-click permission setup', async () => {
    const { __testUtils } = await import('./index')
    const [item] = __testUtils.attachHandlers([
      {
        id: 'permission-config',
        label: 'menu:configCenter.permission',
        description: 'menu:configCenter.permissionDesc',
        category: 'config',
        level: 'basic',
        action: 'command',
      },
    ] as any, 'clavue')

    await item.handler?.()

    expect(mockConfigureMergedPermissionsFeature).toHaveBeenCalledTimes(1)
  })

  it('routes notifications to the notification command in Clavue mode', async () => {
    const { __testUtils } = await import('./index')
    const [item] = __testUtils.attachHandlers([
      {
        id: 'notifications',
        label: 'menu:oneClick.notify',
        description: 'menu:oneClick.notifyDesc',
        category: 'quick',
        level: 'basic',
        action: 'command',
      },
    ] as any, 'clavue')

    await item.handler?.()

    expect(mockNotificationCommand).toHaveBeenCalledTimes(1)
  })

  it('still accepts Claude switch input when enabled as a global menu command', async () => {
    const { getVisibleItems } = await import('./main-menu')
    const { parseMenuInput, validateMenuInput } = await import('./renderer/input')
    const items = getVisibleItems('basic', 'claude-code')

    expect(validateMenuInput(parseMenuInput('s'), items.length, items, ['0', 'q', 'm', 's'])).toBe(true)
  })
})

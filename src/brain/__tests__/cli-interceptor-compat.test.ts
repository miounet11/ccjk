import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CliInterceptor } from '../router/cli-interceptor'

const {
  mockAutoExecutor,
  mockContextLoader,
  mockEmitCommandHookEvent,
  mockSkillRegistry,
} = vi.hoisted(() => ({
  mockAutoExecutor: {
    execute: vi.fn(),
    clearTelemetry: vi.fn(),
  },
  mockSkillRegistry: {
    clear: vi.fn(),
  },
  mockContextLoader: {
    clearCache: vi.fn(),
  },
  mockEmitCommandHookEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../router/auto-executor', () => ({
  getGlobalAutoExecutor: vi.fn(() => mockAutoExecutor),
}))

vi.mock('../skill-registry', () => ({
  getSkillRegistry: vi.fn(() => mockSkillRegistry),
}))

vi.mock('../context-loader', () => ({
  contextLoader: mockContextLoader,
}))

vi.mock('../hooks/command-hook-bridge', () => ({
  emitCommandHookEvent: mockEmitCommandHookEvent,
}))

function mockExecutionResult() {
  return {
    success: true,
    route: 'direct' as const,
    intent: {
      type: 'direct' as const,
      complexity: 'simple' as const,
      confidence: 0.9,
      reasoning: 'direct',
      suggestedRoute: 'direct' as const,
      keywords: [],
      requiresPlanning: false,
      requiresMultipleAgents: false,
      estimatedSteps: 1,
    },
    agentsCreated: [],
    skillsCreated: [],
    mcpToolsUsed: [],
    message: 'ok',
  }
}

describe('cliInterceptor compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAutoExecutor.execute.mockResolvedValue(mockExecutionResult())
    mockEmitCommandHookEvent.mockResolvedValue(undefined)
  })

  it('bypasses new native slash commands like /batch', async () => {
    const interceptor = new CliInterceptor({ showIntent: false })
    const result = await interceptor.intercept('/batch run tests')

    expect(result.bypassed).toBe(true)
    expect(result.bypassReason).toBe('Native slash command passthrough')
    expect(mockAutoExecutor.execute).not.toHaveBeenCalled()
  })

  it('bypasses new native slash commands like /simplify', async () => {
    const interceptor = new CliInterceptor({ showIntent: false })
    const result = await interceptor.intercept('/simplify this response')

    expect(result.bypassed).toBe(true)
    expect(result.bypassReason).toBe('Native slash command passthrough')
    expect(mockAutoExecutor.execute).not.toHaveBeenCalled()
  })

  it('keeps ccjk-owned slash commands for CCJK handling path', async () => {
    const interceptor = new CliInterceptor({ showIntent: false })
    const result = await interceptor.intercept('/ccjk:feat implement auth flow')

    expect(result.intercepted).toBe(true)
    expect(mockAutoExecutor.execute).toHaveBeenCalledOnce()
  })

  it('clears telemetry/context/skill caches on /clear', async () => {
    const interceptor = new CliInterceptor({ showIntent: false })
    const result = await interceptor.intercept('/clear')

    expect(result.bypassed).toBe(true)
    expect(mockAutoExecutor.clearTelemetry).toHaveBeenCalledOnce()
    expect(mockContextLoader.clearCache).toHaveBeenCalledOnce()
    expect(mockSkillRegistry.clear).toHaveBeenCalledOnce()

    expect(mockEmitCommandHookEvent).toHaveBeenCalledWith(
      'command-clear',
      expect.objectContaining({
        command: '/clear',
      }),
    )
    expect(mockEmitCommandHookEvent).toHaveBeenCalledWith(
      'command-bypass',
      expect.objectContaining({
        command: '/clear',
      }),
    )
  })
})

import { describe, expect, it, vi } from 'vitest'

const featureDelegates = vi.hoisted(() => ({
  configureCodexAiMemoryFeature: vi.fn(async () => {}),
  configureCodexDefaultModelFeature: vi.fn(async () => {}),
}))

vi.mock('../features', () => featureDelegates)

describe('codex feature delegation', () => {
  it('delegates Codex memory configuration to the richer shared feature flow', async () => {
    const { configureCodexAiMemoryFeature } = await import('./codex')

    await configureCodexAiMemoryFeature()

    expect(featureDelegates.configureCodexAiMemoryFeature).toHaveBeenCalledTimes(1)
  })

  it('delegates Codex model configuration to the richer shared feature flow', async () => {
    const { configureCodexDefaultModelFeature } = await import('./codex')

    await configureCodexDefaultModelFeature()

    expect(featureDelegates.configureCodexDefaultModelFeature).toHaveBeenCalledTimes(1)
  })
})

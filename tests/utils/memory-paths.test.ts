import { afterEach, describe, expect, it, vi } from 'vitest'

describe('memory-paths', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('uses configured memory directory overrides when no explicit path is provided', async () => {
    vi.doMock('../../src/config/unified/index.js', () => ({
      config: {
        ccjk: {
          read: () => ({
            storage: {
              memory: {
                claudeDir: '/tmp/custom-claude',
                ccjkDir: '/tmp/custom-ccjk',
              },
            },
          }),
        },
      },
    }))

    const memoryPaths = await import('../../src/utils/memory-paths.js')

    expect(memoryPaths.getClaudeMemoryPath('/tmp/demo-repo')).toBe(
      '/tmp/custom-claude/projects/-tmp-demo-repo/memory/MEMORY.md',
    )
    expect(memoryPaths.getCcjkMemoryPath('/tmp/demo-repo')).toBe(
      '/tmp/custom-ccjk/memory/projects/-tmp-demo-repo/MEMORY.md',
    )
    expect(memoryPaths.getConfiguredMemoryDirectories()).toEqual({
      claudeDir: '/tmp/custom-claude',
      ccjkDir: '/tmp/custom-ccjk',
    })
  })
})

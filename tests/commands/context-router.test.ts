import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  handleContextCommandMock,
} = vi.hoisted(() => ({
  handleContextCommandMock: vi.fn(),
}))

vi.mock('../../src/commands/context/index.js', () => ({
  handleContextCommand: handleContextCommandMock,
}))

describe('contextCommand routing', () => {
  beforeEach(() => {
    handleContextCommandMock.mockReset()
  })

  it('routes status to the operational context status handler', async () => {
    const { contextCommand } = await import('../../src/commands/context.js')

    await contextCommand({ action: 'status' })

    expect(handleContextCommandMock).toHaveBeenCalledWith(['status'])
  })

  it('routes analyze to the context analyzer handler', async () => {
    const { contextCommand } = await import('../../src/commands/context.js')

    await contextCommand({ action: 'analyze' })

    expect(handleContextCommandMock).toHaveBeenCalledWith(['analyze'])
  })
})

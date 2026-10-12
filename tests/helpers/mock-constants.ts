import { vi } from 'vitest'

type ConstantsModule = typeof import('../../src/constants')

/** Partial mock over src/constants — keeps new exports (CODE_TOOL_TYPES, etc.) intact. */
export async function mockConstantsPartial(
  overrides: Partial<ConstantsModule> = {},
): Promise<ConstantsModule> {
  const actual = await vi.importActual<ConstantsModule>('../../src/constants')
  return {
    ...actual,
    ...overrides,
  }
}
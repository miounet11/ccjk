import { beforeEach, describe, expect, it, vi } from 'vitest';

const exists = vi.fn();

vi.mock('../../src/utils/fs-operations', async () => {
  const actual = await vi.importActual<typeof import('../../src/utils/fs-operations')>('../../src/utils/fs-operations');
  return {
    ...actual,
    exists,
  };
});

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string) => key),
  },
}));

describe('mcp-installer Clavue detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects Clavue as the active MCP target when Clavue config exists', async () => {
    exists.mockImplementation((path: string) => path.includes('.clavue'));

    const { detectActiveTool } = await import('../../src/utils/mcp-installer');

    expect(detectActiveTool()).toBe('clavue');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest'

const prompt = vi.fn()
const inspectMemoryFiles = vi.fn()
const syncMemoryFiles = vi.fn()
const memoryCheck = { check: vi.fn() }
const configureOutputStyle = vi.fn()
const changeLanguage = vi.fn()
const updateZcfConfig = vi.fn()
const fsAccess = vi.fn()
const execSync = vi.fn()

vi.mock('inquirer', () => ({
  default: {
    prompt,
  },
}))

vi.mock('ansis', () => ({
  default: {
    cyan: Object.assign((value: string) => value, { bold: (value: string) => value }),
    bold: (value: string) => value,
    gray: (value: string) => value,
    yellow: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
  },
}))

vi.mock('node:fs/promises', () => ({
  access: fsAccess,
  readFile: vi.fn(),
}))

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    execSync,
  }
})

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  changeLanguage,
  i18n: {
    language: 'en',
    t: (key: string) => key,
  },
}))

vi.mock('../../src/utils/output-style', () => ({
  configureOutputStyle,
}))

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig: vi.fn(() => ({ preferredLang: 'en' })),
  updateZcfConfig,
}))

vi.mock('../../src/utils/memory-paths.js', () => ({
  getClaudeMemoryPath: vi.fn(() => '/tmp/claude-memory.md'),
  getCcjkMemoryPath: vi.fn(() => '/tmp/ccjk-memory.md'),
}))

vi.mock('../../src/utils/memory-sync.js', () => ({
  inspectMemoryFiles,
  syncMemoryFiles,
}))

vi.mock('../../src/health/checks/memory-check.js', () => ({
  memoryCheck,
}))

describe('configureMemoryFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fsAccess.mockResolvedValue(undefined)
    execSync.mockReturnValue(Buffer.from(''))
    inspectMemoryFiles.mockReturnValue({
      syncState: 'in-sync',
      source: 'claude',
      paths: { claude: '/tmp/claude-memory.md', ccjk: '/tmp/ccjk-memory.md' },
      entryCount: 3,
    })
    memoryCheck.check.mockResolvedValue({
      message: 'Memory system healthy',
      score: 90,
      details: [],
    })
  })

  it('dispatches language preference updates from the memory menu', async () => {
    const { configureMemoryFeature } = await import('../../src/utils/features')

    prompt
      .mockResolvedValueOnce({ action: 'language' })
      .mockResolvedValueOnce({ lang: 'zh-CN' })

    await configureMemoryFeature()

    expect(updateZcfConfig).toHaveBeenCalledWith({ preferredLang: 'zh-CN' })
    expect(changeLanguage).toHaveBeenCalledWith('zh-CN')
    expect(configureOutputStyle).not.toHaveBeenCalled()
  })

  it('dispatches output style configuration from the memory menu', async () => {
    const { configureMemoryFeature } = await import('../../src/utils/features')

    prompt.mockResolvedValueOnce({ action: 'outputStyle' })

    await configureMemoryFeature()

    expect(configureOutputStyle).toHaveBeenCalledTimes(1)
  })

  it('keeps sync behavior intact', async () => {
    const { configureMemoryFeature } = await import('../../src/utils/features')

    prompt.mockResolvedValueOnce({ action: 'sync' })

    await configureMemoryFeature()

    expect(syncMemoryFiles).toHaveBeenCalledWith({ projectPath: process.cwd() })
  })
})

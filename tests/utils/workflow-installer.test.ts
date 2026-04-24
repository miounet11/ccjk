import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os')
  return {
    ...actual,
    homedir: vi.fn(() => testHome),
  }
})

let testHome = ''

describe('workflow installer runtime targets', () => {
  beforeEach(async () => {
    testHome = mkdtempSync(join(tmpdir(), 'ccjk-workflows-'))
    vi.resetModules()
    const { initI18n } = await import('../../src/i18n')
    await initI18n('en')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(testHome, { recursive: true, force: true })
  })

  it('installs slash commands and agents into Clavue config root when Clavue is selected', async () => {
    const { selectAndInstallWorkflows } = await import('../../src/utils/workflow-installer')

    await selectAndInstallWorkflows('en', ['essentialTools', 'gitWorkflow'], {
      codeToolType: 'clavue',
    })

    expect(existsSync(join(testHome, '.clavue', 'commands', 'ccjk', 'feat.md'))).toBe(true)
    expect(existsSync(join(testHome, '.clavue', 'commands', 'ccjk', 'git-commit.md'))).toBe(true)
    expect(existsSync(join(testHome, '.clavue', 'agents', 'ccjk', 'essential', 'init-architect.md'))).toBe(true)
    expect(existsSync(join(testHome, '.claude', 'commands', 'ccjk', 'feat.md'))).toBe(false)
  })

  it('keeps Claude Code workflow install behavior for Claude Code runtime', async () => {
    const { selectAndInstallWorkflows } = await import('../../src/utils/workflow-installer')

    await selectAndInstallWorkflows('en', ['essentialTools'], {
      codeToolType: 'claude-code',
    })

    expect(existsSync(join(testHome, '.claude', 'commands', 'ccjk', 'feat.md'))).toBe(true)
    expect(existsSync(join(testHome, '.claude', 'agents', 'ccjk', 'essential', 'init-architect.md'))).toBe(true)
    expect(existsSync(join(testHome, '.clavue', 'commands', 'ccjk', 'feat.md'))).toBe(false)
  })
})

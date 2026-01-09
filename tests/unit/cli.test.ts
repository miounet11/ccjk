import { resolve } from 'pathe'
import { exec } from 'tinyexec'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('cLI', () => {
  const cliPath = resolve(__dirname, '../../bin/ccjk.mjs')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ccjk command', () => {
    it('should run without errors when showing help', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('CCJK - Claude Code Jailbreak Kit')
      expect(result.stdout).toContain('Commands')
    })

    it('should display version', async () => {
      const result = await exec(process.execPath, [cliPath, '--version'])

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe('command structure', () => {
    it('should have init command alias', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.stdout).toContain('ccjk init')
      expect(result.stdout).toContain('ccjk i')
    })

    it('should have update command alias', async () => {
      const result = await exec(process.execPath, [cliPath, '--help'])

      expect(result.stdout).toContain('ccjk update')
      expect(result.stdout).toContain('ccjk u')
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectPackageManager,
  detectPackageManagerFromEnv,
  getPackageManagerCommands,
  getLockFileName,
  isPackageManagerAvailable,
  detectPackageManagerWithFallback,
} from '../src/utils/package-manager-detector'

describe('Package Manager Detector', () => {
  describe('detectPackageManager', () => {
    it('should detect pnpm from pnpm-lock.yaml', () => {
      const existsSyncMock = vi.fn((path: string) => {
        return path.includes('pnpm-lock.yaml')
      })
      vi.stubGlobal('existsSync', existsSyncMock)

      const pm = detectPackageManager('/fake/path')
      expect(pm).toBe('pnpm')
    })

    it('should detect yarn from yarn.lock', () => {
      const existsSyncMock = vi.fn((path: string) => {
        return path.includes('yarn.lock')
      })
      vi.stubGlobal('existsSync', existsSyncMock)

      const pm = detectPackageManager('/fake/path')
      expect(pm).toBe('yarn')
    })

    it('should detect bun from bun.lockb', () => {
      const existsSyncMock = vi.fn((path: string) => {
        return path.includes('bun.lockb')
      })
      vi.stubGlobal('existsSync', existsSyncMock)

      const pm = detectPackageManager('/fake/path')
      expect(pm).toBe('bun')
    })

    it('should detect npm from package-lock.json', () => {
      const existsSyncMock = vi.fn((path: string) => {
        return path.includes('package-lock.json')
      })
      vi.stubGlobal('existsSync', existsSyncMock)

      const pm = detectPackageManager('/fake/path')
      expect(pm).toBe('npm')
    })

    it('should default to npm when no lock file found', () => {
      const existsSyncMock = vi.fn(() => false)
      vi.stubGlobal('existsSync', existsSyncMock)

      const pm = detectPackageManager('/fake/path')
      expect(pm).toBe('npm')
    })
  })

  describe('detectPackageManagerFromEnv', () => {
    const originalEnv = process.env

    afterEach(() => {
      process.env = originalEnv
    })

    it('should detect pnpm from PACKAGE_MANAGER env', () => {
      process.env.PACKAGE_MANAGER = 'pnpm@9.0.0'
      const pm = detectPackageManagerFromEnv()
      expect(pm).toBe('pnpm')
    })

    it('should detect yarn from npm_config_user_agent', () => {
      process.env.npm_config_user_agent = 'yarn/1.22.0 npm/? node/v18.0.0'
      const pm = detectPackageManagerFromEnv()
      expect(pm).toBe('yarn')
    })

    it('should detect bun from PACKAGE_MANAGER', () => {
      process.env.PACKAGE_MANAGER = 'bun@1.0.0'
      const pm = detectPackageManagerFromEnv()
      expect(pm).toBe('bun')
    })

    it('should return null when no env var set', () => {
      delete process.env.PACKAGE_MANAGER
      delete process.env.npm_config_user_agent
      const pm = detectPackageManagerFromEnv()
      expect(pm).toBeNull()
    })
  })

  describe('getPackageManagerCommands', () => {
    it('should return npm commands', () => {
      const commands = getPackageManagerCommands('npm')
      expect(commands.install).toBe('npm install')
      expect(commands.installDev).toBe('npm install -D')
      expect(commands.installGlobal).toBe('npm install -g')
      expect(commands.run).toBe('npm run')
      expect(commands.exec).toBe('npx')
      expect(commands.update).toBe('npm update')
      expect(commands.remove).toBe('npm uninstall')
    })

    it('should return pnpm commands', () => {
      const commands = getPackageManagerCommands('pnpm')
      expect(commands.install).toBe('pnpm install')
      expect(commands.installDev).toBe('pnpm add -D')
      expect(commands.installGlobal).toBe('pnpm add -g')
      expect(commands.run).toBe('pnpm')
      expect(commands.exec).toBe('pnpm dlx')
      expect(commands.update).toBe('pnpm update')
      expect(commands.remove).toBe('pnpm remove')
    })

    it('should return yarn commands', () => {
      const commands = getPackageManagerCommands('yarn')
      expect(commands.install).toBe('yarn install')
      expect(commands.installDev).toBe('yarn add -D')
      expect(commands.installGlobal).toBe('yarn global add')
      expect(commands.run).toBe('yarn')
      expect(commands.exec).toBe('yarn dlx')
      expect(commands.update).toBe('yarn upgrade')
      expect(commands.remove).toBe('yarn remove')
    })

    it('should return bun commands', () => {
      const commands = getPackageManagerCommands('bun')
      expect(commands.install).toBe('bun install')
      expect(commands.installDev).toBe('bun add -d')
      expect(commands.installGlobal).toBe('bun add -g')
      expect(commands.run).toBe('bun run')
      expect(commands.exec).toBe('bunx')
      expect(commands.update).toBe('bun update')
      expect(commands.remove).toBe('bun remove')
    })
  })

  describe('getLockFileName', () => {
    it('should return correct lock file names', () => {
      expect(getLockFileName('npm')).toBe('package-lock.json')
      expect(getLockFileName('pnpm')).toBe('pnpm-lock.yaml')
      expect(getLockFileName('yarn')).toBe('yarn.lock')
      expect(getLockFileName('bun')).toBe('bun.lockb')
    })
  })

  describe('isPackageManagerAvailable', () => {
    it('should return true when package manager is available', async () => {
      // Mock successful command execution
      const { execSync } = await import('tinyexec')
      vi.spyOn(execSync, 'execSync').mockResolvedValue({
        stdout: Buffer.from('9.0.0'),
        stderr: Buffer.from(''),
      } as any)

      const available = await isPackageManagerAvailable('pnpm')
      expect(available).toBe(true)
    })

    it('should return false when package manager is not available', async () => {
      // Mock failed command execution
      const { execSync } = await import('tinyexec')
      vi.spyOn(execSync, 'execSync').mockRejectedValue(new Error('Command not found'))

      const available = await isPackageManagerAvailable('pnpm')
      expect(available).toBe(false)
    })
  })

  describe('detectPackageManagerWithFallback', () => {
    const originalEnv = process.env

    afterEach(() => {
      process.env = originalEnv
    })

    it('should prioritize environment variable', async () => {
      process.env.PACKAGE_MANAGER = 'pnpm@9.0.0'

      const result = await detectPackageManagerWithFallback('/fake/path')
      expect(result.packageManager).toBe('pnpm')
      expect(result.detectedFrom).toBe('env')
      expect(result.confidence).toBe('high')
    })

    it('should fallback to lock file detection', async () => {
      delete process.env.PACKAGE_MANAGER
      delete process.env.npm_config_user_agent

      const existsSyncMock = vi.fn((path: string) => {
        return path.includes('yarn.lock')
      })
      vi.stubGlobal('existsSync', existsSyncMock)

      const result = await detectPackageManagerWithFallback('/fake/path')
      expect(result.packageManager).toBe('yarn')
      expect(result.detectedFrom).toBe('lock-file')
      expect(result.confidence).toBe('high')
    })

    it('should default to npm when no detection method works', async () => {
      delete process.env.PACKAGE_MANAGER
      delete process.env.npm_config_user_agent

      const existsSyncMock = vi.fn(() => false)
      vi.stubGlobal('existsSync', existsSyncMock)

      const result = await detectPackageManagerWithFallback()
      expect(result.packageManager).toBe('npm')
      expect(result.detectedFrom).toBe('default')
      expect(result.confidence).toBe('low')
    })
  })
})

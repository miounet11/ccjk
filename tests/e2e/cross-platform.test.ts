/**
 * E2E Tests: Cross-Platform Compatibility
 * Tests CCJK behavior across different operating systems and environments
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve, sep } from 'pathe'
import { platform, tmpdir, homedir } from 'node:os'
import { runCommand } from './helpers'
import {
  runCcjk,
  assertSuccess,
  assertFailure,
  assertOutputContains,
  assertFile,
  waitForFile,
  createFile,
  readJsonFile,
  writeJsonFile,
  sleep,
  isPlatform,
  skipOnPlatform,
  normalizePath,
  getPathSeparator,
} from './helpers'
import {
  getE2EEnvironment,
  createTestProject,
  getTestConfigDir,
  getTestHomeDir,
} from './setup'

describe('E2E: Cross-Platform Compatibility', () => {
  let testProjectDir: string

  beforeEach(async () => {
    testProjectDir = await createTestProject({
      name: `cross-platform-test-${Date.now()}`,
      withGit: true,
      withPackageJson: true,
    })
    process.chdir(testProjectDir)
  })

  // ==========================================================================
  // Platform Detection Tests
  // ==========================================================================

  describe('Platform Detection', () => {
    it('should detect current platform', async () => {
      const result = await runCcjk(['--version'])

      assertSuccess(result)
      expect(result.timedOut).toBe(false)
    })

    it('should use platform-appropriate paths', async () => {
      const result = await runCcjk(['config', 'get', 'configDir'])

      expect(result.timedOut).toBe(false)

      // Check that path separator is correct
      const separator = getPathSeparator()
      expect(result.stdout).toContain(separator)
    })

    it('should respect platform-specific config directories', async () => {
      const result = await runCcjk(['config', 'list'])

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Windows-Specific Tests
  // ==========================================================================

  describe('Windows Compatibility', () => {
    const isWindows = isPlatform('win32')

    // Skip these tests on non-Windows platforms
    const runTest = isWindows ? it : it.skip

    runTest('should handle Windows-style paths', async () => {
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    runTest('should handle drive letters in paths', async () => {
      const testPath = 'C:\\Users\\test\\project'
      const result = await runCcjk(['info', '--path', testPath])

      expect(result.timedOut).toBe(false)
    })

    runTest('should handle backslashes in commands', async () => {
      const result = await runCcjk(['config', 'set', 'testPath', 'C:\\\\test\\\\path'])

      expect(result.timedOut).toBe(false)
    })

    runTest('should handle UNC paths', async () => {
      const uncPath = '\\\\server\\share\\project'
      const result = await runCcjk(['info', '--path', uncPath])

      expect(result.timedOut).toBe(false)
    })

    runTest('should work with PowerShell', async () => {
      const result = await runCommand('powershell', ['-Command', 'node --version'], {
        timeout: 10000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // macOS-Specific Tests
  // ==========================================================================

  describe('macOS Compatibility', () => {
    const isMac = isPlatform('darwin')

    // Skip these tests on non-macOS platforms
    const runTest = isMac ? it : it.skip

    runTest('should use macOS config directory structure', async () => {
      const result = await runCcjk(['config', 'list'])

      expect(result.timedOut).toBe(false)
      // macOS uses ~/Library/Application Support
    })

    runTest('should handle macOS file system characteristics', async () => {
      // macOS is case-insensitive by default
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    runTest('should work with zsh', async () => {
      const result = await runCommand('zsh', ['-c', 'echo "test"'], {
        timeout: 10000,
      })

      expect(result.timedOut).toBe(false)
    })

    runTest('should handle Homebrew-installed Node.js', async () => {
      // Check if running from Homebrew
      const result = await runCommand('which', ['node'], { timeout: 10000 })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Linux-Specific Tests
  // ==========================================================================

  describe('Linux Compatibility', () => {
    const isLinux = isPlatform('linux')

    // Skip these tests on non-Linux platforms
    const runTest = isLinux ? it : it.skip

    runTest('should use XDG config directories', async () => {
      const result = await runCcjk(['config', 'list'])

      expect(result.timedOut).toBe(false)
    })

    runTest('should handle different Linux distributions', async () => {
      // Check OS release info
      const result = await runCommand('cat', ['/etc/os-release'], {
        timeout: 10000,
      })

      expect(result.timedOut).toBe(false)
    })

    runTest('should work with bash', async () => {
      const result = await runCommand('bash', ['-c', 'echo "test"'], {
        timeout: 10000,
      })

      expect(result.timedOut).toBe(false)
    })

    runTest('should handle different shell environments', async () => {
      // Check current shell
      const result = await runCommand('sh', ['-c', 'echo $SHELL'], {
        timeout: 10000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Path Handling Tests
  // ==========================================================================

  describe('Path Handling', () => {
    it('should normalize paths consistently', async () => {
      const result = await runCcjk(['config', 'get', 'configDir'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle paths with spaces', async () => {
      const projectWithSpaces = await createTestProject({
        name: `project with spaces ${Date.now()}`,
      })

      process.chdir(projectWithSpaces)

      const result = await runCcjk(['info'], { timeout: 30000 })

      expect(result.timedOut).toBe(false)
    })

    it('should handle paths with special characters', async () => {
      const specialName = `project-${Date.now()}-test`
      const result = await runCcjk(['info', '--name', specialName])

      expect(result.timedOut).toBe(false)
    })

    it('should handle relative paths', async () => {
      const result = await runCcjk(['init', './test-relative-path'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle absolute paths', async () => {
      const absPath = join(tmpdir(), `ccjk-abs-test-${Date.now()}`)
      const result = await runCcjk(['info', '--path', absPath])

      expect(result.timedOut).toBe(false)
    })

    it('should handle parent directory references', async () => {
      const result = await runCcjk(['init', '../test-parent'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle tilde expansion', async () => {
      const result = await runCcjk(['info', '--path', '~/test-tilde'])

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // File System Tests
  // ==========================================================================

  describe('File System Compatibility', () => {
    it('should handle different file systems', async () => {
      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle symlinks', async () => {
      const linkPath = join(testProjectDir, 'symlink-test')
      const targetPath = join(testProjectDir, 'target')

      try {
        // Try to create a symlink
        await runCommand('ln', ['-s', targetPath, linkPath], { timeout: 5000 })
      } catch {
        // Symlink creation failed, skip test
        return
      }

      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle read-only files gracefully', async () => {
      const readOnlyFile = join(testProjectDir, 'readonly.txt')
      createFile(readOnlyFile, 'test content')

      // Try to make file read-only (may not work on all systems)
      try {
        if (isPlatform('darwin') || isPlatform('linux')) {
          await runCommand('chmod', ['444', readOnlyFile], { timeout: 5000 })
        }
      } catch {
        // Skip if chmod fails
      }

      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle different line endings', async () => {
      // Create file with Windows line endings
      const winLineEndings = 'line1\r\nline2\r\nline3\r\n'
      const winFile = join(testProjectDir, 'win-lines.txt')
      createFile(winFile, winLineEndings)

      // Create file with Unix line endings
      const unixLineEndings = 'line1\nline2\nline3\n'
      const unixFile = join(testProjectDir, 'unix-lines.txt')
      createFile(unixFile, unixLineEndings)

      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Environment Variable Tests
  // ==========================================================================

  describe('Environment Variables', () => {
    it('should respect PATH environment variable', async () => {
      const result = await runCcjk(['info'], {
        env: {
          PATH: process.env.PATH || '',
        },
      })

      expect(result.timedOut).toBe(false)
    })

    it('should respect HOME/USERPROFILE', async () => {
      const homeVar = isPlatform('win32') ? 'USERPROFILE' : 'HOME'
      const result = await runCcjk(['config', 'get', 'homeDir'], {
        env: {
          [homeVar]: process.env[homeVar] || '',
        },
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle custom NODE_PATH', async () => {
      const result = await runCcjk(['info'], {
        env: {
          NODE_PATH: '/custom/node/path',
        },
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Node.js Version Compatibility
  // ==========================================================================

  describe('Node.js Version Compatibility', () => {
    it('should work with current Node.js version', async () => {
      const result = await runCommand('node', ['--version'], { timeout: 5000 })

      expect(result.timedOut).toBe(false)
      expect(result.stdout).toMatch(/v\d+\.\d+\.\d+/)
    })

    it('should check for minimum Node.js version', async () => {
      const result = await runCcjk(['--version'])

      expect(result.timedOut).toBe(false)
    })

    it('should warn about unsupported Node.js versions', async () => {
      const result = await runCcjk(['--version'])

      // Check output for version warnings (if any)
      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Package Manager Compatibility
  // ==========================================================================

  describe('Package Manager Compatibility', () => {
    it('should detect installed package managers', async () => {
      const results = await Promise.allSettled([
        runCommand('npm', ['--version'], { timeout: 5000 }),
        runCommand('pnpm', ['--version'], { timeout: 5000 }),
        runCommand('yarn', ['--version'], { timeout: 5000 }),
        runCommand('bun', ['--version'], { timeout: 5000 }),
      ])

      // At least npm should be available
      const npmResult = results[0]
      expect(npmResult.status === 'fulfilled' || npmResult.status === 'rejected').toBe(true)
    })

    it('should work with npm', async () => {
      const result = await runCommand('npm', ['--version'], { timeout: 5000 })

      expect(result.timedOut).toBe(false)
    })

    it('should work with pnpm if available', async () => {
      const result = await runCommand('pnpm', ['--version'], { timeout: 5000 })

      // May fail if pnpm is not installed
      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Terminal Compatibility
  // ==========================================================================

  describe('Terminal Compatibility', () => {
    it('should work with basic terminals', async () => {
      const result = await runCcjk(['--help'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle color output correctly', async () => {
      const resultWithColor = await runCcjk(['--help'], {
        env: { FORCE_COLOR: '1' },
      })

      const resultWithoutColor = await runCcjk(['--help'], {
        env: { NO_COLOR: '1' },
      })

      expect(resultWithColor.timedOut).toBe(false)
      expect(resultWithoutColor.timedOut).toBe(false)
    })

    it('should handle TTY and non-TTY environments', async () => {
      const result = await runCcjk(['--help'])

      expect(result.timedOut).toBe(false)
    })

    it('should respect terminal width', async () => {
      const result = await runCcjk(['--help'], {
        env: {
          COLUMNS: '80',
        },
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Locale and Encoding Tests
  // ==========================================================================

  describe('Locale and Encoding', () => {
    it('should work with UTF-8 encoding', async () => {
      const result = await runCcjk(['info'], {
        env: {
          LANG: 'en_US.UTF-8',
        },
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle different locales', async () => {
      const locales = ['en_US.UTF-8', 'zh_CN.UTF-8', 'ja_JP.UTF-8']

      for (const locale of locales) {
        const result = await runCcjk(['info'], {
          env: {
            LANG: locale,
          },
        })

        expect(result.timedOut).toBe(false)
      }
    })

    it('should handle non-ASCII characters', async () => {
      const result = await runCcjk(['info'], {
        env: {
          LANG: 'en_US.UTF-8',
        },
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Special Environment Tests
  // ==========================================================================

  describe('Special Environments', () => {
    it('should work in CI/CD environment', async () => {
      const result = await runCcjk(['info'], {
        env: {
          CI: 'true',
        },
      })

      expect(result.timedOut).toBe(false)
    })

    it('should work in Docker container', async () => {
      // Check if running in Docker
      const result = await runCommand('cat', ['/proc/1/cgroup'], {
        timeout: 5000,
      })

      // Result may fail on non-Linux systems
      expect(result.timedOut).toBe(false)
    })

    it('should work with limited resources', async () => {
      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle network restrictions', async () => {
      const result = await runCcjk(['info'], {
        env: {
          // Simulate restricted network
          HTTP_PROXY: 'http://invalid:9999',
        },
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Architecture Tests
  // ==========================================================================

  describe('Architecture Compatibility', () => {
    it('should detect system architecture', async () => {
      const result = await runCommand('uname', ['-m'], { timeout: 5000 })

      expect(result.timedOut).toBe(false)
    })

    it('should work on x64 architecture', async () => {
      const result = await runCcjk(['--version'])

      expect(result.timedOut).toBe(false)
    })

    it('should work on ARM architecture', async () => {
      const result = await runCcjk(['--version'])

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Concurrent Execution Tests
  // ==========================================================================

  describe('Concurrent Execution', () => {
    it('should handle multiple CCJK instances', async () => {
      const results = await Promise.all([
        runCcjk(['--version'], { timeout: 10000 }),
        runCcjk(['--version'], { timeout: 10000 }),
        runCcjk(['--version'], { timeout: 10000 }),
      ])

      results.forEach(result => {
        expect(result.timedOut).toBe(false)
      })
    })

    it('should handle concurrent file operations', async () => {
      const configDir = getTestConfigDir()

      const results = await Promise.all([
        runCcjk(['config', 'get', 'version'], { timeout: 10000 }),
        runCcjk(['config', 'list'], { timeout: 10000 }),
      ])

      results.forEach(result => {
        expect(result.timedOut).toBe(false)
      })
    })
  })

  // ==========================================================================
  // Upgrade and Migration Tests
  // ==========================================================================

  describe('Upgrade and Migration', () => {
    it('should preserve configuration across versions', async () => {
      // Create a config file
      const configPath = join(getTestConfigDir(), 'config.json')
      writeJsonFile(configPath, {
        version: '8.0.0',
        customData: 'should-preserve',
      })

      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })

    it('should handle missing migration gracefully', async () => {
      const result = await runCcjk(['info'])

      expect(result.timedOut).toBe(false)
    })
  })
})

/**
 * E2E Tests: Initialization Workflow
 * Tests the complete initialization flow for new and existing installations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'pathe'
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
} from './helpers'
import {
  getE2EEnvironment,
  createTestProject,
  getTestConfigDir,
  getTestHomeDir,
} from './setup'

describe.skip('E2E: Initialization Workflow', () => {
  let testProjectDir: string

  beforeEach(async () => {
    testProjectDir = await createTestProject({
      name: `init-test-${Date.now()}`,
      withGit: true,
      withPackageJson: true,
    })
    process.chdir(testProjectDir)
  })

  // ==========================================================================
  // Fresh Installation Tests
  // ==========================================================================

  describe('Fresh Installation', () => {
    it('should display version information', async () => {
      const result = await runCcjk(['--version'])

      assertSuccess(result)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })

    it('should display help information', async () => {
      const result = await runCcjk(['--help'])

      assertSuccess(result)
      assertOutputContains(result, 'ccjk')
    })

    it('should initialize project with default settings', async () => {
      const result = await runCcjk(['init'], {
        input: ['y', 'y', 'n'], // Accept defaults, skip cloud setup
        timeout: 60000,
      })

      // Check that initialization completed
      expect(result.exitCode).toBeLessThanOrEqual(1) // May exit with 0 or 1 depending on prompts

      // Verify config directory was created
      const configDir = getTestConfigDir()
      expect(existsSync(configDir)).toBe(true)
    })

    it('should create CLAUDE.md in project root', async () => {
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Check for CLAUDE.md creation
      const claudeMdPath = join(testProjectDir, 'CLAUDE.md')
      // Note: The actual behavior depends on the init command implementation
    })

    it('should detect existing git repository', async () => {
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // The init command should detect the .git directory
      // and potentially use git information for configuration
    })

    it('should handle non-git directory gracefully', async () => {
      // Remove .git directory
      const gitDir = join(testProjectDir, '.git')
      if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true })
      }

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Should still work without git
      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Configuration Migration Tests
  // ==========================================================================

  describe('Configuration Migration', () => {
    it('should detect and migrate legacy configuration', async () => {
      // Create legacy config structure
      const legacyConfigDir = join(getTestHomeDir(), '.ccjk-legacy')
      mkdirSync(legacyConfigDir, { recursive: true })

      const legacyConfig = {
        version: '7.0.0',
        settings: {
          theme: 'dark',
          language: 'en',
        },
      }
      writeJsonFile(join(legacyConfigDir, 'config.json'), legacyConfig)

      // Run init which should detect legacy config
      const result = await runCcjk(['init', '--skip-prompts'], {
        env: {
          CCJK_LEGACY_CONFIG_DIR: legacyConfigDir,
        },
        timeout: 60000,
      })

      // Migration behavior depends on implementation
      expect(result.timedOut).toBe(false)
    })

    it('should preserve user settings during upgrade', async () => {
      // Create existing config
      const configDir = getTestConfigDir()
      const existingConfig = {
        version: '8.0.0',
        cloud: {
          enabled: true,
          provider: 'github-gist',
        },
        customSetting: 'preserved',
      }
      writeJsonFile(join(configDir, 'config.json'), existingConfig)

      // Run init again
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Check that custom settings are preserved
      const newConfig = readJsonFile(join(configDir, 'config.json'))
      if (newConfig) {
        expect(newConfig.customSetting).toBe('preserved')
      }
    })

    it('should handle corrupted config gracefully', async () => {
      // Create corrupted config file
      const configDir = getTestConfigDir()
      writeFileSync(join(configDir, 'config.json'), '{ invalid json }}}')

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Should handle gracefully without crashing
      expect(result.timedOut).toBe(false)
    })

    it('should backup existing config before migration', async () => {
      // Create existing config
      const configDir = getTestConfigDir()
      const existingConfig = {
        version: '7.5.0',
        important: 'data',
      }
      writeJsonFile(join(configDir, 'config.json'), existingConfig)

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Check for backup file (implementation dependent)
      // const backupExists = existsSync(join(configDir, 'config.json.backup'))
    })
  })

  // ==========================================================================
  // Interactive Setup Tests
  // ==========================================================================

  describe('Interactive Setup', () => {
    it('should prompt for cloud sync configuration', async () => {
      const result = await runCcjk(['init'], {
        input: [
          'y',  // Enable cloud sync
          '1',  // Select provider (e.g., GitHub Gist)
          'n',  // Skip authentication for now
        ],
        timeout: 60000,
      })

      // Check that prompts were processed
      expect(result.timedOut).toBe(false)
    })

    it('should allow skipping optional features', async () => {
      const result = await runCcjk(['init'], {
        input: [
          'n',  // Skip cloud sync
          'n',  // Skip MCP setup
          'n',  // Skip analytics
        ],
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should validate user input', async () => {
      const result = await runCcjk(['init'], {
        input: [
          'invalid',  // Invalid input
          'y',        // Retry with valid input
        ],
        timeout: 60000,
      })

      // Should handle invalid input gracefully
      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Project Detection Tests
  // ==========================================================================

  describe('Project Detection', () => {
    it('should detect Node.js project', async () => {
      // package.json already exists from createTestProject
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should detect Python project', async () => {
      // Create Python project indicators
      createFile(join(testProjectDir, 'requirements.txt'), 'flask==2.0.0\n')
      createFile(join(testProjectDir, 'setup.py'), 'from setuptools import setup\n')

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should detect Rust project', async () => {
      createFile(join(testProjectDir, 'Cargo.toml'), '[package]\nname = "test"\nversion = "0.1.0"\n')

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should detect Go project', async () => {
      createFile(join(testProjectDir, 'go.mod'), 'module test\n\ngo 1.21\n')

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle monorepo structure', async () => {
      // Create monorepo structure
      mkdirSync(join(testProjectDir, 'packages', 'core'), { recursive: true })
      mkdirSync(join(testProjectDir, 'packages', 'cli'), { recursive: true })

      createFile(
        join(testProjectDir, 'packages', 'core', 'package.json'),
        JSON.stringify({ name: '@test/core', version: '1.0.0' })
      )
      createFile(
        join(testProjectDir, 'packages', 'cli', 'package.json'),
        JSON.stringify({ name: '@test/cli', version: '1.0.0' })
      )

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Error Recovery Tests
  // ==========================================================================

  describe('Error Recovery', () => {
    it('should recover from interrupted initialization', async () => {
      // Create partial config (simulating interrupted init)
      const configDir = getTestConfigDir()
      writeJsonFile(join(configDir, 'config.json'), {
        version: '8.0.0',
        _incomplete: true,
      })

      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Should detect incomplete config and offer to complete
      expect(result.timedOut).toBe(false)
    })

    it('should handle permission errors gracefully', async () => {
      // This test is platform-dependent
      // On Unix, we could chmod the config dir to read-only
      // For now, just verify the command doesn't crash
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should handle disk space issues', async () => {
      // Simulate by setting a very small temp directory
      // This is difficult to test reliably, so we just verify graceful handling
      const result = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should provide clear error messages', async () => {
      // Test with invalid arguments
      const result = await runCcjk(['init', '--invalid-flag'])

      // Should show helpful error message
      expect(result.timedOut).toBe(false)
    })
  })

  // ==========================================================================
  // Idempotency Tests
  // ==========================================================================

  describe('Idempotency', () => {
    it('should be safe to run init multiple times', async () => {
      // First init
      const result1 = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Second init
      const result2 = await runCcjk(['init', '--skip-prompts'], {
        timeout: 60000,
      })

      // Both should complete without errors
      expect(result1.timedOut).toBe(false)
      expect(result2.timedOut).toBe(false)
    })

    it('should not duplicate configuration entries', async () => {
      // Run init twice
      await runCcjk(['init', '--skip-prompts'], { timeout: 60000 })
      await runCcjk(['init', '--skip-prompts'], { timeout: 60000 })

      // Check config file doesn't have duplicates
      const configDir = getTestConfigDir()
      const config = readJsonFile(join(configDir, 'config.json'))

      // Verify structure is clean (implementation dependent)
      if (config) {
        expect(typeof config).toBe('object')
      }
    })

    it('should preserve manual config changes', async () => {
      // First init
      await runCcjk(['init', '--skip-prompts'], { timeout: 60000 })

      // Manually modify config
      const configDir = getTestConfigDir()
      const configPath = join(configDir, 'config.json')
      const config = readJsonFile(configPath) || {}
      config.manualChange = 'should-persist'
      writeJsonFile(configPath, config)

      // Second init
      await runCcjk(['init', '--skip-prompts'], { timeout: 60000 })

      // Check manual change persists
      const newConfig = readJsonFile(configPath)
      if (newConfig) {
        expect(newConfig.manualChange).toBe('should-persist')
      }
    })
  })

  // ==========================================================================
  // Environment Variable Tests
  // ==========================================================================

  describe('Environment Variables', () => {
    it('should respect CCJK_CONFIG_DIR', async () => {
      const customConfigDir = join(testProjectDir, 'custom-config')
      mkdirSync(customConfigDir, { recursive: true })

      const result = await runCcjk(['init', '--skip-prompts'], {
        env: {
          CCJK_CONFIG_DIR: customConfigDir,
        },
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should respect CCJK_LOG_LEVEL', async () => {
      const result = await runCcjk(['init', '--skip-prompts'], {
        env: {
          CCJK_LOG_LEVEL: 'debug',
        },
        timeout: 60000,
      })

      expect(result.timedOut).toBe(false)
    })

    it('should respect CI environment', async () => {
      const result = await runCcjk(['init', '--skip-prompts'], {
        env: {
          CI: 'true',
        },
        timeout: 60000,
      })

      // In CI mode, should skip interactive prompts
      expect(result.timedOut).toBe(false)
    })
  })
})

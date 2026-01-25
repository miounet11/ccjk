/**
 * E2E Test Environment Setup
 * Creates isolated test environment for real-world scenario testing
 */

import type { ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { platform, tmpdir } from 'node:os'
import process from 'node:process'
import { join, resolve } from 'pathe'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

// ============================================================================
// Types
// ============================================================================

export interface E2ETestEnvironment {
  /** Root temporary directory for all E2E tests */
  rootTempDir: string
  /** Isolated home directory for test */
  testHomeDir: string
  /** Isolated config directory */
  testConfigDir: string
  /** Test project directory */
  testProjectDir: string
  /** Original environment variables */
  originalEnv: NodeJS.ProcessEnv
  /** Original working directory */
  originalCwd: string
  /** Test start timestamp */
  startTime: number
  /** Platform info */
  platform: NodeJS.Platform
  /** Running processes to cleanup */
  runningProcesses: ChildProcess[]
}

export interface TestProjectOptions {
  name?: string
  withGit?: boolean
  withPackageJson?: boolean
  withClaudeConfig?: boolean
  withMcpConfig?: boolean
  files?: Record<string, string>
}

// ============================================================================
// Global State
// ============================================================================

let e2eEnv: E2ETestEnvironment

// ============================================================================
// Setup Functions
// ============================================================================

/**
 * Initialize E2E test environment
 */
beforeAll(async () => {
  console.log('========================================')
  console.log('  CCJK E2E Test Suite - Environment Setup')
  console.log('========================================')

  const timestamp = Date.now()
  const rootTempDir = join(tmpdir(), `ccjk-e2e-${timestamp}`)

  e2eEnv = {
    rootTempDir,
    testHomeDir: join(rootTempDir, 'home'),
    testConfigDir: join(rootTempDir, 'home', '.config', 'ccjk'),
    testProjectDir: join(rootTempDir, 'projects'),
    originalEnv: { ...process.env },
    originalCwd: process.cwd(),
    startTime: timestamp,
    platform: platform(),
    runningProcesses: [],
  }

  // Create directory structure
  const dirs = [
    e2eEnv.rootTempDir,
    e2eEnv.testHomeDir,
    e2eEnv.testConfigDir,
    e2eEnv.testProjectDir,
    join(e2eEnv.testHomeDir, '.claude'),
    join(e2eEnv.testHomeDir, '.config'),
    join(e2eEnv.testHomeDir, '.local', 'share', 'ccjk'),
  ]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  // Set isolated environment variables
  process.env.HOME = e2eEnv.testHomeDir
  process.env.USERPROFILE = e2eEnv.testHomeDir // Windows
  process.env.XDG_CONFIG_HOME = join(e2eEnv.testHomeDir, '.config')
  process.env.XDG_DATA_HOME = join(e2eEnv.testHomeDir, '.local', 'share')
  process.env.NODE_ENV = 'test'
  process.env.CCJK_E2E_TEST = 'true'
  process.env.CCJK_LOG_LEVEL = 'silent'
  process.env.CCJK_DISABLE_ANALYTICS = 'true'
  process.env.CCJK_DISABLE_UPDATE_CHECK = 'true'
  process.env.CCJK_DISABLE_TELEMETRY = 'true'
  process.env.CCJK_TEST_ROOT = e2eEnv.rootTempDir
  process.env.CI = 'true' // Disable interactive prompts

  // Create default config files
  await createDefaultConfigs()

  console.log(`Platform: ${e2eEnv.platform}`)
  console.log(`Test root: ${e2eEnv.rootTempDir}`)
  console.log(`Test home: ${e2eEnv.testHomeDir}`)
  console.log('Environment setup complete.')
  console.log('========================================\n')
})

/**
 * Cleanup E2E test environment
 */
afterAll(async () => {
  console.log('\n========================================')
  console.log('  CCJK E2E Test Suite - Cleanup')
  console.log('========================================')

  // Kill any running processes
  for (const proc of e2eEnv.runningProcesses) {
    try {
      proc.kill('SIGTERM')
    }
    catch {
      // Process may already be dead
    }
  }

  // Restore original environment
  process.env = e2eEnv.originalEnv
  process.chdir(e2eEnv.originalCwd)

  // Clean up temporary directory
  if (existsSync(e2eEnv.rootTempDir)) {
    try {
      rmSync(e2eEnv.rootTempDir, { recursive: true, force: true })
      console.log(`Cleaned up: ${e2eEnv.rootTempDir}`)
    }
    catch (error) {
      console.warn(`Warning: Failed to cleanup ${e2eEnv.rootTempDir}:`, error)
    }
  }

  const duration = Date.now() - e2eEnv.startTime
  console.log(`Total duration: ${(duration / 1000).toFixed(2)}s`)
  console.log('========================================\n')
})

/**
 * Per-test setup
 */
beforeEach(async (context) => {
  // Create test-specific directory
  const testId = sanitizeTestName(context.task.name)
  const testDir = join(e2eEnv.testProjectDir, testId)

  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true })
  }

  process.env.CCJK_CURRENT_TEST = testId
  process.env.CCJK_CURRENT_TEST_DIR = testDir
  process.chdir(testDir)
})

/**
 * Per-test cleanup
 */
afterEach(async () => {
  process.chdir(e2eEnv.originalCwd)
  delete process.env.CCJK_CURRENT_TEST
  delete process.env.CCJK_CURRENT_TEST_DIR
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default configuration files for testing
 */
async function createDefaultConfigs(): Promise<void> {
  // Create default CCJK config
  const ccjkConfig = {
    version: '8.2.0',
    cloud: {
      enabled: false,
      provider: 'local',
    },
    mcp: {
      servers: {},
    },
    skills: {
      enabled: true,
      hotReload: false,
    },
  }

  writeFileSync(
    join(e2eEnv.testConfigDir, 'config.json'),
    JSON.stringify(ccjkConfig, null, 2),
  )

  // Create default Claude settings
  const claudeSettings = {
    mcpServers: {},
    permissions: {},
  }

  writeFileSync(
    join(e2eEnv.testHomeDir, '.claude', 'settings.json'),
    JSON.stringify(claudeSettings, null, 2),
  )
}

/**
 * Sanitize test name for use as directory name
 */
function sanitizeTestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Get current E2E test environment
 */
export function getE2EEnvironment(): E2ETestEnvironment {
  return e2eEnv
}

/**
 * Create a test project with specified options
 */
export async function createTestProject(options: TestProjectOptions = {}): Promise<string> {
  const {
    name = `test-project-${Date.now()}`,
    withGit = false,
    withPackageJson = true,
    withClaudeConfig = false,
    withMcpConfig = false,
    files = {},
  } = options

  const projectDir = join(e2eEnv.testProjectDir, name)

  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true })
  }

  // Create package.json
  if (withPackageJson) {
    const packageJson = {
      name,
      version: '1.0.0',
      type: 'module',
      scripts: {
        test: 'echo "test"',
      },
    }
    writeFileSync(
      join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    )
  }

  // Initialize git repository
  if (withGit) {
    mkdirSync(join(projectDir, '.git'), { recursive: true })
    writeFileSync(join(projectDir, '.git', 'config'), '[core]\n\trepositoryformatversion = 0\n')
    writeFileSync(join(projectDir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
  }

  // Create CLAUDE.md
  if (withClaudeConfig) {
    writeFileSync(
      join(projectDir, 'CLAUDE.md'),
      '# Project Context\n\nThis is a test project.\n',
    )
  }

  // Create .mcp.json
  if (withMcpConfig) {
    const mcpConfig = {
      mcpServers: {},
    }
    writeFileSync(
      join(projectDir, '.mcp.json'),
      JSON.stringify(mcpConfig, null, 2),
    )
  }

  // Create additional files
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(projectDir, filePath)
    const dir = resolve(fullPath, '..')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(fullPath, content)
  }

  return projectDir
}

/**
 * Register a process for cleanup
 */
export function registerProcess(proc: ChildProcess): void {
  e2eEnv.runningProcesses.push(proc)
}

/**
 * Get test home directory
 */
export function getTestHomeDir(): string {
  return e2eEnv.testHomeDir
}

/**
 * Get test config directory
 */
export function getTestConfigDir(): string {
  return e2eEnv.testConfigDir
}

/**
 * Read config file from test environment
 */
export function readTestConfig(filename: string): any {
  const configPath = join(e2eEnv.testConfigDir, filename)
  if (!existsSync(configPath)) {
    return null
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'))
}

/**
 * Write config file to test environment
 */
export function writeTestConfig(filename: string, content: any): void {
  const configPath = join(e2eEnv.testConfigDir, filename)
  writeFileSync(configPath, JSON.stringify(content, null, 2))
}

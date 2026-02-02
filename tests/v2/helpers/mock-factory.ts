import { vi, type MockedFunction } from 'vitest'
import type { ExecaChildProcess } from 'execa'
import type { Ora } from 'ora'

/**
 * Mock factory for creating consistent mocks across tests
 */
export class MockFactory {
  /**
   * Create a mock for tinyexec command execution
   */
  static createTinyexecMock(options: {
    stdout?: string
    stderr?: string
    exitCode?: number
    shouldThrow?: boolean
    delay?: number
  } = {}) {
    const {
      stdout = '',
      stderr = '',
      exitCode = 0,
      shouldThrow = false,
      delay = 0,
    } = options

    return vi.fn().mockImplementation(async () => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      if (shouldThrow) {
        const error = new Error(`Command failed with exit code ${exitCode}`)
        ;(error as any).exitCode = exitCode
        ;(error as any).stdout = stdout
        ;(error as any).stderr = stderr
        throw error
      }

      return {
        stdout,
        stderr,
        exitCode,
      }
    })
  }

  /**
   * Create a mock for inquirer prompts
   */
  static createInquirerMock(responses: Record<string, any> = {}) {
    return {
      prompt: vi.fn().mockImplementation(async (questions: any[]) => {
        const answers: Record<string, any> = {}

        for (const question of questions) {
          const name = typeof question === 'string' ? question : question.name
          answers[name] = responses[name] ?? 'default-answer'
        }

        return answers
      }),
    }
  }

  /**
   * Create a mock for ora spinner
   */
  static createOraMock(options: {
    shouldFail?: boolean
    text?: string
  } = {}) {
    const { shouldFail = false, text = 'Loading...' } = options

    const spinner = {
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
      warn: vi.fn().mockReturnThis(),
      info: vi.fn().mockReturnThis(),
      text,
      isSpinning: false,
    }

    if (shouldFail) {
      spinner.start = vi.fn(() => {
        spinner.isSpinning = true
        setTimeout(() => spinner.fail(), 100)
        return spinner
      })
    }

    return vi.fn(() => spinner)
  }

  /**
   * Create a mock for file system operations
   */
  static createFsMock(options: {
    existsSync?: boolean
    readFileSync?: string
    writeFileSync?: boolean
    mkdirSync?: boolean
    rmSync?: boolean
  } = {}) {
    const {
      existsSync = true,
      readFileSync = '{}',
      writeFileSync = true,
      mkdirSync = true,
      rmSync = true,
    } = options

    return {
      existsSync: vi.fn().mockReturnValue(existsSync),
      readFileSync: vi.fn().mockReturnValue(readFileSync),
      writeFileSync: vi.fn().mockReturnValue(writeFileSync),
      mkdirSync: vi.fn().mockReturnValue(mkdirSync),
      rmSync: vi.fn().mockReturnValue(rmSync),
      statSync: vi.fn().mockReturnValue({
        isDirectory: () => true,
        isFile: () => true,
        mtime: new Date(),
        size: 1024,
      }),
    }
  }

  /**
   * Create a mock for path operations
   */
  static createPathMock(platform: 'win32' | 'darwin' | 'linux' = 'linux') {
    const sep = platform === 'win32' ? '\\' : '/'
    const delimiter = platform === 'win32' ? ';' : ':'

    return {
      join: vi.fn((...paths: string[]) => paths.join(sep)),
      resolve: vi.fn((...paths: string[]) => sep + paths.join(sep)),
      dirname: vi.fn((path: string) => path.split(sep).slice(0, -1).join(sep)),
      basename: vi.fn((path: string) => path.split(sep).pop() || ''),
      extname: vi.fn((path: string) => {
        const name = path.split(sep).pop() || ''
        const lastDot = name.lastIndexOf('.')
        return lastDot > 0 ? name.slice(lastDot) : ''
      }),
      sep,
      delimiter,
    }
  }

  /**
   * Create a mock for process operations
   */
  static createProcessMock(options: {
    platform?: NodeJS.Platform
    cwd?: string
    env?: Record<string, string>
    argv?: string[]
  } = {}) {
    const {
      platform = 'linux',
      cwd = '/test',
      env = {},
      argv = ['node', 'test.js'],
    } = options

    return {
      platform,
      cwd: vi.fn().mockReturnValue(cwd),
      env: { ...process.env, ...env },
      argv,
      exit: vi.fn(),
      chdir: vi.fn(),
    }
  }

  /**
   * Create a mock for i18next
   */
  static createI18nMock(translations: Record<string, string> = {}) {
    return {
      t: vi.fn().mockImplementation((key: string, options?: any) => {
        return translations[key] || key
      }),
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      language: 'en',
      languages: ['en', 'zh-CN'],
      init: vi.fn().mockResolvedValue(undefined),
    }
  }

  /**
   * Create a comprehensive mock suite for CCJK operations
   */
  static createCCJKMockSuite(options: {
    platform?: NodeJS.Platform
    hasClaudeCode?: boolean
    hasConfig?: boolean
    apiKey?: string
  } = {}) {
    const {
      platform = 'linux',
      hasClaudeCode = true,
      hasConfig = true,
      apiKey = 'test-api-key',
    } = options

    return {
      tinyexec: this.createTinyexecMock({
        stdout: hasClaudeCode ? 'claude-code version 1.0.0' : '',
        exitCode: hasClaudeCode ? 0 : 1,
      }),
      inquirer: this.createInquirerMock({
        apiKey,
        provider: '302.AI',
        language: 'en',
        confirm: true,
      }),
      ora: this.createOraMock(),
      fs: this.createFsMock({
        existsSync: hasConfig,
        readFileSync: JSON.stringify({ apiKey }),
      }),
      path: this.createPathMock(platform === 'win32' ? 'win32' : 'linux'),
      process: this.createProcessMock({ platform }),
      i18n: this.createI18nMock({
        'common.success': 'Success',
        'common.error': 'Error',
        'common.loading': 'Loading...',
      }),
    }
  }

  /**
   * Create a mock for async operations with controllable timing
   */
  static createAsyncMock<T>(
    result: T,
    options: {
      delay?: number
      shouldReject?: boolean
      rejectionReason?: any
    } = {}
  ) {
    const { delay = 0, shouldReject = false, rejectionReason = new Error('Mock rejection') } = options

    return vi.fn().mockImplementation(async (...args: any[]) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      if (shouldReject) {
        throw rejectionReason
      }

      return result
    })
  }

  /**
   * Create a spy that tracks method calls
   */
  static createSpy<T extends (...args: any[]) => any>(
    implementation?: T
  ): MockedFunction<T> {
    return vi.fn(implementation) as MockedFunction<T>
  }

  /**
   * Reset all mocks created by this factory
   */
  static resetAllMocks() {
    vi.clearAllMocks()
    vi.resetAllMocks()
    vi.restoreAllMocks()
  }

  /**
   * Create a mock for Hook objects
   */
  static createHook(options: {
    id: string
    level?: string
    name?: string
    handler?: (...args: any[]) => any
    dependencies?: string[]
    timeout?: number
  }) {
    const {
      id,
      level = 'L2',
      name = `Hook-${id}`,
      handler = vi.fn().mockResolvedValue({ success: true }),
      dependencies = [],
      timeout = 5000,
    } = options

    return {
      id,
      level,
      name,
      handler,
      dependencies,
      timeout,
      execute: vi.fn().mockImplementation(async (...args: any[]) => {
        return handler(...args)
      }),
    }
  }

  /**
   * Create a mock for Skill objects
   */
  static createSkill(options: {
    id: string
    name?: string
    layer?: string
    category?: string
    keywords?: string[]
    handler?: (...args: any[]) => any
  }) {
    const {
      id,
      name = `Skill-${id}`,
      layer = 'L1',
      category = 'general',
      keywords = [],
      handler = vi.fn().mockResolvedValue({ success: true }),
    } = options

    return {
      id,
      name,
      layer,
      category,
      keywords,
      handler,
      execute: vi.fn().mockImplementation(async (...args: any[]) => {
        return handler(...args)
      }),
    }
  }
}

/**
 * Utility type for extracting mock types
 */
export type MockedType<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? MockedFunction<T[K]>
    : T[K]
}

/**
 * Helper to create a partial mock of an object
 */
export function createPartialMock<T>(
  partial: Partial<MockedType<T>>
): MockedType<T> {
  return partial as MockedType<T>
}

/**
 * Helper to verify mock call patterns
 */
export class MockVerifier {
  static expectCalled<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    times?: number
  ) {
    if (times !== undefined) {
      expect(mock).toHaveBeenCalledTimes(times)
    } else {
      expect(mock).toHaveBeenCalled()
    }
  }

  static expectCalledWith<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    ...args: Parameters<T>
  ) {
    expect(mock).toHaveBeenCalledWith(...args)
  }

  static expectCalledTimes<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    times: number
  ) {
    expect(mock).toHaveBeenCalledTimes(times)
  }

  static expectNotCalled<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>
  ) {
    expect(mock).not.toHaveBeenCalled()
  }

  static expectCallOrder<T extends (...args: any[]) => any>(
    ...mocks: MockedFunction<T>[]
  ) {
    const calls = mocks.map(mock => mock.mock.invocationCallOrder).flat()
    const sortedCalls = [...calls].sort((a, b) => a - b)
    expect(calls).toEqual(sortedCalls)
  }
}

// Add MockVerifier as a static property of MockFactory for backward compatibility
// This allows both MockFactory.MockVerifier.expectCalled() and MockVerifier.expectCalled()
(MockFactory as any).MockVerifier = MockVerifier
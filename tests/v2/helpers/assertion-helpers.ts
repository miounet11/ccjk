import { expect } from 'vitest'
import type { MockedFunction } from 'vitest'

/**
 * Enhanced assertion helpers for CCJK v2.0 tests
 */
export class AssertionHelpers {
  /**
   * Assert that a function was called with specific arguments
   */
  static expectCalledWith<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    ...expectedArgs: Parameters<T>
  ) {
    expect(mock).toHaveBeenCalledWith(...expectedArgs)
  }

  /**
   * Assert that a function was called a specific number of times
   */
  static expectCalledTimes<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>,
    times: number
  ) {
    expect(mock).toHaveBeenCalledTimes(times)
  }

  /**
   * Assert that a function was never called
   */
  static expectNotCalled<T extends (...args: any[]) => any>(
    mock: MockedFunction<T>
  ) {
    expect(mock).not.toHaveBeenCalled()
  }

  /**
   * Assert that an async function resolves to a specific value
   */
  static async expectResolves<T>(
    promise: Promise<T>,
    expectedValue: T
  ) {
    await expect(promise).resolves.toEqual(expectedValue)
  }

  /**
   * Assert that an async function rejects with a specific error
   */
  static async expectRejects(
    promise: Promise<any>,
    expectedError?: string | RegExp | Error
  ) {
    if (expectedError) {
      await expect(promise).rejects.toThrow(expectedError)
    } else {
      await expect(promise).rejects.toThrow()
    }
  }

  /**
   * Assert that an object has specific properties
   */
  static expectObjectToHaveProperties(
    obj: any,
    properties: string[]
  ) {
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop)
    })
  }

  /**
   * Assert that an object matches a partial structure
   */
  static expectObjectToMatchPartial(
    obj: any,
    partial: any
  ) {
    expect(obj).toMatchObject(partial)
  }

  /**
   * Assert that an array contains specific items
   */
  static expectArrayToContain<T>(
    array: T[],
    items: T[]
  ) {
    items.forEach(item => {
      expect(array).toContain(item)
    })
  }

  /**
   * Assert that an array has a specific length
   */
  static expectArrayLength<T>(
    array: T[],
    length: number
  ) {
    expect(array).toHaveLength(length)
  }

  /**
   * Assert that a string matches a pattern
   */
  static expectStringToMatch(
    str: string,
    pattern: string | RegExp
  ) {
    expect(str).toMatch(pattern)
  }

  /**
   * Assert that a string contains a substring
   */
  static expectStringToContain(
    str: string,
    substring: string
  ) {
    expect(str).toContain(substring)
  }

  /**
   * Assert that a number is within a range
   */
  static expectNumberInRange(
    num: number,
    min: number,
    max: number
  ) {
    expect(num).toBeGreaterThanOrEqual(min)
    expect(num).toBeLessThanOrEqual(max)
  }

  /**
   * Assert that a value is of a specific type
   */
  static expectType(
    value: any,
    type: 'string' | 'number' | 'boolean' | 'object' | 'function' | 'undefined'
  ) {
    expect(typeof value).toBe(type)
  }

  /**
   * Assert that a value is truthy
   */
  static expectTruthy(value: any) {
    expect(value).toBeTruthy()
  }

  /**
   * Assert that a value is falsy
   */
  static expectFalsy(value: any) {
    expect(value).toBeFalsy()
  }

  /**
   * Assert that a file exists (for file system tests)
   */
  static expectFileExists(filePath: string, fs: any) {
    expect(fs.existsSync(filePath)).toBe(true)
  }

  /**
   * Assert that a file does not exist
   */
  static expectFileNotExists(filePath: string, fs: any) {
    expect(fs.existsSync(filePath)).toBe(false)
  }

  /**
   * Assert that a file contains specific content
   */
  static expectFileContent(
    filePath: string,
    expectedContent: string,
    fs: any
  ) {
    const content = fs.readFileSync(filePath, 'utf8')
    expect(content).toContain(expectedContent)
  }

  /**
   * Assert that a JSON file has specific structure
   */
  static expectJSONFileStructure(
    filePath: string,
    expectedStructure: any,
    fs: any
  ) {
    const content = fs.readFileSync(filePath, 'utf8')
    const json = JSON.parse(content)
    expect(json).toMatchObject(expectedStructure)
  }

  /**
   * Assert that a command execution was successful
   */
  static expectCommandSuccess(result: {
    stdout: string
    stderr: string
    exitCode: number
  }) {
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
  }

  /**
   * Assert that a command execution failed
   */
  static expectCommandFailure(
    result: {
      stdout: string
      stderr: string
      exitCode: number
    },
    expectedExitCode?: number
  ) {
    if (expectedExitCode !== undefined) {
      expect(result.exitCode).toBe(expectedExitCode)
    } else {
      expect(result.exitCode).not.toBe(0)
    }
  }

  /**
   * Assert that a configuration is valid
   */
  static expectValidConfig(config: any) {
    expect(config).toBeDefined()
    expect(config).toBeTypeOf('object')
    expect(config.version).toBeDefined()
    expect(config.version).toBeTypeOf('string')
  }

  /**
   * Assert that a workflow is valid
   */
  static expectValidWorkflow(workflow: any) {
    expect(workflow).toBeDefined()
    expect(workflow).toBeTypeOf('object')
    expect(workflow.id).toBeDefined()
    expect(workflow.name).toBeDefined()
    expect(workflow.steps).toBeDefined()
    expect(Array.isArray(workflow.steps)).toBe(true)
  }

  /**
   * Assert that an MCP service is valid
   */
  static expectValidMCPService(service: any) {
    expect(service).toBeDefined()
    expect(service).toBeTypeOf('object')
    expect(service.id).toBeDefined()
    expect(service.name).toBeDefined()
    expect(service.command).toBeDefined()
  }

  /**
   * Assert that an API response is valid
   */
  static expectValidAPIResponse(response: any) {
    expect(response).toBeDefined()
    expect(response).toBeTypeOf('object')
    expect(response.status).toBeDefined()
    expect(response.data).toBeDefined()
  }

  /**
   * Assert that an error has specific properties
   */
  static expectErrorWithProperties(
    error: Error,
    properties: { message?: string; code?: string; cause?: any }
  ) {
    expect(error).toBeInstanceOf(Error)

    if (properties.message) {
      expect(error.message).toContain(properties.message)
    }

    if (properties.code) {
      expect((error as any).code).toBe(properties.code)
    }

    if (properties.cause) {
      expect((error as any).cause).toBeDefined()
    }
  }

  /**
   * Assert that a performance metric is within acceptable bounds
   */
  static expectPerformanceWithinBounds(
    metrics: { duration: number; memory: number },
    bounds: { maxDuration: number; maxMemory: number }
  ) {
    expect(metrics.duration).toBeLessThanOrEqual(bounds.maxDuration)
    expect(metrics.memory).toBeLessThanOrEqual(bounds.maxMemory)
  }

  /**
   * Assert that a test environment is properly set up
   */
  static expectTestEnvironmentReady(env: any) {
    expect(env).toBeDefined()
    expect(env.tempDir).toBeDefined()
    expect(env.originalCwd).toBeDefined()
    expect(env.testStartTime).toBeDefined()
  }

  /**
   * Custom matcher for deep equality with tolerance for numbers
   */
  static expectDeepEqualWithTolerance(
    actual: any,
    expected: any,
    tolerance = 0.001
  ) {
    if (typeof actual === 'number' && typeof expected === 'number') {
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
    } else if (Array.isArray(actual) && Array.isArray(expected)) {
      expect(actual).toHaveLength(expected.length)
      actual.forEach((item, index) => {
        this.expectDeepEqualWithTolerance(item, expected[index], tolerance)
      })
    } else if (typeof actual === 'object' && typeof expected === 'object') {
      Object.keys(expected).forEach(key => {
        this.expectDeepEqualWithTolerance(actual[key], expected[key], tolerance)
      })
    } else {
      expect(actual).toEqual(expected)
    }
  }

  /**
   * Assert that a function completes within a time limit
   */
  static async expectCompletesWithinTime<T>(
    fn: () => Promise<T>,
    maxTime: number
  ): Promise<T> {
    const start = Date.now()
    const result = await fn()
    const duration = Date.now() - start

    expect(duration).toBeLessThanOrEqual(maxTime)
    return result
  }

  /**
   * Assert that multiple conditions are all true
   */
  static expectAllConditions(
    conditions: Array<() => boolean>,
    message?: string
  ) {
    const results = conditions.map((condition, index) => ({
      index,
      result: condition(),
    }))

    const failures = results.filter(r => !r.result)

    if (failures.length > 0) {
      const failureMessage = message ||
        `Conditions failed at indices: ${failures.map(f => f.index).join(', ')}`
      throw new Error(failureMessage)
    }
  }

  /**
   * Assert that at least one condition is true
   */
  static expectAnyCondition(
    conditions: Array<() => boolean>,
    message?: string
  ) {
    const results = conditions.map(condition => condition())
    const hasTrue = results.some(result => result)

    if (!hasTrue) {
      const failureMessage = message || 'None of the conditions were true'
      throw new Error(failureMessage)
    }
  }
}
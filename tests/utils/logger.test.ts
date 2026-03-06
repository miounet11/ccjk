/**
 * Logger Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Logger } from '../../src/utils/logger'

describe('logger', () => {
  let logger: Logger
  let consoleLogSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('text mode (default)', () => {
    beforeEach(() => {
      logger = new Logger({ level: 'debug' })
    })

    it('should output in text mode by default', () => {
      logger.info('test message')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'))
    })

    it('should include timestamp in text output', () => {
      logger.info('test message')
      const output = consoleLogSpy.mock.calls[0][0]
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should support all log levels', () => {
      logger.debug('debug message')
      logger.info('info message')
      logger.success('success message')
      logger.warn('warn message')
      logger.error('error message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(5)
    })

    it('should include data in output', () => {
      logger.info('test message', { key: 'value' })
      const output = consoleLogSpy.mock.calls[0][0]
      expect(output).toContain('{"key":"value"}')
    })
  })

  describe('json mode', () => {
    beforeEach(() => {
      logger = new Logger({ mode: 'json', level: 'debug' })
    })

    it('should output valid JSON', () => {
      logger.info('test message')
      const output = consoleLogSpy.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed).toHaveProperty('level', 'info')
      expect(parsed).toHaveProperty('message', 'test message')
      expect(parsed).toHaveProperty('timestamp')
    })

    it('should include data in JSON output', () => {
      logger.info('test message', { key: 'value' })
      const output = consoleLogSpy.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.data).toEqual({ key: 'value' })
    })

    it('should output all log levels as JSON', () => {
      logger.debug('debug')
      logger.info('info')
      logger.success('success')
      logger.warn('warn')
      logger.error('error')

      expect(consoleLogSpy).toHaveBeenCalledTimes(5)
      consoleLogSpy.mock.calls.forEach((call: any) => {
        expect(() => JSON.parse(call[0])).not.toThrow()
      })
    })
  })

  describe('silent mode', () => {
    beforeEach(() => {
      logger = new Logger({ mode: 'silent' })
    })

    it('should not output in silent mode', () => {
      logger.debug('debug')
      logger.info('info')
      logger.success('success')
      logger.warn('warn')
      logger.error('error')

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should support legacy silent option', () => {
      logger = new Logger({ silent: true })
      logger.info('test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })
  })

  describe('log level filtering', () => {
    it('should respect log level filtering', () => {
      logger = new Logger({ level: 'warn' })

      logger.debug('debug message')
      logger.info('info message')
      logger.success('success message')
      logger.warn('warn message')
      logger.error('error message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(2) // warn + error
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('warn message'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('error message'))
    })

    it('should allow changing log level at runtime', () => {
      logger = new Logger({ level: 'error' })
      logger.info('should not appear')
      expect(consoleLogSpy).not.toHaveBeenCalled()

      logger.setLevel('info')
      logger.info('should appear')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('should appear'))
    })
  })

  describe('mode switching', () => {
    beforeEach(() => {
      logger = new Logger()
    })

    it('should allow switching to json mode', () => {
      logger.setMode('json')
      logger.info('test message')

      const output = consoleLogSpy.mock.calls[0][0]
      expect(() => JSON.parse(output)).not.toThrow()
    })

    it('should allow switching to silent mode', () => {
      logger.setMode('silent')
      logger.info('test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should allow switching back to text mode', () => {
      logger.setMode('silent')
      logger.info('should not appear')
      expect(consoleLogSpy).not.toHaveBeenCalled()

      logger.setMode('text')
      logger.info('should appear')
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('should appear'))
    })
  })
})

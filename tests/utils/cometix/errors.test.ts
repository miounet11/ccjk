import { describe, expect, it } from 'vitest'
import {
  CometixCommandError,
  CometixError,
  CometixInstallationError,
  CometixNotInstalledError,
  isCommandNotFoundError,
  isPackageNotFoundError,
} from '../../../src/utils/cometix/errors'

describe('cometix errors', () => {
  describe('cometixError', () => {
    it('should create a CometixError with message and code', () => {
      const error = new CometixError('Test error', 'TEST_CODE')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('CometixError')
      expect(error.cause).toBeUndefined()
    })

    it('should create a CometixError with a cause', () => {
      const cause = new Error('Original error')
      const error = new CometixError('Test error', 'TEST_CODE', cause)

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.cause).toBe(cause)
      expect(error.name).toBe('CometixError')
    })
  })

  describe('cometixInstallationError', () => {
    it('should create a CometixInstallationError without cause', () => {
      const error = new CometixInstallationError('Installation failed')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error).toBeInstanceOf(CometixInstallationError)
      expect(error.message).toBe('Installation failed')
      expect(error.code).toBe('INSTALLATION_FAILED')
      expect(error.name).toBe('CometixInstallationError')
      expect(error.cause).toBeUndefined()
    })

    it('should create a CometixInstallationError with cause', () => {
      const cause = new Error('npm install failed')
      const error = new CometixInstallationError('Installation failed', cause)

      expect(error.message).toBe('Installation failed')
      expect(error.code).toBe('INSTALLATION_FAILED')
      expect(error.cause).toBe(cause)
      expect(error.name).toBe('CometixInstallationError')
    })
  })

  describe('cometixCommandError', () => {
    it('should create a CometixCommandError without cause', () => {
      const error = new CometixCommandError('Command execution failed')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error).toBeInstanceOf(CometixCommandError)
      expect(error.message).toBe('Command execution failed')
      expect(error.code).toBe('COMMAND_FAILED')
      expect(error.name).toBe('CometixCommandError')
      expect(error.cause).toBeUndefined()
    })

    it('should create a CometixCommandError with cause', () => {
      const cause = new Error('ccline command not found')
      const error = new CometixCommandError('Command execution failed', cause)

      expect(error.message).toBe('Command execution failed')
      expect(error.code).toBe('COMMAND_FAILED')
      expect(error.cause).toBe(cause)
      expect(error.name).toBe('CometixCommandError')
    })
  })

  describe('cometixNotInstalledError', () => {
    it('should create a CometixNotInstalledError with default message', () => {
      const error = new CometixNotInstalledError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CometixError)
      expect(error).toBeInstanceOf(CometixNotInstalledError)
      expect(error.message).toBe('CCometixLine is not installed')
      expect(error.code).toBe('NOT_INSTALLED')
      expect(error.name).toBe('CometixNotInstalledError')
      expect(error.cause).toBeUndefined()
    })
  })

  describe('isCommandNotFoundError', () => {
    it('should return true for "command not found" error', () => {
      const error = new Error('bash: ccline: command not found')
      expect(isCommandNotFoundError(error)).toBe(true)
    })

    it('should return true for error containing "ccline"', () => {
      const error = new Error('ccline is not available')
      expect(isCommandNotFoundError(error)).toBe(true)
    })

    it('should return true for error containing both patterns', () => {
      const error = new Error('command not found: ccline')
      expect(isCommandNotFoundError(error)).toBe(true)
    })

    it('should return false for unrelated error', () => {
      const error = new Error('Network connection failed')
      expect(isCommandNotFoundError(error)).toBe(false)
    })

    it('should return false for empty error message', () => {
      const error = new Error('some other error')
      expect(isCommandNotFoundError(error)).toBe(false)
    })
  })

  describe('isPackageNotFoundError', () => {
    it('should return true for "404 Not Found" error', () => {
      const error = new Error('npm ERR! 404 Not Found')
      expect(isPackageNotFoundError(error)).toBe(true)
    })

    it('should return true for "Package not found" error', () => {
      const error = new Error('Package not found in registry')
      expect(isPackageNotFoundError(error)).toBe(true)
    })

    it('should return true for error containing both patterns', () => {
      const error = new Error('404 Not Found - Package not found')
      expect(isPackageNotFoundError(error)).toBe(true)
    })

    it('should return false for unrelated error', () => {
      const error = new Error('Installation failed due to permissions')
      expect(isPackageNotFoundError(error)).toBe(false)
    })

    it('should return false for empty error message', () => {
      const error = new Error('some other error')
      expect(isPackageNotFoundError(error)).toBe(false)
    })
  })
})

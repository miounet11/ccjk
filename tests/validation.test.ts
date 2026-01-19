/**
 * Validation Library Tests
 * Tests for input validation and boundary condition handling
 */

import { describe, expect, it } from 'vitest'
import {
  formatApiKeyDisplay,
  isValidApiKey,
  isValidEnvVarName,
  isValidFilePath,
  isValidHostname,
  isValidPathEntry,
  isValidPort,
  isValidUrl,
  safeArrayAccess,
  safeObjectAccess,
  sanitizeEnvValue,
  sanitizeUserInput,
  validateArrayAccess,
  validateObjectKeyAccess,
  validateUserInput,
} from '../src/utils/validation'

describe('array Access Validation', () => {
  it('should validate valid array access', () => {
    const arr = [1, 2, 3]
    const result = validateArrayAccess(arr, 0)
    expect(result.valid).toBe(true)
  })

  it('should reject access to non-array', () => {
    const result = validateArrayAccess(null, 0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not an array')
  })

  it('should reject out of bounds access', () => {
    const arr = [1, 2, 3]
    const result = validateArrayAccess(arr, 5)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('out of bounds')
  })

  it('should reject negative index', () => {
    const arr = [1, 2, 3]
    const result = validateArrayAccess(arr, -1)
    expect(result.valid).toBe(false)
  })

  it('should safely access array with default value', () => {
    const arr = [1, 2, 3]
    const value = safeArrayAccess(arr, 10, 0)
    expect(value).toBe(0)
  })

  it('should safely access valid array element', () => {
    const arr = [1, 2, 3]
    const value = safeArrayAccess(arr, 1)
    expect(value).toBe(2)
  })
})

describe('object Key Access Validation', () => {
  it('should validate valid object key access', () => {
    const obj = { name: 'test', value: 123 }
    const result = validateObjectKeyAccess(obj, 'name')
    expect(result.valid).toBe(true)
  })

  it('should reject access to non-object', () => {
    const result = validateObjectKeyAccess(null, 'key')
    expect(result.valid).toBe(false)
  })

  it('should reject access to missing key', () => {
    const obj = { name: 'test' }
    const result = validateObjectKeyAccess(obj, 'missing')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('should safely access object property', () => {
    const obj = { name: 'test' }
    const value = safeObjectAccess(obj, 'name', 'default')
    expect(value).toBe('test')
  })

  it('should return default for missing property', () => {
    const obj = { name: 'test' }
    const value = safeObjectAccess(obj, 'missing' as any, 'default')
    expect(value).toBe('default')
  })
})

describe('environment Variable Validation', () => {
  it('should validate valid env var names', () => {
    const validNames = ['API_KEY', 'MY_VAR', '_PRIVATE', 'VAR123']
    validNames.forEach((name) => {
      const result = isValidEnvVarName(name)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject invalid env var names', () => {
    const invalidNames = ['123VAR', 'my-var', 'my.var', 'my var', '']
    invalidNames.forEach((name) => {
      const result = isValidEnvVarName(name)
      expect(result.valid).toBe(false)
    })
  })

  it('should sanitize env values', () => {
    const value = 'test\nvalue\r\nwith\0null'
    const sanitized = sanitizeEnvValue(value)
    // Implementation removes \n, \r, \0 but keeps the text "null"
    expect(sanitized).toBe('testvaluewithnull')
    expect(sanitized).not.toContain('\n')
    expect(sanitized).not.toContain('\r')
    expect(sanitized).not.toContain('\0')
  })

  it('should handle empty env values', () => {
    const sanitized = sanitizeEnvValue('')
    expect(sanitized).toBe('')
  })
})

describe('uRL Validation', () => {
  it('should validate valid URLs', () => {
    const validUrls = [
      'http://example.com',
      'https://example.com',
      'https://api.example.com:8080/path',
      'https://example.com/path?query=value',
    ]
    validUrls.forEach((url) => {
      const result = isValidUrl(url)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject invalid URLs', () => {
    const invalidUrls = [
      'ftp://example.com',
      'not-a-url',
      'http://',
      '',
      // URL must be > 2048 chars to be rejected, so use 2100
      `http://example.com/${'x'.repeat(2100)}`,
    ]
    invalidUrls.forEach((url) => {
      const result = isValidUrl(url)
      expect(result.valid).toBe(false)
    })
  })

  it('should reject URLs without hostname', () => {
    const result = isValidUrl('http://')
    expect(result.valid).toBe(false)
  })

  it('should reject URLs longer than 2048 characters', () => {
    const longUrl = `https://example.com/${'x'.repeat(2100)}`
    const result = isValidUrl(longUrl)
    expect(result.valid).toBe(false)
  })
})

describe('file Path Validation', () => {
  it('should validate safe file paths', () => {
    const safePaths = ['/home/user/file.txt', 'relative/path/file.txt', './file.txt']
    safePaths.forEach((path) => {
      const result = isValidFilePath(path)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject paths with directory traversal', () => {
    const unsafePaths = ['/home/../../../etc/passwd', './../../sensitive', '../file.txt']
    unsafePaths.forEach((path) => {
      const result = isValidFilePath(path)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('directory traversal')
    })
  })

  it('should reject paths with null bytes', () => {
    const result = isValidFilePath('/home/user\0/file.txt')
    expect(result.valid).toBe(false)
  })
})

describe('path Entry Validation', () => {
  it('should validate safe path entries', () => {
    const safeEntries = ['file.txt', 'directory', 'my-file_123.json']
    safeEntries.forEach((entry) => {
      const result = isValidPathEntry(entry)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject entries with path separators', () => {
    const invalidEntries = ['../file', 'dir/file', 'dir\\file', '..']
    invalidEntries.forEach((entry) => {
      const result = isValidPathEntry(entry)
      expect(result.valid).toBe(false)
    })
  })

  it('should reject entries with null bytes', () => {
    const result = isValidPathEntry('file\0.txt')
    expect(result.valid).toBe(false)
  })
})

describe('user Input Validation', () => {
  it('should validate valid user input', () => {
    const result = validateUserInput('valid input')
    expect(result.valid).toBe(true)
  })

  it('should enforce minimum length', () => {
    const result = validateUserInput('a', { minLength: 5 })
    expect(result.valid).toBe(false)
  })

  it('should enforce maximum length', () => {
    const result = validateUserInput('x'.repeat(100), { maxLength: 50 })
    expect(result.valid).toBe(false)
  })

  it('should validate against pattern', () => {
    const result = validateUserInput('abc123', { pattern: /^[a-z]+$/ })
    expect(result.valid).toBe(false)
  })

  it('should validate allowed characters', () => {
    const result = validateUserInput('abc', { allowedChars: 'abc' })
    expect(result.valid).toBe(true)

    const result2 = validateUserInput('abcd', { allowedChars: 'abc' })
    expect(result2.valid).toBe(false)
  })

  it('should sanitize user input', () => {
    const sanitized = sanitizeUserInput('  test input  ')
    expect(sanitized).toBe('test input')
  })

  it('should truncate long input', () => {
    const sanitized = sanitizeUserInput('x'.repeat(100), 50)
    expect(sanitized.length).toBe(50)
  })
})

describe('aPI Key Validation', () => {
  it('should validate valid API keys', () => {
    const result = isValidApiKey('sk-1234567890abcdef')
    expect(result.valid).toBe(true)
  })

  it('should reject short API keys', () => {
    const result = isValidApiKey('short')
    expect(result.valid).toBe(false)
  })

  it('should reject API keys with whitespace', () => {
    const result = isValidApiKey('sk-1234567890 abcdef')
    expect(result.valid).toBe(false)
  })

  it('should format API key for display', () => {
    const formatted = formatApiKeyDisplay('sk-1234567890abcdef')
    // Implementation shows first 8 and last 4 characters
    expect(formatted).toBe('sk-12345...cdef')
    expect(formatted).not.toContain('67890ab')
  })

  it('should mask short API keys', () => {
    const formatted = formatApiKeyDisplay('short')
    expect(formatted).toBe('***')
  })

  it('should handle null/undefined API keys', () => {
    expect(formatApiKeyDisplay(null)).toBe('***')
    expect(formatApiKeyDisplay(undefined)).toBe('***')
  })
})

describe('port Validation', () => {
  it('should validate valid ports', () => {
    const validPorts = [1, 80, 443, 8080, 65535]
    validPorts.forEach((port) => {
      const result = isValidPort(port)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject invalid ports', () => {
    const invalidPorts = [0, -1, 65536, 100000, 'not-a-port']
    invalidPorts.forEach((port) => {
      const result = isValidPort(port)
      expect(result.valid).toBe(false)
    })
  })

  it('should accept port as string', () => {
    const result = isValidPort('8080')
    expect(result.valid).toBe(true)
  })
})

describe('hostname Validation', () => {
  it('should validate valid hostnames', () => {
    const validHostnames = ['example.com', 'api.example.com', 'my-server', 'localhost']
    validHostnames.forEach((hostname) => {
      const result = isValidHostname(hostname)
      expect(result.valid).toBe(true)
    })
  })

  it('should reject invalid hostnames', () => {
    const invalidHostnames = ['-invalid', 'invalid-', 'invalid..com', 'invalid_host', '']
    invalidHostnames.forEach((hostname) => {
      const result = isValidHostname(hostname)
      expect(result.valid).toBe(false)
    })
  })

  it('should reject hostnames longer than 253 characters', () => {
    const longHostname = 'a'.repeat(254)
    const result = isValidHostname(longHostname)
    expect(result.valid).toBe(false)
  })
})

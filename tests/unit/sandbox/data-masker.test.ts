/**
 * Unit tests for DataMasker
 */

import { describe, expect, it } from 'vitest'
import { DataMasker } from '../../../src/sandbox/data-masker.js'

describe('dataMasker', () => {
  describe('maskApiKey', () => {
    it('should mask API key showing first 4 and last 4 characters', () => {
      const masker = new DataMasker()
      const apiKey = 'sk-1234567890abcdef1234567890abcdef'

      const masked = masker.maskApiKey(apiKey)

      expect(masked).toBe('sk-1****cdef')
      expect(masked.length).toBeLessThan(apiKey.length)
    })

    it('should mask short keys completely', () => {
      const masker = new DataMasker()
      const shortKey = 'abc123'

      const masked = masker.maskApiKey(shortKey)

      expect(masked).toBe('********')
    })

    it('should handle empty string', () => {
      const masker = new DataMasker()
      const masked = masker.maskApiKey('')

      expect(masked).toBe('********')
    })
  })

  describe('maskEmail', () => {
    it('should mask email local part', () => {
      const masker = new DataMasker()
      const email = 'user@example.com'

      const masked = masker.maskEmail(email)

      expect(masked).toMatch(/^us\*+r@example\.com$/)
      expect(masked).toContain('@example.com')
    })

    it('should not mask invalid email', () => {
      const masker = new DataMasker()
      const invalid = 'not-an-email'

      const masked = masker.maskEmail(invalid)

      expect(masked).toBe(invalid)
    })
  })

  describe('maskString', () => {
    it('should mask string with custom show parameters', () => {
      const masker = new DataMasker()
      const str = 'sensitive-data-here'

      const masked = masker.maskString(str, 2, 2)

      expect(masked).toMatch(/^se\*+re$/)
    })

    it('should mask short strings completely', () => {
      const masker = new DataMasker()
      const short = 'abc'

      const masked = masker.maskString(short, 2, 2)

      expect(masked).toMatch(/^\*+$/)
    })
  })

  describe('isSensitiveField', () => {
    it('should detect API key fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('apiKey')).toBe(true)
      expect(masker.isSensitiveField('api_key')).toBe(true)
      expect(masker.isSensitiveField('API-KEY')).toBe(true)
    })

    it('should detect password fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('password')).toBe(true)
      expect(masker.isSensitiveField('passwd')).toBe(true)
      expect(masker.isSensitiveField('pass')).toBe(true)
    })

    it('should detect token fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('token')).toBe(true)
      expect(masker.isSensitiveField('authToken')).toBe(true)
      expect(masker.isSensitiveField('accessToken')).toBe(true)
    })

    it('should detect secret fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('secret')).toBe(true)
      expect(masker.isSensitiveField('clientSecret')).toBe(true)
    })

    it('should detect credential fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('credential')).toBe(true)
      expect(masker.isSensitiveField('credentials')).toBe(true)
    })

    it('should detect authorization fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('authorization')).toBe(true)
      expect(masker.isSensitiveField('auth')).toBe(true)
      expect(masker.isSensitiveField('bearer')).toBe(true)
    })

    it('should not detect non-sensitive fields', () => {
      const masker = new DataMasker()

      expect(masker.isSensitiveField('username')).toBe(false)
      expect(masker.isSensitiveField('email')).toBe(false)
      expect(masker.isSensitiveField('name')).toBe(false)
    })
  })

  describe('maskSensitiveFields', () => {
    it('should mask sensitive fields in object', () => {
      const masker = new DataMasker()
      const obj = {
        username: 'john',
        apiKey: 'sk-1234567890abcdef',
        email: 'john@example.com',
      }

      const masked = masker.maskSensitiveFields(obj)

      expect(masked.username).toBe('john')
      expect(masked.apiKey).toMatch(/^sk-1\*+ef$/)
      expect(masked.email).toBe('john@example.com')
    })

    it('should mask nested sensitive fields', () => {
      const masker = new DataMasker()
      const obj = {
        user: {
          name: 'john',
          credentials: {
            apiKey: 'sk-1234567890abcdef',
            password: 'secret123',
          },
        },
      }

      const masked = masker.maskSensitiveFields(obj)

      expect(masked.user.name).toBe('john')
      expect(masked.user.credentials.apiKey).toMatch(/^sk-1\*+ef$/)
      expect(masked.user.credentials.password).toMatch(/^\*+$/)
    })

    it('should mask sensitive fields in arrays', () => {
      const masker = new DataMasker()
      const obj = {
        users: [
          { name: 'john', apiKey: 'key1' },
          { name: 'jane', apiKey: 'key2' },
        ],
      }

      const masked = masker.maskSensitiveFields(obj)

      expect(masked.users[0].name).toBe('john')
      expect(masked.users[0].apiKey).toMatch(/^\*+$/)
      expect(masked.users[1].name).toBe('jane')
      expect(masked.users[1].apiKey).toMatch(/^\*+$/)
    })

    it('should handle null and undefined', () => {
      const masker = new DataMasker()

      expect(masker.maskSensitiveFields(null)).toBe(null)
      expect(masker.maskSensitiveFields(undefined)).toBe(undefined)
    })

    it('should handle primitive types', () => {
      const masker = new DataMasker()

      expect(masker.maskSensitiveFields('string')).toBe('string')
      expect(masker.maskSensitiveFields(123)).toBe(123)
      expect(masker.maskSensitiveFields(true)).toBe(true)
    })

    it('should redact non-string sensitive values', () => {
      const masker = new DataMasker()
      const obj = {
        apiKey: { nested: 'value' },
        password: 12345,
      }

      const masked = masker.maskSensitiveFields(obj)

      expect(masked.apiKey).toBe('[REDACTED]')
      expect(masked.password).toBe('[REDACTED]')
    })
  })

  describe('maskUrlParams', () => {
    it('should mask sensitive URL parameters', () => {
      const masker = new DataMasker()
      const url = 'https://api.example.com/data?apiKey=sk-1234567890abcdef&user=john'

      const masked = masker.maskUrlParams(url)

      expect(masked).toContain('user=john')
      expect(masked).toMatch(/apiKey=sk-1\*+ef/)
      expect(masked).not.toContain('sk-1234567890abcdef')
    })

    it('should handle invalid URLs', () => {
      const masker = new DataMasker()
      const invalid = 'not-a-url'

      const masked = masker.maskUrlParams(invalid)

      expect(masked).toBe(invalid)
    })
  })

  describe('maskHeaders', () => {
    it('should mask sensitive headers', () => {
      const masker = new DataMasker()
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-1234567890abcdef',
        'X-API-Key': 'key-abcdef123456',
      }

      const masked = masker.maskHeaders(headers)

      expect(masked['Content-Type']).toBe('application/json')
      expect(masked.Authorization).toMatch(/^Bear\*+cdef$/)
      expect(masked['X-API-Key']).toMatch(/^key-\*+3456$/)
    })
  })

  describe('updateOptions', () => {
    it('should update masking options', () => {
      const masker = new DataMasker()

      masker.updateOptions({ showFirst: 2, showLast: 2 })

      const masked = masker.maskApiKey('sk-1234567890abcdef')
      expect(masked).toMatch(/^sk\*+ef$/)
    })
  })

  describe('getOptions', () => {
    it('should return current options', () => {
      const masker = new DataMasker({ showFirst: 3, showLast: 3 })

      const options = masker.getOptions()

      expect(options.showFirst).toBe(3)
      expect(options.showLast).toBe(3)
    })
  })

  describe('custom patterns', () => {
    it('should detect custom sensitive patterns', () => {
      const masker = new DataMasker({
        customPatterns: [/custom_field/i],
      })

      expect(masker.isSensitiveField('custom_field')).toBe(true)
      expect(masker.isSensitiveField('CUSTOM_FIELD')).toBe(true)
    })

    it('should mask fields matching custom patterns', () => {
      const masker = new DataMasker({
        customPatterns: [/ssn/i],
      })

      const obj = {
        name: 'john',
        ssn: '123-45-6789',
      }

      const masked = masker.maskSensitiveFields(obj)

      expect(masked.name).toBe('john')
      expect(masked.ssn).toMatch(/^123-\*+789$/)
    })
  })
})

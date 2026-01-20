/**
 * Validation Helper Tests
 */

import { ValidationHelper } from '../wizard/validation'

describe('validationHelper', () => {
  describe('validateApiKeyFormat', () => {
    it('should validate correct API key', () => {
      const result = ValidationHelper.validateApiKeyFormat('sk-test-key-123456789012345678901234567890')
      expect(result.valid).toBe(true)
    })

    it('should reject empty API key', () => {
      const result = ValidationHelper.validateApiKeyFormat('')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('API key cannot be empty')
    })

    it('should reject API key with spaces', () => {
      const result = ValidationHelper.validateApiKeyFormat('sk-test key-123456789012345678901234567890')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('API key should not contain spaces')
    })

    it('should reject short API key', () => {
      const result = ValidationHelper.validateApiKeyFormat('short')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('API key is too short')
    })

    it('should warn about incorrect prefix', () => {
      const result = ValidationHelper.validateApiKeyFormat(
        'test-key-123456789012345678901234567890',
        'sk-',
      )
      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('API key should start with "sk-"')
    })
  })

  describe('validateUrl', () => {
    it('should validate correct HTTPS URL', () => {
      const result = ValidationHelper.validateUrl('https://api.example.com/v1')
      expect(result.valid).toBe(true)
    })

    it('should validate HTTP URL with warning', () => {
      const result = ValidationHelper.validateUrl('http://api.example.com/v1')
      expect(result.valid).toBe(true)
      expect(result.warnings?.length).toBeGreaterThan(0)
    })

    it('should reject empty URL', () => {
      const result = ValidationHelper.validateUrl('')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL cannot be empty')
    })

    it('should reject invalid URL', () => {
      const result = ValidationHelper.validateUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid URL format')
    })

    it('should reject non-HTTP protocol', () => {
      const result = ValidationHelper.validateUrl('ftp://api.example.com')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL must use HTTP or HTTPS protocol')
    })

    it('should warn about missing path', () => {
      const result = ValidationHelper.validateUrl('https://api.example.com')
      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('URL should include a path (e.g., /v1)')
    })
  })

  describe('validateRequired', () => {
    it('should validate non-empty value', () => {
      const result = ValidationHelper.validateRequired('test-value', 'Test Field')
      expect(result.valid).toBe(true)
    })

    it('should reject empty value', () => {
      const result = ValidationHelper.validateRequired('', 'Test Field')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Test Field is required')
    })

    it('should reject undefined value', () => {
      const result = ValidationHelper.validateRequired(undefined, 'Test Field')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Test Field is required')
    })
  })

  describe('getFriendlyError', () => {
    it('should handle network errors', () => {
      const error = new Error('Network request failed')
      const friendly = ValidationHelper.getFriendlyError(error)

      expect(friendly.title).toBe('Connection Error')
      expect(friendly.suggestions.length).toBeGreaterThan(0)
    })

    it('should handle authentication errors', () => {
      const error = new Error('401 Unauthorized')
      const friendly = ValidationHelper.getFriendlyError(error)

      expect(friendly.title).toBe('Authentication Failed')
      expect(friendly.message).toContain('API key')
    })

    it('should handle rate limit errors', () => {
      const error = new Error('429 Rate limit exceeded')
      const friendly = ValidationHelper.getFriendlyError(error)

      expect(friendly.title).toBe('Rate Limit Exceeded')
      expect(friendly.suggestions.length).toBeGreaterThan(0)
    })

    it('should handle quota errors', () => {
      const error = new Error('Insufficient balance')
      const friendly = ValidationHelper.getFriendlyError(error)

      expect(friendly.title).toBe('Insufficient Credits')
      expect(friendly.suggestions.length).toBeGreaterThan(0)
    })

    it('should handle model errors', () => {
      const error = new Error('Model not found')
      const friendly = ValidationHelper.getFriendlyError(error)

      expect(friendly.title).toBe('Model Error')
      expect(friendly.suggestions.length).toBeGreaterThan(0)
    })

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong')
      const friendly = ValidationHelper.getFriendlyError(error)

      expect(friendly.title).toBe('Configuration Error')
      expect(friendly.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('formatValidationResult', () => {
    it('should format successful validation', () => {
      const result = { valid: true }
      const formatted = ValidationHelper.formatValidationResult(result)

      expect(formatted).toContain('✅')
    })

    it('should format errors', () => {
      const result = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
      }
      const formatted = ValidationHelper.formatValidationResult(result)

      expect(formatted).toContain('❌')
      expect(formatted).toContain('Error 1')
      expect(formatted).toContain('Error 2')
    })

    it('should format warnings', () => {
      const result = {
        valid: true,
        warnings: ['Warning 1'],
      }
      const formatted = ValidationHelper.formatValidationResult(result)

      expect(formatted).toContain('⚠️')
      expect(formatted).toContain('Warning 1')
    })

    it('should format suggestions', () => {
      const result = {
        valid: false,
        errors: ['Error'],
        suggestions: ['Suggestion 1', 'Suggestion 2'],
      }
      const formatted = ValidationHelper.formatValidationResult(result)

      expect(formatted).toContain('💡')
      expect(formatted).toContain('Suggestion 1')
      expect(formatted).toContain('Suggestion 2')
    })
  })
})

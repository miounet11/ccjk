/**
 * Validation Utilities
 * Real-time validation and helpful error messages
 */

import type { ProviderCredentials, ValidationResult } from '../core/provider-interface'

export class ValidationHelper {
  /**
   * Validate API key format
   */
  static validateApiKeyFormat(apiKey: string, expectedPrefix?: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('API key cannot be empty')
      return { valid: false, errors }
    }

    if (apiKey.includes(' ')) {
      errors.push('API key should not contain spaces')
      suggestions.push('Please remove any spaces from your API key')
      return { valid: false, errors, suggestions }
    }

    if (expectedPrefix && !apiKey.startsWith(expectedPrefix)) {
      warnings.push(`API key should start with "${expectedPrefix}"`)
      suggestions.push('Please verify you copied the correct API key')
    }

    if (apiKey.length < 10) {
      errors.push('API key is too short')
      suggestions.push('Please check if you copied the complete API key')
      return { valid: false, errors, suggestions }
    }

    return { valid: true, warnings, suggestions }
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    if (!url || url.trim().length === 0) {
      errors.push('URL cannot be empty')
      return { valid: false, errors }
    }

    try {
      const parsed = new URL(url)

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol')
        suggestions.push('URL should start with http:// or https://')
        return { valid: false, errors, suggestions }
      }

      if (parsed.protocol === 'http:') {
        warnings.push('Using HTTP instead of HTTPS is not recommended')
        suggestions.push('Consider using HTTPS for better security')
      }

      if (!parsed.pathname || parsed.pathname === '/') {
        warnings.push('URL should include a path (e.g., /v1)')
      }
    }
    catch {
      errors.push('Invalid URL format')
      suggestions.push('URL should be in format: https://api.example.com/v1')
      return { valid: false, errors, suggestions }
    }

    return { valid: true, warnings, suggestions }
  }

  /**
   * Validate required field
   */
  static validateRequired(value: string | undefined, fieldName: string): ValidationResult {
    if (!value || value.trim().length === 0) {
      return {
        valid: false,
        errors: [`${fieldName} is required`],
        suggestions: [`Please enter a value for ${fieldName}`],
      }
    }

    return { valid: true }
  }

  /**
   * Get friendly error message
   */
  static getFriendlyError(error: Error): {
    title: string
    message: string
    suggestions: string[]
  } {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('fetch failed')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the API server',
        suggestions: [
          'Check your internet connection',
          'Verify the API URL is correct',
          'Check if the service is currently available',
          'Try again in a few moments',
        ],
      }
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        title: 'Authentication Failed',
        message: 'Your API key is invalid or expired',
        suggestions: [
          'Verify your API key is correct',
          'Check if your API key has expired',
          'Generate a new API key if needed',
          'Ensure you copied the complete key',
        ],
      }
    }

    // Permission errors
    if (message.includes('forbidden') || message.includes('403')) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource',
        suggestions: [
          'Check if your account has the necessary permissions',
          'Verify your subscription is active',
          'Contact your provider for access',
        ],
      }
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        title: 'Rate Limit Exceeded',
        message: 'You\'ve made too many requests',
        suggestions: [
          'Wait a few moments before trying again',
          'Check your rate limit settings',
          'Consider upgrading your plan',
        ],
      }
    }

    // Quota/billing errors
    if (message.includes('quota') || message.includes('insufficient') || message.includes('balance')) {
      return {
        title: 'Insufficient Credits',
        message: 'Your account has run out of credits',
        suggestions: [
          'Check your account balance',
          'Add credits to your account',
          'Verify your billing information',
        ],
      }
    }

    // Model errors
    if (message.includes('model')) {
      return {
        title: 'Model Error',
        message: 'The specified model is not available',
        suggestions: [
          'Check if the model name is correct',
          'Verify your account has access to this model',
          'Try a different model',
        ],
      }
    }

    // Timeout errors
    if (message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete',
        suggestions: [
          'Try again with a shorter request',
          'Check your internet connection',
          'The service might be experiencing high load',
        ],
      }
    }

    // Generic error
    return {
      title: 'Configuration Error',
      message: error.message,
      suggestions: [
        'Double-check all configuration values',
        'Verify your API credentials',
        'Try the test connection again',
        'Contact support if the problem persists',
      ],
    }
  }

  /**
   * Validate complete setup
   */
  static async validateSetup(
    credentials: ProviderCredentials,
    requiresApiKey: boolean,
    customFieldsRequired: string[] = [],
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Validate API key
    if (requiresApiKey) {
      const apiKeyValidation = this.validateApiKeyFormat(credentials.apiKey || '')
      if (!apiKeyValidation.valid) {
        errors.push(...(apiKeyValidation.errors || []))
        suggestions.push(...(apiKeyValidation.suggestions || []))
      }
      warnings.push(...(apiKeyValidation.warnings || []))
    }

    // Validate custom fields
    for (const field of customFieldsRequired) {
      const value = credentials.customFields?.[field]
      const fieldValidation = this.validateRequired(value, field)
      if (!fieldValidation.valid) {
        errors.push(...(fieldValidation.errors || []))
        suggestions.push(...(fieldValidation.suggestions || []))
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    }
  }

  /**
   * Format validation result for display
   */
  static formatValidationResult(result: ValidationResult): string {
    const parts: string[] = []

    if (result.errors && result.errors.length > 0) {
      parts.push('❌ Errors:')
      result.errors.forEach(err => parts.push(`  • ${err}`))
    }

    if (result.warnings && result.warnings.length > 0) {
      parts.push('⚠️  Warnings:')
      result.warnings.forEach(warn => parts.push(`  • ${warn}`))
    }

    if (result.suggestions && result.suggestions.length > 0) {
      parts.push('💡 Suggestions:')
      result.suggestions.forEach(sug => parts.push(`  • ${sug}`))
    }

    if (result.valid && parts.length === 0) {
      parts.push('✅ Validation passed!')
    }

    return parts.join('\n')
  }
}

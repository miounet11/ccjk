/**
 * Anthropic Provider
 * Official Anthropic Claude API
 */

import type {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ProviderSetup,
  ValidationResult,
} from '../core/provider-interface'

export class ProviderAnthropic implements IProvider {
  private config: ProviderConfig = {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Official Anthropic Claude API - Direct access to Claude models',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: [
      'claude-opus-4-5-20251101',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    requiresApiKey: true,
    icon: '🤖',
  }

  getConfig(): ProviderConfig {
    return this.config
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    if (!credentials.apiKey) {
      errors.push('API Key is required')
      suggestions.push('Get your API key from https://console.anthropic.com')
      return { valid: false, errors, suggestions }
    }

    // Anthropic API keys start with 'sk-ant-'
    if (!credentials.apiKey.startsWith('sk-ant-')) {
      warnings.push('Anthropic API keys should start with "sk-ant-"')
      suggestions.push('Please verify you copied the correct API key')
    }

    if (credentials.apiKey.length < 40) {
      errors.push('API key appears to be too short')
      suggestions.push('Please check if you copied the complete API key')
      return { valid: false, errors, warnings, suggestions }
    }

    return { valid: true, warnings, suggestions }
  }

  async testConnection(credentials: ProviderCredentials): Promise<ValidationResult> {
    const validation = await this.validateCredentials(credentials)
    if (!validation.valid) {
      return validation
    }

    try {
      // Test with a simple messages request
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': credentials.apiKey!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
        return {
          valid: false,
          errors: [
            `Connection failed: ${response.status} - ${errorData.error?.message || response.statusText}`,
          ],
          suggestions: [
            'Verify your API key is correct',
            'Check if your account has sufficient credits',
            'Visit https://console.anthropic.com for support',
          ],
        }
      }

      return {
        valid: true,
        suggestions: ['Connection successful! Anthropic Claude is ready to use'],
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: [
          'Check your internet connection',
          'Verify you can access api.anthropic.com',
          'Try again in a few moments',
        ],
      }
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Visit https://console.anthropic.com and sign up',
      '2. Navigate to API Keys section',
      '3. Create a new API key',
      '4. Copy the API key (starts with "sk-ant-")',
    ]
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Invalid API key. Please check your credentials at https://console.anthropic.com'
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Your account may not have access to this model.'
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please wait before making more requests.'
    }

    if (message.includes('overloaded') || message.includes('529')) {
      return 'Anthropic API is temporarily overloaded. Please try again shortly.'
    }

    if (message.includes('credit') || message.includes('billing')) {
      return 'Billing issue. Please check your account at https://console.anthropic.com'
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Check your connection or try accessing anthropic.com.'
    }

    return 'An error occurred. Please check your API key and try again.'
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    return {
      model: this.config.defaultModel,
    }
  }
}

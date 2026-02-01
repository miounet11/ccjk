/**
 * Kimi (Moonshot AI) Provider
 * Moonshot AI's Kimi models
 */

import type {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ProviderSetup,
  ValidationResult,
} from '../core/provider-interface'

export class ProviderKimi implements IProvider {
  private config: ProviderConfig = {
    id: 'kimi',
    name: 'Kimi (Moonshot AI)',
    description: 'Moonshot AI Kimi - Long context Chinese language models',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    availableModels: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    requiresApiKey: true,
    icon: '🌙',
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
      suggestions.push('Get your API key from https://platform.moonshot.cn')
      return { valid: false, errors, suggestions }
    }

    // Kimi API keys start with 'sk-'
    if (!credentials.apiKey.startsWith('sk-')) {
      warnings.push('Kimi API keys typically start with "sk-"')
      suggestions.push('Please verify you copied the correct API key')
    }

    if (credentials.apiKey.length < 30) {
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
      // Test with a simple chat completion request
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
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
            'Check if your account is active and has credits',
            'Visit https://platform.moonshot.cn for support',
          ],
        }
      }

      return {
        valid: true,
        suggestions: ['Connection successful! Kimi is ready to use'],
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: [
          'Check your internet connection',
          'Verify you can access moonshot.cn',
          'Try again in a few moments',
        ],
      }
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Visit https://platform.moonshot.cn and sign up',
      '2. Navigate to API Keys in your dashboard',
      '3. Create a new API key',
      '4. Copy the API key (starts with "sk-")',
    ]
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Invalid API key. Please check your credentials at https://platform.moonshot.cn'
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Your account may need activation or additional permissions.'
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please wait before making more requests.'
    }

    if (message.includes('quota') || message.includes('balance') || message.includes('insufficient')) {
      return 'Insufficient credits. Please recharge your account at https://platform.moonshot.cn'
    }

    if (message.includes('model')) {
      return 'Model error. Please verify the model name or choose a different model.'
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Check your connection or try accessing moonshot.cn directly.'
    }

    return 'An error occurred. Please check your API key and try again.'
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    return {
      model: this.config.defaultModel,
    }
  }
}

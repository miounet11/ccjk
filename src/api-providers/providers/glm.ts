/**
 * GLM (智谱AI) Provider
 * Zhipu AI's GLM models
 */

import type {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ProviderSetup,
  ValidationResult,
} from '../core/provider-interface'

export class ProviderGLM implements IProvider {
  private config: ProviderConfig = {
    id: 'glm',
    name: 'GLM (智谱AI)',
    description: 'Zhipu AI GLM models - Chinese AI language models',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    availableModels: [
      'glm-4-plus',
      'glm-4-0520',
      'glm-4-air',
      'glm-4-airx',
      'glm-4-flash',
    ],
    requiresApiKey: true,
    icon: '🧠',
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
      suggestions.push('Get your API key from https://open.bigmodel.cn')
      return { valid: false, errors, suggestions }
    }

    // GLM API keys have specific format
    if (credentials.apiKey.length < 32) {
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
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          errors: [
            `Connection failed: ${response.status} - ${errorData.error?.message || response.statusText}`,
          ],
          suggestions: [
            'Verify your API key is correct',
            'Check if your account is active',
            'Visit https://open.bigmodel.cn for support',
          ],
        }
      }

      return {
        valid: true,
        suggestions: ['Connection successful! GLM is ready to use'],
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: [
          'Check your internet connection',
          'Verify you can access bigmodel.cn',
          'Try again in a few moments',
        ],
      }
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Visit https://open.bigmodel.cn and create an account',
      '2. Go to API Keys section in your console',
      '3. Generate a new API key',
      '4. Copy and paste the API key below',
    ]
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Invalid API key. Please verify your credentials at https://open.bigmodel.cn'
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Your account may need activation or additional permissions.'
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please wait before making more requests.'
    }

    if (message.includes('quota') || message.includes('balance')) {
      return 'Insufficient balance. Please recharge your account at https://open.bigmodel.cn'
    }

    if (message.includes('model not found')) {
      return 'The selected model is not available. Please choose a different model.'
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Check your connection or try accessing bigmodel.cn directly.'
    }

    return 'An error occurred. Please check your configuration and try again.'
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    return {
      model: this.config.defaultModel,
    }
  }
}

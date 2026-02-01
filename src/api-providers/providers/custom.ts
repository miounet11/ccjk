/**
 * Custom Provider
 * For custom OpenAI-compatible API endpoints
 */

import type {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ProviderSetup,
  ValidationResult,
} from '../core/provider-interface'

export class ProviderCustom implements IProvider {
  private config: ProviderConfig = {
    id: 'custom',
    name: 'Custom Provider',
    description: 'Configure a custom OpenAI-compatible API endpoint',
    baseUrl: '',
    defaultModel: 'gpt-3.5-turbo',
    availableModels: [],
    requiresApiKey: true,
    customFields: [
      {
        key: 'baseUrl',
        label: 'API Base URL',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com/v1',
        helpText: 'The base URL for your API endpoint',
      },
      {
        key: 'model',
        label: 'Model Name',
        type: 'text',
        required: true,
        placeholder: 'gpt-3.5-turbo',
        helpText: 'The model identifier to use',
      },
      {
        key: 'authType',
        label: 'Authentication Type',
        type: 'select',
        required: true,
        options: ['Bearer Token', 'API Key Header', 'Custom Header'],
        defaultValue: 'Bearer Token',
        helpText: 'How to authenticate with the API',
      },
      {
        key: 'customHeader',
        label: 'Custom Header Name (optional)',
        type: 'text',
        required: false,
        placeholder: 'X-API-Key',
        helpText: 'Only needed if using Custom Header auth',
      },
    ],
    icon: '⚙️',
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
      return { valid: false, errors }
    }

    if (!credentials.customFields?.baseUrl) {
      errors.push('API Base URL is required')
      suggestions.push('Enter the base URL for your API endpoint')
      return { valid: false, errors, suggestions }
    }

    if (!credentials.customFields?.model) {
      errors.push('Model name is required')
      suggestions.push('Enter the model identifier you want to use')
      return { valid: false, errors, suggestions }
    }

    // Validate URL format
    try {
      new URL(credentials.customFields.baseUrl)
    }
    catch {
      errors.push('Invalid URL format')
      suggestions.push('URL should start with http:// or https://')
      return { valid: false, errors, suggestions }
    }

    // Check if URL ends with /v1 or similar
    if (!credentials.customFields.baseUrl.match(/\/v\d+$/)) {
      warnings.push('API URL typically ends with /v1 or similar version path')
    }

    const authType = credentials.customFields?.authType || 'Bearer Token'
    if (authType === 'Custom Header' && !credentials.customFields?.customHeader) {
      errors.push('Custom header name is required when using Custom Header auth')
      return { valid: false, errors, suggestions }
    }

    return { valid: true, warnings, suggestions }
  }

  async testConnection(credentials: ProviderCredentials): Promise<ValidationResult> {
    const validation = await this.validateCredentials(credentials)
    if (!validation.valid) {
      return validation
    }

    try {
      const baseUrl = credentials.customFields!.baseUrl
      const model = credentials.customFields!.model
      const authType = credentials.customFields?.authType || 'Bearer Token'
      const customHeader = credentials.customFields?.customHeader

      // Build headers based on auth type
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (authType === 'Bearer Token') {
        headers.Authorization = `Bearer ${credentials.apiKey}`
      }
      else if (authType === 'API Key Header') {
        headers['X-API-Key'] = credentials.apiKey!
      }
      else if (authType === 'Custom Header' && customHeader) {
        headers[customHeader] = credentials.apiKey!
      }

      // Test with a simple chat completion request
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
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
            'Verify your API URL is correct',
            'Check if your API key is valid',
            'Ensure the model name is correct',
            'Verify the authentication type matches your API',
          ],
        }
      }

      return {
        valid: true,
        suggestions: ['Connection successful! Your custom provider is ready to use'],
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: [
          'Check your internet connection',
          'Verify the API URL is accessible',
          'Check if the endpoint requires special network access',
          'Try again in a few moments',
        ],
      }
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Obtain API credentials from your provider',
      '2. Find the base API URL (usually ends with /v1)',
      '3. Identify the model name you want to use',
      '4. Choose the correct authentication method',
      '5. Fill in all required fields below',
    ]
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication failed. Check your API key and authentication type.'
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Verify your API key has the necessary permissions.'
    }

    if (message.includes('not found') || message.includes('404')) {
      return 'Endpoint not found. Check if your base URL is correct.'
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please wait before making more requests.'
    }

    if (message.includes('model')) {
      return 'Model error. Verify the model name is correct for your provider.'
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return 'Network error. Check your connection and verify the API is accessible.'
    }

    return 'An error occurred. Please verify all configuration fields and try again.'
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    // Cannot auto-fill for custom providers
    return {}
  }
}

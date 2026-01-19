/**
 * 302.AI Provider
 * Popular Chinese AI service provider
 */

import {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ValidationResult,
  ProviderSetup,
} from '../core/provider-interface';

export class Provider302AI implements IProvider {
  private config: ProviderConfig = {
    id: '302ai',
    name: '302.AI',
    description: '302.AI - Easy-to-use AI service platform with multiple models',
    baseUrl: 'https://api.302.ai/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-opus-4-5-20251101',
      'gpt-4o',
      'gpt-4o-mini',
    ],
    requiresApiKey: true,
    icon: '🤖',
  };

  getConfig(): ProviderConfig {
    return this.config;
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check API key format
    if (!credentials.apiKey) {
      errors.push('API Key is required');
      suggestions.push('Get your API key from https://302.ai');
      return { valid: false, errors, suggestions };
    }

    if (!credentials.apiKey.startsWith('sk-')) {
      warnings.push('API key should start with "sk-"');
      suggestions.push('Please verify your API key format');
    }

    if (credentials.apiKey.length < 20) {
      errors.push('API key appears to be too short');
      suggestions.push('Please check if you copied the complete API key');
      return { valid: false, errors, warnings, suggestions };
    }

    return { valid: true, warnings, suggestions };
  }

  async testConnection(credentials: ProviderCredentials): Promise<ValidationResult> {
    // First validate credentials
    const validation = await this.validateCredentials(credentials);
    if (!validation.valid) {
      return validation;
    }

    try {
      // Test API connection with a simple request
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          valid: false,
          errors: [`Connection failed: ${response.status} ${response.statusText}`],
          suggestions: [
            'Check if your API key is valid',
            'Verify your account has sufficient credits',
            'Visit https://302.ai for support',
          ],
        };
      }

      return {
        valid: true,
        suggestions: ['Connection successful! You can now use 302.AI'],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: [
          'Check your internet connection',
          'Verify the API endpoint is accessible',
          'Try again in a few moments',
        ],
      };
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Visit https://302.ai and sign up for an account',
      '2. Navigate to API Keys section in your dashboard',
      '3. Create a new API key or copy your existing key',
      '4. Paste the API key below (starts with "sk-")',
    ];
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Your API key is invalid. Please check and try again.';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Your account may not have permission to use this model.';
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }

    if (message.includes('insufficient') || message.includes('quota')) {
      return 'Insufficient credits. Please top up your account at https://302.ai';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection.';
    }

    return 'An unexpected error occurred. Please check your configuration and try again.';
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    // 302.AI uses standard format, return default model
    return {
      model: this.config.defaultModel,
    };
  }
}

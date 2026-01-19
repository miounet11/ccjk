/**
 * MiniMax Provider
 * MiniMax AI models
 */

import {
  IProvider,
  ProviderConfig,
  ProviderCredentials,
  ValidationResult,
  ProviderSetup,
} from '../core/provider-interface';

export class ProviderMiniMax implements IProvider {
  private config: ProviderConfig = {
    id: 'minimax',
    name: 'MiniMax',
    description: 'MiniMax AI - Advanced Chinese language models',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'abab6.5-chat',
    availableModels: [
      'abab6.5-chat',
      'abab6.5s-chat',
      'abab5.5-chat',
      'abab5.5s-chat',
    ],
    requiresApiKey: true,
    customFields: [
      {
        key: 'groupId',
        label: 'Group ID',
        type: 'text',
        required: true,
        placeholder: 'Your MiniMax Group ID',
        helpText: 'Find this in your MiniMax console',
      },
    ],
    icon: '⚡',
  };

  getConfig(): ProviderConfig {
    return this.config;
  }

  async validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!credentials.apiKey) {
      errors.push('API Key is required');
      suggestions.push('Get your API key from https://www.minimaxi.com');
      return { valid: false, errors, suggestions };
    }

    if (!credentials.customFields?.groupId) {
      errors.push('Group ID is required');
      suggestions.push('Find your Group ID in the MiniMax console');
      return { valid: false, errors, suggestions };
    }

    if (credentials.apiKey.length < 20) {
      warnings.push('API key seems shorter than expected');
    }

    return { valid: true, warnings, suggestions };
  }

  async testConnection(credentials: ProviderCredentials): Promise<ValidationResult> {
    const validation = await this.validateCredentials(credentials);
    if (!validation.valid) {
      return validation;
    }

    try {
      const groupId = credentials.customFields?.groupId;
      const response = await fetch(
        `${this.config.baseUrl}/text/chatcompletion_v2?GroupId=${groupId}`,
        {
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          errors: [
            `Connection failed: ${response.status} - ${errorData.base_resp?.status_msg || response.statusText}`,
          ],
          suggestions: [
            'Verify both API Key and Group ID are correct',
            'Check if your account is active',
            'Visit https://www.minimaxi.com for support',
          ],
        };
      }

      return {
        valid: true,
        suggestions: ['Connection successful! MiniMax is ready to use'],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Network error: ${(error as Error).message}`],
        suggestions: [
          'Check your internet connection',
          'Verify you can access minimaxi.com',
          'Try again in a few moments',
        ],
      };
    }
  }

  getSetupInstructions(): string[] {
    return [
      '1. Visit https://www.minimaxi.com and create an account',
      '2. Go to your console and find API Keys section',
      '3. Copy your API Key and Group ID',
      '4. Paste both values below',
    ];
  }

  getErrorHelp(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Invalid API key or Group ID. Please verify your credentials.';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. Check if your account has the necessary permissions.';
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please wait before making more requests.';
    }

    if (message.includes('quota') || message.includes('balance')) {
      return 'Insufficient balance. Please recharge at https://www.minimaxi.com';
    }

    if (message.includes('group')) {
      return 'Group ID error. Please verify your Group ID in the MiniMax console.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Check your connection or try accessing minimaxi.com.';
    }

    return 'An error occurred. Please verify your API Key and Group ID.';
  }

  autoFillFromApiKey(apiKey: string): Partial<ProviderSetup> {
    return {
      model: this.config.defaultModel,
    };
  }
}

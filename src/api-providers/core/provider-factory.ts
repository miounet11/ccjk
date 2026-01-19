/**
 * Provider Factory
 * Creates and configures provider instances
 */

import { IProvider, ProviderSetup, ProviderCredentials } from './provider-interface';
import { providerRegistry } from './provider-registry';

export class ProviderFactory {
  /**
   * Create a provider setup from minimal input
   */
  static async createSetup(
    providerId: string,
    apiKey: string,
    customFields?: Record<string, string>
  ): Promise<ProviderSetup> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const config = provider.getConfig();
    const credentials: ProviderCredentials = {
      apiKey,
      customFields,
    };

    // Auto-fill if provider supports it
    let autoFilled: Partial<ProviderSetup> = {};
    if (provider.autoFillFromApiKey) {
      autoFilled = provider.autoFillFromApiKey(apiKey);
    }

    return {
      provider: config,
      credentials,
      model: autoFilled.model || config.defaultModel,
    };
  }

  /**
   * Validate a provider setup
   */
  static async validateSetup(setup: ProviderSetup): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const provider = providerRegistry.getProvider(setup.provider.id);
    if (!provider) {
      return {
        valid: false,
        errors: [`Provider not found: ${setup.provider.id}`],
        warnings: [],
      };
    }

    const result = await provider.validateCredentials(setup.credentials);
    return {
      valid: result.valid,
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
  }

  /**
   * Test provider connection
   */
  static async testConnection(
    providerId: string,
    credentials: ProviderCredentials
  ): Promise<{
    success: boolean;
    message: string;
    suggestions?: string[];
  }> {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return {
        success: false,
        message: `Provider not found: ${providerId}`,
      };
    }

    try {
      const result = await provider.testConnection(credentials);
      return {
        success: result.valid,
        message: result.valid
          ? 'Connection successful!'
          : result.errors?.join(', ') || 'Connection failed',
        suggestions: result.suggestions,
      };
    } catch (error) {
      const errorHelp = provider.getErrorHelp(error as Error);
      return {
        success: false,
        message: (error as Error).message,
        suggestions: [errorHelp],
      };
    }
  }

  /**
   * Get quick setup template for a provider
   */
  static getQuickSetupTemplate(providerId: string): {
    provider: string;
    steps: string[];
    fields: Array<{ name: string; label: string; type: string; required: boolean }>;
  } | null {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      return null;
    }

    const config = provider.getConfig();
    const fields: Array<{ name: string; label: string; type: string; required: boolean }> = [];

    if (config.requiresApiKey) {
      fields.push({
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
      });
    }

    if (config.customFields) {
      config.customFields.forEach(field => {
        fields.push({
          name: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
        });
      });
    }

    return {
      provider: config.name,
      steps: provider.getSetupInstructions(),
      fields,
    };
  }

  /**
   * Clone setup with different credentials
   */
  static cloneSetup(
    original: ProviderSetup,
    newCredentials: Partial<ProviderCredentials>
  ): ProviderSetup {
    return {
      ...original,
      credentials: {
        ...original.credentials,
        ...newCredentials,
      },
    };
  }

  /**
   * Export setup to JSON
   */
  static exportSetup(setup: ProviderSetup, includeCredentials = false): string {
    const exportData = {
      providerId: setup.provider.id,
      providerName: setup.provider.name,
      model: setup.model,
      ...(includeCredentials && { credentials: setup.credentials }),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import setup from JSON
   */
  static async importSetup(json: string): Promise<ProviderSetup> {
    const data = JSON.parse(json);
    const provider = providerRegistry.getProvider(data.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${data.providerId}`);
    }

    return {
      provider: provider.getConfig(),
      credentials: data.credentials || {},
      model: data.model,
    };
  }
}

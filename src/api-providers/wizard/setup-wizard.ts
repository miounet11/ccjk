/**
 * Setup Wizard
 * Simplifies API configuration to just 2 steps
 */

import { IProvider, ProviderSetup, ProviderCredentials } from '../core/provider-interface';
import { providerRegistry } from '../core/provider-registry';
import { ProviderFactory } from '../core/provider-factory';

export interface WizardStep {
  step: number;
  title: string;
  description: string;
  fields: WizardField[];
}

export interface WizardField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'number';
  required: boolean;
  options?: Array<{ value: string; label: string; description?: string }>;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
}

export interface WizardState {
  currentStep: number;
  providerId?: string;
  credentials: ProviderCredentials;
  model?: string;
  errors: string[];
  warnings: string[];
}

export class SetupWizard {
  private state: WizardState = {
    currentStep: 1,
    credentials: {},
    errors: [],
    warnings: [],
  };

  /**
   * Get Step 1: Provider Selection
   */
  getStep1(): WizardStep {
    const providers = providerRegistry.getAllMetadata();
    const popularProviders = providers.filter(p => p.popular);
    const otherProviders = providers.filter(p => !p.popular);

    const options = [
      ...popularProviders.map(p => ({
        value: p.id,
        label: `${p.icon || ''} ${p.name}`,
        description: `${p.description} (Setup: ${p.setupTime})`,
      })),
      { value: '---', label: '--- Other Providers ---', description: '' },
      ...otherProviders.map(p => ({
        value: p.id,
        label: `${p.icon || ''} ${p.name}`,
        description: `${p.description} (Setup: ${p.setupTime})`,
      })),
    ];

    return {
      step: 1,
      title: 'Choose Your AI Provider',
      description: 'Select the AI service you want to use. Popular providers are listed first.',
      fields: [
        {
          name: 'provider',
          label: 'AI Provider',
          type: 'select',
          required: true,
          options,
          helpText: 'Choose based on your preference and region. All providers support Claude-like models.',
        },
      ],
    };
  }

  /**
   * Get Step 2: API Configuration
   */
  getStep2(providerId: string): WizardStep {
    const provider = providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const config = provider.getConfig();
    const fields: WizardField[] = [];

    // Add API Key field if required
    if (config.requiresApiKey) {
      fields.push({
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Paste your API key here',
        helpText: provider.getSetupInstructions().join(' → '),
      });
    }

    // Add custom fields
    if (config.customFields) {
      config.customFields.forEach(field => {
        const wizardField: WizardField = {
          name: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder: field.placeholder,
          helpText: field.helpText,
          defaultValue: field.defaultValue,
        };

        if (field.type === 'select' && field.options) {
          wizardField.options = field.options.map(opt => ({
            value: opt,
            label: opt,
          }));
        }

        fields.push(wizardField);
      });
    }

    // Add model selection (optional, with default)
    if (config.availableModels.length > 0) {
      fields.push({
        name: 'model',
        label: 'Model (Optional)',
        type: 'select',
        required: false,
        options: config.availableModels.map(model => ({
          value: model,
          label: model,
        })),
        defaultValue: config.defaultModel,
        helpText: `Default: ${config.defaultModel}. You can change this later.`,
      });
    }

    return {
      step: 2,
      title: 'Enter Your API Key',
      description: `Just paste your ${config.name} API key and you're done!`,
      fields,
    };
  }

  /**
   * Set provider selection (Step 1)
   */
  setProvider(providerId: string): void {
    if (!providerRegistry.hasProvider(providerId)) {
      this.state.errors.push(`Provider not found: ${providerId}`);
      return;
    }

    this.state.providerId = providerId;
    this.state.currentStep = 2;
    this.state.errors = [];
    this.state.warnings = [];
  }

  /**
   * Set credentials (Step 2)
   */
  async setCredentials(data: Record<string, string>): Promise<void> {
    if (!this.state.providerId) {
      this.state.errors.push('Please select a provider first');
      return;
    }

    const provider = providerRegistry.getProvider(this.state.providerId);
    if (!provider) {
      this.state.errors.push('Provider not found');
      return;
    }

    // Extract API key and custom fields
    const { apiKey, model, ...customFields } = data;

    this.state.credentials = {
      apiKey,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    if (model) {
      this.state.model = model;
    }

    // Validate credentials
    const validation = await provider.validateCredentials(this.state.credentials);
    this.state.errors = validation.errors || [];
    this.state.warnings = validation.warnings || [];
  }

  /**
   * Complete setup and return configuration
   */
  async complete(): Promise<ProviderSetup> {
    if (!this.state.providerId) {
      throw new Error('Provider not selected');
    }

    if (this.state.errors.length > 0) {
      throw new Error(`Configuration errors: ${this.state.errors.join(', ')}`);
    }

    const setup = await ProviderFactory.createSetup(
      this.state.providerId,
      this.state.credentials.apiKey!,
      this.state.credentials.customFields
    );

    if (this.state.model) {
      setup.model = this.state.model;
    }

    return setup;
  }

  /**
   * Test connection before completing
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    suggestions?: string[];
  }> {
    if (!this.state.providerId) {
      return {
        success: false,
        message: 'Provider not selected',
      };
    }

    return ProviderFactory.testConnection(this.state.providerId, this.state.credentials);
  }

  /**
   * Get current state
   */
  getState(): WizardState {
    return { ...this.state };
  }

  /**
   * Reset wizard
   */
  reset(): void {
    this.state = {
      currentStep: 1,
      credentials: {},
      errors: [],
      warnings: [],
    };
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    return (this.state.currentStep / 2) * 100;
  }

  /**
   * Quick setup with provider ID and API key only
   */
  async quickSetup(providerId: string, apiKey: string): Promise<ProviderSetup> {
    this.reset();
    this.setProvider(providerId);
    await this.setCredentials({ apiKey });

    if (this.state.errors.length > 0) {
      throw new Error(this.state.errors.join(', '));
    }

    return this.complete();
  }
}

/**
 * Create a new wizard instance
 */
export function createWizard(): SetupWizard {
  return new SetupWizard();
}

/**
 * Auto-Configuration System
 * Automatically configures CCJK based on URL parameters or environment detection
 */

import { ProviderSetup, ProviderCredentials } from '../../api-providers/core/provider-interface';
import { providerRegistry } from '../../api-providers/core/provider-registry';
import { ProviderFactory } from '../../api-providers/core/provider-factory';
import { OneClickSetupConfig } from '../types';

export interface AutoConfigResult {
  success: boolean;
  setup?: ProviderSetup;
  source: 'url' | 'env' | 'file' | 'detection';
  confidence: number;
  suggestions?: string[];
  error?: string;
}

export interface AutoConfigOptions {
  preferredProvider?: string;
  fallbackProvider?: string;
  validateCredentials?: boolean;
  autoDetectEnvironment?: boolean;
}

export class AutoConfiguration {
  /**
   * Auto-configure from URL parameters
   */
  async configureFromUrl(url: string, options?: AutoConfigOptions): Promise<AutoConfigResult> {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      const config: OneClickSetupConfig = {
        provider: params.get('provider') || options?.preferredProvider || '',
        apiKey: params.get('key') || params.get('apiKey') || undefined,
        model: params.get('model') || undefined,
        referralSource: params.get('ref') || undefined,
      };

      if (!config.provider) {
        return {
          success: false,
          source: 'url',
          confidence: 0,
          error: 'No provider specified in URL',
          suggestions: ['Add ?provider=PROVIDER_ID to the URL'],
        };
      }

      if (!providerRegistry.hasProvider(config.provider)) {
        return {
          success: false,
          source: 'url',
          confidence: 0,
          error: `Provider not found: ${config.provider}`,
          suggestions: this.getSuggestedProviders(config.provider),
        };
      }

      const credentials: ProviderCredentials = {
        apiKey: config.apiKey,
      };

      // Validate if requested
      if (options?.validateCredentials && config.apiKey) {
        const provider = providerRegistry.getProvider(config.provider);
        if (provider) {
          const validation = await provider.validateCredentials(credentials);
          if (!validation.valid) {
            return {
              success: false,
              source: 'url',
              confidence: 0.5,
              error: validation.errors?.join(', '),
              suggestions: validation.suggestions,
            };
          }
        }
      }

      const setup = await ProviderFactory.createSetup(
        config.provider,
        config.apiKey || '',
        undefined
      );

      if (config.model) {
        setup.model = config.model;
      }

      return {
        success: true,
        setup,
        source: 'url',
        confidence: config.apiKey ? 1.0 : 0.7,
      };
    } catch (error) {
      return {
        success: false,
        source: 'url',
        confidence: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Auto-configure from environment variables
   */
  async configureFromEnvironment(options?: AutoConfigOptions): Promise<AutoConfigResult> {
    try {
      // Check for CCJK-specific env vars
      const provider = process.env.CCJK_PROVIDER || options?.preferredProvider;
      const apiKey = process.env.CCJK_API_KEY || this.detectApiKeyFromEnv();
      const model = process.env.CCJK_MODEL;

      if (!provider) {
        // Try to detect provider from API key format
        const detected = this.detectProviderFromApiKey(apiKey || '');
        if (detected) {
          return this.createSetupFromDetection(detected, apiKey || '', model, options);
        }

        return {
          success: false,
          source: 'env',
          confidence: 0,
          error: 'No provider configuration found in environment',
          suggestions: [
            'Set CCJK_PROVIDER environment variable',
            'Set CCJK_API_KEY environment variable',
            'Or use provider-specific env vars (e.g., ANTHROPIC_API_KEY)',
          ],
        };
      }

      if (!providerRegistry.hasProvider(provider)) {
        return {
          success: false,
          source: 'env',
          confidence: 0,
          error: `Provider not found: ${provider}`,
          suggestions: this.getSuggestedProviders(provider),
        };
      }

      const setup = await ProviderFactory.createSetup(provider, apiKey || '', undefined);
      if (model) {
        setup.model = model;
      }

      return {
        success: true,
        setup,
        source: 'env',
        confidence: apiKey ? 1.0 : 0.5,
      };
    } catch (error) {
      return {
        success: false,
        source: 'env',
        confidence: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Auto-configure from config file
   */
  async configureFromFile(filePath: string): Promise<AutoConfigResult> {
    try {
      // Try to read config file
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content);

      if (!config.provider) {
        return {
          success: false,
          source: 'file',
          confidence: 0,
          error: 'No provider specified in config file',
        };
      }

      const setup = await ProviderFactory.createSetup(
        config.provider,
        config.apiKey || '',
        config.customFields
      );

      if (config.model) {
        setup.model = config.model;
      }

      return {
        success: true,
        setup,
        source: 'file',
        confidence: 1.0,
      };
    } catch (error) {
      return {
        success: false,
        source: 'file',
        confidence: 0,
        error: (error as Error).message,
        suggestions: [
          'Ensure config file exists and is valid JSON',
          'Check file permissions',
        ],
      };
    }
  }

  /**
   * Smart auto-configuration with multiple fallbacks
   */
  async autoConfigureSmart(options?: AutoConfigOptions): Promise<AutoConfigResult> {
    // Try URL first (if in browser context)
    if (typeof window !== 'undefined' && window.location) {
      const urlResult = await this.configureFromUrl(window.location.href, options);
      if (urlResult.success) {
        return urlResult;
      }
    }

    // Try environment variables
    const envResult = await this.configureFromEnvironment(options);
    if (envResult.success) {
      return envResult;
    }

    // Try config file
    const configPaths = [
      '.ccjk.json',
      'ccjk.config.json',
      '.config/ccjk.json',
    ];

    for (const path of configPaths) {
      try {
        const fileResult = await this.configureFromFile(path);
        if (fileResult.success) {
          return fileResult;
        }
      } catch {
        // Continue to next path
      }
    }

    // Try fallback provider
    if (options?.fallbackProvider) {
      try {
        const setup = await ProviderFactory.createSetup(options.fallbackProvider, '', undefined);
        return {
          success: true,
          setup,
          source: 'detection',
          confidence: 0.3,
          suggestions: ['Using fallback provider. Please configure API key.'],
        };
      } catch {
        // Continue
      }
    }

    return {
      success: false,
      source: 'detection',
      confidence: 0,
      error: 'Could not auto-configure CCJK',
      suggestions: [
        'Provide configuration via URL parameters',
        'Set environment variables (CCJK_PROVIDER, CCJK_API_KEY)',
        'Create a .ccjk.json config file',
        'Manually configure using the setup wizard',
      ],
    };
  }

  /**
   * Detect API key from common environment variables
   */
  private detectApiKeyFromEnv(): string | undefined {
    const envVars = [
      'CCJK_API_KEY',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'AI_API_KEY',
      'API_KEY',
    ];

    for (const varName of envVars) {
      const value = process.env[varName];
      if (value) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Detect provider from API key format
   */
  private detectProviderFromApiKey(apiKey: string): string | null {
    if (!apiKey) return null;

    // 302.AI keys typically start with sk-
    if (apiKey.startsWith('sk-') && apiKey.includes('302')) {
      return '302ai';
    }

    // Anthropic keys
    if (apiKey.startsWith('sk-ant-')) {
      return 'anthropic';
    }

    // OpenAI keys
    if (apiKey.startsWith('sk-') && !apiKey.includes('302')) {
      return 'custom'; // Could be OpenAI-compatible
    }

    // GLM keys
    if (apiKey.includes('glm') || apiKey.includes('zhipu')) {
      return 'glm';
    }

    // Kimi keys
    if (apiKey.includes('kimi') || apiKey.includes('moonshot')) {
      return 'kimi';
    }

    return null;
  }

  /**
   * Create setup from detection
   */
  private async createSetupFromDetection(
    provider: string,
    apiKey: string,
    model: string | undefined,
    options?: AutoConfigOptions
  ): Promise<AutoConfigResult> {
    try {
      const setup = await ProviderFactory.createSetup(provider, apiKey, undefined);
      if (model) {
        setup.model = model;
      }

      return {
        success: true,
        setup,
        source: 'detection',
        confidence: 0.8,
        suggestions: [`Detected ${provider} from API key format`],
      };
    } catch (error) {
      return {
        success: false,
        source: 'detection',
        confidence: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get suggested providers based on input
   */
  private getSuggestedProviders(input: string): string[] {
    const allProviders = providerRegistry.getAllMetadata();
    const suggestions: string[] = [];

    // Fuzzy match
    for (const provider of allProviders) {
      if (
        provider.id.includes(input.toLowerCase()) ||
        provider.name.toLowerCase().includes(input.toLowerCase())
      ) {
        suggestions.push(`Try '${provider.id}' (${provider.name})`);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Available providers: ' + allProviders.map(p => p.id).join(', '));
    }

    return suggestions;
  }

  /**
   * Generate auto-config snippet for documentation
   */
  generateAutoConfigSnippet(providerId: string): string {
    return `
# Auto-Configuration for ${providerId}

## Method 1: URL Parameters (Recommended)
\`\`\`
https://your-app.com?provider=${providerId}&key=YOUR_API_KEY
\`\`\`

## Method 2: Environment Variables
\`\`\`bash
export CCJK_PROVIDER="${providerId}"
export CCJK_API_KEY="your-api-key"
\`\`\`

## Method 3: Config File
Create \`.ccjk.json\`:
\`\`\`json
{
  "provider": "${providerId}",
  "apiKey": "your-api-key",
  "model": "claude-3-5-sonnet-20241022"
}
\`\`\`

## Method 4: Programmatic
\`\`\`typescript
import { AutoConfiguration } from 'ccjk/supplier-ecosystem';

const autoConfig = new AutoConfiguration();
const result = await autoConfig.autoConfigureSmart({
  preferredProvider: '${providerId}',
  validateCredentials: true,
});

if (result.success) {
  console.log('✅ Auto-configured successfully!');
  // Use result.setup
}
\`\`\`
    `.trim();
  }
}

/**
 * Create an auto-configuration instance
 */
export function createAutoConfiguration(): AutoConfiguration {
  return new AutoConfiguration();
}

/**
 * Quick helper for smart auto-configuration
 */
export async function autoConfigureSmart(options?: AutoConfigOptions): Promise<AutoConfigResult> {
  const autoConfig = createAutoConfiguration();
  return autoConfig.autoConfigureSmart(options);
}

/**
 * One-Click Setup System
 * Enables users to configure CCJK with a single click from supplier websites
 */

import { ProviderSetup, ProviderCredentials } from '../../api-providers/core/provider-interface';
import { ProviderFactory } from '../../api-providers/core/provider-factory';
import { providerRegistry } from '../../api-providers/core/provider-registry';
import { OneClickSetupConfig, SetupSuccessResponse, ReferralTracking } from '../types';
import { ReferralTracker } from '../partnership/referral-tracking';

export interface OneClickSetupResult {
  success: boolean;
  setup?: ProviderSetup;
  error?: string;
  warnings?: string[];
  setupTime: number;
  referralId?: string;
}

export class OneClickSetup {
  private referralTracker: ReferralTracker;

  constructor() {
    this.referralTracker = new ReferralTracker();
  }

  /**
   * Parse URL parameters for one-click setup
   * Supports both ccjk:// protocol and https:// web links
   */
  parseSetupUrl(url: string): OneClickSetupConfig | null {
    try {
      let urlObj: URL;

      // Handle custom protocol (ccjk://setup?...)
      if (url.startsWith('ccjk://')) {
        const httpUrl = url.replace('ccjk://', 'https://ccjk.dev/');
        urlObj = new URL(httpUrl);
      } else {
        urlObj = new URL(url);
      }

      const params = urlObj.searchParams;

      const config: OneClickSetupConfig = {
        provider: params.get('provider') || '',
        apiKey: params.get('key') || params.get('apiKey') || undefined,
        model: params.get('model') || undefined,
        referralSource: params.get('ref') || params.get('source') || undefined,
        referralCode: params.get('refCode') || undefined,
        autoComplete: params.get('auto') === 'true',
        skipValidation: params.get('skipValidation') === 'true',
      };

      // Parse custom fields (any param starting with 'field_')
      const customFields: Record<string, string> = {};
      params.forEach((value, key) => {
        if (key.startsWith('field_')) {
          const fieldName = key.replace('field_', '');
          customFields[fieldName] = value;
        }
      });

      if (Object.keys(customFields).length > 0) {
        config.customFields = customFields;
      }

      // Validate required fields
      if (!config.provider) {
        return null;
      }

      return config;
    } catch (error) {
      console.error('Failed to parse setup URL:', error);
      return null;
    }
  }

  /**
   * Generate one-click setup URL for suppliers
   */
  generateSetupUrl(config: OneClickSetupConfig, protocol: 'ccjk' | 'https' = 'https'): string {
    const baseUrl = protocol === 'ccjk' ? 'ccjk://setup' : 'https://ccjk.dev/setup';
    const params = new URLSearchParams();

    params.set('provider', config.provider);
    if (config.apiKey) params.set('key', config.apiKey);
    if (config.model) params.set('model', config.model);
    if (config.referralSource) params.set('ref', config.referralSource);
    if (config.referralCode) params.set('refCode', config.referralCode);
    if (config.autoComplete) params.set('auto', 'true');
    if (config.skipValidation) params.set('skipValidation', 'true');

    // Add custom fields
    if (config.customFields) {
      Object.entries(config.customFields).forEach(([key, value]) => {
        params.set(`field_${key}`, value);
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Execute one-click setup
   */
  async executeSetup(config: OneClickSetupConfig): Promise<OneClickSetupResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate provider exists
      if (!providerRegistry.hasProvider(config.provider)) {
        return {
          success: false,
          error: `Provider not found: ${config.provider}`,
          setupTime: Date.now() - startTime,
        };
      }

      // Track referral if present
      let referralId: string | undefined;
      if (config.referralSource) {
        referralId = await this.referralTracker.trackReferral({
          supplierId: config.provider,
          source: config.referralSource,
          referralCode: config.referralCode,
        });
      }

      // Prepare credentials
      const credentials: ProviderCredentials = {
        apiKey: config.apiKey,
        customFields: config.customFields,
      };

      // Validate credentials unless skipped
      if (!config.skipValidation && config.apiKey) {
        const provider = providerRegistry.getProvider(config.provider);
        if (provider) {
          const validation = await provider.validateCredentials(credentials);
          if (!validation.valid) {
            return {
              success: false,
              error: validation.errors?.join(', ') || 'Validation failed',
              warnings: validation.warnings,
              setupTime: Date.now() - startTime,
              referralId,
            };
          }
          if (validation.warnings) {
            warnings.push(...validation.warnings);
          }
        }
      }

      // Create setup
      const setup = await ProviderFactory.createSetup(
        config.provider,
        config.apiKey || '',
        config.customFields
      );

      // Apply model if specified
      if (config.model) {
        setup.model = config.model;
      }

      // Mark referral as converted
      if (referralId) {
        await this.referralTracker.markConverted(referralId);
      }

      const setupTime = Date.now() - startTime;

      return {
        success: true,
        setup,
        warnings: warnings.length > 0 ? warnings : undefined,
        setupTime,
        referralId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        warnings,
        setupTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Quick setup from URL
   */
  async setupFromUrl(url: string): Promise<OneClickSetupResult> {
    const config = this.parseSetupUrl(url);
    if (!config) {
      return {
        success: false,
        error: 'Invalid setup URL',
        setupTime: 0,
      };
    }

    return this.executeSetup(config);
  }

  /**
   * Generate setup button HTML for suppliers
   */
  generateSetupButton(config: OneClickSetupConfig, options?: {
    buttonText?: string;
    buttonStyle?: string;
    openInNewTab?: boolean;
  }): string {
    const url = this.generateSetupUrl(config, 'https');
    const buttonText = options?.buttonText || `Setup CCJK with ${config.provider}`;
    const target = options?.openInNewTab ? '_blank' : '_self';
    const style = options?.buttonStyle || `
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `.replace(/\s+/g, ' ').trim();

    return `
<a href="${url}"
   target="${target}"
   style="${style}"
   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0, 0, 0, 0.15)';"
   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)';">
  ${buttonText}
</a>
    `.trim();
  }

  /**
   * Generate setup widget for embedding
   */
  generateSetupWidget(config: OneClickSetupConfig): string {
    const url = this.generateSetupUrl(config, 'https');
    const provider = providerRegistry.getProvider(config.provider);
    const providerName = provider?.getConfig().name || config.provider;

    return `
<div class="ccjk-setup-widget" style="
  max-width: 400px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
  <div style="text-align: center; margin-bottom: 20px;">
    <h3 style="margin: 0 0 8px 0; font-size: 24px; color: #1a202c;">
      Quick Setup with CCJK
    </h3>
    <p style="margin: 0; color: #718096; font-size: 14px;">
      Get started with ${providerName} in under 30 seconds
    </p>
  </div>

  <div style="margin-bottom: 20px;">
    <div style="display: flex; align-items: center; margin-bottom: 12px;">
      <span style="
        display: inline-block;
        width: 24px;
        height: 24px;
        background: #48bb78;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 24px;
        margin-right: 12px;
        font-size: 14px;
      ">✓</span>
      <span style="color: #4a5568; font-size: 14px;">One-click configuration</span>
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 12px;">
      <span style="
        display: inline-block;
        width: 24px;
        height: 24px;
        background: #48bb78;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 24px;
        margin-right: 12px;
        font-size: 14px;
      ">✓</span>
      <span style="color: #4a5568; font-size: 14px;">Automatic validation</span>
    </div>
    <div style="display: flex; align-items: center;">
      <span style="
        display: inline-block;
        width: 24px;
        height: 24px;
        background: #48bb78;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 24px;
        margin-right: 12px;
        font-size: 14px;
      ">✓</span>
      <span style="color: #4a5568; font-size: 14px;">Ready to use immediately</span>
    </div>
  </div>

  <a href="${url}" style="
    display: block;
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0, 0, 0, 0.15)';"
     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)';">
    Setup Now →
  </a>

  <p style="
    margin: 16px 0 0 0;
    text-align: center;
    color: #a0aec0;
    font-size: 12px;
  ">
    Powered by CCJK
  </p>
</div>
    `.trim();
  }

  /**
   * Create success response with celebration
   */
  createSuccessResponse(setup: ProviderSetup, setupTime: number): SetupSuccessResponse {
    const providerName = setup.provider.name;

    return {
      success: true,
      setup,
      message: `🎉 Success! ${providerName} is now configured and ready to use.`,
      nextSteps: [
        'Start using CCJK with your favorite AI tools',
        'Explore available models and features',
        'Check out quick-start templates below',
      ],
      quickStartTemplates: [
        {
          name: 'Basic Chat',
          description: 'Simple chat completion example',
          code: `import { CCJK } from 'ccjk';

const ccjk = new CCJK({
  provider: '${setup.provider.id}',
  apiKey: process.env.API_KEY,
});

const response = await ccjk.chat.completions.create({
  model: '${setup.model || setup.provider.defaultModel}',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);`,
        },
        {
          name: 'Streaming Response',
          description: 'Stream responses in real-time',
          code: `const stream = await ccjk.chat.completions.create({
  model: '${setup.model || setup.provider.defaultModel}',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,
        },
      ],
      celebrationAnimation: setupTime < 10000 ? '🚀 Lightning fast setup!' : '✨ Setup complete!',
    };
  }
}

/**
 * Create a one-click setup instance
 */
export function createOneClickSetup(): OneClickSetup {
  return new OneClickSetup();
}

/**
 * Quick helper for URL-based setup
 */
export async function setupFromUrl(url: string): Promise<OneClickSetupResult> {
  const setup = createOneClickSetup();
  return setup.setupFromUrl(url);
}

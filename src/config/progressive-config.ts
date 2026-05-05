import type { SmartDefaults } from './smart-defaults';

export interface ProgressiveConfigOptions {
  skipInteractive?: boolean;
  verbose?: boolean;
}

/**
 * Progressive configuration manager
 * Handles gradual configuration with smart defaults
 */
export class ProgressiveConfig {
  private defaults: SmartDefaults;
  private options: ProgressiveConfigOptions;

  constructor(defaults: SmartDefaults, options: ProgressiveConfigOptions = {}) {
    this.defaults = defaults;
    this.options = options;
  }

  /**
   * Check if API key prompt is needed
   */
  needsApiKeyPrompt(): boolean {
    return !this.defaults.apiProvider || !this.defaults.apiKey;
  }

  /**
   * Get MCP services to install
   */
  getMcpServices(): string[] {
    return this.defaults.mcpServices;
  }

  /**
   * Get skills to install
   */
  getSkills(): string[] {
    return this.defaults.skills;
  }

  /**
   * Get agents to enable
   */
  getAgents(): string[] {
    return this.defaults.agents;
  }

  /**
   * Get detected API provider
   */
  getApiProvider(): string | undefined {
    return this.defaults.apiProvider;
  }

  /**
   * Get detected API key
   */
  getApiKey(): string | undefined {
    return this.defaults.apiKey;
  }

  /**
   * Get detected code tool type
   */
  getCodeToolType(): string | undefined {
    return this.defaults.codeToolType;
  }

  /**
   * Set API provider and key
   */
  setApiProvider(provider: string, key: string): void {
    this.defaults.apiProvider = provider;
    this.defaults.apiKey = key;
  }

  /**
   * Check if verbose mode is enabled
   */
  isVerbose(): boolean {
    return this.options.verbose ?? false;
  }

  /**
   * Check if interactive mode should be skipped
   */
  shouldSkipInteractive(): boolean {
    return this.options.skipInteractive ?? false;
  }

  /**
   * Get all defaults as plain object
   */
  getDefaults(): SmartDefaults {
    return { ...this.defaults };
  }
}

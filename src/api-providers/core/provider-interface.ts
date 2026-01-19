/**
 * Core Provider Interface
 * Defines the contract for all API providers
 */

export interface ProviderConfig {
  /** Provider unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Provider description */
  description: string;
  /** Base API URL */
  baseUrl: string;
  /** Default model */
  defaultModel: string;
  /** Available models */
  availableModels: string[];
  /** Whether API key is required */
  requiresApiKey: boolean;
  /** Custom configuration fields */
  customFields?: CustomField[];
  /** Provider icon/logo */
  icon?: string;
}

export interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'number';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface ProviderCredentials {
  apiKey?: string;
  customFields?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface ProviderSetup {
  provider: ProviderConfig;
  credentials: ProviderCredentials;
  model?: string;
}

/**
 * Base Provider Interface
 * All providers must implement this interface
 */
export interface IProvider {
  /** Get provider configuration */
  getConfig(): ProviderConfig;

  /** Validate credentials */
  validateCredentials(credentials: ProviderCredentials): Promise<ValidationResult>;

  /** Test connection */
  testConnection(credentials: ProviderCredentials): Promise<ValidationResult>;

  /** Get setup instructions */
  getSetupInstructions(): string[];

  /** Get error help text */
  getErrorHelp(error: Error): string;

  /** Auto-fill configuration from API key (if possible) */
  autoFillFromApiKey?(apiKey: string): Partial<ProviderSetup>;
}

/**
 * Provider Metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  icon?: string;
  popular?: boolean;
  setupTime?: string; // e.g., "1 minute"
  difficulty?: 'easy' | 'medium' | 'hard';
}

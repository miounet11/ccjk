import type { McpAutoThreshold } from './core/mcp-search';
import type { InstallMethod } from './utils/platform';

// Re-export MCP search types for convenience
export type { ContextWindowAnalysis, McpAutoThreshold, ServiceToolBreakdown } from './core/mcp-search';

// Re-export LSP types for convenience (v3.8+)
export type * from './types/lsp';

export interface McpService {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyPrompt?: string;
  apiKeyPlaceholder?: string;
  apiKeyEnvVar?: string;
  config: McpServerConfig;
}

export interface McpServerConfig {
  type: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  startup_timeout_ms?: number;
}

/**
 * MCP Tool Search configuration for Claude Code CLI 2.1.7+
 * Part of ClaudeConfiguration for deferred tool loading
 */
export interface McpToolSearchConfig {
  /**
   * Auto mode threshold percentage (0-100) or special values
   * - Number: Defer tool loading when descriptions exceed this % of context window
   * - 'always': Load all tools immediately (0% threshold)
   * - 'never': Defer all tools until requested (100% threshold)
   * @default 10 (per Claude Code 2.1.7 spec)
   */
  mcpAutoEnableThreshold?: McpAutoThreshold;

  /**
   * Enable dynamic service discovery
   * Allows runtime addition/removal of MCP services without restart
   * @default true
   */
  dynamicServiceDiscovery?: boolean;

  /**
   * Enable list_changed notifications
   * When enabled, Claude receives notifications when available tools change
   * @default true
   */
  listChangedNotifications?: boolean;

  /**
   * Services excluded from auto-mode (always loaded immediately)
   * Core services like 'mcp-search', 'context7' are always excluded
   * @default ['mcp-search', 'context7', 'sqlite']
   */
  excludedServices?: string[];
}

export type MyclaudeProviderMode = 'official' | 'openai-native' | 'ccr-proxy';

export interface MyclaudeProviderProfile {
  id: string;
  name: string;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fastModel?: string;
  authType?: 'api_key' | 'auth_token' | 'ccr_proxy';
  primaryModel?: string;
  defaultHaikuModel?: string;
  defaultSonnetModel?: string;
  defaultOpusModel?: string;
  mode?: MyclaudeProviderMode;
  [key: string]: unknown;
}

export type ClavueProviderAuthType = 'api_key' | 'auth_token';
export type ClavueProviderModelMode = 'anthropic_native' | 'openai_native' | 'hybrid_compatible';

export interface ClavueProviderModelRouting {
  presetId: string;
  primaryModel: string;
  subagentModel: string;
  smallFastModel: string;
  planModel: string;
  exploreModel: string;
  generalModel: string;
  teamModel: string;
  guideModel: string;
}

export interface ClavueProviderProfile {
  id: string;
  name: string;
  providerId: string;
  modelMode: ClavueProviderModelMode;
  baseUrl?: string;
  authType: ClavueProviderAuthType;
  modelRouting: ClavueProviderModelRouting;
  provenance?: {
    kind: 'manual' | 'imported' | 'current_env_adopted' | 'synthetic_current_env';
    sourceId?: 'ccjk' | 'zcf' | string;
    importedAt?: number;
    adoptedAt?: number;
    externalProfileId?: string;
  };
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export interface ClavueProviderCredentialRecord {
  credential: string;
  authType?: ClavueProviderAuthType;
}

export interface ClavueCredentialsConfiguration {
  providerProfiles?: Record<string, ClavueProviderCredentialRecord>;
  [key: string]: unknown;
}

export interface ClaudeConfiguration {
  mcpServers: Record<string, McpServerConfig>;
  hasCompletedOnboarding?: boolean;
  customApiKeyResponses?: {
    approved: string[];
    rejected: string[];
  };
  env?: Record<string, string>;
  primaryApiKey?: string;
  installMethod?: InstallMethod;
  myclaudeProviderProfiles?: MyclaudeProviderProfile[];
  myclaudeActiveProviderProfileId?: string;
  clavueProviderProfiles?: ClavueProviderProfile[];
  clavueActiveProviderProfileId?: string;

  /**
   * MCP Tool Search configuration (v3.8+)
   * Enables auto-mode for deferred tool loading when descriptions exceed threshold
   * @see https://docs.anthropic.com/en/docs/build-with-claude/mcp#tool-search-auto-mode
   */
  mcpToolSearch?: McpToolSearchConfig;
}

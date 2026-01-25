/**
 * Provider Registry Service
 *
 * Service for querying and managing API providers in the cloud registry.
 * Supports quick provider launch feature with shortcode-based lookup.
 *
 * @module services/provider-registry
 */

import type {
  CreateProviderInput,
  ProviderCreateResponse,
  ProviderListResponse,
  ProviderQueryResponse,
  ProviderRegistry,
} from '../types/provider'
import { CloudApiClient, createApiClient } from './cloud/api-client'

// ============================================================================
// Constants
// ============================================================================

const CLOUD_API_BASE_URL = 'https://api.claudehome.cn/v1'
const REQUEST_TIMEOUT = 10000 // 10 seconds for quick operations

// ============================================================================
// Built-in Providers (Fallback when cloud is unavailable)
// ============================================================================

/**
 * Built-in provider registry for offline/fallback use
 */
const BUILTIN_PROVIDERS: Record<string, ProviderRegistry> = {
  '302': {
    shortcode: '302',
    name: '302.AI',
    apiUrl: 'https://api.302.ai',
    description: '302.AI 中转服务 - 支持多种模型',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
    verified: true,
    category: 'relay',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
  'glm': {
    shortcode: 'glm',
    name: '智谱AI',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    description: '智谱 GLM 大模型',
    models: ['glm-4', 'glm-4-plus', 'glm-3-turbo'],
    verified: true,
    category: 'domestic',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
  'kimi': {
    shortcode: 'kimi',
    name: '月之暗面 Kimi',
    apiUrl: 'https://api.moonshot.cn/v1',
    description: 'Moonshot Kimi 大模型',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    verified: true,
    category: 'domestic',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
  'minimax': {
    shortcode: 'minimax',
    name: 'MiniMax',
    apiUrl: 'https://api.minimax.chat/v1',
    description: 'MiniMax 大模型',
    models: ['abab5.5-chat', 'abab6-chat', 'abab6.5-chat'],
    verified: true,
    category: 'domestic',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
  'deepseek': {
    shortcode: 'deepseek',
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek 大模型',
    models: ['deepseek-chat', 'deepseek-coder'],
    verified: true,
    category: 'domestic',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
  'qwen': {
    shortcode: 'qwen',
    name: '通义千问',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    description: '阿里通义千问大模型',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    verified: true,
    category: 'domestic',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
}

// ============================================================================
// ProviderRegistryService Class
// ============================================================================

/**
 * Provider Registry Service
 *
 * Manages provider lookups and registrations with cloud fallback support.
 */
export class ProviderRegistryService {
  private client: CloudApiClient
  private useCloud: boolean = true

  constructor(options?: { baseUrl?: string; useCloud?: boolean }) {
    this.client = createApiClient({
      baseUrl: options?.baseUrl || CLOUD_API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      userAgent: 'CCJK-QuickLaunch/1.0',
    })
    this.useCloud = options?.useCloud ?? true
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get provider by shortcode
   *
   * First tries cloud registry, falls back to built-in providers.
   *
   * @param shortcode - Provider shortcode (e.g., "302", "glm")
   * @returns Provider info or null if not found
   */
  async getProvider(shortcode: string): Promise<ProviderRegistry | null> {
    const normalizedCode = shortcode.toLowerCase().trim()

    // Try cloud first if enabled
    if (this.useCloud) {
      try {
        const response = await this.client.get<ProviderQueryResponse>(
          `/providers/${encodeURIComponent(normalizedCode)}`,
        )

        if (response.success && response.data?.data) {
          return response.data.data
        }
      }
      catch {
        // Cloud failed, fall through to builtin
      }
    }

    // Fallback to built-in providers
    return BUILTIN_PROVIDERS[normalizedCode] || null
  }

  /**
   * Check if shortcode exists
   *
   * @param shortcode - Provider shortcode to check
   * @returns true if exists, false otherwise
   */
  async exists(shortcode: string): Promise<boolean> {
    const provider = await this.getProvider(shortcode)
    return provider !== null
  }

  /**
   * Check if shortcode is available for registration
   *
   * @param shortcode - Provider shortcode to check
   * @returns true if available, false if taken
   */
  async isAvailable(shortcode: string): Promise<boolean> {
    return !(await this.exists(shortcode))
  }

  // ==========================================================================
  // Registration Methods
  // ==========================================================================

  /**
   * Create a new provider in the cloud registry
   *
   * @param input - Provider creation data
   * @returns Created provider or error
   */
  async createProvider(input: CreateProviderInput): Promise<ProviderCreateResponse> {
    if (!this.useCloud) {
      return {
        success: false,
        error: {
          code: 'CLOUD_DISABLED',
          message: 'Cloud service is disabled',
        },
      }
    }

    try {
      const response = await this.client.post<ProviderCreateResponse>(
        '/providers',
        input,
      )

      if (response.success && response.data) {
        return response.data
      }

      return {
        success: false,
        error: {
          code: response.code || 'CREATE_FAILED',
          message: response.error || 'Failed to create provider',
        },
      }
    }
    catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      }
    }
  }

  // ==========================================================================
  // List Methods
  // ==========================================================================

  /**
   * List all available providers
   *
   * @param options - List options
   * @returns List of providers
   */
  async listProviders(options?: {
    category?: string
    verified?: boolean
    limit?: number
  }): Promise<ProviderRegistry[]> {
    // Try cloud first
    if (this.useCloud) {
      try {
        const query: Record<string, string | number | boolean> = {}
        if (options?.category) query.category = options.category
        if (options?.verified !== undefined) query.verified = options.verified
        if (options?.limit) query.limit = options.limit

        const response = await this.client.get<ProviderListResponse>(
          '/providers',
          query,
        )

        if (response.success && response.data?.data?.providers) {
          return response.data.data.providers
        }
      }
      catch {
        // Cloud failed, fall through to builtin
      }
    }

    // Return built-in providers
    let providers = Object.values(BUILTIN_PROVIDERS)

    if (options?.category) {
      providers = providers.filter(p => p.category === options.category)
    }
    if (options?.verified !== undefined) {
      providers = providers.filter(p => p.verified === options.verified)
    }
    if (options?.limit) {
      providers = providers.slice(0, options.limit)
    }

    return providers
  }

  /**
   * Get built-in provider (always available, no network)
   *
   * @param shortcode - Provider shortcode
   * @returns Built-in provider or null
   */
  getBuiltinProvider(shortcode: string): ProviderRegistry | null {
    return BUILTIN_PROVIDERS[shortcode.toLowerCase()] || null
  }

  /**
   * List all built-in providers
   *
   * @returns Array of built-in providers
   */
  listBuiltinProviders(): ProviderRegistry[] {
    return Object.values(BUILTIN_PROVIDERS)
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Enable or disable cloud service
   */
  setUseCloud(enabled: boolean): void {
    this.useCloud = enabled
  }

  /**
   * Check if cloud service is enabled
   */
  isCloudEnabled(): boolean {
    return this.useCloud
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let _instance: ProviderRegistryService | null = null

/**
 * Get the singleton ProviderRegistryService instance
 */
export function getProviderRegistry(): ProviderRegistryService {
  if (!_instance) {
    _instance = new ProviderRegistryService()
  }
  return _instance
}

/**
 * Create a new ProviderRegistryService instance
 */
export function createProviderRegistry(options?: {
  baseUrl?: string
  useCloud?: boolean
}): ProviderRegistryService {
  return new ProviderRegistryService(options)
}

import type { CodeToolType } from '../constants'
import { CCJK_CLOUD_API_URL } from '../constants'

/**
 * API Provider Preset Configuration
 * Defines API provider configurations for different code tools
 */
export interface ApiProviderPreset {
  /** Unique identifier for the provider */
  id: string
  /** Display name of the provider */
  name: string
  /** Supported code tool types */
  supportedCodeTools: CodeToolType[]
  /** Claude Code specific configuration */
  claudeCode?: {
    /** API base URL */
    baseUrl: string
    /** Authentication type */
    authType: 'api_key' | 'auth_token'
    /** Default models (optional) */
    defaultModels?: string[]
  }
  /** Codex specific configuration */
  codex?: {
    /** API base URL */
    baseUrl: string
    /** Wire API protocol type */
    wireApi: 'responses' | 'chat'
    /** Default model (optional) */
    defaultModel?: string
  }
  /** Provider description (optional) */
  description?: string
  /** Provider website (optional) */
  website?: string
  /** Provider logo URL (optional) */
  logo?: string
  /** Default API key for demo/trial (optional) */
  defaultApiKey?: string
  /** Note about default API key usage limits (optional) */
  defaultApiKeyNote?: string
  /** Whether this provider is from cloud */
  isCloud?: boolean
}

/**
 * Local fallback provider presets (used when cloud is unavailable)
 */
export const LOCAL_PROVIDER_PRESETS: ApiProviderPreset[] = [
  {
    id: 'glm',
    name: 'GLM',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://open.bigmodel.cn/api/anthropic',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
      wireApi: 'chat',
      defaultModel: 'GLM-4.7',
    },
    description: 'GLM (智谱AI)',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.minimaxi.com/anthropic',
      authType: 'auth_token',
      defaultModels: ['MiniMax-M2', 'MiniMax-M2'],
    },
    codex: {
      baseUrl: 'https://api.minimaxi.com/v1',
      wireApi: 'chat',
      defaultModel: 'MiniMax-M2',
    },
    description: 'MiniMax API Service',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    supportedCodeTools: ['claude-code', 'codex'],
    claudeCode: {
      baseUrl: 'https://api.kimi.com/coding/',
      authType: 'auth_token',
    },
    codex: {
      baseUrl: 'https://api.kimi.com/coding/v1',
      wireApi: 'chat',
      defaultModel: 'kimi-for-coding',
    },
    description: 'Kimi (Moonshot AI)',
  },
]

// Cache for cloud providers
let cloudProvidersCache: ApiProviderPreset[] | null = null
let cloudProvidersCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Cloud API response interface
 */
interface CloudProviderResponse {
  success: boolean
  data: ApiProviderPreset | ApiProviderPreset[]
  error?: {
    code: string
    message: string
  }
}

/**
 * Fetch providers from cloud API
 * @param codeType - Optional code tool type filter
 * @returns Array of cloud providers
 */
async function fetchCloudProviders(codeType?: CodeToolType): Promise<ApiProviderPreset[]> {
  try {
    const url = new URL(`${CCJK_CLOUD_API_URL}/providers`)
    if (codeType) {
      url.searchParams.set('codeType', codeType)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json() as CloudProviderResponse
    if (result.success && Array.isArray(result.data)) {
      return result.data.map(p => ({ ...p, isCloud: true }))
    }
    return []
  }
  catch {
    // Silently fail and use local fallback
    return []
  }
}

/**
 * Fetch a single provider from cloud API by ID
 * @param providerId - The provider ID
 * @returns Provider preset or null if not found
 */
async function fetchCloudProvider(providerId: string): Promise<ApiProviderPreset | null> {
  try {
    const response = await fetch(`${CCJK_CLOUD_API_URL}/providers/${providerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json() as CloudProviderResponse
    if (result.success && result.data && !Array.isArray(result.data)) {
      return { ...result.data, isCloud: true }
    }
    return null
  }
  catch {
    return null
  }
}

/**
 * Get all API providers (cloud + local fallback)
 * @param codeToolType - The code tool type to filter by
 * @returns Array of API provider presets
 */
export async function getApiProvidersAsync(codeToolType?: CodeToolType): Promise<ApiProviderPreset[]> {
  const now = Date.now()

  // Check cache
  if (cloudProvidersCache && (now - cloudProvidersCacheTime) < CACHE_TTL) {
    const providers = cloudProvidersCache
    if (codeToolType) {
      return providers.filter(p => p.supportedCodeTools.includes(codeToolType))
    }
    return providers
  }

  // Fetch from cloud
  const cloudProviders = await fetchCloudProviders(codeToolType)

  if (cloudProviders.length > 0) {
    // Update cache
    cloudProvidersCache = cloudProviders
    cloudProvidersCacheTime = now
    return cloudProviders
  }

  // Fallback to local
  if (codeToolType) {
    return LOCAL_PROVIDER_PRESETS.filter(p => p.supportedCodeTools.includes(codeToolType))
  }
  return LOCAL_PROVIDER_PRESETS
}

/**
 * Get API providers (sync version, uses local only)
 * @param codeToolType - The code tool type to filter by
 * @returns Array of API provider presets
 */
export function getApiProviders(codeToolType: CodeToolType): ApiProviderPreset[] {
  // Use cache if available
  if (cloudProvidersCache) {
    return cloudProvidersCache.filter(p => p.supportedCodeTools.includes(codeToolType))
  }
  return LOCAL_PROVIDER_PRESETS.filter(p => p.supportedCodeTools.includes(codeToolType))
}

/**
 * Get API provider preset by ID (async, checks cloud first)
 * @param providerId - The provider ID
 * @returns API provider preset or undefined if not found
 */
export async function getProviderPresetAsync(providerId: string): Promise<ApiProviderPreset | undefined> {
  // Check local first
  const localProvider = LOCAL_PROVIDER_PRESETS.find(p => p.id === providerId)

  // Check cache
  if (cloudProvidersCache) {
    const cachedProvider = cloudProvidersCache.find(p => p.id === providerId)
    if (cachedProvider) {
      return cachedProvider
    }
  }

  // Fetch from cloud (for custom providers like 302ai)
  const cloudProvider = await fetchCloudProvider(providerId)
  if (cloudProvider) {
    return cloudProvider
  }

  return localProvider
}

/**
 * Get API provider preset by ID (sync version)
 * @param providerId - The provider ID
 * @returns API provider preset or undefined if not found
 */
export function getProviderPreset(providerId: string): ApiProviderPreset | undefined {
  // Check cache first
  if (cloudProvidersCache) {
    const cachedProvider = cloudProvidersCache.find(p => p.id === providerId)
    if (cachedProvider) {
      return cachedProvider
    }
  }
  return LOCAL_PROVIDER_PRESETS.find(p => p.id === providerId)
}

/**
 * Get all valid provider IDs
 * @returns Array of valid provider IDs
 */
export function getValidProviderIds(): string[] {
  if (cloudProvidersCache) {
    return cloudProvidersCache.map(p => p.id)
  }
  return LOCAL_PROVIDER_PRESETS.map(p => p.id)
}

/**
 * Get all valid provider IDs (async, includes cloud)
 * @returns Array of valid provider IDs
 */
export async function getValidProviderIdsAsync(): Promise<string[]> {
  const providers = await getApiProvidersAsync()
  return providers.map(p => p.id)
}

/**
 * Clear the cloud providers cache
 */
export function clearProvidersCache(): void {
  cloudProvidersCache = null
  cloudProvidersCacheTime = 0
}

/**
 * Backward compatibility export
 * @deprecated Use LOCAL_PROVIDER_PRESETS or getApiProvidersAsync instead
 */
export const API_PROVIDER_PRESETS = LOCAL_PROVIDER_PRESETS

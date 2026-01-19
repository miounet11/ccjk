/**
 * Cloud Storage Adapters
 *
 * Factory and exports for cloud storage adapters.
 *
 * @module cloud-sync/adapters
 */

import type { CloudAdapter } from './base-adapter'
import type { CloudProvider, ProviderConfig } from './types'
import { GitHubGistAdapter } from './github-gist-adapter'
import { LocalAdapter } from './local-adapter'
import { AdapterError } from './types'
import { WebDAVAdapter } from './webdav-adapter'

// Re-export classes
export { CloudAdapter } from './base-adapter'

export { GitHubGistAdapter } from './github-gist-adapter'

export { LocalAdapter } from './local-adapter'
// Re-export types
export type {
  CloudProvider,
  DownloadResult,
  GitHubGistConfig,
  ItemMetadata,
  LocalConfig,
  ProgressCallback,
  ProgressInfo,
  ProviderConfig,
  RemoteItem,
  UploadResult,
  WebDAVConfig,
} from './types'
export type { AdapterErrorCode } from './types'
export { AdapterError } from './types'
export { WebDAVAdapter } from './webdav-adapter'

/**
 * Adapter registry mapping providers to their adapter classes
 */
const ADAPTER_REGISTRY: Record<CloudProvider, new () => CloudAdapter<any>> = {
  'github-gist': GitHubGistAdapter,
  'webdav': WebDAVAdapter,
  'local': LocalAdapter,
}

/**
 * Create a cloud storage adapter for the specified provider
 *
 * @param provider - Cloud provider type
 * @param config - Provider-specific configuration
 * @returns Connected cloud adapter instance
 *
 * @example
 * ```typescript
 * // Create GitHub Gist adapter
 * const adapter = await createAdapter('github-gist', {
 *   provider: 'github-gist',
 *   token: 'ghp_xxxx',
 *   isPrivate: true,
 * })
 *
 * // Create WebDAV adapter
 * const adapter = await createAdapter('webdav', {
 *   provider: 'webdav',
 *   serverUrl: 'https://dav.example.com',
 *   username: 'user',
 *   password: 'pass',
 *   basePath: '/ccjk-sync',
 * })
 *
 * // Create local adapter for testing
 * const adapter = await createAdapter('local', {
 *   provider: 'local',
 *   baseDir: '/tmp/ccjk-sync',
 * })
 * ```
 */
export async function createAdapter(
  provider: CloudProvider,
  config: ProviderConfig,
): Promise<CloudAdapter> {
  const AdapterClass = ADAPTER_REGISTRY[provider]

  if (!AdapterClass) {
    throw new AdapterError(
      `Unknown cloud provider: ${provider}`,
      'INVALID_CONFIG',
      provider,
    )
  }

  if (config.provider !== provider) {
    throw new AdapterError(
      `Config provider mismatch: expected ${provider}, got ${config.provider}`,
      'INVALID_CONFIG',
      provider,
    )
  }

  const adapter = new AdapterClass()
  await adapter.connect(config)

  return adapter
}

/**
 * Create adapter without connecting (for manual connection control)
 *
 * @param provider - Cloud provider type
 * @returns Unconnected cloud adapter instance
 *
 * @example
 * ```typescript
 * const adapter = createAdapterInstance('github-gist')
 * // Later...
 * await adapter.connect(config)
 * ```
 */
export function createAdapterInstance(provider: CloudProvider): CloudAdapter {
  const AdapterClass = ADAPTER_REGISTRY[provider]

  if (!AdapterClass) {
    throw new AdapterError(
      `Unknown cloud provider: ${provider}`,
      'INVALID_CONFIG',
      provider,
    )
  }

  return new AdapterClass()
}

/**
 * Get list of supported cloud providers
 *
 * @returns Array of supported provider names
 */
export function getSupportedProviders(): CloudProvider[] {
  return Object.keys(ADAPTER_REGISTRY) as CloudProvider[]
}

/**
 * Check if a provider is supported
 *
 * @param provider - Provider name to check
 * @returns True if provider is supported
 */
export function isProviderSupported(provider: string): provider is CloudProvider {
  return provider in ADAPTER_REGISTRY
}

/**
 * Provider display information
 */
export interface ProviderInfo {
  id: CloudProvider
  name: string
  description: string
  requiresAuth: boolean
  configFields: string[]
}

/**
 * Get information about supported providers
 *
 * @returns Array of provider information objects
 */
export function getProviderInfo(): ProviderInfo[] {
  return [
    {
      id: 'github-gist',
      name: 'GitHub Gist',
      description: 'Store data in GitHub Gists (requires GitHub token)',
      requiresAuth: true,
      configFields: ['token', 'isPrivate', 'apiBaseUrl'],
    },
    {
      id: 'webdav',
      name: 'WebDAV',
      description: 'WebDAV server (Nextcloud, ownCloud, Jianguoyun, etc.)',
      requiresAuth: true,
      configFields: ['serverUrl', 'username', 'password', 'basePath'],
    },
    {
      id: 'local',
      name: 'Local Storage',
      description: 'Local file system storage (for testing and offline use)',
      requiresAuth: false,
      configFields: ['baseDir'],
    },
  ]
}

/**
 * Configuration Hot-Reload Integration Example
 *
 * This file demonstrates how to integrate the configuration hot-reload system
 * into your application.
 */

import { getConfigManager } from './config-manager'
import { integrateWithConfigManager } from './config/api-providers'

/**
 * Initialize the configuration hot-reload system
 *
 * Call this function during application startup to enable hot-reload.
 *
 * @example
 * ```typescript
 * // In your main application file
 * import { initializeConfigHotReload } from './config-hot-reload-integration'
 *
 * async function main() {
 *   // Initialize hot-reload system
 *   await initializeConfigHotReload({
 *     enableFileWatch: true,
 *     enableCloudSync: true,
 *     cloudSyncInterval: 300000 // 5 minutes
 *   })
 *
 *   // Your application code...
 * }
 * ```
 */
export async function initializeConfigHotReload(options?: {
  enableFileWatch?: boolean
  enableCloudSync?: boolean
  cloudSyncInterval?: number
  cloudApiEndpoint?: string
  cloudApiKey?: string
}): Promise<ReturnType<typeof getConfigManager>> {
  // Get or create the global configuration manager
  const manager = getConfigManager({
    enableFileWatch: options?.enableFileWatch ?? true,
    enableCloudSync: options?.enableCloudSync ?? false,
    cloudSyncInterval: options?.cloudSyncInterval ?? 300000,
    cloudApiEndpoint: options?.cloudApiEndpoint,
    cloudApiKey: options?.cloudApiKey,
  })

  // Initialize the manager
  await manager.initialize()

  // Integrate with API providers for automatic cache updates
  integrateWithConfigManager()

  // Subscribe to configuration changes
  manager.subscribe((event) => {
    console.log(`[Config Hot-Reload] Configuration updated from ${event.source}`)
    console.log(`[Config Hot-Reload] Changed keys:`, event.changedKeys)
  })

  // Subscribe to specific events
  manager.on('settings-updated', (event) => {
    console.log('[Config Hot-Reload] Settings updated:', event.current.settings)
  })

  manager.on('providers-updated', (event) => {
    console.log('[Config Hot-Reload] Providers updated:', event.current.providers.length, 'providers')
  })

  manager.on('error', (error) => {
    console.error('[Config Hot-Reload] Error:', error)
  })

  console.log('[Config Hot-Reload] Configuration hot-reload system initialized')

  return manager
}

/**
 * Example: Using configuration in your application
 */
export async function exampleUsage(): Promise<void> {
  const manager = getConfigManager()

  // Get current configuration
  const config = await manager.getConfig()
  console.log('Current model:', config.settings.model)
  console.log('Available providers:', config.providers.length)

  // Update configuration programmatically
  await manager.updateConfig({
    settings: {
      model: 'opus',
      maxTokens: 8192,
    },
  }, 'cli')

  // Subscribe to changes
  manager.subscribe((event) => {
    console.log('Configuration changed!')
    console.log('Source:', event.source)
    console.log('Changed keys:', event.changedKeys)

    // React to specific changes
    if (event.changedKeys?.includes('settings.model')) {
      console.log('Model changed to:', event.current.settings.model)
      // Reinitialize your API client, etc.
    }
  })

  // Note: subscribe() returns an unsubscribe function that can be called later
  // const unsubscribe = manager.subscribe(...)
  // unsubscribe()

  // Force reload from disk and cloud
  await manager.reloadConfig()

  // Get metadata
  const metadata = manager.getMetadata()
  console.log('Config version:', metadata.version)
  console.log('Last updated:', metadata.lastUpdated)
  console.log('Source:', metadata.source)
}

/**
 * Example: React to specific configuration changes
 */
export function setupConfigurationReactions(): void {
  const manager = getConfigManager()

  // React to model changes
  manager.on('settings-updated', async (event) => {
    const oldModel = event.previous?.settings?.model
    const newModel = event.current.settings.model

    if (oldModel !== newModel) {
      console.log(`Model changed from ${oldModel} to ${newModel}`)
      // Reinitialize your API client with new model
      // await reinitializeApiClient(newModel)
    }
  })

  // React to provider changes
  manager.on('providers-updated', async (_event) => {
    console.log('Providers updated, refreshing provider list...')
    // Refresh your provider selection UI
    // await refreshProviderUI(event.current.providers)
  })

  // Handle errors gracefully
  manager.on('error', (error) => {
    console.error('Configuration error:', error.message)
    // Show error notification to user
    // showErrorNotification('Configuration update failed', error.message)
  })
}

/**
 * Example: Cleanup on application shutdown
 */
export async function shutdownConfigHotReload(): Promise<void> {
  const manager = getConfigManager()

  console.log('[Config Hot-Reload] Shutting down configuration hot-reload system...')

  // Dispose the manager (stops file watching and cloud sync)
  await manager.dispose()

  console.log('[Config Hot-Reload] Configuration hot-reload system shut down')
}

/**
 * Example: Advanced usage with custom configuration paths
 */
export async function advancedConfigSetup(): Promise<ReturnType<typeof import('./config-manager').createConfigManager>> {
  const { createConfigManager } = await import('./config-manager')

  // Create a custom manager instance with specific paths
  const customManager = createConfigManager({
    enableFileWatch: true,
    enableCloudSync: true,
    configPaths: [
      '/path/to/settings.json',
      '/path/to/custom-config.json',
    ],
    watchDebounceMs: 500, // Custom debounce delay
    cloudSyncInterval: 600000, // 10 minutes
  })

  await customManager.initialize()

  // Use the custom manager
  const config = await customManager.getConfig()
  console.log('Custom config loaded:', config)

  return customManager
}

/**
 * Example: Testing with hot-reload disabled
 */
export async function setupForTesting(): Promise<ReturnType<typeof import('./config-manager').createConfigManager>> {
  const { createConfigManager } = await import('./config-manager')

  // Create a manager with hot-reload disabled for testing
  const testManager = createConfigManager({
    enableFileWatch: false,
    enableCloudSync: false,
  })

  await testManager.initialize()

  return testManager
}

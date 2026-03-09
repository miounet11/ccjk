/**
 * Cloud API Gateway
 *
 * Unified gateway for all cloud API calls with automatic version negotiation.
 * Eliminates direct v1/v8 path fragmentation across the codebase.
 *
 * @module cloud-client/gateway
 */

import type { CloudApiResponse } from '../services/cloud/api-client'
import { CLOUD_ENDPOINTS } from '../constants'
import { CloudApiClient } from '../services/cloud/api-client'

// ============================================================================
// Types
// ============================================================================

/**
 * API route identifier
 *
 * Semantic route names instead of raw paths
 */
export type ApiRoute
  = | 'analysis.projects'
    | 'templates.get'
    | 'templates.batch'
    | 'telemetry.installation'
    | 'health'
    | 'plugins.list'
    | 'plugins.recommend'
    | 'skills.list'
    | 'skills.upload'
    | 'skills.download'
    | 'notifications.bind'
    | 'notifications.send'
    | 'notifications.poll'

/**
 * Route version mapping
 *
 * Maps semantic routes to actual API paths for different versions
 */
interface RouteVersionMap {
  v1: string
  v8?: string // Optional v8 fallback
}

/**
 * Gateway request options
 */
export interface GatewayRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean>
  authToken?: string
  timeout?: number
  /** Prefer specific API version (default: auto-negotiate) */
  preferVersion?: 'v1' | 'v8'
}

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  /** Default timeout for requests */
  timeout?: number
  /** Authentication token */
  authToken?: string
  /** Enable automatic version fallback */
  enableVersionFallback?: boolean
}

// ============================================================================
// Route Mapping
// ============================================================================

/**
 * Route version mapping table
 *
 * Central source of truth for API path versioning.
 * When adding new routes, define both v1 and v8 paths if applicable.
 */
const ROUTE_MAP: Record<ApiRoute, RouteVersionMap> = {
  // Analysis endpoints
  'analysis.projects': {
    v1: '/api/v1/analysis/projects',
    v8: '/api/v8/analyze', // Legacy v8 path
  },

  // Template endpoints
  'templates.get': {
    v1: '/api/v1/templates/:id',
  },
  'templates.batch': {
    v1: '/api/v1/templates/batch',
    v8: '/api/v8/templates', // Legacy v8 batch endpoint
  },

  // Telemetry endpoints
  'telemetry.installation': {
    v1: '/api/v1/telemetry/installation',
  },

  // Health check
  'health': {
    v1: '/api/v1/health',
  },

  // Plugin endpoints
  'plugins.list': {
    v1: '/v1/plugins/list',
  },
  'plugins.recommend': {
    v1: '/v1/plugins/recommend',
  },

  // Skills endpoints
  'skills.list': {
    v1: '/v1/skills/list',
  },
  'skills.upload': {
    v1: '/v1/skills/upload',
  },
  'skills.download': {
    v1: '/v1/skills/download',
  },

  // Notification endpoints (remote API)
  'notifications.bind': {
    v1: '/api/v1/bind/use',
  },
  'notifications.send': {
    v1: '/api/v1/notify',
  },
  'notifications.poll': {
    v1: '/api/v1/reply/poll',
  },
}

// ============================================================================
// CloudApiGateway Class
// ============================================================================

/**
 * Cloud API Gateway
 *
 * Unified gateway for all cloud API calls with:
 * - Semantic route naming
 * - Automatic version negotiation
 * - Centralized error handling
 * - Type-safe requests
 *
 * @example
 * ```typescript
 * const gateway = new CloudApiGateway({ timeout: 30000 })
 *
 * const response = await gateway.request('analysis.projects', {
 *   method: 'POST',
 *   body: { projectRoot: '/path/to/project' }
 * })
 * ```
 */
export class CloudApiGateway {
  private mainClient: CloudApiClient
  private pluginsClient: CloudApiClient
  private remoteClient: CloudApiClient
  private config: Required<GatewayConfig>

  constructor(config: GatewayConfig = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      authToken: config.authToken || '',
      enableVersionFallback: config.enableVersionFallback ?? true,
    }

    // Initialize clients for each endpoint
    this.mainClient = new CloudApiClient({
      baseUrl: CLOUD_ENDPOINTS.MAIN.BASE_URL,
      timeout: this.config.timeout,
      authToken: this.config.authToken,
    })

    this.pluginsClient = new CloudApiClient({
      baseUrl: CLOUD_ENDPOINTS.PLUGINS.BASE_URL,
      timeout: this.config.timeout,
      authToken: this.config.authToken,
    })

    this.remoteClient = new CloudApiClient({
      baseUrl: CLOUD_ENDPOINTS.REMOTE.BASE_URL,
      timeout: this.config.timeout,
      authToken: this.config.authToken,
    })
  }

  /**
   * Make a request through the gateway
   *
   * @param route - Semantic route identifier
   * @param options - Request options
   * @returns API response
   */
  async request<T>(
    route: ApiRoute,
    options: GatewayRequestOptions,
  ): Promise<CloudApiResponse<T>> {
    const routeConfig = ROUTE_MAP[route]
    if (!routeConfig) {
      return {
        success: false,
        error: `Unknown route: ${route}`,
        code: 'INVALID_ROUTE',
      }
    }

    // Determine which client to use based on route
    const client = this.getClientForRoute(route)

    // Determine API version to use
    const version = options.preferVersion || 'v1'
    const path = this.resolvePath(routeConfig, version)

    // Make request
    const response = await client.request<T>(path, {
      method: options.method,
      body: options.body,
      query: options.query,
      authToken: options.authToken || this.config.authToken,
      timeout: options.timeout || this.config.timeout,
    })

    // If v1 fails and v8 fallback is available, try v8
    if (
      !response.success
      && version === 'v1'
      && routeConfig.v8
      && this.config.enableVersionFallback
    ) {
      const v8Path = routeConfig.v8
      return client.request<T>(v8Path, {
        method: options.method,
        body: options.body,
        query: options.query,
        authToken: options.authToken || this.config.authToken,
        timeout: options.timeout || this.config.timeout,
      })
    }

    return response
  }

  /**
   * Set authentication token for all clients
   */
  setAuthToken(token: string): void {
    this.config.authToken = token
    this.mainClient.setAuthToken(token)
    this.pluginsClient.setAuthToken(token)
    this.remoteClient.setAuthToken(token)
  }

  /**
   * Get current configuration
   */
  getConfig(): GatewayConfig {
    return { ...this.config }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Get appropriate client for a route
   */
  private getClientForRoute(route: ApiRoute): CloudApiClient {
    if (route.startsWith('plugins.')) {
      return this.pluginsClient
    }
    if (route.startsWith('notifications.')) {
      return this.remoteClient
    }
    if (route.startsWith('skills.')) {
      return this.pluginsClient
    }
    return this.mainClient
  }

  /**
   * Resolve path for specific version
   */
  private resolvePath(routeConfig: RouteVersionMap, version: 'v1' | 'v8'): string {
    return version === 'v8' && routeConfig.v8 ? routeConfig.v8 : routeConfig.v1
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new CloudApiGateway instance
 *
 * @param config - Gateway configuration
 * @returns CloudApiGateway instance
 */
export function createGateway(config?: GatewayConfig): CloudApiGateway {
  return new CloudApiGateway(config)
}

/**
 * Create a default gateway with standard configuration
 */
export function createDefaultGateway(): CloudApiGateway {
  return new CloudApiGateway({
    timeout: 30000,
    enableVersionFallback: true,
  })
}

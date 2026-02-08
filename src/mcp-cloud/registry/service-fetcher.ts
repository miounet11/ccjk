/**
 * Service Fetcher
 * Handles HTTP requests to the cloud API
 */

import type {
  CloudAPIConfig,
  MCPService,
  MCPServiceDetail,
  ServiceRatings,
  UserProfile,
} from '../types'

export class ServiceFetcher {
  private config: CloudAPIConfig

  constructor(config: CloudAPIConfig) {
    this.config = config
  }

  /**
   * Fetch all services from cloud
   */
  async fetchAllServices(): Promise<MCPService[]> {
    return this.request<MCPService[]>('/services')
  }

  /**
   * Fetch service details
   */
  async fetchService(id: string): Promise<MCPServiceDetail | null> {
    try {
      return await this.request<MCPServiceDetail>(`/services/${id}`)
    }
    catch (_error) {
      return null
    }
  }

  /**
   * Fetch trending services
   */
  async fetchTrending(limit: number): Promise<MCPService[]> {
    return this.request<MCPService[]>(`/services/trending?limit=${limit}`)
  }

  /**
   * Fetch recommended services
   */
  async fetchRecommended(userProfile: UserProfile, limit: number): Promise<MCPService[]> {
    return this.request<MCPService[]>('/services/recommended', {
      method: 'POST',
      body: JSON.stringify({ userProfile, limit }),
    })
  }

  /**
   * Fetch service ratings
   */
  async fetchRatings(serviceId: string): Promise<ServiceRatings | null> {
    try {
      return await this.request<ServiceRatings>(`/services/${serviceId}/ratings`)
    }
    catch (_error) {
      return null
    }
  }

  /**
   * Make HTTP request with retries
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json() as T
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // Don't retry on 4xx errors
        if (lastError.message.includes('HTTP 4')) {
          throw lastError
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries - 1) {
          await this.sleep(2 ** attempt * 1000)
        }
      }
    }

    throw lastError || new Error('Request failed')
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

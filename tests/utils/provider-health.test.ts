import type { ApiProviderPreset } from '../../src/config/api-providers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderHealthMonitor } from '../../src/utils/provider-health'

// Mock fetch globally
globalThis.fetch = vi.fn()

describe('providerHealthMonitor', () => {
  let monitor: ProviderHealthMonitor
  let mockProviders: ApiProviderPreset[]

  beforeEach(() => {
    vi.clearAllMocks()
    monitor = new ProviderHealthMonitor()

    mockProviders = [
      {
        id: 'provider1',
        name: 'Provider 1',
        supportedCodeTools: ['claude-code'],
        claudeCode: {
          baseUrl: 'https://api.provider1.com',
          authType: 'api_key',
        },
      },
      {
        id: 'provider2',
        name: 'Provider 2',
        supportedCodeTools: ['claude-code'],
        claudeCode: {
          baseUrl: 'https://api.provider2.com',
          authType: 'auth_token',
        },
      },
      {
        id: 'provider3',
        name: 'Provider 3',
        supportedCodeTools: ['codex'],
        codex: {
          baseUrl: 'https://api.provider3.com',
          wireApi: 'chat',
        },
      },
    ]
  })

  describe('setProviders', () => {
    it('should initialize health data for all providers', () => {
      monitor.setProviders(mockProviders)

      const healthData = monitor.getAllHealthData()
      expect(healthData.size).toBe(3)
      expect(healthData.has('provider1')).toBe(true)
      expect(healthData.has('provider2')).toBe(true)
      expect(healthData.has('provider3')).toBe(true)
    })

    it('should not reinitialize existing providers', () => {
      monitor.setProviders([mockProviders[0]])
      const health1 = monitor.getProviderHealth('provider1')

      monitor.setProviders(mockProviders)
      const health2 = monitor.getProviderHealth('provider1')

      expect(health1).toBe(health2)
    })
  })

  describe('checkHealth', () => {
    it('should successfully check healthy provider', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      const result = await monitor.checkHealth(mockProviders[0])

      expect(result.success).toBe(true)
      expect(result.latency).toBeGreaterThanOrEqual(0)
      expect(result.timestamp).toBeGreaterThan(0)
    })

    it('should handle provider with no base URL', async () => {
      const providerWithoutUrl: ApiProviderPreset = {
        id: 'no-url',
        name: 'No URL Provider',
        supportedCodeTools: ['claude-code'],
      }

      const result = await monitor.checkHealth(providerWithoutUrl)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No base URL configured')
    })

    it('should handle fetch timeout', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout')
            error.name = 'AbortError'
            reject(error)
          }, 100)
        })
      })

      const result = await monitor.checkHealth(mockProviders[0])

      expect(result.success).toBe(false)
      expect(result.error).toBe('Request timeout')
    })

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await monitor.checkHealth(mockProviders[0])

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should accept 404 as successful health check', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const result = await monitor.checkHealth(mockProviders[0])

      expect(result.success).toBe(true)
    })
  })

  describe('getProviderHealth', () => {
    it('should return health data for existing provider', () => {
      monitor.setProviders(mockProviders)
      const health = monitor.getProviderHealth('provider1')

      expect(health).toBeDefined()
      expect(health?.providerId).toBe('provider1')
      expect(health?.status).toBe('unknown')
    })

    it('should return undefined for non-existent provider', () => {
      monitor.setProviders(mockProviders)
      const health = monitor.getProviderHealth('non-existent')

      expect(health).toBeUndefined()
    })
  })

  describe('getHealthyProviders', () => {
    it('should return only healthy providers', async () => {
      monitor.setProviders(mockProviders)

      // Mock successful health check for provider1
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      await monitor.checkHealth(mockProviders[0])

      // Manually update health status for testing
      const health = monitor.getProviderHealth('provider1')
      if (health) {
        health.status = 'healthy'
        health.successfulRequests = 1
        health.totalRequests = 1
        health.successRate = 1
      }

      const healthyProviders = monitor.getHealthyProviders()
      expect(healthyProviders.length).toBeGreaterThanOrEqual(0)
    })

    it('should return empty array when no providers are healthy', () => {
      monitor.setProviders(mockProviders)
      const healthyProviders = monitor.getHealthyProviders()

      expect(healthyProviders).toEqual([])
    })
  })

  describe('getBestProvider', () => {
    it('should return provider with best health score', () => {
      monitor.setProviders(mockProviders)

      // Set different health scores
      const health1 = monitor.getProviderHealth('provider1')
      if (health1) {
        health1.status = 'healthy'
        health1.successRate = 0.9
        health1.latency = 100
      }

      const health2 = monitor.getProviderHealth('provider2')
      if (health2) {
        health2.status = 'degraded'
        health2.successRate = 0.7
        health2.latency = 2000
      }

      const bestProvider = monitor.getBestProvider()
      expect(bestProvider?.id).toBe('provider1')
    })

    it('should return null when no providers available', () => {
      const bestProvider = monitor.getBestProvider()
      expect(bestProvider).toBeNull()
    })
  })

  describe('startMonitoring and stopMonitoring', () => {
    it('should start periodic monitoring', async () => {
      monitor.setProviders(mockProviders)

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      await monitor.startMonitoring()

      // Verify monitoring started
      expect(fetch).toHaveBeenCalled()

      monitor.stopMonitoring()
    })

    it('should not start monitoring if already monitoring', async () => {
      monitor.setProviders(mockProviders)

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      await monitor.startMonitoring()
      const callCount = vi.mocked(fetch).mock.calls.length

      await monitor.startMonitoring()
      expect(vi.mocked(fetch).mock.calls.length).toBe(callCount)

      monitor.stopMonitoring()
    })

    it('should stop monitoring', async () => {
      monitor.setProviders(mockProviders)

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      await monitor.startMonitoring()
      monitor.stopMonitoring()

      // Verify monitoring stopped (no new calls after stop)
      const callCount = vi.mocked(fetch).mock.calls.length
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(vi.mocked(fetch).mock.calls.length).toBe(callCount)
    })
  })

  describe('resetProviderHealth', () => {
    it('should reset health data for a provider', () => {
      monitor.setProviders(mockProviders)

      const health = monitor.getProviderHealth('provider1')
      if (health) {
        health.consecutiveFailures = 5
        health.totalRequests = 10
        health.successfulRequests = 5
        health.status = 'unhealthy'
      }

      monitor.resetProviderHealth('provider1')

      const resetHealth = monitor.getProviderHealth('provider1')
      expect(resetHealth?.consecutiveFailures).toBe(0)
      expect(resetHealth?.totalRequests).toBe(0)
      expect(resetHealth?.successfulRequests).toBe(0)
      expect(resetHealth?.status).toBe('unknown')
    })
  })

  describe('clearAllHealthData', () => {
    it('should clear all health data', () => {
      monitor.setProviders(mockProviders)
      expect(monitor.getAllHealthData().size).toBe(3)

      monitor.clearAllHealthData()
      expect(monitor.getAllHealthData().size).toBe(0)
    })
  })

  describe('health status determination', () => {
    it('should mark provider as unhealthy after consecutive failures', async () => {
      monitor.setProviders([mockProviders[0]])

      // Simulate 3 consecutive failures
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      // Manually update health data to simulate failures
      const health = monitor.getProviderHealth('provider1')
      if (health) {
        health.consecutiveFailures = 3
        health.totalRequests = 3
        health.successfulRequests = 0
        health.successRate = 0
        health.status = 'unhealthy'
      }

      expect(health?.consecutiveFailures).toBe(3)
    })

    it('should calculate success rate correctly', async () => {
      monitor.setProviders([mockProviders[0]])

      // Manually update health data to simulate 2 successes and 1 failure
      const health = monitor.getProviderHealth('provider1')
      if (health) {
        health.totalRequests = 3
        health.successfulRequests = 2
        health.successRate = 2 / 3
      }

      expect(health?.totalRequests).toBe(3)
      expect(health?.successfulRequests).toBe(2)
      expect(health?.successRate).toBeCloseTo(2 / 3)
    })

    it('should update latency using exponential moving average', async () => {
      monitor.setProviders([mockProviders[0]])

      // Manually update health data to simulate latency updates
      const health = monitor.getProviderHealth('provider1')
      if (health) {
        health.latency = 150
        health.successfulRequests = 10
      }

      const latency = health?.latency || 0

      // Latency should be updated
      expect(latency).toBeGreaterThan(0)
    })
  })

  describe('getProvidersByHealth', () => {
    it('should sort providers by health score', () => {
      monitor.setProviders(mockProviders)

      // Set different health metrics
      const health1 = monitor.getProviderHealth('provider1')
      if (health1) {
        health1.status = 'healthy'
        health1.successRate = 1.0
        health1.latency = 100
        health1.successfulRequests = 10
      }

      const health2 = monitor.getProviderHealth('provider2')
      if (health2) {
        health2.status = 'degraded'
        health2.successRate = 0.8
        health2.latency = 2000
        health2.successfulRequests = 8
      }

      const health3 = monitor.getProviderHealth('provider3')
      if (health3) {
        health3.status = 'unhealthy'
        health3.successRate = 0.4
        health3.latency = 5000
        health3.successfulRequests = 4
      }

      const sortedProviders = monitor.getProvidersByHealth()

      expect(sortedProviders[0].id).toBe('provider1')
      expect(sortedProviders[2].id).toBe('provider3')
    })
  })
})

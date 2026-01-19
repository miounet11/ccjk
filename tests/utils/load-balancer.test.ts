import type { ApiProviderPreset } from '../../src/config/api-providers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoadBalancer } from '../../src/utils/load-balancer'
import { ProviderHealthMonitor } from '../../src/utils/provider-health'

describe('loadBalancer', () => {
  let loadBalancer: LoadBalancer
  let healthMonitor: ProviderHealthMonitor
  let mockProviders: ApiProviderPreset[]

  beforeEach(() => {
    vi.clearAllMocks()
    loadBalancer = new LoadBalancer()
    healthMonitor = new ProviderHealthMonitor()

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

  describe('constructor', () => {
    it('should create load balancer with default config', () => {
      const lb = new LoadBalancer()
      const config = lb.getConfig()

      expect(config.strategy).toBe('weighted')
      expect(config.enableFailover).toBe(true)
      expect(config.maxFailoverAttempts).toBe(3)
      expect(config.excludeUnhealthy).toBe(true)
      expect(config.preferHealthy).toBe(true)
    })

    it('should create load balancer with custom config', () => {
      const lb = new LoadBalancer({
        strategy: 'round-robin',
        enableFailover: false,
        maxFailoverAttempts: 5,
      })
      const config = lb.getConfig()

      expect(config.strategy).toBe('round-robin')
      expect(config.enableFailover).toBe(false)
      expect(config.maxFailoverAttempts).toBe(5)
    })
  })

  describe('setHealthMonitor', () => {
    it('should set health monitor', () => {
      loadBalancer.setHealthMonitor(healthMonitor)
      // No direct way to verify, but should not throw
      expect(() => loadBalancer.selectProvider(mockProviders)).not.toThrow()
    })
  })

  describe('selectProvider', () => {
    it('should return null for empty provider list', () => {
      const result = loadBalancer.selectProvider([])
      expect(result).toBeNull()
    })

    it('should select a provider from available list', () => {
      const result = loadBalancer.selectProvider(mockProviders)

      expect(result).not.toBeNull()
      expect(result?.provider).toBeDefined()
      expect(result?.reason).toContain('strategy')
      expect(result?.isFailover).toBe(false)
      expect(result?.attemptNumber).toBe(1)
    })

    it('should exclude failed providers', () => {
      loadBalancer.markProviderFailed('provider1')
      const result = loadBalancer.selectProvider(mockProviders)

      expect(result?.provider.id).not.toBe('provider1')
    })

    it('should fallback to all providers when no healthy ones available', () => {
      healthMonitor.setProviders(mockProviders)
      loadBalancer.setHealthMonitor(healthMonitor)

      // Mark all as unhealthy
      for (const provider of mockProviders) {
        const health = healthMonitor.getProviderHealth(provider.id)
        if (health) {
          health.status = 'unhealthy'
        }
      }

      const result = loadBalancer.selectProvider(mockProviders)
      expect(result).not.toBeNull()
      expect(result?.reason).toContain('fallback')
    })
  })

  describe('round-robin strategy', () => {
    it('should rotate through providers', () => {
      loadBalancer.setStrategy('round-robin')

      const result1 = loadBalancer.selectProvider(mockProviders)
      const result2 = loadBalancer.selectProvider(mockProviders)
      const result3 = loadBalancer.selectProvider(mockProviders)

      expect(result1?.provider.id).toBe('provider1')
      expect(result2?.provider.id).toBe('provider2')
      expect(result3?.provider.id).toBe('provider3')
    })

    it('should wrap around after reaching end', () => {
      loadBalancer.setStrategy('round-robin')

      // Cycle through all providers
      for (let i = 0; i < mockProviders.length; i++) {
        loadBalancer.selectProvider(mockProviders)
      }

      // Should wrap back to first
      const result = loadBalancer.selectProvider(mockProviders)
      expect(result?.provider.id).toBe('provider1')
    })
  })

  describe('weighted strategy', () => {
    it('should select provider based on health weights', () => {
      healthMonitor.setProviders(mockProviders)
      loadBalancer.setHealthMonitor(healthMonitor)
      loadBalancer.setStrategy('weighted')

      // Set different health scores
      const health1 = healthMonitor.getProviderHealth('provider1')
      if (health1) {
        health1.status = 'healthy'
        health1.successRate = 1.0
        health1.latency = 100
      }

      const health2 = healthMonitor.getProviderHealth('provider2')
      if (health2) {
        health2.status = 'degraded'
        health2.successRate = 0.5
        health2.latency = 3000
      }

      // Run multiple selections to verify weighted distribution
      const selections = new Map<string, number>()
      for (let i = 0; i < 100; i++) {
        const result = loadBalancer.selectProvider(mockProviders)
        if (result) {
          const count = selections.get(result.provider.id) || 0
          selections.set(result.provider.id, count + 1)
        }
      }

      // Provider1 should be selected more often due to better health
      const provider1Count = selections.get('provider1') || 0
      const provider2Count = selections.get('provider2') || 0
      expect(provider1Count).toBeGreaterThan(provider2Count)
    })

    it('should fallback to random when no health monitor', () => {
      loadBalancer.setStrategy('weighted')
      const result = loadBalancer.selectProvider(mockProviders)

      expect(result).not.toBeNull()
      expect(mockProviders.some(p => p.id === result?.provider.id)).toBe(true)
    })
  })

  describe('least-latency strategy', () => {
    it('should select provider with lowest latency', () => {
      healthMonitor.setProviders(mockProviders)
      loadBalancer.setHealthMonitor(healthMonitor)
      loadBalancer.setStrategy('least-latency')

      // Set different latencies
      const health1 = healthMonitor.getProviderHealth('provider1')
      if (health1) {
        health1.latency = 500
        health1.successfulRequests = 10
      }

      const health2 = healthMonitor.getProviderHealth('provider2')
      if (health2) {
        health2.latency = 100
        health2.successfulRequests = 10
      }

      const health3 = healthMonitor.getProviderHealth('provider3')
      if (health3) {
        health3.latency = 300
        health3.successfulRequests = 10
      }

      const result = loadBalancer.selectProvider(mockProviders)
      expect(result?.provider.id).toBe('provider2')
    })

    it('should fallback to random when no health monitor', () => {
      loadBalancer.setStrategy('least-latency')
      const result = loadBalancer.selectProvider(mockProviders)

      expect(result).not.toBeNull()
    })
  })

  describe('random strategy', () => {
    it('should select random provider', () => {
      loadBalancer.setStrategy('random')

      const selections = new Set<string>()
      for (let i = 0; i < 50; i++) {
        const result = loadBalancer.selectProvider(mockProviders)
        if (result) {
          selections.add(result.provider.id)
        }
      }

      // Should have selected multiple different providers
      expect(selections.size).toBeGreaterThan(1)
    })
  })

  describe('failover', () => {
    it('should failover to next provider', () => {
      loadBalancer.setFailoverEnabled(true)

      const result = loadBalancer.failover(mockProviders[0], mockProviders)

      expect(result).not.toBeNull()
      expect(result?.provider.id).not.toBe('provider1')
      expect(result?.isFailover).toBe(true)
      expect(result?.attemptNumber).toBe(2)
      expect(result?.reason).toContain('failover')
    })

    it('should return null when failover disabled', () => {
      loadBalancer.setFailoverEnabled(false)

      const result = loadBalancer.failover(mockProviders[0], mockProviders)

      expect(result).toBeNull()
    })

    it('should return null when max attempts exceeded', () => {
      loadBalancer.updateConfig({ maxFailoverAttempts: 2 })

      // Fail first provider
      loadBalancer.failover(mockProviders[0], mockProviders)

      // Fail second provider
      loadBalancer.failover(mockProviders[1], mockProviders)

      // Should exceed max attempts
      const result = loadBalancer.failover(mockProviders[2], mockProviders)
      expect(result).toBeNull()
    })

    it('should return null when no providers available', () => {
      // Mark all providers as failed
      for (const provider of mockProviders) {
        loadBalancer.markProviderFailed(provider.id)
      }

      const result = loadBalancer.failover(mockProviders[0], mockProviders)
      expect(result).toBeNull()
    })
  })

  describe('markProviderFailed and markProviderRecovered', () => {
    it('should mark provider as failed', () => {
      loadBalancer.markProviderFailed('provider1')

      const failedProviders = loadBalancer.getFailedProviders()
      expect(failedProviders).toContain('provider1')
    })

    it('should mark provider as recovered', () => {
      loadBalancer.markProviderFailed('provider1')
      loadBalancer.markProviderRecovered('provider1')

      const failedProviders = loadBalancer.getFailedProviders()
      expect(failedProviders).not.toContain('provider1')
    })
  })

  describe('resetFailedProviders', () => {
    it('should reset all failed providers', () => {
      loadBalancer.markProviderFailed('provider1')
      loadBalancer.markProviderFailed('provider2')

      expect(loadBalancer.getFailedProviders().length).toBe(2)

      loadBalancer.resetFailedProviders()

      expect(loadBalancer.getFailedProviders().length).toBe(0)
    })
  })

  describe('getLastSelectedProvider', () => {
    it('should return last selected provider', () => {
      loadBalancer.selectProvider(mockProviders)
      const lastProvider = loadBalancer.getLastSelectedProvider()

      expect(lastProvider).not.toBeNull()
      expect(mockProviders.some(p => p.id === lastProvider?.id)).toBe(true)
    })

    it('should return null when no provider selected', () => {
      const lastProvider = loadBalancer.getLastSelectedProvider()
      expect(lastProvider).toBeNull()
    })
  })

  describe('configuration management', () => {
    it('should update configuration', () => {
      loadBalancer.updateConfig({
        strategy: 'round-robin',
        maxFailoverAttempts: 5,
      })

      const config = loadBalancer.getConfig()
      expect(config.strategy).toBe('round-robin')
      expect(config.maxFailoverAttempts).toBe(5)
    })

    it('should get current strategy', () => {
      loadBalancer.setStrategy('least-latency')
      expect(loadBalancer.getStrategy()).toBe('least-latency')
    })

    it('should check if failover is enabled', () => {
      loadBalancer.setFailoverEnabled(true)
      expect(loadBalancer.isFailoverEnabled()).toBe(true)

      loadBalancer.setFailoverEnabled(false)
      expect(loadBalancer.isFailoverEnabled()).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should return load balancer statistics', () => {
      loadBalancer.setStrategy('weighted')
      loadBalancer.markProviderFailed('provider1')
      loadBalancer.selectProvider(mockProviders)

      const stats = loadBalancer.getStatistics()

      expect(stats.strategy).toBe('weighted')
      expect(stats.failoverEnabled).toBe(true)
      expect(stats.failedProvidersCount).toBe(1)
      expect(stats.lastSelectedProvider).not.toBeNull()
    })
  })

  describe('health-aware filtering', () => {
    it('should exclude unhealthy providers when configured', () => {
      healthMonitor.setProviders(mockProviders)
      loadBalancer.setHealthMonitor(healthMonitor)
      loadBalancer.updateConfig({ excludeUnhealthy: true })

      // Mark provider1 as unhealthy
      const health1 = healthMonitor.getProviderHealth('provider1')
      if (health1) {
        health1.status = 'unhealthy'
      }

      const result = loadBalancer.selectProvider(mockProviders)
      expect(result?.provider.id).not.toBe('provider1')
    })

    it('should prefer healthy providers when configured', () => {
      healthMonitor.setProviders(mockProviders)
      loadBalancer.setHealthMonitor(healthMonitor)
      loadBalancer.updateConfig({ preferHealthy: true })

      // Mark provider1 as healthy, others as degraded
      const health1 = healthMonitor.getProviderHealth('provider1')
      if (health1) {
        health1.status = 'healthy'
      }

      const health2 = healthMonitor.getProviderHealth('provider2')
      if (health2) {
        health2.status = 'degraded'
      }

      const health3 = healthMonitor.getProviderHealth('provider3')
      if (health3) {
        health3.status = 'degraded'
      }

      // Run multiple selections
      const selections = new Map<string, number>()
      for (let i = 0; i < 50; i++) {
        const result = loadBalancer.selectProvider(mockProviders)
        if (result) {
          const count = selections.get(result.provider.id) || 0
          selections.set(result.provider.id, count + 1)
        }
      }

      // Provider1 should be selected more often
      const provider1Count = selections.get('provider1') || 0
      expect(provider1Count).toBeGreaterThan(0)
    })
  })
})

describe('createLoadBalancer', () => {
  it('should create load balancer with health monitor', async () => {
    const { createLoadBalancer } = await import('../../src/utils/load-balancer')
    const healthMonitor = new ProviderHealthMonitor()

    const loadBalancer = createLoadBalancer(healthMonitor, {
      strategy: 'round-robin',
    })

    expect(loadBalancer).toBeInstanceOf(LoadBalancer)
    expect(loadBalancer.getStrategy()).toBe('round-robin')
  })
})

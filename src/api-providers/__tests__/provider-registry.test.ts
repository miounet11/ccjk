/**
 * Provider Registry Tests
 */

import { ProviderRegistry } from '../core/provider-registry'
import { Provider302AI } from '../providers/302ai'
import { ProviderGLM } from '../providers/glm'

describe('providerRegistry', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = ProviderRegistry.getInstance()
    registry.clear()
  })

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new Provider302AI()
      registry.register(provider)

      expect(registry.hasProvider('302ai')).toBe(true)
      expect(registry.getProvider('302ai')).toBe(provider)
    })

    it('should register provider with metadata', () => {
      const provider = new Provider302AI()
      registry.register(provider, {
        popular: true,
        setupTime: '30 seconds',
        difficulty: 'easy',
      })

      const metadata = registry.getMetadata('302ai')
      expect(metadata?.popular).toBe(true)
      expect(metadata?.setupTime).toBe('30 seconds')
      expect(metadata?.difficulty).toBe('easy')
    })

    it('should allow multiple providers', () => {
      registry.register(new Provider302AI())
      registry.register(new ProviderGLM())

      expect(registry.getAllProviders()).toHaveLength(2)
    })
  })

  describe('getProvider', () => {
    it('should return provider by id', () => {
      const provider = new Provider302AI()
      registry.register(provider)

      const retrieved = registry.getProvider('302ai')
      expect(retrieved).toBe(provider)
    })

    it('should return undefined for non-existent provider', () => {
      expect(registry.getProvider('non-existent')).toBeUndefined()
    })
  })

  describe('getPopularProviders', () => {
    it('should return only popular providers', () => {
      registry.register(new Provider302AI(), { popular: true })
      registry.register(new ProviderGLM(), { popular: false })

      const popular = registry.getPopularProviders()
      expect(popular).toHaveLength(1)
      expect(popular[0].id).toBe('302ai')
    })

    it('should return empty array when no popular providers', () => {
      registry.register(new Provider302AI(), { popular: false })

      const popular = registry.getPopularProviders()
      expect(popular).toHaveLength(0)
    })
  })

  describe('searchProviders', () => {
    beforeEach(() => {
      registry.register(new Provider302AI())
      registry.register(new ProviderGLM())
    })

    it('should find providers by name', () => {
      const results = registry.searchProviders('302')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('302ai')
    })

    it('should find providers by description', () => {
      const results = registry.searchProviders('chinese')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      const results = registry.searchProviders('GLM')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('glm')
    })

    it('should return empty array for no matches', () => {
      const results = registry.searchProviders('nonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('unregister', () => {
    it('should remove a provider', () => {
      registry.register(new Provider302AI())
      expect(registry.hasProvider('302ai')).toBe(true)

      registry.unregister('302ai')
      expect(registry.hasProvider('302ai')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all providers', () => {
      registry.register(new Provider302AI())
      registry.register(new ProviderGLM())
      expect(registry.getAllProviders()).toHaveLength(2)

      registry.clear()
      expect(registry.getAllProviders()).toHaveLength(0)
    })
  })
})

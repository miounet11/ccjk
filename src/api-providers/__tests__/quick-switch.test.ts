/**
 * Quick Switch Tests
 */

import type { ProviderSetup } from '../core/provider-interface'
import type { QuickSwitch } from '../wizard/quick-switch'
import { providerRegistry } from '../core/provider-registry'
import { Provider302AI } from '../providers/302ai'
import { ProviderGLM } from '../providers/glm'
import { createQuickSwitch } from '../wizard/quick-switch'

describe('quickSwitch', () => {
  let quickSwitch: QuickSwitch
  let setup302ai: ProviderSetup
  let setupGLM: ProviderSetup

  beforeEach(() => {
    quickSwitch = createQuickSwitch()

    // Register providers in registry for import tests
    const provider302ai = new Provider302AI()
    const providerGLM = new ProviderGLM()

    providerRegistry.register(provider302ai)
    providerRegistry.register(providerGLM)

    setup302ai = {
      provider: provider302ai.getConfig(),
      credentials: { apiKey: 'sk-302ai-test-key' },
      model: 'claude-3-5-sonnet-20241022',
    }

    setupGLM = {
      provider: providerGLM.getConfig(),
      credentials: { apiKey: 'glm-test-key' },
      model: 'glm-4-plus',
    }
  })

  afterEach(() => {
    // Clean up registry after tests
    providerRegistry.unregister('302ai')
    providerRegistry.unregister('glm')
  })

  describe('saveProvider', () => {
    it('should save a provider', () => {
      quickSwitch.saveProvider(setup302ai)
      expect(quickSwitch.hasProvider('302ai')).toBe(true)
    })

    it('should save provider with nickname', () => {
      quickSwitch.saveProvider(setup302ai, 'My 302.AI')
      const saved = quickSwitch.getSavedProviders()
      expect(saved[0].nickname).toBe('My 302.AI')
    })

    it('should update lastUsed timestamp', () => {
      quickSwitch.saveProvider(setup302ai)
      const saved = quickSwitch.getSavedProviders()
      expect(saved[0].lastUsed).toBeInstanceOf(Date)
    })
  })

  describe('getSavedProviders', () => {
    it('should return empty array when no providers saved', () => {
      const saved = quickSwitch.getSavedProviders()
      expect(saved).toHaveLength(0)
    })

    it('should return all saved providers', () => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.saveProvider(setupGLM)

      const saved = quickSwitch.getSavedProviders()
      expect(saved).toHaveLength(2)
    })

    it('should sort by last used (most recent first)', () => {
      quickSwitch.saveProvider(setup302ai)
      setTimeout(() => {
        quickSwitch.saveProvider(setupGLM)
        const saved = quickSwitch.getSavedProviders()
        expect(saved[0].id).toBe('glm')
      }, 10)
    })
  })

  describe('switchTo', () => {
    beforeEach(() => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.saveProvider(setupGLM)
    })

    it('should switch to a saved provider', () => {
      const setup = quickSwitch.switchTo('302ai')
      expect(setup.provider.id).toBe('302ai')
    })

    it('should update lastUsed timestamp', () => {
      const before = new Date()
      quickSwitch.switchTo('302ai')
      const saved = quickSwitch.getSavedProviders().find(p => p.id === '302ai')
      expect(saved!.lastUsed.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('should throw error for non-existent provider', () => {
      expect(() => quickSwitch.switchTo('non-existent')).toThrow()
    })
  })

  describe('getCurrentProvider', () => {
    it('should return undefined when no provider selected', () => {
      expect(quickSwitch.getCurrentProvider()).toBeUndefined()
    })

    it('should return current provider after switch', () => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.switchTo('302ai')

      const current = quickSwitch.getCurrentProvider()
      expect(current?.id).toBe('302ai')
    })
  })

  describe('removeProvider', () => {
    beforeEach(() => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.saveProvider(setupGLM)
    })

    it('should remove a provider', () => {
      quickSwitch.removeProvider('302ai')
      expect(quickSwitch.hasProvider('302ai')).toBe(false)
    })

    it('should clear current provider if removed', () => {
      quickSwitch.switchTo('302ai')
      quickSwitch.removeProvider('302ai')
      expect(quickSwitch.getCurrentProvider()).toBeUndefined()
    })
  })

  describe('setNickname', () => {
    it('should set provider nickname', () => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.setNickname('302ai', 'My Favorite')

      const saved = quickSwitch.getSavedProviders().find(p => p.id === '302ai')
      expect(saved?.nickname).toBe('My Favorite')
    })
  })

  describe('getRecentProviders', () => {
    it('should return recent providers', () => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.saveProvider(setupGLM)

      const recent = quickSwitch.getRecentProviders(1)
      expect(recent).toHaveLength(1)
    })

    it('should default to 5 providers', () => {
      for (let i = 0; i < 10; i++) {
        quickSwitch.saveProvider({
          ...setup302ai,
          provider: { ...setup302ai.provider, id: `provider-${i}` },
        })
      }

      const recent = quickSwitch.getRecentProviders()
      expect(recent.length).toBeLessThanOrEqual(5)
    })
  })

  describe('export and import', () => {
    beforeEach(() => {
      quickSwitch.saveProvider(setup302ai, 'My 302.AI')
      quickSwitch.saveProvider(setupGLM)
    })

    it('should export without credentials by default', () => {
      const exported = quickSwitch.export()
      const data = JSON.parse(exported)

      expect(data).toHaveLength(2)
      expect(data[0].setup.credentials).toBeUndefined()
    })

    it('should export with credentials when requested', () => {
      const exported = quickSwitch.export(true)
      const data = JSON.parse(exported)

      expect(data[0].setup.credentials).toBeDefined()
    })

    it('should import providers', async () => {
      const exported = quickSwitch.export(true)
      const newSwitch = createQuickSwitch()

      await newSwitch.import(exported)
      expect(newSwitch.getCount()).toBe(2)
    })

    it('should preserve nicknames on import', async () => {
      const exported = quickSwitch.export(true)
      const newSwitch = createQuickSwitch()

      await newSwitch.import(exported)
      const saved = newSwitch.getSavedProviders().find(p => p.id === '302ai')
      expect(saved?.nickname).toBe('My 302.AI')
    })
  })

  describe('clear', () => {
    it('should clear all providers', () => {
      quickSwitch.saveProvider(setup302ai)
      quickSwitch.saveProvider(setupGLM)
      quickSwitch.switchTo('302ai')

      quickSwitch.clear()

      expect(quickSwitch.getCount()).toBe(0)
      expect(quickSwitch.getCurrentProvider()).toBeUndefined()
    })
  })

  describe('getQuickSwitchMenu', () => {
    beforeEach(() => {
      quickSwitch.saveProvider(setup302ai, 'My 302.AI')
      quickSwitch.saveProvider(setupGLM)
      quickSwitch.switchTo('302ai')
    })

    it('should return menu data', () => {
      const menu = quickSwitch.getQuickSwitchMenu()
      expect(menu).toHaveLength(2)
    })

    it('should use nickname in label', () => {
      const menu = quickSwitch.getQuickSwitchMenu()
      const item = menu.find(m => m.id === '302ai')
      expect(item?.label).toBe('My 302.AI')
    })

    it('should mark current provider', () => {
      const menu = quickSwitch.getQuickSwitchMenu()
      const current = menu.find(m => m.isCurrent)
      expect(current?.id).toBe('302ai')
    })

    it('should include model in description', () => {
      const menu = quickSwitch.getQuickSwitchMenu()
      const item = menu.find(m => m.id === '302ai')
      expect(item?.description).toContain('claude-3-5-sonnet-20241022')
    })
  })
})

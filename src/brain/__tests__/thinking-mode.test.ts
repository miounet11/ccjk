/**
 * Tests for the Thinking Mode Manager
 *
 * @module brain/__tests__/thinking-mode.test
 */

import type { ThinkingModeSettings } from '../../types/thinking'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createThinkingSettings,
  DEFAULT_BUDGET_TOKENS,
  DEFAULT_THINKING_CONFIG,
  getThinkingManager,
  MAX_BUDGET_TOKENS,
  migrateLegacySettings,
  MIN_BUDGET_TOKENS,
  resetThinkingManager,
  shouldUseThinkingMode,
  THINKING_SUPPORTED_MODELS,
  ThinkingModeManager,
  validateThinkingConfig,
} from '../thinking-mode'

// Mock i18n - use vi.hoisted to ensure mockI18n is available when mock is hoisted
const mockI18n = vi.hoisted(() => ({ language: 'en' }))
vi.mock('../../i18n', () => ({
  ensureI18nInitialized: vi.fn().mockResolvedValue(undefined),
  i18n: mockI18n,
}))

// Mock json-config utilities
const mockConfigData: Record<string, any> = {}

vi.mock('../../utils/json-config', () => ({
  readJsonConfig: vi.fn((path: string) => {
    return mockConfigData[path] || {}
  }),
  writeJsonConfig: vi.fn((path: string, data: any) => {
    mockConfigData[path] = data
  }),
}))

describe('thinkingModeManager', () => {
  let manager: ThinkingModeManager

  beforeEach(() => {
    vi.clearAllMocks()
    resetThinkingManager()
    // Clear mock config data
    Object.keys(mockConfigData).forEach(key => delete mockConfigData[key])

    // Set up default config
    mockConfigData['/test/settings.json'] = {
      thinking: DEFAULT_THINKING_CONFIG,
    }

    manager = getThinkingManager('/test/settings.json')
  })

  afterEach(() => {
    resetThinkingManager()
  })

  // ===========================================================================
  // Normal Flow Tests
  // ===========================================================================

  describe('normal Flow', () => {
    it('should create manager with default config', () => {
      const defaultManager = new ThinkingModeManager()

      expect(defaultManager).toBeDefined()
      expect(defaultManager.getConfig()).toEqual(DEFAULT_THINKING_CONFIG)
    })

    it('should load configuration from file', () => {
      const customConfig = {
        enabled: false,
        budgetTokens: 15000,
        inheritForSubAgents: false,
        subAgentReduction: 0.3,
        alwaysUseThinking: true,
      }

      mockConfigData['/custom/settings.json'] = {
        thinking: customConfig,
      }

      const customManager = new ThinkingModeManager('/custom/settings.json')

      expect(customManager.isEnabled()).toBe(false)
      expect(customManager.getBudgetTokens()).toBe(15000)
      expect(customManager.isInheritForSubAgents()).toBe(false)
      expect(customManager.getSubAgentReduction()).toBe(0.3)
      expect(customManager.isAlwaysUseThinking()).toBe(true)
    })

    it('should merge defaults when config is missing fields', () => {
      mockConfigData['/partial/settings.json'] = {
        thinking: {
          enabled: true,
          // Missing other fields - should use defaults
        },
      }

      const partialManager = new ThinkingModeManager('/partial/settings.json')

      expect(partialManager.isEnabled()).toBe(true)
      expect(partialManager.getBudgetTokens()).toBe(DEFAULT_BUDGET_TOKENS)
      expect(partialManager.isInheritForSubAgents()).toBe(DEFAULT_THINKING_CONFIG.inheritForSubAgents)
    })

    it('should get current config', () => {
      const config = manager.getConfig()

      expect(config).toEqual(DEFAULT_THINKING_CONFIG)
      // Should be a copy, not reference
      expect(config).not.toBe(DEFAULT_THINKING_CONFIG)
    })

    it('should check if thinking mode is enabled', () => {
      expect(manager.isEnabled()).toBe(true)

      manager.setEnabled(false)
      expect(manager.isEnabled()).toBe(false)
    })

    it('should get budget tokens', () => {
      expect(manager.getBudgetTokens()).toBe(DEFAULT_BUDGET_TOKENS)
    })

    it('should get sub-agent reduction factor', () => {
      expect(manager.getSubAgentReduction()).toBe(DEFAULT_THINKING_CONFIG.subAgentReduction)
    })

    it('should check if sub-agents inherit thinking mode', () => {
      expect(manager.isInheritForSubAgents()).toBe(true)

      manager.setInheritForSubAgents(false)
      expect(manager.isInheritForSubAgents()).toBe(false)
    })

    it('should get sub-agent budget', () => {
      const subAgentBudget = manager.calculateSubAgentBudget()

      expect(subAgentBudget).toBe(Math.floor(DEFAULT_BUDGET_TOKENS * DEFAULT_THINKING_CONFIG.subAgentReduction))
    })

    it('should check if always using thinking mode', () => {
      expect(manager.isAlwaysUseThinking()).toBe(false)

      manager.setAlwaysUseThinking(true)
      expect(manager.isAlwaysUseThinking()).toBe(true)
    })

    it('should get thinking mode status', () => {
      const status = manager.getStatus()

      expect(status).toBeDefined()
      expect(status.enabled).toBe(true)
      expect(status.budgetTokens).toBe(DEFAULT_BUDGET_TOKENS)
      expect(status.inheritForSubAgents).toBe(true)
      expect(status.subAgentBudget).toBe(Math.floor(DEFAULT_BUDGET_TOKENS * 0.5))
      expect(status.alwaysUseThinking).toBe(false)
      expect(status.supportedModels).toEqual(THINKING_SUPPORTED_MODELS)
      expect(status.summary).toContain('Thinking Mode enabled')
    })
  })

  // ===========================================================================
  // Budget Token Tests
  // ===========================================================================

  describe('budget Token Management', () => {
    it('should set valid budget tokens', () => {
      const result = manager.setBudgetTokens(50000)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(manager.getBudgetTokens()).toBe(50000)
    })

    it('should reject budget tokens below minimum', () => {
      const result = manager.setBudgetTokens(MIN_BUDGET_TOKENS - 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain(`at least ${MIN_BUDGET_TOKENS}`)
      expect(manager.getBudgetTokens()).toBe(DEFAULT_BUDGET_TOKENS) // Unchanged
    })

    it('should reject budget tokens above maximum', () => {
      const result = manager.setBudgetTokens(MAX_BUDGET_TOKENS + 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain(`cannot exceed ${MAX_BUDGET_TOKENS}`)
      expect(manager.getBudgetTokens()).toBe(DEFAULT_BUDGET_TOKENS) // Unchanged
    })

    it('should accept minimum boundary value', () => {
      const result = manager.setBudgetTokens(MIN_BUDGET_TOKENS)

      expect(result.success).toBe(true)
      expect(manager.getBudgetTokens()).toBe(MIN_BUDGET_TOKENS)
    })

    it('should accept maximum boundary value', () => {
      const result = manager.setBudgetTokens(MAX_BUDGET_TOKENS)

      expect(result.success).toBe(true)
      expect(manager.getBudgetTokens()).toBe(MAX_BUDGET_TOKENS)
    })

    it('should calculate sub-agent budget correctly', () => {
      manager.setBudgetTokens(20000)
      manager.setSubAgentReduction(0.5)

      expect(manager.calculateSubAgentBudget()).toBe(10000)
    })

    it('should calculate sub-agent budget with reduction factor', () => {
      manager.setSubAgentReduction(0.3)

      const subAgentBudget = manager.calculateSubAgentBudget()

      expect(subAgentBudget).toBe(Math.floor(DEFAULT_BUDGET_TOKENS * 0.3))
    })

    it('should floor sub-agent budget calculation', () => {
      manager.setBudgetTokens(10001)
      manager.setSubAgentReduction(0.5)

      expect(manager.calculateSubAgentBudget()).toBe(5000)
    })
  })

  // ===========================================================================
  // Sub-Agent Reduction Tests
  // ===========================================================================

  describe('sub-Agent Reduction', () => {
    it('should set valid reduction factor', () => {
      const result = manager.setSubAgentReduction(0.7)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(manager.getSubAgentReduction()).toBe(0.7)
    })

    it('should reject reduction factor below 0.1', () => {
      const result = manager.setSubAgentReduction(0.05)

      expect(result.success).toBe(false)
      expect(result.error).toContain('between 0.1 and 1.0')
      expect(manager.getSubAgentReduction()).toBe(DEFAULT_THINKING_CONFIG.subAgentReduction)
    })

    it('should reject reduction factor above 1.0', () => {
      const result = manager.setSubAgentReduction(1.5)

      expect(result.success).toBe(false)
      expect(result.error).toContain('between 0.1 and 1.0')
      expect(manager.getSubAgentReduction()).toBe(DEFAULT_THINKING_CONFIG.subAgentReduction)
    })

    it('should accept boundary values for reduction factor', () => {
      let result = manager.setSubAgentReduction(0.1)
      expect(result.success).toBe(true)

      result = manager.setSubAgentReduction(1.0)
      expect(result.success).toBe(true)
    })

    it('should handle reduction factor with high precision', () => {
      const result = manager.setSubAgentReduction(0.333333)

      expect(result.success).toBe(true)
      expect(manager.getSubAgentReduction()).toBe(0.333333)
    })
  })

  // ===========================================================================
  // Model Support Tests
  // ===========================================================================

  describe('model Support', () => {
    it('should identify supported models', () => {
      expect(manager.isModelSupported('claude-3-7-opus-20250219')).toBe(true)
      expect(manager.isModelSupported('claude-opus-4')).toBe(true)
      expect(manager.isModelSupported('opus-4')).toBe(true)
      expect(manager.isModelSupported('claude-3-5-sonnet-20241022')).toBe(true)
    })

    it('should identify unsupported models', () => {
      expect(manager.isModelSupported('claude-3-haiku-20240307')).toBe(false)
      expect(manager.isModelSupported('gpt-4')).toBe(false)
      expect(manager.isModelSupported('unknown-model')).toBe(false)
    })

    it('should support partial model matching', () => {
      expect(manager.isModelSupported('claude-3-7-opus-20250219')).toBe(true)
      expect(manager.isModelSupported('claude-3-5-sonnet-20240620')).toBe(true)
    })
  })

  // ===========================================================================
  // CLI Flags Generation Tests
  // ===========================================================================

  describe('cLI Flags Generation', () => {
    it('should generate flags when enabled', () => {
      manager.setEnabled(true)
      manager.setBudgetTokens(30000)

      const flags = manager.generateCliFlags()

      expect(flags).toContain('--thinking-budget-tokens=30000')
      expect(flags).toContain('--thinking=true')
    })

    it('should return empty array when disabled', () => {
      manager.setEnabled(false)

      const flags = manager.generateCliFlags()

      expect(flags).toEqual([])
    })

    it('should include budget tokens in flags', () => {
      manager.setBudgetTokens(50000)

      const flags = manager.generateCliFlags()

      expect(flags).toContain('--thinking-budget-tokens=50000')
    })
  })

  // ===========================================================================
  // Configuration Management Tests
  // ===========================================================================

  describe('configuration Management', () => {
    it('should save configuration', () => {
      manager.setEnabled(false)
      manager.setBudgetTokens(15000)

      // Config should be saved (check via mock)
      expect(mockConfigData['/test/settings.json'].thinking.enabled).toBe(false)
      expect(mockConfigData['/test/settings.json'].thinking.budgetTokens).toBe(15000)
    })

    it('should reset to defaults', () => {
      manager.setEnabled(false)
      manager.setBudgetTokens(50000)

      manager.resetToDefaults()

      expect(manager.isEnabled()).toBe(DEFAULT_THINKING_CONFIG.enabled)
      expect(manager.getBudgetTokens()).toBe(DEFAULT_THINKING_CONFIG.budgetTokens)
    })

    it('should merge partial configuration', () => {
      manager.mergeConfig({
        enabled: false,
        budgetTokens: 25000,
      })

      expect(manager.isEnabled()).toBe(false)
      expect(manager.getBudgetTokens()).toBe(25000)
      expect(manager.isInheritForSubAgents()).toBe(DEFAULT_THINKING_CONFIG.inheritForSubAgents)
    })
  })

  // ===========================================================================
  // Utility Function Tests
  // ===========================================================================

  describe('utility Functions', () => {
    it('should get global thinking manager', () => {
      const global1 = getThinkingManager()
      const global2 = getThinkingManager()

      expect(global1).toBe(global2)
    })

    it('should reset global thinking manager', () => {
      const global1 = getThinkingManager()
      resetThinkingManager()
      const global2 = getThinkingManager()

      expect(global1).not.toBe(global2)
    })

    it('should determine when to use thinking mode', () => {
      manager.setEnabled(true)

      expect(shouldUseThinkingMode('complex')).toBe(true)
      expect(shouldUseThinkingMode('medium')).toBe(true)
      expect(shouldUseThinkingMode('simple')).toBe(false)
    })

    it('should not use thinking mode when disabled', () => {
      manager.setEnabled(false)

      expect(shouldUseThinkingMode('complex')).toBe(false)
      expect(shouldUseThinkingMode('medium')).toBe(false)
      expect(shouldUseThinkingMode('simple')).toBe(false)
    })

    it('should always use thinking mode when configured', () => {
      manager.setEnabled(true)
      manager.setAlwaysUseThinking(true)

      expect(shouldUseThinkingMode('simple')).toBe(true)
      expect(shouldUseThinkingMode('medium')).toBe(true)
      expect(shouldUseThinkingMode('complex')).toBe(true)
    })

    it('should check model support for thinking mode', () => {
      manager.setEnabled(true)

      expect(shouldUseThinkingMode('complex', 'claude-3-7-opus-20250219')).toBe(true)
      expect(shouldUseThinkingMode('complex', 'gpt-4')).toBe(false)
    })

    it('should create thinking settings', () => {
      const settings = createThinkingSettings(true, 25000)

      expect(settings.thinking.enabled).toBe(true)
      expect(settings.thinking.budgetTokens).toBe(25000)
      expect(settings.thinking.inheritForSubAgents).toBe(DEFAULT_THINKING_CONFIG.inheritForSubAgents)
    })

    it('should create default thinking settings', () => {
      const settings = createThinkingSettings()

      expect(settings.thinking.enabled).toBe(true)
      expect(settings.thinking.budgetTokens).toBe(DEFAULT_BUDGET_TOKENS)
    })
  })

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('validation', () => {
    it('should validate correct configuration', () => {
      const config: Partial<ThinkingModeSettings> = {
        enabled: true,
        budgetTokens: 20000,
        subAgentReduction: 0.5,
      }

      const result = validateThinkingConfig(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate budget tokens out of range', () => {
      const config: Partial<ThinkingModeSettings> = {
        budgetTokens: MIN_BUDGET_TOKENS - 1,
      }

      const result = validateThinkingConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('at least')
    })

    it('should validate sub-agent reduction out of range', () => {
      const config: Partial<ThinkingModeSettings> = {
        subAgentReduction: 1.5,
      }

      const result = validateThinkingConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('between 0.1 and 1.0')
    })

    it('should return multiple validation errors', () => {
      const config: Partial<ThinkingModeSettings> = {
        budgetTokens: 500,
        subAgentReduction: 2.0,
      }

      const result = validateThinkingConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(2)
    })

    it('should validate empty configuration', () => {
      const result = validateThinkingConfig({})

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  // ===========================================================================
  // Legacy Migration Tests
  // ===========================================================================

  describe('legacy Migration', () => {
    it('should migrate legacy enabled setting', () => {
      const legacySettings = {
        thinkingModeEnabled: true,
        thinkingBudget: 15000,
      }

      const migrated = migrateLegacySettings(legacySettings)

      expect(migrated).not.toBeNull()
      expect(migrated?.enabled).toBe(true)
      expect(migrated?.budgetTokens).toBe(15000)
    })

    it('should migrate legacy underscore settings', () => {
      const legacySettings = {
        thinking_enabled: false,
        thinking_budget: 10000,
      }

      const migrated = migrateLegacySettings(legacySettings)

      expect(migrated).not.toBeNull()
      expect(migrated?.enabled).toBe(false)
      expect(migrated?.budgetTokens).toBe(10000)
    })

    it('should use defaults when legacy settings are missing', () => {
      const legacySettings = {
        thinkingModeEnabled: true,
        // No budget specified
      }

      const migrated = migrateLegacySettings(legacySettings)

      expect(migrated).not.toBeNull()
      expect(migrated?.enabled).toBe(true)
      expect(migrated?.budgetTokens).toBe(DEFAULT_BUDGET_TOKENS)
    })

    it('should return null when no legacy settings exist', () => {
      const legacySettings = {
        someOtherSetting: 'value',
      }

      const migrated = migrateLegacySettings(legacySettings)

      expect(migrated).toBeNull()
    })

    it('should return null for empty settings', () => {
      const migrated = migrateLegacySettings({})

      expect(migrated).toBeNull()
    })
  })

  // ===========================================================================
  // Status Display Tests
  // ===========================================================================

  describe('status Display', () => {
    it('should show enabled status summary', () => {
      manager.setEnabled(true)

      const status = manager.getStatus()

      expect(status.summary).toContain('enabled')
      expect(status.summary).toContain(String(DEFAULT_BUDGET_TOKENS))
    })

    it('should show disabled status summary', () => {
      manager.setEnabled(false)

      const status = manager.getStatus()

      expect(status.summary).toContain('disabled')
    })

    it('should show Chinese summary when i18n is zh-CN', () => {
      // Temporarily change language to zh-CN
      const originalLanguage = mockI18n.language
      mockI18n.language = 'zh-CN'

      manager.setEnabled(true)

      const status = manager.getStatus()

      expect(status.summary).toContain('Thinking Mode')
      expect(status.summary).toContain('tokens')

      // Restore original language
      mockI18n.language = originalLanguage
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge Cases', () => {
    it('should handle zero budget tokens gracefully', () => {
      const result = manager.setBudgetTokens(0)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle negative reduction factor', () => {
      const result = manager.setSubAgentReduction(-0.5)

      expect(result.success).toBe(false)
      expect(result.error).toContain('between 0.1 and 1.0')
    })

    it('should handle very large budget tokens', () => {
      const result = manager.setBudgetTokens(Number.MAX_SAFE_INTEGER)

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot exceed')
    })

    it('should handle rounding edge cases for sub-agent budget', () => {
      manager.setBudgetTokens(3333)
      manager.setSubAgentReduction(0.33)

      const subBudget = manager.calculateSubAgentBudget()

      expect(subBudget).toBe(Math.floor(3333 * 0.33))
    })

    it('should handle sub-agent budget at reduction factor boundary', () => {
      manager.setBudgetTokens(10000)

      manager.setSubAgentReduction(1.0)
      expect(manager.calculateSubAgentBudget()).toBe(10000)

      manager.setSubAgentReduction(0.1)
      expect(manager.calculateSubAgentBudget()).toBe(1000)
    })
  })

  // ===========================================================================
  // Concurrent Access Tests
  // ===========================================================================

  describe('concurrent Access', () => {
    it('should handle concurrent config reads', () => {
      const configs = Array.from({ length: 10 }, () => manager.getConfig())

      expect(configs).toHaveLength(10)
      configs.forEach((config) => {
        expect(config).toEqual(DEFAULT_THINKING_CONFIG)
      })
    })

    it('should handle concurrent status checks', () => {
      const statuses = Array.from({ length: 10 }, () => manager.getStatus())

      expect(statuses).toHaveLength(10)
      statuses.forEach((status) => {
        expect(status.enabled).toBe(true)
      })
    })

    it('should handle multiple manager instances with same config path', () => {
      const manager1 = new ThinkingModeManager('/test/settings.json')
      const manager2 = new ThinkingModeManager('/test/settings.json')

      expect(manager1.getConfig()).toEqual(manager2.getConfig())
    })
  })
})

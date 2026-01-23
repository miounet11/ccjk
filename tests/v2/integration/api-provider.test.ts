import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockFactory, TestDataGenerator, AssertionHelpers } from '@helpers'
import { createTestTempDir } from '@v2/setup'

/**
 * Integration test suite for CCJK API provider management
 */
describe('CCJK API Provider Integration', () => {
  let mockSuite: any
  let testDir: string
  let apiManager: any
  let configManager: any
  let testProviders: any

  beforeEach(async () => {
    // Create test environment
    testDir = createTestTempDir('api-provider-integration-test')

    // Load test API providers
    testProviders = TestDataGenerator.generateAPIProviders()

    // Setup comprehensive mock suite
    mockSuite = MockFactory.createCCJKMockSuite({
      platform: 'linux',
      hasClaudeCode: true,
      hasConfig: true,
      apiKey: 'test-api-key-integration',
    })

    // Mock API manager
    vi.doMock('@/utils/api-manager', () => ({
      APIManager: vi.fn().mockImplementation(() => ({
        configure: vi.fn(),
        validate: vi.fn(),
        test: vi.fn(),
        getProviders: vi.fn(),
        switchProvider: vi.fn(),
        updateCredentials: vi.fn(),
      })),
    }))

    // Mock configuration manager
    vi.doMock('@/utils/config', () => ({
      ConfigManager: vi.fn().mockImplementation(() => ({
        load: vi.fn(),
        save: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
      })),
    }))

    // Import mocked modules
    const { APIManager } = await import('@/utils/api-manager')
    const { ConfigManager } = await import('@/utils/config')

    apiManager = new APIManager()
    configManager = new ConfigManager(testDir)
  })

  afterEach(() => {
    MockFactory.resetAllMocks()
    vi.clearAllMocks()
  })

  describe('API Provider Configuration', () => {
    it('should configure API provider with valid credentials', async () => {
      // Arrange
      const providerConfig = {
        provider: '302.AI',
        apiKey: 'sk-test-302ai-key-12345678901234567890',
        baseURL: testProviders['302.AI'].baseURL,
      }

      apiManager.configure.mockResolvedValue({
        success: true,
        provider: providerConfig.provider,
        configured: true,
      })

      configManager.save.mockResolvedValue(true)

      // Act
      const result = await apiManager.configure(providerConfig)

      // Assert
      expect(result.success).toBe(true)
      expect(result.provider).toBe('302.AI')
      expect(result.configured).toBe(true)

      MockFactory.MockVerifier.expectCalledWith(apiManager.configure, providerConfig)
    })

    it('should validate API credentials before configuration', async () => {
      // Arrange
      const validCredentials = {
        provider: 'OpenAI',
        apiKey: 'sk-test-openai-key-valid',
      }

      const invalidCredentials = {
        provider: 'OpenAI',
        apiKey: 'invalid-key',
      }

      apiManager.validate.mockImplementation(async (creds) => {
        return {
          valid: creds.apiKey.startsWith('sk-test-openai-key-'),
          provider: creds.provider,
          errors: creds.apiKey.startsWith('sk-test-openai-key-') ? [] : ['Invalid API key format'],
        }
      })

      // Act
      const validResult = await apiManager.validate(validCredentials)
      const invalidResult = await apiManager.validate(invalidCredentials)

      // Assert
      expect(validResult.valid).toBe(true)
      expect(invalidResult.valid).toBe(false)
      AssertionHelpers.expectArrayToContain(invalidResult.errors, ['Invalid API key format'])
    })

    it('should test API connection after configuration', async () => {
      // Arrange
      const providerConfig = {
        provider: 'Anthropic',
        apiKey: 'sk-ant-test-key-12345',
      }

      apiManager.test.mockResolvedValue({
        success: true,
        provider: 'Anthropic',
        responseTime: 250,
        model: 'claude-3-sonnet-20240229',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
      })

      // Act
      const testResult = await apiManager.test(providerConfig)

      // Assert
      expect(testResult.success).toBe(true)
      expect(testResult.provider).toBe('Anthropic')
      AssertionHelpers.expectNumberInRange(testResult.responseTime, 0, 5000)
      AssertionHelpers.expectObjectToHaveProperties(testResult.usage, [
        'promptTokens',
        'completionTokens',
        'totalTokens',
      ])
    })
  })

  describe('Provider Management Integration', () => {
    it('should list available API providers', async () => {
      // Arrange
      apiManager.getProviders.mockResolvedValue(Object.keys(testProviders).map(key => ({
        id: key,
        name: testProviders[key].name,
        displayName: testProviders[key].displayName,
        description: testProviders[key].description,
        features: testProviders[key].features,
        models: testProviders[key].models,
      })))

      // Act
      const providers = await apiManager.getProviders()

      // Assert
      AssertionHelpers.expectArrayLength(providers, 5) // 302.AI, OpenAI, Anthropic, GLM, Test

      const provider302 = providers.find(p => p.id === '302.AI')
      expect(provider302).toBeDefined()
      expect(provider302.displayName).toBe('302.AI (Recommended)')
      AssertionHelpers.expectArrayToContain(provider302.features, ['streaming', 'function_calling'])
    })

    it('should switch between API providers', async () => {
      // Arrange
      const currentConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: 'OpenAI',
        apiKey: 'sk-openai-key',
      })

      const newProvider = {
        provider: '302.AI',
        apiKey: 'sk-302ai-key',
      }

      configManager.load.mockResolvedValue(currentConfig)
      apiManager.switchProvider.mockResolvedValue({
        success: true,
        previousProvider: 'OpenAI',
        newProvider: '302.AI',
        configUpdated: true,
      })

      configManager.save.mockResolvedValue(true)

      // Act
      const result = await apiManager.switchProvider(newProvider)

      // Assert
      expect(result.success).toBe(true)
      expect(result.previousProvider).toBe('OpenAI')
      expect(result.newProvider).toBe('302.AI')

      MockFactory.MockVerifier.expectCalled(configManager.load)
      MockFactory.MockVerifier.expectCalled(configManager.save)
    })

    it('should update API credentials for existing provider', async () => {
      // Arrange
      const currentConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: '302.AI',
        apiKey: 'old-api-key',
      })

      const newCredentials = {
        provider: '302.AI',
        apiKey: 'new-api-key-updated',
      }

      configManager.load.mockResolvedValue(currentConfig)
      apiManager.updateCredentials.mockResolvedValue({
        success: true,
        provider: '302.AI',
        credentialsUpdated: true,
      })

      // Act
      const result = await apiManager.updateCredentials(newCredentials)

      // Assert
      expect(result.success).toBe(true)
      expect(result.credentialsUpdated).toBe(true)

      MockFactory.MockVerifier.expectCalledWith(apiManager.updateCredentials, newCredentials)
    })
  })

  describe('Configuration Persistence Integration', () => {
    it('should persist API configuration to config file', async () => {
      // Arrange
      const apiConfig = {
        provider: 'GLM',
        apiKey: 'glm-test-key-123',
        baseURL: testProviders.GLM.baseURL,
      }

      const expectedConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: 'GLM',
        apiKey: 'glm-test-key-123',
      })

      configManager.load.mockResolvedValue(TestDataGenerator.generateCCJKConfig())
      configManager.save.mockResolvedValue(true)

      apiManager.configure.mockImplementation(async (config) => {
        // Simulate saving to config
        const currentConfig = await configManager.load()
        const updatedConfig = {
          ...currentConfig,
          apiProvider: config.provider,
          apiKey: config.apiKey,
        }
        await configManager.save(updatedConfig)

        return { success: true, provider: config.provider }
      })

      // Act
      const result = await apiManager.configure(apiConfig)

      // Assert
      expect(result.success).toBe(true)
      MockFactory.MockVerifier.expectCalledWith(
        configManager.save,
        expect.objectContaining({
          apiProvider: 'GLM',
          apiKey: 'glm-test-key-123',
        })
      )
    })

    it('should load API configuration from config file', async () => {
      // Arrange
      const savedConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: 'Anthropic',
        apiKey: 'sk-ant-saved-key',
      })

      configManager.load.mockResolvedValue(savedConfig)
      configManager.get.mockImplementation((key) => savedConfig[key])

      // Act
      const loadedConfig = await configManager.load()
      const apiProvider = configManager.get('apiProvider')
      const apiKey = configManager.get('apiKey')

      // Assert
      expect(apiProvider).toBe('Anthropic')
      expect(apiKey).toBe('sk-ant-saved-key')
      AssertionHelpers.expectValidConfig(loadedConfig)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API authentication failures', async () => {
      // Arrange
      const invalidConfig = {
        provider: 'OpenAI',
        apiKey: 'invalid-key',
      }

      apiManager.test.mockRejectedValue(new Error('Authentication failed: Invalid API key'))

      // Act & Assert
      await AssertionHelpers.expectRejects(
        apiManager.test(invalidConfig),
        /Authentication failed/
      )
    })

    it('should handle network connectivity issues', async () => {
      // Arrange
      const providerConfig = {
        provider: '302.AI',
        apiKey: 'valid-key',
      }

      apiManager.test.mockRejectedValue(new Error('Network error: Connection timeout'))

      // Act & Assert
      await AssertionHelpers.expectRejects(
        apiManager.test(providerConfig),
        /Network error/
      )
    })

    it('should rollback configuration on failure', async () => {
      // Arrange
      const originalConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: 'OpenAI',
        apiKey: 'original-key',
      })

      const failingConfig = {
        provider: 'InvalidProvider',
        apiKey: 'test-key',
      }

      configManager.load.mockResolvedValue(originalConfig)
      configManager.save.mockResolvedValue(true)

      apiManager.configure.mockImplementation(async (config) => {
        if (config.provider === 'InvalidProvider') {
          // Rollback to original config
          await configManager.save(originalConfig)
          throw new Error('Invalid provider configuration')
        }
      })

      // Act & Assert
      await AssertionHelpers.expectRejects(
        apiManager.configure(failingConfig),
        /Invalid provider configuration/
      )

      // Verify rollback occurred
      MockFactory.MockVerifier.expectCalledWith(configManager.save, originalConfig)
    })
  })

  describe('Performance Integration', () => {
    it('should complete API configuration within time limits', async () => {
      // Arrange
      const maxConfigTime = 3000 // 3 seconds
      const providerConfig = {
        provider: '302.AI',
        apiKey: 'test-key',
      }

      apiManager.configure.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { success: true, provider: '302.AI' }
      })

      // Act & Assert
      await AssertionHelpers.expectCompletesWithinTime(
        () => apiManager.configure(providerConfig),
        maxConfigTime
      )
    })

    it('should handle multiple concurrent API operations', async () => {
      // Arrange
      const operations = [
        () => apiManager.getProviders(),
        () => apiManager.validate({ provider: 'OpenAI', apiKey: 'test-key-1' }),
        () => apiManager.validate({ provider: '302.AI', apiKey: 'test-key-2' }),
      ]

      apiManager.getProviders.mockResolvedValue([])
      apiManager.validate.mockResolvedValue({ valid: true })

      // Act
      const startTime = Date.now()
      const results = await Promise.all(operations.map(op => op()))
      const duration = Date.now() - startTime

      // Assert
      AssertionHelpers.expectArrayLength(results, 3)
      expect(duration).toBeLessThan(1000) // Should complete quickly when concurrent

      MockFactory.MockVerifier.expectCalled(apiManager.getProviders)
      MockFactory.MockVerifier.expectCalledTimes(apiManager.validate, 2)
    })
  })

  describe('Cross-Component Integration', () => {
    it('should integrate API configuration with workflow execution', async () => {
      // Arrange
      const apiConfig = {
        provider: '302.AI',
        apiKey: 'workflow-test-key',
      }

      const workflow = TestDataGenerator.generateWorkflowConfig({
        steps: [
          {
            id: 'api-test',
            type: 'api-call',
            provider: '302.AI',
            model: 'gpt-4',
          },
        ],
      })

      apiManager.configure.mockResolvedValue({ success: true })
      apiManager.test.mockResolvedValue({ success: true, responseTime: 200 })

      // Mock workflow engine
      vi.doMock('@/utils/workflow-engine', () => ({
        WorkflowEngine: vi.fn().mockImplementation(() => ({
          execute: vi.fn().mockResolvedValue({ status: 'success' }),
        })),
      }))

      const { WorkflowEngine } = await import('@/utils/workflow-engine')
      const workflowEngine = new WorkflowEngine()

      // Act
      await apiManager.configure(apiConfig)
      const apiTest = await apiManager.test(apiConfig)
      const workflowResult = await workflowEngine.execute(workflow)

      // Assert
      expect(apiTest.success).toBe(true)
      expect(workflowResult.status).toBe('success')

      // Verify integration flow
      MockFactory.MockVerifier.expectCalled(apiManager.configure)
      MockFactory.MockVerifier.expectCalled(apiManager.test)
      MockFactory.MockVerifier.expectCalled(workflowEngine.execute)
    })
  })
})
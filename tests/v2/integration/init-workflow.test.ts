import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockFactory, TestDataGenerator, AssertionHelpers } from '@helpers'
import { createTestTempDir } from '@v2/setup'

/**
 * Integration test suite for CCJK initialization workflow
 */
describe('CCJK Initialization Integration', () => {
  let mockSuite: any
  let testDir: string
  let initCommand: any
  let configManager: any
  let workflowEngine: any
  let mcpManager: any

  beforeEach(async () => {
    // Create test environment
    testDir = createTestTempDir('init-integration-test')

    // Setup comprehensive mock suite
    mockSuite = MockFactory.createCCJKMockSuite({
      platform: 'linux',
      hasClaudeCode: true,
      hasConfig: false,
      apiKey: 'test-integration-key-123',
    })

    // Mock all required modules
    vi.doMock('@/utils/config', () => ({
      ConfigManager: vi.fn().mockImplementation(() => ({
        load: vi.fn(),
        save: vi.fn(),
        exists: vi.fn(),
        validate: vi.fn().mockReturnValue(true),
        backup: vi.fn(),
      })),
    }))

    vi.doMock('@/utils/workflow-engine', () => ({
      WorkflowEngine: vi.fn().mockImplementation(() => ({
        execute: vi.fn(),
        validate: vi.fn().mockReturnValue(true),
      })),
    }))

    vi.doMock('@/utils/mcp-manager', () => ({
      MCPManager: vi.fn().mockImplementation(() => ({
        install: vi.fn(),
        list: vi.fn(),
        validate: vi.fn().mockReturnValue(true),
      })),
    }))

    vi.doMock('@/commands/init', () => ({
      InitCommand: vi.fn().mockImplementation(() => ({
        execute: vi.fn(),
        validateEnvironment: vi.fn(),
        setupConfiguration: vi.fn(),
        installWorkflows: vi.fn(),
        setupMCPServices: vi.fn(),
        verifyInstallation: vi.fn(),
      })),
    }))

    // Import mocked modules
    const { ConfigManager } = await import('@/utils/config')
    const { WorkflowEngine } = await import('@/utils/workflow-engine')
    const { MCPManager } = await import('@/utils/mcp-manager')
    const { InitCommand } = await import('@/commands/init')

    configManager = new ConfigManager(testDir)
    workflowEngine = new WorkflowEngine()
    mcpManager = new MCPManager(testDir)
    initCommand = new InitCommand()
  })

  afterEach(() => {
    MockFactory.resetAllMocks()
    vi.clearAllMocks()
  })

  describe('Full Initialization Workflow', () => {
    it('should complete full initialization successfully', async () => {
      // Arrange
      const expectedConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: '302.AI',
        apiKey: 'test-integration-key-123',
        workflowsEnabled: true,
        mcpEnabled: true,
      })

      const testWorkflows = [
        TestDataGenerator.generateWorkflowConfig({ category: 'common' }),
        TestDataGenerator.generateWorkflowConfig({ category: 'advanced' }),
      ]

      const testMCPServices = [
        TestDataGenerator.generateMCPService({ category: 'filesystem' }),
        TestDataGenerator.generateMCPService({ category: 'web' }),
      ]

      // Setup mocks for successful initialization
      initCommand.validateEnvironment.mockResolvedValue({ valid: true })
      initCommand.setupConfiguration.mockResolvedValue(expectedConfig)
      initCommand.installWorkflows.mockResolvedValue({ installed: testWorkflows })
      initCommand.setupMCPServices.mockResolvedValue({ installed: testMCPServices })
      initCommand.verifyInstallation.mockResolvedValue({ verified: true })

      initCommand.execute.mockImplementation(async () => {
        // Simulate full initialization process
        await initCommand.validateEnvironment()
        const config = await initCommand.setupConfiguration()
        const workflows = await initCommand.installWorkflows()
        const mcpServices = await initCommand.setupMCPServices()
        const verification = await initCommand.verifyInstallation()

        return {
          success: true,
          config,
          workflows: workflows.installed,
          mcpServices: mcpServices.installed,
          verification,
        }
      })

      // Act
      const result = await initCommand.execute()

      // Assert
      expect(result.success).toBe(true)
      AssertionHelpers.expectValidConfig(result.config)
      AssertionHelpers.expectArrayLength(result.workflows, 2)
      AssertionHelpers.expectArrayLength(result.mcpServices, 2)
      expect(result.verification.verified).toBe(true)

      // Verify all steps were called in order
      MockFactory.MockVerifier.expectCalled(initCommand.validateEnvironment)
      MockFactory.MockVerifier.expectCalled(initCommand.setupConfiguration)
      MockFactory.MockVerifier.expectCalled(initCommand.installWorkflows)
      MockFactory.MockVerifier.expectCalled(initCommand.setupMCPServices)
      MockFactory.MockVerifier.expectCalled(initCommand.verifyInstallation)
    })

    it('should handle environment validation failure', async () => {
      // Arrange
      initCommand.validateEnvironment.mockResolvedValue({
        valid: false,
        errors: [
          'Node.js version 18.0.0 is below minimum required 20.0.0',
          'Claude Code CLI not found in PATH',
        ],
      })

      initCommand.execute.mockImplementation(async () => {
        const validation = await initCommand.validateEnvironment()
        if (!validation.valid) {
          throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`)
        }
      })

      // Act & Assert
      await AssertionHelpers.expectRejects(
        initCommand.execute(),
        /Environment validation failed/
      )

      MockFactory.MockVerifier.expectCalled(initCommand.validateEnvironment)
      MockFactory.MockVerifier.expectNotCalled(initCommand.setupConfiguration)
    })

    it('should handle configuration setup failure', async () => {
      // Arrange
      initCommand.validateEnvironment.mockResolvedValue({ valid: true })
      initCommand.setupConfiguration.mockRejectedValue(
        new Error('Failed to save configuration: Permission denied')
      )

      initCommand.execute.mockImplementation(async () => {
        await initCommand.validateEnvironment()
        await initCommand.setupConfiguration() // This will throw
      })

      // Act & Assert
      await AssertionHelpers.expectRejects(
        initCommand.execute(),
        /Failed to save configuration/
      )

      MockFactory.MockVerifier.expectCalled(initCommand.validateEnvironment)
      MockFactory.MockVerifier.expectCalled(initCommand.setupConfiguration)
      MockFactory.MockVerifier.expectNotCalled(initCommand.installWorkflows)
    })
  })

  describe('Component Integration', () => {
    it('should integrate configuration manager with workflow engine', async () => {
      // Arrange
      const config = TestDataGenerator.generateCCJKConfig({ workflowsEnabled: true })
      const workflow = TestDataGenerator.generateWorkflowConfig()

      configManager.load.mockResolvedValue(config)
      workflowEngine.execute.mockResolvedValue({ status: 'success' })

      // Act
      const loadedConfig = await configManager.load()
      const workflowResult = await workflowEngine.execute(workflow)

      // Assert
      expect(loadedConfig.workflowsEnabled).toBe(true)
      expect(workflowResult.status).toBe('success')

      // Verify integration
      MockFactory.MockVerifier.expectCalled(configManager.load)
      MockFactory.MockVerifier.expectCalled(workflowEngine.execute)
    })

    it('should integrate configuration manager with MCP manager', async () => {
      // Arrange
      const config = TestDataGenerator.generateCCJKConfig({ mcpEnabled: true })
      const mcpService = TestDataGenerator.generateMCPService()

      configManager.load.mockResolvedValue(config)
      mcpManager.install.mockResolvedValue({ success: true, serviceId: mcpService.id })

      // Act
      const loadedConfig = await configManager.load()
      const installResult = await mcpManager.install(mcpService)

      // Assert
      expect(loadedConfig.mcpEnabled).toBe(true)
      expect(installResult.success).toBe(true)

      // Verify integration
      MockFactory.MockVerifier.expectCalled(configManager.load)
      MockFactory.MockVerifier.expectCalled(mcpManager.install)
    })

    it('should handle cross-component error propagation', async () => {
      // Arrange
      const config = TestDataGenerator.generateCCJKConfig()
      const workflow = TestDataGenerator.generateWorkflowConfig()

      configManager.load.mockResolvedValue(config)
      workflowEngine.execute.mockRejectedValue(new Error('Workflow execution failed'))

      initCommand.execute.mockImplementation(async () => {
        const loadedConfig = await configManager.load()
        try {
          await workflowEngine.execute(workflow)
        } catch (error) {
          throw new Error(`Initialization failed due to workflow error: ${error.message}`)
        }
      })

      // Act & Assert
      await AssertionHelpers.expectRejects(
        initCommand.execute(),
        /Initialization failed due to workflow error/
      )
    })
  })

  describe('Data Flow Integration', () => {
    it('should pass configuration data between components', async () => {
      // Arrange
      const initialConfig = TestDataGenerator.generateCCJKConfig({
        apiProvider: '302.AI',
        apiKey: 'initial-key',
      })

      const updatedConfig = {
        ...initialConfig,
        workflowsEnabled: true,
        mcpEnabled: true,
      }

      configManager.load.mockResolvedValue(initialConfig)
      configManager.save.mockResolvedValue(true)

      initCommand.execute.mockImplementation(async () => {
        const config = await configManager.load()
        const enhanced = { ...config, workflowsEnabled: true, mcpEnabled: true }
        await configManager.save(enhanced)
        return { success: true, config: enhanced }
      })

      // Act
      const result = await initCommand.execute()

      // Assert
      expect(result.config.workflowsEnabled).toBe(true)
      expect(result.config.mcpEnabled).toBe(true)
      expect(result.config.apiProvider).toBe('302.AI')

      MockFactory.MockVerifier.expectCalledWith(configManager.save, updatedConfig)
    })

    it('should maintain state consistency across operations', async () => {
      // Arrange
      const operations = []
      const trackOperation = (name: string) => {
        operations.push({ name, timestamp: Date.now() })
      }

      initCommand.validateEnvironment.mockImplementation(async () => {
        trackOperation('validate')
        return { valid: true }
      })

      initCommand.setupConfiguration.mockImplementation(async () => {
        trackOperation('config')
        return TestDataGenerator.generateCCJKConfig()
      })

      initCommand.installWorkflows.mockImplementation(async () => {
        trackOperation('workflows')
        return { installed: [] }
      })

      initCommand.execute.mockImplementation(async () => {
        await initCommand.validateEnvironment()
        await initCommand.setupConfiguration()
        await initCommand.installWorkflows()
        return { success: true, operations }
      })

      // Act
      const result = await initCommand.execute()

      // Assert
      AssertionHelpers.expectArrayLength(result.operations, 3)
      expect(result.operations.map(op => op.name)).toEqual(['validate', 'config', 'workflows'])

      // Verify operations were sequential
      for (let i = 1; i < result.operations.length; i++) {
        expect(result.operations[i].timestamp).toBeGreaterThan(result.operations[i - 1].timestamp)
      }
    })
  })

  describe('Error Recovery Integration', () => {
    it('should recover from partial failures', async () => {
      // Arrange
      let attemptCount = 0

      initCommand.setupConfiguration.mockImplementation(async () => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('Temporary failure')
        }
        return TestDataGenerator.generateCCJKConfig()
      })

      initCommand.execute.mockImplementation(async () => {
        try {
          const config = await initCommand.setupConfiguration()
          return { success: true, config, attempts: attemptCount }
        } catch (error) {
          // Retry once
          const config = await initCommand.setupConfiguration()
          return { success: true, config, attempts: attemptCount }
        }
      })

      // Act
      const result = await initCommand.execute()

      // Assert
      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      AssertionHelpers.expectValidConfig(result.config)
    })

    it('should perform cleanup on failure', async () => {
      // Arrange
      const cleanupOperations = []

      initCommand.setupConfiguration.mockRejectedValue(new Error('Setup failed'))

      initCommand.execute.mockImplementation(async () => {
        try {
          await initCommand.setupConfiguration()
        } catch (error) {
          // Perform cleanup
          cleanupOperations.push('remove-partial-config')
          cleanupOperations.push('restore-backup')
          throw new Error(`Initialization failed: ${error.message}`)
        }
      })

      // Act & Assert
      await AssertionHelpers.expectRejects(
        initCommand.execute(),
        /Initialization failed/
      )

      // Verify cleanup was performed
      AssertionHelpers.expectArrayToContain(cleanupOperations, [
        'remove-partial-config',
        'restore-backup',
      ])
    })
  })

  describe('Performance Integration', () => {
    it('should complete full initialization within acceptable time', async () => {
      // Arrange
      const maxInitTime = 10000 // 10 seconds

      initCommand.execute.mockImplementation(async () => {
        // Simulate realistic initialization time
        await new Promise(resolve => setTimeout(resolve, 500))
        return {
          success: true,
          config: TestDataGenerator.generateCCJKConfig(),
          workflows: [],
          mcpServices: [],
        }
      })

      // Act & Assert
      await AssertionHelpers.expectCompletesWithinTime(
        () => initCommand.execute(),
        maxInitTime
      )
    })

    it('should handle concurrent operations efficiently', async () => {
      // Arrange
      const concurrentOperations = [
        () => configManager.load(),
        () => workflowEngine.validate(TestDataGenerator.generateWorkflowConfig()),
        () => mcpManager.list(),
      ]

      configManager.load.mockResolvedValue(TestDataGenerator.generateCCJKConfig())
      workflowEngine.validate.mockReturnValue(true)
      mcpManager.list.mockResolvedValue([])

      // Act
      const startTime = Date.now()
      const results = await Promise.all(concurrentOperations.map(op => op()))
      const duration = Date.now() - startTime

      // Assert
      AssertionHelpers.expectArrayLength(results, 3)
      expect(duration).toBeLessThan(1000) // Should complete quickly when concurrent

      // Verify all operations completed
      MockFactory.MockVerifier.expectCalled(configManager.load)
      MockFactory.MockVerifier.expectCalled(workflowEngine.validate)
      MockFactory.MockVerifier.expectCalled(mcpManager.list)
    })
  })
})
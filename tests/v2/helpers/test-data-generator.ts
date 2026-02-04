import type { CCJKConfig, MCPService, WorkflowConfig } from '@/types'
import { nanoid } from 'nanoid'
import { join } from 'pathe'

/**
 * Test data generator for creating realistic test data
 */
export class TestDataGenerator {
  /**
   * Generate a random test ID
   */
  static generateTestId(prefix = 'test'): string {
    return `${prefix}-${nanoid(8)}`
  }

  /**
   * Generate a test timestamp
   */
  static generateTimestamp(offset = 0): number {
    return Date.now() + offset
  }

  /**
   * Generate a test file path
   */
  static generateFilePath(
    filename: string,
    directory = '/tmp/ccjk-test',
  ): string {
    return join(directory, filename)
  }

  /**
   * Generate a mock CCJK configuration
   */
  static generateCCJKConfig(overrides: Partial<CCJKConfig> = {}): CCJKConfig {
    return {
      version: '6.0.0',
      language: 'en',
      apiProvider: '302.AI',
      apiKey: `test-api-key-${nanoid(16)}`,
      claudeCodePath: '/usr/local/bin/claude-code',
      workflowsEnabled: true,
      mcpEnabled: true,
      cloudSyncEnabled: false,
      telemetryEnabled: false,
      autoUpdateEnabled: true,
      debugMode: false,
      ...overrides,
    }
  }

  /**
   * Generate a mock workflow configuration
   */
  static generateWorkflowConfig(overrides: Partial<WorkflowConfig> = {}): WorkflowConfig {
    const id = this.generateTestId('workflow')
    return {
      id,
      name: `Test Workflow ${id}`,
      description: `Generated test workflow for ${id}`,
      version: '1.0.0',
      category: 'test',
      tags: ['test', 'generated'],
      author: 'CCJK Test Suite',
      license: 'MIT',
      requirements: {
        node: '>=20',
        ccjk: '>=6.0.0',
      },
      steps: [
        {
          id: 'step-1',
          name: 'Initialize',
          type: 'command',
          command: 'echo "Test workflow step"',
          description: 'Test initialization step',
        },
      ],
      outputs: {
        success: 'Workflow completed successfully',
        error: 'Workflow failed',
      },
      ...overrides,
    }
  }

  /**
   * Generate a mock MCP service configuration
   */
  static generateMCPService(overrides: Partial<MCPService> = {}): MCPService {
    const id = this.generateTestId('mcp')
    return {
      id,
      name: `Test MCP Service ${id}`,
      description: `Generated test MCP service for ${id}`,
      version: '1.0.0',
      author: 'CCJK Test Suite',
      repository: `https://github.com/test/${id}`,
      command: 'node',
      args: [`/path/to/${id}/index.js`],
      env: {
        NODE_ENV: 'test',
      },
      capabilities: ['read', 'write'],
      category: 'test',
      tags: ['test', 'generated'],
      ...overrides,
    }
  }

  /**
   * Generate mock API provider configurations
   */
  static generateAPIProviders() {
    return {
      '302.AI': {
        name: '302.AI',
        baseURL: 'https://api.302.ai/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        authType: 'bearer',
        headers: {
          'User-Agent': 'CCJK/6.0.0',
        },
      },
      'OpenAI': {
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        authType: 'bearer',
        headers: {
          'User-Agent': 'CCJK/6.0.0',
        },
      },
      'Anthropic': {
        name: 'Anthropic',
        baseURL: 'https://api.anthropic.com',
        models: ['claude-3-opus', 'claude-3-sonnet'],
        authType: 'x-api-key',
        headers: {
          'User-Agent': 'CCJK/6.0.0',
          'anthropic-version': '2023-06-01',
        },
      },
    }
  }

  /**
   * Generate mock file system structure
   */
  static generateFileSystemStructure(basePath = '/tmp/ccjk-test') {
    return {
      [basePath]: {
        type: 'directory',
        children: {
          '.claude': {
            type: 'directory',
            children: {
              'config.json': {
                type: 'file',
                content: JSON.stringify(this.generateCCJKConfig(), null, 2),
              },
              'workflows': {
                type: 'directory',
                children: {
                  'test-workflow.json': {
                    type: 'file',
                    content: JSON.stringify(this.generateWorkflowConfig(), null, 2),
                  },
                },
              },
            },
          },
          'src': {
            type: 'directory',
            children: {
              'index.ts': {
                type: 'file',
                content: 'export default function main() { console.log("Hello, CCJK!"); }',
              },
            },
          },
          'package.json': {
            type: 'file',
            content: JSON.stringify({
              name: 'test-project',
              version: '1.0.0',
              type: 'module',
            }, null, 2),
          },
        },
      },
    }
  }

  /**
   * Generate mock command execution results
   */
  static generateCommandResults() {
    return {
      success: {
        stdout: 'Command executed successfully',
        stderr: '',
        exitCode: 0,
      },
      failure: {
        stdout: '',
        stderr: 'Command failed with error',
        exitCode: 1,
      },
      timeout: {
        stdout: 'Partial output',
        stderr: 'Command timed out',
        exitCode: 124,
      },
    }
  }

  /**
   * Generate mock user interactions
   */
  static generateUserInteractions() {
    return {
      confirmYes: { confirm: true },
      confirmNo: { confirm: false },
      selectFirst: { selection: 0 },
      selectLast: { selection: -1 },
      inputText: { input: 'test input' },
      inputEmpty: { input: '' },
      multiSelect: { selections: [0, 2, 4] },
      apiKeyInput: { apiKey: `sk-test-${nanoid(32)}` },
      providerSelect: { provider: '302.AI' },
      languageSelect: { language: 'en' },
    }
  }

  /**
   * Generate mock error scenarios
   */
  static generateErrorScenarios() {
    return {
      networkError: new Error('Network request failed'),
      fileNotFound: new Error('ENOENT: no such file or directory'),
      permissionDenied: new Error('EACCES: permission denied'),
      invalidJSON: new Error('Unexpected token in JSON'),
      commandNotFound: new Error('Command not found'),
      timeout: new Error('Operation timed out'),
      invalidConfig: new Error('Invalid configuration'),
      apiError: new Error('API request failed'),
    }
  }

  /**
   * Generate mock performance metrics
   */
  static generatePerformanceMetrics() {
    return {
      fast: {
        duration: Math.random() * 100, // 0-100ms
        memory: Math.random() * 10 * 1024 * 1024, // 0-10MB
        cpu: Math.random() * 10, // 0-10%
      },
      medium: {
        duration: 100 + Math.random() * 900, // 100-1000ms
        memory: 10 * 1024 * 1024 + Math.random() * 40 * 1024 * 1024, // 10-50MB
        cpu: 10 + Math.random() * 40, // 10-50%
      },
      slow: {
        duration: 1000 + Math.random() * 4000, // 1-5s
        memory: 50 * 1024 * 1024 + Math.random() * 200 * 1024 * 1024, // 50-250MB
        cpu: 50 + Math.random() * 50, // 50-100%
      },
    }
  }

  /**
   * Generate mock environment configurations
   */
  static generateEnvironments() {
    return {
      development: {
        NODE_ENV: 'development',
        CCJK_DEBUG: 'true',
        CCJK_LOG_LEVEL: 'debug',
        CCJK_TELEMETRY: 'false',
      },
      testing: {
        NODE_ENV: 'test',
        CCJK_DEBUG: 'false',
        CCJK_LOG_LEVEL: 'silent',
        CCJK_TELEMETRY: 'false',
        CCJK_TEST_MODE: 'true',
      },
      production: {
        NODE_ENV: 'production',
        CCJK_DEBUG: 'false',
        CCJK_LOG_LEVEL: 'info',
        CCJK_TELEMETRY: 'true',
      },
    }
  }

  /**
   * Generate a complete test scenario
   */
  static generateTestScenario(name: string, options: {
    includeConfig?: boolean
    includeWorkflows?: boolean
    includeMCP?: boolean
    includeErrors?: boolean
  } = {}) {
    const {
      includeConfig = true,
      includeWorkflows = true,
      includeMCP = true,
      includeErrors = false,
    } = options

    const scenario = {
      name,
      id: this.generateTestId('scenario'),
      timestamp: this.generateTimestamp(),
    } as any

    if (includeConfig) {
      scenario.config = this.generateCCJKConfig()
    }

    if (includeWorkflows) {
      scenario.workflows = [
        this.generateWorkflowConfig(),
        this.generateWorkflowConfig({ category: 'advanced' }),
      ]
    }

    if (includeMCP) {
      scenario.mcpServices = [
        this.generateMCPService(),
        this.generateMCPService({ category: 'utility' }),
      ]
    }

    if (includeErrors) {
      scenario.errors = this.generateErrorScenarios()
    }

    return scenario
  }
}

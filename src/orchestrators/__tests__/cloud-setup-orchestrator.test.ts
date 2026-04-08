/**
 * Cloud Setup Orchestrator Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloudSetupOrchestrator } from '../cloud-setup-orchestrator'

// Mock dependencies
const mockInquirer = {
  prompt: vi.fn(),
}

let globalMockGateway: any = null

vi.mock('inquirer', () => ({
  __esModule: true,
  default: mockInquirer,
  inquirer: mockInquirer,
}))

vi.mock('../../cloud-client/gateway', () => ({
  createDefaultGateway: vi.fn(() => globalMockGateway),
}))

vi.mock('../../analyzers', () => ({
  analyzeProject: vi.fn(() => Promise.resolve({
    projectType: 'typescript-react',
    dependencies: { react: '^18.0.0' },
    devDependencies: { typescript: '^5.0.0' },
    frameworks: [{ name: 'react', version: '18.0.0' }],
    languages: [{ language: 'TypeScript', percentage: 80 }],
    fingerprint: 'test-fingerprint',
  })),
}))

vi.mock('../../commands/ccjk-skills', () => ({
  ccjkSkills: vi.fn(),
}))

vi.mock('../../commands/ccjk-mcp', () => ({
  ccjkMcp: vi.fn(),
}))

vi.mock('../../commands/ccjk-agents', () => ({
  ccjkAgents: vi.fn(),
}))

vi.mock('../../commands/ccjk-hooks', () => ({
  ccjkHooks: vi.fn(),
}))

describe('cloudSetupOrchestrator', () => {
  let orchestrator: CloudSetupOrchestrator
  let mockGateway: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGateway = {
      request: vi.fn(),
      setAuthToken: vi.fn(),
      getConfig: vi.fn(() => ({})),
    }
    globalMockGateway = mockGateway
    orchestrator = new CloudSetupOrchestrator()
    // Reset inquirer mock to return true by default
    mockInquirer.prompt.mockResolvedValue({ confirm: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default options', () => {
      expect(orchestrator).toBeDefined()
    })

    it('should create instance with custom options', () => {
      const customOrchestrator = new CloudSetupOrchestrator({
        cloudEndpoint: 'https://custom.api.com',
        cacheStrategy: 'aggressive',
        lang: 'zh-CN',
      })
      expect(customOrchestrator).toBeDefined()
    })
  })

  describe('executeCloudSetup', () => {
    it('should execute cloud setup successfully', async () => {
      const mockRecommendations = {
        skills: [{
          id: 'ts-best-practices',
          name: { en: 'TypeScript Best Practices' },
          description: { en: 'Essential for TypeScript' },
          category: 'skill',
          relevanceScore: 0.98,
        }],
        mcpServices: [],
        agents: [],
        hooks: [],
        confidence: 98,
        fingerprint: 'test-fingerprint',
        insights: {
          insights: ['Cloud recommendations generated'],
          productivityImprovements: [],
          nextRecommendations: [],
        },
      }

      const mockTemplates = {
        requestId: 'test-request',
        templates: {
          'ts-best-practices': {
            id: 'ts-best-practices',
            content: '{}',
          },
        },
        notFound: [],
      }

      mockGateway.request
        .mockResolvedValueOnce({
          success: true,
          data: {
            requestId: 'test-request',
            recommendations: mockRecommendations.skills,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockTemplates,
        })

      const options = {
        interactive: false,
        useCloud: true,
        submitTelemetry: false,
        generateReport: false,
      }

      const result = await orchestrator.executeCloudSetup(options)

      expect(result).toMatchObject({
        success: true,
        confidence: 98,
        installed: {
          skills: ['ts-best-practices'],
          mcpServices: [],
          agents: [],
          hooks: [],
        },
      })
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle cloud unavailability and fallback to local', async () => {
      mockGateway.request.mockRejectedValue(new Error('Network error'))

      const options = {
        interactive: false,
        useCloud: true,
      }

      const result = await orchestrator.executeCloudSetup(options)

      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(100) // Local recommendations have lower confidence
    })

    it('should respect dry-run mode', async () => {
      const options = {
        interactive: false,
        dryRun: true,
      }

      const result = await orchestrator.executeCloudSetup(options)

      expect(result).toBeDefined()
      // In dry-run mode, no actual installation should happen
    })
  })

  describe('generateProjectFingerprint', () => {
    it('should generate consistent fingerprint for same project', async () => {
      const analysis = {
        dependencies: { react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0' },
        projectType: 'typescript-react',
        frameworks: [{ name: 'react', version: '18.0.0' }],
        languages: [{ language: 'TypeScript', percentage: 80 }],
      }

      // Access private method through any
      const orchestratorAny = orchestrator as any
      const fingerprint1 = orchestratorAny.generateProjectFingerprint(analysis)
      const fingerprint2 = orchestratorAny.generateProjectFingerprint(analysis)

      expect(fingerprint1).toBe(fingerprint2)
      expect(fingerprint1).toHaveLength(64) // SHA-256 hex string
    })
  })

  describe('calculateConfidence', () => {
    it('should calculate average confidence correctly', () => {
      const recommendations = [
        { relevanceScore: 0.9 },
        { relevanceScore: 0.8 },
        { relevanceScore: 1.0 },
      ]

      // Access private method through any
      const orchestratorAny = orchestrator as any
      const confidence = orchestratorAny.calculateConfidence(recommendations)

      expect(confidence).toBe(90) // (0.9 + 0.8 + 1.0) / 3 * 100
    })

    it('should return 0 for empty recommendations', () => {
      // Access private method through any
      const orchestratorAny = orchestrator as any
      const confidence = orchestratorAny.calculateConfidence([])

      expect(confidence).toBe(0)
    })
  })

  describe('uploadTelemetry', () => {
    it('should upload telemetry successfully', async () => {
      const result = {
        requestId: 'test-request',
        confidence: 95,
        duration: 5000,
        installed: {
          skills: ['ts-best-practices'],
          mcpServices: ['typescript-language-server'],
          agents: [],
          hooks: [],
        },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
      }

      // Access private method through any
      const orchestratorAny = orchestrator as any
      await orchestratorAny.uploadTelemetry(result)

      expect(mockGateway.request).toHaveBeenCalledWith(
        'telemetry.installation',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should handle telemetry upload failure gracefully', async () => {
      mockGateway.request.mockRejectedValue(new Error('Upload failed'))

      const result = {
        requestId: 'test-request',
        confidence: 95,
        duration: 5000,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
      }

      // Access private method through any
      const orchestratorAny = orchestrator as any
      await orchestratorAny.uploadTelemetry(result)

      // Should not throw error
      expect(mockGateway.request).toHaveBeenCalledWith(
        'telemetry.installation',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })

  describe('executeWithFallback', () => {
    it('should execute cloud setup on success', async () => {
      const _mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
      }

      // Mock successful cloud setup
      mockGateway.request
        .mockResolvedValueOnce({
          success: true,
          data: {
            requestId: 'test-request',
            recommendations: [],
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            requestId: 'test-request',
            templates: {},
            notFound: [],
          },
        })

      const options = { useCloud: true }

      const result = await orchestrator.executeWithFallback(options)

      expect(result).toBeDefined()
    })

    it('should fallback to local on network error', async () => {
      // Mock cloud client to throw network error
      mockGateway.request.mockRejectedValue({ code: 'ENOTFOUND' })

      const options = { useCloud: true }

      const result = await orchestrator.executeWithFallback(options)

      expect(result).toBeDefined()
      // Should have fallen back to local recommendations
      expect(result.confidence).toBeLessThan(100)
    })

    it('should return a local fallback result on cloud request errors', async () => {
      mockGateway.request.mockRejectedValue(new Error('Invalid request'))

      const options = { useCloud: true }

      const result = await orchestrator.executeWithFallback(options)

      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(100)
    })
  })
})

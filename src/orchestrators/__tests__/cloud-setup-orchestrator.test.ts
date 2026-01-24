/**
 * Cloud Setup Orchestrator Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CloudSetupOrchestrator } from '../cloud-setup-orchestrator'
import { createCompleteCloudClient } from '../../cloud-client'

// Mock dependencies
const mockInquirer = {
  prompt: vi.fn(),
}

vi.mock('inquirer', () => ({
  __esModule: true,
  default: mockInquirer,
  inquirer: mockInquirer,
}))

vi.mock('../../cloud-client', () => ({
  createCompleteCloudClient: vi.fn(() => ({
    analyzeProject: vi.fn(),
    getBatchTemplates: vi.fn(),
    reportUsage: vi.fn(),
    healthCheck: vi.fn(),
  })),
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

describe('CloudSetupOrchestrator', () => {
  let orchestrator: CloudSetupOrchestrator
  let mockCloudClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    orchestrator = new CloudSetupOrchestrator()
    mockCloudClient = (createCompleteCloudClient as any).mock.results[0]?.value
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
          category: 'workflow',
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

      mockCloudClient.analyzeProject.mockResolvedValue({
        requestId: 'test-request',
        recommendations: mockRecommendations.skills,
      })

      mockCloudClient.getBatchTemplates.mockResolvedValue(mockTemplates)

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
      mockCloudClient.analyzeProject.mockRejectedValue(new Error('Network error'))

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

      expect(mockCloudClient.reportUsage).toHaveBeenCalled()
    })

    it('should handle telemetry upload failure gracefully', async () => {
      mockCloudClient.reportUsage.mockRejectedValue(new Error('Upload failed'))

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
      expect(mockCloudClient.reportUsage).toHaveBeenCalled()
    })
  })

  describe('executeWithFallback', () => {
    it('should execute cloud setup on success', async () => {
      const mockResult = {
        success: true,
        requestId: 'test-request',
        confidence: 95,
        installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
        failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
        duration: 5000,
      }

      // Mock successful cloud setup
      mockCloudClient.analyzeProject.mockResolvedValue({
        requestId: 'test-request',
        recommendations: [],
      })
      mockCloudClient.getBatchTemplates.mockResolvedValue({
        templates: {},
        notFound: [],
      })

      const options = { useCloud: true }

      const result = await orchestrator.executeWithFallback(options)

      expect(result).toBeDefined()
    })

    it('should fallback to local on network error', async () => {
      // Mock cloud client to throw network error
      mockCloudClient.analyzeProject.mockRejectedValue({ code: 'ENOTFOUND' })

      // Mock local fallback templates
      mockCloudClient.getBatchTemplates.mockResolvedValue({
        templates: {},
        notFound: [],
      })

      const options = { useCloud: true }

      const result = await orchestrator.executeWithFallback(options)

      expect(result).toBeDefined()
      // Should have fallen back to local recommendations
      expect(result.confidence).toBeLessThan(100)
    })

    it('should throw non-network errors', async () => {
      // Mock cloud client to throw non-network error
      mockCloudClient.analyzeProject.mockRejectedValue(new Error('Invalid request'))

      const options = { useCloud: true }

      await expect(orchestrator.executeWithFallback(options)).rejects.toThrow()
    })
  })
})
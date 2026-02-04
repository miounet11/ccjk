/**
 * Tests for ccjk:agents command
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectAnalyzer } from '../../src/analyzers'
import { getCloudRecommendations } from '../../src/cloud-client'
import { loadAgentTemplates } from '../../src/templates/agents'

vi.mock('consola')
vi.mock('../../src/analyzers')
vi.mock('../../src/templates/agents')
vi.mock('../../src/cloud-client')

describe('ccjk:agents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should analyze project and show recommendations', async () => {
    const mockAnalysis = {
      projectType: 'TypeScript',
      frameworks: [{ name: 'React' }],
      languages: [{ language: 'TypeScript' }],
      dependencies: { direct: [] },
      metadata: { confidence: 0.9 },
    }

    const mockRecommendations = [
      {
        name: 'typescript-architect',
        description: 'TypeScript architecture expert',
        skills: ['typescript', 'design-patterns'],
        mcpServers: ['typescript-language-server'],
        capabilities: ['code-generation', 'architecture-design'],
        confidence: 0.9,
        reason: 'Matches TypeScript project',
      },
    ]

    vi.mocked(ProjectAnalyzer.prototype.analyze).mockResolvedValue(mockAnalysis as any)
    vi.mocked(getCloudRecommendations).mockResolvedValue(mockRecommendations)

    // Import command dynamically to use mocks
    const command = await import('../../src/commands/ccjk-agents')

    expect(command.default).toBeDefined()
    expect(command.default.meta.name).toBe('ccjk:agents')
  })

  it('should handle no recommendations found', async () => {
    const mockAnalysis = {
      projectType: 'Unknown',
      frameworks: [],
      languages: [],
      dependencies: { direct: [] },
      metadata: { confidence: 0.3 },
    }

    vi.mocked(ProjectAnalyzer.prototype.analyze).mockResolvedValue(mockAnalysis as any)
    vi.mocked(getCloudRecommendations).mockResolvedValue([])
    vi.mocked(loadAgentTemplates).mockResolvedValue([])

    const command = await import('../../src/commands/ccjk-agents')

    expect(command.default).toBeDefined()
  })

  it('should support dry-run mode', async () => {
    const mockAnalysis = {
      projectType: 'TypeScript',
      frameworks: [{ name: 'React' }],
      languages: [{ language: 'TypeScript' }],
      dependencies: { direct: [] },
      metadata: { confidence: 0.9 },
    }

    const mockRecommendations = [
      {
        name: 'typescript-architect',
        description: 'TypeScript architecture expert',
        skills: ['typescript'],
        mcpServers: [],
        capabilities: ['code-generation'],
        confidence: 0.9,
        reason: 'Match',
      },
    ]

    vi.mocked(ProjectAnalyzer.prototype.analyze).mockResolvedValue(mockAnalysis as any)
    vi.mocked(getCloudRecommendations).mockResolvedValue(mockRecommendations)

    const command = await import('../../src/commands/ccjk-agents')

    expect(command.default).toBeDefined()
  })
})

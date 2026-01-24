/**
 * Tests for ccjk:skills command
 */

import { describe, expect, it, vi } from 'vitest'
import { ccjkSkills } from '../../src/commands/ccjk-skills'

vi.mock('../../src/analyzers', () => ({
  analyzeProject: vi.fn().mockResolvedValue({
    projectType: 'typescript',
    languages: [{ language: 'typescript', confidence: 0.9, fileCount: 100, indicators: ['tsconfig.json'] }],
    frameworks: [{ name: 'react', category: 'frontend', confidence: 0.8, evidence: ['package.json'] }],
    packageManager: 'npm',
    configFiles: ['tsconfig.json', 'package.json'],
    metadata: { confidence: 0.85, filesScanned: 150, duration: 100 }
  })
}))

vi.mock('../../src/cloud-client', () => ({
  createCompleteCloudClient: vi.fn().mockReturnValue({
    analyzeProject: vi.fn().mockResolvedValue({
      recommendations: []
    }),
    getTemplate: vi.fn().mockResolvedValue(null)
  })
}))

describe('ccjk:skills', () => {
  it('should analyze project and recommend skills', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await ccjkSkills({
      interactive: false,
      json: false,
      dryRun: true
    })

    expect(consoleSpy).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analyzing project'))

    consoleSpy.mockRestore()
  })

  it('should output JSON when json flag is set', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await ccjkSkills({
      interactive: false,
      json: true,
      dryRun: true
    })

    // Should output JSON
    const jsonOutput = consoleSpy.mock.calls.find(call =>
      call[0].includes('status')
    )
    expect(jsonOutput).toBeTruthy()

    consoleSpy.mockRestore()
  })
})
import { describe, expect, it } from 'vitest'
import { matchSkills, matchMcpServices, getRecommendations } from '../../src/discovery/skill-matcher'
import type { ProjectProfile } from '../../src/discovery/types'

const tsProfile: ProjectProfile = {
  language: 'typescript',
  frameworks: ['react'],
  tags: ['typescript', 'react', 'frontend', 'vitest'],
  hasTests: true,
  hasDocker: false,
  dependencies: { react: '^18.0.0' },
  devDependencies: { vitest: '^1.0.0' },
}

const pythonProfile: ProjectProfile = {
  language: 'python',
  frameworks: [],
  tags: ['python', 'backend', 'docker', 'ci'],
  hasTests: true,
  hasDocker: true,
  dependencies: {},
  devDependencies: { pytest: '^7.0.0' },
}

const emptyProfile: ProjectProfile = {
  language: 'unknown',
  frameworks: [],
  tags: [],
  hasTests: false,
  hasDocker: false,
  dependencies: {},
  devDependencies: {},
}

describe('matchSkills', () => {
  it('returns skills matching TypeScript/React profile', () => {
    const skills = matchSkills(tsProfile)
    expect(skills.length).toBeGreaterThan(0)
    const ids = skills.map(s => s.id)
    expect(ids).toContain('git-commit')
    expect(ids).toContain('code-review')
    expect(ids).toContain('component-gen')
    expect(ids).toContain('tdd-workflow')
  })

  it('returns skills matching Python/backend profile', () => {
    const skills = matchSkills(pythonProfile)
    const ids = skills.map(s => s.id)
    expect(ids).toContain('git-commit')
    expect(ids).toContain('security-audit')
    expect(ids).toContain('docker-optimize')
    expect(ids).toContain('ci-pipeline')
  })

  it('returns empty for empty profile', () => {
    expect(matchSkills(emptyProfile)).toHaveLength(0)
  })

  it('sorts by matchScore descending', () => {
    const skills = matchSkills(tsProfile)
    for (let i = 1; i < skills.length; i++) {
      expect(skills[i - 1].matchScore).toBeGreaterThanOrEqual(skills[i].matchScore)
    }
  })

  it('deduplicates skill ids', () => {
    const skills = matchSkills(tsProfile)
    const ids = skills.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('matchScore is between 0 and 100', () => {
    const skills = matchSkills(tsProfile)
    for (const s of skills) {
      expect(s.matchScore).toBeGreaterThanOrEqual(0)
      expect(s.matchScore).toBeLessThanOrEqual(100)
    }
  })

  it('includes reason and category', () => {
    const skills = matchSkills(tsProfile)
    for (const s of skills) {
      expect(s.reason).toBeTruthy()
      expect(s.category).toBeTruthy()
    }
  })
})

describe('matchMcpServices', () => {
  it('returns MCP services for TypeScript profile', () => {
    const services = matchMcpServices(tsProfile)
    const ids = services.map(s => s.id)
    expect(ids).toContain('context7')
    expect(ids).toContain('playwright')
  })

  it('returns MCP services for Python/backend profile', () => {
    const services = matchMcpServices(pythonProfile)
    const ids = services.map(s => s.id)
    expect(ids).toContain('context7')
    expect(ids).toContain('sqlite')
  })

  it('returns empty for empty profile', () => {
    expect(matchMcpServices(emptyProfile)).toHaveLength(0)
  })

  it('deduplicates service ids', () => {
    const services = matchMcpServices(tsProfile)
    const ids = services.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getRecommendations', () => {
  it('returns skills and MCP services together', () => {
    const recs = getRecommendations(tsProfile)
    expect(recs.skills.length).toBeGreaterThan(0)
    expect(recs.mcpServices.length).toBeGreaterThan(0)
    expect(recs.summary).toContain('skills')
    expect(recs.summary).toContain('MCP')
  })

  it('includes stack description in summary', () => {
    const recs = getRecommendations(tsProfile)
    expect(recs.summary).toContain('typescript')
  })

  it('handles empty profile gracefully', () => {
    const recs = getRecommendations(emptyProfile)
    expect(recs.skills).toHaveLength(0)
    expect(recs.mcpServices).toHaveLength(0)
    expect(recs.summary).toContain('your project')
  })
})

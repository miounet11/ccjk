import { describe, expect, it } from 'vitest'
import {
  validateAgent,
  validateGenerationResult,
  validateSkill,
} from '../../src/generation/validator'
import type { GeneratedAgent, GeneratedSkill, GenerationResult } from '../../src/generation/types'

function makeAgent(overrides: Partial<GeneratedAgent> = {}): GeneratedAgent {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent for validation',
    category: 'dev',
    specialization: 'testing',
    model: 'sonnet',
    competencies: ['testing'],
    workflow: ['step1'],
    bestPractices: ['practice1'],
    tags: ['test'],
    ...overrides,
  } as GeneratedAgent
}

function makeSkill(overrides: Partial<GeneratedSkill> = {}): GeneratedSkill {
  return {
    id: 'test-skill',
    name: { en: 'Test Skill', 'zh-CN': '测试技能' },
    description: { en: 'A test skill', 'zh-CN': '测试技能' },
    category: 'dev',
    triggers: [{ type: 'command', value: '/test' }],
    actions: [{ type: 'prompt', content: 'Run tests' }],
    tags: ['test'],
    priority: 5,
    ...overrides,
  } as GeneratedSkill
}

describe('validateAgent', () => {
  it('passes for valid agent', () => {
    const { errors, warnings } = validateAgent(makeAgent())
    expect(errors).toHaveLength(0)
  })

  it('errors on missing id', () => {
    const { errors } = validateAgent(makeAgent({ id: '' }))
    expect(errors.some(e => e.code === 'AGENT_MISSING_ID')).toBe(true)
  })

  it('errors on missing name', () => {
    const { errors } = validateAgent(makeAgent({ name: '' }))
    expect(errors.some(e => e.code === 'AGENT_MISSING_NAME')).toBe(true)
  })

  it('errors on missing description', () => {
    const { errors } = validateAgent(makeAgent({ description: '' }))
    expect(errors.some(e => e.code === 'AGENT_MISSING_DESCRIPTION')).toBe(true)
  })

  it('errors on invalid id format', () => {
    const { errors } = validateAgent(makeAgent({ id: 'Invalid ID!' }))
    expect(errors.some(e => e.code === 'AGENT_INVALID_ID')).toBe(true)
  })

  it('accepts valid kebab-case id', () => {
    const { errors } = validateAgent(makeAgent({ id: 'my-test-agent-123' }))
    expect(errors.filter(e => e.code === 'AGENT_INVALID_ID')).toHaveLength(0)
  })

  it('errors on invalid model', () => {
    const { errors } = validateAgent(makeAgent({ model: 'gpt-4' } as any))
    expect(errors.some(e => e.code === 'AGENT_INVALID_MODEL')).toBe(true)
  })

  it('accepts valid models', () => {
    for (const model of ['opus', 'sonnet', 'haiku']) {
      const { errors } = validateAgent(makeAgent({ model } as any))
      expect(errors.filter(e => e.code === 'AGENT_INVALID_MODEL')).toHaveLength(0)
    }
  })

  it('strict mode requires competencies', () => {
    const { errors } = validateAgent(makeAgent({ competencies: [] }), 'strict')
    expect(errors.some(e => e.code === 'AGENT_MISSING_COMPETENCIES')).toBe(true)
  })

  it('strict mode requires workflow', () => {
    const { errors } = validateAgent(makeAgent({ workflow: [] }), 'strict')
    expect(errors.some(e => e.code === 'AGENT_MISSING_WORKFLOW')).toBe(true)
  })

  it('normal mode warns on short description', () => {
    const { warnings } = validateAgent(makeAgent({ description: 'Short' }))
    expect(warnings.some(w => w.code === 'AGENT_SHORT_DESCRIPTION')).toBe(true)
  })

  it('normal mode warns on missing tags', () => {
    const { warnings } = validateAgent(makeAgent({ tags: [] }))
    expect(warnings.some(w => w.code === 'AGENT_MISSING_TAGS')).toBe(true)
  })

  it('relaxed mode skips warnings', () => {
    const { warnings } = validateAgent(makeAgent({ tags: [], specialization: undefined as any }), 'relaxed')
    expect(warnings).toHaveLength(0)
  })
})

describe('validateSkill', () => {
  it('passes for valid skill', () => {
    const { errors } = validateSkill(makeSkill())
    expect(errors).toHaveLength(0)
  })

  it('errors on missing id', () => {
    const { errors } = validateSkill(makeSkill({ id: '' }))
    expect(errors.some(e => e.code === 'SKILL_MISSING_ID')).toBe(true)
  })

  it('errors on missing name', () => {
    const { errors } = validateSkill(makeSkill({ name: {} as any }))
    expect(errors.some(e => e.code === 'SKILL_MISSING_NAME')).toBe(true)
  })

  it('errors on missing triggers', () => {
    const { errors } = validateSkill(makeSkill({ triggers: [] }))
    expect(errors.some(e => e.code === 'SKILL_MISSING_TRIGGERS')).toBe(true)
  })

  it('errors on missing actions', () => {
    const { errors } = validateSkill(makeSkill({ actions: [] }))
    expect(errors.some(e => e.code === 'SKILL_MISSING_ACTIONS')).toBe(true)
  })

  it('errors on invalid id format', () => {
    const { errors } = validateSkill(makeSkill({ id: 'Bad ID!' }))
    expect(errors.some(e => e.code === 'SKILL_INVALID_ID')).toBe(true)
  })

  it('warns on command trigger without slash', () => {
    const { warnings } = validateSkill(makeSkill({
      triggers: [{ type: 'command', value: 'test' }],
    }))
    expect(warnings.some(w => w.code === 'SKILL_COMMAND_FORMAT')).toBe(true)
  })

  it('strict mode requires category', () => {
    const { errors } = validateSkill(makeSkill({ category: undefined as any }), 'strict')
    expect(errors.some(e => e.code === 'SKILL_MISSING_CATEGORY')).toBe(true)
  })

  it('normal mode warns on missing tags', () => {
    const { warnings } = validateSkill(makeSkill({ tags: [] }))
    expect(warnings.some(w => w.code === 'SKILL_MISSING_TAGS')).toBe(true)
  })
})

describe('validateGenerationResult', () => {
  it('passes for valid result', () => {
    const result: GenerationResult = {
      agents: [makeAgent()],
      skills: [makeSkill()],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(result)
    expect(validation.valid).toBe(true)
    expect(validation.score).toBeGreaterThan(0)
  })

  it('detects duplicate agent ids', () => {
    const result: GenerationResult = {
      agents: [makeAgent({ id: 'dup' }), makeAgent({ id: 'dup' })],
      skills: [],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(result)
    expect(validation.errors.some(e => e.code === 'DUPLICATE_AGENT')).toBe(true)
  })

  it('detects duplicate skill ids', () => {
    const result: GenerationResult = {
      agents: [],
      skills: [makeSkill({ id: 'dup' }), makeSkill({ id: 'dup' })],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(result)
    expect(validation.errors.some(e => e.code === 'DUPLICATE_SKILL')).toBe(true)
  })

  it('detects command conflicts', () => {
    const result: GenerationResult = {
      agents: [],
      skills: [
        makeSkill({ id: 'a', triggers: [{ type: 'command', value: '/same' }] }),
        makeSkill({ id: 'b', triggers: [{ type: 'command', value: '/same' }] }),
      ],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(result)
    expect(validation.warnings.some(w => w.code === 'COMMAND_CONFLICT')).toBe(true)
  })

  it('calculates score correctly', () => {
    const valid: GenerationResult = {
      agents: [makeAgent()],
      skills: [makeSkill()],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(valid)
    expect(validation.score).toBeLessThanOrEqual(100)
    expect(validation.score).toBeGreaterThanOrEqual(0)
  })

  it('score decreases with errors', () => {
    const result: GenerationResult = {
      agents: [makeAgent({ id: '' }), makeAgent({ name: '' })],
      skills: [],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(result)
    expect(validation.score).toBeLessThan(100)
  })

  it('returns score 0 for empty result', () => {
    const result: GenerationResult = {
      agents: [],
      skills: [],
      reasoning: 'test',
    } as GenerationResult
    const validation = validateGenerationResult(result)
    expect(validation.score).toBe(0)
  })
})

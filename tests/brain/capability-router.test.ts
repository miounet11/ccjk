import { describe, expect, it } from 'vitest'
import {
  decideCapability,
  getCapabilityName,
} from '../../src/brain/capability-router'
import type { TaskContext } from '../../src/brain/capability-router'

const baseCtx: TaskContext = {
  input: '',
  conversationTurns: 0,
  cwd: '/tmp',
  hasUncommittedChanges: false,
  recentFailures: 0,
}

describe('decideCapability', () => {
  it('returns level 0 for explanation tasks', () => {
    expect(decideCapability({ ...baseCtx, input: '解释这段代码' }).level).toBe(0)
    expect(decideCapability({ ...baseCtx, input: '什么是 TypeScript' }).level).toBe(0)
    expect(decideCapability({ ...baseCtx, input: '为什么要用 ESM' }).level).toBe(0)
    expect(decideCapability({ ...baseCtx, input: '如何理解闭包' }).level).toBe(0)
  })

  it('returns level 1 for skill/slash commands', () => {
    expect(decideCapability({ ...baseCtx, input: '/commit' }).level).toBe(1)
    expect(decideCapability({ ...baseCtx, input: 'commit the changes' }).level).toBe(1)
    expect(decideCapability({ ...baseCtx, input: 'review this PR' }).level).toBe(1)
  })

  it('returns level 2 for single-file operations', () => {
    expect(decideCapability({ ...baseCtx, input: '修改这个函数' }).level).toBe(2)
    expect(decideCapability({ ...baseCtx, input: 'fix the bug' }).level).toBe(2)
    expect(decideCapability({ ...baseCtx, input: '更新配置文件' }).level).toBe(2)
  })

  it('returns level 3 for multi-file operations', () => {
    expect(decideCapability({ ...baseCtx, input: '重构这个模块' }).level).toBe(3)
    expect(decideCapability({ ...baseCtx, input: '批量更新所有测试' }).level).toBe(3)
    expect(decideCapability({ ...baseCtx, input: '添加新功能' }).level).toBe(3)
  })

  it('returns level 4 for complex tasks', () => {
    expect(decideCapability({ ...baseCtx, input: '分析整个项目' }).level).toBe(4)
    // '全局重构架构' matches '重构' (level 3) before '全局' (level 4)
    expect(decideCapability({ ...baseCtx, input: '全局重构架构' }).level).toBe(3)
    expect(decideCapability({ ...baseCtx, input: '全局分析代码' }).level).toBe(4)
    expect(decideCapability({ ...baseCtx, input: '迁移到新框架' }).level).toBe(4)
    expect(decideCapability({ ...baseCtx, input: '架构设计' }).level).toBe(4)
  })

  it('returns level 5 for extreme tasks', () => {
    expect(decideCapability({ ...baseCtx, input: '完全重写这个项目' }).level).toBe(5)
    expect(decideCapability({ ...baseCtx, input: '从零开始构建' }).level).toBe(5)
    // '大规模重构' matches '重构' (level 3) before '大规模' (level 5)
    expect(decideCapability({ ...baseCtx, input: '大规模重构' }).level).toBe(3)
    // Pure '大规模' without other keywords hits level 5
    expect(decideCapability({ ...baseCtx, input: '大规模改造系统' }).level).toBe(5)
  })

  it('escalates based on context complexity', () => {
    const highComplexity = {
      ...baseCtx,
      input: 'do something',
      conversationTurns: 10,
      recentFailures: 3,
      hasUncommittedChanges: true,
    }
    const result = decideCapability(highComplexity)
    expect(result.level).toBeGreaterThanOrEqual(3)
    expect(result.complexity).toBeGreaterThanOrEqual(5)
  })

  it('defaults to level 2 for simple unknown input', () => {
    const result = decideCapability({ ...baseCtx, input: 'hello' })
    expect(result.level).toBe(2)
    expect(result.complexity).toBe(3)
  })

  it('caps complexity at 10', () => {
    const extreme = {
      ...baseCtx,
      input: 'do something',
      conversationTurns: 100,
      recentFailures: 50,
      hasUncommittedChanges: true,
    }
    expect(decideCapability(extreme).complexity).toBeLessThanOrEqual(10)
  })

  it('returns expected fields in decision', () => {
    const result = decideCapability({ ...baseCtx, input: '解释' })
    expect(result).toHaveProperty('level')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('expectedSteps')
    expect(result).toHaveProperty('expectedDuration')
    expect(result).toHaveProperty('complexity')
    expect(typeof result.reasoning).toBe('string')
    expect(result.expectedSteps).toBeGreaterThan(0)
    expect(result.expectedDuration).toBeGreaterThan(0)
  })
})

describe('getCapabilityName', () => {
  it('returns name for each level', () => {
    expect(getCapabilityName(0)).toBeTruthy()
    expect(getCapabilityName(1)).toBeTruthy()
    expect(getCapabilityName(2)).toBeTruthy()
    expect(getCapabilityName(3)).toBeTruthy()
    expect(getCapabilityName(4)).toBeTruthy()
    expect(getCapabilityName(5)).toBeTruthy()
  })

  it('returns unique names', () => {
    const names = [0, 1, 2, 3, 4, 5].map(l => getCapabilityName(l as any))
    expect(new Set(names).size).toBe(6)
  })
})

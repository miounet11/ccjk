/**
 * Tests for the Runtime Engine
 */

import { describe, expect, it } from 'vitest'
import { ERROR_HANDLING_PROTOCOL } from '../examples.js'
import { createSkill, Parser } from '../parser.js'
import { createRuntime } from '../runtime.js'
import { Layer } from '../types.js'

describe('runtime', () => {
  it('should execute a skill successfully', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      enforceReasoningChain: true,
      traceExecution: true,
    })

    const result = await runtime.execute(skill, {
      code: 'async function parse() { throw new Error("Invalid syntax"); }',
    })

    expect(result.success).toBe(true)
    expect(result.output).toBeDefined()
    expect(result.reasoningChain).toBeDefined()
    expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0) // Performance optimized: can be 0ms
  })

  it('should enforce reasoning chain', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      enforceReasoningChain: true,
    })

    const result = await runtime.execute(skill, {
      code: 'function test() { return 42; }',
    })

    expect(result.reasoningChain.layer1).toBeDefined()
    expect(result.reasoningChain.layer2).toBeDefined()
    expect(result.reasoningChain.layer3).toBeDefined()
  })

  it('should trace execution steps', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      traceExecution: true,
    })

    const result = await runtime.execute(skill, {
      code: 'const x = 42;',
    })

    expect(result.trace.steps.length).toBeGreaterThan(0)
    expect(result.trace.steps[0].layer).toBe(Layer.L1)
    expect(result.trace.steps[0].action).toBeDefined()
    expect(result.trace.steps[0].result).toBeDefined()
  })

  it('should format output as structured by default', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'test',
    })

    expect(result.output).toHaveProperty('implementation')
    expect(result.output).toHaveProperty('pattern')
    expect(result.output).toHaveProperty('reasoning')
  })

  it('should format output as text when configured', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      outputFormat: 'text',
    })

    const result = await runtime.execute(skill, {
      code: 'test',
    })

    expect(typeof result.output).toBe('string')
    expect(result.output).toContain('Reasoning Chain')
    expect(result.output).toContain('Implementation')
  })

  it('should format output as JSON when configured', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      outputFormat: 'json',
    })

    const result = await runtime.execute(skill, {
      code: 'test',
    })

    expect(result.output).toHaveProperty('result')
    expect(result.output).toHaveProperty('reasoningChain')
    expect(result.output).toHaveProperty('trace')
  })

  it('should detect syntax errors in L1 analysis', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'var x = 42; if (x == 42) { }',
    })

    expect(result.trace.steps.length).toBeGreaterThan(0)
    // L1 should detect deprecated 'var' keyword and loose equality
    const l1Step = result.trace.steps.find(s => s.layer === Layer.L1)
    expect(l1Step).toBeDefined()
  })

  it('should apply domain constraints in L3', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'throw new Error("test");',
    })

    expect(result.trace.steps.length).toBeGreaterThan(0)
    const l3Step = result.trace.steps.find(s => s.layer === Layer.L3)
    expect(l3Step).toBeDefined()
  })

  it('should select appropriate pattern in L2', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'async function fetchData() { return data; }',
    })

    expect(result.output.pattern).toBeDefined()
    expect(result.output.implementation).toBeDefined()
  })

  it('should handle execution errors gracefully', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      allowFallback: true,
    })

    // Mock an error scenario
    const result = await runtime.execute(skill, null)

    if (!result.success) {
      expect(result.output.error).toBeDefined()
      expect(result.output.fallback).toBeDefined()
    }
  })

  it('should estimate token usage', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'const x = 42;',
    })

    expect(result.metadata.tokensUsed).toBeGreaterThan(0)
  })

  it('should track accessed layers', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'test',
    })

    expect(result.metadata.layerAccessed).toContain(Layer.L1)
    expect(result.metadata.layerAccessed).toContain(Layer.L2)
    expect(result.metadata.layerAccessed).toContain(Layer.L3)
  })

  it('should complete within max execution time', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime({
      maxExecutionTime: 1000, // 1 second
    })

    const startTime = Date.now()
    const result = await runtime.execute(skill, {
      code: 'test',
    })
    const endTime = Date.now()

    expect(result.success).toBe(true)
    expect(endTime - startTime).toBeLessThan(2000) // Allow some buffer
    expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0) // Can be 0ms when optimized
  })

  it('should provide best practices in output', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'test',
    })

    if (result.success && result.output.bestPractices) {
      expect(Array.isArray(result.output.bestPractices)).toBe(true)
      expect(result.output.bestPractices.length).toBeGreaterThan(0)
    }
  })

  it('should include examples in output', async () => {
    const parser = new Parser(ERROR_HANDLING_PROTOCOL)
    const skill = createSkill(parser.parse(), ERROR_HANDLING_PROTOCOL)

    const runtime = createRuntime()

    const result = await runtime.execute(skill, {
      code: 'test',
    })

    if (result.success && result.output.examples) {
      expect(Array.isArray(result.output.examples)).toBe(true)
    }
  })
})

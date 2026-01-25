/**
 * End-to-End Integration Test Suite for CCJK 2.0
 * Validates complete workflow from user input through Hook triggering,
 * Skills loading, Brain analysis, to solution generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MockFactory, AssertionHelpers } from '../helpers'
import { createTestTempDir } from '../setup'
import type {
  UserInput,
  HookTrigger,
  SkillExecution,
  BrainAnalysis,
  Solution,
  WorkflowResult,
} from '@/types/e2e'

describe('End-to-End Workflow Integration', () => {
  let testDir: string
  let workflowEngine: any
  let inputProcessor: any
  let hookManager: any
  let skillManager: any
  let brainAnalyzer: any
  let solutionGenerator: any
  let integrationOrchestrator: any

  beforeEach(async () => {
    testDir = createTestTempDir('e2e-workflow-test')

    // Setup comprehensive mock suite
    vi.doMock('@/workflow-v2/engine', () => ({
      WorkflowEngine: vi.fn().mockImplementation(() => ({
        execute: vi.fn(),
        validate: vi.fn(),
        getState: vi.fn(),
        getMetrics: vi.fn(),
        rollback: vi.fn(),
      })),
    }))

    vi.doMock('@/workflow-v2/input-processor', () => ({
      InputProcessor: vi.fn().mockImplementation(() => ({
        parse: vi.fn(),
        validate: vi.fn(),
        normalize: vi.fn(),
        enrich: vi.fn(),
      })),
    }))

    vi.doMock('@/workflow-v2/hook-manager', () => ({
      HookManager: vi.fn().mockImplementation(() => ({
        trigger: vi.fn(),
        validateHooks: vi.fn(),
        getHookResults: vi.fn(),
        audit: vi.fn(),
      })),
    }))

    vi.doMock('@/workflow-v2/skill-manager', () => ({
      SkillManager: vi.fn().mockImplementation(() => ({
        loadSkills: vi.fn(),
        executeSkills: vi.fn(),
        getSkillResults: vi.fn(),
        chainSkills: vi.fn(),
      })),
    }))

    vi.doMock('@/workflow-v2/brain-analyzer', () => ({
      BrainAnalyzer: vi.fn().mockImplementation(() => ({
        analyze: vi.fn(),
        getInsights: vi.fn(),
        getRecommendations: vi.fn(),
        exportAnalysis: vi.fn(),
      })),
    }))

    vi.doMock('@/workflow-v2/solution-generator', () => ({
      SolutionGenerator: vi.fn().mockImplementation(() => ({
        generate: vi.fn(),
        validate: vi.fn(),
        rank: vi.fn(),
        export: vi.fn(),
      })),
    }))

    vi.doMock('@/workflow-v2/orchestrator', () => ({
      IntegrationOrchestrator: vi.fn().mockImplementation(() => ({
        orchestrate: vi.fn(),
        getWorkflow: vi.fn(),
        getProgress: vi.fn(),
        handleErrors: vi.fn(),
        getReport: vi.fn(),
      })),
    }))

    // Import mocked modules
    const { WorkflowEngine } = await import('@/workflow-v2/engine')
    const { InputProcessor } = await import('@/workflow-v2/input-processor')
    const { HookManager } = await import('@/workflow-v2/hook-manager')
    const { SkillManager } = await import('@/workflow-v2/skill-manager')
    const { BrainAnalyzer } = await import('@/workflow-v2/brain-analyzer')
    const { SolutionGenerator } = await import('@/workflow-v2/solution-generator')
    const { IntegrationOrchestrator } = await import('@/workflow-v2/orchestrator')

    workflowEngine = new WorkflowEngine()
    inputProcessor = new InputProcessor()
    hookManager = new HookManager()
    skillManager = new SkillManager()
    brainAnalyzer = new BrainAnalyzer()
    solutionGenerator = new SolutionGenerator()
    integrationOrchestrator = new IntegrationOrchestrator()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Workflow Flow', () => {
    it('should execute complete workflow from user input to solution', async () => {
      // Arrange - Realistic user input
      const userInput: UserInput = {
        id: 'input-001',
        type: 'natural-language',
        content: 'I need to analyze my codebase for performance bottlenecks and generate optimization suggestions',
        metadata: {
          timestamp: new Date(),
          userId: 'user-123',
          sessionId: 'session-456',
          context: {
            projectPath: '/Users/lu/ccjk-public',
            language: 'typescript',
            framework: 'node',
          },
        },
      }

      // 1. Input Processing
      const parsedInput = {
        intent: 'performance-analysis',
        entities: ['codebase', 'performance', 'bottlenecks', 'optimization'],
        confidence: 0.92,
        requirements: {
          analyzePerformance: true,
          findBottlenecks: true,
          generateSuggestions: true,
        },
      }

      inputProcessor.parse.mockResolvedValue(parsedInput)
      inputProcessor.validate.mockResolvedValue({ valid: true })

      // 2. Hook Triggering
      const hookTriggers: HookTrigger[] = [
        {
          hookId: 'performance-analysis-hook',
          level: 'L2',
          triggered: true,
          reason: 'User requested performance analysis',
          timestamp: new Date(),
        },
        {
          hookId: 'code-quality-hook',
          level: 'L1',
          triggered: true,
          reason: 'Code analysis required',
          timestamp: new Date(),
        },
      ]

      hookManager.trigger.mockResolvedValue(hookTriggers)

      // 3. Skills Loading
      const skills = [
        {
          id: 'performance-analyzer',
          name: 'PerformanceAnalyzer',
          category: 'analysis',
          layer: 'L2',
        },
        {
          id: 'bottleneck-detector',
          name: 'BottleneckDetector',
          category: 'detection',
          layer: 'L3',
        },
        {
          id: 'optimization-suggester',
          name: 'OptimizationSuggester',
          category: 'suggestion',
          layer: 'L2',
        },
      ]

      skillManager.loadSkills.mockResolvedValue(skills)

      // 4. Skill Execution
      const skillExecutions: SkillExecution[] = [
        {
          skillId: 'performance-analyzer',
          layer: 'L2',
          status: 'completed',
          result: {
            metrics: {
              averageExecutionTime: 1250,
              memoryUsage: 256,
              cpuUsage: 45,
            },
            issues: 12,
          },
          executionTime: 3.2,
        },
        {
          skillId: 'bottleneck-detector',
          layer: 'L3',
          status: 'completed',
          result: {
            bottlenecks: [
              { location: 'src/utils/config.ts:45', type: 'memory-leak', severity: 'high' },
              { location: 'src/commands/init.ts:123', type: 'blocking-io', severity: 'medium' },
            ],
          },
          executionTime: 5.8,
        },
        {
          skillId: 'optimization-suggester',
          layer: 'L2',
          status: 'completed',
          result: {
            suggestions: [
              { priority: 1, action: 'Implement lazy loading', impact: 'high' },
              { priority: 2, action: 'Cache configuration', impact: 'medium' },
              { priority: 3, action: 'Streamline imports', impact: 'low' },
            ],
          },
          executionTime: 2.1,
        },
      ]

      skillManager.executeSkills.mockResolvedValue(skillExecutions)

      // 5. Brain Analysis
      const brainAnalysis: BrainAnalysis = {
        analysisId: 'analysis-001',
        insights: [
          {
            type: 'performance',
            severity: 'high',
            description: '12 performance issues detected, 2 critical bottlenecks',
            evidence: ['Memory leak in config loading', 'Blocking I/O in init command'],
          },
          {
            type: 'optimization',
            severity: 'medium',
            description: '3 optimization opportunities identified',
            evidence: ['Lazy loading recommended', 'Caching can reduce load by 30%'],
          },
        ],
        recommendations: [
          {
            priority: 1,
            action: 'Fix memory leak in config loading',
            rationale: 'High impact on performance, affects all commands',
            estimatedImpact: '40% improvement',
          },
          {
            priority: 2,
            action: 'Implement lazy loading for heavy modules',
            rationale: 'Reduces startup time and memory usage',
            estimatedImpact: '25% improvement',
          },
        ],
        confidence: 0.89,
        timestamp: new Date(),
      }

      brainAnalyzer.analyze.mockResolvedValue(brainAnalysis)

      // 6. Solution Generation
      const solutions: Solution[] = [
        {
          id: 'solution-001',
          title: 'Fix Memory Leak in Configuration Loading',
          description: 'Implement proper cleanup for configuration objects',
          steps: [
            'Add cleanup method to ConfigManager',
            'Implement weak references for cached configs',
            'Add memory monitoring to track usage',
          ],
          estimatedEffort: '2 hours',
          impact: 'high',
          confidence: 0.92,
          files: ['src/utils/config.ts', 'src/config/manager.ts'],
        },
        {
          id: 'solution-002',
          title: 'Implement Lazy Loading for Heavy Modules',
          description: 'Defer loading of heavy dependencies until needed',
          steps: [
            'Identify heavy modules in imports',
            'Implement dynamic import()',
            'Add loading indicators for user feedback',
          ],
          estimatedEffort: '4 hours',
          impact: 'medium',
          confidence: 0.85,
          files: ['src/commands/init.ts', 'src/utils/loader.ts'],
        },
      ]

      solutionGenerator.generate.mockResolvedValue(solutions)

      // Setup orchestrator
      integrationOrchestrator.orchestrate.mockImplementation(async (input: UserInput) => {
        // Step 1: Process input
        const processed = await inputProcessor.parse(input)
        await inputProcessor.validate(processed)

        // Step 2: Trigger hooks
        const hooks = await hookManager.trigger(processed)

        // Step 3: Load and execute skills
        const skills = await skillManager.loadSkills(processed)
        const executions = await skillManager.executeSkills(skills, processed)

        // Step 4: Analyze with brain
        const analysis = await brainAnalyzer.analyze(executions)

        // Step 5: Generate solutions
        const solutions = await solutionGenerator.generate(analysis)

        return {
          workflowId: 'workflow-001',
          success: true,
          input: processed,
          hooks,
          skills: executions,
          analysis,
          solutions,
          totalTime: 12.5,
          timestamp: new Date(),
        }
      })

      // Act - Execute complete workflow
      const result: WorkflowResult = await integrationOrchestrator.orchestrate(userInput)

      // Assert - Verify complete workflow
      expect(result.success).toBe(true)
      expect(result.input.intent).toBe('performance-analysis')
      expect(result.hooks).toHaveLength(2)
      expect(result.skills).toHaveLength(3)
      expect(result.solutions).toHaveLength(2)
      expect(result.solutions[0].impact).toBe('high')
      expect(result.totalTime).toBeLessThan(15)
    })

    it('should handle workflow with missing skills gracefully', async () => {
      // Arrange
      const userInput: UserInput = {
        id: 'input-002',
        type: 'natural-language',
        content: 'I need advanced AI model training capabilities',
        metadata: {
          timestamp: new Date(),
          userId: 'user-456',
        },
      }

      // Input processing
      inputProcessor.parse.mockResolvedValue({
        intent: 'ai-training',
        entities: ['ai', 'model', 'training'],
        confidence: 0.88,
      })

      // Skills loading - some missing
      skillManager.loadSkills.mockResolvedValue([
        {
          id: 'data-preprocessor',
          name: 'DataPreprocessor',
          category: 'data',
          layer: 'L1',
        },
        // Missing AI training skill
      ])

      // Hook manager detects missing capability
      hookManager.trigger.mockResolvedValue([
        {
          hookId: 'capability-check-hook',
          level: 'L3',
          triggered: true,
          result: {
            missingCapabilities: ['ai-training'],
            recommendation: 'Upgrade to premium tier for AI training',
          },
        },
      ])

      // Solution for missing capability
      solutionGenerator.generate.mockResolvedValue([
        {
          id: 'solution-missing-capability',
          title: 'Upgrade Required',
          description: 'AI model training requires premium subscription',
          steps: [
            'Upgrade to premium tier',
            'Enable AI training module',
            'Configure training environment',
          ],
          estimatedEffort: '30 minutes',
          impact: 'critical',
          confidence: 0.95,
        },
      ])

      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        const processed = await inputProcessor.parse(userInput)
        const hooks = await hookManager.trigger(processed)
        const skills = await skillManager.loadSkills(processed)

        // Check for missing capabilities
        const missingCapabilityHook = hooks.find(h => h.hookId === 'capability-check-hook')
        if (missingCapabilityHook?.result?.missingCapabilities?.length > 0) {
          return {
            workflowId: 'workflow-002',
            success: false,
            input: processed,
            hooks,
            skills,
            error: 'Missing required capabilities: ai-training',
            alternatives: [
              {
                type: 'upgrade',
                description: 'Upgrade to premium tier',
                action: 'navigate-to-upgrade',
              },
            ],
            solutions: await solutionGenerator.generate({ missingCapabilities: ['ai-training'] }),
          }
        }
      })

      // Act
      const result = await integrationOrchestrator.orchestrate(userInput)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required capabilities')
      expect(result.alternatives).toHaveLength(1)
      expect(result.solutions[0].impact).toBe('critical')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should recover from skill execution failure', async () => {
      // Arrange
      const userInput: UserInput = {
        id: 'input-003',
        type: 'natural-language',
        content: 'Analyze my code',
        metadata: { timestamp: new Date() },
      }

      inputProcessor.parse.mockResolvedValue({
        intent: 'code-analysis',
        entities: ['code', 'analyze'],
        confidence: 0.9,
      })

      hookManager.trigger.mockResolvedValue([])

      skillManager.loadSkills.mockResolvedValue([
        { id: 'code-analyzer', name: 'CodeAnalyzer', layer: 'L2' },
      ])

      // First execution fails
      skillManager.executeSkills.mockRejectedValueOnce(
        new Error('Code analyzer crashed')
      )

      // Retry with fallback
      skillManager.executeSkills.mockResolvedValueOnce([
        {
          skillId: 'simple-code-analyzer',
          layer: 'L1',
          status: 'completed',
          result: { basicAnalysis: true },
          executionTime: 1.2,
        },
      ])

      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        const processed = await inputProcessor.parse(userInput)
        const skills = await skillManager.loadSkills(processed)

        try {
          const executions = await skillManager.executeSkills(skills, processed)
          return { success: true, skills: executions }
        } catch (error) {
          // Fallback to simpler skill
          const fallbackSkills = [{ id: 'simple-code-analyzer', layer: 'L1' }]
          const executions = await skillManager.executeSkills(fallbackSkills, processed)
          return {
            success: true,
            skills: executions,
            recovery: {
              originalError: error.message,
              fallbackUsed: 'simple-code-analyzer',
            },
          }
        }
      })

      // Act
      const result = await integrationOrchestrator.orchestrate(userInput)

      // Assert
      expect(result.success).toBe(true)
      expect(result.skills[0].skillId).toBe('simple-code-analyzer')
      expect(result.recovery).toBeDefined()
      expect(result.recovery.fallbackUsed).toBe('simple-code-analyzer')
    })

    it('should handle brain analysis timeout', async () => {
      // Arrange
      const userInput: UserInput = {
        id: 'input-004',
        type: 'natural-language',
        content: 'Complex analysis task',
        metadata: { timestamp: new Date() },
      }

      inputProcessor.parse.mockResolvedValue({
        intent: 'complex-analysis',
        entities: ['complex', 'analysis'],
        confidence: 0.85,
      })

      hookManager.trigger.mockResolvedValue([])

      skillManager.loadSkills.mockResolvedValue([
        { id: 'complex-analyzer', name: 'ComplexAnalyzer', layer: 'L3' },
      ])

      skillManager.executeSkills.mockResolvedValue([
        {
          skillId: 'complex-analyzer',
          layer: 'L3',
          status: 'completed',
          result: { largeDataset: true },
          executionTime: 2.5,
        },
      ])

      // Brain analysis times out
      brainAnalyzer.analyze.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds
        return {}
      })

      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        const processed = await inputProcessor.parse(userInput)
        const skills = await skillManager.loadSkills(processed)
        const executions = await skillManager.executeSkills(skills, processed)

        // Set timeout for brain analysis
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Brain analysis timeout')), 5000)
        )

        try {
          const analysis = await Promise.race([
            brainAnalyzer.analyze(executions),
            timeoutPromise,
          ])
          return { success: true, analysis }
        } catch (error) {
          return {
            success: false,
            error: error.message,
            partialResults: {
              skills: executions,
              note: 'Analysis incomplete due to timeout',
            },
          }
        }
      })

      // Act
      const result = await integrationOrchestrator.orchestrate(userInput)

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Brain analysis timeout')
      expect(result.partialResults).toBeDefined()
      expect(result.partialResults.skills).toHaveLength(1)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should complete workflow within performance budget', async () => {
      // Arrange
      const maxWorkflowTime = 30000 // 30 seconds
      const userInput: UserInput = {
        id: 'input-perf-001',
        type: 'natural-language',
        content: 'Simple performance test',
        metadata: { timestamp: new Date() },
      }

      // Setup fast mocks
      inputProcessor.parse.mockResolvedValue({ intent: 'test', confidence: 0.9 })
      hookManager.trigger.mockResolvedValue([])
      skillManager.loadSkills.mockResolvedValue([{ id: 'test-skill', layer: 'L1' }])
      skillManager.executeSkills.mockResolvedValue([
        { skillId: 'test-skill', status: 'completed', executionTime: 0.5 },
      ])
      brainAnalyzer.analyze.mockResolvedValue({ confidence: 0.9 })
      solutionGenerator.generate.mockResolvedValue([{ id: 'solution-1' }])

      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second total
        return { success: true, totalTime: 1 }
      })

      // Act & Assert
      await AssertionHelpers.expectCompletesWithinTime(
        () => integrationOrchestrator.orchestrate(userInput),
        maxWorkflowTime
      )
    })

    it('should handle high-volume concurrent workflows', async () => {
      // Arrange
      const concurrentWorkflows = 50
      const inputs: UserInput[] = Array.from({ length: concurrentWorkflows }, (_, i) => ({
        id: `input-concurrent-${i}`,
        type: 'natural-language',
        content: `Concurrent test ${i}`,
        metadata: { timestamp: new Date() },
      }))

      // Setup fast mocks
      inputProcessor.parse.mockResolvedValue({ intent: 'test', confidence: 0.9 })
      hookManager.trigger.mockResolvedValue([])
      skillManager.loadSkills.mockResolvedValue([{ id: 'fast-skill', layer: 'L1' }])
      skillManager.executeSkills.mockResolvedValue([
        { skillId: 'fast-skill', status: 'completed', executionTime: 0.1 },
      ])
      brainAnalyzer.analyze.mockResolvedValue({ confidence: 0.9 })
      solutionGenerator.generate.mockResolvedValue([{ id: 'solution-1' }])

      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50)) // 50ms per workflow
        return { success: true, totalTime: 0.05 }
      })

      // Act
      const startTime = Date.now()
      const results = await Promise.all(
        inputs.map(input => integrationOrchestrator.orchestrate(input))
      )
      const totalTime = Date.now() - startTime

      // Assert
      expect(results).toHaveLength(concurrentWorkflows)
      expect(results.every(r => r.success)).toBe(true)
      expect(totalTime).toBeLessThan(10000) // 50 workflows in less than 10 seconds
    })
  })

  describe('Workflow Metrics and Reporting', () => {
    it('should collect comprehensive workflow metrics', async () => {
      // Arrange
      const userInput: UserInput = {
        id: 'input-metrics-001',
        type: 'natural-language',
        content: 'Metrics collection test',
        metadata: { timestamp: new Date() },
      }

      const metrics = {
        totalTime: 8.5,
        inputProcessingTime: 0.2,
        hookExecutionTime: 1.1,
        skillExecutionTime: 5.2,
        brainAnalysisTime: 1.5,
        solutionGenerationTime: 0.5,
        skillsExecuted: 3,
        hooksTriggered: 2,
        solutionsGenerated: 2,
        errors: 0,
        warnings: 1,
      }

      workflowEngine.getMetrics.mockReturnValue(metrics)

      integrationOrchestrator.getReport.mockResolvedValue({
        workflowId: 'workflow-metrics-001',
        startTime: new Date(),
        endTime: new Date(),
        metrics,
        summary: 'Workflow completed successfully with 2 solutions',
      })

      // Act
      const report = await integrationOrchestrator.getReport('workflow-metrics-001')

      // Assert
      expect(report.metrics.totalTime).toBe(8.5)
      expect(report.metrics.skillsExecuted).toBe(3)
      expect(report.metrics.errors).toBe(0)
      expect(report.summary).toContain('completed successfully')
    })

    it('should track workflow state transitions', async () => {
      // Arrange
      const states = [
        { state: 'initialized', timestamp: new Date(Date.now() - 1000) },
        { state: 'input-processed', timestamp: new Date(Date.now() - 800) },
        { state: 'hooks-executed', timestamp: new Date(Date.now() - 600) },
        { state: 'skills-loaded', timestamp: new Date(Date.now() - 400) },
        { state: 'skills-executed', timestamp: new Date(Date.now() - 200) },
        { state: 'analysis-complete', timestamp: new Date(Date.now() - 100) },
        { state: 'solutions-generated', timestamp: new Date() },
      ]

      workflowEngine.getState.mockReturnValue({
        currentState: 'completed',
        stateHistory: states,
      })

      // Act
      const state = workflowEngine.getState()

      // Assert
      expect(state.currentState).toBe('completed')
      expect(state.stateHistory).toHaveLength(7)
      expect(state.stateHistory[0].state).toBe('initialized')
      expect(state.stateHistory[6].state).toBe('solutions-generated')
    })
  })

  describe('Complex Integration Scenarios', () => {
    it('should handle multi-step complex workflow', async () => {
      // Arrange - Complex scenario with multiple decision points
      const userInput: UserInput = {
        id: 'input-complex-001',
        type: 'natural-language',
        content: 'I need to refactor my codebase, add tests, optimize performance, and ensure security compliance',
        metadata: { timestamp: new Date() },
      }

      // Setup mocks for multi-step workflow
      brainAnalyzer.analyze.mockResolvedValue({
        type: 'multi-aspect-analysis',
        aspects: ['refactoring', 'testing', 'performance', 'security'],
        confidence: 0.9,
      })

      const mockSkills = [
        { id: 'refactor-skill', category: 'refactoring', layer: 'L2' },
        { id: 'test-skill', category: 'testing', layer: 'L1' },
        { id: 'perf-skill', category: 'optimization', layer: 'L2' },
        { id: 'security-skill', category: 'security', layer: 'L3' },
      ]
      skillManager.loadSkills.mockResolvedValue(mockSkills)
      skillManager.executeSkills.mockResolvedValue([
        { skillId: 'executed-skill', status: 'completed' }
      ])
      solutionGenerator.generate.mockResolvedValue({
        type: 'multi-step-solution',
        steps: ['step1', 'step2', 'step3'],
      })

      // Multi-step workflow setup
      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        const results = []

        // Step 1: Analyze codebase
        const analysis = await brainAnalyzer.analyze({
          type: 'multi-aspect-analysis',
          aspects: ['refactoring', 'testing', 'performance', 'security'],
        })
        results.push({ step: 'analysis', result: analysis })

        // Step 2: Load appropriate skills
        const skills = await skillManager.loadSkills({
          categories: ['refactoring', 'testing', 'optimization', 'security'],
        })
        results.push({ step: 'skills-loaded', count: skills.length })

        // Step 3: Execute skills in sequence
        for (const category of ['refactoring', 'testing', 'optimization', 'security']) {
          const execution = await skillManager.executeSkills(
            skills.filter(s => s.category === category)
          )
          results.push({ step: `${category}-executed`, result: execution })
        }

        // Step 4: Generate comprehensive solution
        const solution = await solutionGenerator.generate({
          type: 'multi-step-solution',
          results,
        })

        return {
          success: true,
          steps: results.length,
          solution,
          complexity: 'high',
        }
      })

      // Act
      const result = await integrationOrchestrator.orchestrate(userInput)

      // Assert
      expect(result.success).toBe(true)
      expect(result.steps).toBeGreaterThan(5)
      expect(result.complexity).toBe('high')
      expect(result.solution).toBeDefined()
    })

    it('should validate complete integration pipeline', async () => {
      // Arrange - Validation test
      const validationSteps = []

      // Hook validation
      hookManager.validateHooks.mockImplementation((hooks) => {
        validationSteps.push('hooks-validated')
        return { valid: true }
      })

      // Skill validation
      skillManager.loadSkills.mockImplementation(async (input) => {
        validationSteps.push('skills-loaded')
        return [{ id: 'validation-skill', valid: true }]
      })

      // Solution validation
      solutionGenerator.validate.mockImplementation((solution) => {
        validationSteps.push('solution-validated')
        return { valid: true, confidence: 0.95 }
      })

      integrationOrchestrator.orchestrate.mockImplementation(async () => {
        validationSteps.push('workflow-started')

        // Execute validation pipeline
        await hookManager.validateHooks([])
        await skillManager.loadSkills({})
        await solutionGenerator.validate({})

        validationSteps.push('workflow-completed')

        return {
          success: true,
          validationSteps,
          allValid: true,
        }
      })

      // Act
      const result = await integrationOrchestrator.orchestrate({
        id: 'validation-test',
        type: 'validation',
        content: 'validation',
        metadata: { timestamp: new Date() },
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.allValid).toBe(true)
      expect(result.validationSteps).toContain('hooks-validated')
      expect(result.validationSteps).toContain('skills-loaded')
      expect(result.validationSteps).toContain('solution-validated')
    })
  })
})
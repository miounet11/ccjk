/**
 * Multi-Agent Orchestrator
 *
 * Coordinates multiple AI agents to accomplish complex tasks through
 * intelligent agent selection, task decomposition, and result aggregation.
 */

import type { Task } from '../types/agent.js'
import { AGENT_REGISTRY, type ExtendedAgentCapability } from './registry.js'

// Types for orchestration system (local definitions to avoid circular dependencies)
export interface Agent {
  id: string
  name: string
  model: string
  role: string
  capabilities: string[]
  costPerToken: number
  relevanceScore?: number
}

export interface OrchestratedTask {
  agentId: string
  agentName: string
  task: Task
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  dependencies: string[]
  result?: string
  error?: string
}

export interface OrchestratorConfig {
  maxAgents: number
  minAgents: number
  conflictResolution: 'vote' | 'highest_confidence' | 'merge'
  enableTaskSplitting: boolean
  maxSubtasks: number
  collaborationBonus: number
  costThreshold: number
}

export interface AgentContribution {
  agentId: string
  contribution: string
  confidence: number
}

export interface OrchestratorResult {
  success: boolean
  finalResult: string
  confidence: number
  agentContributions: AgentContribution[]
  totalCost: number
  duration: number
  error?: string
  metadata?: {
    agentCount: number
    taskSplit: boolean
    conflictResolution: string
  }
}

/**
 * Default orchestrator configuration
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  maxAgents: 5,
  minAgents: 1,
  conflictResolution: 'vote',
  enableTaskSplitting: true,
  maxSubtasks: 10,
  collaborationBonus: 0.2,
  costThreshold: 500,
}

export class AgentOrchestrator {
  private config: OrchestratorConfig
  private registry: ExtendedAgentCapability[]

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.registry = AGENT_REGISTRY
  }

  /**
   * Select appropriate agents for a given task
   */
  async selectAgents(task: Task): Promise<Agent[]> {
    const taskKeywords = this.extractKeywords(task.description + ' ' + task.requiredCapabilities.join(' '))
    const scoredAgents = this.registry.map(agent => ({
      agent,
      score: this.calculateRelevanceScore(agent, taskKeywords),
    }))

    // Sort by relevance score
    scoredAgents.sort((a, b) => b.score - a.score)

    // Filter by cost threshold (but keep even zero-score agents for minAgents requirement)
    const affordableAgents = scoredAgents.filter(
      ({ agent }) => agent.cost <= this.config.costThreshold
    )

    // Select agents ensuring minAgents is met
    let selectedCount = affordableAgents.length

    // If we have fewer than minAgents with positive scores, include zero-score agents
    const positiveScoreAgents = affordableAgents.filter(({ score }) => score > 0)
    if (positiveScoreAgents.length < this.config.minAgents) {
      selectedCount = Math.min(this.config.maxAgents, affordableAgents.length)
    } else {
      selectedCount = Math.min(this.config.maxAgents, Math.max(this.config.minAgents, positiveScoreAgents.length))
    }

    const selectedAgents = affordableAgents.slice(0, selectedCount)

    // Return Agent instances with collaboration bonus applied
    return selectedAgents.map(({ agent, score }) => ({
      id: agent.id,
      name: agent.name,
      model: this.selectModelForAgent(agent),
      role: agent.expertise[0] || 'general',
      capabilities: agent.expertise,
      costPerToken: agent.cost,
      relevanceScore: score,
    }))
  }

  /**
   * Orchestrate multiple agents to complete a task
   */
  async orchestrate(agents: Agent[], task: Task): Promise<OrchestratorResult> {
    const startTime = Date.now()

    try {
      // Determine if we should split the task
      const shouldSplit = this.config.enableTaskSplitting && agents.length > 1

      let subtasks: OrchestratedTask[]

      if (shouldSplit) {
        // Split task among agents
        const taskSplits = this.splitTask(task, agents.length)
        subtasks = agents.map((agent, index) => ({
          agentId: agent.id,
          agentName: agent.name,
          task: taskSplits[index] || task,
          status: 'pending',
          dependencies: [],
        }))
      } else {
        // All agents work on the same task
        subtasks = agents.map(agent => ({
          agentId: agent.id,
          agentName: agent.name,
          task,
          status: 'pending',
          dependencies: [],
        }))
      }

      // Simulate agent execution (in real implementation, this would call actual agents)
      const results = await this.executeAgents(subtasks)

      // Aggregate results
      const aggregatedResult = this.aggregateResults(results, agents)

      // Calculate total cost
      const totalCost = agents.reduce((sum, agent) => sum + agent.costPerToken, 0)

      return {
        success: true,
        finalResult: aggregatedResult.content,
        confidence: aggregatedResult.confidence,
        agentContributions: results.map(r => ({
          agentId: r.agentId,
          contribution: r.result,
          confidence: r.confidence,
        })),
        totalCost,
        duration: Date.now() - startTime,
        metadata: {
          agentCount: agents.length,
          taskSplit: shouldSplit,
          conflictResolution: this.config.conflictResolution,
        },
      }
    } catch (error) {
      return {
        success: false,
        finalResult: '',
        confidence: 0,
        agentContributions: [],
        totalCost: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Execute agents on their assigned tasks
   */
  private async executeAgents(subtasks: OrchestratedTask[]): Promise<Array<{
    agentId: string
    result: string
    confidence: number
  }>> {
    // In a real implementation, this would:
    // 1. Send tasks to actual agent instances
    // 2. Handle communication between agents
    // 3. Collect results with retry logic

    return subtasks.map(subtask => ({
      agentId: subtask.agentId,
      result: `[Result from ${subtask.agentName} for task: ${subtask.task.description}]`,
      confidence: 0.8,
    }))
  }

  /**
   * Aggregate results from multiple agents
   */
  private aggregateResults(
    results: Array<{ agentId: string; result: string; confidence: number }>,
    agents: Agent[]
  ): { content: string; confidence: number } {
    if (results.length === 0) {
      return { content: '', confidence: 0 }
    }

    if (results.length === 1) {
      return {
        content: results[0].result,
        confidence: results[0].confidence,
      }
    }

    // Check for conflicts
    const conflicts = this.detectConflicts(results)

    if (conflicts.length > 0) {
      return this.resolveConflict(results, agents)
    }

    // No conflicts - merge results
    const mergedContent = results.map(r => r.result).join('\n\n')
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

    return {
      content: mergedContent,
      confidence: avgConfidence,
    }
  }

  /**
   * Detect conflicts between agent results
   */
  private detectConflicts(
    results: Array<{ agentId: string; result: string; confidence: number }>
  ): Array<{ type: string; description: string }> {
    const conflicts: Array<{ type: string; description: string }> = []

    // Simple conflict detection based on content similarity
    // In real implementation, this would use more sophisticated NLP
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const similarity = this.calculateSimilarity(results[i].result, results[j].result)
        if (similarity < 0.3) {
          conflicts.push({
            type: 'content_divergence',
            description: `Results from ${results[i].agentId} and ${results[j].agentId} diverge significantly`,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * Resolve conflicts between agent results
   */
  private resolveConflict(
    results: Array<{ agentId: string; result: string; confidence: number }>,
    agents: Agent[]
  ): { content: string; confidence: number } {
    switch (this.config.conflictResolution) {
      case 'vote':
        // Weighted voting based on confidence and agent cost
        const weightedResults = results.map(r => {
          const agent = agents.find(a => a.id === r.agentId)
          const weight = r.confidence * (agent?.costPerToken || 1)
          return { ...r, weight }
        })

        const totalWeight = weightedResults.reduce((sum, r) => sum + r.weight, 0)
        const bestResult = weightedResults.reduce((best, current) =>
          current.weight > best.weight ? current : best
        )

        return {
          content: bestResult.result,
          confidence: bestResult.confidence * (bestResult.weight / totalWeight),
        }

      case 'highest_confidence':
        const highestConfidence = results.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )
        return {
          content: highestConfidence.result,
          confidence: highestConfidence.confidence,
        }

      case 'merge':
        // Attempt to merge conflicting results
        const mergedContent = results.map(r => `[${r.agentId}]: ${r.result}`).join('\n\n')
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

        return {
          content: mergedContent,
          confidence: avgConfidence * 0.8, // Slightly lower confidence for merged results
        }

      default:
        return {
          content: results[0].result,
          confidence: results[0].confidence,
        }
    }
  }

  /**
   * Split a task into subtasks for multiple agents
   */
  splitTask(task: Task, agentCount: number): Task[] {
    const subtasks: Task[] = []

    // Strategy 1: Split by requirements
    if (task.requiredCapabilities.length >= agentCount) {
      const reqsPerAgent = Math.ceil(task.requiredCapabilities.length / agentCount)

      for (let i = 0; i < agentCount; i++) {
        const start = i * reqsPerAgent
        const end = start + reqsPerAgent
        const subReqs = task.requiredCapabilities.slice(start, end)

        if (subReqs.length > 0) {
          subtasks.push({
            ...task,
            description: `${task.description} (Part ${i + 1}/${agentCount})`,
            requiredCapabilities: subReqs,
          })
        }
      }
    }
    // Strategy 2: Split by phases (plan, implement, test, review)
    else {
      const phases = this.determinePhases(task)
      const phasesPerAgent = Math.ceil(phases.length / agentCount)

      for (let i = 0; i < agentCount; i++) {
        const start = i * phasesPerAgent
        const end = start + phasesPerAgent
        const agentPhases = phases.slice(start, end)

        if (agentPhases.length > 0) {
          subtasks.push({
            ...task,
            description: `${task.description} (${agentPhases.join(' → ')})`,
            requiredCapabilities: task.requiredCapabilities,
          })
        }
      }
    }

    return subtasks.length > 0 ? subtasks : [task]
  }

  /**
   * Extract keywords from task description
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    return [...new Set(words)]
  }

  /**
   * Calculate relevance score for an agent
   */
  private calculateRelevanceScore(agent: ExtendedAgentCapability, keywords: string[]): number {
    let score = 0

    for (const keyword of keywords) {
      for (const expertise of agent.expertise) {
        if (expertise.toLowerCase().includes(keyword)) {
          score += 10
        }
      }
    }

    // Apply collaboration bonus
    if (agent.canCollaborate.length > 0) {
      score *= (1 + this.config.collaborationBonus)
    }

    // Cost penalty (lower cost is slightly preferred)
    score *= (1 - (agent.cost / 10000))

    return Math.max(0, score)
  }

  /**
   * Select appropriate model for an agent
   */
  private selectModelForAgent(agent: ExtendedAgentCapability): string {
    // Map agent capabilities to models
    if (agent.expertise.includes('architecture') || agent.expertise.includes('config')) {
      return 'opus'
    }
    if (agent.expertise.includes('testing')) {
      return 'sonnet'
    }
    if (agent.expertise.includes('template')) {
      return 'haiku'
    }
    return 'sonnet' // Default
  }

  /**
   * Determine development phases for a task
   */
  private determinePhases(task: Task): string[] {
    const phases: string[] = []

    if (task.requiredCapabilities.some(r => r.includes('test'))) {
      phases.push('test')
    }

    if (task.requiredCapabilities.some(r => r.includes('implement') || r.includes('code'))) {
      phases.push('implement')
    }

    if (task.requiredCapabilities.some(r => r.includes('review') || r.includes('check'))) {
      phases.push('review')
    }

    if (task.requiredCapabilities.some(r => r.includes('plan') || r.includes('design'))) {
      phases.unshift('plan')
    }

    return phases.length > 0 ? phases : ['execute']
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return union.size > 0 ? intersection.size / union.size : 0
  }
}

/**
 * Agent System - Unified Exports
 *
 * This module provides a comprehensive agent system for CCJK with specialized agents
 * for different tasks including code analysis, research, and execution.
 */

import type {
  AgentCapability as AgentCapabilityType,
  AgentConfig as AgentConfigType,
  AgentContext as AgentContextType,
  AgentFactory as AgentFactoryType,
  AgentMessage as AgentMessageType,
  AgentResult as AgentResultType,
} from './base-agent'
import process from 'node:process'
import {
  AgentRegistry as AgentRegistryClass,
  AgentState as AgentStateEnum,
  BaseAgent as BaseAgentClass,
} from './base-agent'
import { CodeAgent as CodeAgentClass } from './code-agent'
import { ExecutorAgent as ExecutorAgentClass } from './executor-agent'
import { ResearchAgent as ResearchAgentClass } from './research-agent'

// Re-export Base Agent System
export const AgentRegistry = AgentRegistryClass
export const AgentState = AgentStateEnum
export const BaseAgent = BaseAgentClass
export type AgentCapability = AgentCapabilityType
export type AgentConfig = AgentConfigType
export type AgentContext = AgentContextType
export type AgentFactory = AgentFactoryType
export type AgentMessage = AgentMessageType
export type AgentResult = AgentResultType

// Re-export Code Agent
export const CodeAgent = CodeAgentClass

export type {
  CodeAnalysisResult,
  CodeIssue,
  CodeMetrics,
  CodeSuggestion,
  PerformanceAnalysis,
  PerformanceBottleneck,
  PerformanceRecommendation,
  RefactoringPlan,
  RefactoringStep,
} from './code-agent'

// Re-export Executor Agent
export const ExecutorAgent = ExecutorAgentClass

export type {
  ActionResult,
  BackupEntry,
  BackupFile,
  CommandExecution,
  CommandResult,
  ExecutionAction,
  ExecutionResult,
  ExecutionTask,
  FileOperation,
  FileOperationOptions,
  RollbackAction,
  ValidationResult,
  ValidationRule,
} from './executor-agent'

// Re-export Research Agent
export const ResearchAgent = ResearchAgentClass

export type {
  ComparisonCriteria,
  ComparisonMatrix,
  DocumentationFile,
  DocumentationIndex,
  KnowledgeBase,
  KnowledgeEntry,
  KnowledgeRelationship,
  ResearchFilter,
  ResearchInsight,
  ResearchQuery,
  ResearchResult,
  ResearchSource,
  Solution,
  SolutionComparison,
} from './research-agent'

/**
 * Agent Factory Implementation
 * Creates agents based on type string
 */
export function createAgent(type: string, context: AgentContextType): BaseAgentClass {
  switch (type.toLowerCase()) {
    case 'code':
    case 'code-agent':
      return new CodeAgentClass(context)

    case 'research':
    case 'research-agent':
      return new ResearchAgentClass(context)

    case 'executor':
    case 'executor-agent':
      return new ExecutorAgentClass(context)

    default:
      throw new Error(`Unknown agent type: ${type}`)
  }
}

/**
 * Agent Manager
 * Manages multiple agents and coordinates their interactions
 */
export class AgentManager {
  private registry: AgentRegistryClass
  private context: AgentContextType

  constructor(context: AgentContextType) {
    this.registry = new AgentRegistryClass()
    this.context = context
  }

  /**
   * Create and register an agent
   */
  async createAgent(type: string): Promise<BaseAgentClass> {
    const agent = createAgent(type, this.context)
    await agent.initialize()
    this.registry.register(agent)
    return agent
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): BaseAgentClass | undefined {
    return this.registry.get(name)
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgentClass[] {
    return this.registry.getAll()
  }

  /**
   * Remove agent
   */
  async removeAgent(name: string): Promise<void> {
    const agent = this.registry.get(name)
    if (agent) {
      await agent.cleanup()
      this.registry.unregister(name)
    }
  }

  /**
   * Cleanup all agents
   */
  async cleanup(): Promise<void> {
    const agents = this.registry.getAll()
    await Promise.all(agents.map(agent => agent.cleanup()))
    this.registry.clear()
  }

  /**
   * Get agent count
   */
  getAgentCount(): number {
    return this.registry.size()
  }

  /**
   * Check if agent exists
   */
  hasAgent(name: string): boolean {
    return this.registry.has(name)
  }
}

/**
 * Create default agent context
 */
export function createDefaultContext(overrides?: Partial<AgentContextType>): AgentContextType {
  return {
    workingDirectory: process.cwd(),
    projectRoot: process.cwd(),
    language: 'en',
    environment: { ...process.env } as Record<string, string>,
    history: [],
    ...overrides,
  }
}

/**
 * Agent System Version
 */
export const AGENT_SYSTEM_VERSION = '1.0.0'

/**
 * Available agent types
 */
export const AGENT_TYPES = {
  CODE: 'code-agent',
  RESEARCH: 'research-agent',
  EXECUTOR: 'executor-agent',
} as const

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES]

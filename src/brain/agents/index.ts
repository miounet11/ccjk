/**
 * Agent System - Unified Exports
 *
 * This module provides a comprehensive agent system for CCJK with specialized agents
 * for different tasks including code analysis, research, execution, and world-class
 * domain expertise (architecture, security, performance, testing, DevOps, data, AI/ML).
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
import { AIMLAgent as AIMLAgentClass } from './ai-ml-agent'
import { ArchitectureAgent as ArchitectureAgentClass } from './architecture-agent'
import {
  AgentRegistry as AgentRegistryClass,
  AgentState as AgentStateEnum,
  BaseAgent as BaseAgentClass,
} from './base-agent'
import { CodeAgent as CodeAgentClass } from './code-agent'
import { DataAgent as DataAgentClass } from './data-agent'
import { DevOpsAgent as DevOpsAgentClass } from './devops-agent'
import { ExecutorAgent as ExecutorAgentClass } from './executor-agent'
import { PerformanceAgent as PerformanceAgentClass } from './performance-agent'
import { ResearchAgent as ResearchAgentClass } from './research-agent'
import { SecurityAgent as SecurityAgentClass } from './security-agent'
import { TestingAgent as TestingAgentClass } from './testing-agent'

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

// Re-export World-Class Specialized Agents
export const ArchitectureAgent = ArchitectureAgentClass
export const PerformanceAgent = PerformanceAgentClass
export const SecurityAgent = SecurityAgentClass
export const TestingAgent = TestingAgentClass
export const DevOpsAgent = DevOpsAgentClass
export const DataAgent = DataAgentClass
export const AIMLAgent = AIMLAgentClass

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

    // World-Class Specialized Agents
    case 'architecture':
    case 'architecture-agent':
      return new ArchitectureAgentClass(context)

    case 'performance':
    case 'performance-agent':
      return new PerformanceAgentClass(context)

    case 'security':
    case 'security-agent':
      return new SecurityAgentClass(context)

    case 'testing':
    case 'testing-agent':
      return new TestingAgentClass(context)

    case 'devops':
    case 'devops-agent':
      return new DevOpsAgentClass(context)

    case 'data':
    case 'data-agent':
      return new DataAgentClass(context)

    case 'ai-ml':
    case 'ai-ml-agent':
    case 'aiml':
    case 'ml':
      return new AIMLAgentClass(context)

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
  // Core Agents
  CODE: 'code-agent',
  RESEARCH: 'research-agent',
  EXECUTOR: 'executor-agent',
  // World-Class Specialized Agents
  ARCHITECTURE: 'architecture-agent',
  PERFORMANCE: 'performance-agent',
  SECURITY: 'security-agent',
  TESTING: 'testing-agent',
  DEVOPS: 'devops-agent',
  DATA: 'data-agent',
  AI_ML: 'ai-ml-agent',
} as const

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES]

/**
 * Agent Model Configuration
 * Defines which Claude model each agent should use
 *
 * opus: Deep reasoning, complex architecture, security analysis
 * sonnet: Balanced tasks, iterative work, code generation
 * haiku: Quick tasks, simple queries, fast responses
 */
export interface AgentModelConfig {
  type: AgentType
  model: 'opus' | 'sonnet' | 'haiku'
  description: string
  capabilities: string[]
}

export const AGENT_MODEL_CONFIG: Record<string, AgentModelConfig> = {
  'code-agent': {
    type: 'code-agent',
    model: 'sonnet',
    description: 'Code analysis, review, and refactoring',
    capabilities: ['analyze', 'review', 'refactor', 'performance', 'metrics'],
  },
  'research-agent': {
    type: 'research-agent',
    model: 'sonnet',
    description: 'Documentation search and knowledge integration',
    capabilities: ['search', 'integrate', 'compare', 'synthesize', 'index'],
  },
  'executor-agent': {
    type: 'executor-agent',
    model: 'sonnet',
    description: 'Command execution and file operations',
    capabilities: ['execute', 'file-operation', 'batch', 'validate', 'rollback'],
  },
  'architecture-agent': {
    type: 'architecture-agent',
    model: 'opus',
    description: 'System architecture design and evaluation',
    capabilities: [
      'design-system',
      'analyze-architecture',
      'evaluate-scalability',
      'security-review',
      'technology-selection',
      'migration-strategy',
    ],
  },
  'performance-agent': {
    type: 'performance-agent',
    model: 'sonnet',
    description: 'Performance optimization and analysis',
    capabilities: [
      'profile-performance',
      'optimize-algorithm',
      'optimize-database',
      'optimize-frontend',
      'detect-memory-leaks',
      'load-test',
      'benchmark',
    ],
  },
  'security-agent': {
    type: 'security-agent',
    model: 'opus',
    description: 'Security analysis and vulnerability detection',
    capabilities: [
      'security-audit',
      'vulnerability-scan',
      'dependency-audit',
      'threat-modeling',
      'compliance-check',
      'security-review',
      'penetration-test',
      'security-hardening',
    ],
  },
  'testing-agent': {
    type: 'testing-agent',
    model: 'sonnet',
    description: 'Test generation and quality assurance',
    capabilities: [
      'generate-tests',
      'analyze-coverage',
      'improve-tests',
      'mutation-testing',
      'property-testing',
      'test-refactoring',
      'test-quality',
      'generate-fixtures',
    ],
  },
  'devops-agent': {
    type: 'devops-agent',
    model: 'sonnet',
    description: 'CI/CD, deployment, and infrastructure automation',
    capabilities: [
      'design-pipeline',
      'optimize-pipeline',
      'generate-iac',
      'containerize',
      'kubernetes-config',
      'deployment-strategy',
      'monitoring-setup',
      'disaster-recovery',
    ],
  },
  'data-agent': {
    type: 'data-agent',
    model: 'opus',
    description: 'Data engineering and analytics',
    capabilities: [
      'design-pipeline',
      'optimize-query',
      'design-schema',
      'validate-data-quality',
      'generate-migration',
      'data-modeling',
      'streaming-pipeline',
      'data-governance',
    ],
  },
  'ai-ml-agent': {
    type: 'ai-ml-agent',
    model: 'opus',
    description: 'Machine learning and AI engineering',
    capabilities: [
      'design-ml-pipeline',
      'select-model',
      'feature-engineering',
      'hyperparameter-tuning',
      'evaluate-model',
      'optimize-model',
      'mlops-setup',
      'automl',
    ],
  },
}

/**
 * Get recommended agent for a specific task
 */
export function getRecommendedAgent(task: string): AgentType {
  const taskLower = task.toLowerCase()

  // Architecture tasks
  if (
    taskLower.includes('architecture')
    || taskLower.includes('design system')
    || taskLower.includes('scalability')
    || taskLower.includes('microservice')
  ) {
    return AGENT_TYPES.ARCHITECTURE
  }

  // Security tasks
  if (
    taskLower.includes('security')
    || taskLower.includes('vulnerability')
    || taskLower.includes('owasp')
    || taskLower.includes('penetration')
    || taskLower.includes('compliance')
  ) {
    return AGENT_TYPES.SECURITY
  }

  // Performance tasks
  if (
    taskLower.includes('performance')
    || taskLower.includes('optimize')
    || taskLower.includes('benchmark')
    || taskLower.includes('memory leak')
    || taskLower.includes('profil')
  ) {
    return AGENT_TYPES.PERFORMANCE
  }

  // Testing tasks
  if (
    taskLower.includes('test')
    || taskLower.includes('coverage')
    || taskLower.includes('mutation')
    || taskLower.includes('fixture')
  ) {
    return AGENT_TYPES.TESTING
  }

  // DevOps tasks
  if (
    taskLower.includes('ci/cd')
    || taskLower.includes('pipeline')
    || taskLower.includes('docker')
    || taskLower.includes('kubernetes')
    || taskLower.includes('deploy')
    || taskLower.includes('infrastructure')
  ) {
    return AGENT_TYPES.DEVOPS
  }

  // Data tasks
  if (
    taskLower.includes('data pipeline')
    || taskLower.includes('etl')
    || taskLower.includes('schema')
    || taskLower.includes('data quality')
    || taskLower.includes('warehouse')
  ) {
    return AGENT_TYPES.DATA
  }

  // AI/ML tasks
  if (
    taskLower.includes('machine learning')
    || taskLower.includes('ml')
    || taskLower.includes('model')
    || taskLower.includes('training')
    || taskLower.includes('automl')
    || taskLower.includes('feature engineering')
  ) {
    return AGENT_TYPES.AI_ML
  }

  // Code tasks
  if (
    taskLower.includes('code')
    || taskLower.includes('refactor')
    || taskLower.includes('review')
  ) {
    return AGENT_TYPES.CODE
  }

  // Research tasks
  if (
    taskLower.includes('research')
    || taskLower.includes('documentation')
    || taskLower.includes('search')
  ) {
    return AGENT_TYPES.RESEARCH
  }

  // Default to code agent
  return AGENT_TYPES.CODE
}

/**
 * Get all agents that can handle a specific capability
 */
export function getAgentsForCapability(capability: string): AgentType[] {
  const agents: AgentType[] = []

  for (const [agentType, config] of Object.entries(AGENT_MODEL_CONFIG)) {
    if (config.capabilities.includes(capability)) {
      agents.push(agentType as AgentType)
    }
  }

  return agents
}

/**
 * Mayor Agent
 *
 * AI coordinator that understands high-level user intent and automatically
 * creates convoys, spawns workers, and monitors progress.
 * Inspired by Gastown's Mayor pattern for intelligent task orchestration.
 *
 * @module brain/mayor/mayor-agent
 */

import type { AgentRole } from '../types'
import { EventEmitter } from 'node:events'
import { nanoid } from 'nanoid'
import { getGlobalConvoyManager, type ConvoyManager, type Convoy } from '../convoy/convoy-manager'
import { ProgressTracker, type ProgressUpdate } from '../convoy/progress-tracker'
import { getGlobalMailboxManager, type PersistentMailboxManager } from '../messaging/persistent-mailbox'

/**
 * User intent analysis result
 */
export interface Intent {
  id: string
  originalInput: string
  type: 'feature' | 'bugfix' | 'refactor' | 'research' | 'documentation' | 'testing' | 'deployment' | 'other'
  summary: string
  entities: {
    files?: string[]
    functions?: string[]
    components?: string[]
    technologies?: string[]
    keywords?: string[]
  }
  confidence: number
  approach: string
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex'
  requiredRoles: AgentRole[]
}

/**
 * Task plan generated from intent
 */
export interface TaskPlan {
  id: string
  name: string
  description: string
  tasks: Array<{
    title: string
    description: string
    role: AgentRole
    dependsOn: string[]
    estimatedEffort: 'minimal' | 'small' | 'medium' | 'large'
  }>
  totalEffort: string
  risks: string[]
  successCriteria: string[]
}

/**
 * Mayor response
 */
export interface MayorResponse {
  id: string
  convoyId: string
  plan: TaskPlan
  workerCount: number
  message: string
  timestamp: string
}

/**
 * Mayor agent configuration
 */
export interface MayorAgentConfig {
  autoCreateConvoy?: boolean
  autoSpawnWorkers?: boolean
  monitorProgress?: boolean
  progressInterval?: number
  notifyHuman?: boolean
  maxConcurrentWorkers?: number
}

/**
 * Mayor Agent
 *
 * The Mayor is an AI coordinator that:
 * - Analyzes user intent from natural language
 * - Creates task plans with dependencies
 * - Spawns and coordinates worker agents
 * - Monitors progress and reports results
 */
export class MayorAgent extends EventEmitter {
  readonly id: string
  private readonly config: Required<MayorAgentConfig>
  private readonly convoyManager: ConvoyManager
  private readonly mailboxManager: PersistentMailboxManager
  private readonly progressTrackers: Map<string, ProgressTracker> = new Map()
  private readonly activeConvoys: Set<string> = new Set()

  constructor(config: MayorAgentConfig = {}) {
    super()

    this.id = `mayor-${nanoid(6)}`
    this.config = {
      autoCreateConvoy: config.autoCreateConvoy ?? true,
      autoSpawnWorkers: config.autoSpawnWorkers ?? true,
      monitorProgress: config.monitorProgress ?? true,
      progressInterval: config.progressInterval ?? 5000,
      notifyHuman: config.notifyHuman ?? true,
      maxConcurrentWorkers: config.maxConcurrentWorkers ?? 5,
    }

    this.convoyManager = getGlobalConvoyManager()
    this.mailboxManager = getGlobalMailboxManager()

    this.setupEventListeners()
  }

  /**
   * Process user request - main entry point
   */
  async processRequest(input: string): Promise<MayorResponse> {
    try {
      // 1. Analyze intent
      const intent = await this.analyzeIntent(input)
      this.emit('intent:analyzed', intent)

      // 2. Create task plan
      const plan = await this.createTaskPlan(intent)
      this.emit('plan:created', plan)

      // 3. Create convoy
      let convoy: Convoy | null = null
      if (this.config.autoCreateConvoy) {
        convoy = await this.createConvoy(plan)
        this.emit('convoy:created', convoy)
      }

      // 4. Spawn workers
      let workerCount = 0
      if (this.config.autoSpawnWorkers && convoy) {
        workerCount = await this.spawnWorkers(convoy, plan)
        this.emit('workers:spawned', workerCount)
      }

      // 5. Start monitoring
      if (this.config.monitorProgress && convoy) {
        this.startMonitoring(convoy.id)
      }

      return {
        id: nanoid(),
        convoyId: convoy?.id ?? '',
        plan,
        workerCount,
        message: this.buildResponseMessage(plan, convoy, workerCount),
        timestamp: new Date().toISOString(),
      }
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Analyze user intent from natural language
   */
  async analyzeIntent(input: string): Promise<Intent> {
    const lowerInput = input.toLowerCase()

    // Determine intent type
    let type: Intent['type'] = 'other'
    if (lowerInput.includes('add') || lowerInput.includes('implement') || lowerInput.includes('create')) {
      type = 'feature'
    }
    else if (lowerInput.includes('fix') || lowerInput.includes('bug') || lowerInput.includes('error')) {
      type = 'bugfix'
    }
    else if (lowerInput.includes('refactor') || lowerInput.includes('clean') || lowerInput.includes('improve')) {
      type = 'refactor'
    }
    else if (lowerInput.includes('research') || lowerInput.includes('investigate')) {
      type = 'research'
    }
    else if (lowerInput.includes('document') || lowerInput.includes('docs')) {
      type = 'documentation'
    }
    else if (lowerInput.includes('test') || lowerInput.includes('spec')) {
      type = 'testing'
    }
    else if (lowerInput.includes('deploy') || lowerInput.includes('release')) {
      type = 'deployment'
    }

    const entities = {
      files: this.extractFiles(input),
      functions: this.extractFunctions(input),
      components: this.extractComponents(input),
      technologies: this.extractTechnologies(input),
      keywords: this.extractKeywords(input),
    }

    const complexity = this.estimateComplexity(input, entities)
    const requiredRoles = this.determineRequiredRoles(type, entities)

    return {
      id: nanoid(),
      originalInput: input,
      type,
      summary: this.generateSummary(input, type),
      entities,
      confidence: 0.8,
      approach: this.suggestApproach(type, complexity),
      complexity,
      requiredRoles,
    }
  }

  /**
   * Create task plan from intent
   */
  async createTaskPlan(intent: Intent): Promise<TaskPlan> {
    const tasks: TaskPlan['tasks'] = []

    switch (intent.type) {
      case 'feature':
        tasks.push(
          { title: 'Analyze requirements', description: `Understand: ${intent.summary}`, role: 'researcher', dependsOn: [], estimatedEffort: 'small' },
          { title: 'Design implementation', description: 'Create design and identify files', role: 'architect', dependsOn: ['task-0'], estimatedEffort: 'medium' },
          { title: 'Implement feature', description: 'Write the code', role: 'coder', dependsOn: ['task-1'], estimatedEffort: 'large' },
          { title: 'Write tests', description: 'Create tests', role: 'tester', dependsOn: ['task-2'], estimatedEffort: 'medium' },
          { title: 'Review', description: 'Code review', role: 'reviewer', dependsOn: ['task-3'], estimatedEffort: 'small' },
        )
        break

      case 'bugfix':
        tasks.push(
          { title: 'Reproduce issue', description: 'Understand the bug', role: 'researcher', dependsOn: [], estimatedEffort: 'small' },
          { title: 'Find root cause', description: 'Debug and find cause', role: 'debugger', dependsOn: ['task-0'], estimatedEffort: 'medium' },
          { title: 'Implement fix', description: 'Write the fix', role: 'coder', dependsOn: ['task-1'], estimatedEffort: 'medium' },
          { title: 'Add regression test', description: 'Prevent regression', role: 'tester', dependsOn: ['task-2'], estimatedEffort: 'small' },
        )
        break

      case 'refactor':
        tasks.push(
          { title: 'Analyze code', description: 'Understand current implementation', role: 'researcher', dependsOn: [], estimatedEffort: 'medium' },
          { title: 'Plan refactoring', description: 'Design approach', role: 'architect', dependsOn: ['task-0'], estimatedEffort: 'medium' },
          { title: 'Execute refactoring', description: 'Perform refactoring', role: 'coder', dependsOn: ['task-1'], estimatedEffort: 'large' },
          { title: 'Verify tests', description: 'Ensure tests pass', role: 'tester', dependsOn: ['task-2'], estimatedEffort: 'small' },
        )
        break

      default:
        tasks.push(
          { title: 'Analyze request', description: `Understand: ${intent.summary}`, role: 'researcher', dependsOn: [], estimatedEffort: 'small' },
          { title: 'Execute task', description: 'Perform the work', role: 'coder', dependsOn: ['task-0'], estimatedEffort: 'medium' },
        )
    }

    return {
      id: nanoid(),
      name: intent.summary,
      description: `Task plan for: ${intent.originalInput}`,
      tasks,
      totalEffort: this.calculateTotalEffort(tasks),
      risks: this.identifyRisks(intent),
      successCriteria: this.defineSuccessCriteria(intent),
    }
  }

  /**
   * Create convoy from task plan
   */
  async createConvoy(plan: TaskPlan): Promise<Convoy> {
    const convoy = await this.convoyManager.create(plan.name, {
      description: plan.description,
      createdBy: this.id,
      notifyOnComplete: this.config.notifyHuman,
      notifyOnFailure: true,
      notifyOnProgress: true,
      metadata: { planId: plan.id, totalEffort: plan.totalEffort },
    })

    const taskIdMap = new Map<string, string>()

    for (let i = 0; i < plan.tasks.length; i++) {
      const planTask = plan.tasks[i]
      const dependsOn = planTask.dependsOn
        .map(dep => taskIdMap.get(dep))
        .filter((id): id is string => id !== undefined)

      const task = await this.convoyManager.addTask(convoy.id, planTask.title, {
        description: planTask.description,
        dependsOn,
        metadata: { role: planTask.role, estimatedEffort: planTask.estimatedEffort },
      })

      taskIdMap.set(`task-${i}`, task.id)
    }

    this.activeConvoys.add(convoy.id)
    return this.convoyManager.get(convoy.id)!
  }

  /**
   * Spawn worker agents for convoy
   */
  async spawnWorkers(convoy: Convoy, plan: TaskPlan): Promise<number> {
    const uniqueRoles = new Set(plan.tasks.map(t => t.role))
    const workerCount = Math.min(uniqueRoles.size, this.config.maxConcurrentWorkers)
    await this.convoyManager.start(convoy.id)
    return workerCount
  }

  /**
   * Start monitoring convoy progress
   */
  startMonitoring(convoyId: string): void {
    if (this.progressTrackers.has(convoyId)) return

    const tracker = new ProgressTracker(this.convoyManager, {
      updateInterval: this.config.progressInterval,
    })

    tracker.on('progress', (update: ProgressUpdate) => {
      this.emit('progress:update', update)
    })

    tracker.track(convoyId)
    this.progressTrackers.set(convoyId, tracker)
  }

  /**
   * Stop monitoring convoy
   */
  stopMonitoring(convoyId: string): void {
    const tracker = this.progressTrackers.get(convoyId)
    if (tracker) {
      tracker.destroy()
      this.progressTrackers.delete(convoyId)
    }
  }

  /**
   * Get convoy status
   */
  getConvoyStatus(convoyId: string): string {
    return this.convoyManager.getSummary(convoyId)
  }

  /**
   * Get all active convoys
   */
  getActiveConvoys(): Convoy[] {
    return Array.from(this.activeConvoys)
      .map(id => this.convoyManager.get(id))
      .filter((c): c is Convoy => c !== undefined)
  }

  /**
   * Destroy mayor agent
   */
  destroy(): void {
    const trackers = Array.from(this.progressTrackers.values())
    for (const tracker of trackers) {
      tracker.destroy()
    }
    this.progressTrackers.clear()
    this.activeConvoys.clear()
    this.removeAllListeners()
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private setupEventListeners(): void {
    this.convoyManager.on('convoy:completed', (convoy) => {
      if (this.activeConvoys.has(convoy.id)) {
        this.activeConvoys.delete(convoy.id)
        this.stopMonitoring(convoy.id)
        this.emit('convoy:completed', convoy, this.convoyManager.getSummary(convoy.id))
      }
    })

    this.convoyManager.on('convoy:failed', (convoy) => {
      if (this.activeConvoys.has(convoy.id)) {
        this.activeConvoys.delete(convoy.id)
        this.stopMonitoring(convoy.id)
        this.emit('convoy:failed', convoy, 'Convoy failed')
      }
    })
  }

  private extractFiles(input: string): string[] {
    const filePattern = /[\w-]+\.(ts|js|tsx|jsx|json|md|yaml|yml|toml)/gi
    return input.match(filePattern) ?? []
  }

  private extractFunctions(input: string): string[] {
    const funcPattern = /\b(\w+)\s*\(/g
    const matches: string[] = []
    let match
    while ((match = funcPattern.exec(input)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
        matches.push(match[1])
      }
    }
    return matches
  }

  private extractComponents(input: string): string[] {
    const componentPattern = /\b([A-Z][a-zA-Z]+)\b/g
    return input.match(componentPattern) ?? []
  }

  private extractTechnologies(input: string): string[] {
    const techs = ['react', 'vue', 'angular', 'node', 'typescript', 'javascript', 'python', 'rust', 'go', 'docker', 'kubernetes', 'aws', 'gcp', 'azure']
    const lowerInput = input.toLowerCase()
    return techs.filter(tech => lowerInput.includes(tech))
  }

  private extractKeywords(input: string): string[] {
    const words = input.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'after', 'before', 'when', 'whenever', 'where', 'wherever', 'whether', 'which', 'who', 'whom', 'whose', 'what', 'whatever', 'whichever', 'whoever', 'whomever', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves'])
    return words.filter(w => w.length > 2 && !stopWords.has(w))
  }

  private estimateComplexity(input: string, entities: Intent['entities']): Intent['complexity'] {
    const fileCount = entities.files?.length ?? 0
    const componentCount = entities.components?.length ?? 0
    const wordCount = input.split(/\s+/).length

    if (wordCount < 10 && fileCount <= 1) return 'trivial'
    if (wordCount < 20 && fileCount <= 2) return 'simple'
    if (wordCount < 50 && fileCount <= 5) return 'moderate'
    if (wordCount < 100 || componentCount > 3) return 'complex'
    return 'very_complex'
  }

  private determineRequiredRoles(type: Intent['type'], entities: Intent['entities']): AgentRole[] {
    const roles: AgentRole[] = ['researcher']

    switch (type) {
      case 'feature':
        roles.push('architect', 'coder', 'tester', 'reviewer')
        break
      case 'bugfix':
        roles.push('debugger', 'coder', 'tester')
        break
      case 'refactor':
        roles.push('architect', 'coder', 'tester')
        break
      case 'testing':
        roles.push('tester')
        break
      case 'documentation':
        roles.push('writer')
        break
      default:
        roles.push('coder')
    }

    return roles
  }

  private generateSummary(input: string, type: Intent['type']): string {
    const words = input.split(/\s+/).slice(0, 10).join(' ')
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
    return `${typeLabel}: ${words}${input.split(/\s+/).length > 10 ? '...' : ''}`
  }

  private suggestApproach(type: Intent['type'], complexity: Intent['complexity']): string {
    const approaches: Record<Intent['type'], string> = {
      feature: 'Design-first approach with incremental implementation',
      bugfix: 'Reproduce, isolate, fix, and verify',
      refactor: 'Ensure test coverage, then refactor incrementally',
      research: 'Gather information, analyze, and document findings',
      documentation: 'Review code, document API and usage patterns',
      testing: 'Identify test cases, implement, and verify coverage',
      deployment: 'Prepare, validate, deploy, and monitor',
      other: 'Analyze requirements and implement solution',
    }
    return approaches[type]
  }

  private calculateTotalEffort(tasks: TaskPlan['tasks']): string {
    const effortMap = { minimal: 1, small: 2, medium: 4, large: 8 }
    const total = tasks.reduce((sum, t) => sum + effortMap[t.estimatedEffort], 0)

    if (total <= 4) return 'Small'
    if (total <= 10) return 'Medium'
    if (total <= 20) return 'Large'
    return 'Very Large'
  }

  private identifyRisks(intent: Intent): string[] {
    const risks: string[] = []

    if (intent.complexity === 'complex' || intent.complexity === 'very_complex') {
      risks.push('High complexity may require multiple iterations')
    }

    if (intent.type === 'refactor') {
      risks.push('Refactoring may introduce regressions')
    }

    if (intent.entities.files && intent.entities.files.length > 5) {
      risks.push('Multiple files affected - careful coordination needed')
    }

    if (risks.length === 0) {
      risks.push('No significant risks identified')
    }

    return risks
  }

  private defineSuccessCriteria(intent: Intent): string[] {
    const criteria: string[] = []

    switch (intent.type) {
      case 'feature':
        criteria.push('Feature implemented as specified', 'Tests pass', 'Code reviewed')
        break
      case 'bugfix':
        criteria.push('Bug no longer reproducible', 'Regression test added', 'No new issues introduced')
        break
      case 'refactor':
        criteria.push('All existing tests pass', 'Code quality improved', 'No functional changes')
        break
      default:
        criteria.push('Task completed successfully', 'Results documented')
    }

    return criteria
  }

  private buildResponseMessage(plan: TaskPlan, convoy: Convoy | null, workerCount: number): string {
    const lines = [
      `Created plan: ${plan.name}`,
      `Tasks: ${plan.tasks.length}`,
      `Estimated effort: ${plan.totalEffort}`,
    ]

    if (convoy) {
      lines.push(`Convoy: ${convoy.id}`)
    }

    if (workerCount > 0) {
      lines.push(`Workers: ${workerCount}`)
    }

    return lines.join('\n')
  }
}

// ========================================================================
// Singleton Instance
// ========================================================================

let globalMayorAgent: MayorAgent | null = null

/**
 * Get global mayor agent instance
 */
export function getGlobalMayorAgent(config?: MayorAgentConfig): MayorAgent {
  if (!globalMayorAgent) {
    globalMayorAgent = new MayorAgent(config)
  }
  return globalMayorAgent
}

/**
 * Reset global mayor agent (for testing)
 */
export function resetGlobalMayorAgent(): void {
  if (globalMayorAgent) {
    globalMayorAgent.destroy()
  }
  globalMayorAgent = null
}

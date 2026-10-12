# Gastown-Inspired CCJK Upgrades

**Created**: 2026-02-03
**Status**: Planning Phase
**Priority**: High

---

## 📋 Executive Summary

After analyzing [Gastown](https://github.com/steveyegge/gastown), a multi-agent orchestration system for Claude Code, we identified 5 key upgrade opportunities for CCJK that could significantly enhance reliability, scalability, and user experience.

**Key Metrics**:
- **Estimated Impact**: 40% improvement in agent reliability
- **Token Savings**: Additional 10-15% through better state management
- **User Experience**: 60% reduction in manual coordination
- **Crash Recovery**: From 0% to 95% state recovery

---

## 🎯 Core Upgrade Areas

### 1. Git-Backed Persistence ⭐⭐⭐⭐⭐

**Problem**: CCJK agents lose all state on crash/restart

**Gastown Solution**:
- Uses Git worktrees as persistent storage
- Every agent state change is committed
- Automatic recovery on restart

**CCJK Implementation**:

```typescript
// src/brain/persistence/git-backed-state.ts

interface GitBackedStateConfig {
  workspaceRoot: string      // ~/.ccjk/workspace/
  useWorktrees: boolean      // true for isolation
  autoCommit: boolean        // Commit on every state change
  compressionLevel: number   // 0-9, default 6
}

class GitBackedStateManager {
  private workspaceRoot: string
  private worktrees: Map<string, string>  // agentId -> worktree path

  /**
   * Initialize workspace with git
   */
  async initialize(): Promise<void> {
    // Create ~/.ccjk/workspace/ if not exists
    // Initialize git repository
    // Setup .gitignore for sensitive data
  }

  /**
   * Create isolated worktree for agent
   */
  async createAgentWorktree(agentId: string): Promise<string> {
    // git worktree add ~/.ccjk/workspace/agents/{agentId}
    // Create state.json, mailbox.json
    // Return worktree path
  }

  /**
   * Save agent state to git
   */
  async saveState(agentId: string, state: AgentState): Promise<void> {
    const worktreePath = this.worktrees.get(agentId)
    // Write state.json
    // git add state.json
    // git commit -m "Update agent state: {agentId}"
  }

  /**
   * Load agent state from git
   */
  async loadState(agentId: string): Promise<AgentState | null> {
    const worktreePath = this.worktrees.get(agentId)
    // Read state.json
    // Parse and return
  }

  /**
   * Rollback to previous state
   */
  async rollback(agentId: string, commitId: string): Promise<void> {
    // git reset --hard {commitId}
  }

  /**
   * Cleanup old worktrees
   */
  async cleanup(agentId: string): Promise<void> {
    // git worktree remove {worktree}
  }
}
```

**Integration Points**:
- `src/brain/orchestrator.ts` - Use GitBackedStateManager
- `src/brain/agents/base-agent.ts` - Auto-save on state change
- `src/brain/session-manager.ts` - Load state on session start

**Testing Strategy**:
```typescript
// tests/brain/persistence/git-backed-state.test.ts
describe('GitBackedStateManager', () => {
  it('should create worktree for agent')
  it('should save and load agent state')
  it('should recover state after crash')
  it('should rollback to previous state')
  it('should cleanup old worktrees')
})
```

**Estimated Effort**: 1-2 weeks
**Risk Level**: Medium (Git operations complexity)

---

### 2. Persistent Mailbox System ⭐⭐⭐⭐

**Problem**: Agent messages lost on restart, no async communication

**Gastown Solution**:
- Each agent has persistent mailbox (inbox/outbox)
- Messages survive crashes
- Agents check mailbox on startup

**CCJK Implementation**:

```typescript
// src/brain/messaging/persistent-mailbox.ts

interface Message {
  id: string
  from: string
  to: string
  subject: string
  body: any
  timestamp: number
  read: boolean
  archived: boolean
}

interface Mailbox {
  agentId: string
  inbox: Message[]
  outbox: Message[]
  archive: Message[]
}

class PersistentMailboxManager {
  private stateManager: GitBackedStateManager
  private mailboxes: Map<string, Mailbox>

  /**
   * Create mailbox for agent
   */
  async createMailbox(agentId: string): Promise<Mailbox> {
    const mailbox: Mailbox = {
      agentId,
      inbox: [],
      outbox: [],
      archive: []
    }

    await this.persist(agentId, mailbox)
    return mailbox
  }

  /**
   * Send message to agent
   */
  async send(from: string, to: string, message: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const msg: Message = {
      ...message,
      id: nanoid(),
      timestamp: Date.now(),
      read: false,
      archived: false
    }

    // Add to sender's outbox
    const senderMailbox = await this.getMailbox(from)
    senderMailbox.outbox.push(msg)
    await this.persist(from, senderMailbox)

    // Add to recipient's inbox
    const recipientMailbox = await this.getMailbox(to)
    recipientMailbox.inbox.push(msg)
    await this.persist(to, recipientMailbox)
  }

  /**
   * Check inbox for unread messages
   */
  async checkInbox(agentId: string): Promise<Message[]> {
    const mailbox = await this.getMailbox(agentId)
    return mailbox.inbox.filter(m => !m.read)
  }

  /**
   * Mark message as read
   */
  async markAsRead(agentId: string, messageId: string): Promise<void> {
    const mailbox = await this.getMailbox(agentId)
    const message = mailbox.inbox.find(m => m.id === messageId)
    if (message) {
      message.read = true
      await this.persist(agentId, mailbox)
    }
  }

  /**
   * Archive message
   */
  async archive(agentId: string, messageId: string): Promise<void> {
    const mailbox = await this.getMailbox(agentId)
    const inboxIndex = mailbox.inbox.findIndex(m => m.id === messageId)

    if (inboxIndex !== -1) {
      const [message] = mailbox.inbox.splice(inboxIndex, 1)
      message.archived = true
      mailbox.archive.push(message)
      await this.persist(agentId, mailbox)
    }
  }

  /**
   * Persist mailbox to git
   */
  private async persist(agentId: string, mailbox: Mailbox): Promise<void> {
    await this.stateManager.saveState(agentId, { mailbox })
  }

  /**
   * Get mailbox from git
   */
  private async getMailbox(agentId: string): Promise<Mailbox> {
    const state = await this.stateManager.loadState(agentId)
    return state?.mailbox || await this.createMailbox(agentId)
  }
}
```

**Integration Points**:
- `src/brain/message-bus.ts` - Use PersistentMailboxManager
- `src/brain/agents/base-agent.ts` - Check mailbox on startup
- `src/brain/orchestrator.ts` - Route messages through mailbox

**Estimated Effort**: 1 week
**Risk Level**: Low

---

### 3. Convoy Work Tracking ⭐⭐⭐⭐⭐

**Problem**: No task grouping, poor progress visibility

**Gastown Solution**:
- Convoy = group of related tasks
- Real-time progress tracking
- Notifications on completion

**CCJK Implementation**:

```typescript
// src/brain/convoy/convoy-manager.ts

interface Convoy {
  id: string
  name: string
  description: string
  taskIds: string[]

  // Progress
  totalTasks: number
  completedTasks: number
  failedTasks: number
  cancelledTasks: number
  progress: number  // 0-100

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

  // Timestamps
  createdAt: string
  startedAt?: string
  completedAt?: string

  // Notifications
  notifyOnComplete: boolean
  notifyOnFailure: boolean
  notifyHuman: boolean

  // Metadata
  metadata?: Record<string, any>
}

class ConvoyManager {
  private convoys: Map<string, Convoy>
  private stateManager: GitBackedStateManager

  /**
   * Create new convoy
   */
  async create(
    name: string,
    taskIds: string[],
    options?: {
      description?: string
      notifyOnComplete?: boolean
      notifyOnFailure?: boolean
      notifyHuman?: boolean
    }
  ): Promise<Convoy> {
    const convoy: Convoy = {
      id: `cv-${nanoid(5)}`,
      name,
      description: options?.description || '',
      taskIds,
      totalTasks: taskIds.length,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      progress: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      notifyOnComplete: options?.notifyOnComplete ?? false,
      notifyOnFailure: options?.notifyOnFailure ?? false,
      notifyHuman: options?.notifyHuman ?? false
    }

    this.convoys.set(convoy.id, convoy)
    await this.persist(convoy)

    return convoy
  }

  /**
   * Add tasks to convoy
   */
  async addTasks(convoyId: string, taskIds: string[]): Promise<void> {
    const convoy = this.convoys.get(convoyId)
    if (!convoy) throw new Error(`Convoy not found: ${convoyId}`)

    convoy.taskIds.push(...taskIds)
    convoy.totalTasks = convoy.taskIds.length
    await this.persist(convoy)
  }

  /**
   * Update task status in convoy
   */
  async updateTaskStatus(
    convoyId: string,
    taskId: string,
    status: 'completed' | 'failed' | 'cancelled'
  ): Promise<void> {
    const convoy = this.convoys.get(convoyId)
    if (!convoy) return

    if (status === 'completed') convoy.completedTasks++
    if (status === 'failed') convoy.failedTasks++
    if (status === 'cancelled') convoy.cancelledTasks++

    // Update progress
    const processed = convoy.completedTasks + convoy.failedTasks + convoy.cancelledTasks
    convoy.progress = Math.round((processed / convoy.totalTasks) * 100)

    // Update convoy status
    if (processed === convoy.totalTasks) {
      if (convoy.failedTasks === 0) {
        convoy.status = 'completed'
        convoy.completedAt = new Date().toISOString()

        if (convoy.notifyOnComplete) {
          await this.notify(convoy, 'completed')
        }
      } else {
        convoy.status = 'failed'
        convoy.completedAt = new Date().toISOString()

        if (convoy.notifyOnFailure) {
          await this.notify(convoy, 'failed')
        }
      }
    } else if (convoy.status === 'pending') {
      convoy.status = 'in_progress'
      convoy.startedAt = new Date().toISOString()
    }

    await this.persist(convoy)
  }

  /**
   * List all convoys
   */
  list(): Convoy[] {
    return Array.from(this.convoys.values())
  }

  /**
   * Show convoy details
   */
  show(convoyId: string): Convoy | undefined {
    return this.convoys.get(convoyId)
  }

  /**
   * Send notification
   */
  private async notify(convoy: Convoy, event: 'completed' | 'failed'): Promise<void> {
    // Implementation depends on notification system
    console.log(`Convoy ${convoy.name} ${event}`)
  }

  /**
   * Persist convoy to git
   */
  private async persist(convoy: Convoy): Promise<void> {
    await this.stateManager.saveState(`convoy-${convoy.id}`, convoy)
  }
}
```

**CLI Commands**:
```bash
# Create convoy
ccjk convoy create "Feature X" task-1 task-2 task-3 --notify

# List convoys
ccjk convoy list

# Show convoy details
ccjk convoy show cv-abc12

# Add tasks to convoy
ccjk convoy add cv-abc12 task-4 task-5
```

**Estimated Effort**: 1-2 weeks
**Risk Level**: Low

---

### 4. Mayor Agent Pattern ⭐⭐⭐⭐

**Problem**: Users must manually coordinate agents

**Gastown Solution**:
- Mayor = AI coordinator
- Understands high-level intent
- Automatically creates convoys and spawns workers

**CCJK Implementation**:

```typescript
// src/brain/mayor/mayor-agent.ts

class MayorAgent {
  private orchestrator: BrainOrchestrator
  private convoyManager: ConvoyManager
  private intentAnalyzer: IntentAnalyzer

  /**
   * Process user request
   */
  async processRequest(input: string): Promise<MayorResponse> {
    // 1. Analyze intent
    const intent = await this.intentAnalyzer.analyze(input)

    // 2. Create task plan
    const plan = await this.createTaskPlan(intent)

    // 3. Create convoy
    const convoy = await this.convoyManager.create(
      plan.name,
      plan.taskIds,
      { notifyOnComplete: true, notifyHuman: true }
    )

    // 4. Spawn workers
    const workers = await this.spawnWorkers(plan)

    // 5. Monitor progress
    this.monitorConvoy(convoy.id)

    return {
      convoyId: convoy.id,
      plan,
      workers,
      message: `Created convoy "${convoy.name}" with ${plan.taskIds.length} tasks`
    }
  }

  /**
   * Create task plan from intent
   */
  private async createTaskPlan(intent: Intent): Promise<TaskPlan> {
    // Use LLM to decompose high-level intent into tasks
    const tasks = await this.decompose(intent)

    return {
      name: intent.summary,
      taskIds: tasks.map(t => t.id),
      tasks,
      estimatedDuration: this.estimateDuration(tasks)
    }
  }

  /**
   * Spawn worker agents for tasks
   */
  private async spawnWorkers(plan: TaskPlan): Promise<Agent[]> {
    const workers: Agent[] = []

    for (const task of plan.tasks) {
      const agent = await this.orchestrator.createAgentInstance(
        task.requiredRole,
        task.requiredCapabilities
      )

      workers.push(agent)
    }

    return workers
  }

  /**
   * Monitor convoy progress
   */
  private async monitorConvoy(convoyId: string): Promise<void> {
    const convoy = this.convoyManager.show(convoyId)
    if (!convoy) return

    // Poll for updates
    const interval = setInterval(async () => {
      const updated = this.convoyManager.show(convoyId)

      if (updated?.status === 'completed' || updated?.status === 'failed') {
        clearInterval(interval)
        await this.summarizeResults(updated)
      }
    }, 5000)
  }

  /**
   * Summarize convoy results
   */
  private async summarizeResults(convoy: Convoy): Promise<void> {
    // Generate human-readable summary
    const summary = `
Convoy "${convoy.name}" ${convoy.status}
- Total tasks: ${convoy.totalTasks}
- Completed: ${convoy.completedTasks}
- Failed: ${convoy.failedTasks}
- Duration: ${this.calculateDuration(convoy)}
    `

    console.log(summary)
  }
}
```

**Estimated Effort**: 1-2 weeks
**Risk Level**: Medium (LLM integration complexity)

---

### 5. Workflow Formulas ⭐⭐⭐

**Problem**: Workflows are static, no dependency management

**Gastown Solution**:
- TOML-based formulas
- Explicit step dependencies
- Variable substitution

**CCJK Implementation**:

```typescript
// src/config/workflow-formula.ts

interface WorkflowFormula {
  id: string
  name: string
  description: string
  version: string

  // Variables
  variables: Record<string, VariableDefinition>

  // Steps
  steps: WorkflowStep[]

  // Execution
  execute(vars: Record<string, any>): Promise<WorkflowResult>
}

interface WorkflowStep {
  id: string
  title: string
  description: string
  needs: string[]  // Dependency step IDs

  // Action
  action: string | ((context: StepContext) => Promise<void>)

  // Conditions
  condition?: string | ((context: StepContext) => boolean)

  // Retry
  retryCount?: number
  retryDelay?: number
}

interface VariableDefinition {
  description: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
  default?: any
}

class WorkflowFormulaEngine {
  /**
   * Load formula from TOML
   */
  async loadFormula(path: string): Promise<WorkflowFormula> {
    // Parse TOML file
    // Validate schema
    // Return formula
  }

  /**
   * Execute formula
   */
  async execute(
    formula: WorkflowFormula,
    variables: Record<string, any>
  ): Promise<WorkflowResult> {
    // Validate variables
    this.validateVariables(formula, variables)

    // Build dependency graph
    const graph = this.buildDependencyGraph(formula.steps)

    // Execute steps in order
    const results: Record<string, any> = {}

    for (const stage of graph.stages) {
      await Promise.all(
        stage.map(async (stepId) => {
          const step = formula.steps.find(s => s.id === stepId)!
          const result = await this.executeStep(step, { variables, results })
          results[stepId] = result
        })
      )
    }

    return { success: true, results }
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(steps: WorkflowStep[]): DependencyGraph {
    // Topological sort
    // Return stages for parallel execution
  }
}
```

**Formula Example**:
```toml
# .ccjk/formulas/release.toml
name = "release"
description = "Standard release process"
version = "1.0.0"

[variables.version]
description = "Semantic version to release"
type = "string"
required = true

[[steps]]
id = "bump-version"
title = "Bump version"
description = "Update package.json version"
action = "npm version {{version}}"

[[steps]]
id = "run-tests"
title = "Run tests"
description = "Execute test suite"
needs = ["bump-version"]
action = "npm test"

[[steps]]
id = "build"
title = "Build"
description = "Build production bundle"
needs = ["run-tests"]
action = "npm run build"

[[steps]]
id = "publish"
title = "Publish"
description = "Publish to npm"
needs = ["build"]
action = "npm publish"
```

**Estimated Effort**: 1 week
**Risk Level**: Low

---

## 📊 Implementation Priority Matrix

```
High Impact, High Effort:
├─ Git-Backed Persistence (Phase 1)
└─ Convoy Work Tracking (Phase 2)

High Impact, Medium Effort:
├─ Persistent Mailbox (Phase 1)
└─ Mayor Agent (Phase 3)

Medium Impact, Low Effort:
└─ Workflow Formulas (Phase 4)
```

---

## 🎯 Success Metrics

### Phase 1 (Persistence)
- ✅ 95% state recovery after crash
- ✅ <100ms state save latency
- ✅ 100% message delivery guarantee

### Phase 2 (Convoy)
- ✅ 60% reduction in manual coordination
- ✅ Real-time progress visibility
- ✅ 90% user satisfaction with tracking

### Phase 3 (Mayor)
- ✅ 70% reduction in user commands
- ✅ 85% intent understanding accuracy
- ✅ 50% faster task completion

### Phase 4 (Formulas)
- ✅ 80% workflow reusability
- ✅ 40% reduction in workflow errors
- ✅ 100% dependency resolution accuracy

---

## 🚧 Risks & Mitigations

### Risk 1: Git Performance
**Impact**: High
**Probability**: Medium
**Mitigation**:
- Use shallow clones
- Implement commit batching
- Add compression

### Risk 2: State Corruption
**Impact**: High
**Probability**: Low
**Mitigation**:
- Atomic commits
- State validation
- Automatic backups

### Risk 3: Complexity Increase
**Impact**: Medium
**Probability**: High
**Mitigation**:
- Incremental rollout
- Feature flags
- Comprehensive testing

---

## 📝 Next Steps

1. **Review & Approval** - Stakeholder review of this plan
2. **Prototype** - Build Phase 1 prototype (1 week)
3. **Testing** - Comprehensive testing (1 week)
4. **Rollout** - Gradual feature rollout
5. **Documentation** - Update user docs

---

## 📚 References

- [Gastown Repository](https://github.com/steveyegge/gastown)
- [Beads Issue Tracker](https://github.com/steveyegge/beads)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [CCJK Brain Architecture](../../src/brain/CLAUDE.md)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-03
**Author**: Claude Opus 4.5
**Status**: Awaiting Approval

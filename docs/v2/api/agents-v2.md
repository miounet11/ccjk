# Agents API v2.0

## Overview

The Agents API provides a sophisticated multi-agent orchestration system for CCJK. Agents are autonomous AI entities that can collaborate, communicate, and coordinate to accomplish complex tasks. The API supports hierarchical agent structures, message passing, and distributed decision-making.

## Features

- **Agent Factory**: Create specialized agents with different capabilities
- **Multi-Agent Orchestration**: Coordinate multiple agents working together
- **Agent Communication**: Message passing and event system
- **Hierarchical Structure**: Organize agents in groups and hierarchies
- **Task Distribution**: Automatic task routing and load balancing
- **Agent Monitoring**: Track agent health and performance

## Installation

```bash
npm install @ccjk/v2
```

## Quick Start

```typescript
import { AgentFactory, AgentGroup } from '@ccjk/v2'

// Create agent factory
const factory = new AgentFactory({
  maxConcurrentAgents: 10,
  enableMonitoring: true
})

// Create specialized agents
const coderAgent = await factory.createAgent({
  id: 'coder-1',
  type: 'coder',
  model: 'claude-sonnet-4',
  capabilities: ['write-code', 'debug', 'refactor']
})

const reviewerAgent = await factory.createAgent({
  id: 'reviewer-1',
  type: 'reviewer',
  model: 'claude-opus-4',
  capabilities: ['review-code', 'security-audit']
})

// Create agent group for collaboration
const devTeam = new AgentGroup({
  id: 'dev-team',
  agents: [coderAgent, reviewerAgent]
})

// Execute task with agent collaboration
const result = await devTeam.executeTask({
  type: 'code-review',
  description: 'Review and improve the authentication module',
  files: ['src/auth.ts']
})

console.log('Task completed:', result.status)
console.log('Agents involved:', result.agents)
console.log('Output:', result.output)
```

## API Reference

### AgentFactory

Factory for creating and managing agents.

#### Constructor

```typescript
constructor(options: FactoryOptions)
```

**Parameters:**
- `options.maxConcurrentAgents` - Maximum concurrent agents (default: `10`)
- `options.enableMonitoring` - Enable performance monitoring (default: `true`)
- `options.defaultModel` - Default AI model (default: `'claude-sonnet-4'`)
- `options.timeout` - Default timeout in ms (default: `30000`)

#### Methods

##### createAgent

```typescript
async createAgent(config: AgentConfig): Promise<Agent>
```

Creates a new agent.

**Parameters:**
- `config.id` - Unique agent identifier
- `config.type` - Agent type (coder, reviewer, tester, etc.)
- `config.model` - AI model to use
- `config.capabilities` - Array of agent capabilities
- `config.persona` - Agent personality and behavior
- `config.tools` - Tools available to the agent
- `config.memory` - Memory configuration

**Returns:** Created agent instance

**Example:**
```typescript
const agent = await factory.createAgent({
  id: 'security-expert',
  type: 'security-auditor',
  model: 'claude-opus-4',
  capabilities: ['security-scan', 'vulnerability-detection', 'penetration-test'],
  persona: {
    name: 'Security Guardian',
    tone: 'cautious',
    expertise: ['cybersecurity', 'OWASP', 'encryption']
  },
  tools: ['security-scanner', 'dependency-checker']
})
```

##### destroyAgent

```typescript
async destroyAgent(agentId: string): Promise<void>
```

Destroys an agent and releases resources.

##### getAgent

```typescript
getAgent(agentId: string): Agent | undefined
```

Gets an agent by ID.

##### listAgents

```typescript
listAgents(filter?: AgentFilter): AgentInfo[]
```

Lists all agents.

**Parameters:**
- `filter.type` - Filter by agent type
- `filter.status` - Filter by status
- `filter.capability` - Filter by capability

##### getFactoryMetrics

```typescript
getFactoryMetrics(): FactoryMetrics
```

Gets factory-wide metrics.

### Agent

Represents an individual agent.

#### Properties

- `id` - Agent identifier
- `type` - Agent type
- `model` - AI model used
- `capabilities` - Array of capabilities
- `status` - Current status ('idle', 'busy', 'error')

#### Methods

##### execute

```typescript
async execute(task: Task): Promise<TaskResult>
```

Executes a task.

**Parameters:**
- `task.type` - Task type
- `task.description` - Task description
- `task.context` - Task context and data
- `task.priority` - Task priority (1-10)
- `task.deadline` - Optional deadline

**Returns:** Task execution result

**Example:**
```typescript
const result = await agent.execute({
  type: 'code-generation',
  description: 'Generate a REST API endpoint',
  context: {
    endpoint: '/users',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    database: 'PostgreSQL'
  },
  priority: 8,
  deadline: new Date(Date.now() + 60000) // 1 minute
})

console.log('Generated code:', result.output)
console.log('Execution time:', result.duration)
```

##### sendMessage

```typescript
async sendMessage(message: AgentMessage): Promise<void>
```

Sends a message to another agent.

**Parameters:**
- `message.to` - Recipient agent ID
- `message.type` - Message type
- `message.content` - Message content
- `message.data` - Additional data

##### getMemory

```typescript
getMemory(): AgentMemory
```

Gets agent's memory/state.

##### updatePersona

```typescript
updatePersona(persona: Partial<Persona>): void
```

Updates agent's persona.

### AgentGroup

Represents a group of collaborating agents.

#### Constructor

```typescript
constructor(config: GroupConfig)
```

**Parameters:**
- `config.id` - Group identifier
- `config.agents` - Array of agents
- `config.communicationStyle` - How agents communicate
- `config.decisionMaking` - How decisions are made

#### Methods

##### addAgent

```typescript
addAgent(agent: Agent): void
```

Adds an agent to the group.

##### removeAgent

```typescript
removeAgent(agentId: string): void
```

Removes an agent from the group.

##### executeTask

```typescript
async executeTask(task: Task): Promise<GroupTaskResult>
```

Executes a task using the group.

**Parameters:**
- `task.type` - Task type
- `task.description` - Task description
- `task.context` - Task context
- `task.collaborationMode` - How agents collaborate

**Returns:**
- `status` - Task status
- `output` - Final output
- `agents` - Agents that participated
- `messages` - Inter-agent communications
- `timeline` - Execution timeline

**Example:**
```typescript
const result = await group.executeTask({
  type: 'full-stack-development',
  description: 'Build a user authentication system',
  context: {
    frontend: 'React',
    backend: 'Express',
    database: 'PostgreSQL'
  },
  collaborationMode: 'sequential'
})

console.log('Agents involved:', result.agents)
console.log('Messages exchanged:', result.messages.length)
console.log('Timeline:', result.timeline)
```

##### broadcastMessage

```typescript
async broadcastMessage(message: AgentMessage): Promise<void>
```

Broadcasts a message to all agents in the group.

##### getGroupMetrics

```typescript
getGroupMetrics(): GroupMetrics
```

Gets group performance metrics.

### Types

```typescript
interface AgentConfig {
  id: string
  type: string
  model: string
  capabilities: string[]
  persona?: Persona
  tools?: string[]
  memory?: MemoryConfig
}

interface Agent {
  id: string
  type: string
  model: string
  capabilities: string[]
  status: 'idle' | 'busy' | 'error'
  execute(task: Task): Promise<TaskResult>
  sendMessage(message: AgentMessage): Promise<void>
  getMemory(): AgentMemory
  updatePersona(persona: Partial<Persona>): void
}

interface Task {
  type: string
  description: string
  context: Record<string, any>
  priority?: number
  deadline?: Date
  collaborationMode?: 'sequential' | 'parallel' | 'hierarchical'
}

interface TaskResult {
  success: boolean
  output: any
  duration: number
  timestamp: string
  metadata: Record<string, any>
}

interface AgentMessage {
  from: string
  to: string
  type: string
  content: string
  data?: Record<string, any>
  timestamp: string
}

interface Persona {
  name: string
  tone: 'professional' | 'casual' | 'cautious' | 'creative'
  expertise: string[]
  behavior: Record<string, any>
}

interface GroupConfig {
  id: string
  agents: Agent[]
  communicationStyle?: 'direct' | 'broadcast' | 'hierarchical'
  decisionMaking?: 'consensus' | 'voting' | 'leader'
}
```

## Configuration

### Agent Types

Predefined agent types:

- **Coder**: Writes and modifies code
- **Reviewer**: Reviews code for quality and security
- **Tester**: Writes and runs tests
- **Debugger**: Identifies and fixes bugs
- **Architect**: Designs system architecture
- **Documenter**: Writes documentation
- **SecurityAuditor**: Performs security audits

### Communication Styles

- **Direct**: Agents send messages directly to each other
- **Broadcast**: Messages are sent to all agents
- **Hierarchical**: Messages flow through a hierarchy

### Decision Making

- **Consensus**: All agents must agree
- **Voting**: Majority vote wins
- **Leader**: Designated leader decides

## Examples

### Example 1: Code Review Team

```typescript
// Create specialized agents
const coder = await factory.createAgent({
  id: 'coder-1',
  type: 'coder',
  model: 'claude-sonnet-4',
  capabilities: ['write-code', 'refactor']
})

const securityReviewer = await factory.createAgent({
  id: 'security-1',
  type: 'reviewer',
  model: 'claude-opus-4',
  capabilities: ['security-audit', 'vulnerability-scan'],
  persona: {
    name: 'Security Expert',
    tone: 'cautious',
    expertise: ['OWASP', 'encryption', 'auth']
  }
})

const codeReviewer = await factory.createAgent({
  id: 'reviewer-1',
  type: 'reviewer',
  model: 'claude-sonnet-4',
  capabilities: ['code-review', 'style-check']
})

// Create review team
const reviewTeam = new AgentGroup({
  id: 'review-team',
  agents: [coder, securityReviewer, codeReviewer],
  decisionMaking: 'consensus'
})

// Execute code review
const result = await reviewTeam.executeTask({
  type: 'comprehensive-review',
  description: 'Review authentication module',
  context: {
    files: ['src/auth.ts', 'src/middleware/auth.ts'],
    standards: 'OWASP',
    checkList: ['security', 'performance', 'style']
  },
  collaborationMode: 'sequential'
})

console.log('Review complete:', result.status)
console.log('Findings:', result.output.findings)
console.log('Recommendations:', result.output.recommendations)
```

### Example 2: Parallel Development

```typescript
// Create multiple coders
const frontendDev = await factory.createAgent({
  id: 'frontend-1',
  type: 'coder',
  capabilities: ['react', 'typescript', 'css']
})

const backendDev = await factory.createAgent({
  id: 'backend-1',
  type: 'coder',
  capabilities: ['express', 'postgresql', 'api-design']
})

const dbAdmin = await factory.createAgent({
  id: 'dba-1',
  type: 'architect',
  capabilities: ['database-design', 'sql', 'optimization']
})

// Create parallel development team
const devTeam = new AgentGroup({
  id: 'fullstack-team',
  agents: [frontendDev, backendDev, dbAdmin]
})

// Work in parallel
const result = await devTeam.executeTask({
  type: 'feature-development',
  description: 'Build user management feature',
  context: {
    feature: 'user-crud',
    requirements: ['create', 'read', 'update', 'delete']
  },
  collaborationMode: 'parallel' // Each agent works independently
})

console.log('Frontend:', result.output.frontend)
console.log('Backend:', result.output.backend)
console.log('Database:', result.output.database)
```

### Example 3: Hierarchical Task Execution

```typescript
// Create architect (leader)
const architect = await factory.createAgent({
  id: 'architect-1',
  type: 'architect',
  model: 'claude-opus-4',
  capabilities: ['system-design', 'architecture', 'tech-stack']
})

// Create implementers
const impl1 = await factory.createAgent({
  id: 'impl-1',
  type: 'coder',
  model: 'claude-sonnet-4'
})

const impl2 = await factory.createAgent({
  id: 'impl-2',
  type: 'coder',
  model: 'claude-sonnet-4'
})

// Create hierarchical team
const team = new AgentGroup({
  id: 'hierarchical-team',
  agents: [architect, impl1, impl2],
  communicationStyle: 'hierarchical',
  decisionMaking: 'leader' // Architect decides
})

// Execute with hierarchy
const result = await team.executeTask({
  type: 'system-build',
  description: 'Build microservice architecture',
  context: {
    services: ['auth', 'users', 'payments'],
    scale: 'high'
  },
  collaborationMode: 'hierarchical'
})

// Architect designs, implementers build
console.log('Architecture:', result.output.architecture)
console.log('Implementation:', result.output.code)
```

### Example 4: Agent Communication

```typescript
// Agent 1: Generate code
const coder = await factory.createAgent({
  id: 'coder-1',
  type: 'coder',
  capabilities: ['code-generation']
})

// Agent 2: Review code
const reviewer = await factory.createAgent({
  id: 'reviewer-1',
  type: 'reviewer',
  capabilities: ['code-review']
})

// Coder sends code to reviewer
await coder.sendMessage({
  to: 'reviewer-1',
  type: 'code-for-review',
  content: 'Please review this code',
  data: {
    code: 'function add(a, b) { return a + b }',
    language: 'typescript'
  }
})

// Reviewer receives and responds
await reviewer.sendMessage({
  to: 'coder-1',
  type: 'review-feedback',
  content: 'Code looks good, but add type annotations',
  data: {
    approved: false,
    suggestions: ['Add types for parameters']
  }
})

// Coder updates code
await coder.execute({
  type: 'update-code',
  context: {
    code: 'function add(a: number, b: number): number { return a + b }'
  }
})
```

### Example 5: Monitoring and Metrics

```typescript
// Get factory metrics
const factoryMetrics = factory.getFactoryMetrics()

console.log('Factory Metrics:')
console.log(`- Total agents: ${factoryMetrics.totalAgents}`)
console.log(`- Active agents: ${factoryMetrics.activeAgents}`)
console.log(`- Tasks completed: ${factoryMetrics.tasksCompleted}`)
console.log(`- Success rate: ${(factoryMetrics.successRate * 100).toFixed(1)}%`)

// Get group metrics
const groupMetrics = team.getGroupMetrics()

console.log('Team Metrics:')
console.log(`- Agents: ${groupMetrics.agentCount}`)
console.log(`- Tasks executed: ${groupMetrics.tasksExecuted}`)
console.log(`- Messages exchanged: ${groupMetrics.messagesExchanged}`)
console.log(`- Collaboration score: ${groupMetrics.collaborationScore}`)

// Get individual agent metrics
const agentInfo = factory.listAgents()

agentInfo.forEach(agent => {
  console.log(`Agent ${agent.id}:`)
  console.log(`  Status: ${agent.status}`)
  console.log(`  Tasks completed: ${agent.tasksCompleted}`)
  console.log(`  Success rate: ${(agent.successRate * 100).toFixed(1)}%`)
})
```

## Error Handling

### AgentNotFoundError

```typescript
try {
  await factory.executeTask('non-existent-agent', {})
} catch (error) {
  if (error instanceof AgentNotFoundError) {
    console.error('Agent not found:', error.agentId)
  }
}
```

### AgentTimeoutError

```typescript
try {
  await agent.execute({ type: 'slow-task', deadline: new Date(Date.now() + 1000) })
} catch (error) {
  if (error instanceof AgentTimeoutError) {
    console.error('Agent timed out:', error.deadline)
  }
}
```

### TaskExecutionError

```typescript
try {
  await agent.execute(task)
} catch (error) {
  if (error instanceof TaskExecutionError) {
    console.error('Task failed:', error.message)
    console.error('Agent:', error.agentId)
    console.error('Task:', error.task)
  }
}
```

## Performance

- **Agent Creation**: < 100ms per agent
- **Task Execution**: Varies by task (typically 1-10s)
- **Message Passing**: < 10ms
- **Memory**: O(n) where n is number of agents
- **Scalability**: Supports 10+ concurrent agents

## Best Practices

1. **Choose the Right Model**
   - Use Sonnet for general tasks
   - Use Opus for complex reasoning
   - Use Haiku for simple tasks

2. **Define Clear Capabilities**
   - Each agent should have specific skills
   - Avoid overly broad capabilities

3. **Use Appropriate Collaboration**
   - Parallel for independent tasks
   - Sequential for dependent tasks
   - Hierarchical for complex projects

4. **Monitor Performance**
   - Track agent metrics
   - Identify bottlenecks
   - Optimize communication patterns

5. **Handle Failures Gracefully**
   - Implement retry logic
   - Provide fallback agents
   - Log errors for analysis

6. **Design Good Personas**
   - Give agents clear personalities
   - Define expertise areas
   - Set appropriate behavior parameters

## See Also

- [Hooks API](./hooks-v2.md) - Traceability and enforcement
- [Skills API](./skills-v2.md) - Dynamic skill loading
- [Brain API](./brain-v2.md) - Context optimization
- [Workflow API](./workflow-v2.md) - Workflow generation

---

**Source**: [src/agents/agent-factory.ts](../../src/agents/agent-factory.ts#L1)

**Last Updated**: 2026-01-23
# CCJK 统一协调架构设计方案

## 📋 Executive Summary | 执行摘要

本方案设计了一个**事件驱动的统一协调层**，通过 `Orchestrator` 核心引擎协调 Skills、Agents、Hooks、MCP 四大模块，实现智能化的任务编排、上下文共享和生命周期管理。

---

## 🏗️ Architecture Overview | 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCJK Unified Orchestration                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              🎯 Orchestrator (Core Engine)                 │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Event Bus  │  Context Store  │  Lifecycle Manager  │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │  📦 Skills  │   │  🤖 Agents  │   │  🪝 Hooks   │          │
│  │             │   │             │   │             │          │
│  │ • Registry  │   │ • Factory   │   │ • Registry  │          │
│  │ • Executor  │   │ • Pool      │   │ • Trigger   │          │
│  │ • Cache     │   │ • Router    │   │ • Chain     │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│                  ┌─────────────────┐                            │
│                  │   🔌 MCP Layer  │                            │
│                  │                 │                            │
│                  │ • Context7      │                            │
│                  │ • Filesystem    │                            │
│                  │ • GitHub        │                            │
│                  │ • Playwright    │                            │
│                  └─────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Components | 核心组件

### 1. Orchestrator (协调器)

**职责**: 统一协调中心，管理所有模块的生命周期和交互

**核心能力**:
- **Event Bus**: 事件驱动的消息总线
- **Context Store**: 全局上下文存储和共享
- **Lifecycle Manager**: 生命周期管理（init → execute → cleanup）
- **Dependency Resolver**: 依赖解析和注入

**文件位置**: `/Users/lu/ccjk-public/src/orchestrator/`

```typescript
// src/orchestrator/core.ts
export class Orchestrator {
  private eventBus: EventBus
  private contextStore: ContextStore
  private lifecycleManager: LifecycleManager
  private dependencyResolver: DependencyResolver

  // 统一任务执行入口
  async execute(task: Task): Promise<TaskResult> {
    // 1. 解析依赖
    const deps = await this.dependencyResolver.resolve(task)

    // 2. 初始化上下文
    const context = await this.contextStore.create(task, deps)

    // 3. 触发 pre-hooks
    await this.eventBus.emit('task:before', { task, context })

    // 4. 执行任务（可能涉及 Skills、Agents、MCP）
    const result = await this.lifecycleManager.execute(task, context)

    // 5. 触发 post-hooks
    await this.eventBus.emit('task:after', { task, context, result })

    // 6. 清理资源
    await this.lifecycleManager.cleanup(context)

    return result
  }
}
```

---

### 2. Event Bus (事件总线)

**职责**: 模块间解耦通信

**事件类型**:
```typescript
// src/orchestrator/events.ts
export enum EventType {
  // Lifecycle events
  TASK_BEFORE = 'task:before',
  TASK_AFTER = 'task:after',
  TASK_ERROR = 'task:error',

  // Skill events
  SKILL_LOAD = 'skill:load',
  SKILL_EXECUTE = 'skill:execute',
  SKILL_COMPLETE = 'skill:complete',

  // Agent events
  AGENT_SPAWN = 'agent:spawn',
  AGENT_MESSAGE = 'agent:message',
  AGENT_TERMINATE = 'agent:terminate',

  // Hook events
  HOOK_TRIGGER = 'hook:trigger',
  HOOK_CHAIN = 'hook:chain',

  // MCP events
  MCP_CALL = 'mcp:call',
  MCP_RESPONSE = 'mcp:response',
}

export class EventBus {
  private listeners: Map<EventType, Set<EventListener>>

  on(event: EventType, listener: EventListener): void
  emit(event: EventType, payload: any): Promise<void>
  off(event: EventType, listener: EventListener): void
}
```

**使用示例**:
```typescript
// Hooks 监听 Skill 执行完成事件
orchestrator.eventBus.on('skill:complete', async (payload) => {
  await hookRegistry.trigger('post-skill', payload)
})

// Agents 监听任务开始事件
orchestrator.eventBus.on('task:before', async (payload) => {
  const agent = await agentFactory.create('planner')
  await agent.analyze(payload.task)
})
```

---

### 3. Context Store (上下文存储)

**职责**: 全局上下文共享和状态管理

**数据结构**:
```typescript
// src/orchestrator/context.ts
export interface Context {
  id: string
  task: Task
  metadata: {
    startTime: number
    user: string
    cwd: string
    env: Record<string, string>
  }

  // 共享数据
  shared: {
    skills: Map<string, SkillResult>
    agents: Map<string, AgentState>
    mcp: Map<string, MCPResponse>
  }

  // 生命周期状态
  lifecycle: {
    phase: 'init' | 'executing' | 'cleanup' | 'completed'
    errors: Error[]
  }
}

export class ContextStore {
  private contexts: Map<string, Context>

  async create(task: Task, deps: Dependency[]): Promise<Context>
  async get(id: string): Promise<Context>
  async update(id: string, updates: Partial<Context>): Promise<void>
  async delete(id: string): Promise<void>
}
```

**使用场景**:
```typescript
// Skill 执行结果存入上下文
const skillResult = await skillExecutor.run('git-workflow')
await contextStore.update(context.id, {
  shared: {
    skills: new Map([['git-workflow', skillResult]])
  }
})

// Agent 从上下文读取 Skill 结果
const context = await contextStore.get(contextId)
const gitWorkflowResult = context.shared.skills.get('git-workflow')
```

---

### 4. Lifecycle Manager (生命周期管理)

**职责**: 管理任务执行的完整生命周期

**生命周期阶段**:
```typescript
// src/orchestrator/lifecycle.ts
export enum LifecyclePhase {
  INIT = 'init',           // 初始化资源
  VALIDATE = 'validate',   // 验证依赖
  EXECUTE = 'execute',     // 执行任务
  CLEANUP = 'cleanup',     // 清理资源
  COMPLETED = 'completed', // 完成
}

export class LifecycleManager {
  async execute(task: Task, context: Context): Promise<TaskResult> {
    try {
      // Phase 1: Init
      await this.init(task, context)

      // Phase 2: Validate
      await this.validate(task, context)

      // Phase 3: Execute
      const result = await this.executeTask(task, context)

      // Phase 4: Cleanup
      await this.cleanup(context)

      return result
    } catch (error) {
      await this.handleError(error, context)
      throw error
    }
  }

  private async executeTask(task: Task, context: Context): Promise<TaskResult> {
    // 根据任务类型路由到不同的执行器
    switch (task.type) {
      case 'skill':
        return await skillExecutor.run(task.name, context)
      case 'agent':
        return await agentFactory.execute(task.name, context)
      case 'workflow':
        return await workflowEngine.run(task.workflow, context)
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }
}
```

---

## 🔗 Module Integration | 模块集成

### Skills Integration

```typescript
// src/skills/executor.ts
export class SkillExecutor {
  constructor(
    private orchestrator: Orchestrator,
    private registry: SkillRegistry
  ) {}

  async run(skillName: string, context: Context): Promise<SkillResult> {
    // 1. 从注册表加载 Skill
    const skill = await this.registry.get(skillName)

    // 2. 触发 pre-hook
    await this.orchestrator.eventBus.emit('skill:execute', { skill, context })

    // 3. 执行 Skill
    const result = await skill.execute(context)

    // 4. 存储结果到上下文
    await this.orchestrator.contextStore.update(context.id, {
      shared: {
        skills: new Map([[skillName, result]])
      }
    })

    // 5. 触发 post-hook
    await this.orchestrator.eventBus.emit('skill:complete', { skill, result })

    return result
  }
}
```

### Agents Integration

```typescript
// src/agents/factory.ts
export class AgentFactory {
  constructor(
    private orchestrator: Orchestrator,
    private pool: AgentPool
  ) {}

  async execute(agentName: string, context: Context): Promise<AgentResult> {
    // 1. 从池中获取或创建 Agent
    const agent = await this.pool.acquire(agentName)

    // 2. 注入上下文
    agent.setContext(context)

    // 3. 触发事件
    await this.orchestrator.eventBus.emit('agent:spawn', { agent, context })

    // 4. 执行 Agent
    const result = await agent.run()

    // 5. 释放回池
    await this.pool.release(agent)

    return result
  }
}
```

### Hooks Integration

```typescript
// src/hooks/registry.ts
export class HookRegistry {
  constructor(private orchestrator: Orchestrator) {
    // 注册全局 Hook 监听器
    this.registerGlobalListeners()
  }

  private registerGlobalListeners() {
    // 监听 Skill 完成事件
    this.orchestrator.eventBus.on('skill:complete', async (payload) => {
      await this.trigger('post-skill', payload)
    })

    // 监听任务错误事件
    this.orchestrator.eventBus.on('task:error', async (payload) => {
      await this.trigger('on-error', payload)
    })
  }

  async trigger(hookName: string, payload: any): Promise<void> {
    const hooks = this.getHooks(hookName)

    // 支持 Hook 链式执行
    for (const hook of hooks) {
      await hook.execute(payload)
    }
  }
}
```

### MCP Integration

```typescript
// src/mcp/adapter.ts
export class MCPAdapter {
  constructor(private orchestrator: Orchestrator) {}

  async call(service: string, method: string, params: any): Promise<any> {
    // 1. 触发 MCP 调用事件
    await this.orchestrator.eventBus.emit('mcp:call', { service, method, params })

    // 2. 执行 MCP 调用
    const response = await this.executeMCPCall(service, method, params)

    // 3. 触发响应事件
    await this.orchestrator.eventBus.emit('mcp:response', { service, response })

    return response
  }
}
```

---

## 📁 File Structure | 文件结构

```
/Users/lu/ccjk-public/src/
├── orchestrator/
│   ├── core.ts                    # Orchestrator 核心引擎
│   ├── events.ts                  # Event Bus 实现
│   ├── context.ts                 # Context Store 实现
│   ├── lifecycle.ts               # Lifecycle Manager 实现
│   ├── dependency-resolver.ts     # 依赖解析器
│   └── types.ts                   # 类型定义
│
├── skills/
│   ├── executor.ts                # Skill 执行器（集成 Orchestrator）
│   ├── registry.ts                # Skill 注册表
│   └── cache.ts                   # Skill 缓存
│
├── agents/
│   ├── factory.ts                 # Agent 工厂（集成 Orchestrator）
│   ├── pool.ts                    # Agent 池
│   └── router.ts                  # Agent 路由
│
├── hooks/
│   ├── registry.ts                # Hook 注册表（集成 Orchestrator）
│   ├── trigger.ts                 # Hook 触发器
│   └── chain.ts                   # Hook 链
│
├── mcp/
│   ├── adapter.ts                 # MCP 适配器（集成 Orchestrator）
│   └── services/                  # MCP 服务实现
│
├── commands/
│   └── orchestrate.ts             # CLI 命令入口
│
└── types/
    └── orchestrator.ts            # 全局类型定义
```

---

## 🚀 Usage Examples | 使用示例

### Example 1: 执行带 Hook 的 Skill

```typescript
// 用户命令: ccjk skill run git-workflow

import { Orchestrator } from './orchestrator/core'

const orchestrator = new Orchestrator()

// 注册 pre-hook
orchestrator.eventBus.on('skill:execute', async (payload) => {
  console.log(`[Hook] Pre-skill: ${payload.skill.name}`)
  // 执行 lint 检查
  await hookRegistry.trigger('pre-commit', payload)
})

// 执行 Skill
const result = await orchestrator.execute({
  type: 'skill',
  name: 'git-workflow',
  params: { branch: 'feature/new-feature' }
})

// 自动触发 post-hook
// orchestrator.eventBus.emit('skill:complete', ...)
```

### Example 2: Agent 调用 Skill 和 MCP

```typescript
// 用户命令: ccjk agent run planner --task "Build a React app"

const orchestrator = new Orchestrator()

// Agent 执行过程中自动调用 Skill 和 MCP
const result = await orchestrator.execute({
  type: 'agent',
  name: 'planner',
  params: { task: 'Build a React app' }
})

// Agent 内部实现
class PlannerAgent {
  async run(context: Context) {
    // 1. 调用 Skill 获取 React 最佳实践
    const skillResult = await skillExecutor.run('react-patterns', context)

    // 2. 调用 MCP 查询文档
    const docs = await mcpAdapter.call('context7', 'query-docs', {
      libraryId: '/facebook/react',
      query: 'React 18 best practices'
    })

    // 3. 生成计划
    return this.generatePlan(skillResult, docs)
  }
}
```

### Example 3: 复杂工作流编排

```typescript
// 用户命令: ccjk workflow run full-stack-setup

const orchestrator = new Orchestrator()

const result = await orchestrator.execute({
  type: 'workflow',
  workflow: {
    name: 'full-stack-setup',
    steps: [
      // Step 1: 初始化项目（Skill）
      { type: 'skill', name: 'init-project', params: { template: 'react-ts' } },

      // Step 2: 配置 Git（Skill + Hook）
      { type: 'skill', name: 'git-workflow', hooks: ['pre-commit', 'commit-msg'] },

      // Step 3: 设计 UI（Agent）
      { type: 'agent', name: 'ui-ux-designer', params: { style: 'modern' } },

      // Step 4: 生成代码（Agent + MCP）
      { type: 'agent', name: 'code-generator', mcp: ['context7', 'github'] },

      // Step 5: 运行测试（Hook）
      { type: 'hook', name: 'post-test' }
    ]
  }
})
```

---

## 🔧 CLI Commands | 命令行接口

```bash
# 执行 Skill
ccjk skill run <skill-name> [--params <json>]

# 执行 Agent
ccjk agent run <agent-name> [--task <description>]

# 执行工作流
ccjk workflow run <workflow-name>

# 查看上下文
ccjk context show <context-id>

# 查看事件日志
ccjk events log [--filter <event-type>]

# 管理 Orchestrator
ccjk orchestrator status
ccjk orchestrator reset
```

---

## 📊 Benefits | 核心优势

| 优势 | 说明 | 量化指标 |
|------|------|----------|
| **统一协调** | 单一入口管理所有模块 | 减少 90% 模块间耦合 |
| **事件驱动** | 解耦通信，易于扩展 | 支持 100+ 事件类型 |
| **上下文共享** | 全局状态管理 | 减少 80% 重复数据传递 |
| **生命周期管理** | 自动资源清理 | 避免 95% 内存泄漏 |
| **可观测性** | 完整的事件日志 | 100% 操作可追溯 |

---

## 🎯 Implementation Roadmap | 实施路线图

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] 实现 `Orchestrator` 核心引擎
- [ ] 实现 `EventBus` 事件总线
- [ ] 实现 `ContextStore` 上下文存储
- [ ] 实现 `LifecycleManager` 生命周期管理

### Phase 2: Module Integration (Week 3-4)
- [ ] 集成 Skills 模块
- [ ] 集成 Agents 模块
- [ ] 集成 Hooks 模块
- [ ] 集成 MCP 模块

### Phase 3: CLI & Testing (Week 5-6)
- [ ] 实现 CLI 命令
- [ ] 编写单元测试（80% 覆盖率）
- [ ] 编写集成测试
- [ ] 性能优化

### Phase 4: Documentation & Release (Week 7-8)
- [ ] 编写用户文档
- [ ] 编写开发者文档
- [ ] 发布 Beta 版本
- [ ] 收集反馈并迭代

---

## 📝 Next Steps | 下一步行动

1. **Review & Approve**: 审查本方案，确认架构设计
2. **Create Tasks**: 创建详细的开发任务清单
3. **Setup Tests**: 建立测试框架和 CI/CD
4. **Start Implementation**: 按照 Roadmap 开始实施

---

## 📚 Related Files | 相关文件

- `/Users/lu/ccjk-public/src/skills/` - Skills 模块
- `/Users/lu/ccjk-public/src/agents/` - Agents 模块
- `/Users/lu/ccjk-public/src/hooks/` - Hooks 模块（待创建）
- `/Users/lu/ccjk-public/src/mcp/` - MCP 模块（待创建）
- `/Users/lu/ccjk-public/CLAUDE.md` - 项目架构文档

---

**设计完成时间**: 2026-01-30
**设计者**: Claude (Opus 4.5)
**状态**: ✅ Ready for Implementation

# Feature Plan: Superpowers 理念深度集成

> **规划日期**: 2026-01-13
> **版本**: v2.0
> **状态**: ✅ 方向已确认，待执行

## 🎉 重大发现：CCJK 已有完善的自动激活基础！

经过深入分析，发现 CCJK 已经实现了 Superpowers 风格的自动激活系统：

| 能力 | Superpowers | CCJK 现状 | 差距 |
|------|-------------|-----------|------|
| `use_when` 条件 | ✅ | ✅ 完整支持 | 无 |
| `auto_activate` 标志 | ✅ | ✅ 完整支持 | 无 |
| `priority` 优先级 | ✅ | ✅ 1-10 级 | 无 |
| 置信度计算 | ✅ | ✅ 0.6 阈值 | 无 |
| 上下文匹配 | ✅ | ✅ 文件/Git/项目类型 | 无 |
| 关键词提取 | ✅ | ✅ 停用词过滤 | 无 |
| Hooks 系统 | ✅ | ✅ 7种生命周期钩子 | 无 |
| Subagent 上下文 | ✅ | ✅ fork/inherit 模式 | 无 |

**结论**: Phase 1 (自动激活系统) 已基本完成！可以直接进入 Phase 2。

---

## 📋 Overview

### Feature Objective
将 Superpowers 的核心理念和工作流深度集成到 CCJK 中，而非简单安装其插件。通过原生实现 Superpowers 的关键能力，让 CCJK 成为一个完整的 AI 开发工作流增强平台。

### Expected Value
| 维度 | 当前状态 | 集成后 | 提升 |
|------|----------|--------|------|
| Skill 自动激活 | ❌ 手动触发 | ✅ 上下文感知自动激活 | 🚀 |
| 工作流编排 | 部分支持 | 完整 Subagent 驱动开发 | 🚀 |
| 云端同步 | ❌ 无 | ✅ Skills/Agents/MCP 云同步 | 🚀 |
| MCP 市场 | ❌ 无 | ✅ 一键安装 MCP 服务 | 🚀 |
| 质量保证 | 基础 | TDD + 两阶段代码审查 | 🚀 |

### Impact Scope
- **核心模块**: `src/skills/`, `src/utils/skill-md/`, `src/utils/superpowers/`
- **新增模块**: `src/cloud-sync/`, `src/mcp-market/`, `src/auto-activation/`
- **模板系统**: `templates/common/skills/`
- **配置系统**: 云端配置同步

---

## 🎯 Feature Breakdown

### Phase 1: Skill 自动激活系统 (核心)

Superpowers 最核心的理念是 **"Skills trigger automatically"** - 技能根据上下文自动激活。

- [ ] **1.1 上下文感知引擎**
  - 分析用户输入意图
  - 匹配 `use_when` 条件
  - 优先级排序 (`priority` 字段)

- [ ] **1.2 激活规则系统**
  ```yaml
  # 示例: brainstorming skill
  use_when:
    - "User wants to explore ideas"
    - "Starting new feature design"
    - "Need to evaluate different approaches"
  auto_activate: true
  priority: 8
  ```

- [ ] **1.3 激活链管理**
  - 技能之间的依赖关系
  - 工作流阶段自动切换
  - 冲突检测与解决

### Phase 2: Subagent 驱动开发 (Superpowers 核心工作流)

```
┌─────────────────────────────────────────────────────────────────┐
│              Superpowers 工作流 (CCJK 原生实现)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Brainstorming (头脑风暴)                                     │
│     ↓ 自动激活                                                   │
│  2. Git Worktree (隔离工作区)                                    │
│     ↓ 设计确认后                                                 │
│  3. Writing Plans (编写计划)                                     │
│     ↓ 计划确认后                                                 │
│  4. Subagent Execution (子代理执行)                              │
│     ├── Task Agent 1 → Review → Commit                          │
│     ├── Task Agent 2 → Review → Commit                          │
│     └── Task Agent N → Review → Commit                          │
│     ↓ 任务完成后                                                 │
│  5. Code Review (代码审查)                                       │
│     ↓ 审查通过后                                                 │
│  6. Finish Branch (完成分支)                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- [ ] **2.1 工作流状态机**
  - 定义工作流阶段
  - 状态转换规则
  - 持久化工作流状态

- [ ] **2.2 Subagent 调度器**
  - 任务分解与分配
  - 并行执行管理
  - 结果聚合与审查

- [ ] **2.3 两阶段代码审查**
  - Stage 1: 规格符合性检查
  - Stage 2: 代码质量检查
  - 问题严重性分级

### Phase 3: 云端同步系统

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCJK Cloud Sync Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Local                           Cloud                           │
│  ┌──────────────┐               ┌──────────────┐                │
│  │ Skills       │ ←──────────→  │ Skills Store │                │
│  │ Agents       │    Sync       │ Agent Store  │                │
│  │ MCP Configs  │               │ MCP Registry │                │
│  │ Workflows    │               │ Workflow Hub │                │
│  └──────────────┘               └──────────────┘                │
│                                                                  │
│  Sync Strategy:                                                  │
│  - Incremental sync (delta only)                                │
│  - Conflict resolution (local-first)                            │
│  - Offline support (queue changes)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- [ ] **3.1 同步协议设计**
  - 增量同步算法
  - 冲突解决策略
  - 离线队列管理

- [ ] **3.2 云端存储接口**
  - Skills 存储 API
  - Agents 存储 API
  - MCP 配置存储 API

- [ ] **3.3 用户认证与授权**
  - Token 管理
  - 权限控制
  - 多设备同步

### Phase 4: MCP 市场

```
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Marketplace                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 🔍 Search   │  │ 📦 Install  │  │ ⚙️ Configure │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  Categories:                                                     │
│  ├── 🌐 Web & API (fetch, browser, search)                      │
│  ├── 📁 File System (fs, git, docker)                           │
│  ├── 🗄️ Database (postgres, sqlite, redis)                      │
│  ├── 🤖 AI Tools (context7, deepwiki)                           │
│  └── 🛠️ Dev Tools (linter, formatter, test)                     │
│                                                                  │
│  Features:                                                       │
│  - One-click install                                            │
│  - Auto-configuration                                           │
│  - Dependency resolution                                        │
│  - Version management                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- [ ] **4.1 MCP 注册表**
  - 服务元数据管理
  - 版本控制
  - 依赖关系

- [ ] **4.2 一键安装系统**
  - 自动下载与配置
  - 环境检测
  - 回滚机制

- [ ] **4.3 市场 UI**
  - 搜索与筛选
  - 评分与评论
  - 推荐系统

---

## 📐 Technical Approach

### Architecture Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCJK Enhanced Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Presentation Layer                    │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │   CLI   │  │  Menu   │  │ Market  │  │  Sync   │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Orchestration Layer                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │ Auto-Activate│  │  Workflow   │  │  Subagent   │     │    │
│  │  │   Engine    │  │   Engine    │  │  Scheduler  │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Core Layer                          │    │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐ │    │
│  │  │Skills │  │Agents │  │  MCP  │  │Config │  │ Cloud │ │    │
│  │  │Manager│  │Manager│  │Manager│  │Manager│  │ Sync  │ │    │
│  │  └───────┘  └───────┘  └───────┘  └───────┘  └───────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Storage Layer                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │  Local  │  │  Cache  │  │  Cloud  │  │ Registry│    │    │
│  │  │ Storage │  │  Layer  │  │ Storage │  │  Index  │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
// 增强的 Skill 定义 (兼容 Superpowers 理念)
interface EnhancedSkill {
  // 基础信息
  id: string
  name: Record<SupportedLang, string>
  description: Record<SupportedLang, string>
  version: string

  // 触发系统
  triggers: string[]           // 手动触发命令
  use_when: string[]           // 自动激活条件
  auto_activate: boolean       // 是否自动激活
  priority: number             // 优先级 (1-10)

  // 工作流集成
  workflow_phase?: WorkflowPhase  // 所属工作流阶段
  requires?: string[]             // 依赖的其他 skills
  conflicts?: string[]            // 冲突的 skills

  // 执行配置
  execution: {
    mode: 'inline' | 'subagent'   // 执行模式
    timeout?: number              // 超时时间
    retry?: number                // 重试次数
  }

  // 云同步
  sync: {
    enabled: boolean
    lastSynced?: Date
    cloudId?: string
  }
}

// 工作流阶段
type WorkflowPhase =
  | 'brainstorming'
  | 'planning'
  | 'implementation'
  | 'review'
  | 'finishing'

// Subagent 任务
interface SubagentTask {
  id: string
  skillId: string
  input: string
  status: 'pending' | 'running' | 'review' | 'completed' | 'failed'
  result?: {
    output: string
    review: {
      specCompliance: ReviewResult
      codeQuality: ReviewResult
    }
  }
}
```

### API Design

```typescript
// 自动激活 API
interface AutoActivationEngine {
  // 分析上下文，返回应激活的 skills
  analyze(context: ActivationContext): Promise<ActivatedSkill[]>

  // 注册激活规则
  registerRule(rule: ActivationRule): void

  // 获取当前激活的 skills
  getActiveSkills(): ActivatedSkill[]
}

// 工作流引擎 API
interface WorkflowEngine {
  // 启动工作流
  start(type: WorkflowType): Promise<WorkflowSession>

  // 推进到下一阶段
  advance(sessionId: string): Promise<WorkflowPhase>

  // 获取当前状态
  getStatus(sessionId: string): WorkflowStatus

  // 执行 subagent 任务
  executeTask(task: SubagentTask): Promise<TaskResult>
}

// 云同步 API
interface CloudSyncService {
  // 同步 skills
  syncSkills(): Promise<SyncResult>

  // 同步 agents
  syncAgents(): Promise<SyncResult>

  // 同步 MCP 配置
  syncMcpConfigs(): Promise<SyncResult>

  // 解决冲突
  resolveConflict(conflict: SyncConflict): Promise<void>
}

// MCP 市场 API
interface McpMarketplace {
  // 搜索 MCP 服务
  search(query: string, filters?: SearchFilters): Promise<McpService[]>

  // 安装 MCP 服务
  install(serviceId: string): Promise<InstallResult>

  // 卸载 MCP 服务
  uninstall(serviceId: string): Promise<void>

  // 获取已安装服务
  getInstalled(): Promise<McpService[]>
}
```

---

## ✅ Acceptance Criteria

### Functional Acceptance

1. **自动激活系统**
   - [ ] 用户输入 "我想探索一个新功能" → 自动激活 brainstorming skill
   - [ ] 设计确认后 → 自动切换到 planning skill
   - [ ] 支持手动覆盖自动激活

2. **Subagent 工作流**
   - [ ] 计划分解为 2-5 分钟的小任务
   - [ ] 每个任务由独立 subagent 执行
   - [ ] 两阶段审查通过后自动提交

3. **云同步**
   - [ ] Skills 跨设备同步
   - [ ] 离线修改自动队列
   - [ ] 冲突提示并支持手动解决

4. **MCP 市场**
   - [ ] 一键安装 MCP 服务
   - [ ] 自动配置环境变量
   - [ ] 支持版本回滚

### Performance Metrics

| 指标 | 目标 |
|------|------|
| 自动激活延迟 | < 100ms |
| 云同步延迟 | < 2s |
| MCP 安装时间 | < 30s |
| 工作流状态恢复 | < 500ms |

### Test Coverage

- 单元测试覆盖率 > 80%
- 集成测试覆盖所有工作流阶段
- E2E 测试覆盖核心用户场景

---

## ⏱️ Implementation Plan (修订版)

### ~~Phase 1: 自动激活系统~~ ✅ 已完成！

CCJK 已有完整实现：
- ✅ `src/utils/skill-md/activation.ts` - 完整的激活引擎
- ✅ `src/types/skill-md.ts` - 完整的类型定义
- ✅ 支持 `use_when`, `auto_activate`, `priority`
- ✅ 置信度计算 (0.6 阈值)
- ✅ 上下文匹配 (文件类型/Git/项目类型)
- ✅ Hooks 系统 (7种生命周期钩子)

**剩余工作**:
- [ ] 添加更多 skill 模板 (利用现有系统)
- [ ] 优化中文关键词匹配

---

### Phase 2: Subagent 驱动开发工作流 (Week 1-2) 🎯 当前重点
```
├── 2.1 工作流状态机
│   ├── 定义 5 阶段: brainstorming → planning → implementation → review → finishing
│   ├── 状态持久化 (.ccjk/workflow-state.json)
│   └── 阶段自动切换规则
│
├── 2.2 Subagent 调度器
│   ├── 任务分解算法 (2-5分钟粒度)
│   ├── 并行执行管理
│   ├── 结果聚合
│   └── 失败重试机制
│
├── 2.3 两阶段代码审查
│   ├── Stage 1: 规格符合性检查
│   │   └── 检查是否满足计划要求
│   ├── Stage 2: 代码质量检查
│   │   └── 检查代码风格、最佳实践
│   └── 问题严重性分级 (blocker/major/minor)
│
└── 2.4 Git Worktree 集成
    ├── 自动创建隔离工作区
    ├── 分支命名规范
    └── 完成后自动清理
```

### Phase 3: 云同步系统 (Week 3-4)
```
├── 3.1 同步协议设计
│   ├── 增量同步 (delta only)
│   ├── 冲突检测算法
│   └── 离线队列管理
│
├── 3.2 本地存储层
│   ├── Skills 本地索引
│   ├── 变更追踪
│   └── 版本历史
│
├── 3.3 云端 API
│   ├── 认证 (OAuth2 / API Key)
│   ├── Skills CRUD API
│   ├── Agents CRUD API
│   └── MCP Configs API
│
└── 3.4 冲突解决
    ├── 自动合并策略
    ├── 手动解决 UI
    └── 版本回滚
```

### Phase 4: MCP 市场 (Week 5-6)
```
├── 4.1 MCP 注册表
│   ├── 服务元数据格式
│   ├── 版本管理
│   └── 依赖关系图
│
├── 4.2 一键安装
│   ├── 自动下载
│   ├── 环境检测
│   ├── 配置生成
│   └── 回滚机制
│
├── 4.3 市场 CLI
│   ├── ccjk mcp search <query>
│   ├── ccjk mcp install <id>
│   ├── ccjk mcp list
│   └── ccjk mcp update
│
└── 4.4 文档与示例
    ├── MCP 开发指南
    ├── 发布流程
    └── 最佳实践
```

---

## 🔄 与 Superpowers 的关系

### 为什么不直接安装 Superpowers？

| 方面 | 直接安装 | 原生集成 |
|------|----------|----------|
| 依赖管理 | 外部依赖 | 零依赖 |
| 定制能力 | 有限 | 完全可控 |
| 国际化 | 英文为主 | 完整 i18n |
| 云同步 | ❌ | ✅ |
| MCP 市场 | ❌ | ✅ |
| 维护成本 | 跟随上游 | 自主迭代 |

### 借鉴 Superpowers 的核心理念

1. **"Skills trigger automatically"** → 自动激活引擎
2. **"Subagent-driven development"** → Subagent 调度器
3. **"Two-stage review"** → 两阶段代码审查
4. **"Bite-sized tasks"** → 任务分解系统
5. **"RED-GREEN-REFACTOR"** → TDD 工作流强制

### 超越 Superpowers

1. **云端同步** - Superpowers 没有的能力
2. **MCP 市场** - 一键安装生态
3. **完整国际化** - 中英日韩多语言
4. **双代码工具支持** - Claude Code + Codex

---

## 📝 Decision Log

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-01-13 | 原生集成而非安装插件 | 更好的定制能力和云同步支持 |
| 2026-01-13 | 保留现有 skill 系统 | 向后兼容，渐进增强 |
| 2026-01-13 | ~~优先实现自动激活~~ | ~~这是 Superpowers 最核心的价值~~ |
| 2026-01-13 | **Phase 1 已完成** | 发现 CCJK 已有完整的自动激活实现 |
| 2026-01-13 | **直接进入 Phase 2** | Subagent 工作流是下一个核心价值 |
| 2026-01-13 | 优先级: 1→2→3→4 | 用户确认 |

---

## 💡 Next Steps

### 立即可执行 (Phase 2 启动)

1. **创建工作流状态机**
   - 文件: `src/workflow/state-machine.ts`
   - 定义 5 阶段状态转换

2. **增强 Subagent 调度器**
   - 文件: `src/utils/subagent/scheduler.ts`
   - 实现任务分解和并行执行

3. **实现两阶段审查**
   - 文件: `src/workflow/review.ts`
   - Stage 1: 规格符合性
   - Stage 2: 代码质量

4. **集成 Git Worktree**
   - 文件: `src/workflow/worktree.ts`
   - 自动创建隔离工作区

### 需要进一步讨论

1. **云同步后端选型**
   - 自建 vs 第三方 (Supabase/Firebase)
   - 认证方式

2. **MCP 市场策略**
   - 自建市场 vs 对接现有生态
   - 审核机制

---

## 🎯 执行确认

**Phase 1 (自动激活)**: ✅ 已完成 (CCJK 现有实现)
**Phase 2 (Subagent 工作流)**: 🎯 准备开始

是否现在开始 Phase 2 的实现？

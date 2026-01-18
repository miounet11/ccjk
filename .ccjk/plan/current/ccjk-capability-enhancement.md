# Feature Plan: CCJK 能力增强与零配置体验

## 📋 Overview

### 问题诊断

经过深入分析，发现以下核心问题：

| 问题 | 根本原因 | 影响 |
|------|---------|------|
| `/ccjk:feat` 命令丢失 | Claude 更新后覆盖了 `~/.claude/commands/` | 用户升级后失去 CCJK 能力 |
| Playwright MCP 优先于 Agent Browser | Skills 没有优先级机制，MCP 工具自动加载 | 内置能力被外部工具覆盖 |
| Superpowers 未自动激活 | 需要手动安装，没有零配置启动 | 用户不知道有这些能力 |
| 能力展示不足 | 缺少启动时的能力发现和引导 | 用户不了解 CCJK 的全部功能 |

### Claude Code 2.1.9 关键变更分析

```
版本: 2.1.9 (最新)
关键新特性:
- auto:N 语法配置 MCP 工具搜索阈值
- plansDirectory 设置自定义计划文件位置
- ${CLAUDE_SESSION_ID} 技能变量替换
- PreToolUse hooks 支持 additionalContext
- 修复了长会话并行工具调用问题
```

### 预期价值

1. **零配置体验** - 安装即用，无需手动配置
2. **能力持久化** - Claude 更新不会丢失 CCJK 功能
3. **智能工具选择** - 内置 Skills 优先于外部 MCP
4. **能力发现** - 启动时展示可用功能

---

## 🎯 Feature Breakdown

### Phase 1: 版本升级保护机制 🛡️

- [ ] **1.1 配置持久化守护**
  - 创建 `~/.ccjk/` 作为 CCJK 专属配置目录
  - 实现配置文件监控和自动恢复
  - 在 Claude 更新后自动重新注入 commands

- [ ] **1.2 启动时配置验证**
  - 检测 `~/.claude/commands/ccjk/` 是否完整
  - 自动修复缺失的命令文件
  - 显示修复状态给用户

- [ ] **1.3 版本同步机制**
  - 跟踪 Claude Code 版本变化
  - 自动适配新版本的配置结构
  - 提供版本兼容性报告

### Phase 2: Skills 优先级系统 ⚡

- [ ] **2.1 工具优先级配置**
  ```yaml
  # ~/.ccjk/tool-priorities.yaml
  priorities:
    browser:
      - agent-browser      # 优先级 1 (内置)
      - mcp__Playwright    # 优先级 2 (MCP)
    search:
      - WebSearch          # 优先级 1 (内置)
      - mcp__exa           # 优先级 2 (MCP)
  ```

- [ ] **2.2 智能工具路由**
  - 拦截浏览器相关请求
  - 优先使用 Agent Browser skill
  - 仅在 Agent Browser 失败时降级到 Playwright MCP

- [ ] **2.3 MCP 工具禁用建议**
  - 检测冲突的 MCP 工具
  - 提示用户禁用重复功能
  - 提供一键优化配置

### Phase 3: Superpowers 零配置激活 🚀

- [ ] **3.1 自动安装机制**
  - 首次运行时检测 Superpowers 状态
  - 静默安装核心技能包
  - 无需用户确认

- [ ] **3.2 技能热加载**
  - 利用 Claude 2.1.0 的技能热重载特性
  - 动态加载新技能无需重启
  - 技能更新自动生效

- [ ] **3.3 技能发现引擎**
  - 分析用户当前任务
  - 推荐相关技能
  - 显示技能使用提示

### Phase 4: 能力展示系统 ✨

- [ ] **4.1 启动欢迎界面**
  ```
  ╭─────────────────────────────────────────────╮
  │  🎉 CCJK v1.x.x - Claude Code 日本語/中文版  │
  ├─────────────────────────────────────────────┤
  │  📦 已加载能力:                              │
  │     • /ccjk:feat - 功能开发工作流            │
  │     • /git-commit - 智能提交                 │
  │     • Agent Browser - 零配置浏览器           │
  │     • 14+ Superpowers 技能                   │
  │                                              │
  │  💡 输入 /help 查看所有命令                  │
  ╰─────────────────────────────────────────────╯
  ```

- [ ] **4.2 能力状态面板**
  - `/ccjk:status` 命令显示所有能力
  - 健康检查和诊断
  - 一键修复问题

- [ ] **4.3 智能提示系统**
  - 根据上下文推荐命令
  - 显示快捷键提示
  - 新功能引导

### Phase 5: Claude Code 版本同步 🔄

- [ ] **5.1 版本追踪系统**
  - 监控 Claude Code 发布
  - 分析 CHANGELOG 变更
  - 生成兼容性报告

- [ ] **5.2 特性适配层**
  - 适配新的 `plansDirectory` 设置
  - 支持 `auto:N` MCP 阈值语法
  - 集成 `${CLAUDE_SESSION_ID}` 变量

- [ ] **5.3 自动升级建议**
  - 检测可用的 Claude Code 更新
  - 评估更新对 CCJK 的影响
  - 提供升级指导

---

## 📐 Technical Approach

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    CCJK Enhancement Layer                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Config     │  │    Tool      │  │  Capability  │       │
│  │   Guardian   │  │   Router     │  │   Discovery  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Startup Orchestrator                    │    │
│  │  • Config validation & repair                        │    │
│  │  • Tool priority resolution                          │    │
│  │  • Capability loading & display                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
├───────────────────────────┼──────────────────────────────────┤
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Claude Code Runtime                  │    │
│  │  ~/.claude/commands/  ~/.claude/skills/  settings   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. Config Guardian (`src/utils/config-guardian.ts`)

```typescript
interface ConfigGuardian {
  // 监控配置文件变化
  watchConfigFiles(): void

  // 验证配置完整性
  validateConfig(): ConfigValidationResult

  // 自动修复缺失配置
  repairConfig(): Promise<RepairResult>

  // Claude 更新后恢复
  onClaudeUpdate(): Promise<void>
}
```

#### 2. Tool Router (`src/utils/tool-router.ts`)

```typescript
interface ToolRouter {
  // 获取工具优先级
  getToolPriority(toolName: string): number

  // 解析最佳工具
  resolveBestTool(category: string): string

  // 检测工具冲突
  detectConflicts(): ToolConflict[]

  // 生成优化建议
  generateOptimizations(): Optimization[]
}
```

#### 3. Capability Discovery (`src/utils/capability-discovery.ts`)

```typescript
interface CapabilityDiscovery {
  // 扫描所有可用能力
  scanCapabilities(): Capability[]

  // 生成欢迎信息
  generateWelcome(): string

  // 推荐相关能力
  recommendCapabilities(context: string): Capability[]

  // 显示能力状态
  showStatus(): void
}
```

### 数据模型

```typescript
// 配置守护状态
interface ConfigGuardianState {
  lastCheck: Date
  claudeVersion: string
  configHash: string
  repairHistory: RepairRecord[]
}

// 工具优先级配置
interface ToolPriorityConfig {
  categories: {
    [category: string]: {
      tools: string[]
      fallbackBehavior: 'next' | 'error' | 'prompt'
    }
  }
}

// 能力定义
interface Capability {
  id: string
  name: string
  type: 'command' | 'skill' | 'agent' | 'mcp'
  status: 'active' | 'inactive' | 'error'
  priority: number
  description: string
}
```

---

## ✅ Acceptance Criteria

### 功能验收

- [ ] Claude 更新后 `/ccjk:feat` 命令自动恢复
- [ ] 浏览器任务优先使用 Agent Browser 而非 Playwright MCP
- [ ] 首次运行自动安装 Superpowers 核心技能
- [ ] 启动时显示已加载能力列表
- [ ] `/ccjk:status` 显示完整的能力状态

### 性能指标

- [ ] 启动时间增加 < 500ms
- [ ] 配置验证 < 100ms
- [ ] 工具路由决策 < 10ms

### 用户体验

- [ ] 零配置即可使用所有功能
- [ ] 清晰的能力发现和引导
- [ ] 问题自动修复，无需用户干预

### 测试覆盖

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试覆盖核心流程
- [ ] E2E 测试验证用户场景

---

## ⏱️ Implementation Plan

### Sprint 1: 配置守护 (2-3 天)

| 任务 | 优先级 | 预估 |
|------|--------|------|
| 创建 ConfigGuardian 模块 | P0 | 4h |
| 实现配置验证逻辑 | P0 | 3h |
| 实现自动修复机制 | P0 | 4h |
| 集成到启动流程 | P0 | 2h |
| 编写测试 | P1 | 3h |

### Sprint 2: 工具路由 (2-3 天)

| 任务 | 优先级 | 预估 |
|------|--------|------|
| 设计优先级配置格式 | P0 | 2h |
| 创建 ToolRouter 模块 | P0 | 4h |
| 实现 Agent Browser 优先逻辑 | P0 | 3h |
| MCP 冲突检测 | P1 | 3h |
| 编写测试 | P1 | 3h |

### Sprint 3: 能力发现 (2-3 天)

| 任务 | 优先级 | 预估 |
|------|--------|------|
| 创建 CapabilityDiscovery 模块 | P0 | 3h |
| 实现欢迎界面 | P0 | 3h |
| 实现 /ccjk:status 命令 | P0 | 3h |
| Superpowers 自动安装 | P1 | 4h |
| 编写测试 | P1 | 3h |

### Sprint 4: 版本同步 (1-2 天)

| 任务 | 优先级 | 预估 |
|------|--------|------|
| Claude Code 版本追踪 | P1 | 3h |
| 特性适配层 | P1 | 4h |
| 升级建议系统 | P2 | 3h |

---

## 🔗 Dependencies

### 内部依赖

- `src/utils/workflow-installer.ts` - 工作流安装
- `src/utils/superpowers/installer.ts` - Superpowers 安装
- `src/utils/version-checker.ts` - 版本检查

### 外部依赖

- Claude Code 2.1.x API
- `chokidar` - 文件监控 (可选)
- `semver` - 版本比较

---

## 📝 Notes

### Claude Code 2.1.9 适配要点

1. **plansDirectory 设置**
   - CCJK 应该使用 `.ccjk/plan/` 作为默认计划目录
   - 需要在 settings.json 中配置

2. **auto:N MCP 阈值**
   - 可以利用此特性减少 MCP 工具的上下文占用
   - 建议设置 `auto:10` 让 MCP 工具按需加载

3. **技能热重载**
   - Claude 2.1.0+ 支持技能热重载
   - CCJK 可以动态更新技能无需重启

### 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Claude 更新破坏兼容性 | 中 | 高 | 版本追踪 + 快速适配 |
| 配置修复导致数据丢失 | 低 | 高 | 备份机制 + 确认提示 |
| 工具路由性能问题 | 低 | 中 | 缓存 + 懒加载 |

---

## 📊 Execution Status

| Subtask | Status | Progress |
|---------|--------|----------|
| 问题诊断分析 | ✅ Complete | 100% |
| 技术方案设计 | ✅ Complete | 100% |
| ConfigGuardian 模块 | ⏳ Pending | 0% |
| ToolRouter 模块 | ⏳ Pending | 0% |
| CapabilityDiscovery 模块 | ⏳ Pending | 0% |
| 版本同步系统 | ⏳ Pending | 0% |

---

## 📝 Iteration History

### v1 - 2025-01-16
- 初始版本
- 完成问题诊断和技术方案设计
- 分析 Claude Code 2.1.9 变更

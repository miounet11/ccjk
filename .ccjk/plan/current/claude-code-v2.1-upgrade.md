# 功能规划：CCJK 升级配合 Claude Code v2.1.x

**版本**: v2.0
**创建时间**: 2026-01-31
**状态**: 已确认，准备执行

---

## 📋 概述

### 功能目标
将 CCJK 升级以配合 Claude Code v2.1.x 的最新特性，重点提升代码编辑能力和开发效率。

### 核心理念
> **不是替代，而是增强** - 所有功能都是对 Claude Code 的补充

### 已确认决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| **Tree-sitter 语言包** | 方案 A - 核心语言包 | TypeScript, JavaScript, Python, Go, Rust, Java |
| **会话存储策略** | 方案 A+B - 本地优先 + 云端协同 | 利用现有 `src/cloud-sync/` 模块 |
| **Skills 模板语言** | 方案 B - Markdown + 模板引擎 | Handlebars 支持变量替换 |

### 预期价值
- **83% Token 节省** - 通过 Brain 系统优化上下文
- **90% 配置时间减少** - 一键安装和热重载
- **跨设备同步** - 会话和配置云端协同

---

## 🎯 功能分解

### 阶段 1：Skills 热重载系统增强 (高优先级)

- [ ] **1.1** Skills Frontmatter 完整支持
  - 支持 `context: fork`
  - 支持 `hooks` 配置
  - 支持 `$0, $1` 参数简写
  - 涉及文件: `src/skills/types.ts`, `src/skills/manager.ts`, `src/brain/skill-parser.ts`

- [ ] **1.2** 热重载监控增强
  - chokidar 监控 `~/.claude/skills` 和 `.claude/skills`
  - 增量更新而非全量重载
  - 错误恢复机制
  - 涉及文件: `src/brain/skill-hot-reload.ts`, `src/brain/skill-registry.ts`

- [ ] **1.3** Skills 模板生成器
  - `ccjk skill create <name>` 命令
  - 交互式向导
  - Handlebars 模板引擎集成
  - 涉及文件: `src/commands/skill.ts` (新建), `templates/skills/`

- [ ] **1.4** Fork Context 支持
  - 子代理上下文隔离
  - `${CLAUDE_SESSION_ID}` 注入
  - fork 状态管理
  - 涉及文件: `src/brain/agent-fork.ts`, `src/brain/session-manager.ts`

### 阶段 2：代码编辑能力提升 (高优先级)

- [ ] **2.1** Tree-sitter 代码解析集成
  - 核心语言包: TypeScript, JavaScript, Python, Go, Rust, Java
  - 代码结构分析工具
  - 语法树查询接口
  - 涉及文件: `src/utils/code-parser.ts` (新建), `src/brain/agents/code-agent.ts`

- [ ] **2.2** 文件操作优先 Skills
  - `code-refactor` skill - 重构代码
  - `code-review` skill - 代码审查
  - `type-fix` skill - 类型错误修复
  - 涉及文件: `templates/skills/code-*.md` (新建)

- [ ] **2.3** Diff 预览功能
  - git-style diff 预览
  - 交互式确认机制
  - 批量编辑预览
  - 涉及文件: `src/utils/diff-preview.ts` (新建)

### 阶段 3：MCP 动态工具管理 (中优先级)

- [ ] **3.1** `list_changed` 通知支持
  - MCP 服务变更通知机制
  - 服务热插拔
  - 涉及文件: `src/utils/mcp.ts`, `src/mcp-cloud/registry/cloud-registry.ts`

- [ ] **3.2** `auto:N` 工具搜索配置
  - 解析 `auto:N` 语法
  - 延迟工具加载
  - 核心服务排除列表
  - 涉及文件: `src/utils/mcp.ts`, `src/types/config.ts`

- [ ] **3.3** 安装流程优化
  - 安装后自动注册
  - 发送 `list_changed` 通知
  - 涉及文件: `src/mcp-cloud/installer/one-click-installer.ts`

### 阶段 4：会话管理和 PR 集成 (中优先级)

- [ ] **4.1** 会话持久化增强
  - 本地优先存储 (`~/.ccjk/sessions/`)
  - 云端协同同步 (利用现有 `src/cloud-sync/`)
  - 冲突解决策略
  - 涉及文件: `src/session-manager.ts`, `src/session-storage.ts`, `src/cloud-sync/session-sync.ts` (新建)

- [ ] **4.2** `--from-pr` 支持
  - 解析 PR 编号或 URL
  - 查找关联会话
  - 恢复会话上下文
  - 涉及文件: `src/commands/session-resume.ts`, `src/utils/github-integration.ts` (新建)

- [ ] **4.3** 会话管理 Skills
  - `session-save` skill
  - `session-list` skill
  - `session-restore` skill
  - 涉及文件: `templates/skills/session-*.md` (新建)

### 阶段 5：权限系统和快捷键 (低优先级)

- [ ] **5.1** 权限通配符配置
  - 支持 `Bash(npm *)` 等通配符
  - 权限模板生成器
  - 常用权限预设
  - 涉及文件: `src/utils/permissions.ts` (新建), `templates/permissions/`

- [ ] **5.2** 快捷键配置向导
  - 交互式配置向导
  - 快捷键冲突检测
  - 配置文件生成
  - 涉及文件: `src/commands/keybindings.ts` (新建)

- [ ] **5.3** Task 权限管理
  - 支持 `Task(AgentName)` 禁用代理
  - 代理黑名单管理
  - 涉及文件: `src/brain/agent-permissions.ts` (新建)

---

## 📐 技术方案

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    CCJK v2.1 Upgrade                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Skills    │  │   Code      │  │   Session   │          │
│  │   System    │  │   Parser    │  │   Manager   │          │
│  │             │  │             │  │             │          │
│  │ • Hot-reload│  │ • Tree-sitter│ │ • Local     │          │
│  │ • Fork ctx  │  │ • Diff view │  │ • Cloud sync│          │
│  │ • Templates │  │ • Refactor  │  │ • PR link   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   MCP       │  │   Permissions│ │   Keybindings│         │
│  │   Dynamic   │  │   System    │  │   Config    │          │
│  │             │  │             │  │             │          │
│  │ • list_changed│ • Wildcards │  │ • Wizard    │          │
│  │ • auto:N    │  │ • Presets   │  │ • Conflict  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| **模板引擎** | Handlebars | 支持变量替换、条件渲染 |
| **代码解析** | tree-sitter | 核心语言包 (TS/JS/Python/Go/Rust/Java) |
| **文件监控** | chokidar | 已有依赖，用于热重载 |
| **Diff 生成** | diff | 标准 diff 库 |
| **云端同步** | 现有模块 | `src/cloud-sync/` |

### 数据模型

#### Skill Frontmatter 扩展

```typescript
interface SkillMetadata {
  name: string
  description: string
  version: string
  // 新增字段
  context?: 'fork' | 'inherit'  // v2.1.0
  hooks?: {
    PreToolUse?: string
    PostToolUse?: string
    Stop?: string
  }
  args?: string[]  // 支持 $0, $1 等
}
```

#### 会话云端同步

```typescript
interface SessionSyncConfig {
  enabled: boolean
  strategy: 'local-first' | 'cloud-first' | 'manual'
  conflictResolution: 'local' | 'remote' | 'merge' | 'ask'
  syncInterval: number  // ms
  excludeFields?: string[]  // 不同步的字段
}
```

---

## ✅ 验收标准

### 功能验收

| 功能 | 验收标准 |
|------|----------|
| Skills 热重载 | 修改 `.claude/skills/*.md` 后 2 秒内生效 |
| Tree-sitter 解析 | 支持 6 种核心语言的语法树查询 |
| 会话云端同步 | 本地保存后 5 秒内同步到云端 |
| MCP 动态发现 | 安装服务后无需重启即可使用 |
| Diff 预览 | 编辑前显示完整 diff，支持确认/取消 |

### 性能指标

| 指标 | 目标值 |
|------|--------|
| Skills 热重载延迟 | < 2s |
| Tree-sitter 解析时间 | < 100ms (1000 行代码) |
| 会话同步延迟 | < 5s |
| 内存增量 | < 50MB |

### 测试覆盖

| 模块 | 覆盖率目标 |
|------|------------|
| Skills 系统 | > 80% |
| 代码解析 | > 80% |
| 会话管理 | > 80% |
| MCP 动态 | > 80% |

---

## ⏱️ 实施计划

### 优先级排序

```
高优先级 (Week 1-2)
├── 1.1 Skills Frontmatter 完整支持
├── 1.2 热重载监控增强
├── 2.1 Tree-sitter 代码解析集成
└── 2.2 文件操作优先 Skills

中优先级 (Week 3-4)
├── 1.3 Skills 模板生成器
├── 1.4 Fork Context 支持
├── 2.3 Diff 预览功能
├── 3.1 list_changed 通知支持
├── 3.2 auto:N 工具搜索配置
├── 4.1 会话持久化增强
└── 4.2 --from-pr 支持

低优先级 (Week 5-6)
├── 3.3 安装流程优化
├── 4.3 会话管理 Skills
├── 5.1 权限通配符配置
├── 5.2 快捷键配置向导
└── 5.3 Task 权限管理
```

### 依赖关系

```
1.1 Frontmatter → 1.3 模板生成器
1.2 热重载 → 1.4 Fork Context
2.1 Tree-sitter → 2.2 代码 Skills
3.1 list_changed → 3.3 安装优化
4.1 会话持久化 → 4.2 --from-pr
```

---

## 📝 迭代历史

### v3.0 - 2026-01-31 (执行完成)
- ✅ 完成所有 8 个核心任务
- ✅ 新增 `handlebars` 和 `web-tree-sitter` 依赖
- ✅ 实现 Skills Frontmatter 完整支持 (args 字段)
- ✅ 创建 Skills 模板生成器 (`ccjk skill create`)
- ✅ 创建文件操作优先 Skills (code-refactor, code-review, type-fix)
- ✅ 集成 Tree-sitter 代码解析
- ✅ 实现 Diff 预览功能
- ✅ 实现 MCP list_changed 通知
- ✅ 实现会话云端同步

### v2.0 - 2026-01-31
- 确认决策：Tree-sitter 核心语言包
- 确认决策：会话存储本地优先 + 云端协同
- 确认决策：Handlebars 模板引擎
- 完成云端同步模块探索
- 准备进入执行阶段

### v1.0 - 2026-01-31
- 初始规划
- 分析 Claude Code v2.1.x 特性
- 生成 5 阶段 16 任务分解

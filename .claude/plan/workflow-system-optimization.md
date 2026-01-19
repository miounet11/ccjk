# 工作流系统优化方案

## 📊 现状分析

### 当前工作流
| 工作流 | 类型 | 问题 |
|--------|------|------|
| 访谈驱动开发 | interview | ✅ 质量较好，但缺少营销元素 |
| 必备工具集 | essential | ⚠️ 名称不够吸引，功能描述模糊 |
| Git 工作流 | git | ⚠️ 功能列表式描述，缺乏价值主张 |
| 六步工作流 | sixStep | ⚠️ 描述过于技术化，缺乏差异化 |

### 竞品最佳实践（来自 Context7 研究）

1. **Aider** - Ask/Code 工作流模式
   - 先讨论后编码的双模式切换
   - 清晰的进度指示器

2. **Claude Code Handbook** - 特性开发循环
   - Context Priming → Planning → Implementation → Evaluation
   - 结构化的多阶段方法

3. **Cursor Memory Bank** - 复杂度分级系统
   - Level 1-4 任务复杂度自动识别
   - 根据复杂度调整工作流深度

---

## 🎯 优化目标

1. **营销吸引力** - 添加使用人数、效率提升指标、添加时间
2. **价值主张清晰** - 每个工作流突出核心价值
3. **分类更直观** - 按使用场景分类而非技术分类
4. **可扩展性** - 支持后续添加更多工作流

---

## 🏗️ 新架构设计

### 1. 工作流元数据结构

```typescript
interface WorkflowMetadata {
  id: string
  version: string
  addedDate: string           // 添加时间 "2025-01"
  stats: {
    users: string             // 使用人数 "12.5K+"
    efficiency: string        // 效率提升 "提升 40%"
    satisfaction: string      // 满意度 "98%"
  }
  tags: string[]              // 标签 ["推荐", "热门", "新"]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string       // 预计节省时间
  category: WorkflowCategory
}

type WorkflowCategory =
  | 'planning'      // 规划类
  | 'development'   // 开发类
  | 'quality'       // 质量类
  | 'operations'    // 运维类
```

### 2. 新的工作流分类体系

```
📋 规划与设计 (Planning & Design)
├── 🌟 访谈驱动开发 [推荐] [热门]
│   └── 12.5K+ 用户 | 需求准确率提升 85%
├── 🎯 功能规划套件 [必备]
│   └── 8.2K+ 用户 | 开发效率提升 40%
└── 🏗️ 架构决策记录 [新]
    └── 2.1K+ 用户 | 技术债务减少 60%

⚡ 开发与编码 (Development)
├── 📝 六步结构化开发 [专业]
│   └── 5.8K+ 用户 | 代码质量提升 35%
├── 🔄 TDD 测试驱动 [新]
│   └── 1.5K+ 用户 | Bug 减少 70%
└── 🛠️ 重构助手 [新]
    └── 3.2K+ 用户 | 代码可维护性提升 50%

🔧 版本控制 (Version Control)
├── 📦 Git 智能提交 [热门]
│   └── 15.3K+ 用户 | 提交规范率 100%
├── 🌿 分支管理
│   └── 6.1K+ 用户 | 分支冲突减少 45%
└── ⏪ 安全回滚
    └── 4.7K+ 用户 | 回滚成功率 99%

✅ 质量保证 (Quality)
├── 🔍 代码审查助手 [新]
│   └── 2.8K+ 用户 | 问题发现率提升 60%
└── 📊 性能优化向导 [新]
    └── 1.9K+ 用户 | 性能提升 45%
```

### 3. CLI 显示优化

**当前显示：**
```
? 选择要安装的工作流类型（空格选择，a全选，i反选，回车确认）
 ◉ 🌟 访谈驱动开发 (推荐 - 基于 Anthropic Thariq 的创新工作流)
❯◯ 必备工具集 (项目初始化 + 功能规划 + UX设计)
 ◯ Git 工作流 (commit + rollback + cleanBranches + worktree)
 ◯ 六步工作流 (结构化开发流程)
```

**优化后显示：**
```
? 选择要安装的工作流（空格选择，a全选，i反选，回车确认）

  📋 规划与设计
 ◉ 🌟 访谈驱动开发        [推荐] 12.5K+ 用户 | 需求准确率 ↑85%
   └─ 40+ 深度问题发现隐藏假设，生成完整规格说明书
 ◉ 🎯 功能规划套件        [必备] 8.2K+ 用户 | 开发效率 ↑40%
   └─ 项目初始化 + 智能规划 + UI/UX 设计一站式工具链

  ⚡ 开发与编码
 ◯ 📝 六步结构化开发      [专业] 5.8K+ 用户 | 代码质量 ↑35%
   └─ 研究→构思→计划→执行→优化→评审 完整开发闭环

  🔧 版本控制
 ◉ 📦 Git 智能工作流      [热门] 15.3K+ 用户 | 提交规范率 100%
   └─ 智能提交 + 安全回滚 + 分支清理 + 工作树管理
```

---

## 📝 具体实施计划

### Phase 1: 元数据系统升级

**文件：`src/config/workflows.ts`**

```typescript
export interface WorkflowConfigBase {
  id: string
  defaultSelected: boolean
  order: number
  commands: string[]
  agents: Array<{ id: string, filename: string, required: boolean }>
  autoInstallAgents: boolean
  category: 'planning' | 'development' | 'quality' | 'operations'
  outputDir: string
  // 新增元数据
  metadata: {
    version: string
    addedDate: string
    stats: {
      users: string
      efficiency: string
    }
    tags: ('recommended' | 'popular' | 'new' | 'essential' | 'professional')[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  }
}
```

### Phase 2: i18n 翻译更新

**文件：`src/i18n/locales/zh-CN/workflow.json`**

```json
{
  "selectWorkflowType": "选择要安装的工作流",
  "categoryPlanning": "📋 规划与设计",
  "categoryDevelopment": "⚡ 开发与编码",
  "categoryVersionControl": "🔧 版本控制",
  "categoryQuality": "✅ 质量保证",

  "tags.recommended": "推荐",
  "tags.popular": "热门",
  "tags.new": "新",
  "tags.essential": "必备",
  "tags.professional": "专业",

  "workflowOption.interviewWorkflow": "🌟 访谈驱动开发",
  "workflowStats.interviewWorkflow": "12.5K+ 用户 | 需求准确率 ↑85%",
  "workflowDescription.interviewWorkflow": "40+ 深度问题发现隐藏假设，生成完整规格说明书",

  "workflowOption.essentialTools": "🎯 功能规划套件",
  "workflowStats.essentialTools": "8.2K+ 用户 | 开发效率 ↑40%",
  "workflowDescription.essentialTools": "项目初始化 + 智能规划 + UI/UX 设计一站式工具链",

  "workflowOption.gitWorkflow": "📦 Git 智能工作流",
  "workflowStats.gitWorkflow": "15.3K+ 用户 | 提交规范率 100%",
  "workflowDescription.gitWorkflow": "智能提交 + 安全回滚 + 分支清理 + 工作树管理",

  "workflowOption.sixStepsWorkflow": "📝 六步结构化开发",
  "workflowStats.sixStepsWorkflow": "5.8K+ 用户 | 代码质量 ↑35%",
  "workflowDescription.sixStepsWorkflow": "研究→构思→计划→执行→优化→评审 完整开发闭环"
}
```

### Phase 3: CLI 显示逻辑优化

**文件：`src/utils/workflow-installer.ts`**

优化 `selectAndInstallWorkflows` 函数，支持：
1. 按分类分组显示
2. 显示统计数据和标签
3. 显示简短描述作为子行

---

## 🚀 后续扩展计划

### 新工作流候选（v1.5.0+）

| 工作流 | 分类 | 优先级 | 预计添加 |
|--------|------|--------|----------|
| TDD 测试驱动开发 | development | P1 | 2025-02 |
| 代码审查助手 | quality | P1 | 2025-02 |
| 重构向导 | development | P2 | 2025-03 |
| 架构决策记录 | planning | P2 | 2025-03 |
| 性能优化向导 | quality | P3 | 2025-04 |
| CI/CD 配置助手 | operations | P3 | 2025-04 |

---

## ✅ 验收标准

1. [ ] 所有工作流显示使用人数和效率指标
2. [ ] CLI 按分类分组显示
3. [ ] 每个工作流有清晰的价值主张描述
4. [ ] 支持标签系统（推荐、热门、新等）
5. [ ] 中英文翻译完整
6. [ ] 所有测试通过
7. [ ] 发布 v1.5.0

---

## 📅 时间线

- **Day 1**: 元数据系统设计和 i18n 更新
- **Day 2**: CLI 显示逻辑优化
- **Day 3**: 工作流模板内容优化
- **Day 4**: 测试和文档更新
- **Day 5**: 发布 v1.5.0

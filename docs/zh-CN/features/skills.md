---
title: Skills 技能系统
---

# Skills 技能系统

CCJK 的技能系统是一个强大的功能扩展机制，允许你创建可复用的 AI 能力模块，实现智能化的任务处理。

## 什么是技能？

技能（Skill）是一个独立的功能单元，包含：
- **触发器**：定义何时激活技能
- **指令**：AI 执行的具体任务
- **上下文**：技能运行所需的背景信息
- **输出规范**：期望的输出格式

## 技能文件结构

技能文件使用 Markdown 格式（`.md`），遵循 SKILL.md 规范：

```markdown
---
name: my-skill
description: 技能描述
version: 1.0.0
triggers:
  - pattern: "/my-command"
    type: command
  - pattern: "*.test.ts"
    type: file
autoActivate:
  filePatterns:
    - "**/*.spec.ts"
  contextKeywords:
    - "测试"
    - "单元测试"
---

# 技能名称

## 目标
描述技能要完成的目标

## 指令
1. 第一步操作
2. 第二步操作
3. ...

## 输出格式
期望的输出格式说明
```

## 技能类型

### 1. 命令触发技能

通过斜杠命令手动触发：

```markdown
---
name: code-review
triggers:
  - pattern: "/review"
    type: command
  - pattern: "/cr"
    type: command
---

# 代码审查技能

当用户输入 `/review` 或 `/cr` 时激活此技能...
```

**使用方式**：
```
/review src/utils/helper.ts
```

### 2. 文件触发技能

当操作特定文件时自动激活：

```markdown
---
name: test-helper
triggers:
  - pattern: "*.test.ts"
    type: file
  - pattern: "*.spec.js"
    type: file
---

# 测试辅助技能

当编辑测试文件时自动提供测试建议...
```

### 3. 上下文感知技能

根据对话上下文自动激活：

```markdown
---
name: performance-optimizer
autoActivate:
  contextKeywords:
    - "性能"
    - "优化"
    - "慢"
    - "卡顿"
  filePatterns:
    - "**/*.ts"
    - "**/*.js"
---

# 性能优化技能

当检测到性能相关讨论时自动激活...
```

### 4. 事件触发技能

响应特定事件：

```markdown
---
name: commit-helper
triggers:
  - pattern: "git:pre-commit"
    type: event
---

# 提交辅助技能

在 Git 提交前自动检查代码质量...
```

## 内置技能

CCJK 提供了丰富的内置技能：

| 技能 | 触发命令 | 描述 |
|------|---------|------|
| `code-review` | `/review`, `/cr` | 智能代码审查 |
| `refactor` | `/refactor` | 代码重构建议 |
| `test-gen` | `/test`, `/gen-test` | 自动生成测试 |
| `doc-gen` | `/doc`, `/document` | 生成文档 |
| `explain` | `/explain` | 代码解释 |
| `optimize` | `/optimize` | 性能优化 |
| `security` | `/security`, `/audit` | 安全审计 |
| `i18n` | `/i18n`, `/translate` | 国际化处理 |
| `api-design` | `/api` | API 设计建议 |
| `debug` | `/debug` | 调试辅助 |

## 创建自定义技能

### 步骤 1：创建技能文件

在项目的 `.claude/skills/` 目录下创建技能文件：

```bash
mkdir -p .claude/skills
touch .claude/skills/my-skill.md
```

### 步骤 2：编写技能内容

```markdown
---
name: vue-component-gen
description: Vue 组件生成器
version: 1.0.0
author: your-name
triggers:
  - pattern: "/vue"
    type: command
  - pattern: "/component"
    type: command
autoActivate:
  filePatterns:
    - "**/*.vue"
  contextKeywords:
    - "组件"
    - "Vue"
tags:
  - vue
  - frontend
  - component
---

# Vue 组件生成器

## 目标
根据用户描述生成符合最佳实践的 Vue 3 组件。

## 执行步骤

1. **分析需求**
   - 理解组件功能
   - 确定 props 和 events
   - 识别状态管理需求

2. **生成组件结构**
   - 使用 Composition API
   - 添加 TypeScript 类型
   - 实现响应式数据

3. **添加样式**
   - 使用 scoped CSS
   - 支持主题变量
   - 响应式设计

4. **生成测试**
   - 单元测试用例
   - 组件快照测试

## 输出格式

```vue
<script setup lang="ts">
// 组件逻辑
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 样式 */
</style>
```

## 示例

**输入**：创建一个用户卡片组件，显示头像、名称和简介

**输出**：完整的 UserCard.vue 组件文件
```

### 步骤 3：注册技能

技能会自动被 CCJK 发现和加载。你也可以在 `CLAUDE.md` 中显式引用：

```markdown
## 项目技能

- [Vue 组件生成器](.claude/skills/vue-component-gen.md)
```

## 技能热重载

CCJK 支持技能热重载，修改技能文件后无需重启：

### 自动热重载

默认情况下，CCJK 会监听技能文件变化并自动重载：

```bash
# 在 ccjk 配置中启用
{
  "skills": {
    "hotReload": true,
    "watchPaths": [".claude/skills/**/*.md"]
  }
}
```

### 手动重载

```bash
# 重载所有技能
/reload-skills

# 重载特定技能
/reload-skill vue-component-gen
```

## 技能组合

多个技能可以组合使用，形成工作流：

```markdown
---
name: full-feature
description: 完整功能开发流程
triggers:
  - pattern: "/feature"
    type: command
composedOf:
  - design-review
  - code-gen
  - test-gen
  - doc-gen
---

# 完整功能开发

此技能组合了设计审查、代码生成、测试生成和文档生成，
提供端到端的功能开发体验。
```

## 技能参数

技能可以接受参数：

```markdown
---
name: api-gen
triggers:
  - pattern: "/api"
    type: command
parameters:
  - name: style
    type: string
    default: "REST"
    options: ["REST", "GraphQL", "gRPC"]
  - name: auth
    type: boolean
    default: true
---

# API 生成器

根据参数生成不同风格的 API...
```

**使用方式**：
```
/api --style=GraphQL --auth=false
```

## 技能上下文

技能可以访问丰富的上下文信息：

```markdown
## 可用上下文变量

- `{{project.name}}` - 项目名称
- `{{project.type}}` - 项目类型
- `{{file.current}}` - 当前文件
- `{{file.language}}` - 文件语言
- `{{git.branch}}` - 当前分支
- `{{git.status}}` - Git 状态
- `{{user.input}}` - 用户输入
```

## 技能权限

控制技能的访问权限：

```markdown
---
name: deploy-helper
permissions:
  - file:read
  - file:write
  - shell:execute
  - network:access
requiresApproval: true
---
```

## 技能调试

### 启用调试模式

```bash
# 环境变量
export CCJK_SKILL_DEBUG=true

# 或在配置中
{
  "skills": {
    "debug": true,
    "logLevel": "verbose"
  }
}
```

### 查看技能日志

```bash
# 查看技能执行日志
tail -f ~/.ccjk/logs/skills.log

# 查看特定技能
grep "vue-component-gen" ~/.ccjk/logs/skills.log
```

## 技能市场

CCJK 提供技能市场，可以分享和下载社区技能：

```bash
# 搜索技能
ccjk skill search "react"

# 安装技能
ccjk skill install @ccjk/react-skills

# 发布技能
ccjk skill publish ./my-skill.md
```

## 最佳实践

### 1. 单一职责

每个技能应该专注于一个特定任务：

```markdown
# ✅ 好的做法
---
name: test-gen
description: 生成单元测试
---

# ❌ 不好的做法
---
name: everything
description: 生成测试、文档、部署脚本...
---
```

### 2. 清晰的触发条件

定义明确的触发条件，避免误触发：

```markdown
# ✅ 好的做法
triggers:
  - pattern: "/gen-test"
    type: command
autoActivate:
  filePatterns:
    - "**/*.test.ts"
  contextKeywords:
    - "生成测试"
    - "写测试"

# ❌ 不好的做法
autoActivate:
  contextKeywords:
    - "测试"  # 太宽泛
```

### 3. 提供示例

在技能中包含使用示例：

```markdown
## 示例

### 示例 1：基础用法
**输入**：`/gen-test src/utils/math.ts`
**输出**：生成 math.test.ts 文件

### 示例 2：带选项
**输入**：`/gen-test src/api/user.ts --coverage=80`
**输出**：生成覆盖率达 80% 的测试文件
```

### 4. 版本管理

为技能添加版本号，便于追踪变更：

```markdown
---
name: my-skill
version: 2.1.0
changelog:
  - version: 2.1.0
    date: 2024-01-10
    changes:
      - 添加新参数支持
      - 修复边界情况
  - version: 2.0.0
    date: 2024-01-01
    changes:
      - 重构技能逻辑
      - 破坏性变更：更新参数格式
---
```

## 相关资源

- [工作流系统](workflows.md) - 了解如何将技能组合成工作流
- [Agents 代理系统](../development/agents.md) - 了解 AI 代理
- [Hooks 系统](../advanced/hooks.md) - 了解事件钩子
- [配置管理](../advanced/configuration.md) - 技能配置选项

> 💡 **提示**：技能是 CCJK 最强大的扩展机制之一。通过创建自定义技能，你可以让 AI 完美适配你的开发工作流。

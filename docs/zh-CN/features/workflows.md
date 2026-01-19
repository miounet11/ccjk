---
title: 工作流系统
---

# 工作流系统

CCJK 的工作流系统提供结构化的开发流程，帮助你高效完成各类开发任务。通过预置工作流和自定义工作流，你可以标准化团队的开发实践。

## 什么是工作流？

工作流（Workflow）是一系列预定义的步骤和指令，用于指导 AI 完成特定类型的任务：

- 📋 **结构化流程**：将复杂任务分解为清晰的步骤
- 🔄 **可重复执行**：确保每次执行的一致性
- 🎯 **目标导向**：每个步骤都有明确的输出
- 🤝 **协作友好**：便于团队共享和改进

## 预置工作流

CCJK 内置多套经过验证的工作流：

| ID | 分类 | 默认 | 描述 | Claude Code | Codex |
| --- | --- | --- | --- | ----------- | ----- |
| `commonTools` | common | ✅ | 项目初始化与常用工具 | ✅ | ❌ |
| `sixStepsWorkflow` | sixStep | ✅ | 六阶段结构化开发工作流 | ✅ | ✅ |
| `featPlanUx` | plan | ✅ | 功能开发工作流（含规划与 UI/UX） | ✅ | ❌ |
| `gitWorkflow` | git | ✅ | Git 提交、回滚、清理管理 | ✅ | ✅ |
| `bmadWorkflow` | bmad | ✅ | BMad 敏捷流程 | ✅ | ❌ |

> ⚠️ **注意**：Codex 目前仅支持 `sixStepsWorkflow` 和 `gitWorkflow`。

### 六阶段工作流（Six Steps Workflow）

最核心的开发工作流，将任务分为六个阶段：

```
┌─────────┐   ┌─────────┐   ┌─────────┐
│ 1.研究  │ → │ 2.构思  │ → │ 3.计划  │
│Research │   │ Ideate  │   │  Plan   │
└─────────┘   └─────────┘   └─────────┘
     ↓             ↓             ↓
┌─────────┐   ┌─────────┐   ┌─────────┐
│ 4.执行  │ → │ 5.优化  │ → │ 6.评审  │
│ Execute │   │ Refine  │   │ Review  │
└─────────┘   └─────────┘   └─────────┘
```

**使用方法**：

```bash
# Claude Code
/ccjk:workflow 实现用户登录功能

# Codex
/prompts:workflow 实现用户登录功能
```

**各阶段说明**：

| 阶段 | 目标 | 输出 |
|------|------|------|
| **研究** | 理解需求和现有代码 | 需求分析文档 |
| **构思** | 探索解决方案 | 方案选项列表 |
| **计划** | 制定详细计划 | 任务分解清单 |
| **执行** | 实现功能 | 代码实现 |
| **优化** | 改进代码质量 | 优化后的代码 |
| **评审** | 检查和验证 | 审查报告 |

### 功能开发工作流（Feature Plan UX）

专为功能开发设计，集成规划和 UI/UX 设计：

```bash
# 启动功能开发
/ccjk:feat 添加购物车功能
```

**流程**：

1. **需求分析** - 理解功能需求
2. **UI/UX 设计** - 设计用户界面和交互
3. **技术规划** - 制定技术方案
4. **任务分解** - 拆分为可执行任务
5. **迭代开发** - 逐步实现功能

### Git 工作流

管理 Git 操作的工作流集合：

```bash
# 智能提交
/git-commit

# 回滚更改
/git-rollback

# 清理分支
/git-cleanup

# Worktree 管理
/git-worktree
```

**智能提交特性**：

- 自动分析更改内容
- 生成规范的提交信息
- 支持 Conventional Commits 格式
- 可选择性暂存文件

### BMad 敏捷工作流

基于 BMad 方法论的敏捷开发流程：

```bash
# 初始化 BMad 流程
/bmad-init

# 开始迭代
/bmad-sprint
```

## 安装与更新

### 自动安装

```bash
# 初始化时自动安装所有工作流
ccjk init

# 选择性安装
ccjk init --workflows sixStepsWorkflow,gitWorkflow
```

### 更新工作流

```bash
# 更新所有工作流
ccjk update

# 只更新工作流
ccjk update --workflows
```

### 安装位置

工作流文件安装到：

```
Claude Code: ~/.claude/prompts/workflows/
Codex:       ~/.codex/prompts/workflows/
```

## 命令格式

不同工具使用不同的命令前缀：

| 工具 | 命令前缀 | 示例 |
|------|---------|------|
| **Claude Code** | `/ccjk:` 或 `/` | `/ccjk:workflow`, `/git-commit` |
| **Codex** | `/prompts:` | `/prompts:workflow`, `/prompts:git-commit` |

## 自定义工作流

### 创建工作流

在 `.claude/workflows/` 目录下创建工作流文件：

```markdown
<!-- .claude/workflows/my-workflow.md -->
---
name: my-workflow
description: 我的自定义工作流
version: 1.0.0
triggers:
  - pattern: "/my-workflow"
    type: command
---

# 我的工作流

## 概述

这是一个自定义工作流，用于...

## 阶段

### 阶段 1: 准备

**目标**: 准备工作环境

**步骤**:
1. 检查项目结构
2. 确认依赖已安装
3. 验证配置文件

**输出**: 准备就绪确认

### 阶段 2: 执行

**目标**: 执行主要任务

**步骤**:
1. 执行任务 A
2. 执行任务 B
3. 验证结果

**输出**: 执行结果

### 阶段 3: 收尾

**目标**: 完成收尾工作

**步骤**:
1. 清理临时文件
2. 更新文档
3. 生成报告

**输出**: 最终报告
```

### YAML 格式工作流

```yaml
# .claude/workflows/deploy.yaml
name: deploy-workflow
description: 部署工作流
version: 1.0.0

triggers:
  - pattern: "/deploy"
    type: command
  - pattern: "部署到*"
    type: context

inputs:
  - name: environment
    type: choice
    options: [development, staging, production]
    required: true
  - name: version
    type: string
    default: latest

stages:
  - id: prepare
    name: 准备部署
    steps:
      - 检查代码状态
      - 运行测试
      - 构建项目
    output: 构建产物

  - id: deploy
    name: 执行部署
    steps:
      - 备份当前版本
      - 上传新版本
      - 更新配置
    output: 部署结果

  - id: verify
    name: 验证部署
    steps:
      - 健康检查
      - 功能验证
      - 性能测试
    output: 验证报告

  - id: notify
    name: 通知
    steps:
      - 发送部署通知
      - 更新部署日志
    output: 通知确认

rollback:
  enabled: true
  steps:
    - 恢复备份
    - 验证回滚
    - 通知团队
```

### 工作流模板

#### 代码审查工作流

```yaml
name: code-review
description: 代码审查工作流

stages:
  - id: overview
    name: 代码概览
    prompt: |
      请先整体浏览代码变更，了解：
      1. 变更的范围和目的
      2. 涉及的文件和模块
      3. 主要的修改点

  - id: quality
    name: 代码质量检查
    prompt: |
      检查代码质量：
      1. 命名是否清晰
      2. 逻辑是否简洁
      3. 是否有重复代码
      4. 错误处理是否完善

  - id: security
    name: 安全检查
    prompt: |
      检查安全问题：
      1. 输入验证
      2. 权限检查
      3. 敏感数据处理
      4. 常见漏洞

  - id: performance
    name: 性能检查
    prompt: |
      检查性能问题：
      1. 算法复杂度
      2. 数据库查询
      3. 内存使用
      4. 缓存策略

  - id: summary
    name: 总结报告
    prompt: |
      生成审查报告：
      1. 总体评价
      2. 发现的问题
      3. 改进建议
      4. 是否可以合并
```

#### Bug 修复工作流

```yaml
name: bug-fix
description: Bug 修复工作流

stages:
  - id: reproduce
    name: 复现问题
    prompt: |
      首先复现 Bug：
      1. 理解问题描述
      2. 确定复现步骤
      3. 验证问题存在

  - id: analyze
    name: 分析原因
    prompt: |
      分析 Bug 原因：
      1. 定位问题代码
      2. 理解错误逻辑
      3. 确定根本原因

  - id: fix
    name: 修复问题
    prompt: |
      实现修复：
      1. 编写修复代码
      2. 确保不引入新问题
      3. 添加必要注释

  - id: test
    name: 测试验证
    prompt: |
      验证修复：
      1. 验证问题已解决
      2. 运行相关测试
      3. 检查边界情况

  - id: document
    name: 文档更新
    prompt: |
      更新文档：
      1. 记录问题和解决方案
      2. 更新相关文档
      3. 添加测试用例说明
```

#### 重构工作流

```yaml
name: refactor
description: 代码重构工作流

stages:
  - id: assess
    name: 评估现状
    prompt: |
      评估当前代码：
      1. 识别问题区域
      2. 评估复杂度
      3. 确定重构范围

  - id: plan
    name: 制定计划
    prompt: |
      制定重构计划：
      1. 确定重构目标
      2. 设计新结构
      3. 规划重构步骤

  - id: prepare
    name: 准备工作
    prompt: |
      准备重构：
      1. 确保测试覆盖
      2. 创建分支
      3. 备份关键代码

  - id: refactor
    name: 执行重构
    prompt: |
      执行重构：
      1. 小步修改
      2. 频繁测试
      3. 保持功能不变

  - id: verify
    name: 验证结果
    prompt: |
      验证重构：
      1. 运行所有测试
      2. 检查性能
      3. 代码审查
```

## 工作流配置

### 全局配置

```json
// ~/.ccjk/config.json
{
  "workflows": {
    "defaultWorkflow": "sixStepsWorkflow",
    "autoSave": true,
    "progressFile": ".claude/progress.md",
    "templates": {
      "feature": ".claude/workflows/feature.yaml",
      "bugfix": ".claude/workflows/bugfix.yaml"
    }
  }
}
```

### 项目配置

```json
// .ccjk/config.json
{
  "workflows": {
    "enabled": ["sixStepsWorkflow", "gitWorkflow", "custom"],
    "disabled": ["bmadWorkflow"],
    "custom": [
      ".claude/workflows/deploy.yaml",
      ".claude/workflows/review.yaml"
    ]
  }
}
```

## 工作流进度管理

### 保存进度

工作流执行过程中可以保存进度：

```
用户: /ccjk:workflow 实现用户认证系统

AI: 开始六阶段工作流...

[阶段 1: 研究] ✅ 完成
[阶段 2: 构思] ✅ 完成
[阶段 3: 计划] 🔄 进行中...

用户: 保存进度

AI: 已保存进度到 .claude/progress/auth-system.md

进度摘要:
- 已完成: 研究、构思
- 进行中: 计划（60%）
- 待开始: 执行、优化、评审

下次可通过以下命令继续:
/ccjk:workflow --continue auth-system
```

### 恢复进度

```bash
# 继续之前的工作流
/ccjk:workflow --continue auth-system

# 查看所有保存的进度
/ccjk:workflow --list

# 清除进度
/ccjk:workflow --clear auth-system
```

## 代理集成

工作流可以自动调用相关代理：

```yaml
name: feature-with-agents
description: 带代理的功能开发工作流

agents:
  - planner      # 规划代理
  - architect    # 架构代理
  - developer    # 开发代理
  - reviewer     # 审查代理

stages:
  - id: plan
    name: 规划阶段
    agent: planner
    prompt: 分析需求并制定开发计划

  - id: design
    name: 设计阶段
    agent: architect
    prompt: 设计技术方案和架构

  - id: implement
    name: 实现阶段
    agent: developer
    prompt: 实现功能代码

  - id: review
    name: 审查阶段
    agent: reviewer
    prompt: 审查代码质量
```

## 使用建议

### 1. 选择合适的工作流

```
简单任务 → 直接对话
功能开发 → sixStepsWorkflow 或 featPlanUx
Bug 修复 → bug-fix 工作流
代码审查 → code-review 工作流
部署发布 → deploy 工作流
```

### 2. 保存关键进度

```
# 完成重要阶段后保存
/ccjk:workflow --save

# 生成进度摘要
/ccjk:workflow --summary
```

### 3. 跨对话衔接

```
# 在新对话中继续
/ccjk:workflow --continue <task-id>

# 或提供进度文件
请根据 .claude/progress/auth-system.md 继续开发
```

### 4. 与 Git 工作流配合

```
# 开发完成后提交
/git-commit

# 需要回滚时
/git-rollback
```

## 相关资源

- [Skills 技能系统](skills.md) - 工作流中使用的技能
- [Agents 代理系统](../advanced/agents.md) - 工作流中的代理
- [Subagent 编排](../advanced/subagent.md) - 复杂工作流编排
- [配置管理](../advanced/configuration.md) - 工作流配置

> 💡 **提示**：工作流是提高开发效率的利器。建议从预置工作流开始，熟悉后再创建适合团队的自定义工作流。

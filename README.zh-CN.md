<!--
  SEO Meta: CCJK - Claude Code 锦库 | 最强AI编程助手 | 智能技能系统 | 11+AI代理 | 热重载 | 零配置
  Description: CCJK 2.0 是最先进的AI编程工具包。具有智能技能热重载、11+AI代理、上下文感知、子代理编排和权限系统。AI辅助开发的未来。
  Keywords: claude code, AI编程助手, claude code扩展, AI开发工具, 代码自动化, AI代理, copilot替代品, cursor替代品, 免费AI编程, 开源AI工具
-->

<div align="center">

<img src="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png" alt="CCJK Logo" width="180" />

# CCJK - Claude Code 锦库

### 🚀 最先进的 AI 编程助手增强工具包

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![GitHub stars][stars-src]][stars-href]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/miounet11/ccjk/pulls)

**[English](README.md)** | **[简体中文](README.zh-CN.md)** | **[日本語](README.ja.md)** | **[한국어](README.ko.md)**

<br/>

## 🎉 v2.0.0 - 革命性技能系统！(2025年1月)

> **🧠 智能技能架构 - AI编程的未来**
>
> - 🔥 **智能技能热重载** - 编辑技能，即时生效，无需重启
> - 🤖 **子代理编排** - 并行/串行任务执行，多AI协作
> - 🛡️ **权限系统** - 细粒度访问控制，支持通配符模式
> - ⚡ **生命周期钩子** - before/after/error 完整控制流程
> - 🎯 **上下文感知激活** - 根据工作内容自动激活相关技能
> - 📦 **22+ 内置技能模板** - PR审查、安全审计、重构、文档生成等
>
> **⭐ 在 GitHub 上给我们 Star 支持项目！**

<br/>

> 💡 **一条命令，超级增强你的AI编程体验**
>
> ```bash
> npx ccjk
> ```

<br/>

[📖 快速入门](#-快速入门) · [🚀 革命性功能](#-革命性功能) · [💬 社区支持](#-社区与支持) · [🤝 参与贡献](#-参与贡献)

</div>

---

## 🎯 什么是 CCJK？

**CCJK (Claude Code 锦库)** 将 Claude Code 从简单的AI助手转变为**完整的AI开发强力引擎**。通过革命性的**智能技能系统**、11+专业AI代理和智能自动化，CCJK帮助你**10倍速**编写更好的代码。

<table>
<tr>
<td width="25%" align="center">
<h3>🧠 智能技能</h3>
<p>热重载、上下文感知、自动激活</p>
</td>
<td width="25%" align="center">
<h3>🤖 11+ AI代理</h3>
<p>安全、性能、测试、DevOps专家</p>
</td>
<td width="25%" align="center">
<h3>⚡ 零配置</h3>
<p>一条命令，即刻运行</p>
</td>
<td width="25%" align="center">
<h3>🆓 100% 免费</h3>
<p>开源项目，MIT许可证</p>
</td>
</tr>
</table>

---

## 🚀 快速入门

### 一键安装

```bash
# 推荐：交互式安装
npx ccjk

# 或全局安装
npm install -g ccjk
```

### 🇨🇳 中国用户安装（国内镜像）

```bash
# 方式一：使用 npmmirror 镜像（推荐，最快）
npm install -g ccjk --registry https://registry.npmmirror.com

# 方式二：使用 ghproxy 代理
curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | bash

# 方式三：使用 jsdelivr CDN
curl -fsSL https://cdn.jsdelivr.net/gh/anthropics/claude-code@main/install.sh | bash
```

### 开始使用

```bash
# 运行交互式菜单
ccjk

# 或直接启动增强版 Claude Code
claude
```

---

## ✨ 革命性功能

### 🧠 智能技能系统 2.0（全新！）

AI编程助手领域最先进的技能系统：

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 CCJK 智能技能架构                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   钩子      │  │   子代理    │  │       权限              │ │
│  │   系统      │  │   管理器    │  │       系统              │ │
│  │             │  │             │  │                         │ │
│  │ • before    │  │ • 并行执行  │  │ • 允许/拒绝规则         │ │
│  │ • after     │  │ • 串行执行  │  │ • 通配符匹配            │ │
│  │ • error     │  │ • 执行记录  │  │ • 文件/命令控制         │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                          │                                     │
│              ┌───────────▼───────────┐                         │
│              │     热重载引擎        │                         │
│              │                       │                         │
│              │  • 文件监控           │                         │
│              │  • 智能缓存           │                         │
│              │  • 自动发现           │                         │
│              │  • 即时激活           │                         │
│              └───────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 🔥 热重载 - 编辑技能，即时生效

```yaml
# 编辑任何技能文件，更改立即生效！
# 无需重启，无需配置。

# 示例: ~/.ccjk/skills/my-skill.md
---
name: my-custom-skill
trigger: /my-skill
auto_activate:
  file_patterns: ["*.ts", "*.tsx"]
  keywords: ["重构", "优化"]
hooks:
  before: validate-context
  after: generate-report
---

你的技能指令写在这里...
```

#### 🤖 子代理编排

并行或串行运行多个AI代理，实现复杂任务自动化：

```yaml
subagents:
  - name: security-scan
    model: sonnet
    task: "扫描安全漏洞"
  - name: performance-check
    model: haiku
    task: "分析性能问题"
    depends_on: security-scan  # 串行执行，等待安全扫描完成
```

#### 🛡️ 权限系统

细粒度访问控制，保护敏感文件：

```yaml
permissions:
  allow:
    - "src/**/*.ts"           # 允许所有 TypeScript 文件
    - "!src/**/*.test.ts"     # 排除测试文件
  deny:
    - ".env*"                 # 永不触碰环境变量文件
    - "node_modules/**"       # 跳过 node_modules
  commands:
    allow: ["npm test", "npm run build"]
    deny: ["rm -rf", "sudo *"]
```

### 📦 22+ 内置技能模板

| 分类 | 技能 | 描述 |
|------|------|------|
| **代码质量** | `pr-review`, `code-review`, `refactoring` | 全面代码分析与审查 |
| **安全** | `security-audit`, `vulnerability-scan` | OWASP、CVE漏洞检测 |
| **性能** | `performance-profiling`, `optimization` | 速度和内存分析优化 |
| **文档** | `documentation-gen`, `api-docs` | 自动生成高质量文档 |
| **测试** | `tdd-workflow`, `test-generation` | 测试驱动开发支持 |
| **DevOps** | `git-commit`, `ci-cd-setup` | 自动化工作流配置 |
| **迁移** | `migration-assistant`, `upgrade-helper` | 框架版本迁移助手 |
| **规划** | `writing-plans`, `executing-plans` | 项目规划与执行 |

### 🤖 AI 代理军团

你的私人AI开发团队，24/7全天候服务：

| 代理 | 专长 | 使用场景 |
|------|------|----------|
| 🛡️ **安全专家** | 漏洞检测、OWASP | "审查这段认证代码的安全性" |
| ⚡ **性能专家** | 速度优化、内存 | "为什么我的应用这么慢？" |
| 🧪 **测试专家** | 单元测试、覆盖率 | "为这个函数添加测试" |
| 🚀 **DevOps专家** | CI/CD、Docker、K8s | "创建 GitHub Actions 工作流" |
| 📝 **代码审查员** | 最佳实践、代码质量 | "审查这个 PR" |
| 🏗️ **API架构师** | REST、GraphQL设计 | "设计用户管理 API" |
| 💾 **数据库专家** | 查询优化、索引 | "优化这个 SQL 查询" |
| 🎨 **前端架构师** | React、Vue、无障碍 | "重构这个组件" |
| ⚙️ **后端架构师** | 微服务、事件驱动 | "设计可扩展的后端" |
| 📚 **文档专家** | API文档、README | "为这个代码库写文档" |
| 🔄 **重构专家** | 整洁代码、SOLID | "应用设计模式重构" |

#### 📘 如何使用 AI 代理

**方法一：直接 @ 调用代理**

在 Claude Code 对话中，使用 `@代理名` 直接调用：

```bash
# 调用规划师代理进行任务分解
> @planner 我需要为应用添加用户认证功能

# 调用代码审查代理
> @ccjk-code-reviewer 请帮我审查 src/auth.ts 这个文件

# 调用安全专家
> @ccjk-security-expert 检查这个项目的安全漏洞

# 调用性能专家
> @ccjk-performance-expert 分析这个函数的性能问题
```

**方法二：通过斜杠命令自动触发**

某些命令会自动调用相关代理：

```bash
# /feat 命令自动调用 planner 代理进行任务规划
> /feat 添加购物车功能

# /init-project 命令调用 init-architect 代理
> /init-project

# /workflow 命令启动六步开发流程
> /workflow
```

**方法三：代理协作（自动委派）**

代理之间可以自动协作，例如代码审查员发现安全问题时会自动委派给安全专家：

```yaml
# 代理定义中的委派规则
## DELEGATIONS
- Security issues → ccjk-security-expert
- Performance issues → ccjk-performance-expert
- Missing tests → ccjk-testing-specialist
```

#### 🎯 完整代理列表

| 代理名称 | 调用方式 | 专业领域 |
|----------|----------|----------|
| `planner` | `@planner` | 📋 任务规划和分解 |
| `ui-ux-designer` | `@ui-ux-designer` | 🎨 UI/UX 设计 |
| `init-architect` | `@init-architect` | 🏗️ 项目初始化架构 |
| `ccjk-code-reviewer` | `@ccjk-code-reviewer` | 🔍 代码审查 |
| `ccjk-security-expert` | `@ccjk-security-expert` | 🔒 安全审计 |
| `ccjk-performance-expert` | `@ccjk-performance-expert` | ⚡ 性能优化 |
| `ccjk-frontend-architect` | `@ccjk-frontend-architect` | 🖥️ 前端架构 |
| `ccjk-backend-architect` | `@ccjk-backend-architect` | ⚙️ 后端架构 |
| `ccjk-database-expert` | `@ccjk-database-expert` | 🗄️ 数据库设计 |
| `ccjk-devops-expert` | `@ccjk-devops-expert` | 🚀 DevOps/CI/CD |
| `ccjk-testing-specialist` | `@ccjk-testing-specialist` | 🧪 测试专家 |
| `ccjk-refactoring-expert` | `@ccjk-refactoring-expert` | ♻️ 代码重构 |
| `ccjk-documentation-expert` | `@ccjk-documentation-expert` | 📚 文档生成 |
| `ccjk-api-architect` | `@ccjk-api-architect` | 🔌 API 设计 |
| `ccjk-i18n-specialist` | `@ccjk-i18n-specialist` | 🌍 国际化 |

#### 💡 代理使用示例

```bash
# 示例 1：复杂功能规划
> @planner 我需要为电商应用添加以下功能：
  1. 用户购物车
  2. 订单管理
  3. 支付集成
  请帮我分解任务并制定实施计划

# 示例 2：代码审查
> @ccjk-code-reviewer 请审查 src/services/ 目录下的所有服务代码，
  重点关注错误处理和代码复用

# 示例 3：安全审计
> @ccjk-security-expert 对这个 Node.js 后端项目进行全面安全审计，
  特别关注 SQL 注入和 XSS 漏洞

# 示例 4：性能优化
> @ccjk-performance-expert 分析 src/utils/data-processor.ts 的性能，
  这个函数处理大数据集时很慢
```

### 🪝 Hooks 钩子系统

Hooks 是 CCJK 的扩展机制，允许你在特定事件发生时自动执行自定义逻辑。

#### 🎯 Hook 类型

| 类型 | 触发时机 | 典型用途 |
|------|----------|----------|
| `pre-tool-use` | 工具执行**前** | 输入验证、限流、添加默认值 |
| `post-tool-use` | 工具执行**后** | 日志记录、缓存结果、资源清理 |
| `skill-activated` | 技能激活时 | 权限检查、环境初始化 |
| `skill-completed` | 技能完成时 | 清理资源、发送通知 |
| `workflow-started` | 工作流开始 | 环境设置、参数验证 |
| `workflow-completed` | 工作流结束 | 生成报告、清理临时文件 |
| `on-error` | 发生错误时 | 错误追踪、自动恢复 |
| `config-changed` | 配置变更时 | 重新加载、验证配置 |

#### 📝 创建自定义 Hook

在项目的 `.claude/hooks/` 目录下创建 TypeScript 文件：

```typescript
// .claude/hooks/my-hooks.ts
import { registry } from 'ccjk/hooks'

// 示例 1：文件修改前自动备份
registry.register({
  id: 'auto-backup',
  name: '自动备份',
  type: 'pre-tool-use',
  priority: 9,  // 优先级 1-10，数字越大越先执行
  condition: {
    tools: ['Edit', 'Write']  // 只在编辑/写入文件时触发
  },
  action: {
    execute: async (context) => {
      console.log(`📦 备份文件: ${context.path}`)
      await backupFile(context.path)
      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true  // 继续执行后续 hooks
      }
    },
    timeout: 5000  // 5秒超时
  }
})

// 示例 2：操作完成后记录日志
registry.register({
  id: 'audit-log',
  name: '审计日志',
  type: 'post-tool-use',
  priority: 1,
  action: {
    execute: async (context) => {
      await logToFile({
        timestamp: new Date().toISOString(),
        tool: context.tool,
        path: context.path,
        success: !context.error
      })
      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true
      }
    }
  }
})

// 示例 3：性能监控
registry.register({
  id: 'perf-monitor',
  name: '性能监控',
  type: 'post-tool-use',
  action: {
    execute: async (context) => {
      const duration = context.result?.durationMs || 0
      if (duration > 5000) {
        console.warn(`⚠️ 操作耗时过长: ${context.tool} - ${duration}ms`)
      }
      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true
      }
    }
  }
})
```

#### 🔧 实用 Hook 模板

**限流 Hook（防止 API 过载）**

```typescript
const requests = new Map<string, number[]>()
const MAX_PER_MINUTE = 60

registry.register({
  id: 'rate-limit',
  name: '请求限流',
  type: 'pre-tool-use',
  priority: 10,  // 最高优先级
  action: {
    execute: async (context) => {
      const tool = context.tool || 'unknown'
      const now = Date.now()
      let reqs = requests.get(tool) || []
      reqs = reqs.filter(t => t > now - 60000)  // 保留最近1分钟

      if (reqs.length >= MAX_PER_MINUTE) {
        return {
          success: false,
          status: 'failed',
          error: `限流：${tool} 每分钟最多 ${MAX_PER_MINUTE} 次`,
          continueChain: false  // 阻止执行
        }
      }

      reqs.push(now)
      requests.set(tool, reqs)
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    }
  }
})
```

**缓存 Hook（避免重复计算）**

```typescript
const cache = new Map<string, any>()

// 执行前检查缓存
registry.register({
  id: 'cache-check',
  name: '缓存检查',
  type: 'pre-tool-use',
  priority: 8,
  action: {
    execute: async (context) => {
      const key = `${context.tool}:${JSON.stringify(context.args)}`
      const cached = cache.get(key)
      if (cached) {
        return {
          success: true,
          status: 'success',
          output: cached,
          continueChain: false  // 跳过实际执行，直接返回缓存
        }
      }
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    }
  }
})

// 执行后存入缓存
registry.register({
  id: 'cache-store',
  name: '缓存存储',
  type: 'post-tool-use',
  action: {
    execute: async (context) => {
      if (context.result && !context.error) {
        const key = `${context.tool}:${JSON.stringify(context.args)}`
        cache.set(key, context.result)
      }
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    }
  }
})
```

**错误通知 Hook**

```typescript
registry.register({
  id: 'error-notify',
  name: '错误通知',
  type: 'on-error',
  action: {
    execute: async (context) => {
      // 发送错误通知（如 Slack、邮件等）
      await sendNotification({
        title: '⚠️ CCJK 错误',
        message: context.error?.message,
        stack: context.error?.stack
      })
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    },
    continueOnError: true  // 即使通知失败也不影响主流程
  }
})
```

#### 🎚️ 优先级指南

| 优先级 | 用途 | 示例 |
|--------|------|------|
| 10 | 关键验证 | 安全检查、权限验证 |
| 9 | 限流控制 | 请求频率限制 |
| 8 | 缓存操作 | 缓存检查/存储 |
| 7 | 业务验证 | 输入格式验证 |
| 6 | 数据转换 | 格式转换、标准化 |
| 5 | 默认值 | 添加默认参数 |
| 4 | 监控 | 性能追踪 |
| 3 | 缓存管理 | 缓存清理 |
| 2 | 日志 | 调试输出 |
| 1 | 清理 | 资源释放 |

#### 📊 Hook 管理 API

```typescript
import { initializeHooksSystem } from 'ccjk/hooks'

const { registry, executor } = initializeHooksSystem()

// 注册 Hook
registry.register(myHook)

// 注销 Hook
registry.unregister('hook-id')

// 启用/禁用 Hook
registry.setEnabled('hook-id', false)

// 获取所有 Hooks
const hooks = registry.getAllHooks()

// 按类型获取
const preHooks = registry.getHooksForType('pre-tool-use')

// 获取统计信息
const stats = registry.getStatistics()
// { totalHooks: 10, enabledHooks: 8, successRate: 96.67, ... }

// 手动执行 Hooks
await executor.executePreToolUse('grep', '/path', { pattern: 'TODO' })
await executor.executePostToolUse('grep', '/path', result, error)
```

### 🔍 审查引擎 - AI代码审计器

全自动AI代码审计器，无需预定义规则：

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 审查引擎 (ShenCha)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣  扫描    → AI智能发现问题（无需预定义规则）              │
│  2️⃣  分析    → 深度理解上下文和影响范围                     │
│  3️⃣  修复    → 自动生成并应用修复方案                       │
│  4️⃣  验证    → 确认修复正确工作                             │
│                                                             │
│  ✅ 72小时周期持续运行                                       │
│  ✅ 生成全面的审计报告                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🎤 访谈驱动开发

> **"先访谈，再规格，最后编码。"** - 避免做错方向

```bash
ccjk interview          # 智能模式选择
ccjk interview --quick  # 10个核心问题（快速）
ccjk interview --deep   # 40+全面问题（深度）
```

### 🌐 13+ API 提供商

一键连接任意AI提供商：

| 提供商 | 类型 | 免费额度 |
|--------|------|:--------:|
| **Anthropic** | 官方 | - |
| **302.AI** | 国内服务 | ✅ |
| **DeepSeek** | 高性价比 | ✅ |
| **SiliconFlow** | 国内服务 | ✅ |
| **通义千问** | 阿里云 | ✅ |
| **Kimi** | 月之暗面 | ✅ |
| **智谱GLM** | 清华系 | ✅ |
| **Ollama** | 本地部署 | ✅ |
| OpenRouter, Groq, Gemini... | 国际服务 | 部分免费 |

---

## 📊 为什么 CCJK 是第一名

| 功能 | CCJK 2.0 | Cursor | Copilot | 其他工具 |
|------|:--------:|:------:|:-------:|:--------:|
| **智能技能** | ✅ 热重载 | ❌ | ❌ | ❌ |
| **AI代理** | **11+** | 2 | 1 | 0-2 |
| **子代理系统** | ✅ | ❌ | ❌ | ❌ |
| **权限控制** | ✅ | ❌ | ❌ | ❌ |
| **生命周期钩子** | ✅ | ❌ | ❌ | ❌ |
| **多提供商** | **13+** | 1 | 1 | 1-3 |
| **上下文感知** | ✅ | 部分 | ❌ | ❌ |
| **零配置** | ✅ | ❌ | ❌ | ❌ |
| **开源** | ✅ | ❌ | ❌ | 部分 |
| **免费** | ✅ | ❌ | ❌ | 部分 |

---

## 📖 命令速查表

### 基础命令

```bash
npx ccjk              # 交互式设置菜单
ccjk setup            # 引导式入门向导
ccjk doctor           # 环境健康检查
ccjk upgrade          # 更新所有组件
```

### 技能管理

```bash
ccjk skills list                    # 列出所有技能
ccjk skills create my-skill         # 创建新技能
ccjk skills enable <skill>          # 启用技能
ccjk skills create-batch --lang ts  # 创建 TypeScript 技能包
```

### API 配置

```bash
ccjk api wizard       # 交互式 API 设置向导
ccjk api list         # 显示所有提供商
ccjk api test         # 测试 API 连接
```

---

## 🌍 多语言支持

```bash
ccjk init --lang en      # English
ccjk init --lang zh-CN   # 简体中文
ccjk init --lang ja      # 日本語
ccjk init --lang ko      # 한국어
```

---

## 💻 平台支持

| 平台 | 状态 |
|------|:----:|
| **macOS** | ✅ Intel & Apple Silicon |
| **Linux** | ✅ 所有主流发行版 |
| **Windows** | ✅ Win10/11, WSL2 |
| **Termux** | ✅ Android 终端 |

---

## 💬 社区与支持

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/GitHub-讨论区-333?style=for-the-badge&logo=github)](https://github.com/miounet11/ccjk/discussions)
[![Discord](https://img.shields.io/badge/Discord-加入服务器-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![微信](https://img.shields.io/badge/微信-扫码加群-07C160?style=for-the-badge&logo=wechat)](https://github.com/miounet11/ccjk)

</div>

- 🐛 **Bug报告**: [GitHub Issues](https://github.com/miounet11/ccjk/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/miounet11/ccjk/discussions)

---

## 🤝 参与贡献

```bash
git clone https://github.com/miounet11/ccjk.git
cd ccjk
pnpm install
pnpm dev
```

详情请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📄 许可证

MIT © [CCJK Team](https://github.com/miounet11/ccjk)

---

<div align="center">

## ⭐ 在 GitHub 上给我们 Star

如果 CCJK 帮助你更好地编程，请给我们一个 Star！

<br/>

**由开发者为开发者用 ❤️ 打造**

<br/>

### 🔍 SEO 关键词

`claude-code` `AI编程助手` `claude-code扩展` `AI开发工具` `代码自动化` `智能技能` `热重载` `子代理` `安全审计` `性能优化` `TypeScript` `Python` `JavaScript` `React` `Vue` `Node.js` `Docker` `Kubernetes` `GitHub Actions` `CI/CD` `代码质量` `最佳实践` `整洁代码` `copilot替代品` `cursor替代品` `windsurf替代品` `免费AI编程` `开源AI` `代码审查AI` `AI结对编程` `智能编码` `开发者生产力` `编程助手` `2025年AI工具` `302AI` `DeepSeek` `通义千问` `智谱AI` `Kimi` `硅基流动`

</div>

<!-- Badge Links -->
[npm-version-src]: https://img.shields.io/npm/v/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/ccjk
[npm-downloads-src]: https://img.shields.io/npm/dm/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/ccjk
[license-src]: https://img.shields.io/github/license/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/miounet11/ccjk/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[stars-href]: https://github.com/miounet11/ccjk/stargazers

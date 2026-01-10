<!--
  SEO Meta: CCJK - Claude Code JinKu | #1 AI Coding Assistant | Smart Skills System | 11+ AI Agents | Hot Reload | Zero Config
  Description: CCJK 2.0 is the most advanced AI coding toolkit. Features Smart Skills with hot-reload, 11+ AI agents,
  intelligent context awareness, subagent orchestration, and permission system. The future of AI-assisted development.
  Keywords: claude code, ai coding assistant, claude code extension, ai developer tools, code automation,
  ai agents, copilot alternative, cursor alternative, free ai coding, open source ai tools
-->

<div align="center">

<!-- Logo & Badges - Optimized for GitHub Social Preview -->
<img src="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png" alt="CCJK Logo" width="180" />

# CCJK - Claude Code JinKu

### 🚀 The Most Advanced AI Coding Assistant Enhancement Toolkit

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![GitHub stars][stars-src]][stars-href]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/anthropics/claude-code/pulls)

**[English](README.md)** | **[简体中文](README.zh-CN.md)** | **[日本語](README.ja.md)** | **[한국어](README.ko.md)**

<br/>

## 🎉 v2.0.0 - Revolutionary Skill System! (January 2025)

> **🧠 Intelligent Skills Architecture - The Future of AI Coding**
>
> - 🔥 **Smart Skills Hot-Reload** - Edit skills, instant activation, zero restart
> - 🤖 **Subagent Orchestration** - Parallel/sequential task execution with AI agents
> - 🛡️ **Permission System** - Fine-grained access control with wildcard patterns
> - ⚡ **Lifecycle Hooks** - before/after/error callbacks for complete control
> - 🎯 **Context-Aware Activation** - Skills auto-activate based on your work
> - 📦 **22+ Built-in Skill Templates** - PR Review, Security Audit, Refactoring, and more
>
> **⭐ Star us on GitHub to support the project!**

<br/>

> 💡 **One command to supercharge your AI coding experience**
>
> ```bash
> npx ccjk
> ```

<br/>

[📖 Documentation](#-quick-start) · [🚀 Features](#-revolutionary-features) · [💬 Community](#-community--support) · [🤝 Contributing](#-contributing)

</div>

---

## 🎯 What is CCJK?

**CCJK (Claude Code JinKu)** transforms Claude Code from a simple AI assistant into a **complete AI development powerhouse**. With our revolutionary **Smart Skills System**, 11+ specialized AI agents, and intelligent automation, CCJK helps you write better code 10x faster.

<table>
<tr>
<td width="25%" align="center">
<h3>🧠 Smart Skills</h3>
<p>Hot-reload, context-aware, auto-activation</p>
</td>
<td width="25%" align="center">
<h3>🤖 11+ AI Agents</h3>
<p>Security, Performance, Testing, DevOps</p>
</td>
<td width="25%" align="center">
<h3>⚡ Zero Config</h3>
<p>One command. Works instantly.</p>
</td>
<td width="25%" align="center">
<h3>🆓 100% Free</h3>
<p>Open source. MIT licensed.</p>
</td>
</tr>
</table>

---

## 🚀 Quick Start

### One-Click Installation

```bash
# Recommended: Interactive setup
npx ccjk

# Or install globally
npm install -g ccjk
```

### 🇨🇳 中国用户安装 (China Mirror)

```bash
# 使用 npmmirror 镜像
npm install -g ccjk --registry https://registry.npmmirror.com

# 或使用 ghproxy
curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | bash
```

### Start Using

```bash
# Run the interactive menu
ccjk

# Or directly start Claude Code with enhancements
claude
```

---

## ✨ Revolutionary Features

### 🧠 Smart Skills System 2.0 (NEW!)

The most advanced skill system for AI coding assistants:

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 CCJK Smart Skills Architecture                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Hooks     │  │  Subagent   │  │     Permissions         │ │
│  │   System    │  │  Manager    │  │       System            │ │
│  │             │  │             │  │                         │ │
│  │ • before    │  │ • parallel  │  │ • allow/deny rules      │ │
│  │ • after     │  │ • sequential│  │ • wildcard patterns     │ │
│  │ • error     │  │ • transcript│  │ • file/command control  │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                          │                                     │
│              ┌───────────▼───────────┐                         │
│              │   Hot Reload Engine   │                         │
│              │                       │                         │
│              │  • File watching      │                         │
│              │  • Smart caching      │                         │
│              │  • Auto discovery     │                         │
│              │  • Instant activation │                         │
│              └───────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 🔥 Hot Reload - Edit Skills, Instant Effect

```yaml
# Edit any skill file, changes apply immediately!
# No restart needed. No configuration required.

# Example: ~/.ccjk/skills/my-skill.md
---
name: my-custom-skill
trigger: /my-skill
auto_activate:
  file_patterns: ["*.ts", "*.tsx"]
  keywords: ["refactor", "optimize"]
hooks:
  before: validate-context
  after: generate-report
---

Your skill instructions here...
```

#### 🤖 Subagent Orchestration

Run multiple AI agents in parallel or sequence:

```yaml
subagents:
  - name: security-scan
    model: sonnet
    task: "Scan for vulnerabilities"
  - name: performance-check
    model: haiku
    task: "Analyze performance"
    depends_on: security-scan  # Sequential execution
```

#### 🛡️ Permission System

Fine-grained access control:

```yaml
permissions:
  allow:
    - "src/**/*.ts"           # Allow all TypeScript files
    - "!src/**/*.test.ts"     # Except test files
  deny:
    - ".env*"                 # Never touch env files
    - "node_modules/**"       # Skip node_modules
  commands:
    allow: ["npm test", "npm run build"]
    deny: ["rm -rf", "sudo *"]
```

### 📦 22+ Built-in Skill Templates

| Category | Skills | Description |
|----------|--------|-------------|
| **Code Quality** | `pr-review`, `code-review`, `refactoring` | Comprehensive code analysis |
| **Security** | `security-audit`, `vulnerability-scan` | OWASP, CVE detection |
| **Performance** | `performance-profiling`, `optimization` | Speed & memory analysis |
| **Documentation** | `documentation-gen`, `api-docs` | Auto-generate docs |
| **Testing** | `tdd-workflow`, `test-generation` | Test-driven development |
| **DevOps** | `git-commit`, `ci-cd-setup` | Automation workflows |
| **Migration** | `migration-assistant`, `upgrade-helper` | Framework migrations |
| **Planning** | `writing-plans`, `executing-plans` | Project planning |

### 🤖 AI Agent Army

Your personal AI development team, available 24/7:

| Agent | Specialty | Use Case |
|-------|-----------|----------|
| 🛡️ **Security Expert** | Vulnerabilities, OWASP | "Review auth code for security" |
| ⚡ **Performance Expert** | Speed, Memory | "Why is my app slow?" |
| 🧪 **Testing Specialist** | Unit tests, Coverage | "Add tests for this function" |
| 🚀 **DevOps Expert** | CI/CD, Docker, K8s | "Create GitHub Actions workflow" |
| 📝 **Code Reviewer** | Best practices | "Review this PR" |
| 🏗️ **API Architect** | REST, GraphQL | "Design user management API" |
| 💾 **Database Expert** | Query optimization | "Optimize this SQL query" |
| 🎨 **Frontend Architect** | React, Vue, A11y | "Refactor this component" |
| ⚙️ **Backend Architect** | Microservices | "Design scalable backend" |
| 📚 **Documentation Expert** | API docs, READMEs | "Document this codebase" |
| 🔄 **Refactoring Expert** | Clean code, SOLID | "Apply design patterns" |

#### 📘 How to Use AI Agents

**Method 1: Direct @ Mention**

In Claude Code conversation, use `@agent-name` to invoke directly:

```bash
# Call planner agent for task breakdown
> @planner I need to add user authentication to my app

# Call code reviewer agent
> @ccjk-code-reviewer Please review src/auth.ts

# Call security expert
> @ccjk-security-expert Check this project for security vulnerabilities

# Call performance expert
> @ccjk-performance-expert Analyze performance issues in this function
```

**Method 2: Auto-trigger via Slash Commands**

Some commands automatically invoke related agents:

```bash
# /feat command auto-invokes planner agent
> /feat Add shopping cart feature

# /init-project invokes init-architect agent
> /init-project

# /workflow starts six-step development flow
> /workflow
```

**Method 3: Agent Collaboration (Auto-delegation)**

Agents can automatically collaborate. For example, code reviewer delegates security issues to security expert:

```yaml
# Delegation rules in agent definition
## DELEGATIONS
- Security issues → ccjk-security-expert
- Performance issues → ccjk-performance-expert
- Missing tests → ccjk-testing-specialist
```

#### 🎯 Complete Agent List

| Agent Name | Invocation | Specialty |
|------------|------------|-----------|
| `planner` | `@planner` | 📋 Task planning & breakdown |
| `ui-ux-designer` | `@ui-ux-designer` | 🎨 UI/UX design |
| `init-architect` | `@init-architect` | 🏗️ Project initialization |
| `ccjk-code-reviewer` | `@ccjk-code-reviewer` | 🔍 Code review |
| `ccjk-security-expert` | `@ccjk-security-expert` | 🔒 Security audit |
| `ccjk-performance-expert` | `@ccjk-performance-expert` | ⚡ Performance optimization |
| `ccjk-frontend-architect` | `@ccjk-frontend-architect` | 🖥️ Frontend architecture |
| `ccjk-backend-architect` | `@ccjk-backend-architect` | ⚙️ Backend architecture |
| `ccjk-database-expert` | `@ccjk-database-expert` | 🗄️ Database design |
| `ccjk-devops-expert` | `@ccjk-devops-expert` | 🚀 DevOps/CI/CD |
| `ccjk-testing-specialist` | `@ccjk-testing-specialist` | 🧪 Testing expert |
| `ccjk-refactoring-expert` | `@ccjk-refactoring-expert` | ♻️ Code refactoring |
| `ccjk-documentation-expert` | `@ccjk-documentation-expert` | 📚 Documentation |
| `ccjk-api-architect` | `@ccjk-api-architect` | 🔌 API design |
| `ccjk-i18n-specialist` | `@ccjk-i18n-specialist` | 🌍 Internationalization |

#### 💡 Agent Usage Examples

```bash
# Example 1: Complex feature planning
> @planner I need to add these features to my e-commerce app:
  1. Shopping cart
  2. Order management
  3. Payment integration
  Please break down tasks and create implementation plan

# Example 2: Code review
> @ccjk-code-reviewer Review all service code in src/services/,
  focus on error handling and code reuse

# Example 3: Security audit
> @ccjk-security-expert Perform full security audit on this Node.js backend,
  especially check for SQL injection and XSS vulnerabilities

# Example 4: Performance optimization
> @ccjk-performance-expert Analyze src/utils/data-processor.ts performance,
  this function is slow when processing large datasets
```

### 🪝 Hooks System

Hooks are CCJK's extension mechanism, allowing you to automatically execute custom logic when specific events occur.

#### 🎯 Hook Types

| Type | Trigger | Typical Use |
|------|---------|-------------|
| `pre-tool-use` | **Before** tool execution | Input validation, rate limiting, defaults |
| `post-tool-use` | **After** tool execution | Logging, caching, cleanup |
| `skill-activated` | When skill activates | Permission checks, initialization |
| `skill-completed` | When skill completes | Cleanup, notifications |
| `workflow-started` | Workflow begins | Environment setup, validation |
| `workflow-completed` | Workflow ends | Report generation, cleanup |
| `on-error` | Error occurs | Error tracking, recovery |
| `config-changed` | Config changes | Reload, validate config |

#### 📝 Creating Custom Hooks

Create TypeScript files in your project's `.claude/hooks/` directory:

```typescript
// .claude/hooks/my-hooks.ts
import { registry } from 'ccjk/hooks'

// Example 1: Auto-backup before file modification
registry.register({
  id: 'auto-backup',
  name: 'Auto Backup',
  type: 'pre-tool-use',
  priority: 9,  // Priority 1-10, higher runs first
  condition: {
    tools: ['Edit', 'Write']  // Only trigger on edit/write
  },
  action: {
    execute: async (context) => {
      console.log(`📦 Backing up: ${context.path}`)
      await backupFile(context.path)
      return {
        success: true,
        status: 'success',
        durationMs: 0,
        continueChain: true  // Continue to next hooks
      }
    },
    timeout: 5000  // 5 second timeout
  }
})

// Example 2: Audit logging after operations
registry.register({
  id: 'audit-log',
  name: 'Audit Logger',
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

// Example 3: Performance monitoring
registry.register({
  id: 'perf-monitor',
  name: 'Performance Monitor',
  type: 'post-tool-use',
  action: {
    execute: async (context) => {
      const duration = context.result?.durationMs || 0
      if (duration > 5000) {
        console.warn(`⚠️ Slow operation: ${context.tool} - ${duration}ms`)
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

#### 🔧 Useful Hook Templates

**Rate Limiting Hook (Prevent API Overload)**

```typescript
const requests = new Map<string, number[]>()
const MAX_PER_MINUTE = 60

registry.register({
  id: 'rate-limit',
  name: 'Rate Limiter',
  type: 'pre-tool-use',
  priority: 10,  // Highest priority
  action: {
    execute: async (context) => {
      const tool = context.tool || 'unknown'
      const now = Date.now()
      let reqs = requests.get(tool) || []
      reqs = reqs.filter(t => t > now - 60000)  // Keep last minute

      if (reqs.length >= MAX_PER_MINUTE) {
        return {
          success: false,
          status: 'failed',
          error: `Rate limit: ${tool} max ${MAX_PER_MINUTE}/min`,
          continueChain: false  // Block execution
        }
      }

      reqs.push(now)
      requests.set(tool, reqs)
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    }
  }
})
```

**Caching Hook (Avoid Redundant Computation)**

```typescript
const cache = new Map<string, any>()

// Check cache before execution
registry.register({
  id: 'cache-check',
  name: 'Cache Check',
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
          continueChain: false  // Skip execution, return cached
        }
      }
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    }
  }
})

// Store in cache after execution
registry.register({
  id: 'cache-store',
  name: 'Cache Store',
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

**Error Notification Hook**

```typescript
registry.register({
  id: 'error-notify',
  name: 'Error Notifier',
  type: 'on-error',
  action: {
    execute: async (context) => {
      // Send notification (Slack, email, etc.)
      await sendNotification({
        title: '⚠️ CCJK Error',
        message: context.error?.message,
        stack: context.error?.stack
      })
      return { success: true, status: 'success', durationMs: 0, continueChain: true }
    },
    continueOnError: true  // Don't affect main flow if notification fails
  }
})
```

#### 🎚️ Priority Guidelines

| Priority | Use For | Examples |
|----------|---------|----------|
| 10 | Critical validation | Security checks, permissions |
| 9 | Rate limiting | Request throttling |
| 8 | Caching | Cache check/store |
| 7 | Business validation | Input format validation |
| 6 | Data transformation | Format conversion |
| 5 | Default values | Add default parameters |
| 4 | Monitoring | Performance tracking |
| 3 | Cache management | Cache cleanup |
| 2 | Logging | Debug output |
| 1 | Cleanup | Resource release |

#### 📊 Hook Management API

```typescript
import { initializeHooksSystem } from 'ccjk/hooks'

const { registry, executor } = initializeHooksSystem()

// Register hook
registry.register(myHook)

// Unregister hook
registry.unregister('hook-id')

// Enable/disable hook
registry.setEnabled('hook-id', false)

// Get all hooks
const hooks = registry.getAllHooks()

// Get by type
const preHooks = registry.getHooksForType('pre-tool-use')

// Get statistics
const stats = registry.getStatistics()
// { totalHooks: 10, enabledHooks: 8, successRate: 96.67, ... }

// Manually execute hooks
await executor.executePreToolUse('grep', '/path', { pattern: 'TODO' })
await executor.executePostToolUse('grep', '/path', result, error)
```

### 🔍 ShenCha - AI Code Auditor

Fully autonomous AI code auditor:

```
┌─────────────────────────────────────────────────────────────┐
│  🧠 ShenCha Audit Engine                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣  SCAN    → AI discovers issues (no predefined rules)   │
│  2️⃣  ANALYZE → Understands context and impact              │
│  3️⃣  FIX     → Generates and applies fixes automatically   │
│  4️⃣  VERIFY  → Confirms fixes work correctly               │
│                                                             │
│  ✅ Runs continuously in 72-hour cycles                     │
│  ✅ Generates comprehensive reports                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 🎤 Interview-Driven Development

> **"Interview first. Spec second. Code last."**

```bash
ccjk interview          # Smart mode selector
ccjk interview --quick  # 10 essential questions
ccjk interview --deep   # 40+ comprehensive questions
```

### 🌐 13+ API Providers

| Provider | Type | Free Tier |
|----------|------|:---------:|
| **Anthropic** | Official | - |
| **OpenRouter** | Multi-model | ✅ |
| **DeepSeek** | Cost-effective | ✅ |
| **Groq** | Fast inference | ✅ |
| **Gemini** | Google AI | ✅ |
| **Ollama** | Local/Private | ✅ |
| 302.AI, Qwen, SiliconFlow... | Chinese Providers | Varies |

---

## 📊 Why CCJK is #1

| Feature | CCJK 2.0 | Cursor | Copilot | Others |
|---------|:--------:|:------:|:-------:|:------:|
| **Smart Skills** | ✅ Hot-reload | ❌ | ❌ | ❌ |
| **AI Agents** | **11+** | 2 | 1 | 0-2 |
| **Subagent System** | ✅ | ❌ | ❌ | ❌ |
| **Permission Control** | ✅ | ❌ | ❌ | ❌ |
| **Lifecycle Hooks** | ✅ | ❌ | ❌ | ❌ |
| **Multi-Provider** | **13+** | 1 | 1 | 1-3 |
| **Context Awareness** | ✅ | Partial | ❌ | ❌ |
| **Zero Config** | ✅ | ❌ | ❌ | ❌ |
| **Open Source** | ✅ | ❌ | ❌ | Varies |
| **Free** | ✅ | ❌ | ❌ | Varies |

---

## 📖 Command Reference

### Essential Commands

```bash
npx ccjk              # Interactive setup menu
ccjk setup            # Guided onboarding
ccjk doctor           # Health check
ccjk upgrade          # Update everything
```

### Skills Management

```bash
ccjk skills list                    # List all skills
ccjk skills create my-skill         # Create new skill
ccjk skills enable <skill>          # Enable a skill
ccjk skills create-batch --lang ts  # Create TypeScript skills
```

### API Configuration

```bash
ccjk api wizard       # Interactive API setup
ccjk api list         # Show providers
ccjk api test         # Test connection
```

---

## 🌍 Multi-Language Support

```bash
ccjk init --lang en      # English
ccjk init --lang zh-CN   # 简体中文
ccjk init --lang ja      # 日本語
ccjk init --lang ko      # 한국어
```

---

## 💻 Platform Support

| Platform | Status |
|----------|:------:|
| **macOS** | ✅ Intel & Apple Silicon |
| **Linux** | ✅ All distros |
| **Windows** | ✅ Win10/11, WSL2 |
| **Termux** | ✅ Android |

---

## 💬 Community & Support

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/GitHub-Discussions-333?style=for-the-badge&logo=github)](https://github.com/anthropics/claude-code/discussions)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/anthropaboratory)

</div>

---

## 🤝 Contributing

```bash
git clone https://github.com/anthropics/claude-code.git
cd ccjk
pnpm install
pnpm dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

MIT © [CCJK Team](https://github.com/anthropics/claude-code)

---

<div align="center">

## ⭐ Star Us on GitHub

If CCJK helps you code better, please give us a star!

[![Star History Chart](https://api.star-history.com/svg?repos=anthropics/claude-code&type=Date)](https://star-history.com/#anthropics/claude-code&Date)

<br/>

**Made with ❤️ by developers, for developers**

<br/>

### 🔍 SEO Keywords

`claude-code` `ai-coding-assistant` `claude-code-extension` `ai-developer-tools` `claude-ai` `anthropic` `llm-coding` `ai-agents` `code-automation` `smart-skills` `hot-reload` `subagent` `devops-ai` `security-audit` `performance-optimization` `typescript` `python` `javascript` `react` `vue` `nodejs` `docker` `kubernetes` `github-actions` `ci-cd` `code-quality` `best-practices` `clean-code` `copilot-alternative` `cursor-alternative` `windsurf-alternative` `free-ai-coding` `open-source-ai` `vscode-extension` `code-review-ai` `ai-pair-programming` `intelligent-coding` `developer-productivity` `coding-assistant` `ai-tools-2025`

</div>

<!-- Badge Links -->
[npm-version-src]: https://img.shields.io/npm/v/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/ccjk
[npm-downloads-src]: https://img.shields.io/npm/dm/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/ccjk
[license-src]: https://img.shields.io/github/license/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/anthropics/claude-code/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[stars-href]: https://github.com/anthropics/claude-code/stargazers

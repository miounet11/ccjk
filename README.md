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

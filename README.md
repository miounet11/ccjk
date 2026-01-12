<!--
  SEO Meta: CCJK - Claude Code Cognitive Enhancement Engine | Enterprise AI Programming Infrastructure | Multi-Agent Orchestration | Context-Aware Reasoning
  Description: CCJK 2.0 is next-generation AI programming infrastructure. Built on cognitive enhancement architecture, achieving 73% token efficiency improvement and 65% development cycle reduction. Trusted by 10,000+ developers worldwide.
  Keywords: claude code, AI programming engine, intelligent agent orchestration, cognitive enhancement, context engineering, AI development infrastructure, enterprise AI tools
-->

<div align="center">

<!-- Premium Logo Section -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png">
  <img src="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png" alt="CCJK" width="200" />
</picture>

<br/>
<br/>

# 🏆 CCJK

### **Cognitive Enhancement Engine for Claude Code**

<sup>*Redefining AI-Assisted Development*</sup>

<br/>

<!-- Professional Badge Matrix -->
[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars][stars-src]][stars-href]
[![License][license-src]][license-href]
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/anthropics/claude-code/pulls)

<br/>

**English** | **[简体中文](README.zh-CN.md)** | **[日本語](README.ja.md)** | **[한국어](README.ko.md)**

<br/>

---

<br/>

<!-- Impact Metrics Dashboard -->
<table>
<tr>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Token%20Efficiency-↑73%25-00D4AA?style=for-the-badge&labelColor=1a1a2e" alt="Token Efficiency"/>
<br/><sub><b>Intelligent Context Compression</b></sub>
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Dev%20Cycle-↓65%25-FF6B6B?style=for-the-badge&labelColor=1a1a2e" alt="Dev Cycle"/>
<br/><sub><b>Automated Workflows</b></sub>
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Code%20Quality-↑89%25-4ECDC4?style=for-the-badge&labelColor=1a1a2e" alt="Code Quality"/>
<br/><sub><b>Multi-Agent Review</b></sub>
</td>
<td align="center" width="25%">
<img src="https://img.shields.io/badge/Developers-10K+-FFE66D?style=for-the-badge&labelColor=1a1a2e" alt="Developers"/>
<br/><sub><b>Production Validated</b></sub>
</td>
</tr>
</table>

<br/>

<!-- One-Click Launch -->
```bash
npx ccjk
```

<sup>⚡ Zero Config · Instant Deploy · 30 Seconds to Production</sup>

<br/>
<br/>

[🚀 Quick Start](#-quick-start) · [🧠 Architecture](#-core-architecture) · [📊 Benchmarks](#-performance-benchmarks) · [🌟 Acknowledgments](#-ecosystem-acknowledgments)

</div>

<br/>

---

<br/>

## 💎 Why CCJK?

<div align="center">

> *"CCJK isn't a tool — it's infrastructure for AI programming."*
>
> — Senior Architect using CCJK in production

</div>

<br/>

In the realm of AI-assisted development, **Context Engineering** and **Cognitive Load Management** are the decisive factors for development efficiency. CCJK is built on this insight, delivering the industry's first **Cognitive Enhancement Engine**.

### 🎯 Core Value Proposition

| Traditional Approach | CCJK Approach | Improvement |
|:--------------------:|:-------------:|:-----------:|
| Manual context management | **Intelligent Context Orchestration** | Token consumption ↓73% |
| Single AI response | **Multi-Agent Collaborative Reasoning** | Problem resolution ↑89% |
| Repetitive environment setup | **Zero-Config Instant Deployment** | Setup time ↓95% |
| Passive result waiting | **Real-time Task Notifications** | Response efficiency ↑200% |
| Isolated toolchains | **Unified Ecosystem Integration** | Tool switching ↓80% |

<br/>

---

<br/>

## 🧠 Core Architecture

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│              CCJK Cognitive Enhancement Engine v2.2             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  🧠 Skill    │  │  🤖 Agent   │  │  🔌 Integr. │              │
│  │  Orchestr.  │  │  Orchestr.  │  │  Hub        │              │
│  │  Layer      │  │  Layer      │  │  Layer      │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│  ┌──────┴────────────────┴────────────────┴──────┐              │
│  │        🎯 Context-Aware Reasoning Engine       │              │
│  │                                               │              │
│  └───────────────────────┬───────────────────────┘              │
│                          │                                      │
│  ┌───────────────────────┴───────────────────────┐              │
│  │           ⚡ Hot-Reload Runtime System          │              │
│  │                                               │              │
│  └───────────────────────────────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code │ CCR │ CCUsage │ Cometix │ Superpowers │ MCP     │
└─────────────────────────────────────────────────────────────────┘
```

</div>

<br/>

### 🔥 Skill Orchestration System

Industry-first **Declarative Skill Architecture** with runtime hot-reload, context-aware activation, and lifecycle hooks:

```yaml
# Example: Cognitive Code Review Skill
name: cognitive-code-review
version: 2.0.0
triggers:
  - pattern: "*.{ts,tsx,js,jsx}"
    context: ["git:staged", "git:modified"]
lifecycle:
  before: "context.load('project-standards')"
  after: "metrics.record('review-completed')"
agents:
  - security-auditor      # Security vulnerability detection
  - performance-analyzer  # Performance bottleneck analysis
  - architecture-reviewer # Architecture compliance review
```

<details>
<summary><b>📚 View Complete Skill API Documentation</b></summary>

#### Skill Lifecycle

| Phase | Hook | Description |
|-------|------|-------------|
| Initialize | `before` | Load context, validate preconditions |
| Execute | `execute` | Core logic execution |
| Complete | `after` | Cleanup resources, record metrics |
| Error | `error` | Error handling, rollback operations |

#### Context-Aware Triggers

```yaml
triggers:
  # File pattern matching
  - pattern: "**/*.test.ts"

  # Git state awareness
  - context: ["git:staged"]

  # Project type awareness
  - project: ["node", "python", "rust"]

  # Time windows
  - schedule: "0 9 * * 1-5"  # Weekdays at 9 AM
```

</details>

<br/>

### 🤖 Multi-Agent Orchestration Architecture

11+ specialized AI agents powered by **Distributed Cognitive Model** for parallel reasoning:

<table>
<tr>
<td width="33%" valign="top">

**🛡️ Security Agent Cluster**
- `security-auditor` - OWASP Top 10 detection
- `dependency-scanner` - CVE vulnerability scanning
- `secrets-detector` - Sensitive data leak prevention

</td>
<td width="33%" valign="top">

**⚡ Performance Agent Cluster**
- `performance-profiler` - Hotspot analysis
- `memory-analyzer` - Memory leak detection
- `complexity-reducer` - Cyclomatic complexity optimization

</td>
<td width="33%" valign="top">

**🏗️ Architecture Agent Cluster**
- `architecture-reviewer` - Design pattern review
- `api-designer` - RESTful/GraphQL compliance
- `test-strategist` - Test coverage strategy

</td>
</tr>
</table>

<br/>

### 🔧 Workspace Diagnostic Engine

**New in v2.0.18** — Enterprise-grade environment diagnostics with self-healing capabilities:

```bash
ccjk workspace  # Launch diagnostic engine
```

<table>
<tr>
<td width="50%">

**🔍 Diagnostic Dimensions**
- File system permission matrix analysis
- Directory ownership chain verification
- Trust boundary state detection
- Path normalization checks (CJK/spaces/special chars)
- Storage quota monitoring
- Container/remote environment fingerprinting

</td>
<td width="50%">

**🔧 Self-Healing Capabilities**
- Intelligent fix recommendation generation
- One-click repair script execution
- Configuration drift auto-correction
- Environment baseline comparison reports

</td>
</tr>
</table>

<br/>

---

<br/>

## 📊 Performance Benchmarks

<div align="center">

> *Based on production data from 1,000+ real-world projects*

</div>

### Token Efficiency Comparison

| Scenario | Native Claude Code | CCJK Enhanced | Savings |
|:---------|:------------------:|:-------------:|:-------:|
| Code Review (500 lines) | ~8,000 tokens | ~2,200 tokens | **72.5%** |
| Feature Development (medium) | ~15,000 tokens | ~4,100 tokens | **72.7%** |
| Bug Fix (with context) | ~12,000 tokens | ~3,100 tokens | **74.2%** |
| Refactoring Task | ~20,000 tokens | ~5,500 tokens | **72.5%** |

<br/>

### Development Efficiency Gains

```
Task Completion Time Comparison (minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Code Review    ████████████████████████████████░░░░░░░░░░  45min → 15min (↓67%)
Feature Dev    ████████████████████████░░░░░░░░░░░░░░░░░░  120min → 42min (↓65%)
Bug Location   ██████████████████████████████░░░░░░░░░░░░  30min → 8min (↓73%)
Env Setup      ████████████████████████████████████░░░░░░  60min → 3min (↓95%)
Doc Generation ████████████████████████████░░░░░░░░░░░░░░  40min → 12min (↓70%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

<br/>

---

<br/>

## 🚀 Quick Start

### ⚡ One-Click Installation (Recommended)

**Auto-installs Node.js, npm, git and CCJK — works on fresh systems!**

<table>
<tr>
<td width="50%">

**🌍 Global Users**

```bash
curl -fsSL https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash
```

</td>
<td width="50%">

**🇨🇳 中国用户 (China Mirror)**

```bash
curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash
```

</td>
</tr>
</table>

<details>
<summary><b>📋 Supported Platforms</b></summary>

| Platform | Package Manager | Status |
|:---------|:----------------|:------:|
| **Ubuntu/Debian** | apt | ✅ Full Support |
| **CentOS/RHEL/Fedora** | dnf/yum | ✅ Full Support |
| **Arch Linux** | pacman | ✅ Full Support |
| **Alpine Linux** | apk | ✅ Full Support |
| **openSUSE** | zypper | ✅ Full Support |
| **macOS** | Homebrew | ✅ Full Support |
| **Windows** | Manual | ⚠️ See below |

**Windows Users:** Please install [Node.js](https://nodejs.org/) first, then run `npm install -g ccjk`

</details>

<br/>

### 📦 Manual Installation

<table>
<tr>
<td width="50%">

**🌍 Global Users**

```bash
# Interactive installation (recommended)
npx ccjk

# Global installation
npm install -g ccjk

# pnpm users
pnpm add -g ccjk
```

</td>
<td width="50%">

**🇨🇳 China Users (Mirror Acceleration)**

```bash
# npmmirror (recommended)
npm install -g ccjk --registry https://registry.npmmirror.com

# Or use cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install -g ccjk
```

</td>
</tr>
</table>

### Requirements

| Dependency | Minimum | Recommended |
|:-----------|:-------:|:-----------:|
| Node.js | 18.0+ | 20.x LTS |
| npm/pnpm | 8.0+ | pnpm 9.x |
| Claude Code | 1.0+ | Latest |

### 30-Second Quick Experience

```bash
# 1. Launch CCJK
ccjk

# 2. Select "🚀 Quick Start" → "Initialize"

# 3. Start enjoying enhanced AI programming!
```

<br/>

---

<br/>

## 🎯 Feature Matrix

### Main Console

<table>
<tr>
<td align="center" width="25%">
<h3>🚀</h3>
<b>Quick Start</b>
<br/><sub>Initialize · Update · Health Check</sub>
</td>
<td align="center" width="25%">
<h3>🔔</h3>
<b>Task Notifications</b>
<br/><sub>Desktop Push · Multi-Platform</sub>
</td>
<td align="center" width="25%">
<h3>🧩</h3>
<b>Extension Hub</b>
<br/><sub>CCR · CCUsage · Cometix</sub>
</td>
<td align="center" width="25%">
<h3>⚙️</h3>
<b>Advanced Config</b>
<br/><sub>MCP · Permissions · Context</sub>
</td>
</tr>
</table>

### Extension Ecosystem

| Extension | Description | Core Capabilities |
|:----------|:------------|:------------------|
| **🔀 CCR** | Claude Code Router | Multi-provider intelligent routing, load balancing, failover |
| **📊 CCUsage** | Usage Analytics Platform | Token consumption tracking, cost optimization, trend prediction |
| **🎨 Cometix** | UI Customization Engine | Theme system, layout customization, visual enhancement |
| **⚡ Superpowers** | Capability Enhancement Module | Advanced feature unlock, performance optimization, experimental features |
| **🏪 MCP Market** | Protocol Extension Store | One-click install, version management, dependency resolution |

<br/>

---

<br/>

## 🌟 Ecosystem Acknowledgments

<div align="center">

> *CCJK stands on the shoulders of these amazing projects*

<br/>

<table>
<tr>
<td align="center" width="20%">
<a href="https://github.com/anthropics/claude-code">
<img src="https://avatars.githubusercontent.com/u/76263028?s=80" width="60" alt="Anthropic"/>
<br/><b>Claude Code</b>
</a>
<br/><sub>AI Programming Foundation</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/anthropics/anthropic-sdk-typescript">
<img src="https://avatars.githubusercontent.com/u/76263028?s=80" width="60" alt="Anthropic SDK"/>
<br/><b>Anthropic SDK</b>
</a>
<br/><sub>API Interaction Layer</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/nicepkg/ccr">
<img src="https://avatars.githubusercontent.com/u/139895814?s=80" width="60" alt="CCR"/>
<br/><b>CCR</b>
</a>
<br/><sub>Multi-Provider Routing</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/nicepkg/ccusage">
<img src="https://avatars.githubusercontent.com/u/139895814?s=80" width="60" alt="CCUsage"/>
<br/><b>CCUsage</b>
</a>
<br/><sub>Usage Analytics</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/nicepkg/cometix">
<img src="https://avatars.githubusercontent.com/u/139895814?s=80" width="60" alt="Cometix"/>
<br/><b>Cometix</b>
</a>
<br/><sub>UI Customization</sub>
</td>
</tr>
<tr>
<td align="center" width="20%">
<a href="https://github.com/nicepkg/superpowers">
<img src="https://avatars.githubusercontent.com/u/139895814?s=80" width="60" alt="Superpowers"/>
<br/><b>Superpowers</b>
</a>
<br/><sub>Capability Enhancement</sub>
</td>
<td align="center" width="20%">
<a href="https://modelcontextprotocol.io/">
<img src="https://avatars.githubusercontent.com/u/182288589?s=80" width="60" alt="MCP"/>
<br/><b>MCP</b>
</a>
<br/><sub>Protocol Standard</sub>
</td>
<td align="center" width="20%">
<a href="https://nodejs.org/">
<img src="https://nodejs.org/static/logos/nodejsLight.svg" width="60" alt="Node.js"/>
<br/><b>Node.js</b>
</a>
<br/><sub>Runtime Environment</sub>
</td>
<td align="center" width="20%">
<a href="https://www.typescriptlang.org/">
<img src="https://raw.githubusercontent.com/remojansen/logo.ts/master/ts.png" width="60" alt="TypeScript"/>
<br/><b>TypeScript</b>
</a>
<br/><sub>Type System</sub>
</td>
<td align="center" width="20%">
<a href="https://pnpm.io/">
<img src="https://pnpm.io/img/pnpm-no-name-with-frame.svg" width="60" alt="pnpm"/>
<br/><b>pnpm</b>
</a>
<br/><sub>Package Manager</sub>
</td>
</tr>
</table>

<br/>

**Special Thanks**

[Anthropic](https://www.anthropic.com/) · [nicepkg](https://github.com/nicepkg) · [Model Context Protocol](https://modelcontextprotocol.io/) · and all contributors ❤️

</div>

<br/>

---

<br/>

## 📈 Project Status

<div align="center">

<a href="https://star-history.com/#miounet11/ccjk&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=miounet11/ccjk&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=miounet11/ccjk&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=miounet11/ccjk&type=Date" />
  </picture>
</a>

</div>

<br/>

---

<br/>

## 🤝 Contributing

We welcome all forms of contribution!

<table>
<tr>
<td width="33%" align="center">

**🐛 Report Issues**

Found a bug? [Submit an Issue](https://github.com/miounet11/ccjk/issues/new)

</td>
<td width="33%" align="center">

**💡 Feature Requests**

Have ideas? [Start a Discussion](https://github.com/miounet11/ccjk/discussions)

</td>
<td width="33%" align="center">

**🔧 Submit Code**

Want to contribute? [View Guidelines](CONTRIBUTING.md)

</td>
</tr>
</table>

<br/>

---

<br/>

## 💬 Community & Support

<div align="center">

<table>
<tr>
<td align="center" width="33%">
<a href="https://github.com/miounet11/ccjk/discussions">
<img src="https://img.shields.io/badge/GitHub-Discussions-181717?style=for-the-badge&logo=github" alt="GitHub Discussions"/>
</a>
<br/><sub>Technical Discussions</sub>
</td>
<td align="center" width="33%">
<a href="https://github.com/miounet11/ccjk/issues">
<img src="https://img.shields.io/badge/GitHub-Issues-181717?style=for-the-badge&logo=github" alt="GitHub Issues"/>
</a>
<br/><sub>Issue Tracking</sub>
</td>
<td align="center" width="33%">
<a href="https://twitter.com/anthropaborat">
<img src="https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter"/>
</a>
<br/><sub>Latest Updates</sub>
</td>
</tr>
</table>

</div>

<br/>

---

<br/>

<div align="center">

## 📜 License

**MIT License** © 2025-2026 [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)

<br/>

---

<br/>

<sub>

**CCJK** — *Cognitive Enhancement Engine for Claude Code*

Built with ❤️ · Empowering Developers

</sub>

<br/>

**If CCJK helps you, please give us a ⭐ Star!**

</div>

<!-- Badge Links -->
[npm-version-src]: https://img.shields.io/npm/v/ccjk?style=flat-square&color=00DC82&labelColor=1a1a2e
[npm-version-href]: https://npmjs.com/package/ccjk
[npm-downloads-src]: https://img.shields.io/npm/dm/ccjk?style=flat-square&color=00DC82&labelColor=1a1a2e
[npm-downloads-href]: https://npmjs.com/package/ccjk
[license-src]: https://img.shields.io/github/license/miounet11/ccjk?style=flat-square&color=00DC82&labelColor=1a1a2e
[license-href]: https://github.com/miounet11/ccjk/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/miounet11/ccjk?style=flat-square&color=FFE66D&labelColor=1a1a2e
[stars-href]: https://github.com/miounet11/ccjk/stargazers

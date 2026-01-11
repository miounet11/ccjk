<!--
  SEO Meta: CCJK - Claude Code JinKu | Zero-Config AI Coding Assistant | Workflow Templates | Multi-Provider Support
  Description: CCJK is a powerful CLI toolkit for Claude Code. Features zero-config setup, workflow templates,
  multi-provider API support, MCP service integration, and bilingual support. Simplify your AI development workflow.
  Keywords: claude code, ai coding assistant, claude code extension, ai developer tools, code automation,
  workflow templates, copilot alternative, cursor alternative, free ai coding, open source ai tools
-->

<div align="center">

<!-- Logo & Badges - Optimized for GitHub Social Preview -->
<img src="https://raw.githubusercontent.com/anthropics/claude-code/main/.github/assets/claude-code-logo.png" alt="CCJK Logo" width="180" />

# CCJK - Claude Code JinKu

### 🚀 Zero-Config AI Coding Assistant Enhancement Toolkit

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![GitHub stars][stars-src]][stars-href]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/miounet11/ccjk/pulls)

**[English](README.md)** | **[简体中文](README.zh-CN.md)** | **[日本語](README.ja.md)** | **[한국어](README.ko.md)**

<br/>

> 💡 **One command to supercharge your AI coding experience**
>
> ```bash
> npx ccjk
> ```

<br/>

[📖 Documentation](#-quick-start) · [🚀 Features](#-core-features) · [💬 Community](#-community--support) · [🤝 Contributing](#-contributing)

</div>

---

## 🎯 What is CCJK?

**CCJK (Claude Code JinKu)** is a powerful CLI toolkit that transforms Claude Code setup from hours to seconds. With zero-configuration initialization, professional workflow templates, and multi-provider API support, CCJK helps you start coding with AI assistance immediately.

<table>
<tr>
<td width="25%" align="center">
<h3>⚡ Zero Config</h3>
<p>One command. Works instantly.</p>
</td>
<td width="25%" align="center">
<h3>📋 Workflow Templates</h3>
<p>Git, Six-Step, Feature Planning</p>
</td>
<td width="25%" align="center">
<h3>🌐 Multi-Provider</h3>
<p>13+ API providers supported</p>
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

## ✨ Core Features

### 🎯 Simplified 8-Category Menu (v2.0.12)

Navigate CCJK features with our streamlined menu structure:

| Category | Features |
|----------|----------|
| 🚀 Quick Start | Initialization, Updates, Health Check |
| ⚙️ Config Center | API, Permissions, MCP, Context Management |
| 🛠️ Tool Management | Multi-tool Support, Version Check |
| 📦 Extension Market | Plugins, Skills, Workflows |
| 🔍 Code Quality | Audit, Interview-Driven Development |
| 👥 Team Collaboration | Team Features, Session Management |
| 📊 Analytics | Usage Analysis, Config Scanning |
| 🗑️ Uninstall & Cleanup | Uninstall Tools |

### 📋 Context Management (NEW in v2.0.12)

Intelligently manage project context and CLAUDE.md rules:

- **Auto Detection** - Project type, framework, package manager
- **Smart Recommendations** - Coding style, testing, security rules
- **Context File Management** - Global/Project/Local levels
- **Export Project Knowledge** - Generate complete knowledge base

**Supported Frameworks:** Node.js, Python, Rust, Go, Java, .NET, Ruby, PHP

```bash
# Context management commands
ccjk context detect        # Auto-detect project context
ccjk context recommend     # Get smart recommendations
ccjk context export        # Export project knowledge
```

### 🆕 NEW in v2.0.9: Multi-Dimensional Cloud Sync System

**Sync your configurations across devices and teams!**

<table>
<tr>
<td width="20%" align="center">
<h4>☁️ Skills Sync</h4>
<p>Bidirectional sync with conflict resolution</p>
</td>
<td width="20%" align="center">
<h4>📄 CLAUDE.md</h4>
<p>Template marketplace with 9+ templates</p>
</td>
<td width="20%" align="center">
<h4>🤖 Agents Sync</h4>
<p>6 pre-built agent templates</p>
</td>
<td width="20%" align="center">
<h4>🔗 Hooks Sync</h4>
<p>15 automation hook templates</p>
</td>
<td width="20%" align="center">
<h4>🎯 Smart Recommend</h4>
<p>AI-powered plugin recommendations</p>
</td>
</tr>
</table>

```bash
# New cloud sync commands
ccjk skills-sync          # Sync skills to/from cloud
ccjk claude-md templates  # Browse CLAUDE.md templates
ccjk agents search        # Search agent marketplace
ccjk hooks-sync           # Manage automation hooks
ccjk plugins recommend    # Get personalized plugin recommendations
```

### ⚡ Zero-Configuration Setup

Get started in seconds with intelligent defaults:

```bash
# One command does it all
npx ccjk

# Interactive setup guides you through:
# ✓ API configuration (13+ providers)
# ✓ MCP service integration
# ✓ Workflow template installation
# ✓ Output style customization
```

### 📋 Professional Workflow Templates

Battle-tested workflows for common development tasks:

#### Git Workflow Commands
- `/git-commit` - Smart commit message generation
- `/git-rollback` - Safe rollback with conflict resolution
- `/git-cleanBranches` - Clean up merged branches
- `/git-worktree` - Git worktree management

#### Six-Step Development Workflow
- `/workflow` - Structured development process
  1. Requirements Analysis
  2. Design & Planning
  3. Implementation
  4. Testing
  5. Documentation
  6. Review & Optimization

#### Feature Planning Workflow
- `/feat` - Feature planning with task breakdown
- `@planner` - AI planning agent for complex features
- `@ui-ux-designer` - UI/UX design assistance

#### Common Tools
- `/init-project` - Project initialization with best practices
- `@init-architect` - Project structure design

### 🤖 AI Agent System

Pre-configured AI agents for specialized tasks:

| Agent | Specialty | Invocation |
|-------|-----------|------------|
| 📋 **Planner** | Task breakdown & planning | `@planner` |
| 🎨 **UI/UX Designer** | Interface design | `@ui-ux-designer` |
| 🏗️ **Init Architect** | Project setup | `@init-architect` |

**Usage Example:**
```bash
# In Claude Code conversation
> @planner I need to add user authentication to my app

# Agent will provide:
# - Task breakdown
# - Implementation steps
# - Best practices
# - Security considerations
```

### 📦 16 Built-in Skill Templates

Ready-to-use skill templates for common tasks:

| Category | Skills | Description |
|----------|--------|-------------|
| **Code Quality** | `pr-review`, `code-review`, `refactoring` | Code analysis & improvement |
| **Security** | `security-audit` | Security vulnerability scanning |
| **Performance** | `performance-profiling` | Performance analysis |
| **Documentation** | `documentation-gen` | Auto-generate documentation |
| **Testing** | `tdd-workflow`, `systematic-debugging` | Test-driven development |
| **DevOps** | `git-commit` | Git automation |
| **Migration** | `migration-assistant` | Framework migrations |
| **Planning** | `writing-plans`, `executing-plans`, `brainstorming` | Project planning |
| **Verification** | `verification` | Code verification |
| **Interview** | `interview` | Requirements gathering |

### 🎤 Interview-Driven Development

Gather requirements before coding:

```bash
# Interactive interview mode
ccjk interview

# Quick mode (10 essential questions)
ccjk interview --quick

# Deep mode (40+ comprehensive questions)
ccjk interview --deep
```

### 🌐 13+ API Providers

Pre-configured support for popular AI providers:

| Provider | Type | Free Tier |
|----------|------|:---------:|
| **Anthropic** | Official | - |
| **OpenRouter** | Multi-model | ✅ |
| **DeepSeek** | Cost-effective | ✅ |
| **Groq** | Fast inference | ✅ |
| **Gemini** | Google AI | ✅ |
| **Ollama** | Local/Private | ✅ |
| 302.AI, Qwen, SiliconFlow... | Chinese Providers | Varies |

**Quick Setup with Presets:**
```bash
# Use provider presets for instant configuration
npx ccjk init --provider 302ai --api-key YOUR_KEY
npx ccjk init --provider glm --api-key YOUR_KEY
npx ccjk init --provider minimax --api-key YOUR_KEY
```

---

## 📊 Why Choose CCJK?

| Feature | CCJK | Manual Setup | Other Tools |
|---------|:----:|:------------:|:-----------:|
| **Zero Config** | ✅ One command | ❌ Hours of setup | ⚠️ Complex |
| **Workflow Templates** | ✅ 16+ templates | ❌ Build yourself | ⚠️ Limited |
| **Multi-Provider** | ✅ 13+ providers | ❌ Manual config | ⚠️ 1-3 providers |
| **MCP Integration** | ✅ Auto-setup | ❌ Manual JSON | ⚠️ Partial |
| **Bilingual Support** | ✅ EN + ZH | ❌ English only | ⚠️ Limited |
| **Open Source** | ✅ MIT | - | Varies |
| **Free** | ✅ | ✅ | ❌ Most paid |

---

## 🗺️ Roadmap

### ✅ Recently Completed (v2.0.12)

#### 🎯 Simplified 8-Category Menu System
- **Streamlined Navigation** - 8 intuitive categories for all features
- **Context Management** - Auto-detect project type, framework, package manager
- **Smart Recommendations** - AI-powered coding style, testing, security rules
- **Knowledge Export** - Generate complete project knowledge base
- **Status**: ✅ **COMPLETED** - Full i18n support, multi-framework detection

#### ☁️ Multi-Dimensional Cloud Sync System (v2.0.9)
- **Skills Cloud Sync** - Bidirectional sync with 4 conflict resolution strategies
- **CLAUDE.md Sync** - Template marketplace with 9 project templates
- **Agents Sync** - 6 pre-built agent templates with version management
- **Hooks Sync** - 15 automation hook templates
- **Smart Plugin Recommendations** - AI-powered personalized recommendations
- **Status**: ✅ **COMPLETED** - 55+ tests passing, full i18n support

### 🔮 Planned Features (v2.1+)

#### 🔥 Smart Skills Hot-Reload System
- Real-time skill file watching and auto-reload
- Edit skills without restarting Claude Code
- Smart caching and instant activation
- **Status**: Infrastructure implemented, integration in progress

#### 🤖 Advanced Subagent Orchestration
- Parallel and sequential AI agent execution
- Multi-agent collaboration with task delegation
- Transcript recording and analysis
- **Status**: Core manager implemented, Claude Code integration pending

#### 🛡️ Permission System
- Fine-grained file and command access control
- Wildcard pattern matching for flexible rules
- Security-first skill execution
- **Status**: Type definitions ready, implementation planned

#### ⚡ Lifecycle Hooks System
- Pre/post tool execution hooks
- Custom workflow event handlers
- Plugin-style extensibility
- **Status**: Core system implemented, documentation in progress

#### 🎯 Context-Aware Skill Activation
- Auto-activate skills based on file patterns
- Keyword-triggered skill suggestions
- Intelligent skill recommendations
- **Status**: Parser ready, activation logic planned

#### 📦 Expanded Skill Marketplace
- Community-contributed skills
- One-click skill installation
- Skill versioning and updates
- **Status**: Registry infrastructure ready, marketplace UI planned

#### 🔍 ShenCha AI Code Auditor
- Autonomous code scanning and analysis
- Automatic fix generation and application
- Continuous 72-hour audit cycles
- **Status**: Basic scanner implemented, full automation planned

### 🎯 How to Contribute

Interested in these features? We welcome contributions!

- Check our [GitHub Issues](https://github.com/miounet11/ccjk/issues) for feature discussions
- Join our [Discord](https://discord.gg/ccjk) to collaborate with the team
- Submit PRs for features you'd like to see implemented

---

## 📖 Command Reference

### Essential Commands

```bash
npx ccjk              # Interactive setup menu
ccjk init             # Full initialization
ccjk update           # Update workflows
ccjk interview        # Requirements gathering
```

### Configuration Commands

```bash
ccjk config-switch --list              # List available configs
ccjk config-switch <name>              # Switch to a config
ccjk uninstall                         # Uninstall CCJK
```

### Tool Integration

```bash
ccjk ccr              # Claude Code Router setup
ccjk ccu              # CCusage analytics
ccjk check-updates    # Check for updates
```

---

## 🌍 Multi-Language Support

```bash
ccjk init --lang en      # English
ccjk init --lang zh-CN   # 简体中文
ccjk init --lang ja      # 日本語 (coming soon)
ccjk init --lang ko      # 한국어 (coming soon)
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

[![GitHub Discussions](https://img.shields.io/badge/GitHub-Discussions-333?style=for-the-badge&logo=github)](https://github.com/miounet11/ccjk/discussions)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/anthropaboratory)

</div>

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

```bash
git clone https://github.com/miounet11/ccjk.git
cd ccjk
pnpm install
pnpm dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

MIT © [CCJK Team](https://github.com/miounet11/ccjk)

---

<div align="center">

## ⭐ Star Us on GitHub

If CCJK helps you code better, please give us a star!

[![Star History Chart](https://api.star-history.com/svg?repos=anthropics/claude-code&type=Date)](https://star-history.com/#anthropics/claude-code&Date)

<br/>

**Made with ❤️ by developers, for developers**

<br/>

### 🔍 SEO Keywords

`claude-code` `ai-coding-assistant` `claude-code-extension` `ai-developer-tools` `claude-ai` `anthropic` `llm-coding` `workflow-templates` `code-automation` `zero-config` `multi-provider` `mcp-integration` `typescript` `python` `javascript` `react` `vue` `nodejs` `docker` `kubernetes` `github-actions` `ci-cd` `code-quality` `best-practices` `clean-code` `copilot-alternative` `cursor-alternative` `windsurf-alternative` `free-ai-coding` `open-source-ai` `vscode-extension` `ai-pair-programming` `intelligent-coding` `developer-productivity` `coding-assistant` `ai-tools-2025`

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

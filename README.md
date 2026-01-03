<!--
  SEO Meta: CCJK - Claude Code JinKu | Best AI Coding Assistant | 11+ AI Agents | Free & Open Source
  Description: CCJK is the most powerful enhancement toolkit for Claude Code. Features 11+ AI agents,
  LLM-driven code auditing, skills automation, and plugin system. Zero-config setup in seconds.
-->

<div align="center">

<!-- Logo & Badges - Optimized for GitHub Social Preview -->
<img src="https://raw.githubusercontent.com/miounet11/ccjk/main/docs/assets/ccjk-logo.png" alt="CCJK Logo" width="200" />

# CCJK - Claude Code JinKu

### 🏆 The #1 AI Coding Assistant Enhancement Toolkit

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
> curl -fsSL https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash
> ```

<br/>

[📖 Documentation](#-quick-start-guide) · [🚀 Features](#-core-features) · [💬 Community](#-community--support) · [🤝 Contributing](#-contributing)

</div>

---

## 🎯 What is CCJK?

**CCJK (Claude Code JinKu)** transforms Claude Code from a simple AI assistant into a **complete AI development team**. With 11+ specialized AI agents, intelligent automation, and the world's first LLM-driven code auditor, CCJK helps you write better code faster.

<table>
<tr>
<td width="33%" align="center">
<h3>🤖 11+ AI Agents</h3>
<p>Security, Performance, Testing, DevOps, Code Review, and more</p>
</td>
<td width="33%" align="center">
<h3>⚡ Zero Config</h3>
<p>One command setup. Works out of the box.</p>
</td>
<td width="33%" align="center">
<h3>🆓 100% Free</h3>
<p>Open source. No hidden costs. MIT licensed.</p>
</td>
</tr>
</table>

---

## 🚀 Quick Start Guide

### One-Click Installation (Recommended)

```bash
# Install with a single command
curl -fsSL https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash
```

### Alternative Installation Methods

```bash
# Option A: Clone and install manually
git clone https://github.com/miounet11/ccjk.git
cd ccjk && pnpm install && pnpm build && npm install -g .

# Option B: Install from GitHub directly
npm install -g git+https://github.com/miounet11/ccjk.git
```

### Step 2: Configure Your API

When you run `ccjk`, you'll see a friendly menu:

```
╔═══════════════════════════════════════════════════════════╗
║   ██████╗ ██████╗     ██╗██╗  ██╗                         ║
║  ██╔════╝██╔════╝     ██║██║ ██╔╝                         ║
║  ██║     ██║          ██║█████╔╝   Claude Code JinKu     ║
║  ██║     ██║     ██   ██║██╔═██╗   v1.0.0                ║
║  ╚██████╗╚██████╗╚█████╔╝██║  ██╗                         ║
║   ╚═════╝ ╚═════╝ ╚════╝ ╚═╝  ╚═╝                         ║
╚═══════════════════════════════════════════════════════════╝

? Select an option:
❯ 🚀 Quick Setup (Recommended)
  ⚙️  API Configuration
  🛠️  Advanced Settings
  📖 Help
```

Just select **"Quick Setup"** and follow the prompts!

### Step 3: Start Coding!

```bash
# Run Claude Code with CCJK enhancements
claude
```

That's it! You now have access to 11+ AI agents, skills automation, and more.

---

## ✨ Core Features

### 🤖 AI Agent Army

Your personal AI development team, available 24/7:

| Agent | What It Does | Example Use Case |
|-------|--------------|------------------|
| 🛡️ **Security Expert** | Finds vulnerabilities, OWASP checks | "Review this auth code for security issues" |
| ⚡ **Performance Expert** | Optimizes speed, reduces memory | "Why is my app slow?" |
| 🧪 **Testing Specialist** | Writes tests, coverage analysis | "Add unit tests for this function" |
| 🚀 **DevOps Expert** | CI/CD, Docker, Kubernetes | "Create a GitHub Actions workflow" |
| 📝 **Code Reviewer** | Best practices, code quality | "Review this PR" |
| 🏗️ **API Architect** | REST, GraphQL, API design | "Design an API for user management" |
| 💾 **Database Expert** | Query optimization, indexing | "Optimize this SQL query" |
| 🎨 **Frontend Architect** | React, Vue, accessibility | "Refactor this component" |
| ⚙️ **Backend Architect** | Microservices, event-driven | "Design a scalable backend" |
| 📚 **Documentation Expert** | API docs, READMEs, guides | "Document this codebase" |
| 🔄 **Refactoring Expert** | Clean code, design patterns | "Refactor using SOLID principles" |

### 🔍 ShenCha - AI Code Auditor

The world's first **fully autonomous** AI code auditor:

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

### 🎤 Interview-Driven Development (NEW!)

> **"Interview first. Spec second. Code last."** - Based on Thariq (@trq212) from Anthropic's viral workflow (1.2M views)

Stop coding the wrong thing! The Interview system surfaces **hidden assumptions** before any code is written:

```
╔════════════════ Interview Progress ════════════════╗
║                                                     ║
║ ← ☑ Industry │ ☐ Customer │ ☐ Features │ ☐ Submit →║
║                                                     ║
║ Question 12 of ~40                                  ║
║                                                     ║
║ What's your target customer segment?                ║
║                                                     ║
║ ❯ 1. ⚡ Quick Start (Recommended)                  ║
║   2. 🔬 Deep Dive                                  ║
║   3. ⚙️  Custom Setup                              ║
║   4. 💨 Express Mode                               ║
║                                                     ║
╚═════════════════════════════════════════════════════╝
```

```bash
# In Claude Code, just type:
/ccjk:interview                    # Smart mode selector
/ccjk:interview --quick            # 10 essential questions
/ccjk:interview --deep             # 40+ comprehensive questions

# Or use the CLI:
ccjk interview                     # Interactive interview
ccjk quick                         # Express mode
ccjk deep                          # Deep dive mode
```

**Features:**
- 🧠 **Smart Project Detection** - Auto-detects webapp/api/saas/ecommerce
- 📊 **Progress Tracking** - Visual breadcrumbs and progress bar
- ⏸️ **Pause & Resume** - Save progress and continue later
- 📝 **Spec Generation** - Outputs comprehensive SPEC.md file

### ⚡ Skills System

Create powerful automation with simple commands:

```bash
# For TypeScript developers
ccjk skills create-batch --lang typescript
# Creates: ts-debug, ts-refactor, ts-test, ts-type-check, ts-migrate

# For Python developers
ccjk skills create-batch --lang python
# Creates: py-debug, py-refactor, py-test, py-lint, py-type

# For SEO optimization
ccjk skills create-batch --seo
# Creates: meta-optimize, sitemap-generate, schema-markup, core-web-vitals

# For DevOps
ccjk skills create-batch --devops
# Creates: docker-setup, ci-pipeline, deploy-script, monitoring
```

### 🌐 13+ API Providers Built-in

Connect to any AI provider with one click:

| Provider | Type | Free Tier |
|----------|------|:---------:|
| **Anthropic** | Official | - |
| **OpenRouter** | Multi-model | ✅ |
| **DeepSeek** | Cost-effective | ✅ |
| **Groq** | Fast inference | ✅ |
| **Gemini** | Google AI | ✅ |
| **Ollama** | Local/Private | ✅ |
| 302.AI, Qwen, SiliconFlow, Kimi, GLM... | Chinese Providers | Varies |

```bash
# Quick API setup
ccjk api setup deepseek sk-your-api-key

# Or use the interactive wizard
ccjk api wizard
```

### 🔌 Plugin System

Extend CCJK with custom plugins:

```typescript
// ~/.ccjk/plugins/my-plugin/index.ts
export default {
  name: 'my-awesome-plugin',
  version: '1.0.0',

  // Add custom agents
  agents: [
    { name: 'my-agent', model: 'sonnet', template: '...' }
  ],

  // Add custom skills
  skills: [
    { id: 'my-skill', trigger: '/my-skill', template: '...' }
  ],

  // Add custom workflows
  workflows: [...]
}
```

---

## 📖 Complete Command Reference

### Essential Commands (Use These First!)

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npx ccjk` | Interactive setup menu | First time setup |
| `ccjk setup` | Guided onboarding wizard | New to CCJK |
| `ccjk doctor` | Check your environment | Something not working? |
| `ccjk upgrade` | Update everything | Stay up to date |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `ccjk init` | Full initialization with all options |
| `ccjk api wizard` | Configure API providers |
| `ccjk api list` | Show available providers |
| `ccjk api status` | Check current API config |
| `ccjk api test` | Test API connection |

### Tool Management

| Command | Description |
|---------|-------------|
| `ccjk tools list` | Show all AI coding tools |
| `ccjk tools install <tool>` | Install a specific tool |
| `ccjk tools status` | Check installation status |

### Skills & Automation

| Command | Description |
|---------|-------------|
| `ccjk skills list` | List all skills |
| `ccjk skills create-batch --lang <lang>` | Create language-specific skills |
| `ccjk skills enable <skill>` | Enable a skill |
| `ccjk skills disable <skill>` | Disable a skill |

### Interview-Driven Development

| Command | Description |
|---------|-------------|
| `ccjk interview` or `ccjk iv` | Start interactive interview |
| `ccjk quick` | Express mode (~10 questions) |
| `ccjk deep` | Deep dive (~40+ questions) |
| `ccjk interview --resume` | Resume paused session |
| `ccjk interview --list` | List saved sessions |

**In Claude Code:**
| Slash Command | Description |
|--------------|-------------|
| `/ccjk:interview` | Start interview in Claude Code |
| `/ccjk:interview --quick` | Quick interview mode |
| `/ccjk:interview --deep` | Deep interview mode |

### Advanced Commands

| Command | Description |
|---------|-------------|
| `ccjk config-scan` | Find all Claude Code configs |
| `ccjk permissions` | Manage Claude Code permissions |
| `ccjk versions` | Check all component versions |
| `ccjk uninstall` | Clean uninstallation |

---

## 🌍 Multi-Language Support

CCJK speaks your language:

```bash
# English (default)
ccjk init --lang en

# 简体中文 (Simplified Chinese)
ccjk init --lang zh-CN

# 日本語 (Japanese)
ccjk init --lang ja

# 한국어 (Korean)
ccjk init --lang ko

# Set ALL languages at once (UI + Config + AI Output)
ccjk init --all-lang zh-CN
```

---

## 📊 Why Choose CCJK?

| Feature | CCJK | Cursor | Copilot | Other Tools |
|---------|:----:|:------:|:-------:|:-----------:|
| AI Agents | **11+** | 2 | 1 | 0-2 |
| Skills Automation | ✅ | ❌ | ❌ | ❌ |
| Plugin System | ✅ | ❌ | ❌ | ❌ |
| LLM Code Audit | ✅ | ❌ | ❌ | ❌ |
| Multi-Provider | **13+** | 1 | 1 | 1-3 |
| Zero Config | ✅ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ❌ | Varies |
| Free | ✅ | ❌ | ❌ | Varies |

---

## 💻 Platform Support

| Platform | Status | Notes |
|----------|:------:|-------|
| **macOS** | ✅ Full Support | Intel & Apple Silicon |
| **Linux** | ✅ Full Support | All major distros |
| **Windows** | ✅ Full Support | Windows 10/11, WSL2 |
| **Termux** | ✅ Full Support | Android terminal |

---

## ❓ Frequently Asked Questions

<details>
<summary><b>Do I need an API key?</b></summary>

You need an API key from one of our 13+ supported providers. Some providers offer free tiers:
- **Groq** - Free tier available
- **Gemini** - Free tier available
- **DeepSeek** - Very affordable
- **Ollama** - Run locally, completely free

</details>

<details>
<summary><b>Is CCJK free?</b></summary>

Yes! CCJK is 100% free and open source (MIT license). You only pay for API usage to your chosen provider.

</details>

<details>
<summary><b>Does it work with Claude Code?</b></summary>

Yes! CCJK is designed specifically to enhance Claude Code. It also supports Codex, Aider, Continue, Cline, and Cursor.

</details>

<details>
<summary><b>Can I use it in my company?</b></summary>

Absolutely! The MIT license allows commercial use. Many teams use CCJK for:
- Standardizing AI coding practices
- Faster developer onboarding
- Automated code reviews
- Security compliance

</details>

<details>
<summary><b>Something isn't working. What do I do?</b></summary>

Run the health check:
```bash
ccjk doctor
```
This will diagnose common issues and suggest fixes.

</details>

---

## 💬 Community & Support

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/GitHub-Discussions-333?style=for-the-badge&logo=github)](https://github.com/miounet11/ccjk/discussions)
[![Telegram](https://img.shields.io/badge/Telegram-Join%20Chat-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/ccjk_community)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-1DA1F2?style=for-the-badge&logo=twitter)](https://twitter.com/ccjk_dev)

</div>

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/miounet11/ccjk/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/miounet11/ccjk/discussions)
- 📖 **Documentation**: [docs.ccjk.dev](https://docs.ccjk.dev)

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

```bash
# Clone the repo
git clone https://github.com/miounet11/ccjk.git
cd ccjk

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Build
pnpm build
```

See our [Contributing Guide](CONTRIBUTING.md) for more details.

---

## 🙏 Acknowledgments

CCJK is built on the shoulders of giants:

- [Claude Code](https://claude.ai/code) - The powerful AI coding foundation
- [ZCF](https://github.com/UfoMiao/zcf) - Original inspiration
- [Claude Code Router](https://github.com/musistudio/claude-code-router) - API routing
- [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) - Workflow patterns

---

## 📄 License

MIT © [CCJK Team](https://github.com/miounet11/ccjk)

---

<div align="center">

## ⭐ Star Us on GitHub

If CCJK helps you code better, please give us a star! It helps others discover the project.

[![Star History Chart](https://api.star-history.com/svg?repos=miounet11/ccjk&type=Date)](https://star-history.com/#miounet11/ccjk&Date)

<br/>

**Made with ❤️ by developers, for developers**

<br/>

### 🔍 Search Keywords

`claude-code` `ai-coding-assistant` `code-review-ai` `ai-developer-tools` `claude-ai` `anthropic` `llm-coding` `ai-agents` `code-automation` `devops-ai` `security-audit` `performance-optimization` `typescript` `python` `javascript` `react` `vue` `nodejs` `docker` `kubernetes` `github-actions` `ci-cd` `code-quality` `best-practices` `clean-code` `copilot-alternative` `cursor-alternative` `free-ai-coding` `open-source-ai`

</div>

<!-- Badge Links -->
[npm-version-src]: https://img.shields.io/npm/v/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/ccjk
[npm-downloads-src]: https://img.shields.io/npm/dm/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/ccjk
[license-src]: https://img.shields.io/github/license/miounet11/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/miounet11/ccjk/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/miounet11/ccjk?style=flat&colorA=18181B&colorB=28CF8D
[stars-href]: https://github.com/miounet11/ccjk/stargazers

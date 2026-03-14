<div align="center">

# 🚀 CCJK

### Production-ready AI dev environment for Claude Code, Codex, and modern coding workflows

**30-second onboarding · Persistent memory · Agent Teams · Remote control**

<br/>

```bash
npx ccjk
```

<br/>

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)
[![stars](https://img.shields.io/github/stars/miounet11/ccjk?style=flat-square)](https://github.com/miounet11/ccjk/stargazers)
[![Agent Browser](https://img.shields.io/badge/agent--browser-ready-111827?style=flat-square)](https://github.com/vercel-labs/agent-browser)

[English](./README.en.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md)

</div>

---

## ✨ Why CCJK

- **30-second onboarding** for Claude Code, Codex, MCP services, and browser automation
- **Persistent project memory** so your AI stops forgetting architecture and conventions
- **Capability discovery + presets** so recommended tools and permission profiles are easier to apply
- **Smarter model + context usage** to cut waste and keep long sessions usable
- **Cloud sync and remote control** so your setup follows you across devices
- **Production-ready defaults** with hardened config, validation, and safer automation

## 💡 What is CCJK?

The production layer on top of [Claude Code](https://github.com/anthropics/claude-code), Codex, and the rest of your AI coding workflow:

```diff
- Manually configure Claude Code for 60+ minutes
- Repeat project context every conversation
- Pay 3x more tokens than necessary
- Lose configs when switching machines

+ One command setup in 30 seconds
+ AI remembers your entire codebase
+ 30-50% token cost reduction
+ Cloud sync across all devices
```

## ⚡ Quick Start

```bash
# Guided onboarding (recommended)
npx ccjk

# Non-interactive onboarding (CI / automation)
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# Harden and personalize the environment
npx ccjk boost
npx ccjk zc --preset dev
```

```bash
# Optional next steps
npx ccjk remote setup
npx ccjk mcp list
npx ccjk browser open https://example.com --headed
```

**What just happened?**

- ✅ Auto-detected your project type (React/Vue/Node/Python/Go/Rust/etc)
- ✅ Configured optimal MCP services for your stack
- ✅ Surfaced capability discovery hints and preset-friendly defaults
- ✅ Set up persistent memory (AI remembers your codebase)
- ✅ Enabled smart context compression (30-50% token reduction)
- ✅ Installed Agent Browser for seamless browser tasks
- ✅ Ready for cloud sync (optional)

**Before CCJK:**

```
❌ 60+ minutes manual configuration
❌ Repeat context every conversation
❌ High API costs
❌ Configs lost when switching machines
❌ Single-threaded AI execution
❌ Can't control Claude from mobile/web
❌ Insecure defaults in production
```

**After CCJK:**

```
✅ 30 seconds one-command setup
✅ AI remembers everything
✅ 30-50% lower costs
✅ Cloud sync across devices
✅ Parallel AI agents (Agent Teams)
✅ Remote control from any device (v11.1.1)
✅ Production-hardened security (v11.1.1)
```

## 🎯 Why Developers Love CCJK

| Problem                                 | CCJK Solution                         | Impact                                                |
| :-------------------------------------- | :------------------------------------ | :---------------------------------------------------- |
| 😫 "Claude forgot my project structure" | 🧠 **Persistent Memory**              | AI remembers everything across sessions               |
| 💸 "My API bills are insane"            | ⚡ **Smart Compression**              | 30-50% token reduction                                |
| ⏰ "Setup takes forever"                | 🔧 **Minimal Config**                 | 30 seconds, one command                               |
| 🧭 "I don't know what to enable"        | 🧩 **Capability Discovery + Presets** | Recommended services and permission profiles          |
| 🔄 "Lost my configs again"              | ☁️ **Cloud Sync**                     | GitHub Gist / WebDAV / S3                             |
| 🤖 "Need multiple AI agents"            | 🎭 **Agent Teams**                    | One-click parallel execution                          |
| 📱 "Can't control Claude from my phone" | 🌐 **Remote Control**                 | Web/App control with one-command setup                |
| 🔐 "Worried about production security"  | 🛡️ **Production-Grade Security**      | HTTPS enforcement, CORS hardening, secrets validation |

## 🏆 Built For Real Work

- **Claude Code users** who want setup done once, correctly
- **Teams** who need repeatable onboarding and shared conventions
- **Power users** who want memory, MCP, browser automation, and multi-agent workflows in one CLI
- **API users** who care about reducing token waste without losing context quality

## 🔥 Features That Matter

### 🧠 Persistent Memory

Manage Claude Code memory and project notes from the CLI.

```bash
ccjk memory
ccjk memory --edit
```

### 🤖 Agent Teams (NEW)

Parallel AI execution for complex tasks.

```bash
ccjk agent-teams --on
# One agent writes code, another writes tests, simultaneously
```

### ⚡ Smart Context Compression

Automatic conversation cleanup before hitting token limits.

- 30-50% token reduction (rule-based) or 40-60% (LLM-based)
- Zero manual intervention
- Preserves critical context

### ☁️ Cloud Sync

Your configs follow you everywhere.

```bash
ccjk cloud enable --provider github-gist  # Free
ccjk cloud enable --provider webdav       # Self-hosted
ccjk cloud enable --provider s3           # Enterprise
```

### 🎯 Smart Skills

Auto-activated based on your workflow:

- **Code Review** — Catch bugs before production
- **Security Audit** — OWASP Top 10 scanning
- **Performance** — Identify bottlenecks
- **Docs** — Auto-generate from code

### 🔌 MCP Marketplace

One-click install for 50+ MCP services:

```bash
ccjk mcp install filesystem puppeteer postgres
# Done. No manual config.
```

### 🌐 Browser Automation (Out of the Box)

Use browser skills directly after install:

```bash
ccjk browser start https://example.com
ccjk browser status
ccjk browser stop
```

### 🌐 Remote Control (NEW in v11.1.1)

Control Claude Code from any device — browser, phone, or tablet.

```bash
ccjk remote setup    # One-command: configure server URL, auth token & binding in 30s
ccjk remote doctor   # Diagnose connectivity, auth, daemon health
ccjk remote status   # Live runtime status (daemon, server, auth)
```

**Supports both interactive and non-interactive (CI/CD) modes:**

```bash
ccjk remote setup --non-interactive \
  --server-url https://your-server.com \
  --auth-token <token> \
  --binding-code <code>
```

### 🛡️ Production-Grade Security (NEW in v11.1.1)

All config defaults are now hardened for real-world deployments:

- ✅ **HTTPS enforcement** — All service URLs require `https://` in production
- ✅ **CORS hardening** — Wildcard `*` origins rejected in production
- ✅ **Secret validation** — Dev-default secrets (`dev-secret`, `dev-session-secret`) blocked at startup
- ✅ **Fail-fast boot** — Server exits immediately on misconfiguration, no silent fallbacks
- ✅ **Daemon config loading** — Reads from `~/.ccjk/daemon.json`, validates required fields

### 🔓 Zero-Config Permission Presets (NEW)

One-click permission configuration for different use cases:

```bash
ccjk zc --list              # View available presets
ccjk zc --preset max        # Maximum permissions (all commands)
ccjk zc --preset dev        # Developer preset (build tools, git, npm)
ccjk zc --preset safe       # Safe preset (read-only operations)
```

**Available Presets:**

- **max** — All common commands, file operations, and MCP servers (100+ permissions)
- **dev** — Build tools, git, package managers, and file operations (50+ permissions)
- **safe** — Read-only commands, no file modifications (20+ permissions)

Each preset automatically:

- ✅ Backs up your current settings
- ✅ Merges with existing permissions (no data loss)
- ✅ Removes invalid/dangerous patterns
- ✅ Shows exactly what will be added

## 📖 Essential Commands

```bash
# Setup & Config
ccjk               # Interactive menu
ccjk init          # Full initialization
ccjk init --silent # Silent mode (non-interactive, uses env vars)
ccjk status        # Health check + recommendations
ccjk boost         # One-click optimization
ccjk zc --preset dev # Apply recommended developer permissions

# Agent Teams (NEW)
ccjk agent-teams --on     # Enable parallel AI execution
ccjk at --status          # Check status

# Cloud Sync
ccjk cloud enable --provider github-gist
ccjk cloud sync

# Remote Control (Web/App)
ccjk remote setup                       # One-command setup (interactive)
ccjk remote setup --non-interactive --server-url <url> --auth-token <token> --binding-code <code>
ccjk remote doctor                      # Diagnose remote readiness
ccjk remote status                      # Quick runtime status

# MCP Services
ccjk mcp install <service>
ccjk mcp list

# Browser Automation
ccjk browser start <url>
ccjk browser status
ccjk browser stop

# Memory & Context
ccjk memory
ccjk memory --edit

# Zero-Config Permission Presets (NEW)
ccjk zc --list       # List available presets
ccjk zc --preset max # Apply maximum permissions
ccjk zc --preset dev # Apply developer preset
ccjk zc --preset safe # Apply safe (read-only) preset

# Other Commands
npx ccjk u         # Update workflows
npx ccjk sync      # Cloud sync
npx ccjk doctor    # Health check
```

## 💬 What Developers Say

> "CCJK cut my Claude Code setup from 2 hours to 30 seconds. Game changer."
> — _Senior Engineer at YC Startup_

> "The Agent Teams feature is insane. One agent writes code, another writes tests, simultaneously."
> — _Full-stack Developer_

> "Saved $200/month on API costs with the context compression alone."
> — _Indie Hacker_

## 🌟 Why Star This Repo?

If CCJK saved you hours of setup time or cut your API costs, **give us a star!** ⭐

It helps other developers discover this tool and motivates us to keep improving it.

<div align="center">

### 🎉 Join 1000+ developers using CCJK

**[⭐ Star on GitHub](https://github.com/miounet11/ccjk)** · **[📦 View on npm](https://www.npmjs.com/package/ccjk)** · **[💬 Join Telegram](https://t.me/ccjk_community)**

</div>

---

## 📖 Documentation

Visit [docs/README.md](./docs/README.md) for full documentation.

## 💬 Community & Support

- **[Telegram](https://t.me/ccjk_community)** — Real-time chat and help
- **[GitHub Issues](https://github.com/miounet11/ccjk/issues)** — Bug reports & feature requests
- **[Discussions](https://github.com/miounet11/ccjk/discussions)** — Questions and community chat

## 🤝 Contributing

We welcome contributions! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📖 Documentation improvements
- 🔧 Code contributions

Check out our [Contributing Guide](./CONTRIBUTING.md) to get started.

## 🙏 Acknowledgments

Built on top of:

- [Claude Code](https://github.com/anthropics/claude-code) by Anthropic
- [ZCF](https://github.com/UfoMiao/zcf) by UfoMiao

Special thanks to all contributors and the 1000+ developers using CCJK daily.

## ⭐ Star History

If CCJK helped you, consider giving us a star!

[![Star History Chart](https://api.star-history.com/svg?repos=miounet11/ccjk&type=Date)](https://star-history.com/#miounet11/ccjk&Date)

## 📄 License

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)

---

<div align="center">

**Made with ❤️ by developers, for developers**

[⭐ Star](https://github.com/miounet11/ccjk) · [📦 npm](https://www.npmjs.com/package/ccjk) · [🐛 Issues](https://github.com/miounet11/ccjk/issues) · [💬 Discussions](https://github.com/miounet11/ccjk/discussions)

</div>

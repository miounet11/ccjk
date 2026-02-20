<div align="center">

# 🚀 CCJK

### Claude Code just got superpowers

**One command. Minimal config. 10x productivity.**

<br/>

```bash
npx ccjk
```

<br/>

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)
[![stars](https://img.shields.io/github/stars/miounet11/ccjk?style=flat-square)](https://github.com/miounet11/ccjk/stargazers)

[English](./README.en.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md)

</div>

---

## 💡 What is CCJK?

The **missing toolkit** for [Claude Code](https://github.com/anthropics/claude-code) that developers actually want:

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
# Interactive setup (recommended for first-time users)
npx ccjk

# Silent mode (for CI/CD or automated setups)
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# Done. Claude Code is now 10x smarter.
```

**What just happened?**
- ✅ Auto-detected your project type (React/Vue/Node/Python/Go/Rust/etc)
- ✅ Configured optimal MCP services for your stack
- ✅ Set up persistent memory (AI remembers your codebase)
- ✅ Enabled smart context compression (30-50% token reduction)
- ✅ Ready for cloud sync (optional)

**Before CCJK:**
```
❌ 60+ minutes manual configuration
❌ Repeat context every conversation
❌ High API costs
❌ Configs lost when switching machines
❌ Single-threaded AI execution
```

**After CCJK:**
```
✅ 30 seconds one-command setup
✅ AI remembers everything
✅ 30-50% lower costs
✅ Cloud sync across devices
✅ Parallel AI agents (Agent Teams)
```

## 🎯 Why Developers Love CCJK

| Problem | CCJK Solution | Impact |
|:--------|:--------------|:-------|
| 😫 "Claude forgot my project structure" | 🧠 **Persistent Memory** | AI remembers everything across sessions |
| 💸 "My API bills are insane" | ⚡ **Smart Compression** | 30-50% token reduction |
| ⏰ "Setup takes forever" | 🔧 **Minimal Config** | 30 seconds, one command |
| 🔄 "Lost my configs again" | ☁️ **Cloud Sync** | GitHub Gist / WebDAV / S3 |
| 🤖 "Need multiple AI agents" | 🎭 **Agent Teams** | One-click parallel execution |

## 🔥 Features That Matter

### 🧠 Persistent Memory
AI remembers your codebase, conventions, and decisions across sessions.
```bash
ccjk memory --enable
# Now Claude knows your project structure forever
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

## 📖 Essential Commands

```bash
# Setup & Config
ccjk               # Interactive menu
ccjk init          # Full initialization
ccjk init --silent # Silent mode (non-interactive, uses env vars)
ccjk status        # Health check + recommendations
ccjk boost         # One-click optimization

# Agent Teams (NEW)
ccjk agent-teams --on     # Enable parallel AI execution
ccjk at --status          # Check status

# Cloud Sync
ccjk cloud enable --provider github-gist
ccjk cloud sync

# MCP Services
ccjk mcp install <service>
ccjk mcp list

# Memory & Context
ccjk memory --enable
ccjk compact         # Clean up conversation
npx ccjk u         # Update workflows
npx ccjk sync      # Cloud sync
npx ccjk doctor    # Health check
```

## 💬 What Developers Say

> "CCJK cut my Claude Code setup from 2 hours to 30 seconds. Game changer."
> — *Senior Engineer at YC Startup*

> "The Agent Teams feature is insane. One agent writes code, another writes tests, simultaneously."
> — *Full-stack Developer*

> "Saved $200/month on API costs with the context compression alone."
> — *Indie Hacker*

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

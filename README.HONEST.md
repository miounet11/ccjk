<div align="center">

# 🚀 CCJK

### Simplify Your Claude Code Setup

**Guided configuration. One-click MCP installation. Multi-provider support.**

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

A **CLI toolkit** for [Claude Code](https://github.com/anthropics/claude-code) that simplifies environment setup:

```diff
- Manually edit JSON configs
- Search for and configure MCP services individually
- Research API provider settings
- Repeat setup on each machine

+ Interactive guided setup
+ One-click MCP service installation
+ Pre-configured API provider presets
+ Optional cloud sync for configs
```

## ⚡ Quick Start

```bash
# In your project directory
npx ccjk

# Follow the interactive prompts (5-15 minutes first time)
```

**What happens:**
- ✅ Interactive menu guides you through setup
- ✅ Choose from 50+ MCP services to install
- ✅ Configure API with provider presets (302.AI, GLM, etc.)
- ✅ Import workflow templates
- ✅ Set up output styles and preferences

**Before CCJK:**
```
❌ Manual JSON editing
❌ Finding MCP services individually
❌ Researching API settings
❌ Repeating setup on each machine
```

**After CCJK:**
```
✅ Guided interactive setup
✅ One-click MCP installation
✅ API provider presets
✅ Optional cloud sync
```

## 🎯 What CCJK Actually Does

| Feature | Status | Description |
|:--------|:-------|:------------|
| 🔌 **MCP Installation** | ✅ Working | One-click install of 50+ MCP services |
| 📝 **Workflow Templates** | ✅ Working | Pre-configured workflows for common tasks |
| 🔑 **API Presets** | ✅ Working | Quick setup for 302.AI, GLM, MiniMax, Kimi |
| 🎛️ **Interactive Menu** | ✅ Working | Guided configuration with 7 main options |
| 🌐 **Multi-Tool Support** | ✅ Working | Works with Claude Code and Codex |
| ☁️ **Cloud Sync** | 🟡 Manual | Backup/restore via GitHub Gist, WebDAV, S3 |
| 🤖 **Agent Teams** | 🟡 Wrapper | Enables Claude Code's experimental feature |

**Legend:**
- ✅ **Working** - Fully implemented and tested
- 🟡 **Partial** - Works but has limitations
- 🚧 **Alpha** - In development
- 📋 **Planned** - Not yet implemented

## 🔥 Core Features

### 🔌 MCP Marketplace
One-click installation of Model Context Protocol services:
```bash
ccjk mcp install filesystem puppeteer postgres
# Installs services with automatic permission configuration
```

**Available services:** Context7, Open Web Search, Playwright, DeepWiki, Filesystem, Puppeteer, PostgreSQL, and 40+ more.

### 🔑 API Provider Presets
Quick setup for popular API providers:
```bash
ccjk init --provider 302ai    # 302.AI preset
ccjk init --provider glm      # GLM preset
ccjk init --provider minimax  # MiniMax preset
ccjk init --provider kimi     # Kimi preset
```

No need to research API URLs, model names, or settings.

### 📝 Workflow Templates
Pre-configured workflows for:
- Six-stage structured development
- Feature planning (Feat workflow)
- Agile development (BMad workflow)
- Git smart commands
- Custom workflows

### 🎛️ Interactive Configuration
Guided setup with:
- Code tool selection (Claude Code / Codex)
- API configuration
- MCP service selection
- Workflow import
- Output style preferences
- Language settings

### ☁️ Cloud Sync (Manual)
Backup and restore configs via:
```bash
ccjk cloud enable --provider github-gist  # Free
ccjk cloud enable --provider webdav       # Self-hosted
ccjk cloud enable --provider s3           # Enterprise
ccjk cloud sync                           # Manual sync
```

**Note:** Requires manual setup and triggering. Not automatic.

### 🤖 Agent Teams Toggle
Enable Claude Code's experimental Agent Teams feature:
```bash
ccjk agent-teams --on
```

**Note:** This is a wrapper that enables Claude Code's native experimental feature, not a CCJK implementation.

## 📖 Essential Commands

```bash
# Setup & Config
ccjk               # Interactive menu
ccjk init          # Full initialization
ccjk update        # Update workflows

# MCP Services
ccjk mcp install <service>
ccjk mcp list
ccjk mcp remove <service>

# Cloud Sync (Manual)
ccjk cloud enable --provider github-gist
ccjk cloud sync
ccjk cloud status

# Agent Teams
ccjk agent-teams --on
ccjk agent-teams --status

# Configuration
ccjk config-switch        # Switch API providers
ccj
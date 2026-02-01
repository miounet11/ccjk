# CCJK 交互式菜单系统

## 快速开始

```bash
# 启动交互式菜单
ccjk

# 或者使用传统命令
ccjk chat
ccjk init
```

## 菜单结构

### 🔑 API 配置管理（核心功能）

一键配置 API 密钥，支持多种 AI 提供商：

- **Anthropic** - Claude 系列模型
- **OpenAI** - GPT 系列模型
- **Google** - Gemini 系列模型
- **智谱 AI** - GLM 系列模型
- **DeepSeek** - DeepSeek 系列模型
- **阿里云** - 通义千问系列
- **火山引擎** - 豆包系列
- **自定义** - 任意 OpenAI 兼容 API

### 📚 Skills 管理

管理和配置 AI 技能模板。

### 🔌 MCP 服务器

配置 Model Context Protocol 服务器。

### 💬 会话管理

管理对话历史和会话。

### ⚙️ 设置

配置 CCJK 的各项设置。

## 设计理念

- **Zero-Config** - 开箱即用，无需复杂配置
- **渐进式** - 从简单开始，按需深入
- **兼容性优先** - 支持各种终端环境

## 技术实现

菜单系统基于以下模块：

- `src/menu/engine.ts` - 菜单引擎
- `src/menu/renderer.ts` - 渲染器
- `src/menu/main-menu.ts` - 主菜单配置
- `src/menu/adapters/` - 功能适配器

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
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/anthropics/claude-code/pulls)

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

[![GitHub Discussions](https://img.shields.io/badge/GitHub-讨论区-333?style=for-the-badge&logo=github)](https://github.com/anthropics/claude-code/discussions)
[![Discord](https://img.shields.io/badge/Discord-加入服务器-5865F2?style=for-the-badge&logo=discord)](https://discord.gg/ccjk)
[![微信](https://img.shields.io/badge/微信-扫码加群-07C160?style=for-the-badge&logo=wechat)](https://github.com/anthropics/claude-code)

</div>

- 🐛 **Bug报告**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/anthropics/claude-code/discussions)

---

## 🤝 参与贡献

```bash
git clone https://github.com/anthropics/claude-code.git
cd ccjk
pnpm install
pnpm dev
```

详情请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📄 许可证

MIT © [CCJK Team](https://github.com/anthropics/claude-code)

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
[license-href]: https://github.com/anthropics/claude-code/blob/main/LICENSE
[stars-src]: https://img.shields.io/github/stars/anthropics/claude-code?style=flat&colorA=18181B&colorB=28CF8D
[stars-href]: https://github.com/anthropics/claude-code/stargazers

---
title: 使用指南
---

# 使用指南

这里给出当前希望在 GitHub、npm 和文档站统一采用的安装与 onboarding 路径。

## 环境要求

开始前请确认：

| 要求项       | 最低版本        | 推荐版本    | 说明                                         |
| ------------ | --------------- | ----------- | -------------------------------------------- |
| **Node.js**  | 20.x            | 20.x 或更高 | 与当前发布包要求一致                         |
| **npm**      | 随 Node.js 安装 | 最新版      | 需要支持 `npx` 命令                          |
| **操作系统** | -               | -           | macOS、Linux、Windows PowerShell/WSL、Termux |

如有需要，可先检查环境：

```bash
node --version
npm --version
npx --version
```

如果 Node.js 低于 20，请先升级。

## 默认 onboarding 路径

现在建议把路径分成两类：

- `npx ccjk`：引导式 onboarding
- `npx ccjk init --silent`：CI、脚本、自动化

### 引导式 onboarding

如果是手动配置机器，先执行：

```bash
npx ccjk
```

它会引导用户完成首轮 setup 和推荐能力启用。重点不是记住每一个菜单项，而是尽快到达可用状态。

首次运行后，建议紧接着执行：

```bash
npx ccjk boost
npx ccjk zc --preset dev
```

这对应当前文档主线：

- 先 onboarding
- 再优化
- 最后补权限预设

### 无交互初始化

在 CI 或脚本里，使用：

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent
```

需要注意：

- 必须提供 `ANTHROPIC_API_KEY`
- CCJK 会自动选择 smart defaults
- 这条路径是自动化路径，不是默认的新手路径

## 安装后推荐命令

```bash
npx ccjk boost
npx ccjk zc --preset dev
npx ccjk doctor
```

用途分别是：

- `boost`：在初装后进一步优化环境
- `zc --preset dev`：应用推荐的开发者权限预设
- `doctor`：当 onboarding 不完整或环境异常时做诊断

## 可选能力

```bash
npx ccjk remote setup
npx ccjk mcp list
npx ccjk agent-teams --on
```

- `remote setup`：开启浏览器或移动端远程控制
- `mcp list`：查看可用或已安装的 MCP 服务
- `agent-teams --on`：开启并行代理能力

## 如果你在更新旧文档或内部手册

建议按下面的映射改写：

| 旧表述                            | 新表述                                   |
| --------------------------------- | ---------------------------------------- |
| `npx ccjk init` 是默认新手入口    | `npx ccjk` 才是默认新手入口              |
| 把 provider preset 作为最上层故事 | 先讲 guided onboarding，再讲 silent init |
| 权限配置埋在很后面                | 更早暴露 `npx ccjk zc --preset <id>`     |
| 远程控制是独立深水区专题          | 远程控制已进入主能力集合                 |

## 下一步阅读

- [快速开始](./index.md)
- [CLI 概览](../cli/index.md)
- [远程控制总览](../../remote-control-summary.md)

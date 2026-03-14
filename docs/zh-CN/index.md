---
title: CCJK
---

# CCJK

CCJK 现在应该被理解为一套面向 Claude Code 的生产级 AI 开发环境，默认主路径是：

- 30 秒 onboarding
- 持久记忆
- Agent Teams
- 远程控制
- capability discovery + presets
- 更接近生产环境的默认配置

## 推荐路径

```bash
# 引导式 onboarding
npx ccjk

# CI / 自动化
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# 安装后的收敛动作
npx ccjk boost
npx ccjk zc --preset dev
```

## 每一步在做什么

- `npx ccjk`：面向首次用户的交互式引导
- `npx ccjk init --silent`：面向脚本和 CI 的无交互初始化
- `npx ccjk boost`：安装后再做一次环境优化
- `npx ccjk zc --preset dev`：应用推荐权限预设

## 从这里继续

- [快速开始](./getting-started/index.md)
- [安装指南](./getting-started/installation.md)
- [CLI 概览](./cli/index.md)
- [功能特性](./features/index.md)
- [高级主题](./advanced/index.md)

## 高价值专题

- [远程控制总览](../remote-control-summary.md)
- [Agent Teams](../agent-teams.md)
- [持久记忆](../persistence-manager.md)
- [零配置权限预设](../zero-config-permissions.md)

## 外部链接

- GitHub：<https://github.com/miounet11/ccjk>
- npm：<https://www.npmjs.com/package/ccjk>
- Issues：<https://github.com/miounet11/ccjk/issues>

---
title: 快速开始
---

# 快速开始

这里给出 CCJK 当前推荐的默认 onboarding 路径。

## 推荐顺序

1. 先运行 `npx ccjk`，走引导式 onboarding。
2. 需要 CI 或脚本时，再用 `npx ccjk init --silent`。
3. 安装完成后运行 `npx ccjk boost` 做一次环境优化。
4. 用 `npx ccjk zc --preset dev` 应用权限预设。
5. 只有在需要浏览器或移动端远程接入时，再执行 `npx ccjk remote setup`。

## 为什么推荐这条路径

- 它和当前 README、npm 叙事一致。
- 它把 `npx ccjk` 作为首次使用的主入口。
- 它把 `init --silent` 明确为自动化路径，而不是默认新手路径。
- 它更早暴露 capability discovery 和 permission presets。

## 继续阅读

- [安装指南](installation.md)
- [CLI 概览](../cli/index.md)
- [功能特性](../features/index.md)

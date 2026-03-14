<div align="center">

# CCJK

### 面向 Claude Code、Codex 与现代 AI 编码工作流的生产级开发环境

**30 秒上手 · 持久记忆 · Agent Teams · 远程控制**

```bash
npx ccjk
```

[![npm](https://img.shields.io/npm/v/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![downloads](https://img.shields.io/npm/dm/ccjk?style=flat-square&color=cb3837)](https://www.npmjs.com/package/ccjk)
[![license](https://img.shields.io/github/license/miounet11/ccjk?style=flat-square)](./LICENSE)

[English](./README.md) · [中文](./README.zh-CN.md) · [日本語](./README.ja.md)

</div>

---

## CCJK 现在强调什么

- **30 秒 onboarding**：把 Claude Code、Codex、MCP 和浏览器自动化拉到可用状态
- **持久记忆**：让 AI 跨会话记住项目结构、约定和上下文
- **Agent Teams**：复杂任务支持并行执行
- **远程控制**：可从浏览器或移动端接入会话
- **Capability Discovery + Presets**：发现推荐能力，并配合权限预设快速落地
- **Production-ready defaults**：默认配置更接近真实生产环境

## 推荐上手路径

```bash
# 首次使用，走引导式 onboarding
npx ccjk

# 自动化 / CI
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# 安装后建议补两步
npx ccjk boost
npx ccjk zc --preset dev
```

可选后续：

```bash
npx ccjk remote setup
npx ccjk doctor
npx ccjk mcp list
```

## 为什么这条路径是主路径

| 场景         | 对应命令                   | 作用                         |
| :----------- | :------------------------- | :--------------------------- |
| 首次上手     | `npx ccjk`                 | 用引导式流程完成 onboarding  |
| 自动化初始化 | `npx ccjk init --silent`   | 在 CI 或脚本中无交互落地配置 |
| 配置优化     | `npx ccjk boost`           | 做一次环境收敛和优化         |
| 权限收口     | `npx ccjk zc --preset dev` | 应用推荐权限预设             |
| 远程接入     | `npx ccjk remote setup`    | 配置远程控制                 |

## 常用能力

- **Persistent Memory**：减少重复解释项目背景
- **Agent Teams**：把多代理并行能力直接接入 CLI
- **Remote Control**：浏览器、手机、平板都能控会话
- **Capability Discovery**：帮助用户理解该启用哪些能力
- **Zero-Config Presets**：快速应用 `max`、`dev`、`safe` 等权限配置

## 文档入口

- 总文档索引：[docs/README.md](./docs/README.md)
- 英文站点入口：[docs/en/index.md](./docs/en/index.md)
- 中文站点入口：[docs/zh-CN/index.md](./docs/zh-CN/index.md)

## 社区

- [Telegram](https://t.me/ccjk_community)
- [GitHub Issues](https://github.com/miounet11/ccjk/issues)

## 许可证

MIT © [CCJK Contributors](https://github.com/miounet11/ccjk/graphs/contributors)

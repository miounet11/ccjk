---
title: 命令概览
---

# 命令概览

CCJK CLI 基于 `cac` 实现，所有命令均可通过 `npx ccjk <command>` 调用。常用命令如下：

| 命令 | 说明 |
| --- | --- |
| `ccjk` | 打开交互式菜单，聚合所有功能 |
| `ccjk init` / `ccjk i` | 完整初始化，覆盖 Claude Code 或 Codex |
| `ccjk update` / `ccjk u` | 更新工作流与模板，可选择语言与输出样式 |
| `ccjk ccr` | 管理 Claude Code Router 代理 |
| `ccjk ccu` | Claude Code 使用分析与统计 |
| `ccjk uninstall` | 卸载配置并可选择保留备份 |
| `ccjk config-switch` / `ccjk cs` | 在多套配置之间切换 |
| `ccjk check-updates` / `ccjk check` | 检查并升级工具链 |

每个命令均支持 `--help` 查看详细参数。以下章节将逐一说明。

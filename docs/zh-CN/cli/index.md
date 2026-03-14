---
title: 命令概览
---

# 命令概览

CCJK CLI 通过 `npx ccjk <command>` 暴露。当前最值得用户优先看到的命令如下：

| 命令                    | 说明                         |
| ----------------------- | ---------------------------- |
| `ccjk`                  | 引导式 onboarding 和交互菜单 |
| `ccjk init --silent`    | 面向 CI 和脚本的无交互初始化 |
| `ccjk boost`            | 安装后的环境优化             |
| `ccjk zc --preset <id>` | 应用零配置权限预设           |
| `ccjk remote setup`     | 配置远程控制                 |
| `ccjk doctor`           | 诊断环境问题                 |
| `ccjk mcp list`         | 查看 MCP 服务                |
| `ccjk agent-teams --on` | 开启 Agent Teams             |
| `ccjk memory`           | 管理持久记忆                 |
| `ccjk update`           | 更新工作流与模板             |

推荐默认路径：

```bash
npx ccjk
npx ccjk boost
npx ccjk zc --preset dev
```

只有在需要自动化时，再使用 `init --silent`。

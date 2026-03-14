---
title: Commands Overview
---

# Commands Overview

CCJK CLI is exposed through `npx ccjk <command>`. The current high-signal commands are:

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `ccjk`                  | Guided onboarding and interactive menu   |
| `ccjk init --silent`    | Non-interactive setup for CI and scripts |
| `ccjk boost`            | One-click post-install optimization      |
| `ccjk zc --preset <id>` | Apply a zero-config permission preset    |
| `ccjk remote setup`     | Configure remote control                 |
| `ccjk doctor`           | Diagnose environment problems            |
| `ccjk mcp list`         | Inspect MCP services                     |
| `ccjk agent-teams --on` | Enable Agent Teams                       |
| `ccjk memory`           | Manage persistent memory                 |
| `ccjk update`           | Refresh workflows and templates          |

Recommended default path:

```bash
npx ccjk
npx ccjk boost
npx ccjk zc --preset dev
```

Use `init --silent` only when you need automation.

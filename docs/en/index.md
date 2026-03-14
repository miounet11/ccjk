---
title: CCJK
---

# CCJK

CCJK turns Claude Code into a production-ready AI dev environment with a tighter default path:

- 30-second onboarding
- persistent memory
- Agent Teams
- remote control
- capability discovery + presets
- production-ready defaults

## Recommended Path

```bash
# Guided onboarding
npx ccjk

# CI / automation
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent

# Post-install refinement
npx ccjk boost
npx ccjk zc --preset dev
```

## What Each Step Does

- `npx ccjk` walks a user through onboarding and recommended capabilities.
- `npx ccjk init --silent` applies a non-interactive setup flow for scripts and CI.
- `npx ccjk boost` tightens the environment after the initial install.
- `npx ccjk zc --preset dev` applies a recommended permission profile.

## Start Reading

- [Getting Started](./getting-started/index.md)
- [Installation Guide](./getting-started/installation.md)
- [CLI Overview](./cli/index.md)
- [Features](./features/index.md)
- [Advanced Topics](./advanced/index.md)

## High-Value Feature Docs

- [Remote Control Summary](../remote-control-summary.md)
- [Agent Teams](../agent-teams.md)
- [Persistent Memory](../persistence-manager.md)
- [Zero-Config Permissions](../zero-config-permissions.md)

## External Links

- GitHub: <https://github.com/miounet11/ccjk>
- npm: <https://www.npmjs.com/package/ccjk>
- Issues: <https://github.com/miounet11/ccjk/issues>

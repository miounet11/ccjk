---
title: Installation Guide
---

# Installation Guide

This is the current installation and onboarding path we want users to follow from GitHub, npm, and the docs site.

## Environment Requirements

Before you start:

| Requirement          | Minimum Version        | Recommended Version | Description                                  |
| -------------------- | ---------------------- | ------------------- | -------------------------------------------- |
| **Node.js**          | 20.x                   | 20.x or higher      | Required by the published package            |
| **npm**              | Installed with Node.js | Latest              | Requires `npx` command support               |
| **Operating System** | -                      | -                   | macOS, Linux, Windows PowerShell/WSL, Termux |

Check your environment if needed:

```bash
node --version
npm --version
npx --version
```

If your Node.js version is below 20, upgrade first.

## Default Onboarding Paths

CCJK now has two clear paths:

- `npx ccjk` for guided onboarding
- `npx ccjk init --silent` for CI, scripts, or repeatable automation

### Guided Onboarding

Use this if you are setting up a machine manually:

```bash
npx ccjk
```

CCJK will guide the user through first-run setup and recommended capabilities. The goal is not to memorize every menu option. The goal is to get to a usable environment quickly.

After the initial run, the recommended follow-up is:

```bash
npx ccjk boost
npx ccjk zc --preset dev
```

That sequence reflects the current docs story:

- onboarding first
- optimization second
- permission preset third

### Silent Setup

Use silent setup when you need a reproducible non-interactive flow:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
npx ccjk init --silent
```

Important behavior:

- `ANTHROPIC_API_KEY` is required.
- CCJK applies smart defaults automatically.
- This path is intended for CI and scripts, not first-time guided onboarding.

## Recommended Post-Install Commands

```bash
npx ccjk boost
npx ccjk zc --preset dev
npx ccjk doctor
```

Use these for:

- `boost`: optimize the environment after setup
- `zc --preset dev`: apply a recommended developer permission preset
- `doctor`: diagnose problems if onboarding did not finish cleanly

## Optional Capabilities

```bash
npx ccjk remote setup
npx ccjk mcp list
npx ccjk agent-teams --on
```

- `remote setup` enables browser/mobile remote control
- `mcp list` shows installed or available MCP services
- `agent-teams --on` enables parallel agent execution

## If You Are Updating Old Docs or Internal Runbooks

Use this mapping:

| Older framing                                      | Current framing                                          |
| -------------------------------------------------- | -------------------------------------------------------- |
| `npx ccjk init` as the main beginner path          | `npx ccjk` as the main beginner path                     |
| Provider preset walkthrough as the top-level story | Guided onboarding first, silent init second              |
| Permissions buried later in setup                  | `npx ccjk zc --preset <id>` surfaced early               |
| Remote control treated as separate deep feature    | Remote control is now part of the primary capability set |

## Next Reading

- [Quick Start](./index.md)
- [CLI Overview](../cli/index.md)
- [Remote Control Summary](../../remote-control-summary.md)

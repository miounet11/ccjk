---
title: Workflow System
---

# Workflow System

CCJK pre-configures multiple workflows through `WORKFLOW_CONFIG_BASE` and automatically imports them during initialization or updates:

## Pre-configured Workflows Overview

| ID | Category | Default | Command File | Description | Claude Code | Codex |
| --- | --- | --- | --- | --- | ----------- | ----- |
| `commonTools` | common | Yes | `init-project.md` | Provides project initialization and common tool commands | ✅ | ✅ |
| `sixStepsWorkflow` | sixStep | Yes | `workflow.md` | Six-stage structured development workflow (Research→Ideation→Planning→Execution→Optimization→Review) | ✅ | ✅ |
| `featPlanUx` | plan | Yes | `feat.md` | Feature development workflow, includes planning and UI/UX agents | ✅ | ✅ |
| `gitWorkflow` | git | Yes | `git-commit.md` etc. | Git commit, rollback, cleanup, worktree management | ✅ | ✅ |
| `bmadWorkflow` | bmad | Yes | `bmad-init.md` | BMad agile process entry | ✅ | ❌ |

> ⚠️ **Note**: BMad is still Claude Code-only. Codex supports the six-stage workflow, feature planning, project bootstrap, Git helpers, and selected advanced prompt packs installed into `~/.codex/prompts/`.

## Installation and Updates

- `ccjk init` imports all workflows by default. Users can selectively install via `--workflows`.
- `ccjk update` re-executes workflow import after template updates to ensure content synchronization.
- Workflow files are installed into each tool's native command directory. For Codex, that is `~/.codex/prompts/`.

## Agent Auto Installation

- For workflows requiring agents (like `featPlanUx`), CCJK will synchronously copy `agents/planner.md`, `agents/ui-ux-designer.md`.
- Supports automatic processing based on `autoInstallAgents` field.

## Command Format

CCJK workflows use different command prefixes in different tools:

| Tool | Command Prefix | Examples |
|------|---------|------|
| **Claude Code** | `/ccjk:` or `/` | `/ccjk:workflow`, `/git-commit` |
| **Codex** | `/prompts:` | `/prompts:workflow`, `/prompts:git-commit` |

> 💡 **Tip**: Codex uses `/prompts:` prefix to access all workflow commands, while Claude Code uses `/ccjk:` prefix or direct `/` prefix.

## Usage Recommendations

- When using workflows for the first time, you can ask AI to output task progress documents for easy continuation in new conversations
  - Claude Code: `/ccjk:workflow <task description>`
  - Codex: `/prompts:workflow <task description>`
- Use with Git workflows to quickly complete the cycle of requirement breakdown → coding → commit
- After completing key milestones, request AI to generate progress summaries for easy cross-conversation continuity


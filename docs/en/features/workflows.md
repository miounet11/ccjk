---
title: Workflow System
---

# Workflow System

CCJK ships a small set of real workflow bundles defined in `src/config/workflows.ts`. These bundles are installed into each tool's native command directory during `ccjk init` or `ccjk update`.

## Built-in workflow bundles

| Workflow ID | Default | Installed commands | Auto-installed agents | Claude Code | Codex |
| --- | --- | --- | --- | --- | --- |
| `interviewWorkflow` | Yes | `interview.md` | None | `/ccjk:interview` | `/prompts:interview` |
| `essentialTools` | Yes | `init-project.md`, `feat.md` | `init-architect`, `get-current-datetime`, `planner`, `ui-ux-designer` | `/ccjk:init-project`, `/ccjk:feat` | `/prompts:init-project`, `/prompts:feat` |
| `gitWorkflow` | Yes | `git-commit.md`, `git-rollback.md`, `git-cleanBranches.md`, `git-worktree.md` | None | `/ccjk:git-commit` etc. | `/prompts:git-commit` etc. |
| `sixStepsWorkflow` | No | `workflow.md` | None | `/ccjk:workflow` | `/prompts:workflow` |
| `specFirstTDD` | No | `spec-first-tdd.md` | None | `/ccjk:spec-first-tdd` | `/prompts:spec-first-tdd` |
| `continuousDelivery` | No | `continuous-delivery.md` | None | `/ccjk:continuous-delivery` | `/prompts:continuous-delivery` |
| `refactoringMaster` | No | `refactoring-master.md` | None | `/ccjk:refactoring-master` | `/prompts:refactoring-master` |
| `linearMethod` | No | `linear-method.md` | None | `/ccjk:linear-method` | `/prompts:linear-method` |

> Note: older docs may mention `commonTools` or `featPlanUx`. In the current product surface, both `/ccjk:init-project` and `/ccjk:feat` come from the `essentialTools` bundle.

## Installation locations

- **Claude Code**: `~/.claude/commands/ccjk/`
- **Codex**: `~/.codex/prompts/`
- **Feature-planning agents for Claude Code**: `~/.claude/agents/ccjk/essential/`

## Installation and updates

```bash
# Install the default workflow set
npx ccjk init

# Install a specific subset
npx ccjk init --workflows interviewWorkflow,essentialTools,gitWorkflow

# Update installed workflow content
npx ccjk update
```

CCJK copies workflow templates from `templates/common/workflow/` and keeps command filenames aligned with the final slash-command names.

## Command format by tool

| Tool | Directory | Prefix | Examples |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/commands/ccjk/` | `/ccjk:` | `/ccjk:feat`, `/ccjk:workflow`, `/ccjk:git-commit` |
| Codex | `~/.codex/prompts/` | `/prompts:` | `/prompts:feat`, `/prompts:workflow`, `/prompts:git-commit` |

## Recommended starting points

- **New feature planning**: `essentialTools` → `/ccjk:feat` or `/prompts:feat`
- **Project bootstrap**: `essentialTools` → `/ccjk:init-project` or `/prompts:init-project`
- **Structured implementation**: `sixStepsWorkflow` → `/ccjk:workflow` or `/prompts:workflow`
- **Git operations**: `gitWorkflow`
- **Interview practice**: `interviewWorkflow`

## Related pages

- [Claude Code Configuration](claude-code.md)
- [Codex Support](codex.md)
- [Feature Development Workflow](../workflows/feat.md)

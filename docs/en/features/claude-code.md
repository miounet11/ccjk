---
title: Claude Code Configuration
---

# Claude Code Configuration

CCJK provides a complete zero-configuration experience for Claude Code. `ccjk init` installs configuration, workflow commands, and optional supporting assets into Claude Code's native directories.

## Core capabilities

| Feature module | Description | Location |
| --- | --- | --- |
| API configuration | Official login, API key, and CCR proxy modes | `~/.claude/settings.json` |
| Workflow commands | Installed CCJK slash commands | `~/.claude/commands/ccjk/` |
| Workflow agents | Agents required by selected bundles | `~/.claude/agents/ccjk/` |
| Output styles | Optional AI output styles | `~/.claude/output-styles/` |
| MCP services | Installed MCP entries | `~/.claude/settings.json` |
| System prompts | Global project and user guidance | `~/.claude/CLAUDE.md` |

## Directory structure

After `ccjk init`, the Claude Code workflow surface looks like this:

```text
~/.claude/
├── settings.json
├── CLAUDE.md
├── commands/
│   └── ccjk/
│       ├── interview.md
│       ├── init-project.md
│       ├── feat.md
│       ├── workflow.md
│       ├── git-commit.md
│       ├── git-rollback.md
│       ├── git-cleanBranches.md
│       ├── git-worktree.md
│       └── ...
├── agents/
│   └── ccjk/
│       └── essential/
│           ├── init-architect.md
│           ├── get-current-datetime.md
│           ├── planner.md
│           └── ui-ux-designer.md
├── output-styles/
└── backup/
```

## Workflow bundles shipped today

| Workflow ID | Default | Claude Code commands |
| --- | --- | --- |
| `interviewWorkflow` | Yes | `/ccjk:interview` |
| `essentialTools` | Yes | `/ccjk:init-project`, `/ccjk:feat` |
| `gitWorkflow` | Yes | `/ccjk:git-commit`, `/ccjk:git-rollback`, `/ccjk:git-cleanBranches`, `/ccjk:git-worktree` |
| `sixStepsWorkflow` | No | `/ccjk:workflow` |
| `specFirstTDD` | No | `/ccjk:spec-first-tdd` |
| `continuousDelivery` | No | `/ccjk:continuous-delivery` |
| `refactoringMaster` | No | `/ccjk:refactoring-master` |
| `linearMethod` | No | `/ccjk:linear-method` |

> Older examples that reference `featPlanUx` are outdated. The feature-planning command now ships as part of `essentialTools`.

## Workflow installation

```bash
# Install the default workflow set
npx ccjk i -s

# Install a specific subset
npx ccjk i -s --workflows interviewWorkflow,essentialTools,sixStepsWorkflow

# Skip workflow installation
npx ccjk i -s --workflows skip
```

## Slash command format

CCJK installs workflow files under `~/.claude/commands/ccjk/`, so the expected Claude Code commands are:

```text
/ccjk:interview
/ccjk:init-project
/ccjk:feat
/ccjk:workflow
/ccjk:git-commit
```

## API and model management

### Official login

```text
? Select API authentication method
  ❯ Use Official Login
```

### API key mode

```bash
npx ccjk i -s -p 302ai -k "sk-xxx"
npx ccjk i -s -t api_key -k "sk-xxx" -u "https://api.example.com"
```

### CCR proxy mode

```bash
npx ccjk i -s -t ccr_proxy
npx ccjk ccr
```

## Updating workflow content

```bash
npx ccjk update
```

Use `ccjk update` when you want refreshed workflow/template content while preserving existing Claude Code configuration.

## Related pages

- [Workflow System](workflows.md)
- [Feature Development Workflow](../workflows/feat.md)
- [Codex Support](codex.md)

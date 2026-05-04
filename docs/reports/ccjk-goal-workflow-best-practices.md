# CCJK Goal Workflow Best Practices

Date: 2026-05-05

## Goal

Give Clavue and Codex one shared best-practice workflow for native `/goal`
usage while keeping durable state in the repository.

## Command Surface

Use the runtime-native command prefix for each tool:

| Runtime | User command | Installed file |
| --- | --- | --- |
| Clavue | `/ccjk:goal <task>` | `~/.clavue/commands/ccjk/goal.md` |
| Claude Code | `/ccjk:goal <task>` | `~/.claude/commands/ccjk/goal.md` |
| Codex | `/prompts:goal <task>` | `~/.codex/prompts/goal.md` |

The user-facing concept is "CCJK Goal Orchestrator"; the runtime command
syntax stays native to each tool.

## Artifact Contract

Every durable goal plan lives under:

```text
.agent/goals/<goal-id>/
  brief.md
  goals.json
  ledger.jsonl
.agent/goals/active
```

`brief.md` explains intent, success criteria, constraints, and strategy.
`goals.json` is the structured plan and current status.
`ledger.jsonl` is the append-only execution history and evidence trail.

## Runtime Policy

1. Create artifacts before implementation.
2. Set the active runtime goal when native `/goal` is available.
3. Execute exactly one active goal at a time.
4. Mark completion only after evidence exists.
5. Stop and mark `blocked` instead of skipping unclear or unsafe work.

## Codex Policy

Codex requires native goals to be enabled in `~/.codex/config.toml`:

```toml
[features]
goals = true
```

CCJK should preserve this flag whenever it rewrites Codex provider or MCP
configuration. The prompt workflow still works as an artifact fallback if the
native goal feature is unavailable.

## Clavue Policy

Clavue exposes `/goal` natively and uses CCJK workflow commands from
`~/.clavue/commands/ccjk/`. `ccjk zero-config --code-type clavue` should ensure
the goal workflow, MCP services, permissions, output styles, CCR, and native
goal availability are all ready.

## Product Decision

`goal.md` is part of the default `essentialTools` workflow bundle. This makes
the goal workflow available during ordinary zero-config onboarding without
forcing users to discover an advanced workflow pack.

Future automation can add `ccjk goals create/run/resume/status`, but the first
shipping step should be the shared command template and artifact contract.

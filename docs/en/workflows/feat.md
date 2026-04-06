---
title: Feature Development Workflow
---

# Feature Development Workflow

The feature development workflow is the planning-oriented command shipped by the `essentialTools` bundle. It is designed for feature framing, solution shaping, and implementation handoff rather than pretending to be a separate hidden platform.

## Where it comes from

- **Workflow bundle**: `essentialTools`
- **Installed command file**: `feat.md`
- **Claude Code command**: `/ccjk:feat <feature description>`
- **Codex command**: `/prompts:feat <feature description>`
- **Supporting agents**: `planner`, `ui-ux-designer`, `init-architect`, `get-current-datetime`

## What it is for

Use `/ccjk:feat` when you want a structured feature-planning pass before implementation.

Typical uses:
- clarifying requirements for a new feature
- comparing candidate solutions
- capturing UI/UX considerations
- producing an implementation-ready task breakdown

If you already know what to build and want the broader implementation loop, use `/ccjk:workflow` or `/prompts:workflow` instead.

## Tool-specific entry points

### Claude Code

```text
/ccjk:feat Implement user comments with replies and moderation
```

### Codex

```text
/prompts:feat Implement user comments with replies and moderation
```

## Expected output shape

The workflow is planning-heavy and usually produces:

1. requirement framing
2. one or more solution options
3. UI/UX considerations when relevant
4. an execution-oriented implementation plan

## Relationship to other workflows

| Workflow | Best for |
| --- | --- |
| `/ccjk:feat` / `/prompts:feat` | Feature planning and solution shaping |
| `/ccjk:init-project` / `/prompts:init-project` | Project bootstrap and architecture framing |
| `/ccjk:workflow` / `/prompts:workflow` | Broader staged implementation loop |

## Notes

- The current product surface does **not** use the old `featPlanUx` workflow ID. The real shipped bundle is `essentialTools`.
- Codex support is real for this command because the same `feat.md` template is installed into `~/.codex/prompts/`.
- Claude Code installs the related agents into `~/.claude/agents/ccjk/essential/`.

## Related pages

- [Workflow System](../features/workflows.md)
- [Claude Code Configuration](../features/claude-code.md)
- [Codex Support](../features/codex.md)

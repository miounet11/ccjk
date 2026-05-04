# Native Goals Runtime Notes

Date: 2026-05-05

## Context

`slop-janitor` uses Codex goals as a runtime-native execution state, but keeps
the durable plan outside the chat thread. Its goal flow validates a plan
directory, chooses the next ready goal, sets the runtime thread goal, waits for
runtime completion, then writes evidence back to disk before moving on.

The important product lesson for CCJK is that `/goal` should not be treated as
only a slash-command string. It is a runtime capability that should be paired
with durable goal artifacts when we automate longer work.

## What CCJK Should Adopt

- Treat native goals as a cross-runtime capability for Codex and Clavue.
- Keep runtime-specific enablement separate:
  - Codex requires `~/.codex/config.toml` with `[features].goals = true`.
  - Clavue exposes `/goal` as a native runtime command and does not need the
    Codex TOML feature flag.
- Preserve goal enablement when CCJK rewrites provider or MCP configuration.
- Add durable goal-plan support as the next layer:
  - `.agent/goals/<id>/brief.md`
  - `.agent/goals/<id>/goals.json`
  - `.agent/goals/<id>/ledger.jsonl`
  - `.agent/goals/active`
- Keep the first goal-plan runner simple: ordered goals with optional
  `depends_on`, not a full scheduler.

## Current Implementation Decision

The immediate implementation keeps CCJK focused on runtime configuration and
diagnostics:

- Codex doctor checks Codex installation, `~/.codex`, TOML validity, MCP
  services, and `[features].goals`.
- Clavue doctor checks Clavue installation, `~/.clavue`, settings, workflows,
  MCP, permissions, output styles, CCR, and native `/goal` availability.
- `zero-config` enables Codex goals where required and reports Clavue native
  goals through the shared core-feature check.

The larger durable goal-plan runner should be a separate command or workflow
layer so it can share one artifact contract across Codex and Clavue.

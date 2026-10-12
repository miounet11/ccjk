---
name: verify-and-ship
description: OpenAI Codex recommended - test/lint/self-review loop before shipping
---

# Verify-and-Ship Engineering Style

> From [Codex Best Practices](https://developers.openai.com/codex/learn/best-practices) — Codex should test, check, and confirm results, not only generate code.

## Verification loop (required)

After changes, run in order:

1. **Tests** — Run the smallest relevant suite; add tests for new logic.
2. **Static checks** — Lint, format, typecheck per repo scripts (`pnpm test`, `pnpm lint`, etc.).
3. **Behavior** — Confirm against the task, not just “it compiles”.
4. **Diff self-review** — Regressions, edge cases, risky patterns (swallowed errors, secrets).

Fix and repeat until green; only then report done.

## Shipping bar

- Summarize what changed, why, and how it was verified.
- List commands run and outcomes.
- If full suite was skipped, say why and what was covered.
- Do not claim completion until Done-when is met.

## Collaboration

- Use documented package manager and scripts; do not invent commands.
- Confirm destructive ops; never skip verification.
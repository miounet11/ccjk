---
name: surgical-diff
description: Community consensus (Karpathy/senior maintainers) - surgical minimal diffs, understand before editing
---

# Surgical-Diff Engineering Style

> Shared discipline for effective agents: smaller, well-scoped diffs win. Aligns with OpenAI Codex repo maintenance practice and community “surgical edit” norms.

## Core rules

- **Read before edit** — No changes without reading relevant code, tests, and callers.
- **Minimal diff** — Only lines the task requires; no drive-by refactors, unrelated formatting, or comment deletes.
- **Single intent** — One PR-sized purpose per task; no unrelated fixes bundled in.
- **Reuse first** — Extend existing functions and patterns; do not parallel-reimplement.

## Avoid

- Broad renames “for cleanliness”
- Dependency/CI/config churn without request
- try-catch that hides failures to green tests
- Guessing APIs — read code or docs when unsure

## Before done

- Diff size matches task scope; huge changes need a plan first.
- Every hunk has a one-line “why necessary” rationale.
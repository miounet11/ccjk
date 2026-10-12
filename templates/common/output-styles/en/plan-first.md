---
name: plan-first
description: OpenAI Codex recommended - plan before coding; clarify Goal/Context/Constraints/Done-when
---

# Plan-First Engineering Style

> From [Codex Best Practices](https://developers.openai.com/codex/learn/best-practices) — plan before implementing complex, ambiguous, or multi-step work.

## Four task anchors

Align on these before acting:

1. **Goal** — What outcome is required?
2. **Context** — Which files, dirs, docs, or errors matter?
3. **Constraints** — Architecture, safety, style, and boundaries?
4. **Done when** — What must be true to finish? (tests pass, behavior changes, bug gone)

## Planning discipline

- Multi-file changes, architecture decisions, unclear requirements: **plan first, code second**.
- Plans cover scope, step order, verification, and risks.
- Implement only after the plan is sound; explain deviations before continuing.
- Split large work into verifiable steps with clear done criteria.

## Coding

- Execute the smallest planned step; no unplanned refactors.
- Revise the plan when reality changes — do not brute-force around it.
- Cite code as `path:line` for reviewability.
---
name: agents-md-baseline
description: OpenAI Codex AGENTS.md engineering baseline - verify loops, minimal diffs, risky-op confirmation
---

# AGENTS.md Engineering Baseline

> Based on the [OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md) and community best practices.

## Working agreements

- **Read before edit**: Review relevant code, tests, and project docs (e.g. `ARCHITECTURE.md`, `docs/`) before changing anything.
- **Minimal diffs**: Change only what the task requires; no drive-by refactors or unrelated cleanup.
- **Verify loop**: After edits, run the project's smallest relevant checks (`pnpm test`, `pnpm lint`, `npm test`, etc.); fix failures before moving on.
- **Confirm risky ops**: Get explicit approval before deleting files, force git operations, production config changes, or bulk dependency updates.
- **Paths and commands**: Quote file paths; prefer the package manager and scripts documented in the repo.

## Output style

- Lead with conclusions; keep steps clear; avoid filler.
- Reference code with `path:line` when possible.
- Investigate or ask when unsure — do not guess APIs or layout.

## Collaboration

- Match existing naming, structure, and test patterns.
- Explain rationale before new dependencies or large-scope changes.
- End tasks with a short summary of what changed and how it was verified.
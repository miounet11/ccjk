---
description: PR-grade code review - regressions, edge cases, maintainability (OpenAI /review practice)
argument-hint: [--uncommitted] [--base <branch>] [--commit <sha>]
---

# Code Review Workflow

> Based on [Codex Best Practices](https://developers.openai.com/codex/learn/best-practices) and `/review`: review uncommitted changes, a commit, or diff vs a base branch.

## Scope

Pick by flags:

- Default: uncommitted changes
- `--base main`: PR-style vs main
- `--commit <sha>`: single commit

## Checklist

1. **Correctness** — Meets requirements? Edge and error paths?
2. **Regression** — Breaks behavior or tests? Callers updated?
3. **Tests** — New logic covered? Only happy path?
4. **Security** — Injection, auth, secrets, dangerous commands, data leaks.
5. **Maintainability** — Naming, single responsibility, duplication, over-abstraction.
6. **Diff size** — Could be smaller? Unrelated churn?

## Output

- **Summary** — One-line verdict (merge / fix required / discuss)
- **Blocking** — Must-fix items with file:line
- **Suggestions** — Non-blocking improvements
- **Verified** — Tests/commands run (if any)

Do not edit code unless the user asks to review and fix.
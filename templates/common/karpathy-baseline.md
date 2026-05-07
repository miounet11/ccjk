# Coding Discipline Baseline

> Default behavior for all coding tasks in this project, unless the user
> explicitly says otherwise. Inspired by Andrej Karpathy's observations on
> common LLM coding failure modes.

These rules apply to **every** task. Style guides (Linus / Carmack / DHH …)
layer on top — they change voice, not discipline.

---

## 1. Think before coding

Surface ambiguity. Don't pick silently.

- If the request has two reasonable interpretations, present both and ask.
- If a constraint is unclear (target file, scope, behavior), ask before coding.
- If you'd push back on a senior engineer ("this seems unnecessary"), do.
- Prefer clarifying questions before edits over rework after.

## 2. Simplicity first

Minimum code that meets the stated request. Nothing speculative.

- No unrequested features, options, flags, or config knobs.
- No abstractions for single-use code. No interfaces with one implementation.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite.

Litmus test: a senior engineer reviewing the diff should not think "why all this?"

## 3. Surgical changes

Touch only what the task requires.

- Don't reformat or "improve" code adjacent to your edit.
- Don't refactor working code unless that *is* the task.
- Match existing style/naming/imports — don't introduce a new convention.
- For orphans created by your own change (now-unused imports, variables, helpers): remove them. For pre-existing dead code: leave it, mention it.

Litmus test: every changed line should trace directly to the user's request.

## 4. Goal-driven execution

Convert tasks into verifiable goals. Loop until the goal is met — don't ask
the user to re-run something you can verify yourself.

| Vague request | Verifiable goal |
|---|---|
| "Add validation" | Write a failing test for invalid input, then make it pass |
| "Fix the bug" | Write a reproducing test, then make it pass |
| "Refactor X" | Confirm the same tests pass before and after |
| "Make it work" | Define what "work" means with a command + expected output |

For multi-step tasks, share a brief plan with verification per step before
starting. Strong goals enable independent looping. Weak goals ("make it
nice") force back-and-forth.

---

## Project-specific rules

These extend the baseline; they don't replace it.

- **Verification commands:** `pnpm typecheck`, `pnpm lint`, `pnpm test:run`,
  `pnpm test:release` (curated subset). For Codex/Claude integration paths,
  smoke test with `echo '<option>' | node dist/cli.mjs`.
- **Generated rule files:** `CLAUDE.md`, `clavue.md`, `AGENTS.md` are
  rewritten by Clavue `/init`. Put durable guidance in
  `docs/CLAUDE-NOTES.md`.
- **Anti-aggression:** ccjk complements Claude Code; do not auto-run things
  in Claude's runtime. Skills run only on explicit invocation. Don't add
  background hooks that fire on every tool call.
- **Workspace ownership:** ccjk config lives at `~/.ccjk/`, separate from
  `~/.claude/` and `~/.codex/`. Don't mix them.

---

## When to skip this baseline

- Trivial fixes (typo, one-liner): use judgment, don't over-process.
- The user explicitly says "just do it" / "no questions": skip clarification, but keep simplicity + surgical edits.
- Emergencies (build broken, prod down): goal is restore-first, then write the regression test.

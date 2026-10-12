# Round 6 — status drift badge (followup to v15.27.5)

## Round goal

After v15.27.5 made doctor detect shell-env shadow, status still shows file values as if they were
truth. Surface a `!` next to drifted baseUrl/model so users see the conflict at the "一眼看全" command.

## Baseline

- `node dist/cli.js status` shows `Base URL = ttqq.inping.com` even when `shell` exports a different
  baseUrl that will actually win at runtime.
- `pnpm test` → 335 passed / 30 files

## Primary metric

After the change, on a machine with `process.env.ANTHROPIC_BASE_URL` ≠ settings value:
- status row prints `! ttqq.inping.com` (yellow `!`) in the baseUrl column
- footer prints a one-line hint pointing at `ccjk doctor`
- column widths unchanged (no truncation regression)
- new focused test asserts `!` present + hint present

## Slice

Reuse `inspectRuntimeEnv` from v15.27.5; in `collectClaudeRow` record per-key shadow flags;
in `renderCompareTable` prepend `! ` to drifted fields; print footer if any.

## Score

- user impact: 4 (every run of status now warns; doctor is opt-in)
- roadmap alignment: 5 (parked candidate elevated by previous round)
- implementation risk: 4 (touches column layout — but `!` is 2 cols, well under existing widths)
- verification clarity: 5 (string-search test)
- simplicity payoff: 4
- total: 22/25
- predicted ΔE: +0.4

## Next hypothesis

If status surfaces this, doctor becomes optional for everyday flow; users only run doctor when status
shows `!`. Predicted reduction in "为什么没生效" support questions.

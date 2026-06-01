# Round 2 (cont.) — Critique and ranking

## Candidates

### A. `doctor` runtime env shadow detection

Add `[Runtime] shell environment` section to doctor output. New rules:

- `shell-env-shadow` (warn): `process.env.X` and `settings.env.X` differ → file config not in effect
- `shell-env-deprecated-export` (info): `.zshrc` exports `ANTHROPIC_SMALL_FAST_MODEL`/`ANTHROPIC_CUSTOM_MODEL_OPTION`/`CLAUDE_CODE_SUBAGENT_MODEL`
- `shell-env-orphan` (info): shell exports `ANTHROPIC_BASE_URL` but no settings file exists

Scores:

- user impact: 5 (catches #1 silent failure: "切了 profile 没生效")
- roadmap alignment: 5 (doctor is the recovery surface in the main path)
- implementation risk: 4 (lower=better; pure read of process.env, no FS, no shell parsing)
- verification clarity: 5 (vi.stubEnv + golden output diff)
- simplicity payoff: 4 (50 lines core + 30 lines doctor wiring + 5 tests)
- **total: 23/25**
- **predicted energy delta: +0.7** (high friction reduction, modest risk)

### B. Standalone `ccjk env-doctor` command

Same logic, but new top-level command instead of folding into `doctor`.

- user impact: 4 (extra command to remember; users won't run unprompted)
- roadmap alignment: 3 (PRODUCT.md says "doctor 是体检命令" — adding sibling command duplicates intent)
- implementation risk: 4
- verification clarity: 5
- simplicity payoff: 3 (new command, new help entry, new menu item, new test file)
- **total: 19/25**
- **predicted energy delta: +0.4**

### C. `ccjk init` post-write shell env warning

After init writes settings.json, scan process.env and warn if any shadow keys exist.

- user impact: 4 (catches at write time, but only first-time path)
- roadmap alignment: 4
- implementation risk: 4
- verification clarity: 4
- simplicity payoff: 4
- **total: 20/25**
- **predicted energy delta: +0.4**

### D. `ccjk status` drift badge

Show ⚠ next to baseUrl/model field in status if shell env disagrees.

- user impact: 4 (status is the "一眼看全" command, perfect surface)
- roadmap alignment: 5
- implementation risk: 3 (status table layout fragile; lower-better → 3)
- verification clarity: 4
- simplicity payoff: 3 (status row layout / column width changes)
- **total: 19/25**
- **predicted energy delta: +0.3**

### E. doctor `--fix` writes a `unset.sh` snippet for shell exports

After doctor detects shell exports, generate a shell snippet user can `source` to clean up.

- user impact: 3 (touching ~/.zshrc is risky; script-only is safer but less satisfying)
- roadmap alignment: 3 (ccjk doesn't write outside ~/.ccjk/, ~/.claude/, ~/.codex/)
- implementation risk: 3 (escaping, idempotency)
- verification clarity: 4
- simplicity payoff: 3
- **total: 16/25**
- **predicted energy delta: +0.1**

## Ranking

| Rank | Candidate | Total | Predicted ΔE |
| --- | --- | --- | --- |
| 1 | A. doctor runtime env shadow | 23 | +0.7 |
| 2 | C. init post-write warning | 20 | +0.4 |
| 3 | B. standalone env-doctor | 19 | +0.4 |
| 3 | D. status drift badge | 19 | +0.3 |
| 5 | E. unset.sh snippet | 16 | +0.1 |

## Energy weighting note

energy = unmet_doneWhen_count·w1 + constraint_drift·w2 − simplicity_payoff·w3, where w1>w2>w3 (user-visible failures matter most, drift second, simplicity-payoff is a discount factor not a primary driver). A and C tie on impact but A folds into an existing recovery surface (doctor) instead of inventing a parallel one — fewer concepts for the user.

## Tie-break

A vs B/C/D — A wins because:

1. **Doctor is already where users go when "出问题"** (PRODUCT.md fact). Folding the new check there makes the command match the user's mental model.
2. **No new top-level concept.** README's `ccjk doctor` entry stays the single recovery answer.
3. **--json schema additive.** CI consumers continue to work.

## Chosen slice

**A. `ccjk doctor` runtime env shadow detection** — implement as additive `[Runtime] shell environment` section.

## Park the rest

C, D, E append to `.clavue/retro/parked.tsv`. B is dropped (subsumed by A).

## Next hypothesis

A pure `inspectRuntimeEnv(env, settings)` function that returns `Finding[]`, hooked into both `runHuman` and `runJson`, will deliver the win in <60 LoC of new code + 5 focused tests, with zero risk to existing lint behavior.

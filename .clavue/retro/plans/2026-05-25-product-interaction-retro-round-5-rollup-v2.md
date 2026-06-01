# Round 5 (cont.) — Rollup and PRODUCT / ARCHITECTURE update proposal

## Run tag

`2026-05-25-product-interaction-retro` (continuation, v15.27.5 cycle)

## Rollup

This continuation cycle shipped **one** kept slice:

- **doctor-runtime-env-shadow** (kept, v15.27.5): `ccjk doctor` now scans `process.env` and reports
  `shell-env-shadow` / `shell-env-deprecated-export` / `shell-env-orphan` findings in a dedicated
  `[Runtime] shell environment` section. JSON output gains `runtime.findings[]`. The slice catches the
  #1 silent failure on the default user path ("切了 profile 没生效"), with additive schema and zero
  behavioral regression. See `.clavue/retro/results.tsv` row for `doctor-runtime-env-shadow` and
  calibration ΔE +0.7 predicted = +0.7 actual.

Parked candidates (`.clavue/retro/parked.tsv`):
- `init-post-write-shell-warning` (20/25) — overlaps with doctor; revisit if doctor surface insufficient
- `status-drift-badge` (19/25) — defer until status table layout next changes
- `doctor-fix-unset-snippet` (16/25) — out-of-scope (writes outside ccjk-managed paths)

## Highest-leverage pending upgrade

**`ccjk status` drift badge.** Status is the "一眼看全" surface; today it shows file values as if they
were truth, while doctor knows shell may shadow. Surfacing a single ⚠ on the affected field in `status`
would turn the doctor knowledge into proactive guidance at the most frequently-run command. Risk:
status column widths.

## Proposed PRODUCT.md edits

The runtime-env scan is a new doctor capability worth surfacing in the product narrative. Add one
short row to the doctor section listing what doctor now checks.

```diff
 ## ccjk doctor — recovery surface

 ccjk doctor is the single answer to "我配置好像出问题了". It lints:

 - **settings.json (Clavue / Claude Code)** — env hygiene, deprecated keys,
   apiKeyHelper paths, permission breadth, hook bloat, redundant model slots
 - **config.toml (Codex)** — provider field validity, wire_api migration,
   top-level model / profile layout
+- **runtime shell environment** — detects `~/.zshrc` / `~/.bashrc` exports
+  that shadow `settings.json.env` (the #1 cause of "切了 profile 没生效"),
+  plus deprecated env exports and orphaned credentials with no settings file
```

Justification: doctor's role in the product narrative ("recovery surface") now genuinely includes
runtime causes, not only file causes. The narrative without this line undersells what doctor catches.

## Proposed ARCHITECTURE.md edits

Add the runtime-env module under the lint layering, and add one invariant about runtime read-only.

```diff
 ## Lint pipeline (three layers)

 1. **settings.json lint** (`core/lint.ts`) — pure function over `ClaudeSettings`
 2. **codex.toml lint** (`core/codex-config.ts`) — pure function over the parsed TOML doc
+3. **runtime env lint** (`core/runtime-env.ts`) — pure function over `process.env`
+   and a settings map; never writes, never reads files

 All three are pure, deterministic, and produce the same `Finding[]` shape (severity, rule,
 message, optional fixHint, optional fix).

 ## Invariants

 ...
+- **Runtime scan is read-only.** `inspectRuntimeEnv` never writes to `process.env` and never
+  touches `~/.zshrc` or any shell rc. Any "fix" for shell exports is left to the user (we can
+  point at the file, we cannot edit it without their permission).
```

Justification: the read-only invariant is load-bearing. Without it, future contributors may add a
"--fix" that rewrites `~/.zshrc`, which is out of ccjk's contract ("only writes within
~/.ccjk/, ~/.claude/, ~/.codex/").

## Proposed clavue.md edits

**No change needed.** The discipline baseline (think before coding / simplicity first / surgical
changes / goal-driven) was respected verbatim in this slice. No new convention was promoted or
retired.

## Open questions for the human owner (≤3)

1. **Should `ccjk status` adopt a drift badge in the next cycle?** Or is doctor sufficient as the
   recovery surface (status stays a snapshot)?
2. **Should `shell-env-shadow` be promoted from warn to error when both shell and settings define
   the same key with conflicting values?** Currently warn keeps exit code at 1; promoting to error
   would force CI to fail-stop, which may be desirable for `--json` integrations.
3. **Should the deprecated-export info hint include a one-liner the user can paste?** e.g.
   `sed -i '' '/export ANTHROPIC_SMALL_FAST_MODEL/d' ~/.zshrc` — risky on Mac/Linux differences;
   safer to leave manual.

## Staging note

This rollup proposes the PRODUCT.md / ARCHITECTURE.md edits but **does not apply them**. Per the
retro protocol, the human owner reviews and merges; the agent does not silently rewrite the
program.md equivalents.

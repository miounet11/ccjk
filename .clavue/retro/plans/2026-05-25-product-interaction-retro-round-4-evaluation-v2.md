# Round 4 (cont.) — Evaluation

## Baseline command/observation

- Before slice: `pnpm test` → 325 passed / 29 files; `node dist/cli.js doctor` printed 32 lines
  with 10 file-level findings but no `[Runtime]` section. On a real machine where `~/.zshrc`
  exports `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`, etc.,
  `ccjk doctor` was completely silent about the conflict.

## Verification command after change

- `pnpm typecheck` → passed
- `pnpm lint` → passed
- `pnpm test` → **335 passed / 30 files** (+10 tests, +1 file)
- `pnpm build` → passed
- `node dist/cli.js doctor` (real machine) → new `[Runtime] shell environment` section now prints,
  3 `shell-env-deprecated-export` infos visible
- `node dist/cli.js doctor --json` → JSON contains `runtime: { findings: [...] }`,
  schemaVersion 1, infos counted in summary, exitCode reflects severity

## What improved / stabilized / simplified

- The most common silent failure ("切了 profile 没生效") is now visible at the existing recovery
  command — no new concept for the user to learn.
- doctor-json test suite is now hermetic: previously it could pick up host shell env, now
  `beforeEach` stubs all tracked env keys. This stabilization is incidental but real.
- `inspectRuntimeEnv` is a pure function with 8 focused tests, including the tricky multi-file case
  where one file matches shell and one doesn't (rule: not a shadow if any settings agrees).

## Why safe to keep

- Additive: JSON gets one new field; existing callers ignoring unknown fields still parse.
  Human output adds a section only when findings exist (zero noise on clean systems).
- No IO in core: `runtime-env.ts` reads `process.env` and a passed-in `Map`, never touches the
  filesystem. The fix hint *points at* `~/.zshrc` but ccjk never edits it.
- Refined shadow logic: only report shadow when **no** settings file agrees with shell value.
  Avoids false positives when (e.g.) clavue and shell already match.

## How did the slice change compatibility / stability / interaction logic / reliability?

- **compatibility**: improved. JSON schema additive, human output additive, exit code unchanged.
- **stability**: improved. New module is pure; tests deterministic.
- **interaction logic**: improved. Failure mode previously invisible is now surfaced at the
  user's existing "出问题" entry point. Mental model preserved.
- **reliability**: improved. Real-machine smoke test confirms detection; pre-existing test flake
  risk (host env leak) eliminated as a side effect.

## JEPA close-loop

- predicted ΔE: **+0.7**
- actual ΔE: **+0.7**
- predicted vs actual: +0.7 vs +0.7 — within 0.4 threshold; no calibration drift to explain.

## Verdict

**KEEP.** Ledger row appended. Calibration row updated.

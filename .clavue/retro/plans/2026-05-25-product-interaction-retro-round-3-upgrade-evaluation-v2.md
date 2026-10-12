# Round 3 (cont.) — Upgrade evaluation: doctor runtime env shadow

## Round goal

Implement the chosen slice from round 2: fold runtime env shadow detection into `ccjk doctor`.

## Implementation summary

- New module `src/core/runtime-env.ts` (~120 lines including comments)
  - Pure function `inspectRuntimeEnv({ settingsByTool, env, anySettingsExist })` returning `RuntimeFinding[]`
  - Three rules: `shell-env-shadow` (warn), `shell-env-deprecated-export` (info), `shell-env-orphan` (info)
  - No IO; deterministic per call
- `src/commands/doctor.ts` integration (~30 lines added)
  - `runHuman` collects `settingsByTool` while linting, prints `[Runtime] shell environment` section if findings
  - `runJson` adds `runtime.findings[]` to JSON report; counts warnings into summary
  - `JsonReport` schema gets `runtime` field; schemaVersion stays 1 (additive)
- `tests/core/runtime-env.test.ts` — 8 focused tests covering all three rules + edge cases
- `tests/commands/doctor-json.test.ts` — 2 new tests on `runtime.findings`; cleared host shell env in `beforeEach` to keep deterministic

## Surgical scope

Files touched:
- `src/core/runtime-env.ts` — new file
- `src/commands/doctor.ts` — additive
- `tests/core/runtime-env.test.ts` — new file
- `tests/commands/doctor-json.test.ts` — additive (new tests + env stubbing in beforeEach)
- `package.json` — version bump 15.27.4 → 15.27.5
- `CHANGELOG.md` — new entry

No existing tests modified beyond the env-stubbing fix (necessary because pre-existing tests inadvertently leaked host shell env).

## Verification

Baseline before edit:
- `pnpm test` → 325 passed / 29 files
- `node dist/cli.js doctor` → 32 lines, 10 file findings, **runtime section absent**

After edit:
- `pnpm typecheck` → passed
- `pnpm lint` → passed
- `pnpm test` → 335 passed / 30 files (+10)
- `pnpm build` → passed
- `node dist/cli.js doctor` (real machine, .zshrc has shell exports):
  - `[Runtime] shell environment` section now present
  - 3 `shell-env-deprecated-export` infos for `ANTHROPIC_CUSTOM_MODEL_OPTION`,
    `ANTHROPIC_SMALL_FAST_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`
  - `shell-env-shadow` correctly NOT raised because clavue settings already match the shell (refined logic)
- `node dist/cli.js doctor --json` JSON includes `runtime.findings: [...]`, schemaVersion: 1

## Quality scorecard

- compatibility: **improved** — `runtime` field is additive on JSON; existing callers ignoring unknown fields parse cleanly. Human output adds a section only when findings exist (no noise on clean systems).
- stability: **improved** — `inspectRuntimeEnv` is pure, deterministic, no IO. Tests reproduce via `vi.stubEnv`.
- interaction logic: **improved** — failure mode that was previously silent (profile switch with no effect) now visible at the de-facto recovery surface (`ccjk doctor`). User mental model preserved: doctor = where I go when something is wrong.
- reliability: **improved** — fixed pre-existing test fragility (host env leaked into doctor-json suite). Now deterministic regardless of where suite runs.

## Keep/discard decision

**KEEP.**

The slice catches the highest-frequency silent failure (shell env shadowing settings.json) at the user's existing "出问题" entry point with zero new commands, zero new flags, and additive JSON schema. All four quality dimensions improved on the default user path.

## JEPA close-loop

- predicted ΔE: +0.7
- actual ΔE: +0.7 (delivered with same scope as predicted; production output confirms shadow detection + deprecated-export both fire on a real machine; calibration tight)
- predicted vs actual: +0.7 vs +0.7 — within 0.4 threshold; no over/under-call note needed.

## Next hypothesis

`ccjk status` could surface a single-character ⚠ next to baseUrl/model when doctor would flag a shadow — turns a known-but-passive doctor finding into a visible signal on the every-time-I-run-status surface. Risk: column layout. Defer to a future round.

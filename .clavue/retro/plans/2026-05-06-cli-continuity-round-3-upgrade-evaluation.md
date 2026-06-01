# Round 3 Upgrade and Evaluation

## round goal
Make smart defaults probe the active/default runtime first so Clavue identity and runtime evidence stay aligned.

## baseline command or observation
Baseline command: `pnpm vitest run tests/config/smart-defaults.test.ts`.
Baseline result: 32 tests passed. Observation: `src/config/smart-defaults.ts` called version probing before code-tool detection and checked `claude` before `clavue`.

## primary metric
Focused smart-defaults test lane passes with a new regression proving active Clavue probes `clavue --version` before Claude Code.

## chosen slice or candidate ranking
Chosen: Smart defaults runtime version routing, total = 23/25 from round 2.

## implementation notes
- `src/config/smart-defaults.ts`: `detect()` now stores `codeToolType` once, then passes it into version probing.
- Version probing now builds a de-duplicated command order: active runtime first, then `claude`, then `clavue` fallback.
- Public result shape stays compatible: existing `claudeCodeVersion` field remains populated with the first detected Claude-family runtime version.
- `tests/config/smart-defaults.test.ts`: added regression for Clavue marker + provider profile, asserting `clavue --version` is the first probe.

## verification command and result
- Baseline: `pnpm vitest run tests/config/smart-defaults.test.ts` -> 32 passed.
- After change: `pnpm vitest run tests/config/smart-defaults.test.ts` -> 33 passed.
- Broader gate: `pnpm typecheck` -> passed.

## compatibility, stability, interaction logic, and reliability scorecard
- compatibility: improved/neutral. Existing `claudeCodeVersion` API remains; fallback to `claude` remains.
- stability: improved. Runtime version evidence is derived after one stored code-tool detection, avoiding ordering drift.
- interaction logic: improved. Default Clavue path now probes Clavue first, matching startup/default runtime identity.
- reliability: improved. Focused regression locks the command order and typecheck passed.

## keep/discard decision
keep

## next hypothesis
Next leverage is exposing clearer runtime capability/executable status without adding another broad configuration layer.

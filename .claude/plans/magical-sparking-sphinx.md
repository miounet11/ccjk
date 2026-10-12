## Context
The current `research` MVP in CCJK can run one bounded experiment and persist session/task state, but it still behaves like a narrow command wrapper. The external requirements doc at `/Users/lu/开发项目/claw/pi_agent_rust/xuqiu.md` argues for a stronger operating model: explicit workflow phases, specialization, verification contracts, and first-class experiment records. The best next step is not to build a huge agent OS, but to promote research from “run one command” into a structured research workflow with visible results and report artifacts, while reusing the real persistence and workflow machinery that already exists in this repo.

## Recommended approach
1. Extend `src/services/research-runner.ts` in two directions:
   - add an append-only TSV results ledger for every completed run
   - add lightweight research workflow session metadata with explicit phases: `brief`, `baseline`, `experiment`, `verify`, `report`
2. Reuse existing persistence instead of inventing a new subsystem:
   - keep experiment execution and audit history in `src/brain/task-persistence.ts`
   - reuse `src/workflow/state-machine.ts` patterns for phase transitions/history, but keep the implementation inside the research service for now rather than integrating with the broader scheduler
3. Extend `src/commands/research.ts` with the smallest high-leverage command surface:
   - `research run` keeps its current behavior but records phase/ledger data
   - `research results` prints recent runs and the current best metric row
   - `research report [sessionId]` renders a compact markdown-style summary from persisted state
   - `research status` shows the current phase in addition to session/task metrics
4. Add a verification contract inspired by the external doc’s “verification is a product primitive” idea:
   - every run/report should surface command, cwd, observed exit code, observed metric, duration, and verdict (`PASS`/`FAIL`/`PARTIAL`)
   - if no metric is found, report must say so explicitly rather than implying success
5. Keep governance simple and explicit for this iteration:
   - no autonomous agent spawning yet
   - no scheduler/background workflow adoption yet
   - no hidden automation; only user-invoked `research` actions
6. Add targeted command tests for the new `results` and `report` output paths, following the existing mock-service command-test style.

## Critical files to modify
- `/Users/lu/ccjk-public/src/services/research-runner.ts`
- `/Users/lu/ccjk-public/src/commands/research.ts`
- `/Users/lu/ccjk-public/src/cli-commands.ts` (only if command help/options need to expose new actions clearly)
- `/Users/lu/ccjk-public/tests/commands/research.test.ts`

## Existing references/patterns to reuse
- Reuse the current command/service split in `src/commands/research.ts` and `src/services/research-runner.ts`
- Reuse durable task/session metrics and decision logging from `src/brain/task-persistence.ts`
- Reuse phase/history concepts from `src/workflow/state-machine.ts` and `src/workflow/types.ts` rather than inventing a new lifecycle vocabulary
- Reuse report formatting ideas from `src/utils/report-generator.ts`, but keep the new report research-specific and much smaller
- Reuse focused command tests in `tests/commands/research.test.ts` and the style from `tests/commands/api.test.ts`

## Verification
- Run `pnpm vitest tests/commands/research.test.ts`
- Run `pnpm typecheck`
- Manually sanity-check CLI output paths for:
  - `ccjk research run --name baseline --cmd "..." --metric ...`
  - `ccjk research results`
  - `ccjk research report`
  - `ccjk research status`
- Inspect `git diff` to ensure the change stays scoped to the research command/service/test surface.
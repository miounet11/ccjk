# CCJK v12.2.2 Release Notes

## Highlights

- Added native slash-command passthrough compatibility for Claude-style commands (including `/batch` and `/simplify`).
- Added unified `/clear` behavior to reset CCJK runtime caches:
  - execution telemetry
  - context loader cache
  - in-memory skill registry
- Added command hook bridge for router/executor lifecycle events.
- Added regression tests for interceptor compatibility and clear-reset behavior.

## Main Files

- `src/brain/router/cli-interceptor.ts`
- `src/brain/router/auto-executor.ts`
- `src/brain/hooks/command-hook-bridge.ts`
- `src/brain/__tests__/cli-interceptor-compat.test.ts`

## Validation

- Passed: `pnpm eslint` on changed router/hook/test files
- Passed: `pnpm vitest run src/brain/__tests__/cli-interceptor-compat.test.ts src/brain/__tests__/auto-executor-routing.test.ts`

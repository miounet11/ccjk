# CCJK v12.2.1 Release Notes

## Highlights

- Added structured route elicitation for ambiguous requests.
- Added capability-ranked MCP tool selection with top-N limit.
- Added execution telemetry events and summary interfaces.
- Added visible “Smart Upgrade Signals” in Brain CLI output.

## User Impact

- Users now see route decision flow (`initial -> final`) in result output.
- Users can feel when routing is automatic vs. user-guided.
- Users can see why MCP tools were selected and when candidate lists were truncated.
- Users can see lightweight telemetry feedback (event count + total execution time).

## Main Files

- `src/brain/router/auto-executor.ts`
- `src/brain/router/ask-user-question.ts`
- `src/brain/router/execution-telemetry.ts`
- `src/brain/router/index.ts`
- `src/brain/router/cli-interceptor.ts`
- `src/brain/integration/cli-hook.ts`
- `src/brain/__tests__/auto-executor-routing.test.ts`

## Validation

- Passed: `pnpm eslint` on all changed files
- Passed: `pnpm vitest run src/brain/__tests__/auto-executor-routing.test.ts`

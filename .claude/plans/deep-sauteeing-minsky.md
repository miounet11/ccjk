# Context

The myclaude model/profile chain is now correctly persisted and `ccjk status` already shows the active provider, API base, and adaptive model slots. The remaining product issue is that `status` still triggers interactive auto-fix prompts by default, which makes a read-only diagnostics command block in normal CLI usage and in scripted verification. There is also a smaller UX mismatch where the section heading still says `Claude Code` even when the active runtime is `myclaude`.

The goal is to finish this work as one reviewable unit: keep the fixed myclaude configuration visibility, make `status` safe and non-blocking by default, and preserve explicit opt-in repair behavior.

# Recommended approach

## 1. Make `status` read-only by default

**Files:**
- `src/commands/status.ts`
- `src/cli-commands.ts`

**Reuse:**
- `autoFix()` in `src/health/auto-fixer.ts`

**Plan:**
- Extend `StatusOptions` to support explicit repair controls instead of always prompting after every report.
- Add CLI flags for `status` so fix execution is opt-in, not implicit:
  - `--fix` to run fixable recommendations
  - `--yes` to auto-confirm fix execution
  - `--dry-run` to preview fix commands without executing them
- Change `statusCommand()` so it only calls `autoFix()` when `options.fix` is true.
- When `--fix` is provided, pass through `autoApprove` and `dryRun` to the existing `autoFix()` helper.

**Why this approach:**
- It uses the existing repair engine instead of inventing a second fix path.
- It aligns with repo guidance that CCJK should not hijack normal interactive usage.
- It fixes the exact blocking behavior observed from `node dist/cli.mjs status`.

## 2. Make the runtime section label match the active tool

**Files:**
- `src/commands/status.ts`

**Reuse:**
- `resolveCodeType()` already called in `statusCommand()`
- Existing myclaude provider parsing logic in `renderClaudeCodeSection()`

**Plan:**
- Replace the hard-coded `Claude Code` section title with a runtime-aware label derived from the resolved code tool.
- Keep the current provider/API base/model-slot rendering.
- For `myclaude`, render a matching heading so the output reads consistently with `Provider: myclaude/ttqq`.

**Why this approach:**
- It removes the last confusing label in the output without changing the configuration model.
- It makes the status screen reflect the actual active runtime rather than a Claude-only assumption.

## 3. Add targeted tests for the status command

**Files:**
- `tests/commands/status.test.ts` (new)

**Plan:**
- Add a focused Vitest file for `statusCommand()` with mocks for filesystem/config inputs.
- Cover at least these behaviors:
  1. default `statusCommand()` renders output and does **not** call `autoFix()`
  2. `statusCommand({ fix: true, dryRun: true })` delegates to `autoFix()` with the expected options
  3. rendered output includes active provider/API base/model-slot details from the myclaude + settings data
  4. runtime heading changes based on resolved code tool

**Why this approach:**
- There is currently dashboard coverage but no dedicated status coverage.
- These tests lock in both the bug fix and the myclaude-facing UX improvements.

# Critical code paths to modify

- `src/commands/status.ts`
  - `StatusOptions`
  - runtime-aware section heading logic
  - final auto-fix invocation gate
- `src/cli-commands.ts`
  - `status` command option registration and option forwarding
- `tests/commands/status.test.ts`
  - regression coverage for non-interactive default behavior and myclaude display

# Verification

## Automated
- `pnpm typecheck`
- `pnpm build`
- `pnpm vitest tests/commands/status.test.ts`

## End-to-end
- `node dist/cli.mjs status`
  - should print the report and exit without fix prompts
- `node dist/cli.mjs status --fix --dry-run`
  - should print the report and preview fix commands without blocking on confirmation
- `node dist/cli.mjs status --fix --yes`
  - should run fixable items non-interactively using the existing `autoFix()` flow

## Expected outcome
- Users can reliably inspect status without being trapped in interactive repair prompts.
- myclaude runtime state remains visible and accurately labeled.
- Explicit repair behavior still exists when intentionally requested.
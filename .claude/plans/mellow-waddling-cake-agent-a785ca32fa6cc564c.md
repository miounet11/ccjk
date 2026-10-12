# Implementation plan: restore visible code-tool switch and make myclaude the default

## Scope
Plan only. No code changes in this step.

## Goals
1. Restore a visible `switch-code-tool` entry in the main menu for Claude-family shells, especially `myclaude`, instead of relying only on footer shortcut `S`.
2. Change the default/fallback active tool from `claude-code` to `myclaude`.

## Recommended implementation

### 1) Make switch-code-tool visible in the basic main menu

#### Primary file to modify
- `/Users/lu/ccjk-public/src/commands/menu/main-menu.ts`

#### Changes
- Include `myclaude` in `NON_CODEX_TOOLS` so the non-Codex menu definitions apply to myclaude.
- Reposition or reclassify the existing `switch-code-tool` item so it is visible in the basic menu for Claude-family shells.
- Preferred approach: keep reusing the existing `switch-code-tool` item ID/label/description/action, but move it into a section that survives the basic 9-item cap.
  - Best low-risk option: make `switch-code-tool` a `basic` item in the `quick` category for `NON_CODEX_TOOLS`, mirroring the existing `codex-switch-tool` treatment.
  - Alternative: keep it in `system` but move it before `doctor` and verify it still survives section truncation. This is more fragile because `basic` shows at most 9 items and `system` is rendered after `quick` and `config`.
- Decide whether to keep both `codex-switch-tool` and `switch-code-tool` as parallel items, or consolidate their placement while preserving current IDs to minimize handler churn.

#### Existing helpers to reuse
- `isItemSupportedForTool()`
- `getVisibleItems()`
- Existing label/description keys already referenced by both switch items:
  - `menu:menuOptions.switchCodeTool`
  - `menu:menuDescriptions.switchCodeTool`

#### Why this file is the main change surface
- Visibility is driven by item metadata here: `category`, `level`, `supportedTools`, and array order.
- The current `basic` cap and section order mean simply changing `level: 'expert'` to `level: 'basic'` is not enough unless the item is also placed where it remains within the first 9 rendered items.

### 2) Keep the existing switch handler flow, with one small parity check

#### Primary file to review and likely adjust
- `/Users/lu/ccjk-public/src/commands/menu/index.ts`

#### Changes
- Reuse the existing `handleCodeToolSwitch()` implementation; do not introduce a new switch flow.
- Reuse the existing attached handlers for:
  - `switch-code-tool`
  - `codex-switch-tool`
- Verify the progressive shell still refreshes correctly after switching (`return 'switch'` path already exists).
- Review the footer `S` command behavior for `myclaude` specifically.
  - Current shell config advertises footer `s` for `myclaude`, but direct input handling in `showProgressiveMenu()` is explicitly coded for `codex` in that branch.
  - If you want footer parity, either generalize the direct `s` handling for `myclaude` too, or rely solely on the restored visible menu item.
  - This is a small follow-up in the same file, not a new subsystem.

#### Existing helpers to reuse
- `handleCodeToolSwitch()`
- `getCurrentCodeTool()`
- `attachHandlers()`
- `getMenuShellConfig()`

### 3) Change the fallback default tool from claude-code to myclaude

#### Primary files to modify
- `/Users/lu/ccjk-public/src/constants.ts`
- `/Users/lu/ccjk-public/src/config/smart-defaults.ts`
- `/Users/lu/ccjk-public/src/utils/ccjk-config.ts`

#### Changes
- In `constants.ts`, change `DEFAULT_CODE_TOOL_TYPE` from `'claude-code'` to `'myclaude'`.
- In `smart-defaults.ts`, change the no-detection fallback in `SmartDefaultsDetector.detectCodeToolType()` from `'claude-code'` to `'myclaude'`.
- In `ccjk-config.ts`, no logic rewrite should be needed if it already derives `general.currentTool` and legacy fallbacks from `DEFAULT_CODE_TOOL_TYPE`; just validate those paths after the constant changes.

#### Why both constant and detector need updating
- `resolveCodeType()` ultimately falls back to `DEFAULT_CODE_TOOL_TYPE`.
- Fresh environment detection in `detectCodeToolType()` currently hardcodes `'claude-code'` when nothing is installed.
- Config creation also seeds `general.currentTool` from `DEFAULT_CODE_TOOL_TYPE`.
- Changing only one of these would leave inconsistent behavior between startup, fresh config creation, and environment detection.

### 4) Review secondary default/tool-specific assumptions

#### Files to inspect and only update if tests expose breakage
- `/Users/lu/ccjk-public/src/config/unified/ccjk-config.ts`
- `/Users/lu/ccjk-public/src/commands/menu/progressive/levels.ts`
- Any command modules that assume `'claude-code'` in fallback branches but are intended to follow the global default

#### Guidance
- `src/config/unified/ccjk-config.ts` already derives `currentTool` from `DEFAULT_CODE_TOOL_TYPE`, so it should track automatically once the constant changes.
- `src/commands/menu/progressive/levels.ts` may need its descriptive copy updated if the visible basic menu changes materially, but this is optional unless tests or UX review require exact menu descriptions.
- Do not mass-replace every `'claude-code'` literal in the repo; many are intentional tool-specific branches, not global defaults.

## Test plan

### Update existing tests
1. `/Users/lu/ccjk-public/tests/utils/code-type-resolver.test.ts`
   - Update expectations that rely on the fallback default being `claude-code`.
   - Add/adjust coverage for:
     - non-interactive fallback returning `myclaude` when detection fails
     - invalid explicit `codeTypeParam` error message showing the new default value

2. `/Users/lu/ccjk-public/tests/config/smart-defaults.test.ts`
   - Change no-detection expectations from `claude-code` to `myclaude`.
   - Keep existing explicit detection cases for `claude-code`, `myclaude`, and `codex`.
   - Add a direct assertion that the hard fallback path returns `myclaude` when no markers exist.

### Add new tests
3. New menu visibility test file recommended:
   - `/Users/lu/ccjk-public/tests/commands/menu/main-menu.test.ts`
   - Cover `getVisibleItems('basic', 'myclaude')` and `getVisibleItems('basic', 'claude-code')` to assert a visible switch item is present.
   - Assert Codex still gets its visible switch path and no regression in supported-tools filtering.
   - If you keep the basic 9-item cap behavior, test the actual returned item list order so the switch item is not accidentally truncated.

4. Optional shell behavior test if you keep footer `s`
   - `/Users/lu/ccjk-public/tests/commands/menu/index.test.ts`
   - Verify the menu shell/handler path returns `switch` after selecting or invoking code-tool switch in `myclaude` mode.
   - This is especially useful if you generalize direct footer-`s` handling beyond Codex.

## Verification steps
1. Run focused tests:
   - `pnpm vitest /Users/lu/ccjk-public/tests/utils/code-type-resolver.test.ts`
   - `pnpm vitest /Users/lu/ccjk-public/tests/config/smart-defaults.test.ts`
   - `pnpm vitest /Users/lu/ccjk-public/tests/commands/menu/main-menu.test.ts`
   - plus `index.test.ts` if added
2. Run broader validation:
   - `pnpm typecheck`
   - `pnpm build`
3. Manual menu verification:
   - Start the interactive menu with no stored tool config and verify first-run/default shell resolves to `myclaude`.
   - In `myclaude` basic menu, confirm `Switch Code Tool` is visible as a numbered item, not only a footer hint.
   - In `claude-code` basic menu, confirm the same visible switch item appears.
   - In `codex` mode, confirm existing visible switch behavior still works.
   - If footer `S` remains advertised for `myclaude`, confirm it actually triggers the switch flow.
4. Config verification:
   - Validate fresh config creation writes `general.currentTool = 'myclaude'` in `~/.ccjk/config.toml`.
   - Validate stored config still wins over fresh detection, preserving the current resolver contract.

## Key implementation note
The main hidden edge case is the basic-menu item cap. Because sections render in order (`quick` -> `config` -> `extensions` -> `tools` -> `cloud` -> `system`) and basic mode stops at 9 items, promoting `switch-code-tool` to `basic` without moving its category/order can still leave it invisible. The plan should explicitly address placement, not only level.

## Context
The current menu still supports code-tool switching, but in the Claude/myclaude-style shell it is effectively hidden behind the footer shortcut `S` instead of appearing as a visible main-menu action. At the same time, the global fallback/default tool is still `claude-code`, even though startup choice text now presents `myclaude` as the recommended default. The goal is to restore a visible switch entry in the main menu and make fresh default/fallback tool selection prefer `myclaude`.

## Recommended approach
1. Restore a visible switch-code-tool item in the main menu for Claude-family shells.
   - Update `/Users/lu/ccjk-public/src/commands/menu/main-menu.ts`.
   - Include `myclaude` in the non-Codex tool set so the shared Claude-family menu items apply to it.
   - Make the existing `switch-code-tool` item visible in basic mode instead of expert-only.
   - Place it in an early-rendered/basic-visible position so it is not dropped by the 9-item basic-menu cap.
   - Reuse existing i18n keys:
     - `menuOptions.switchCodeTool`
     - `menuDescriptions.switchCodeTool`

2. Reuse the existing switching flow instead of adding a new implementation.
   - Keep using the existing menu switch handling in `/Users/lu/ccjk-public/src/commands/menu/index.ts`.
   - Reuse:
     - `handleCodeToolSwitch(...)`
     - current selected-item dispatch logic for `switch-code-tool` / `codex-switch-tool`
   - Do not add a separate switch mechanism unless needed.
   - Keep Codex behavior intact.

3. Change the default/fallback tool to `myclaude`.
   - Update `/Users/lu/ccjk-public/src/constants.ts` so `DEFAULT_CODE_TOOL_TYPE` becomes `myclaude`.
   - Update `/Users/lu/ccjk-public/src/config/smart-defaults.ts` so `detectCodeToolType()` falls back to `myclaude` when nothing is detected.
   - Let `/Users/lu/ccjk-public/src/utils/code-type-resolver.ts` continue to reuse stored config first, then detection, then `DEFAULT_CODE_TOOL_TYPE`.
   - Let `/Users/lu/ccjk-public/src/utils/ccjk-config.ts` continue to derive new config defaults from `DEFAULT_CODE_TOOL_TYPE`.

4. Update tests to match the new behavior.
   - Update/add menu assertions so Claude-family basic menus expose a visible switch item.
   - Update resolver/default tests so no-config/no-detection fallback is `myclaude`.
   - Keep Codex-specific switch behavior covered.

## Critical files
- `/Users/lu/ccjk-public/src/commands/menu/main-menu.ts`
- `/Users/lu/ccjk-public/src/commands/menu/index.ts`
- `/Users/lu/ccjk-public/src/constants.ts`
- `/Users/lu/ccjk-public/src/config/smart-defaults.ts`
- `/Users/lu/ccjk-public/src/utils/code-type-resolver.ts`
- `/Users/lu/ccjk-public/src/utils/ccjk-config.ts`
- `/Users/lu/ccjk-public/src/commands/menu/index.test.ts`
- `/Users/lu/ccjk-public/tests/commands/menu/main-menu.test.ts`
- `/Users/lu/ccjk-public/tests/utils/code-type-resolver.test.ts`
- `/Users/lu/ccjk-public/tests/config/smart-defaults.test.ts`

## Existing code to reuse
- `getVisibleItems(...)` in `/Users/lu/ccjk-public/src/commands/menu/main-menu.ts`
- `isItemSupportedForTool(...)` in `/Users/lu/ccjk-public/src/commands/menu/main-menu.ts`
- `handleCodeToolSwitch(...)` in `/Users/lu/ccjk-public/src/commands/menu/index.ts`
- `resolveCodeType(...)` and `resolveStartupCodeType(...)` in `/Users/lu/ccjk-public/src/utils/code-type-resolver.ts`
- `createDefaultTomlConfig(...)` in `/Users/lu/ccjk-public/src/utils/ccjk-config.ts`
- `detectCodeToolType()` in `/Users/lu/ccjk-public/src/config/smart-defaults.ts`

## Verification
1. Targeted tests:
   - `pnpm vitest tests/commands/menu/main-menu.test.ts`
   - `pnpm vitest tests/commands/menu/index.test.ts`
   - `pnpm vitest tests/utils/code-type-resolver.test.ts`
   - `pnpm vitest tests/config/smart-defaults.test.ts`
2. Project verification:
   - `pnpm typecheck`
   - `pnpm build`
3. Manual behavior checks:
   - Fresh/fallback resolution selects `myclaude`.
   - myclaude basic menu shows a visible Switch Code Tool entry.
   - claude-code basic menu also shows the visible switch entry.
   - Codex menu still switches correctly.
   - Existing stored `codeToolType` still overrides fallback behavior.

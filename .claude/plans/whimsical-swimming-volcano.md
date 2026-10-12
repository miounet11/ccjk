# Context

The remaining myclaude basic-menu issues are UX alignment problems, not core plumbing failures:

1. **Notifications are functional but described inaccurately.**
   - `notifications` already routes to `src/commands/notification.ts`, which provides real status/config/test/cloud/local flows.
   - Current menu copy makes it sound like an announcements viewer instead of task-completion alert setup.

2. **Memory config is split across two different Claude-family experiences.**
   - Progressive myclaude/claude-code menu currently routes `memory-config` to `configureMemoryFeature()` in `src/utils/features.ts`.
   - Legacy config submenu routes `memory-config` to `configureAiMemoryFeature()` in `src/utils/features.ts`.
   - `configureMemoryFeature()` is the actual project-memory center (`MEMORY.md` status/doctor/view/edit/sync).
   - `configureAiMemoryFeature()` manages adjacent preferences (`CLAUDE.md`, output language, output style, Postmortem), which makes the label conflict worse.

The intended outcome is one consistent myclaude memory entry point that feels complete, plus notification wording that matches the real feature.

# Recommended approach

## 1. Keep Claude-family memory on the real memory center and make it complete

**Why this path:**
- `configureMemoryFeature()` already matches the user-visible promise of “memory config” better than `configureAiMemoryFeature()` because it handles actual memory files and sync state.
- The standalone `ccjk memory` command and health/mirror utilities already align with this model.
- The smallest safe fix is to keep that path and add only the missing adjacent preferences users expect from a “memory” menu.

**Reuse these existing functions/utilities:**
- `src/utils/features.ts`
  - `configureMemoryFeature()`
  - `changeScriptLanguageFeature()`
  - `configureOutputStyle()`
- `src/commands/memory.ts`
  - existing status/doctor/view/edit/sync behavior and wording patterns
- `src/utils/memory-paths.ts`
- `src/utils/memory-sync.ts`
- `src/health/checks/memory-check.ts`

**Files to modify:**
- `src/utils/features.ts`
- `src/commands/menu/submenus/config.ts`
- `src/health/checks/memory-check.ts`

**Implementation direction:**
- Keep progressive myclaude/claude-code `memory-config` routing on `configureMemoryFeature()`.
- Update the legacy config submenu so Claude-family memory also routes to `configureMemoryFeature()` instead of `configureAiMemoryFeature()`.
- Extend `configureMemoryFeature()` with the two highest-value adjacent options already implemented elsewhere:
  - AI output language
  - output style
- Do not merge the full `configureAiMemoryFeature()` surface in this pass.
- Tighten the doctor/status copy so it describes shared Claude-family memory rather than “Claude auto-memory” only.

## 2. Polish notification wording, not notification logic

**Reuse existing behavior:**
- `src/commands/notification.ts`
  - keep current menu/status/config/test/cloud/local flows intact

**Files to modify:**
- `src/i18n/locales/en/menu.json`
- `src/i18n/locales/zh-CN/menu.json`
- `src/i18n/locales/en/notification.json`
- `src/i18n/locales/zh-CN/notification.json`
- optionally `src/commands/notification.ts` only for any tiny remaining hardcoded literal that blocks consistency

**Implementation direction:**
- Change menu copy from “system notifications and announcements” to task alert / completion notification wording.
- Keep the command behavior unchanged unless a tiny literal needs localization.
- Make the feature read clearly as: configure alert channels, thresholds, cloud binding, and local delivery.

## 3. Add narrow regression coverage for the routing and expanded memory menu

**Files to modify/add:**
- add a menu routing test file or extend an existing menu routing test
- add/extend a feature test for `configureMemoryFeature()`

**Add/extend tests for:**
- progressive `memory-config` uses `configureMemoryFeature()` for `myclaude`
- legacy config submenu `memory-config` also uses `configureMemoryFeature()` for Claude-family tools
- `notifications` still routes to `notificationCommand()`
- `configureMemoryFeature()` dispatches the new language/output-style choices correctly
- existing memory status/doctor/view/sync behavior still works after the menu expansion

# Critical files

- `src/utils/features.ts`
- `src/commands/menu/index.ts`
- `src/commands/menu/submenus/config.ts`
- `src/commands/notification.ts`
- `src/commands/memory.ts`
- `src/utils/memory-paths.ts`
- `src/utils/memory-sync.ts`
- `src/health/checks/memory-check.ts`
- `src/i18n/locales/en/menu.json`
- `src/i18n/locales/zh-CN/menu.json`
- `src/i18n/locales/en/notification.json`
- `src/i18n/locales/zh-CN/notification.json`

# Verification

1. **Type/build verification**
- `pnpm typecheck`
- `pnpm build`

2. **Targeted tests**
- run the new/updated menu routing and memory feature tests
- re-run `tests/commands/api-config-selector.test.ts`
- re-run `src/commands/menu/main-menu.test.ts`
- re-run `src/utils/tool-update-scheduler.test.ts`

3. **Behavioral verification**
- in myclaude mode, confirm `notifications` opens the existing notification menu and the surrounding copy now describes task alerts accurately
- in myclaude mode, confirm `memory-config` opens one unified Claude-family memory center with:
  - status
  - doctor
  - view/edit
  - sync
  - AI output language
  - output style
- confirm the legacy config submenu reaches the same memory flow

4. **Health wording verification**
- confirm memory doctor/health output is no longer misleadingly Claude-only when used in myclaude mode

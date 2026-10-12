# Context
The repository already has a root `CLAUDE.md`, but it is too long, repeats information that can be discovered from the tree, and mixes durable guidance with stale snapshots (for example broad module inventories and changelog-style history). The user asked for an improved `CLAUDE.md`, not a new one from scratch, so the right change is to trim and refocus the existing file around high-value guidance that future coding agents actually need.

# Recommended approach
1. Replace the current root `CLAUDE.md` with a shorter version that keeps the required header exactly as-is.
2. Keep only commands that are directly supported by `package.json` and useful during normal development:
   - `pnpm install`
   - `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`
   - `pnpm test:run`, `pnpm test:integration:run`, `pnpm test:e2e:run`, `pnpm test:v2:run`
   - `pnpm vitest <path-to-test-file>` for a single test file
   - `node dist/cli.mjs` and `node dist/cli.mjs <command>` for local CLI verification after build
3. Rework the architecture section around the real execution path and cross-module relationships confirmed from the code:
   - `bin/ccjk.mjs` → `src/cli.ts` → `src/cli-lazy.ts`
   - `src/cli-commands.ts` is the command registry and lazy loader boundary
   - `src/commands/init.ts` is the main setup flow and branches into silent/smart variants
   - `src/commands/menu/index.ts` is the real interactive menu entry, replacing the old monolithic menu path
   - `src/utils/features.ts` and related config helpers apply most user-facing configuration changes
   - `src/code-tools/` abstracts per-runtime behavior (`claude-code`, `myclaude`, `codex`, etc.)
   - `src/discovery/` provides project analysis and recommendations consumed by setup/generation flows
   - `src/config/workflows.ts` maps installable command/agent templates to template directories
4. Preserve the project-specific rules that materially affect changes:
   - CCJK complements Claude Code rather than competing with it
   - skills should only run when explicitly invoked
   - menu/init behavior must respect the current menu-to-handler wiring
   - for Claude-family runtimes, model env vars and `settings.model` interactions are a critical area
   - `bootstrapCloudServices()` should not be described as active interactive-menu startup behavior
5. Remove or condense sections that are not good long-term guidance:
   - root changelog table
   - exhaustive module index / documentation coverage tables
   - generic coding standards already obvious from the repo
   - “common tasks” lists unless they are backed by real code paths still in use
6. Add a short note that module-level `src/**/CLAUDE.md` files exist and should be consulted for subsystem detail, while keeping the root file focused on repo-wide guidance.

# Critical files to modify
- `/Users/lu/ccjk-public/CLAUDE.md`

# Existing files and evidence to reuse
- `/Users/lu/ccjk-public/package.json` — authoritative source for build, lint, test, and verification commands
- `/Users/lu/ccjk-public/README.md` — product positioning and user-facing capabilities worth summarizing briefly
- `/Users/lu/ccjk-public/src/cli.ts` — confirms the thin entry point into lazy CLI startup
- `/Users/lu/ccjk-public/src/cli-lazy.ts` — confirms startup flow, lazy registration, and caution around `bootstrapCloudServices()`
- `/Users/lu/ccjk-public/src/cli-commands.ts` — confirms the command registry and exposed commands
- `/Users/lu/ccjk-public/src/commands/init.ts` — confirms the main setup orchestration and init variants
- `/Users/lu/ccjk-public/src/commands/menu/index.ts` — confirms the current interactive menu implementation and handler wiring
- `/Users/lu/ccjk-public/src/utils/features.ts` — confirms config-feature entry points used from the menu/config flows
- `/Users/lu/ccjk-public/src/config/workflows.ts` — confirms workflow/template mapping
- `/Users/lu/ccjk-public/vitest.integration.config.ts` and `/Users/lu/ccjk-public/vitest.e2e.config.ts` — confirm test suite boundaries

# Verification
- Re-read the updated `CLAUDE.md` to ensure the required header is preserved verbatim.
- Cross-check every command in the file against `package.json` scripts.
- Ensure the architecture claims match the current code paths listed above.
- Confirm the revised file does not repeat large directory listings, stale coverage tables, or speculative guidance not grounded in the repo.
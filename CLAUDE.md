# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCJK is a TypeScript CLI for setting up and managing AI coding environments around Claude Code, myclaude, Codex, and related workflows. It combines local CLI setup, configuration management, MCP/service installation, workflow template installation, and project-aware recommendations.

The repo is a pnpm workspace. The root package builds the CLI plus workspace packages under `packages/*`.

## Common Commands

```bash
pnpm install

# Development
pnpm dev
pnpm build      # builds workspace release deps first, then the root CLI bundle
pnpm typecheck  # typechecks after building required workspace deps
pnpm lint

# Tests
pnpm test:run
pnpm test:integration:run
pnpm test:e2e:run
pnpm vitest tests/commands/init.integration.test.ts
pnpm vitest <path>

# Run the built CLI locally
node dist/cli.mjs
node dist/cli.mjs init
```

## Test Suite Boundaries

- `pnpm test:run` runs the main Vitest suite.
- `pnpm test:integration:run` uses `vitest.integration.config.ts` and expects local service-style env defaults such as Postgres/Redis/Elasticsearch.
- `pnpm test:e2e:run` uses `vitest.e2e.config.ts` with longer timeouts and serial execution.
- Use `pnpm vitest <path>` when you only need one file.

## Architecture

### Core logic and core value

CCJK's core logic is not “be another assistant.” It is a provider-first setup and orchestration layer that sits between the user, the selected coding runtime, and the runtime's real config stores.

In practice, the main loop is:
- resolve which runtime is being managed (`src/utils/code-type-resolver.ts`)
- run the right setup or menu flow (`src/commands/init.ts`, `src/commands/menu/index.ts`)
- write configuration into the correct layers (`~/.ccjk/` state, `~/.claude/` settings/MCP files, runtime-specific profile state)
- install and wire reusable capabilities (MCP servers, workflow templates, generated skills/agents)
- keep the configured runtime usable without taking over its normal interaction model

CCJK's core value is operational leverage:
- one control plane for multiple coding runtimes instead of separate manual setup flows
- consistent provider/profile/model configuration across init, menu, and repair paths
- project-aware recommendations and installable workflows that shorten setup time
- additive automation that improves Claude-family/myclaude/Codex environments without replacing them

When evaluating a change, ask whether it strengthens or weakens these invariants:
- runtime selection stays explicit and traceable
- config sync stays correct across all storage layers
- workflow/MCP installation remains config-driven
- startup behavior remains additive rather than intrusive

### CLI startup path

The actual runtime path is:

`bin/ccjk.mjs` → `src/cli.ts` → `src/cli-lazy.ts`

`src/cli.ts` is intentionally thin. `src/cli-lazy.ts` owns startup behavior, lazy command setup, language initialization, startup checks, and slash-command handling.

`src/cli-lazy.ts` also performs startup-side orchestration before normal command parsing: startup spinner, settings migration, cloud bootstrap hook, Brain hook auto-init, auto-fix, update checks, quick provider launch detection, and slash-command dispatch.

### Command registration and execution

- `src/cli-commands.ts` is the command registry. Each command declares its name/options and a lazy `loader()`.
- `src/cli-lazy.ts` walks that registry and wires it into CAC.
- The registry contains some legacy overlap and duplicate-looking entries (`memory`, `config`, `context`, `ccjk:skills`). Trace the actual handler path instead of assuming the first matching block is authoritative.
- Some commands are also registered outside the main registry via `registerSpecialCommands()` in `src/cli-lazy.ts`.
- If you add or change a command, confirm both the command definition and the lazy-loaded handler stay aligned.

### Main user flows

- `src/commands/init.ts` is the main setup orchestration path. It selects the target code tool, configures API access, installs MCP services/workflows, and branches into silent/smart variants via `src/commands/init-variants`.
- `src/commands/menu/index.ts` is the real interactive menu entry. The top-level `src/commands/menu.ts` is only a re-export shim.
- The menu is mostly a dispatcher: handlers in `src/commands/menu/index.ts` route into `src/utils/features.ts`, command modules, or runtime-specific helpers.
- `src/utils/features.ts` contains many of the user-facing configuration entry points that menu actions call.

### Configuration model

Most user-visible behavior is driven by a few layers working together:

- `src/utils/config.ts` and related helpers manage API/model/settings changes.
- `src/utils/claude-config.ts` manages Claude-family config files, MCP server wiring, and profile-related updates.
- `src/utils/code-type-resolver.ts` determines which runtime/tool is being configured.
- `src/code-tools/` is the abstraction layer for runtime-specific behavior (`claude-code`, `myclaude`, `codex`, etc.).

Runtime selection is central: `src/utils/code-type-resolver.ts` prefers stored CCJK config, then fresh detection, then the default. That decision affects the menu, init flow, and whether Claude-family or Codex-specific code paths run.

Configuration state is split across multiple stores. CCJK state lives under `~/.ccjk/`, while Claude-family runtime state lives in `~/.claude/` files such as `settings.json` and related config JSON. `src/utils/claude-config.ts` also manages MCP state and myclaude provider profile sync, so config work should verify every affected layer rather than assuming a single source of truth.

myclaude support is profile-sync based, not just a label swap. `src/utils/claude-config.ts` syncs the active provider profile into Claude settings/env state, and `src/commands/menu/index.ts` renders runtime-specific myclaude status from that synced profile data.

When working on config changes, verify both the shared helpers and the runtime-specific path. This repo supports multiple coding runtimes, not just one.

### Discovery, generation, and workflows

Several subsystems feed recommendations and installed assets into setup flows:

- `src/discovery/` analyzes the current project and produces skill/MCP recommendations.
- `src/generation/` turns project analysis into generated agents/skills.
- `src/config/workflows.ts` is the source of truth for installable workflow definitions and template mapping.
- `src/utils/workflow-installer.ts` consumes that config and copies command/agent templates into the user environment.
- `templates/` contains the files copied into user environments.

### Menu wiring matters

The interactive menu is a critical integration surface. Keep handler wiring consistent with the current implementation in `src/commands/menu/index.ts`, especially for init/config/model/memory/MCP actions.

## Project-Specific Rules

### CCJK complements Claude Code

This project is intentionally additive. Do not turn CCJK into a competing assistant runtime with unsolicited behavior.

Important consequences already reflected in the codebase:
- skills should only run when explicitly invoked
- avoid startup behavior that hijacks normal interactive CLI usage
- be careful describing experimental brain-router pieces as shipped default behavior

### Cloud bootstrap is not normal interactive-menu behavior

`bootstrapCloudServices()` exists in `src/cli-lazy.ts`, but the repo guidance is explicit that interactive menu entry should not be described as if cloud bootstrap is part of the normal menu startup path. Verify the actual invocation path before claiming startup behavior.

### Model routing has sharp edges

For Claude-family runtimes, `settings.model` and `settings.env.ANTHROPIC_*` can override each other in surprising ways. Changes in this area should preserve the intended env-based routing behavior and compatibility keys such as the fast-model mapping.

### Root config is not the same as Claude config

CCJK state is not only in `~/.claude/`. The project also relies on CCJK-managed config under `~/.ccjk/`, and code-tool resolution depends on that state.

### Prefer live code paths over nested docs when they disagree

Some module-local `src/**/CLAUDE.md` snapshots lag current root behavior. Use them for subsystem orientation, but trust the current startup path, command registry, and active handlers in code when there is a conflict.

## Working Effectively In This Repo

- If a command or behavior looks monolithic, check whether it was split into a newer module first. The menu flow is a good example: the real implementation is under `src/commands/menu/`.
- Prefer verifying behavior through the actual command registry and startup path rather than trusting older documentation comments.
- No `.cursor/rules/**/*`, `.cursorrules`, or `.github/copilot-instructions.md` files are present at repo root, so there is no extra editor-rule layer to merge.
- README claims should only influence repo guidance when they match current code paths; avoid repeating marketing-style feature descriptions as implementation facts.
- For repo-wide guidance, use this file first. For subsystem details, check the nearest module-level `src/**/CLAUDE.md` file if one exists.

## Verification

For most CLI changes, the quickest useful verification is:

```bash
pnpm typecheck
pnpm build
```

Then run the affected command through the built CLI, for example:

```bash
node dist/cli.mjs
node dist/cli.mjs init
```

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-03-06 | 13.3.11 | Guardrail: custom Claude model config must keep `ANTHROPIC_DEFAULT_HAIKU_MODEL` and `ANTHROPIC_SMALL_FAST_MODEL` synchronized; never remove the fast-model compatibility key |
| 2026-03-05 | 13.3.5 | Model selection fix: remove ANTHROPIC_MODEL env var to enable adaptive model selection based on task complexity |
| 2026-03-04 | 13.3.4 | Fix: remove duplicate prompt hints in model config |
| 2026-03-04 | 13.3.3 | Architecture documentation update: comprehensive module index with 33 modules, improved navigation structure, coverage tracking |
| 2026-03-04 | 12.2.2 | Slash command compatibility: CLI interceptor for `/clear`, `/reset` commands; auto-executor for brain router |
| 2026-03-03 | 12.3.1 | Fix model priority: primaryModel now correctly sets ANTHROPIC_MODEL env var, and ANTHROPIC_MODEL is properly cleared when switching profiles |
| 2026-03-03 | 12.2.1 | Smart routing and telemetry improvements |
| 2026-03-02 | 12.1.0 | Fast installation & hierarchical menu system |
| 2026-02-27 | 12.0.15 | Menu system refactored: hierarchical menu with 3-level structure, unified shortcuts (1-8, L, H, Q), optimized i18n (8-12 chars CN, 20-40 chars EN), enabled via CCJK_HIERARCHICAL_MENU=1 |
| 2026-02-27 | 12.0.15 | CLAUDE.md review: added Quick Start section and debugging gotchas |
| 2026-02-25 | 12.0.8 | Wire up smartGenerateAndInstall: add `generate`/`gen` CLI command, menu G. option, post-init prompt, help doc entry |
| 2026-02-25 | 12.0.7 | Architecture diagram added; module index expanded to cover all src/ modules; module-level CLAUDE.md files generated |

## Project Overview

CCJK is a TypeScript CLI tool that configures AI coding environments. It provides one-click setup for Claude Code, Codex, and other AI code tools with MCP services, API configuration, and workflow templates.

**Key capabilities:**
- Brain System: Multi-agent orchestration with context compression
- Cloud Sync: Configuration synchronization via GitHub Gist, WebDAV, or S3
- MCP Marketplace: One-click MCP service installation
- Health Monitor: Score-based setup quality assessment (`ccjk status`)
- Code Tool Abstraction: Unified interface for Claude Code, Codex, Aider, Continue, Cline, Cursor
- Cloud Client: Remote skills marketplace, recommendations, and telemetry
- Smart Generation: Auto-detect project type and generate agents/skills

## Anti-Aggression Principle

CCJK complements Claude Code CLI — it does NOT compete with it. Critical rules:
- Skills must ONLY run when user explicitly invokes them
- No unsolicited output (no welcome banners, no auto-print on startup)
- Brain hook runs in silent mode
- `bootstrapCloudServices()` is skipped entirely during interactive menu to prevent config write races

## Model Config Guardrails

- For custom Claude model routing, keep `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_OPUS_MODEL` in sync with the selected CCJK profile.
- Always mirror `ANTHROPIC_DEFAULT_HAIKU_MODEL` into `ANTHROPIC_SMALL_FAST_MODEL`.
- Never delete the Haiku fast-model compatibility key during cleanup, migration, or “priority fix” logic.
- Do not assume missing `settings.model` is harmless; `/model` display and user expectations can diverge from env-only state.

## Architecture Overview

```mermaid
graph TD
    A["bin/ccjk.mjs"] --> B["src/cli.ts"]
    B --> C["src/cli-lazy.ts"]
    C --> D["commands/"]
    C --> E["brain/"]
    C --> F["cloud-sync/"]
    C --> G["code-tools/"]
    C --> H["health/"]
    C --> I["discovery/"]
    C --> J["utils/"]
    C --> K["config/"]
    C --> L["i18n/"]
    C --> M["context/"]
    C --> N["agents/"]
    C --> O["cloud-client/"]
    C --> P["generation/"]
    C --> Q["skills/"]
    C --> R["api-providers/"]
    C --> S["orchestrators/"]
    C --> T["services/"]
    C --> U["workflow/"]

    click D "./src/commands/CLAUDE.md" "Commands module"
    click E "./src/brain/CLAUDE.md" "Brain module"
    click F "./src/cloud-sync/CLAUDE.md" "Cloud Sync module"
    click G "./src/code-tools/CLAUDE.md" "Code Tools module"
    click H "./src/health/CLAUDE.md" "Health module"
    click I "./src/discovery/CLAUDE.md" "Discovery module"
    click J "./src/utils/CLAUDE.md" "Utils module"
    click K "./src/config/CLAUDE.md" "Config module"
    click L "./src/i18n/CLAUDE.md" "i18n module"
    click M "./src/context/CLAUDE.md" "Context module"
    click N "./src/agents/CLAUDE.md" "Agents module"
    click O "./src/cloud-client/CLAUDE.md" "Cloud Client module"
    click P "./src/generation/CLAUDE.md" "Generation module"
    click Q "./src/skills/CLAUDE.md" "Skills module"
    click R "./src/api-providers/CLAUDE.md" "API Providers module"
    click S "./src/orchestrators/CLAUDE.md" "Orchestrators module"
    click T "./src/services/CLAUDE.md" "Services module"
    click U "./src/workflow/CLAUDE.md" "Workflow module"
```

## Module Index

### Core Modules (High Priority)

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| CLI Entry | `src/cli.ts` + `src/cli-lazy.ts` | Lazy-loading command registration (~2200 lines) | ✓ | High |
| commands | `src/commands/` | All CLI command implementations (init, menu, mcp, agents, etc.) | ✓ | High |
| brain | `src/brain/` | Multi-agent orchestration, skill hot-reload, session management | ✓ | Medium |
| code-tools | `src/code-tools/` | Unified abstraction for Claude Code, Codex, Aider, Continue, Cline, Cursor | ✓ | High |
| utils | `src/utils/` | Config management, platform support, installer, workflow installer | ✓ | High |
| config | `src/config/` | Workflow, MCP service, and API provider definitions | ✓ | High |

### Cloud & Sync Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| cloud-sync | `src/cloud-sync/` | Config sync via GitHub Gist, WebDAV, S3 | ✓ | Medium |
| cloud-client | `src/cloud-client/` | Remote API client: skills marketplace, recommendations, telemetry | ✓ | High |
| cloud-plugins | `src/cloud-plugins/` | Cloud plugin management and recommendation engine | ✗ | Low |

### Intelligence & Context Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| context | `src/context/` | Context window management, compression, caching, analytics | ✓ | Medium |
| agents | `src/agents/` | Cowork orchestration patterns for multi-agent tasks | ✓ | Medium |
| generation | `src/generation/` | Smart project analysis → agent/skill config generation | ✓ | Low |
| skills | `src/skills/` | Skill registry, auto-trigger, intent detection | ✓ | Medium |
| intents | `src/intents/` | Intent detection and routing | ✗ | Low |
| discovery | `src/discovery/` | Project analyzer + skill/MCP matcher | ✓ | Medium |
| analyzers | `src/analyzers/` | Code and project analysis utilities | ✗ | Low |

### API & Provider Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| api-providers | `src/api-providers/` | Multi-provider API management (302.AI, GLM, OpenAI, Anthropic, etc.) | ✓ | High |

### System & Infrastructure Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| health | `src/health/` | Score-based health check engine (6 weighted checks) | ✓ | Low |
| monitoring | `src/monitoring/` | System monitoring and metrics collection | ✗ | Low |
| orchestrators | `src/orchestrators/` | Task orchestration and workflow management | ✓ | Medium |
| workflow | `src/workflow/` | Workflow definition and execution | ✓ | Medium |
| task-manager | `src/task-manager/` | Task queue and execution management | ✗ | Low |
| services | `src/services/` | Shared services and utilities | ✓ | Medium |

### Security & Execution Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| permissions | `src/permissions/` | Permission management and validation | ✓ | Medium |
| sandbox | `src/sandbox/` | Sandboxed execution environment | ✓ | Low |

### UI & Interaction Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| i18n | `src/i18n/` | i18next with zh-CN and en locales (15 translation modules) | ✓ | High |
| cli | `src/cli/` | Shell completion for Bash, Zsh, Fish, PowerShell | ✓ | Low |
| terminal | `src/terminal/` | Terminal UI and interaction utilities | ✗ | Low |
| interview | `src/interview/` | Interactive interview system for configuration | ✗ | Low |

### Marketplace & Plugins

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| mcp-marketplace | `src/mcp-marketplace/` | MCP service marketplace and discovery | ✗ | Medium |
| plugins-v2 | `src/plugins-v2/` | Plugin system v2 architecture | ✓ | Low |

### Support Modules

| Module | Path | Responsibility | Doc Status | Test Coverage |
|--------|------|----------------|------------|---------------|
| bootstrap | `src/bootstrap/` | Application bootstrap and initialization | ✗ | Low |
| core | `src/core/` | Core utilities and shared functionality | ✗ | Medium |
| types | `src/types/` | Shared TypeScript type definitions | ✓ | N/A |
| postmortem | `src/postmortem/` | Post-execution analysis and reporting | ✗ | Low |

**Documentation Coverage**: 24/33 modules (72.7%)

**Modules needing documentation**: cloud-plugins, bootstrap, core, interview, intents, mcp-marketplace, monitoring, postmortem, task-manager, terminal, analyzers

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Run in dev mode
pnpm dev

# 4. Test the CLI
node dist/cli.mjs --help
echo '1' | node dist/cli.mjs 2>&1  # Test menu option 1
```

**First-time contributors:**
1. Read the Anti-Aggression Principle section
2. Understand the Menu → Feature Function Mapping
3. Run `pnpm typecheck && pnpm build` before committing

## Build and Development Commands

```bash
pnpm dev                    # Run CLI in development mode (tsx)
pnpm build                  # Production build (unbuild)
pnpm typecheck              # TypeScript type checking
pnpm lint                   # ESLint check
pnpm lint:fix               # Auto-fix ESLint issues
pnpm test:run               # Run tests once (no watch)
pnpm vitest <pattern>       # Run specific test file
pnpm test:e2e               # End-to-end tests
```

**Quick verification:** `pnpm typecheck && pnpm build`

**Test a menu option:** `echo '<option>' | node dist/cli.mjs 2>&1`

## Architecture

### Entry Point Flow

`bin/ccjk.mjs` → `src/cli.ts` → `src/cli-lazy.ts` (actual command registration)

`cli-lazy.ts` is the real entry point (~2200 lines). It uses a tiered lazy-loading system:
- **core**: Commands registered at startup, executed lazily (init, menu, status, boost)
- **extended**: Fully lazy-loaded (doctor, mcp, codex, etc.)
- **deprecated**: Show migration messages

### Key Modules

```
src/
├── cli-lazy.ts             # Actual entry point, lazy command registration (~2200 lines)
├── commands/
│   ├── menu.ts             # Main interactive menu (options 1-7 + extras)
│   ├── init.ts             # Full init flow and simplified init
│   ├── status.ts           # Brain Dashboard (health score + recommendations)
│   └── boost.ts            # One-click optimization
├── brain/                  # Multi-agent orchestration
├── cloud-sync/             # Cloud config sync (Gist, WebDAV, S3)
├── cloud-client/           # Remote API: skills marketplace, recommendations, telemetry
├── code-tools/             # Code tool abstraction layer
├── health/                 # Health scoring engine (6 weighted checks)
├── discovery/              # Project analyzer + skill/MCP matcher
├── generation/             # Smart agent/skill generation from project analysis
├── skills/                 # Skill registry, auto-trigger, intent detection
├── context/                # Context window management and compression
├── agents/                 # Cowork orchestration patterns
├── api-providers/          # Multi-provider API management
├── utils/
│   ├── features.ts         # Feature functions called by menu
│   ├── config.ts           # Settings.json management
│   ├── claude-config.ts    # MCP config management
│   └── permission-cleaner.ts # Permission validation and repair
├── config/                 # Workflow, MCP, API provider definitions
└── i18n/                   # i18next (zh-CN, en)
```

### Menu → Feature Function Mapping

This is the most critical flow. Menu options in `src/commands/menu.ts` must call specific functions:
- **Option 1**: `init({ skipBanner: true })` — NOT `simplifiedInit()`
- **Option 3**: `configureApiFeature()` from `utils/features.ts`
- **Option 4**: `configureMcpFeature()` from `utils/features.ts`
- **Options 5-7**: `configureDefaultModelFeature` / `configureAiMemoryFeature` / `configureEnvPermissionFeature`
- **Utility items (0, S, -, +, D, H, R, B)**: Return `undefined` to skip "return to menu" prompt

### Config Write Safety

`bootstrapCloudServices()` runs via `setImmediate()` in background and can write to `settings.json`. To prevent race conditions:
- It is **skipped entirely** when entering interactive menu (no args)
- `configureApi()` reads existing settings directly (no template merge) and verifies writes
- `syncMcpPermissions()` uses atomic writes via `writeJsonConfig()`
- All JSON writes use `writeJsonConfig()` which does atomic rename

## Testing Strategy

- **Unit tests**: `tests/` mirrors `src/` structure; run with `pnpm test:run`
- **Integration tests**: `tests/integration/` and `tests/v2/integration/`; run with `pnpm test:integration:run`
- **E2E tests**: `tests/e2e/`; run with `pnpm test:e2e:run`
- **V2 tests**: New test suite with `pnpm test:v2:run`
- **Benchmarks**: `scripts/benchmark-compression.ts`, `scripts/benchmark-fts5-search.ts`
- **Test a specific file**: `pnpm vitest tests/commands/init.integration.test.ts`
- **Watch mode**: `pnpm test:watch` (unit), `pnpm test:integration` (integration), `pnpm test:v2:watch` (v2)
- **Coverage**: Add `:coverage` suffix to any test command (e.g., `pnpm test:coverage`)

## Key Patterns

**i18n:** All user-facing strings use `i18n.t('namespace:key')`. Translations in `src/i18n/locales/{zh-CN,en}/`.

**Configuration:** User configs in `~/.claude/settings.json`. Backups in `~/.claude/backup/`. Template in `templates/claude-code/common/settings.json`.

**Permissions:** Claude Code only recognizes: `Bash(pattern)`, `Read(path)`, `Write(path)`, `Edit(path)`, `NotebookEdit(path)`, `WebFetch(domain)`, `MCP(server:tool)`, `mcp__server_name`. Do NOT use `AllowEdit`, `AllowWrite`, etc. — these are invalid and will be auto-stripped by `permission-cleaner.ts`.

**Code Tool Abstraction:** `src/code-tools/core/` defines `ICodeTool` interface. Adapters in `src/code-tools/adapters/`.

**Cloud Client:** `src/cloud-client/` wraps the remote API with retry, caching, and local fallback layers. Use `createCompleteCloudClient()` for production use.

**Smart Generation:** `src/generation/` provides `smartGenerateAndInstall()` — analyzes project, selects templates, writes agent/skill configs.

**Brain Router:** `src/brain/router/` handles CLI command interception and auto-execution. The CLI interceptor (`cli-interceptor.ts`) enables slash command compatibility (`/clear`, `/reset`) and the auto-executor (`auto-executor.ts`) manages brain router command execution.

## Coding Standards

- **ESM-Only**: No CommonJS. Use `pathe` for paths, `tinyexec` for commands.
- **TypeScript**: Strict mode, ESNext target.
- **Cross-Platform**: Handle Windows paths, macOS, Linux, Termux.
- **File Deletion**: Use `trash` package.
- **Language**: Code comments, docs, and commits in English.

## Release & Publishing

```bash
# 1. Bump version in package.json
# 2. Fix catalog: references if any
node scripts/fix-package-catalog.mjs
grep -c "catalog:" package.json  # Must return 0

# 3. Build and publish
pnpm build
npm publish --access public --ignore-scripts  # Skip tests if pre-existing failures

# 4. Push to GitHub
git push origin main
```

**CRITICAL**: pnpm's `catalog:` protocol in `package.json` causes npm install failures. Always run `node scripts/fix-package-catalog.mjs` before publishing and verify `grep -c "catalog:" package.json` returns 0.

## Common Tasks

**Adding a Command:**
1. Create file in `src/commands/`
2. Add i18n strings in `src/i18n/locales/{zh-CN,en}/`
3. Register in `src/cli-lazy.ts` COMMANDS array with appropriate tier
4. Write tests in `tests/commands/`

**Adding MCP Service:** Define in `src/config/mcp-services.ts`, add i18n strings.

**Adding API Provider:** Define in `src/api-providers/providers/`, add validation and i18n.

**Adding Workflow:** Define in `src/config/workflows.ts`, add templates in `templates/`.

## Debugging Gotchas

**Tool-specific issues:**
- macOS `cat` has no `-A` flag (use `od -c` or `hexdump` instead)
- zsh doesn't expand `*.md` globs in Bash tool; use `python3 glob.glob()` or quote patterns
- Parallel tool calls with sibling errors cause ALL calls in batch to fail
- File edits can appear to succeed but actually fail; always verify with grep/read after
- IDE/file watchers may revert file changes between tool calls; chain sed+git add in one command

**Config-related:**
- ccjk config lives at `~/.ccjk/config.toml` (via ZCF_CONFIG_DIR), NOT inside `~/.claude/`
- Full uninstall removes `~/.claude/` but leaves `~/.ccjk/config.toml` with stale codeTool preference
- `resolveCodeType()` in `code-type-resolver.ts` is the central resolver: stored config → fresh detection → default
- Menu option 1 must pass `codeType: 'claude-code'` to init() to override stale config

**Model Priority (v12.3.1+):**
- Claude Code config priority: `settings.model` > `settings.env.ANTHROPIC_*` env vars
- When custom models are configured via ccjk, they're set as env vars (ANTHROPIC_MODEL, ANTHROPIC_DEFAULT_HAIKU_MODEL, etc.)
- If `settings.model` exists, it overrides all env vars, breaking custom model selection
- `claude-code-config-manager.ts` now deletes `settings.model` when custom model env vars are detected
- This allows Claude Code to use different models based on context (Haiku for quick tasks, Sonnet for standard, Opus for complex)

## AI Usage Guidelines

- When modifying menu flow, always verify the Menu → Feature Function Mapping above.
- When adding permissions, only use the valid Claude Code permission formats listed above.
- When writing new commands, follow the lazy-loading pattern in `cli-lazy.ts`.
- Never call `bootstrapCloudServices()` synchronously in the menu path.
- Use `writeJsonConfig()` for all JSON writes to ensure atomic operations.
- Run `pnpm typecheck && pnpm build` before committing to catch type errors early.
- When configuring custom models, ensure `settings.model` is removed to allow env var-based model selection.
- Brain router commands should use the CLI interceptor for slash command compatibility.

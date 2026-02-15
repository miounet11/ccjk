# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCJK is a TypeScript CLI tool that configures AI coding environments. It provides one-click setup for Claude Code, Codex, and other AI code tools with MCP services, API configuration, and workflow templates.

**Key capabilities:**
- Brain System: Multi-agent orchestration with context compression
- Cloud Sync: Configuration synchronization via GitHub Gist, WebDAV, or S3
- MCP Marketplace: One-click MCP service installation
- Health Monitor: Score-based setup quality assessment (`ccjk status`)
- Code Tool Abstraction: Unified interface for Claude Code, Codex, Aider, Continue, Cline, Cursor

## Anti-Aggression Principle

CCJK complements Claude Code CLI — it does NOT compete with it. Critical rules:
- Skills must ONLY run when user explicitly invokes them
- No unsolicited output (no welcome banners, no auto-print on startup)
- Brain hook runs in silent mode
- `bootstrapCloudServices()` is skipped entirely during interactive menu to prevent config write races

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
├── code-tools/             # Code tool abstraction layer
├── health/                 # Health scoring engine (6 weighted checks)
├── discovery/              # Project analyzer + skill/MCP matcher
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

## Key Patterns

**i18n:** All user-facing strings use `i18n.t('namespace:key')`. Translations in `src/i18n/locales/{zh-CN,en}/`.

**Configuration:** User configs in `~/.claude/settings.json`. Backups in `~/.claude/backup/`. Template in `templates/claude-code/common/settings.json`.

**Permissions:** Claude Code only recognizes: `Bash(pattern)`, `Read(path)`, `Write(path)`, `Edit(path)`, `NotebookEdit(path)`, `WebFetch(domain)`, `MCP(server:tool)`, `mcp__server_name`. Do NOT use `AllowEdit`, `AllowWrite`, etc. — these are invalid and will be auto-stripped by `permission-cleaner.ts`.

**Code Tool Abstraction:** `src/code-tools/core/` defines `ICodeTool` interface. Adapters in `src/code-tools/adapters/`.

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
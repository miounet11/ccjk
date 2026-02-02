# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCJK is a TypeScript CLI tool that configures AI coding environments. It provides one-click setup for Claude Code, Codex, and other AI code tools with MCP services, API configuration, and workflow templates.

**Key capabilities:**
- Brain System: Context compression achieving ~73% token savings
- Cloud Sync: Configuration synchronization via GitHub Gist, WebDAV, or S3
- MCP Marketplace: One-click MCP service installation
- Code Tool Abstraction: Unified interface for Claude Code, Codex, Aider, Continue, Cline, Cursor

## Build and Development Commands

```bash
# Development
pnpm dev                    # Run CLI in development mode (tsx)
pnpm build                  # Production build (unbuild)
pnpm typecheck              # TypeScript type checking

# Linting
pnpm lint                   # ESLint check
pnpm lint:fix               # Auto-fix ESLint issues

# Testing
pnpm test                   # Run Vitest tests
pnpm test:run               # Run tests once (no watch)
pnpm test:watch             # Watch mode
pnpm test:coverage          # Generate coverage report
pnpm vitest <pattern>       # Run specific test file
pnpm test:e2e               # End-to-end tests
pnpm test:v2                # V2 architecture tests

# V2 Services (Docker-based)
pnpm v2:services:up         # Start PostgreSQL, Redis, Elasticsearch
pnpm v2:services:down       # Stop services
pnpm v2:health              # Health check all services

# Release
pnpm prepublish:fix         # Fix catalog: protocol before npm publish
pnpm build && npm publish   # Build and publish
```

## Architecture

```
src/
├── cli.ts                  # Entry point, CAC command registration
├── commands/               # CLI commands (init, menu, config, mcp, etc.)
├── brain/                  # Multi-agent orchestration, task decomposition
│   ├── orchestrator.ts     # Main orchestrator coordinating agents
│   ├── agents/             # Specialized agents (code, research, executor)
│   ├── task-queue.ts       # Priority-based task management
│   └── worker-pool.ts      # Parallel execution pool
├── cloud-sync/             # Cloud configuration sync
│   ├── adapters/           # GitHub Gist, WebDAV, Local adapters
│   ├── sync-engine.ts      # Sync orchestration
│   └── conflict-resolver.ts # CRDT-based conflict resolution
├── code-tools/             # Code tool abstraction layer
│   ├── core/               # Base interfaces and registry
│   └── adapters/           # Claude Code, Codex, Aider, etc.
├── api-providers/          # API provider management (302.AI, etc.)
├── mcp/                    # MCP service management
├── i18n/                   # i18next internationalization (zh-CN, en)
├── types/                  # TypeScript type definitions
├── utils/                  # Shared utilities
└── config/                 # Workflow and MCP configurations

templates/                  # Handlebars templates for workflows
tests/                      # Vitest test suites
```

## Key Patterns

**Command Structure:** Each command in `src/commands/` is self-contained with its own options interface. Commands use CAC for CLI parsing and inquirer for interactive prompts.

**Code Tool Abstraction:** `src/code-tools/core/` defines `ICodeTool` interface. Adapters in `src/code-tools/adapters/` implement tool-specific logic. Use `ToolRegistry` to get tool instances.

**i18n:** All user-facing strings use i18next with namespace-based organization. Translations in `src/i18n/locales/{zh-CN,en}/`. Use `i18n.t('namespace:key')` pattern.

**Configuration:** User configs stored in `~/.claude/` (Claude Code) or `~/.codex/` (Codex). Backups created in `~/.claude/backup/` before modifications.

**Testing:** Vitest with 80% coverage target. Tests organized as `*.test.ts` (unit), `*.edge.test.ts` (edge cases), `*.e2e.test.ts` (end-to-end).

## Development Guidelines

**Language:** All code comments, documentation, and git commits in English (except README_zh-CN.md).

**TDD Required:** Write tests before implementation. Follow Red-Green-Refactor cycle. 80% coverage minimum.

**i18n:** All user-facing strings must use i18next. Use `i18n.t('namespace:key')` with proper namespaces.

## Coding Standards

- **ESM-Only**: No CommonJS. Use `pathe` for paths, `tinyexec` for commands.
- **TypeScript**: Strict mode with explicit types. ESNext target.
- **Cross-Platform**: Handle Windows paths, macOS, Linux, Termux differences.
- **Error Handling**: User-friendly i18n messages for all errors.
- **File Deletion**: Use `trash` package for safe cross-platform deletion.

## Important Implementation Notes

**Config Locations:**
- Claude Code: `~/.claude/settings.json`, `~/.claude/settings.local.json`
- Codex: `~/.codex/`
- Backups: `~/.claude/backup/` (timestamped)

**MCP Configuration:** Windows paths need proper escaping. Always validate JSON before writing.

**API Providers:** Support Auth Token (OAuth), API Key, and CCR Proxy. Provider presets in `src/api-providers/providers/`.

## Release & Publishing

```bash
# Create a changeset for version updates
pnpm changeset

# Update package version based on changesets
pnpm version

# Build and publish to npm
pnpm release
```

### ⚠️ CRITICAL: pnpm catalog: Protocol Issue

**PROBLEM**: pnpm's `catalog:` protocol in `package.json` causes npm install failures!

When using `catalog:` references like `"dayjs": "catalog:"`, these references are NOT resolved during `npm publish`. Users installing via npm will get:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "catalog:": catalog:
```

**ROOT CAUSE**: The `catalog:` protocol is a pnpm workspace feature defined in `pnpm-workspace.yaml`. While pnpm resolves these during local development, the raw `catalog:` strings get published to npm registry, which npm cannot understand.

**REQUIRED FIX BEFORE EVERY PUBLISH**:

```bash
# Step 1: Check for catalog: references
grep -c "catalog:" package.json  # If > 0, need to fix

# Step 2: Run the automated fix script
node scripts/fix-package-catalog.mjs

# Step 3: Verify no catalog: references remain
grep -c "catalog:" package.json  # Should return 0

# Step 4: Build and publish
pnpm build
npm publish --access public

# Step 5: Verify published package
npm view ccjk@<version> dependencies --json | grep -c "catalog:"  # Should return 0
```

**PREVENTION CHECKLIST**:
1. ✅ Always verify `grep -c "catalog:" package.json` returns 0 before publishing
2. ✅ Use the automated `scripts/fix-package-catalog.mjs` script before every publish
3. ✅ Test installation with `npm install ccjk@<version>` (not pnpm) after publishing
4. ✅ Check `npm view ccjk@<version> dependencies` to confirm no catalog: references
5. ❌ NEVER commit `package.json` with `catalog:` references to git
6. ❌ NEVER restore `catalog:` references after publishing

**AUTOMATED PREVENTION**:
- The project includes `scripts/fix-package-catalog.mjs` to automate catalog: → version conversion
- This script reads `pnpm-workspace.yaml` catalog and replaces all catalog: references
- Always run this script before `npm publish`

## Common Tasks

**Adding a Command:**
1. Create file in `src/commands/`
2. Define options interface
3. Add i18n strings in `src/i18n/locales/{zh-CN,en}/`
4. Register in `src/cli.ts`
5. Write tests in `tests/commands/`

**Adding a Workflow:**
1. Define in `src/config/workflows.ts`
2. Add templates in `templates/`
3. Add i18n strings
4. Write tests

**Adding MCP Service:**
1. Define in `src/config/mcp-services.ts`
2. Add i18n strings
3. Write tests

**Adding API Provider:**
1. Define in `src/api-providers/providers/`
2. Add validation logic
3. Add i18n strings
4. Write tests

**Adding Code Tool Adapter:**
1. Create in `src/code-tools/adapters/` implementing `ICodeTool`
2. Register in `src/code-tools/core/tool-registry.ts`
3. Add i18n strings
4. Write tests

## Related Projects

- [CCR (Claude Code Router)](https://github.com/anthropics/ccr) - Multi-provider API routing
- [CCUsage](https://github.com/anthropics/ccusage) - Usage analytics
- [Cometix](https://github.com/anthropics/cometix) - Status line tools
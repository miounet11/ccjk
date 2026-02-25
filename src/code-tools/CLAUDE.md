# Code Tools Module

[Root](../../CLAUDE.md) > [src](../CLAUDE.md) > **code-tools**

## Purpose

Unified abstraction layer for AI coding tools. Provides a single `ICodeTool` interface that normalizes install, configure, execute, and chat operations across Claude Code, Codex, Aider, Continue, Cline, and Cursor.

## Entry Points

- `src/code-tools/index.ts` — public re-exports
- `src/code-tools/core/interfaces.ts` — `ICodeTool`, `IChatTool`, `IFileEditTool`, `ICodeGenTool`
- `src/code-tools/core/tool-registry.ts` — global tool registry
- `src/code-tools/core/tool-factory.ts` — factory for creating tool instances

## Module Structure

```
src/code-tools/
├── core/
│   ├── interfaces.ts       # ICodeTool and sub-interfaces
│   ├── types.ts            # ToolMetadata, ToolConfig, ExecutionResult, InstallStatus
│   ├── tool-registry.ts    # Singleton registry of all adapters
│   ├── tool-factory.ts     # Factory: createTool(type) -> ICodeTool
│   ├── index.ts
│   └── __tests__/          # Unit tests for core
└── adapters/
    ├── claude-code.ts      # Claude Code adapter
    ├── codex.ts            # OpenAI Codex adapter
    ├── aider.ts            # Aider adapter
    ├── continue.ts         # Continue adapter
    ├── cline.ts            # Cline adapter
    ├── cursor.ts           # Cursor adapter
    └── index.ts
```

## Key Interface

```typescript
export interface ICodeTool {
  getMetadata: () => ToolMetadata
  isInstalled: () => Promise<InstallStatus>
  install: () => Promise<ExecutionResult>
  uninstall: () => Promise<ExecutionResult>
  getConfig: () => Promise<ToolConfig>
  updateConfig: (updates: Partial<ToolConfig>) => Promise<void>
  configure: (config: ToolConfig) => Promise<void>
  validateConfig: (config: Partial<ToolConfig>) => Promise<boolean>
  execute: (command: string, args?: string[]) => Promise<ExecutionResult>
  getVersion: () => Promise<string | undefined>
  reset: () => Promise<void>
}

// Extended interfaces
export interface IChatTool extends ICodeTool { chat, continueChat, endChat }
export interface IFileEditTool extends ICodeTool { editFile, editFiles }
export interface ICodeGenTool extends ICodeTool { generateCode }
```

## Code Tool Detection

The central resolver is `src/utils/code-type-resolver.ts` → `resolveCodeType()`:
1. Reads stored config from `~/.ccjk/config.toml`
2. Falls back to `detectCodeToolType()` in `src/utils/smart-defaults.ts` (checks `~/.claude`, `~/.codex`)
3. Defaults to `claude-code`

Supported type strings: `claude-code`, `codex`, `aider`, `continue`, `cline`, `cursor`.

## Dependencies

- Internal: `src/utils/platform.ts`, `src/i18n/`
- External: `tinyexec` (command execution), `pathe` (paths)

## Tests

- `src/code-tools/core/__tests__/tool-factory.test.ts`
- `src/code-tools/core/__tests__/tool-registry.test.ts`
- `src/code-tools/core/__tests__/base-tool.test.ts`

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | CLAUDE.md created by init-architect |

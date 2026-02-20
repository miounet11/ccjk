# Dead Code Analysis

## Confirmed Dead Code (Safe to Remove)

### 1. Unused Config Manager System (PARTIAL)

The following files appear to be part of a partially unused configuration management system:

**Actually Used (Keep)**:
- `src/config-manager.ts` - Used by config/api-providers.ts, config/v3/, utils/context/
- `src/cloud-config-sync.ts` - Used by config-manager.ts
- `src/config-watcher.ts` - Used by config-manager.ts
- `src/stats-collector.ts` - Used by commands/stats.ts
- `src/stats-storage.ts` - Used by stats-collector.ts and commands/stats.ts

**Potentially Unused (Review)**:
- `src/config-hot-reload-integration.ts` - Only imported by itself (circular)
- `src/session-storage.ts` - Not imported anywhere

**Recommendation**: Only remove session-storage.ts. Keep the rest as they're part of the config system.

### 2. Unused Function in cli-lazy.ts

- `isInteractiveConfigActive` (line 2168) - Exported but never imported

**Recommendation**: Can be removed or made internal if only used within the file.

### 3. Unused Agent System Exports

Multiple exports in `src/agents/` are unused:
- Various orchestration types and functions
- Agent registry functions

**Recommendation**: Review if these are part of public API or can be removed.

### 4. Unused LSP Types

Many LSP-related types in `src/types.ts` are unused:
- LspPosition, LspRange, LspLocation
- LspSymbolKind, LspCompletionItemKind
- LspDiagnosticSeverity, LspDiagnostic
- And many more...

**Recommendation**: These may be for future use. Consider moving to a separate `lsp-types.ts` file or removing if not planned.

## Potentially Dead Code (Needs Review)

### 1. Example Agent

- `src/agents/example.ts` - Contains example agent implementation

**Recommendation**: Verify if this is used for documentation/testing or can be removed.

### 2. Analyzer Functions

- `batchAnalyze` in `src/analyzers/index.ts`
- Various analyzer types

**Recommendation**: Check if these are part of public API.

## Action Plan

### Phase 1: Remove Confirmed Dead Code
1. Remove unused config-manager system (7 files)
2. Remove `isInteractiveConfigActive` from cli-lazy.ts
3. Clean up unused imports

### Phase 2: Review and Document
1. Review agent system exports - determine if public API
2. Review LSP types - move to separate file or remove
3. Review analyzer functions - document as public API if needed

### Phase 3: Prevent Future Dead Code
1. Add ts-prune to CI pipeline
2. Document public API with JSDoc @public tags
3. Add eslint rule for unused exports

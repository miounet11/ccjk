# GitHub Issues for CCJK Tech Debt

Copy these to GitHub manually or use `gh auth login` first.

---

## Issue 1: Session Management - Implement restoration logic

**Labels**: enhancement, tech-debt
**Priority**: High

**File**: `src/commands/session/index.ts:104`

**Current State**:
```typescript
// TODO: Implement actual restoration logic
```

**Impact**: Session restoration feature is incomplete and non-functional

**Recommendation**:
- Implement full session restoration from saved state
- OR remove the feature if not planned
- Update user documentation accordingly

---

## Issue 2: Skill System - Implement registry search

**Labels**: enhancement, tech-debt
**Priority**: Medium

**File**: `src/commands/skill.ts:618`

**Current State**:
```typescript
// TODO: Implement skill search from registry
```

**Impact**: Skill discovery is limited without registry search

**Recommendation**:
- Implement skill search from remote registry
- Add filtering and sorting capabilities
- OR document limitation if registry not planned

---

## Issue 3: Agent Management - Implement delete functionality

**Labels**: enhancement, tech-debt
**Priority**: High

**File**: `src/commands/ccjk-agents.ts:74`

**Current State**:
```typescript
// TODO: Implement delete functionality
```

**Impact**: Users cannot remove agents once created

**Recommendation**:
- Implement agent deletion with confirmation prompt
- Add cleanup of agent-related files and configs
- Update agent list after deletion

---

## Issue 4: Cloud Sync - Complete workflows and configs synchronization

**Labels**: enhancement, tech-debt, cloud-sync
**Priority**: Medium

**Files**: `src/services/cloud/sync-manager.ts` (11 TODOs)

**Current State**:
- Lines 315-316: Workflows/configs sync state not implemented
- Lines 332-333: Reset operations stubbed
- Lines 362, 381: Synchronization logic missing
- Lines 400, 419: Push operations incomplete
- Lines 438, 457: Pull operations incomplete

**Impact**: Cloud sync feature incomplete for workflows and configs

**Recommendation**:
- Complete full implementation of workflows/configs sync
- OR remove from UI if not planned for current version
- Add comprehensive tests for sync operations

---

## Issue 5: Context Compression - Implement or remove feature

**Labels**: enhancement, tech-debt
**Priority**: Medium

**File**: `src/commands/claude-wrapper.ts:100`

**Current State**:
```typescript
// TODO: Implement context compression logic here
```

**Impact**: Context window optimization feature claimed but not implemented

**Recommendation**:
- Implement context compression algorithm
- OR remove feature claim from documentation
- Consider using existing compression libraries

---

## Issue 6: Plugin Manager - Complete cloud installation and NPM extraction

**Labels**: enhancement, tech-debt, plugins
**Priority**: Low

**File**: `src/plugins-v2/core/plugin-manager.ts`

**Current State**:
- Line 275: `// TODO: Implement cloud installation`
- Line 291: `// TODO: Implement NPM package extraction`
- Line 443: `// TODO: Parse YAML intents file`
- Line 737: `// TODO: Implement update checking`

**Impact**: Plugin system has limited functionality

**Recommendation**:
- Phase 2: Implement cloud plugin installation
- Add NPM package extraction for plugin distribution
- Implement YAML intents parsing for plugin metadata
- Add automatic update checking

---

## Issue 7: Refactor - Break down cli-lazy.ts (~2200 lines)

**Labels**: refactor, tech-debt
**Priority**: High

**File**: `src/cli-lazy.ts` (~2200 lines)

**Current State**: Single large file with multiple responsibilities

**Refactoring Plan**:
1. Extract command registration to `src/cli/command-registry.ts`
2. Extract lazy loading to `src/cli/lazy-loader.ts`
3. Extract deprecated commands to `src/cli/deprecated.ts`
4. Keep core orchestration in `cli-lazy.ts` (<500 lines)

**Benefits**:
- Improved maintainability
- Better testability
- Clearer separation of concerns

---

## Issue 8: Refactor - Break down menu.ts (458 lines)

**Labels**: refactor, tech-debt
**Priority**: Medium

**File**: `src/commands/menu.ts` (458 lines)

**Current State**: Single file with menu display, handlers, and utilities

**Refactoring Plan**:
1. Extract menu display to `src/commands/menu/display.ts`
2. Extract option handlers to `src/commands/menu/handlers.ts`
3. Extract code tool logic to `src/commands/menu/code-tool.ts`
4. Extract help to `src/commands/menu/help.ts`
5. Keep orchestration in `menu.ts` (<150 lines)

**Benefits**:
- Improved code organization
- Easier to add new menu options
- Better testability

---

## Issue 9: Dead Code - Remove unused exports identified by ts-prune

**Labels**: cleanup, tech-debt
**Priority**: Medium

**Analysis**: ts-prune identified 50+ unused exports

**High Priority Removals**:
- `src/cli-lazy.ts:2143` - `setInteractiveConfigActive`
- `src/cloud-config-sync.ts:497` - `createCloudConfigSync`
- `src/cloud-config-sync.ts:516` - `fetchCloudProviders`
- `src/config-hot-reload-integration.ts` - Multiple unused functions
- `src/session-storage.ts` - Unused getters/resetters
- `src/stats-collector.ts` - Unused getters/resetters

**Keep for Future Use**:
- LSP types in `src/types.ts` (may be used by LSP manager)
- Agent orchestrator types (Brain system may use)
- Analyzer types (Discovery system may use)

**Action Items**:
1. Remove confirmed dead code
2. Add `@internal` JSDoc for future-use exports
3. Run tests to ensure no breakage

---

## Issue 10: Test Coverage - Add tests for critical paths

**Labels**: testing, tech-debt
**Priority**: High

**Commands Needing Tests**:
- `src/commands/session/` - Session management
- `src/commands/ccjk-agents.ts` - Agent CRUD operations
- `src/commands/claude-wrapper.ts` - Context compression
- `src/commands/registry.ts` - Registry operations

**Utils Needing Tests**:
- `src/utils/startup-orchestrator/` - Module loading
- `src/utils/upgrade-manager.ts` - Upgrade logic
- `src/utils/notification/cloud-client.ts` - Notification system

**Integration Tests Needed**:
- Full init flow with all options
- Cloud sync end-to-end
- Plugin installation and removal
- Multi-configuration switching

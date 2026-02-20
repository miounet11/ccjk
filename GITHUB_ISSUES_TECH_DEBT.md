# GitHub Issues for Tech Debt Cleanup

## Issue 1: Implement workflows and configs synchronization in cloud sync

**Title**: Implement workflows and configs synchronization in cloud sync manager

**Description**:
The cloud sync manager (`src/services/cloud/sync-manager.ts`) has multiple TODO comments for workflows and configs synchronization features that need to be implemented.

**Tasks**:
- [ ] Implement workflows sync state tracking (line 315)
- [ ] Implement configs sync state tracking (line 316)
- [ ] Implement reset workflows sync state (line 332)
- [ ] Implement reset configs sync state (line 333)
- [ ] Implement workflows synchronization logic (line 362)
- [ ] Implement configs synchronization logic (line 381)
- [ ] Implement workflows push functionality (line 400)
- [ ] Implement configs push functionality (line 419)
- [ ] Implement workflows pull functionality (line 438)
- [ ] Implement configs pull functionality (line 457)

**Priority**: Medium
**Labels**: enhancement, cloud-sync

---

## Issue 2: Complete plugin manager implementation

**Title**: Complete plugin-v2 manager missing features

**Description**:
The plugin manager v2 (`src/plugins-v2/core/plugin-manager.ts`) has several unimplemented features marked with TODO comments.

**Tasks**:
- [ ] Implement cloud installation (line 275)
- [ ] Implement NPM package extraction (line 291)
- [ ] Parse YAML intents file (line 443)
- [ ] Implement update checking (line 737)

**Priority**: Medium
**Labels**: enhancement, plugins

---

## Issue 3: Implement startup orchestrator modules

**Title**: Complete startup orchestrator module implementations

**Description**:
The startup orchestrator (`src/utils/startup-orchestrator/modules.ts`) has placeholder TODOs for several critical modules.

**Tasks**:
- [ ] Implement version sync logic (line 21)
- [ ] Implement config guardian logic (line 65)
- [ ] Implement tool router logic (line 110)
- [ ] Implement capability discovery logic (line 206)

**Priority**: High
**Labels**: enhancement, core

---

## Issue 4: Implement session restoration functionality

**Title**: Add session restoration logic

**Description**:
The session command (`src/commands/session/index.ts:104`) has a TODO for implementing actual restoration logic.

**Tasks**:
- [ ] Design session state structure
- [ ] Implement session save functionality
- [ ] Implement session restore functionality
- [ ] Add tests for session management

**Priority**: Low
**Labels**: enhancement, session

---

## Issue 5: Implement skill search from registry

**Title**: Add skill search functionality from registry

**Description**:
The skill command (`src/commands/skill.ts:618`) needs to implement skill search from a remote registry.

**Tasks**:
- [ ] Define skill registry API
- [ ] Implement search functionality
- [ ] Add caching for registry data
- [ ] Add tests for search

**Priority**: Medium
**Labels**: enhancement, skills

---

## Issue 6: Implement agent deletion functionality

**Title**: Add agent deletion in ccjk-agents command

**Description**:
The ccjk-agents command (`src/commands/ccjk-agents.ts:74`) has a TODO for implementing delete functionality.

**Tasks**:
- [ ] Implement agent deletion logic
- [ ] Add confirmation prompt
- [ ] Clean up agent-related files
- [ ] Add tests for deletion

**Priority**: Low
**Labels**: enhancement, agents

---

## Issue 7: Implement plugin version checking and upgrade

**Title**: Add plugin version management to upgrade manager

**Description**:
The upgrade manager (`src/utils/upgrade-manager.ts`) has TODOs for plugin version checking (line 98) and upgrade (line 217).

**Tasks**:
- [ ] Implement plugin version checking
- [ ] Implement plugin upgrade logic
- [ ] Add version comparison
- [ ] Add rollback capability

**Priority**: Medium
**Labels**: enhancement, plugins, upgrade

---

## Issue 8: Implement semver comparison for breaking changes

**Title**: Add semver comparison in marketplace installer

**Description**:
The marketplace installer (`src/utils/marketplace/installer.ts:677`) needs to implement semver comparison to detect breaking changes.

**Tasks**:
- [ ] Add semver library dependency
- [ ] Implement breaking change detection
- [ ] Add user warnings for breaking changes
- [ ] Add tests for version comparison

**Priority**: Medium
**Labels**: enhancement, marketplace

---

## Issue 9: Implement context compression in claude-wrapper

**Title**: Add context compression logic to claude-wrapper

**Description**:
The claude-wrapper command (`src/commands/claude-wrapper.ts:100`) has a TODO for implementing context compression logic.

**Tasks**:
- [ ] Design compression algorithm
- [ ] Implement compression logic
- [ ] Add decompression support
- [ ] Add tests for compression

**Priority**: Low
**Labels**: enhancement, performance

---

## Issue 10: Implement persistence in progressive menu levels

**Title**: Add persistence to progressive menu system

**Description**:
The progressive menu levels (`src/commands/menu/progressive/levels.ts`) have TODOs for implementing persistence when the config system is ready (lines 200, 216).

**Tasks**:
- [ ] Design persistence structure
- [ ] Implement save/load for menu state
- [ ] Add migration for existing users
- [ ] Add tests for persistence

**Priority**: Low
**Labels**: enhancement, menu

---

## Issue 11: Implement LSP manager event emitter

**Title**: Add event emitter to LSP manager

**Description**:
The LSP manager (`src/core/lsp-manager.ts:696`) has a TODO for implementing an event emitter if needed.

**Tasks**:
- [ ] Evaluate need for event emitter
- [ ] Implement event emitter if needed
- [ ] Document events
- [ ] Add tests

**Priority**: Low
**Labels**: enhancement, lsp

---

## Issue 12: Remove or refactor unused exports and dead code

**Title**: Clean up unused exports identified by ts-prune

**Description**:
Multiple files have unused exports that should be removed or marked as public API if intentional.

**Files with unused exports**:
- `src/cli-lazy.ts` - `isInteractiveConfigActive`
- `src/cloud-config-sync.ts` - Multiple unused exports
- `src/config-hot-reload-integration.ts` - Multiple unused functions
- `src/config-watcher.ts` - Unused exports
- `src/session-storage.ts` - Unused exports
- `src/stats-collector.ts` - Unused exports
- `src/stats-storage.ts` - Unused exports
- `src/types.ts` - Many LSP-related types
- `src/agents/` - Multiple unused exports

**Tasks**:
- [ ] Review each unused export
- [ ] Remove confirmed dead code
- [ ] Mark public API exports with JSDoc
- [ ] Update documentation

**Priority**: Medium
**Labels**: tech-debt, cleanup

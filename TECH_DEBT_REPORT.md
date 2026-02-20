# CCJK Tech Debt Cleanup Report

**Generated**: 2026-02-20

## 1. TODO/FIXME Comments (45 instances)

### High Priority (Core Functionality)

#### Session Management
- **File**: `src/commands/session/index.ts:104`
- **Issue**: `// TODO: Implement actual restoration logic`
- **Impact**: Session restoration feature incomplete
- **Recommendation**: Implement or remove feature

#### Skill System
- **File**: `src/commands/skill.ts:618`
- **Issue**: `// TODO: Implement skill search from registry`
- **Impact**: Skill discovery limited
- **Recommendation**: Implement registry search or document limitation

#### Agent Management
- **File**: `src/commands/ccjk-agents.ts:74`
- **Issue**: `// TODO: Implement delete functionality`
- **Impact**: Cannot remove agents
- **Recommendation**: Implement deletion with confirmation

#### Claude Wrapper
- **File**: `src/commands/claude-wrapper.ts:100`
- **Issue**: `// TODO: Implement context compression logic here`
- **Impact**: Context window optimization missing
- **Recommendation**: Implement or remove feature claim

### Medium Priority (Cloud Sync)

#### Sync Manager (11 TODOs)
- **File**: `src/services/cloud/sync-manager.ts`
- **Lines**: 315, 316, 332, 333, 362, 381, 400, 419, 438, 457
- **Issues**:
  - Workflows sync state not implemented
  - Configs sync state not implemented
  - Push/pull operations stubbed
- **Impact**: Cloud sync incomplete for workflows/configs
- **Recommendation**: Complete implementation or remove from UI

#### Auto Bootstrap
- **File**: `src/services/cloud/auto-bootstrap.ts:678`
- **Issue**: `// TODO: 后续版本开放此功能`
- **Impact**: Feature disabled
- **Recommendation**: Document timeline or remove code

### Low Priority (Plugins & Extensions)

#### Plugin Manager (4 TODOs)
- **File**: `src/plugins-v2/core/plugin-manager.ts`
- **Lines**: 275, 291, 443, 737
- **Issues**:
  - Cloud installation not implemented
  - NPM package extraction stubbed
  - YAML intents parsing missing
  - Update checking not implemented
- **Impact**: Plugin system limited
- **Recommendation**: Phase 2 implementation or document limitations

#### Startup Orchestrator (5 TODOs)
- **File**: `src/utils/startup-orchestrator/`
- **Issues**: Version sync, config guardian, tool router, zero-config, capability discovery
- **Impact**: Advanced features not available
- **Recommendation**: Remove from documentation or implement

#### Upgrade Manager (2 TODOs)
- **File**: `src/utils/upgrade-manager.ts`
- **Lines**: 98, 217
- **Issues**: Plugin version checking and upgrade not implemented
- **Impact**: Manual plugin updates required
- **Recommendation**: Implement or document manual process

### Documentation TODOs (6 instances)
- **Files**: Various CLAUDE.md files, workflow/review.ts
- **Impact**: Low - documentation references
- **Recommendation**: Update docs or remove references

### False Positives (3 instances)
- **File**: `src/data/hook-templates.json:565`
- **Context**: Part of grep pattern for blocking TODO files
- **Action**: No action needed

- **File**: `src/workflow/review.ts:461-477`
- **Context**: Code review checks for TODO/FIXME comments
- **Action**: No action needed

## 2. Dead Code Analysis (ts-prune findings)

### Unused Exports to Remove

#### CLI Layer
- `src/cli-lazy.ts:2143` - `setInteractiveConfigActive` (unused setter)

#### Cloud Sync
- `src/cloud-config-sync.ts:497` - `createCloudConfigSync` (factory not used)
- `src/cloud-config-sync.ts:516` - `fetchCloudProviders` (unused)

#### Config System
- `src/config-hot-reload-integration.ts` - Multiple unused functions:
  - `initializeConfigHotReload`
  - `exampleUsage`
  - `setupConfigurationReactions`
  - `shutdownConfigHotReload`
  - `advancedConfigSetup`
  - `setupForTesting`
- `src/config-watcher.ts:429` - `createConfigWatcher` (factory not used)

#### Session/Stats
- `src/session-storage.ts:444` - `getSessionStorage` (unused getter)
- `src/session-storage.ts:454` - `resetSessionStorage` (unused)
- `src/stats-collector.ts:341` - `getStatsCollector` (unused)
- `src/stats-collector.ts:351` - `resetStatsCollector` (unused)
- `src/stats-storage.ts:303` - `resetStatsStorage` (unused)

#### Type Definitions (Unused)
- `src/types.ts` - 40+ LSP-related types (may be for future use)
- `src/agents/index.ts` - Multiple orchestrator types

#### Agents System
- `src/agents/example.ts:77` - `example` function
- `src/agents/multi-agent-orchestrator.ts:344` - `multiAgentOrchestrator`
- Multiple agent registry functions (may be for future use)

#### Analyzers
- `src/analyzers/index.ts:115` - `batchAnalyze` (unused)
- Multiple type definitions for dependency analysis

### Keep (Potential Future Use)
- LSP types in `src/types.ts` - May be used by LSP manager
- Agent orchestrator types - Brain system may use these
- Analyzer types - Discovery system may use these

## 3. Large File Refactoring Opportunities

### Critical: cli-lazy.ts (~2200 lines)
**Current Structure**:
- Command registration
- Lazy loading logic
- Deprecated command handling
- Interactive config state

**Refactoring Plan**:
1. Extract command registration to `src/cli/command-registry.ts`
2. Extract lazy loading to `src/cli/lazy-loader.ts`
3. Extract deprecated commands to `src/cli/deprecated.ts`
4. Keep core orchestration in `cli-lazy.ts` (<500 lines)

### Medium: menu.ts (458 lines)
**Current Structure**:
- Menu display logic
- Option handling
- Code tool switching
- Help documentation

**Refactoring Plan**:
1. Extract menu display to `src/commands/menu/display.ts`
2. Extract option handlers to `src/commands/menu/handlers.ts`
3. Extract code tool logic to `src/commands/menu/code-tool.ts`
4. Extract help to `src/commands/menu/help.ts`
5. Keep orchestration in `menu.ts` (<150 lines)

## 4. Test Coverage Gaps

### Commands Needing Tests
- `src/commands/session/` - Session management
- `src/commands/ccjk-agents.ts` - Agent CRUD operations
- `src/commands/claude-wrapper.ts` - Context compression
- `src/commands/registry.ts` - Registry operations

### Utils Needing Tests
- `src/utils/startup-orchestrator/` - Module loading
- `src/utils/upgrade-manager.ts` - Upgrade logic
- `src/utils/notification/cloud-client.ts` - Notification system

### Integration Tests Needed
- Full init flow with all options
- Cloud sync end-to-end
- Plugin installation and removal
- Multi-configuration switching

## 5. Code Quality Issues

### Low Confidence Code (<50%)
- Session restoration logic (stubbed)
- Cloud sync workflows/configs (incomplete)
- Plugin cloud installation (not implemented)
- Context compression (placeholder)

### Recommendations
1. **Remove or Complete**: Features with TODO comments should either be implemented or removed from UI
2. **Document Limitations**: If features are planned for future, document in user-facing docs
3. **Clean Dead Code**: Remove unused exports identified by ts-prune
4. **Refactor Large Files**: Break down cli-lazy.ts and menu.ts
5. **Add Tests**: Increase coverage for critical paths

## 6. Action Items Priority

### P0 (Immediate)
1. Remove dead code exports (low risk)
2. Document incomplete features in user docs
3. Add tests for session/agent commands

### P1 (This Sprint)
1. Refactor cli-lazy.ts (high complexity)
2. Complete or remove cloud sync workflows/configs
3. Implement agent delete functionality

### P2 (Next Sprint)
1. Refactor menu.ts
2. Complete plugin manager features
3. Implement context compression or remove claim

### P3 (Backlog)
1. Startup orchestrator modules
2. Advanced plugin features
3. LSP integration completion

## 7. Estimated Effort

- **Dead Code Removal**: 2-4 hours
- **Documentation Updates**: 2-3 hours
- **cli-lazy.ts Refactor**: 8-12 hours
- **menu.ts Refactor**: 4-6 hours
- **Feature Completion**: 20-40 hours (depends on scope)
- **Test Coverage**: 10-15 hours

**Total**: 46-80 hours

## 8. Risk Assessment

### Low Risk
- Dead code removal (unused exports)
- Documentation updates
- Test additions

### Medium Risk
- File refactoring (requires careful testing)
- Feature removal (may affect users)

### High Risk
- Feature completion (may introduce bugs)
- Cloud sync changes (data integrity)

## Next Steps

1. Create GitHub issues for each TODO category
2. Remove dead code in separate PR
3. Refactor large files in phases
4. Add tests incrementally
5. Complete or remove incomplete features

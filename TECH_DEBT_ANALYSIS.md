# Tech Debt Analysis

## TODO/FIXME Categorization

### Category 1: Trivial/Can Be Removed (8 items)
1. `src/cli-lazy.ts:471` - Commented out TODO for CAC-compatible task handler - **REMOVE**
2. `src/utils/deprecation.ts:220` - Telemetry logging TODO - **LOW PRIORITY**
3. `src/data/hook-templates.json:565` - TODO in grep pattern (not actual code) - **KEEP**
4. `src/workflow/review.ts:461-477` - TODO/FIXME detection in review workflow - **KEEP (feature)**
5. `src/utils/startup-orchestrator/CLAUDE.md:170,444-448` - Documentation TODOs - **KEEP**

### Category 2: Feature Implementations Needed (GitHub Issues) (15 items)

#### Cloud Sync Features
- `src/services/cloud/sync-manager.ts:315-457` - Multiple TODOs for workflows/configs sync
  - Lines 315-316: Implement workflows and configs sync state
  - Lines 332-333: Reset workflows and configs sync state
  - Lines 362-381: Implement workflows and configs synchronization
  - Lines 400-419: Implement workflows and configs push
  - Lines 438-457: Implement workflows and configs pull
  - **Issue: "Implement workflows and configs synchronization in cloud sync"**

#### Plugin System Features
- `src/plugins-v2/core/plugin-manager.ts:275` - Cloud installation
- `src/plugins-v2/core/plugin-manager.ts:291` - NPM package extraction
- `src/plugins-v2/core/plugin-manager.ts:443` - YAML intents parsing
- `src/plugins-v2/core/plugin-manager.ts:737` - Update checking
- **Issue: "Complete plugin manager implementation"**

#### Startup Orchestrator Features
- `src/utils/startup-orchestrator/modules.ts:21,65,110,206` - Module implementations
  - Version sync logic
  - Config guardian logic
  - Tool router logic
  - Capability discovery logic
- **Issue: "Implement startup orchestrator modules"**

#### Other Features
- `src/services/cloud/auto-bootstrap.ts:678` - Future feature (commented in Chinese)
- `src/core/lsp-manager.ts:696` - Event emitter implementation
- `src/commands/session/index.ts:104` - Session restoration logic
- `src/utils/notification/cloud-client.ts:98` - Get version from package.json
- `src/commands/skill.ts:618` - Skill search from registry
- `src/commands/ccjk-agents.ts:74` - Delete functionality
- `src/utils/marketplace/installer.ts:677` - Semver comparison for breaking changes
- `src/utils/upgrade-manager.ts:98,217` - Plugin version checking and upgrade
- `src/commands/registry.ts:338` - Register config, tools, and advanced commands
- `src/commands/claude-wrapper.ts:100` - Context compression logic
- `src/commands/menu/progressive/levels.ts:200,216` - Persistence when config system ready
- `src/commands/agent.ts:321` - Agent removal in plugin manager
- `src/commands/mcp/index.ts:98` - Actual installation logic

### Category 3: Dead Code (from ts-prune analysis)

#### Unused Exports in Core Files
- `src/cli-lazy.ts:2168` - `isInteractiveConfigActive` (unused)
- `src/cloud-config-sync.ts` - Multiple unused exports (entire module may be deprecated)
- `src/config-hot-reload-integration.ts` - Multiple unused functions
- `src/config-watcher.ts` - Unused exports
- `src/session-storage.ts` - Unused exports
- `src/stats-collector.ts` - Unused exports
- `src/stats-storage.ts` - Unused exports
- `src/types.ts` - Many LSP-related types (may be for future use)
- `src/agents/` - Multiple unused exports in agent system

## Recommended Actions

### Immediate (This PR)
1. Remove commented-out TODO in cli-lazy.ts
2. Fix trivial TODOs that can be resolved quickly
3. Remove dead code that's confirmed unused
4. Clean up unused imports

### Short-term (GitHub Issues)
1. Create issue for cloud sync workflows/configs implementation
2. Create issue for plugin manager completion
3. Create issue for startup orchestrator modules
4. Create issue for session restoration
5. Create issue for skill registry search

### Long-term (Backlog)
1. LSP manager event emitter
2. Telemetry system
3. Plugin upgrade system
4. Context compression in claude-wrapper

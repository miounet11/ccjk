# Skills v1 → Plugins-v2 Migration Strategy

## Current State

| | skills/ (v1) | plugins-v2/ |
|---|---|---|
| LOC | ~1,081 | ~7,306 |
| Test files | 3 (60 tests) | 0 |
| Codebase imports | 26 | 5 |
| Data format | Flat JSON (`CcjkSkill`) | Hierarchical (`PluginPackage` + SKILL.md) |
| Storage | `~/.ccjk/skills/` (JSON) | `~/.ccjk/plugins/` (directories) |
| Agent support | Optional field (unused) | First-class `AgentDefinition` |
| Intent detection | Basic pattern matching | Confidence scoring + context signals |
| MCP integration | None | Full support |
| Script execution | None | bash/node/python |

## Decision

**plugins-v2 is the target architecture.** It has broader capabilities (agents, MCP, scripts, SKILL.md parsing) and aligns with the Vercel Agent Skills format. However, skills v1 is currently more integrated (26 imports vs 5) and has actual test coverage.

## Migration Plan

### Phase 1: Test Parity (prerequisite)

Before any migration, plugins-v2 needs tests. Without them, we can't safely route traffic to it.

- [ ] Unit tests for `PluginManager` (install, update, uninstall, dependency resolution)
- [ ] Unit tests for `IntentEngine` (detect, confidence scoring, auto-execute)
- [ ] Unit tests for `SkillParser` (SKILL.md parsing, validation)
- [ ] Unit tests for `AgentCreator` (builder pattern, template creation)
- [ ] Integration test: install → verify → uninstall lifecycle

### Phase 2: Adapter Layer

Create a thin adapter that lets plugins-v2 serve skills v1 consumers without changing call sites.

```typescript
// src/skills/v2-adapter.ts
import { getPluginManager } from '../plugins-v2'
import type { CcjkSkill } from './types'

export function getSkillAsPlugin(skillId: string): CcjkSkill | null {
  const manager = getPluginManager()
  const plugin = manager.getPlugin(skillId)
  if (!plugin) return null
  return convertPluginToSkill(plugin)
}

export function getAllSkillsFromPlugins(): CcjkSkill[] {
  const manager = getPluginManager()
  return manager.listPlugins().map(convertPluginToSkill)
}
```

This lets us migrate consumers one at a time without a big-bang switch.

### Phase 3: Migrate Built-in Skills

The 4 hardcoded skills in `manager.ts` (cloudSync, browser, marketplace, workflow) should become plugin packages:

```
~/.ccjk/plugins/
├── cloud-sync/
│   ├── manifest.json
│   └── SKILL.md
├── browser/
│   ├── manifest.json
│   └── SKILL.md
├── marketplace/
│   ├── manifest.json
│   └── SKILL.md
└── workflow/
    ├── manifest.json
    └── SKILL.md
```

### Phase 4: Redirect Consumers

Update the 26 import sites to use the adapter layer. Priority order:

1. `src/commands/ccjk-skills.ts` — main skill command
2. `src/health/checks/skills-check.ts` — health scoring
3. `src/cloud-client/skills-marketplace-api.ts` — cloud sync
4. `src/core/discovery.ts` — project discovery
5. `src/core/hook-skill-bridge.ts` — hook integration
6. Remaining orchestrator and brain imports

### Phase 5: Deprecate & Remove

After all consumers use the adapter:

1. Mark `src/skills/manager.ts` exports as `@deprecated`
2. Add console warnings for direct skills v1 API usage
3. Keep for 2 minor releases (backward compat)
4. Remove `src/skills/` directory
5. Inline adapter into plugins-v2 (no more indirection)

## Storage Migration

Users with existing skills in `~/.ccjk/skills/*.json` need automatic migration:

```typescript
// On first run after upgrade:
// 1. Scan ~/.ccjk/skills/*.json
// 2. Convert each to plugin directory format
// 3. Register in ~/.ccjk/plugins/registry.json
// 4. Keep original files as backup (don't delete)
```

Add this to `config-migration.ts` as a new migration step.

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing skills | Adapter layer preserves v1 API surface |
| User confusion during transition | Deprecation warnings with clear migration message |
| plugins-v2 bugs surface | Test suite must pass before Phase 3 begins |
| Performance regression | Benchmark skill lookup latency before/after |
| Lost functionality | Feature parity checklist (batch ops, import/export) |

## Timeline

| Phase | Effort | Dependency |
|-------|--------|-----------|
| Phase 1: Tests | 1-2 days | None |
| Phase 2: Adapter | 0.5 day | Phase 1 |
| Phase 3: Built-ins | 0.5 day | Phase 2 |
| Phase 4: Consumers | 1-2 days | Phase 3 |
| Phase 5: Removal | 0.5 day | Phase 4 + 2 releases |

Total: ~4-5 days of focused work, spread across 2 release cycles.

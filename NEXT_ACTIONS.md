# CCJK Tech Debt - Next Actions

## Immediate Actions (Do First)

### 1. Create GitHub Issues

**File**: `GITHUB_ISSUES.md` contains 10 ready-to-create issues

**Option A**: Manual creation
- Copy each issue from GITHUB_ISSUES.md to GitHub web interface
- Add appropriate labels (enhancement, tech-debt, refactor, cleanup, testing)

**Option B**: CLI creation (requires auth)
```bash
gh auth login
# Then run the gh issue create commands from the original attempt
```

### 2. Fix Pre-existing Type Errors

**Priority**: High (blocking clean builds)

**Errors to fix**:
```typescript
// src/brain/orchestrator.ts:247
// Property 'context' does not exist on type 'TaskMetadata'
// Fix: Add 'context' property to TaskMetadata interface

// src/cli-lazy.ts:803
// Property 'handleContextCommand' does not exist
// Fix: Export handleContextCommand from src/commands/context.ts

// src/commands/context.ts:44,45
// Missing required properties 'parameters' and 'tags'
// Fix: Add missing properties to object literals
```

**Estimated time**: 30 minutes

### 3. Review and Merge Cleanup Changes

**Files changed**: 10 files (see CLEANUP_SUMMARY.md)

**Review checklist**:
- [ ] Verify @internal tags are appropriate
- [ ] Confirm removed exports are truly unused
- [ ] Check build passes: `pnpm build`
- [ ] Run tests: `pnpm test:run`
- [ ] Review git diff

**Git commands**:
```bash
git status
git diff src/
git add src/
git commit -m "chore: remove dead code and document future-use exports

- Remove unused setInteractiveConfigActive export
- Add @internal JSDoc to 20+ future-use exports
- Document cloud sync, session, stats, LSP, agent, analyzer types
- No breaking changes, build verified

See CLEANUP_SUMMARY.md for details"
```

## High Priority Actions (This Sprint)

### 4. Implement Agent Delete Functionality

**Issue**: #3 (to be created)
**File**: `src/commands/ccjk-agents.ts:74`
**Current**: `// TODO: Implement delete functionality`

**Implementation plan**:
```typescript
// Add to ccjk-agents.ts
async function deleteAgent(agentId: string): Promise<void> {
  // 1. Show confirmation prompt
  const confirmed = await promptBoolean({
    message: `Delete agent "${agentId}"? This cannot be undone.`,
    defaultValue: false
  })

  if (!confirmed) return

  // 2. Remove agent files
  const agentDir = join(AGENTS_DIR, agentId)
  if (existsSync(agentDir)) {
    await trash(agentDir)
  }

  // 3. Update agent registry
  // ... implementation

  // 4. Show success message
  console.log(ansis.green(`✔ Agent "${agentId}" deleted`))
}
```

**Estimated time**: 2-3 hours

### 5. Refactor cli-lazy.ts (2200 lines → <500 lines)

**Issue**: #7 (to be created)
**File**: `src/cli-lazy.ts`

**Refactoring steps**:

**Step 1**: Create new directory structure
```bash
mkdir -p src/cli
touch src/cli/command-registry.ts
touch src/cli/lazy-loader.ts
touch src/cli/deprecated.ts
```

**Step 2**: Extract command registration
```typescript
// src/cli/command-registry.ts
export interface CommandDefinition {
  name: string
  description: string
  tier: 'core' | 'extended' | 'deprecated'
  loader: () => Promise<any>
}

export const COMMANDS: CommandDefinition[] = [
  // Move COMMANDS array from cli-lazy.ts
]
```

**Step 3**: Extract lazy loading logic
```typescript
// src/cli/lazy-loader.ts
export function registerLazyCommand(
  program: CAC,
  cmd: CommandDefinition
): void {
  // Move lazy loading logic from cli-lazy.ts
}
```

**Step 4**: Extract deprecated commands
```typescript
// src/cli/deprecated.ts
export const DEPRECATED_COMMANDS = [
  // Move deprecated command handling
]
```

**Step 5**: Update cli-lazy.ts to use new modules
```typescript
// src/cli-lazy.ts (now <500 lines)
import { COMMANDS } from './cli/command-registry'
import { registerLazyCommand } from './cli/lazy-loader'
import { DEPRECATED_COMMANDS } from './cli/deprecated'

export function setupCommandsLazy(program: CAC): void {
  // Orchestration only
}
```

**Estimated time**: 8-12 hours

### 6. Add Tests for Critical Paths

**Issue**: #10 (to be created)

**Priority tests to add**:

```bash
# Create test files
touch tests/commands/session.test.ts
touch tests/commands/ccjk-agents.test.ts
touch tests/commands/context.test.ts
touch tests/utils/startup-orchestrator.test.ts
```

**Example test structure**:
```typescript
// tests/commands/ccjk-agents.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ccjkAgents } from '../../src/commands/ccjk-agents'

describe('ccjk-agents', () => {
  it('should list agents', async () => {
    // Test implementation
  })

  it('should create agent', async () => {
    // Test implementation
  })

  it('should delete agent with confirmation', async () => {
    // Test implementation
  })
})
```

**Estimated time**: 10-15 hours

## Medium Priority Actions (Next Sprint)

### 7. Complete Cloud Sync Workflows/Configs

**Issue**: #4 (to be created)
**File**: `src/services/cloud/sync-manager.ts`
**TODOs**: 11 instances (lines 315, 316, 332, 333, 362, 381, 400, 419, 438, 457)

**Decision needed**:
- **Option A**: Complete implementation (20-30 hours)
- **Option B**: Remove from UI and document as future feature (2-3 hours)

**Recommendation**: Option B for now, Option A in future release

### 8. Refactor menu.ts (458 lines → <150 lines)

**Issue**: #8 (to be created)
**File**: `src/commands/menu.ts`

**Refactoring steps**:

```bash
mkdir -p src/commands/menu
touch src/commands/menu/display.ts
touch src/commands/menu/handlers.ts
touch src/commands/menu/code-tool.ts
touch src/commands/menu/help.ts
```

**Estimated time**: 4-6 hours

### 9. Context Compression: Implement or Remove

**Issue**: #5 (to be created)
**File**: `src/commands/claude-wrapper.ts:100`

**Decision needed**:
- **Option A**: Implement context compression (15-20 hours)
- **Option B**: Remove feature claim from docs (30 minutes)

**Recommendation**: Option B for now, Option A if user demand exists

## Low Priority Actions (Backlog)

### 10. Plugin Manager Features

**Issue**: #6 (to be created)
**Estimated time**: 20-30 hours

### 11. Skill Registry Search

**Issue**: #2 (to be created)
**Estimated time**: 8-12 hours

### 12. Session Restoration

**Issue**: #1 (to be created)
**Estimated time**: 10-15 hours

## Quick Wins (Can Do Anytime)

### Update Documentation

**Files to update**:
- README.md - Remove any claims about unimplemented features
- CLAUDE.md - Update with latest architecture changes
- docs/ - Add tech debt cleanup notes

### Run Coverage Report

```bash
pnpm test:coverage
# Identify files with <50% coverage
# Prioritize adding tests for critical paths
```

### Clean Up Console Logs

```bash
# Find debug console.logs
rg "console\.(log|debug)" src/ --type ts

# Replace with proper logger
import { logger } from './utils/logger'
logger.debug('message')
```

## Estimated Total Effort

| Priority | Tasks | Time |
|----------|-------|------|
| P0 (Immediate) | 3 tasks | 1-2 hours |
| P1 (High) | 3 tasks | 20-30 hours |
| P2 (Medium) | 3 tasks | 26-39 hours |
| P3 (Low) | 3 tasks | 38-57 hours |
| **Total** | **12 tasks** | **85-128 hours** |

## Success Metrics

### Phase 1 (Completed) ✅
- [x] Dead code removed
- [x] Future-use code documented
- [x] Build verified
- [x] Reports created

### Phase 2 (Next Sprint)
- [ ] GitHub issues created
- [ ] Type errors fixed
- [ ] Agent delete implemented
- [ ] cli-lazy.ts refactored
- [ ] Test coverage >60%

### Phase 3 (Future)
- [ ] All TODOs resolved or documented
- [ ] Test coverage >80%
- [ ] No files >500 lines
- [ ] All features implemented or removed from docs

---

**Last Updated**: 2026-02-20
**Status**: Phase 1 Complete, Phase 2 Ready to Start

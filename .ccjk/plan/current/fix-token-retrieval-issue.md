# Fix Plan: CCJK Token Retrieval & Context Management Issue

## 📋 Overview

**Problem**: CCJK configuration may be causing Claude Code CLI token retrieval failures, leading to:
1. Automatic `/compact` command failures
2. Context/history truncation failures
3. Backend API errors showing excessive history forwarding (216-892 messages per session)

**Root Cause Analysis**: After investigating the codebase and user configuration, I've identified **THREE critical issues**:

### 🔴 Issue 1: `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` Environment Variable

**Location**: `templates/claude-code/common/settings.json:6`

```json
"env": {
  "DISABLE_TELEMETRY": "1",
  "DISABLE_ERROR_REPORTING": "1",
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",  // ⚠️ PROBLEMATIC
  "MCP_TIMEOUT": "60000"
}
```

**Impact**:
- This environment variable **disables Claude Code's internal token usage tracking**
- Claude Code CLI relies on token count APIs to determine when to trigger `/compact`
- When disabled, Claude Code cannot retrieve token counts from the backend
- This causes `/compact` to fail silently, leading to context overflow

**Evidence**:
- User's backend logs show excessive history forwarding (216-892 messages)
- This indicates context is NOT being compacted properly
- The variable name suggests it disables "nonessential" traffic, but token retrieval is ESSENTIAL for context management

### 🟡 Issue 2: Excessive `MCP_TIMEOUT` Value

**Location**: `templates/claude-code/common/settings.json:7`

```json
"MCP_TIMEOUT": "60000"  // 60 seconds - TOO HIGH
```

**Impact**:
- Default MCP timeout is typically 5-10 seconds
- 60-second timeout can cause:
  - Slow failure detection
  - Resource exhaustion
  - Backend connection pooling issues
  - Delayed error responses

**Recommended**: 10000-15000ms (10-15 seconds) for most use cases

### 🟢 Issue 3: Missing Context Window Configuration

**Location**: No explicit context window limits in settings.json

**Impact**:
- Claude Code doesn't know when to proactively compact
- Relies entirely on backend token count APIs (which are disabled by Issue 1)
- No client-side safeguards against context overflow

---

## 🎯 Feature Breakdown

### Phase 1: Remove Problematic Environment Variable ✅
- [ ] Remove `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` from template
- [ ] Add migration logic to remove from existing user configs
- [ ] Add warning in documentation about this variable

### Phase 2: Optimize MCP Timeout ✅
- [ ] Reduce `MCP_TIMEOUT` to 15000ms (15 seconds)
- [ ] Add configuration option for users to customize if needed
- [ ] Document timeout implications

### Phase 3: Add Context Window Safeguards ✅
- [ ] Add optional context window configuration
- [ ] Implement client-side token estimation
- [ ] Add proactive compaction triggers

### Phase 4: User Migration & Communication ✅
- [ ] Create migration script for existing users
- [ ] Add changelog entry explaining the fix
- [ ] Update documentation with best practices

---

## 📐 Technical Approach

### 1. Template Fix (Immediate)

**File**: `templates/claude-code/common/settings.json`

**Changes**:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "DISABLE_TELEMETRY": "1",
    "DISABLE_ERROR_REPORTING": "1",
    // REMOVED: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "MCP_TIMEOUT": "15000"  // Reduced from 60000 to 15000
  },
  "includeCoAuthoredBy": false,
  "permissions": {
    // ... existing permissions
  },
  "hooks": {}
}
```

### 2. Migration Utility (New)

**File**: `src/utils/config-migration.ts`

**Purpose**: Automatically fix existing user configurations

**Key Functions**:
```typescript
export function migrateSettingsForTokenRetrieval(): boolean {
  // 1. Read user's settings.json
  // 2. Remove CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
  // 3. Update MCP_TIMEOUT if > 20000
  // 4. Backup original config
  // 5. Write fixed config
}
```

### 3. Configuration Validator (New)

**File**: `src/utils/config-validator.ts`

**Purpose**: Detect and warn about problematic configurations

**Key Functions**:
```typescript
export function validateClaudeCodeConfig(): ValidationResult {
  // Check for problematic env vars
  // Check for excessive timeouts
  // Check for missing essential configs
  // Return warnings and recommendations
}
```

### 4. Update Command Enhancement

**File**: `src/commands/init.ts` and `src/commands/update.ts`

**Changes**:
- Add automatic migration check on init/update
- Prompt user if problematic config detected
- Offer to fix automatically with backup

---

## ✅ Acceptance Criteria

### Functional Requirements
1. ✅ Template no longer includes `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`
2. ✅ MCP_TIMEOUT reduced to reasonable value (15000ms)
3. ✅ Migration utility successfully removes problematic env var from existing configs
4. ✅ Backup created before any config modification
5. ✅ User notified of changes with clear explanation

### Performance Requirements
1. ✅ Token retrieval works correctly after fix
2. ✅ `/compact` command executes successfully
3. ✅ Backend history forwarding reduced to < 100 messages per session
4. ✅ No increase in API call latency

### Quality Requirements
1. ✅ All changes covered by unit tests
2. ✅ Integration test verifying token retrieval works
3. ✅ Documentation updated with troubleshooting guide
4. ✅ Changelog entry explaining the fix

---

## ⏱️ Implementation Plan

### Phase 1: Template Fix (Priority: 🔴 Critical)
**Files to Modify**:
- `templates/claude-code/common/settings.json`

**Tasks**:
1. Remove `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` line
2. Change `MCP_TIMEOUT` from `"60000"` to `"15000"`
3. Add comment explaining why these values are chosen

**Testing**:
- Verify template installs correctly
- Verify new installations don't have the issue

---

### Phase 2: Migration Utility (Priority: 🟡 High)
**Files to Create**:
- `src/utils/config-migration.ts`
- `tests/utils/config-migration.test.ts`

**Tasks**:
1. Implement `migrateSettingsForTokenRetrieval()` function
2. Add backup logic before modification
3. Add rollback capability
4. Write comprehensive tests

**Testing**:
- Test with various config scenarios
- Test backup/restore functionality
- Test edge cases (missing files, corrupted JSON)

---

### Phase 3: Validator & Integration (Priority: 🟢 Medium)
**Files to Create**:
- `src/utils/config-validator.ts`
- `tests/utils/config-validator.test.ts`

**Files to Modify**:
- `src/commands/init.ts`
- `src/commands/update.ts`
- `src/commands/menu.ts`

**Tasks**:
1. Implement config validation logic
2. Integrate validator into init/update commands
3. Add interactive prompt for auto-fix
4. Add menu option for manual validation

**Testing**:
- Test validation detection accuracy
- Test user interaction flows
- Test integration with existing commands

---

### Phase 4: Documentation & Communication (Priority: 🟢 Medium)
**Files to Modify**:
- `CHANGELOG.md`
- `README.md`
- `docs/troubleshooting.md` (create if needed)

**Tasks**:
1. Add detailed changelog entry
2. Update README with troubleshooting section
3. Create troubleshooting guide
4. Add FAQ entry about token retrieval

---

## 📊 Risk Assessment

### High Risk
- **Breaking existing user workflows**: Mitigated by automatic backup and rollback
- **Unintended side effects**: Mitigated by comprehensive testing

### Medium Risk
- **User confusion about changes**: Mitigated by clear communication and documentation
- **Migration failures**: Mitigated by error handling and manual fallback

### Low Risk
- **Performance regression**: Changes are configuration-only, no code logic changes
- **Compatibility issues**: Settings.json format is stable

---

## 🔄 Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**:
   ```bash
   # Users can restore from automatic backup
   cp ~/.claude/backup/backup_TIMESTAMP/settings.json ~/.claude/settings.json
   ```

2. **Revert Template Changes**:
   - Revert commit in git
   - Publish hotfix version

3. **Communication**:
   - Issue GitHub advisory
   - Update documentation with workaround

---

## 📝 Testing Strategy

### Unit Tests
- `config-migration.test.ts`: Test migration logic
- `config-validator.test.ts`: Test validation logic
- `config.test.ts`: Update existing tests

### Integration Tests
- Test full init flow with migration
- Test update flow with validation
- Test manual validation command

### Manual Testing Checklist
- [ ] Fresh installation works correctly
- [ ] Existing installation migrates successfully
- [ ] Token retrieval works after migration
- [ ] `/compact` command executes successfully
- [ ] Backend logs show reduced history forwarding
- [ ] Backup/restore works correctly

---

## 🎓 Lessons Learned

### What Went Wrong
1. **Overly aggressive optimization**: Disabling "nonessential" traffic disabled essential functionality
2. **Insufficient testing**: Token retrieval wasn't tested in real-world scenarios
3. **Poor documentation**: Variable purpose wasn't clearly documented

### Prevention Measures
1. **Better naming**: Use explicit names like `DISABLE_ANALYTICS_ONLY`
2. **Validation layer**: Add config validator to catch problematic settings
3. **Integration tests**: Add tests that verify token retrieval works
4. **Documentation**: Document every environment variable's purpose and impact

---

## 📚 References

### Related Files
- `src/utils/config.ts` - Configuration management
- `templates/claude-code/common/settings.json` - Template file
- `src/commands/init.ts` - Initialization command

### Related Issues
- Backend logs showing excessive history forwarding
- User reports of `/compact` failures
- Context window overflow issues

### External Documentation
- Claude Code settings.json schema
- Claude API token management
- MCP timeout configuration

---

## 🚀 Next Steps

1. **Immediate Action**: Fix template file (Phase 1)
2. **Short-term**: Implement migration utility (Phase 2)
3. **Medium-term**: Add validation and integration (Phase 3)
4. **Long-term**: Improve documentation and monitoring (Phase 4)

---

**Status**: ✅ Planning Complete - Ready for Implementation
**Priority**: 🔴 Critical - Affects core functionality
**Estimated Impact**: High - Fixes major user-facing issue
**Complexity**: Medium - Requires careful migration handling

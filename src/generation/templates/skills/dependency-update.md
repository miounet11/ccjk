# Dependency Update

Safely update project dependencies with compatibility checks and testing.

## Triggers

- **command**: `/update-deps` - Trigger with slash command
- **pattern**: `update dependencies` - Natural language trigger
- **pattern**: `更新依赖` - Chinese language trigger
- **pattern**: `upgrade packages` - Alternative trigger

## Actions

### Action 1: bash

Check for outdated dependencies.

```bash
npm outdated || pnpm outdated || yarn outdated
```

### Action 2: bash

Check for security vulnerabilities.

```bash
npm audit || pnpm audit || yarn audit
```

### Action 3: prompt

Analyze update risks and create update plan.

```
Analyze the outdated dependencies and create an update plan:

1. **Categorize Updates**
   - Security patches (high priority)
   - Major version updates (breaking changes)
   - Minor version updates (new features)
   - Patch updates (bug fixes)

2. **Risk Assessment**
   - Breaking changes in major updates
   - Compatibility issues
   - Peer dependency conflicts
   - Known issues in new versions

3. **Update Strategy**
   - Group related updates
   - Update order (dependencies first)
   - Testing requirements
   - Rollback plan

4. **Migration Steps**
   - Code changes needed
   - Configuration updates
   - API changes to handle
   - Documentation updates
```

### Action 4: bash

Update dependencies incrementally.

```bash
# Update patch versions first
npm update || pnpm update || yarn upgrade

# Then update specific packages
npm install package@latest || pnpm add package@latest
```

### Action 5: bash

Run tests to verify updates.

```bash
npm test || pnpm test || yarn test
```

### Action 6: prompt

Generate update report and changelog.

```
Generate a dependency update report:

1. **Updated Packages**
   - Package name
   - Old version → New version
   - Update type (major/minor/patch)

2. **Breaking Changes**
   - List of breaking changes
   - Required code modifications
   - Migration guide references

3. **Security Fixes**
   - CVEs addressed
   - Severity levels
   - Impact on project

4. **Testing Results**
   - Test pass/fail status
   - Any new issues found
   - Performance impact

5. **Next Steps**
   - Remaining updates
   - Manual testing needed
   - Documentation updates
```

## Requirements

- **tool**: npm|pnpm|yarn - Package manager must be installed
- **context**: node-project - Must be a Node.js project
- **file**: package.json - Must have package.json

---

**Category:** maintenance
**Priority:** 8
**Tags:** dependencies, npm, security, updates, maintenance
**Source:** smart-analysis

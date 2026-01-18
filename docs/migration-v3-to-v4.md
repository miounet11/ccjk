# Migration Guide: CCJK v3 to v4

**Last Updated**: January 18, 2026

This guide will help you migrate from CCJK v3.x to v4.x. The migration process is designed to be as smooth as possible, with automatic conversion of most configurations.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Methods](#migration-methods)
- [Step-by-Step Guide](#step-by-step-guide)
- [Before and After Examples](#before-and-after-examples)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Rollback Instructions](#rollback-instructions)

## Overview

CCJK v4 introduces several improvements and changes to enhance the developer experience:

- **Improved workflow organization**: Better categorization and naming
- **Enhanced plugin system**: New v2 API with better lifecycle hooks
- **Stricter validation**: Better error detection and reporting
- **Modernized CLI**: Standardized command syntax
- **Better configuration management**: More robust merging and validation

### What Gets Migrated

The migration tool automatically handles:

- ✅ Workflow category names
- ✅ Settings.json structure
- ✅ MCP server configurations
- ✅ Plugin configurations
- ✅ Environment variables
- ✅ CLI command references

### What Requires Manual Action

Some changes may require manual intervention:

- ⚠️ Custom plugins using v1 API
- ⚠️ Invalid MCP configurations
- ⚠️ Custom scripts using deprecated commands

## Breaking Changes

### 1. Workflow Category Rename

**Severity**: Medium | **Affects**: All users

Workflow categories have been renamed for better clarity:

| v3 Category | v4 Category | Description |
|-------------|-------------|-------------|
| `common` | `essential` | Essential tools and utilities |
| `plan` | `planning` | Planning and design workflows |
| `bmad` | `development` | Development workflows |
| `sixStep` | `sixStep` | Six-step workflow (unchanged) |
| `git` | `git` | Git workflows (unchanged) |

**Migration**: Automatic - The migration tool will convert all workflow categories.

**Example**:
```json
// v3
{
  "workflows": [
    { "id": "init-project", "category": "common" }
  ]
}

// v4
{
  "workflows": [
    { "id": "init-project", "category": "essential" }
  ]
}
```

### 2. CLI Command Syntax Standardization

**Severity**: Low | **Affects**: Some users

Short command aliases are deprecated in favor of full names:

| v3 Command | v4 Command | Status |
|------------|------------|--------|
| `ccjk i` | `ccjk init` | Deprecated (still works) |
| `ccjk u` | `ccjk update` | Deprecated (still works) |
| `ccjk ccr` | `ccjk ccr` | Unchanged |
| `ccjk ccu` | `ccjk ccu` | Unchanged |

**Migration**: No action required - Both syntaxes work, but full names are recommended.

**Recommendation**: Update your scripts to use full command names:
```bash
# Old (still works)
ccjk i

# New (recommended)
ccjk init
```

### 3. Settings.json Structure Enhancement

**Severity**: Low | **Affects**: All users

New fields added to settings.json for better configuration:

- `experimental`: Object for experimental features
- `features`: Object for feature flags
- Removed deprecated fields: `legacyMode`, `oldApiFormat`

**Migration**: Automatic - Existing settings are preserved and merged with new defaults.

### 4. Plugin API v2

**Severity**: High | **Affects**: Plugin developers

The plugin API has been upgraded to v2 with new lifecycle hooks:

**New Hooks**:
- `onBeforeInit()`: Called before initialization
- `onAfterInit()`: Called after initialization
- `onBeforeUpdate()`: Called before updates
- `onAfterUpdate()`: Called after updates
- `onError()`: Called on errors

**Migration**: Manual - Custom plugins need to be updated to v2 API.

**Example**:
```typescript
// v1 Plugin (deprecated)
export default {
  name: 'my-plugin',
  init() {
    // initialization
  }
}

// v2 Plugin (required)
export default {
  name: 'my-plugin',
  version: '2.0.0',
  async onBeforeInit(context) {
    // pre-initialization
  },
  async onAfterInit(context) {
    // post-initialization
  }
}
```

### 5. MCP Configuration Validation

**Severity**: Medium | **Affects**: Users with custom MCP servers

MCP server configurations now require stricter validation:

- `command` field is required
- Command paths must be valid
- Environment variables must be properly formatted

**Migration**: Semi-automatic - Invalid configurations will be flagged for manual review.

**Example**:
```json
// v3 (may be invalid)
{
  "mcpServers": {
    "my-server": {
      "args": ["--port", "3000"]
    }
  }
}

// v4 (requires command)
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js", "--port", "3000"]
    }
  }
}
```

## Migration Methods

### Method 1: Automatic Migration (Recommended)

Use the built-in migration command:

```bash
npx ccjk migrate
```

This will:
1. Analyze your v3 configuration
2. Show breaking changes
3. Create a backup
4. Convert configuration to v4
5. Show a detailed summary

### Method 2: Dry Run (Preview Changes)

Preview changes without applying them:

```bash
npx ccjk migrate --dry-run
```

### Method 3: Non-Interactive Migration

For CI/CD or automated scripts:

```bash
npx ccjk migrate --skip-prompts --force
```

### Method 4: Manual Migration

If you prefer manual control, follow the [Step-by-Step Guide](#step-by-step-guide).

## Step-by-Step Guide

### Step 1: Backup Your Configuration

Before starting, create a manual backup:

```bash
# Backup entire .claude directory
cp -r ~/.claude ~/.claude.backup

# Or use the migration tool's backup
npx ccjk migrate --backup
```

### Step 2: Check Current Version

Verify your current CCJK version:

```bash
npx ccjk --version
```

### Step 3: Update CCJK

Update to the latest v4 version:

```bash
npm install -g ccjk@latest
# or
npx ccjk@latest
```

### Step 4: Run Migration Tool

Execute the migration:

```bash
npx ccjk migrate
```

Follow the interactive prompts:

1. **Review breaking changes**: Read the list of changes
2. **Confirm migration**: Type 'yes' to proceed
3. **Wait for completion**: The tool will convert your configuration
4. **Review summary**: Check the migration summary

### Step 5: Verify Configuration

Test your migrated configuration:

```bash
# Check for issues
npx ccjk doctor

# Test basic functionality
npx ccjk init --help
```

### Step 6: Update Custom Plugins (If Applicable)

If you have custom plugins, update them to v2 API:

1. Add version field: `version: '2.0.0'`
2. Rename `init()` to `onAfterInit()`
3. Add new lifecycle hooks as needed
4. Test plugin functionality

### Step 7: Update Scripts

Update any scripts using deprecated commands:

```bash
# Find deprecated commands in your scripts
grep -r "ccjk i" .
grep -r "ccjk u" .

# Replace with full names
sed -i 's/ccjk i/ccjk init/g' your-script.sh
sed -i 's/ccjk u/ccjk update/g' your-script.sh
```

## Before and After Examples

### Example 1: Workflow Configuration

**Before (v3)**:
```json
{
  "workflows": [
    {
      "id": "init-project",
      "nameKey": "workflow.initProject.name",
      "category": "common",
      "defaultSelected": true
    },
    {
      "id": "feature-planning",
      "nameKey": "workflow.featurePlanning.name",
      "category": "plan",
      "defaultSelected": false
    }
  ]
}
```

**After (v4)**:
```json
{
  "workflows": [
    {
      "id": "init-project",
      "nameKey": "workflow.initProject.name",
      "category": "essential",
      "defaultSelected": true
    },
    {
      "id": "feature-planning",
      "nameKey": "workflow.featurePlanning.name",
      "category": "planning",
      "defaultSelected": false
    }
  ]
}
```

### Example 2: Settings.json

**Before (v3)**:
```json
{
  "model": "sonnet",
  "env": {
    "ANTHROPIC_API_KEY": "sk-xxx"
  },
  "permissions": {
    "allow": ["read", "write"]
  },
  "legacyMode": true,
  "oldApiFormat": false
}
```

**After (v4)**:
```json
{
  "model": "sonnet",
  "env": {
    "ANTHROPIC_API_KEY": "sk-xxx"
  },
  "permissions": {
    "allow": ["read", "write"]
  },
  "experimental": {},
  "features": {}
}
```

### Example 3: Plugin Configuration

**Before (v3)**:
```typescript
// my-plugin.ts
export default {
  name: 'my-custom-plugin',
  init() {
    console.log('Plugin initialized')
  },
  execute(command: string) {
    // plugin logic
  }
}
```

**After (v4)**:
```typescript
// my-plugin.ts
export default {
  name: 'my-custom-plugin',
  version: '2.0.0',
  async onBeforeInit(context) {
    console.log('Pre-initialization')
  },
  async onAfterInit(context) {
    console.log('Plugin initialized')
  },
  async execute(command: string, context) {
    // plugin logic with context
  },
  async onError(error, context) {
    console.error('Plugin error:', error)
  }
}
```

### Example 4: CLI Commands

**Before (v3)**:
```bash
#!/bin/bash
# setup.sh

# Initialize CCJK
ccjk i --force

# Update workflows
ccjk u --all

# Configure CCR
ccjk ccr --port 8080
```

**After (v4)**:
```bash
#!/bin/bash
# setup.sh

# Initialize CCJK (full command name)
ccjk init --force

# Update workflows (full command name)
ccjk update --all

# Configure CCR (unchanged)
ccjk ccr --port 8080
```

## Troubleshooting

### Issue 1: Migration Tool Fails to Start

**Symptoms**: Error when running `npx ccjk migrate`

**Solutions**:
1. Ensure you have the latest version: `npm install -g ccjk@latest`
2. Clear npm cache: `npm cache clean --force`
3. Try with npx: `npx ccjk@latest migrate`

### Issue 2: Configuration Not Found

**Symptoms**: "No v3 configuration found" message

**Solutions**:
1. Check if `~/.claude/settings.json` exists
2. Verify you're running from the correct directory
3. Ensure you have a v3 installation to migrate from

### Issue 3: Plugin Compatibility Errors

**Symptoms**: Plugins fail to load after migration

**Solutions**:
1. Check plugin version: Must be v2.0.0 or higher
2. Update plugin to v2 API (see [Plugin API v2](#4-plugin-api-v2))
3. Temporarily disable problematic plugins
4. Contact plugin author for v4 compatibility

### Issue 4: MCP Server Validation Failures

**Symptoms**: MCP servers marked as invalid

**Solutions**:
1. Add missing `command` field to MCP configuration
2. Verify command paths are correct
3. Check environment variables are properly set
4. Review MCP server documentation

### Issue 5: Workflow Categories Not Updated

**Symptoms**: Workflows still show old category names

**Solutions**:
1. Re-run migration: `npx ccjk migrate --force`
2. Manually update workflow configuration
3. Clear cache: `rm -rf ~/.claude/.ccjk/cache`
4. Restart Claude Code

### Issue 6: Backup Restoration Needed

**Symptoms**: Need to rollback to v3

**Solutions**:
See [Rollback Instructions](#rollback-instructions) below.

## FAQ

### Q: Will my existing workflows still work?

**A**: Yes, all existing workflows will continue to work. Only the category names change, which is handled automatically by the migration tool.

### Q: Do I need to update my custom plugins?

**A**: If you have custom plugins using the v1 API, yes. The migration tool will flag these for manual update. If you only use official plugins, no action is needed.

### Q: Can I use both v3 and v4 commands?

**A**: Yes, v4 maintains backward compatibility with v3 command syntax. However, we recommend using the new full command names for clarity.

### Q: What happens to my API keys and tokens?

**A**: All API keys, auth tokens, and environment variables are preserved during migration. No re-authentication is required.

### Q: How long does migration take?

**A**: Typically 1-2 minutes for standard configurations. Complex setups with many plugins may take longer.

### Q: Can I migrate multiple machines?

**A**: Yes, run the migration tool on each machine independently. Configuration is machine-specific.

### Q: What if I skip the migration?

**A**: v4 will attempt to work with v3 configurations, but you may encounter warnings and some features may not work correctly. Migration is strongly recommended.

### Q: Is the migration reversible?

**A**: Yes, the migration tool creates automatic backups. See [Rollback Instructions](#rollback-instructions) for details.

### Q: Will my MCP servers need reconfiguration?

**A**: Most MCP servers will work without changes. Only invalid configurations (missing required fields) need manual review.

### Q: Do I need to reinstall Claude Code?

**A**: No, Claude Code itself doesn't need reinstallation. Only CCJK configuration is updated.

## Rollback Instructions

If you need to rollback to v3:

### Method 1: Automatic Restore from Backup

```bash
# List available backups
ls -la ~/.claude/backup/

# Restore from backup (replace timestamp)
cp -r ~/.claude/backup/v3_backup_2026-01-18_10-30-00/* ~/.claude/

# Remove v4 marker
rm ~/.claude/.ccjk-v4

# Downgrade CCJK
npm install -g ccjk@3
```

### Method 2: Manual Restore

```bash
# Restore from your manual backup
rm -rf ~/.claude
cp -r ~/.claude.backup ~/.claude

# Downgrade CCJK
npm install -g ccjk@3
```

### Method 3: Fresh v3 Installation

```bash
# Remove current installation
rm -rf ~/.claude

# Downgrade CCJK
npm install -g ccjk@3

# Reinitialize with v3
npx ccjk init
```

## Additional Resources

- **GitHub Repository**: https://github.com/miounet11/ccjk
- **Issue Tracker**: https://github.com/miounet11/ccjk/issues
- **Documentation**: https://github.com/miounet11/ccjk/blob/main/README.md
- **Changelog**: https://github.com/miounet11/ccjk/blob/main/CHANGELOG.md

## Getting Help

If you encounter issues not covered in this guide:

1. **Check existing issues**: https://github.com/miounet11/ccjk/issues
2. **Create a new issue**: Include migration log and error messages
3. **Community support**: Join discussions on GitHub
4. **Emergency rollback**: Use backup restoration instructions above

## Migration Checklist

Use this checklist to track your migration progress:

- [ ] Backup current configuration
- [ ] Update CCJK to v4
- [ ] Run migration tool
- [ ] Review migration summary
- [ ] Test basic functionality with `ccjk doctor`
- [ ] Update custom plugins (if applicable)
- [ ] Update scripts with deprecated commands
- [ ] Verify MCP servers are working
- [ ] Test workflows
- [ ] Remove old backups (optional)

---

**Migration completed successfully?** Great! You're now ready to enjoy the improvements in CCJK v4.

**Need help?** Don't hesitate to open an issue on GitHub.

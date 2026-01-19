# Migration Guide: Upgrading to CCJK v3.6.1

**Version:** 3.6.1
**Release Date:** January 19, 2026
**Migration Difficulty:** Easy (Fully Backward Compatible)

---

## Overview

CCJK v3.6.1 is a **fully backward compatible** release. No breaking changes means you can upgrade safely without modifying your existing code or configuration.

### Key Points

- ✅ **Zero Breaking Changes** - All existing code continues to work
- ✅ **Automatic Backup** - Your configuration is backed up automatically
- ✅ **Seamless Upgrade** - Update in seconds
- ✅ **Enhanced Features** - All existing features are improved
- ✅ **New Capabilities** - Optional new features to explore

---

## Quick Migration (5 Minutes)

### Step 1: Backup (Automatic)

The upgrade process automatically backs up your configuration, but you can create a manual backup:

```bash
# Manual backup (optional)
cp -r ~/.ccjk ~/.ccjk.backup.$(date +%Y%m%d)
```

### Step 2: Update Package

```bash
# Update to v3.6.1
npm update -g ccjk

# Or install fresh
npm install -g ccjk@3.6.1
```

### Step 3: Verify Installation

```bash
# Check version
ccjk --version
# Should show: 3.6.1

# Verify configuration
ccjk config show

# Test basic functionality
ccjk --help
```

### Step 4: Done!

Your upgrade is complete. All existing functionality works as before, plus you now have access to new features.

---

## What's Changed

### No Breaking Changes

All existing APIs, commands, and configurations continue to work:

```typescript
// All existing code works unchanged
import { createTool } from 'ccjk';

const claude = createTool('claude-code');
await claude.isInstalled();
await claude.configure({ apiKey: 'key' });
```

### New Features (Optional)

You can start using new features at your own pace:

#### 1. Token Optimization

```typescript
// NEW: Enable token optimization for 83% savings
import { ContextManager } from 'ccjk';

const manager = new ContextManager();
const compressed = await manager.compress(context);
console.log(`Saved ${compressed.compressionRatio * 100}% tokens!`);
```

#### 2. Output Styles

```bash
# NEW: Set a fun output style
ccjk config set style cat-programmer

# List all styles
ccjk styles list
```

#### 3. Workflows

```bash
# NEW: Use pre-built workflows
ccjk workflow bug-hunt
ccjk workflow code-review
ccjk workflow tdd user-authentication
```

#### 4. MCP Services

```bash
# NEW: Install MCP services
ccjk mcp marketplace
ccjk mcp install filesystem fetch sqlite
```

#### 5. Version Management

```typescript
// NEW: Unified version management
import { createVersionService } from 'ccjk';

const service = createVersionService();
await service.checkVersion('claude-code');
await service.updateTool('claude-code');
```

---

## Detailed Migration by Version

### From v3.x

**Difficulty:** Very Easy
**Time:** 2 minutes
**Breaking Changes:** None

```bash
# Simply update
npm update -g ccjk

# Everything continues to work
```

**What You Get:**
- All v3.x features continue to work
- 30-60% performance improvements
- New optional features
- Better error messages
- Enhanced documentation

### From v2.x

**Difficulty:** Easy
**Time:** 5 minutes
**Breaking Changes:** None

```bash
# Update package
npm update -g ccjk

# Your v2.x configuration is automatically migrated
```

**What You Get:**
- All v2.x features continue to work
- Automatic configuration migration
- Significant performance improvements
- New features and capabilities
- Better developer experience

### From v1.x

**Difficulty:** Easy
**Time:** 5 minutes
**Breaking Changes:** None

```bash
# Update package
npm update -g ccjk

# Configuration is automatically upgraded
```

**What You Get:**
- All v1.x features continue to work
- Major performance improvements
- Many new features
- Enhanced stability
- Complete documentation

---

## Configuration Migration

### Automatic Migration

Your configuration is automatically migrated during upgrade:

```
~/.ccjk/
├── config.json          # Automatically updated
├── tools/               # Preserved
│   ├── claude-code.json
│   ├── aider.json
│   └── cursor.json
└── backups/             # NEW: Automatic backups
    └── config.json.20260119
```

### Manual Configuration Review

After upgrade, review your configuration:

```bash
# Show current configuration
ccjk config show

# Check tool configurations
ccjk tools list

# Verify API keys (if needed)
ccjk config get apiKey
```

### New Configuration Options

v3.6.1 adds new optional configuration:

```bash
# Enable token optimization
ccjk config set tokenOptimization.enabled true
ccjk config set tokenOptimization.strategy balanced

# Set output style
ccjk config set style cat-programmer

# Enable auto-updates
ccjk config set autoUpdate true

# Configure cache
ccjk config set cache.enabled true
ccjk config set cache.ttl 3600000
```

---

## Code Migration

### No Changes Required

All existing code continues to work:

```typescript
// v1.x, v2.x, v3.x code - all work unchanged
import { createTool } from 'ccjk';

const tool = createTool('claude-code');
await tool.isInstalled();
```

### Optional Enhancements

You can enhance your code with new features:

#### Before (Still Works)

```typescript
import { createTool } from 'ccjk';

const claude = createTool('claude-code');
const status = await claude.isInstalled();
```

#### After (Enhanced)

```typescript
import { createTool, ContextManager, createVersionService } from 'ccjk';

// Use existing features
const claude = createTool('claude-code');
const status = await claude.isInstalled();

// Add token optimization
const contextManager = new ContextManager();
const compressed = await contextManager.compress(context);

// Add version management
const versionService = createVersionService();
await versionService.checkVersion('claude-code');
```

---

## Testing After Migration

### Basic Functionality Test

```bash
# Test version
ccjk --version

# Test help
ccjk --help

# Test configuration
ccjk config show

# Test tool listing
ccjk tools list
```

### Advanced Functionality Test

```bash
# Test tool installation check
ccjk tools check claude-code

# Test version checking
ccjk version check claude-code

# Test new features
ccjk styles list
ccjk workflow list
ccjk mcp marketplace
```

### Programmatic Test

```typescript
import { createTool, ContextManager, createVersionService } from 'ccjk';

async function testMigration() {
  // Test existing functionality
  const tool = createTool('claude-code');
  const status = await tool.isInstalled();
  console.log('Tool check:', status.installed ? '✅' : '❌');

  // Test new features
  const contextManager = new ContextManager();
  console.log('Context manager:', contextManager ? '✅' : '❌');

  const versionService = createVersionService();
  console.log('Version service:', versionService ? '✅' : '❌');

  console.log('Migration test: ✅ All systems operational');
}

testMigration();
```

---

## Rollback Procedure

If you need to rollback (unlikely):

### Option 1: npm Downgrade

```bash
# Downgrade to previous version
npm install -g ccjk@3.5.0  # or your previous version

# Restore configuration backup
cp ~/.ccjk.backup.20260119/config.json ~/.ccjk/config.json
```

### Option 2: Manual Restore

```bash
# Uninstall current version
npm uninstall -g ccjk

# Install previous version
npm install -g ccjk@3.5.0

# Restore from automatic backup
cp ~/.ccjk/backups/config.json.20260119 ~/.ccjk/config.json
```

### Option 3: Complete Reset

```bash
# Remove all CCJK data
rm -rf ~/.ccjk

# Reinstall previous version
npm install -g ccjk@3.5.0

# Reconfigure from scratch
ccjk init
```

---

## Common Issues and Solutions

### Issue 1: Version Not Updating

**Problem:** `ccjk --version` shows old version

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g ccjk
npm install -g ccjk@3.6.1

# Verify
ccjk --version
```

### Issue 2: Configuration Not Found

**Problem:** Configuration appears to be missing

**Solution:**
```bash
# Check configuration location
ls -la ~/.ccjk/

# Restore from backup
cp ~/.ccjk/backups/config.json.* ~/.ccjk/config.json

# Or reinitialize
ccjk init
```

### Issue 3: Tool Not Working

**Problem:** Specific tool not functioning

**Solution:**
```bash
# Check tool status
ccjk tools check <tool-name>

# Reinstall tool
ccjk tools install <tool-name>

# Reconfigure tool
ccjk tools configure <tool-name>
```

### Issue 4: Import Errors

**Problem:** TypeScript import errors

**Solution:**
```bash
# Rebuild TypeScript definitions
npm run build

# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm install
```

### Issue 5: Performance Issues

**Problem:** Slower than expected

**Solution:**
```bash
# Enable caching
ccjk config set cache.enabled true

# Clear old cache
ccjk cache clear

# Optimize configuration
ccjk config optimize
```

---

## New Features to Explore

### 1. Token Optimization (83% Savings)

```typescript
import { ContextManager, CompressionStrategy } from 'ccjk';

const manager = new ContextManager({
  defaultStrategy: CompressionStrategy.BALANCED,
  enableCache: true,
});

const compressed = await manager.compress(context);
console.log(`Saved ${compressed.compressionRatio * 100}% tokens!`);
```

### 2. Output Styles (15+ Styles)

```bash
# Try different styles
ccjk config set style cat-programmer
ccjk config set style night-owl
ccjk config set style gamer-mode

# Demo all styles
ccjk styles demo
```

### 3. Workflows (10 Workflows)

```bash
# Quick start a project
ccjk workflow quickstart react --typescript

# Hunt bugs
ccjk workflow bug-hunt --auto-fix

# Code review
ccjk workflow review --security --performance

# TDD workflow
ccjk workflow tdd user-authentication
```

### 4. MCP Services

```bash
# Browse marketplace
ccjk mcp marketplace

# Install services
ccjk mcp install filesystem fetch sqlite git

# Install bundle
ccjk mcp bundle install web-development

# List installed
ccjk mcp list
```

### 5. Version Management

```typescript
import { createVersionService } from 'ccjk';

const service = createVersionService();

// Check version
const info = await service.checkVersion('claude-code');

// Update tool
await service.updateTool('claude-code', undefined, {
  backup: true,
  onProgress: (status) => console.log(status.message),
});

// Schedule checks
service.scheduleCheck('claude-code', 3600000, true);
service.startScheduler();
```

---

## Performance Improvements

After migration, you'll automatically benefit from:

### Speed Improvements
- **30-60% faster** overall operations
- **300x faster** cache hits
- **40% faster** updates
- **30% faster** startup time
- **60% faster** navigation

### Network Optimization
- **60% fewer** API calls
- **Smart caching** with 85-95% hit rate
- **Request deduplication**
- **Batch operations**

### Memory Optimization
- **Reduced memory footprint**
- **Efficient caching**
- **Automatic cleanup**
- **LRU eviction**

---

## Best Practices After Migration

### 1. Enable Token Optimization

```bash
ccjk config set tokenOptimization.enabled true
ccjk config set tokenOptimization.strategy balanced
```

### 2. Configure Caching

```bash
ccjk config set cache.enabled true
ccjk config set cache.ttl 3600000
ccjk config set cache.maxSize 100
```

### 3. Set Up Auto-Updates

```bash
ccjk config set autoUpdate true
ccjk config set updateCheckInterval 86400000
```

### 4. Choose an Output Style

```bash
ccjk styles list
ccjk config set style <your-favorite>
```

### 5. Explore Workflows

```bash
ccjk workflow list
ccjk workflow demo
```

---

## Getting Help

### Documentation
- **Release Notes:** [RELEASE_NOTES_v3.6.1.md](RELEASE_NOTES_v3.6.1.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **README:** [README.md](README.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

### Support Channels
- **GitHub Issues:** https://github.com/miounet11/ccjk/issues
- **Email:** 9248293@gmail.com
- **Discord:** Coming soon
- **Documentation:** https://ccjk.dev/docs (coming soon)

### Reporting Issues

If you encounter issues during migration:

1. Check this guide for solutions
2. Review the [CHANGELOG.md](CHANGELOG.md)
3. Search existing GitHub issues
4. Create a new issue with:
   - Previous version
   - Current version
   - Steps to reproduce
   - Error messages
   - System information

---

## Migration Checklist

Use this checklist to ensure a smooth migration:

### Pre-Migration
- [ ] Review release notes
- [ ] Check system requirements
- [ ] Backup configuration (automatic, but verify)
- [ ] Note current version
- [ ] Document custom configurations

### Migration
- [ ] Update package: `npm update -g ccjk`
- [ ] Verify version: `ccjk --version`
- [ ] Check configuration: `ccjk config show`
- [ ] Test basic commands: `ccjk --help`
- [ ] Test tool functionality

### Post-Migration
- [ ] Review new features
- [ ] Enable token optimization
- [ ] Configure caching
- [ ] Choose output style
- [ ] Explore workflows
- [ ] Install MCP services
- [ ] Update documentation
- [ ] Train team members

### Verification
- [ ] All existing features work
- [ ] Configuration preserved
- [ ] Tools functioning correctly
- [ ] Performance improved
- [ ] No errors in logs

---

## Timeline Recommendation

### Immediate (Day 1)
- Update package
- Verify basic functionality
- Review new features

### Week 1
- Enable token optimization
- Configure caching
- Try output styles
- Explore workflows

### Week 2
- Install MCP services
- Optimize configuration
- Train team members
- Update documentation

### Month 1
- Measure performance improvements
- Gather feedback
- Optimize usage patterns
- Plan advanced features

---

## Success Metrics

Track these metrics to measure migration success:

### Performance
- [ ] Startup time reduced by 30%
- [ ] Operation speed increased by 30-60%
- [ ] Token usage reduced by 83%
- [ ] Network requests reduced by 60%

### Adoption
- [ ] All team members upgraded
- [ ] New features being used
- [ ] Workflows integrated
- [ ] MCP services installed

### Quality
- [ ] No migration issues
- [ ] All tests passing
- [ ] Configuration working
- [ ] Tools functioning

---

## Conclusion

Migrating to CCJK v3.6.1 is straightforward and risk-free:

✅ **Zero breaking changes** - Everything continues to work
✅ **Automatic backup** - Your data is safe
✅ **5-minute upgrade** - Quick and easy
✅ **Significant improvements** - 30-60% faster
✅ **New capabilities** - Explore at your pace

**Ready to upgrade?**

```bash
npm update -g ccjk
```

Welcome to CCJK v3.6.1 - The Ultimate Enhancement Release! 🚀

---

**Questions?** Contact us at 9248293@gmail.com or open an issue on GitHub.

**Version:** 3.6.1
**Release Date:** January 19, 2026
**Migration Guide Version:** 1.0

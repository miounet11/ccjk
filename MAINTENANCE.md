# CCJK Project Maintenance Guide

**Last Updated**: 2026-01-22

**Purpose**: Guide for maintaining CCJK project hygiene, documentation standards, and development workflows.

---

## 🎯 Maintenance Philosophy

> **"Clean Code, Clean Docs, Clean Mind"**
>
> A well-maintained project is a productive project. Regular maintenance prevents technical debt accumulation and ensures long-term sustainability.

---

## 📅 Maintenance Schedule

### Daily (Optional)
- [ ] Review and clean temporary files in root directory
- [ ] Check for uncommitted changes that should be committed or ignored

### Weekly (Recommended)
- [ ] Run `npx ccjk` to check for updates
- [ ] Review and merge `CLAUDE.md` updates if any
- [ ] Check for new temporary documentation files
- [ ] Verify `.gitignore` is covering new temporary files

### Monthly (Required)
- [ ] Full project cleanup (use `pnpm clean`)
- [ ] Review and update documentation
- [ ] Check for duplicate or outdated content
- [ ] Update dependencies (`pnpm update`)
- [ ] Review and merge stale branches

### Quarterly (Major)
- [ ] Major version upgrade preparation
- [ ] Full documentation audit
- [ ] Architecture review
- [ ] Performance optimization review
- [ ] Security audit

---

## 🧹 Regular Cleanup Tasks

### 1. Clean Temporary Documentation

```bash
# Find and review temporary docs
find . -name "*-CHANGES.md" -o -name "*-SUMMARY.md" -o -name "*-REPORT.md"

# Move to trash if confirmed obsolete
trash <file>

# Or use the cleanup script (see below)
pnpm run cleanup:docs
```

### 2. Clean Build Artifacts

```bash
# Clean build outputs
pnpm run clean

# Manual cleanup
rm -rf dist/
rm -rf .turbo/
rm -rf coverage/
```

### 3. Clean Node Modules (Occasionally)

```bash
# Remove and reinstall
rm -rf node_modules/
pnpm install
```

### 4. Clean Git History (Annually)

```bash
# Check repository size
du -sh .git/

# If > 100MB, consider cleanup
git gc --aggressive --prune=now
```

---

## 📝 Documentation Standards

### Module Documentation

Every major module should have a `CLAUDE.md` file:

```
src/<module>/CLAUDE.md
```

**Structure**:
1. Navigation breadcrumb
2. Module overview
3. Core responsibilities
4. Module structure (file tree)
5. Dependencies
6. Key interfaces
7. Usage examples
8. Testing status
9. Future enhancements

### Root Documentation

- **CLAUDE.md** - AI context index (primary)
- **README.md** - User-facing documentation
- **CHANGELOG.md** - Version history
- **CONTRIBUTING.md** - Contribution guide (in `docs/`)

### What NOT to Create

❌ **Avoid** these documentation patterns:
- `README.md` inside modules (use `CLAUDE.md`)
- `IMPLEMENTATION_SUMMARY.md` scattered in modules (use `docs/implementation/`)
- Duplicate documentation (e.g., both `README_zh-CN.md` and `README.zh-CN.md`)
- Temporary documentation in root (delete after use)
- Research/analysis documents in root (move to `docs/research/` if needed)

### What to Create

✅ **Do** create:
- `CLAUDE.md` for every major module
- `docs/implementation/<FEATURE>_IMPLEMENTATION.md` for major features
- `docs/en/`, `docs/zh-CN/`, `docs/ja-JP/` for multilingual docs
- Clear, focused documentation with examples

---

## 🔧 Development Workflows

### Before Starting New Feature

1. **Create feature branch**
   ```bash
   git checkout -b feat/<feature-name>
   ```

2. **Update/create module CLAUDE.md**
   ```bash
   # Document what you're building
   ```

3. **Write tests first** (TDD)
   ```bash
   pnpm test:watch
   ```

4. **Implement feature**
   - Follow existing code patterns
   - Use TypeScript strict mode
   - Add i18n support for user-facing strings

5. **Update documentation**
   - Update relevant CLAUDE.md
   - Add/update tests

6. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add <feature-description>"
   git push
   ```

### Before Merging to Main

1. **Run full test suite**
   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

2. **Update CHANGELOG.md**
   ```bash
   # Add entry under "Unreleased"
   ```

3. **Review documentation**
   - Check for typos
   - Verify links work
   - Ensure examples are accurate

4. **Clean temporary files**
   ```bash
   pnpm run cleanup
   ```

5. **Create pull request**
   - Include description
   - Reference related issues
   - Add screenshots if UI changes

---

## 🛠️ Automation Scripts

### Run Cleanup Script

```bash
# Clean all temporary files and docs
pnpm run cleanup

# Or manually
node scripts/cleanup.js
```

### Check Documentation Coverage

```bash
# List modules without CLAUDE.md
find src -type d -mindepth 1 -maxdepth 1 | while read dir; do
  if [ ! -f "$dir/CLAUDE.md" ]; then
    echo "$dir"
  fi
done
```

### Find Duplicate Files

```bash
# Find duplicate README files
find . -name "README*.md" | sort

# Find duplicate implementation summaries
find . -name "*IMPLEMENTATION*.md" | sort
```

---

## 📊 Maintenance Checklist

Use this checklist for regular maintenance:

### Weekly Checklist
- [ ] No temporary files in root directory
- [ ] No duplicate documentation
- [ ] All major modules have CLAUDE.md
- [ ] `.gitignore` is up-to-date
- [ ] No uncommitted temporary changes

### Monthly Checklist
- [ ] All above weekly items
- [ ] Dependencies updated
- [ ] Tests passing
- [ ] Documentation reviewed and updated
- [ ] Code coverage measured (target: 80%)
- [ ] No security vulnerabilities (`pnpm audit`)

### Release Checklist
- [ ] All above monthly items
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Release notes prepared
- [ ] Documentation updated for new features
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)

---

## 🚨 Red Flags to Watch

### Documentation Issues
- 🚩 Multiple README files in same directory
- 🚩 Module without CLAUDE.md
- 🚩 Temporary docs in root (e.g., `*-SUMMARY.md`, `*-REPORT.md`)
- 🚩 Outdated examples in docs
- 🚩 Broken internal links

### Code Issues
- 🚩 Failing tests
- 🚩 TypeScript errors
- 🚩 Lint warnings
- 🚩 Uncommitted changes in node_modules/
- 🚩 Large files in git history (>10MB)

### Process Issues
- 🚩 Long-running feature branches (>2 weeks)
- 🚩 Merge conflicts frequently
- 🚩 Unclear commit messages
- 🚩 Missing tests for new features

---

## 📚 Resources

### Internal Documentation
- `CLAUDE.md` - AI context index
- `docs/implementation/` - Implementation details
- `docs/en/` - English documentation
- `docs/zh-CN/` - Chinese documentation

### External Tools
- `trash` CLI - Safe file deletion
- `prettier` - Code formatting
- `eslint` - Code linting
- `vitest` - Testing framework

---

## 🎓 Best Practices

### Documentation
1. **Write first, document later** - Document after code is stable
2. **Be concise** - Less is more
3. **Use examples** - Show, don't just tell
4. **Keep it current** - Update docs when code changes
5. **Use consistent format** - Follow existing patterns

### Git
1. **Atomic commits** - One logical change per commit
2. **Clear messages** - Describe what and why
3. **Conventional commits** - Use `feat:`, `fix:`, `docs:`, etc.
4. **Clean history** - Rebase feature branches before merge
5. **Tag releases** - Use semantic versioning

### Code
1. **TypeScript strict** - Always use strict mode
2. **Test coverage** - Aim for 80% minimum
3. **i18n support** - All user-facing strings
4. **Error handling** - Comprehensive and user-friendly
5. **Performance** - Optimize hot paths

---

## 🔄 Continuous Improvement

### Review Process
1. Monthly team review of maintenance practices
2. Update this guide based on learnings
3. Share tips and tricks with team
4. Celebrate clean code milestones 🎉

### Feedback Loop
- What's working well?
- What needs improvement?
- What should we automate next?
- What's causing technical debt?

---

**Remember**: A well-maintained project is a joy to work with. Invest time in maintenance, and it will pay dividends in productivity and code quality! 🚀

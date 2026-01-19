# CCJK v3.6.1 Rollback Procedures

**Version:** 3.6.1
**Date:** January 19, 2026
**Purpose:** Emergency rollback procedures in case of critical issues

---

## Overview

This document provides step-by-step procedures for rolling back CCJK v3.6.1 to a previous version in case of critical issues. While v3.6.1 has been thoroughly tested, these procedures ensure you can quickly recover if needed.

---

## When to Rollback

Consider rollback if you encounter:

### Critical Issues
- ❌ Complete system failure
- ❌ Data corruption or loss
- ❌ Security vulnerabilities
- ❌ Breaking changes affecting production

### Major Issues
- ⚠️ Significant performance degradation
- ⚠️ Critical features not working
- ⚠️ Widespread user complaints
- ⚠️ Integration failures

### Do NOT Rollback For
- ✅ Minor bugs (can be patched)
- ✅ UI/UX issues (can be fixed)
- ✅ Documentation errors
- ✅ Individual user issues

---

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] Identify the specific issue
- [ ] Document the problem (screenshots, logs, error messages)
- [ ] Verify the issue is widespread (not user-specific)
- [ ] Check if a hotfix is possible
- [ ] Notify stakeholders
- [ ] Backup current state
- [ ] Identify target rollback version

---

## Rollback Methods

### Method 1: npm Downgrade (Recommended)

**Time:** 2-5 minutes
**Risk:** Low
**Scope:** Package only

#### Steps

1. **Identify Target Version**
   ```bash
   # List available versions
   npm view ccjk versions

   # Common rollback targets
   # v3.6.0 - Previous stable
   # v3.5.0 - Last major release
   # v3.0.0 - Last known good
   ```

2. **Backup Current Configuration**
   ```bash
   # Backup configuration
   cp -r ~/.ccjk ~/.ccjk.backup.v3.6.1.$(date +%Y%m%d_%H%M%S)

   # Verify backup
   ls -la ~/.ccjk.backup.v3.6.1.*
   ```

3. **Uninstall Current Version**
   ```bash
   # Uninstall v3.6.1
   npm uninstall -g ccjk

   # Verify uninstallation
   ccjk --version  # Should show "command not found"
   ```

4. **Install Target Version**
   ```bash
   # Install specific version
   npm install -g ccjk@3.5.0  # Replace with target version

   # Verify installation
   ccjk --version
   ```

5. **Restore Configuration (if needed)**
   ```bash
   # If configuration is incompatible, restore backup
   rm -rf ~/.ccjk
   cp -r ~/.ccjk.backup.v3.6.1.* ~/.ccjk
   ```

6. **Verify Functionality**
   ```bash
   # Test basic commands
   ccjk --help
   ccjk config show
   ccjk tools list

   # Test tool functionality
   ccjk tools check claude-code
   ```

---

### Method 2: Git Revert (For Repository)

**Time:** 5-10 minutes
**Risk:** Medium
**Scope:** Full repository

#### Steps

1. **Identify Commit to Revert**
   ```bash
   # View recent commits
   git log --oneline -10

   # Find v3.6.1 release commit
   git log --grep="v3.6.1"
   ```

2. **Create Rollback Branch**
   ```bash
   # Create rollback branch
   git checkout -b rollback/v3.6.1

   # Revert to previous version
   git revert <commit-hash> --no-commit

   # Or reset to previous tag
   git reset --hard v3.5.0
   ```

3. **Update Version**
   ```bash
   # Update package.json
   npm version 3.5.0 --no-git-tag-version
   ```

4. **Commit and Push**
   ```bash
   # Commit rollback
   git add .
   git commit -m "Rollback to v3.5.0 due to critical issue in v3.6.1"

   # Push rollback branch
   git push origin rollback/v3.6.1
   ```

5. **Merge to Main**
   ```bash
   # Switch to main
   git checkout main

   # Merge rollback
   git merge rollback/v3.6.1

   # Push to main
   git push origin main
   ```

---

### Method 3: npm Unpublish (Within 72 Hours)

**Time:** 5 minutes
**Risk:** High (permanent)
**Scope:** npm registry

⚠️ **WARNING:** This is irreversible and should only be used in extreme cases.

#### Requirements
- Must be within 72 hours of publication
- Must have npm publish permissions
- Must notify all users

#### Steps

1. **Verify Eligibility**
   ```bash
   # Check publication time
   npm view ccjk@3.6.1 time

   # Must be within 72 hours
   ```

2. **Notify Users**
   - Post on GitHub
   - Tweet announcement
   - Email newsletter
   - Discord announcement

3. **Unpublish Version**
   ```bash
   # Unpublish v3.6.1
   npm unpublish ccjk@3.6.1

   # Verify unpublish
   npm view ccjk@3.6.1  # Should show error
   ```

4. **Publish Previous Version**
   ```bash
   # Checkout previous version
   git checkout v3.5.0

   # Publish
   npm publish
   ```

---

### Method 4: Complete Reset

**Time:** 10-15 minutes
**Risk:** High (data loss)
**Scope:** Everything

⚠️ **WARNING:** This removes all CCJK data. Use only as last resort.

#### Steps

1. **Backup Everything**
   ```bash
   # Backup all CCJK data
   tar -czf ccjk-backup-$(date +%Y%m%d_%H%M%S).tar.gz ~/.ccjk

   # Verify backup
   tar -tzf ccjk-backup-*.tar.gz
   ```

2. **Remove All CCJK Data**
   ```bash
   # Remove package
   npm uninstall -g ccjk

   # Remove configuration
   rm -rf ~/.ccjk

   # Clear npm cache
   npm cache clean --force
   ```

3. **Reinstall Target Version**
   ```bash
   # Install specific version
   npm install -g ccjk@3.5.0

   # Verify installation
   ccjk --version
   ```

4. **Restore Configuration**
   ```bash
   # Extract backup
   tar -xzf ccjk-backup-*.tar.gz -C ~/

   # Or reinitialize
   ccjk init
   ```

---

## Post-Rollback Procedures

### 1. Verification

```bash
# Verify version
ccjk --version

# Test basic functionality
ccjk --help
ccjk config show
ccjk tools list

# Test tool operations
ccjk tools check claude-code
ccjk version check claude-code

# Run tests (if in development)
npm test
```

### 2. User Communication

#### GitHub Issue
```markdown
# v3.6.1 Rolled Back Due to Critical Issue

We've rolled back CCJK to v3.5.0 due to [describe issue].

## What Happened
[Detailed explanation]

## What We're Doing
- Investigating root cause
- Developing fix
- Testing thoroughly
- Planning re-release

## What You Should Do
1. Update to v3.5.0: `npm install -g ccjk@3.5.0`
2. Verify functionality
3. Report any issues

## Timeline
- Fix ETA: [date]
- Testing: [date]
- Re-release: [date]

We apologize for the inconvenience.
```

#### Twitter Announcement
```
⚠️ CCJK v3.6.1 Rollback Notice

We've rolled back to v3.5.0 due to a critical issue.

Update now:
npm install -g ccjk@3.5.0

Details: [GitHub issue link]

We're working on a fix and will re-release soon.

Sorry for the inconvenience! 🙏
```

### 3. Root Cause Analysis

Document:
- What went wrong
- Why it wasn't caught in testing
- How to prevent in future
- Timeline of events
- Impact assessment

### 4. Fix Development

- Create hotfix branch
- Develop fix
- Add tests to prevent regression
- Test thoroughly
- Code review
- QA testing

### 5. Re-release Planning

- Version number (3.6.2 or 3.7.0)
- Release notes
- Testing checklist
- Rollout strategy
- Monitoring plan

---

## Rollback Decision Matrix

| Issue Severity | User Impact | Rollback Decision | Timeline |
|----------------|-------------|-------------------|----------|
| Critical | >50% users | Immediate rollback | <1 hour |
| High | 25-50% users | Rollback after investigation | <4 hours |
| Medium | 10-25% users | Hotfix preferred | <24 hours |
| Low | <10% users | Patch in next release | Next release |

---

## Emergency Contacts

### Technical Team
- **Lead Developer:** [Name] - [Email] - [Phone]
- **DevOps:** [Name] - [Email] - [Phone]
- **QA Lead:** [Name] - [Email] - [Phone]

### Communication Team
- **Community Manager:** [Name] - [Email]
- **Social Media:** [Name] - [Email]
- **Documentation:** [Name] - [Email]

### Escalation Path
1. Developer → Lead Developer
2. Lead Developer → Technical Director
3. Technical Director → CTO

---

## Rollback Checklist

### Pre-Rollback
- [ ] Issue identified and documented
- [ ] Severity assessed
- [ ] Stakeholders notified
- [ ] Rollback method selected
- [ ] Backup created
- [ ] Target version identified

### During Rollback
- [ ] Rollback initiated
- [ ] Progress monitored
- [ ] Issues documented
- [ ] Users notified
- [ ] Status updates posted

### Post-Rollback
- [ ] Functionality verified
- [ ] Users notified of completion
- [ ] Root cause analysis started
- [ ] Fix development planned
- [ ] Monitoring increased
- [ ] Lessons learned documented

---

## Testing After Rollback

### Smoke Tests
```bash
# Version check
ccjk --version

# Help command
ccjk --help

# Configuration
ccjk config show

# Tool listing
ccjk tools list

# Tool check
ccjk tools check claude-code
```

### Integration Tests
```bash
# Version checking
ccjk version check claude-code

# Configuration update
ccjk config set test.value true

# Tool operations
ccjk tools info claude-code
```

### User Acceptance Tests
- [ ] New user setup
- [ ] Existing user upgrade
- [ ] Tool configuration
- [ ] Version management
- [ ] Common workflows

---

## Prevention Measures

### For Future Releases

1. **Enhanced Testing**
   - Increase test coverage to 95%+
   - Add more integration tests
   - Implement canary releases
   - Beta testing program

2. **Gradual Rollout**
   - Release to 10% of users first
   - Monitor for 24 hours
   - Gradually increase to 100%
   - Easy rollback at each stage

3. **Monitoring**
   - Real-time error tracking
   - Performance monitoring
   - User feedback collection
   - Automated alerts

4. **Documentation**
   - Comprehensive release notes
   - Known issues list
   - Troubleshooting guide
   - Rollback procedures

---

## Rollback History

### v3.6.1
- **Status:** Active (no rollback needed)
- **Issues:** None reported
- **Rollback:** N/A

### Template for Future Rollbacks
- **Date:** [Date]
- **Version:** [Version]
- **Reason:** [Reason]
- **Method:** [Method used]
- **Duration:** [Time to complete]
- **Impact:** [Number of users affected]
- **Resolution:** [How it was fixed]

---

## Support Resources

### Documentation
- Release Notes: RELEASE_NOTES_v3.6.1.md
- Migration Guide: MIGRATION_GUIDE_v3.6.1.md
- Changelog: CHANGELOG.md

### Support Channels
- GitHub Issues: https://github.com/miounet11/ccjk/issues
- Email: 9248293@gmail.com
- Discord: [Coming soon]

### Useful Commands
```bash
# Check version
ccjk --version

# View configuration
ccjk config show

# List installed tools
ccjk tools list

# Check tool status
ccjk tools check <tool-name>

# Reset configuration
ccjk config reset

# Clear cache
ccjk cache clear
```

---

## Conclusion

While we've thoroughly tested v3.6.1 and don't anticipate needing these procedures, having a clear rollback plan ensures we can respond quickly to any critical issues.

**Remember:**
- Rollback is a last resort
- Always try hotfix first
- Document everything
- Communicate clearly
- Learn from incidents

---

**Document Version:** 1.0
**Last Updated:** January 19, 2026
**Next Review:** After any rollback or major release

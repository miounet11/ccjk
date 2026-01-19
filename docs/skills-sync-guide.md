# Skills Cloud Sync - User Guide

## Quick Start

### Basic Usage

```bash
# Interactive menu (recommended for first-time users)
ccjk skills-sync
# or use the short alias
ccjk ss
```

### Common Commands

```bash
# Sync all skills (bidirectional)
ccjk skills-sync sync

# Push local skills to cloud
ccjk skills-sync push

# Pull skills from cloud
ccjk skills-sync pull

# List cloud skills
ccjk skills-sync list

# Check sync status
ccjk skills-sync status
```

## Command Options

### Language Selection
```bash
# Use Chinese interface
ccjk skills-sync --lang zh-CN

# Use English interface (default)
ccjk skills-sync --lang en
```

### Conflict Resolution
When the same skill is modified both locally and remotely, you can choose how to resolve conflicts:

```bash
# Prompt for each conflict (default)
ccjk skills-sync sync --conflict-resolution prompt

# Always use local version
ccjk skills-sync sync --conflict-resolution local

# Always use remote version
ccjk skills-sync sync --conflict-resolution remote

# Use the newest version
ccjk skills-sync sync --conflict-resolution newest
```

### Selective Sync
```bash
# Sync specific skills only
ccjk skills-sync sync --skill-ids skill1,skill2,skill3

# Push specific skills
ccjk skills-sync push --skill-ids my-skill

# Pull specific skills
ccjk skills-sync pull --skill-ids team-skill
```

### Privacy Filtering
```bash
# List only public skills
ccjk skills-sync list --privacy public

# List only team skills
ccjk skills-sync list --privacy team

# List only private skills
ccjk skills-sync list --privacy private
```

### Dry Run Mode
Preview changes without actually applying them:

```bash
# Preview sync changes
ccjk skills-sync sync --dry-run

# Preview push changes
ccjk skills-sync push --dry-run

# Preview pull changes
ccjk skills-sync pull --dry-run
```

### Force Mode
Skip confirmation prompts:

```bash
# Force sync without confirmation
ccjk skills-sync sync --force

# Force push without confirmation
ccjk skills-sync push --force
```

## Understanding Sync Status

### Status Types

- **✓ Synced**: Local and remote versions are identical
- **↑ Local Ahead**: Local version is newer than remote
- **↓ Remote Ahead**: Remote version is newer than local
- **⚠ Conflict**: Both versions have been modified
- **📍 Local Only**: Skill exists only on your machine
- **☁ Remote Only**: Skill exists only in the cloud

### Privacy Levels

- **🔒 PRIVATE**: Only you can see and use this skill
- **👥 TEAM**: Shared with your team members
- **🌍 PUBLIC**: Available to all users

## Workflows

### First-Time Setup
```bash
# 1. Check current status
ccjk skills-sync status

# 2. Push your local skills to cloud
ccjk skills-sync push

# 3. Verify upload
ccjk skills-sync list
```

### Daily Sync
```bash
# Sync all changes (recommended)
ccjk skills-sync sync
```

### Sharing Skills with Team
```bash
# 1. Set skill privacy to 'team' in skill definition
# 2. Push to cloud
ccjk skills-sync push --skill-ids team-skill

# 3. Team members can pull
ccjk skills-sync pull --privacy team
```

### Backup and Restore
```bash
# Backup: Push all skills to cloud
ccjk skills-sync push

# Restore: Pull all skills from cloud
ccjk skills-sync pull --force
```

### Resolving Conflicts
```bash
# 1. Check for conflicts
ccjk skills-sync status

# 2. Preview resolution
ccjk skills-sync sync --dry-run

# 3. Resolve interactively
ccjk skills-sync sync --conflict-resolution prompt

# Or automatically use local/remote/newest
ccjk skills-sync sync --conflict-resolution local
```

## Advanced Usage

### Combining Options
```bash
# Sync specific skills with Chinese UI and dry-run
ccjk skills-sync sync \
  --lang zh-CN \
  --skill-ids skill1,skill2 \
  --conflict-resolution newest \
  --dry-run

# Force push private skills only
ccjk skills-sync push \
  --privacy private \
  --force

# Pull team skills with conflict resolution
ccjk skills-sync pull \
  --privacy team \
  --conflict-resolution remote
```

### Automation
```bash
# Non-interactive sync for CI/CD
ccjk skills-sync sync \
  --force \
  --conflict-resolution newest

# Scheduled backup script
#!/bin/bash
ccjk skills-sync push --force
```

## Troubleshooting

### Common Issues

#### "No skills found"
- Check that skills are defined in the correct directory
- Verify skill definition format
- Run `ccjk skills-sync status` to see detected skills

#### "Sync conflict detected"
- Use `--conflict-resolution` option to specify strategy
- Or use interactive mode to resolve manually
- Preview with `--dry-run` first

#### "Authentication failed"
- Ensure you're logged in to the cloud service
- Check your API credentials
- Run `ccjk doctor` to diagnose issues

#### "Network error"
- Check your internet connection
- Verify cloud service is accessible
- Try again later if service is down

### Getting Help

```bash
# Show command help
ccjk skills-sync --help

# Check system health
ccjk doctor

# View all available commands
ccjk --help
```

## Best Practices

### 1. Regular Syncing
Sync frequently to avoid large conflicts:
```bash
# Daily sync
ccjk skills-sync sync
```

### 2. Use Dry Run
Preview changes before applying:
```bash
ccjk skills-sync sync --dry-run
```

### 3. Meaningful Versions
Use semantic versioning for skills:
- `1.0.0` - Initial release
- `1.1.0` - New features
- `1.1.1` - Bug fixes
- `2.0.0` - Breaking changes

### 4. Privacy Management
- Start with `private` for experimental skills
- Use `team` for collaborative work
- Only make `public` when stable and documented

### 5. Selective Sync
For large skill collections, sync specific skills:
```bash
ccjk skills-sync sync --skill-ids active-skill1,active-skill2
```

### 6. Backup Before Major Changes
```bash
# Backup current state
ccjk skills-sync push --force

# Make changes...

# Restore if needed
ccjk skills-sync pull --conflict-resolution remote --force
```

## Examples

### Example 1: First-Time User
```bash
# Step 1: See what you have locally
ccjk skills-sync status

# Step 2: Upload to cloud
ccjk skills-sync push

# Step 3: Verify
ccjk skills-sync list
```

### Example 2: Team Collaboration
```bash
# Developer A: Share a skill
ccjk skills-sync push --skill-ids new-feature

# Developer B: Get the skill
ccjk skills-sync pull --skill-ids new-feature
```

### Example 3: Conflict Resolution
```bash
# Check status
ccjk skills-sync status
# Output: ⚠ Conflict: my-skill

# Preview resolution options
ccjk skills-sync sync --dry-run

# Resolve interactively
ccjk skills-sync sync --conflict-resolution prompt
# Choose: [1] Use local [2] Use remote [3] Use newest
```

### Example 4: Multi-Machine Workflow
```bash
# On Machine A
ccjk skills-sync push

# On Machine B
ccjk skills-sync pull

# Make changes on Machine B
# ...

# Sync back
ccjk skills-sync sync
```

## FAQ

**Q: How often should I sync?**
A: Sync whenever you make significant changes, or at least daily if working in a team.

**Q: What happens if I lose my local skills?**
A: Pull from cloud: `ccjk skills-sync pull --force`

**Q: Can I sync only some skills?**
A: Yes, use `--skill-ids` option: `ccjk skills-sync sync --skill-ids skill1,skill2`

**Q: How do I share skills with my team?**
A: Set privacy to 'team' in skill definition, then push to cloud.

**Q: What if sync fails?**
A: Check network connection, verify credentials, and try again. Use `--dry-run` to preview.

**Q: Can I undo a sync?**
A: Not directly, but you can pull the previous version from cloud if you pushed before the change.

**Q: How do I delete a cloud skill?**
A: Currently, delete locally and push. The skill will be marked as deleted in cloud.

**Q: Is my data secure?**
A: Private skills are only accessible to you. Team skills are shared within your team. Public skills are visible to all.

## Support

For more help:
- Run `ccjk skills-sync --help`
- Check `ccjk doctor` for system diagnostics
- View full documentation in `SKILLS_SYNC_IMPLEMENTATION.md`
- Report issues on the project repository

---

**Last Updated**: 2024
**Version**: 1.0.0

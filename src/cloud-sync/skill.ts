/**
 * Cloud Sync Skill - Cloud synchronization management skill
 *
 * Provides /sync, /cloud, /backup, /restore commands
 * Supports cross-device configuration, skills, and workflow synchronization
 */

import type { CcjkSkill } from '../skills/types'

/**
 * Cloud Sync Skill definition
 */
export const cloudSyncSkill: CcjkSkill = {
  id: 'cloud-sync',
  name: {
    'en': 'Cloud Sync',
    'zh-CN': '云同步管理',
  },
  description: {
    'en': 'Cross-device synchronization for configurations, skills, and workflows',
    'zh-CN': '跨设备同步配置、技能和工作流',
  },
  category: 'devops',
  triggers: ['/sync', '/cloud', '/backup', '/restore'],
  enabled: true,
  version: '1.0.0',
  author: 'CCJK Team',
  tags: ['cloud', 'sync', 'backup', 'restore', 'configuration'],
  template: `# Cloud Sync Management

## Overview

Cloud Sync provides seamless cross-device synchronization for your CCJK environment.
Keep your configurations, skills, and workflows in sync across all your development machines.

## Features

### Configuration Sync
- Synchronize CCJK settings across devices
- Preserve API configurations securely
- Sync MCP service configurations

### Skills Sync
- Share custom skills between machines
- Version control for skill updates
- Conflict resolution for concurrent edits

### Workflow Sync
- Sync workflow states and progress
- Share workflow templates
- Collaborative workflow management

### Conflict Resolution
- Intelligent merge for non-conflicting changes
- Manual resolution UI for conflicts
- Version history for rollback

## Commands

### Sync Status
\`\`\`bash
/sync status
\`\`\`
View current synchronization status, pending changes, and last sync time.

### Push Changes
\`\`\`bash
/sync push              # Push all pending changes
/sync push --config     # Push configuration only
/sync push --skills     # Push skills only
/sync push --workflows  # Push workflows only
\`\`\`

### Pull Changes
\`\`\`bash
/sync pull              # Pull all remote changes
/sync pull --force      # Force pull, overwrite local
/sync pull --merge      # Merge with local changes
\`\`\`

### Configure Cloud Storage
\`\`\`bash
/sync config                    # Interactive configuration
/sync config github             # Configure GitHub Gist
/sync config webdav             # Configure WebDAV
/sync config local              # Configure local folder sync
\`\`\`

### Backup Management
\`\`\`bash
/backup create                  # Create full backup
/backup create --name "v1.0"    # Create named backup
/backup list                    # List all backups
/backup restore <id>            # Restore from backup
/backup delete <id>             # Delete a backup
\`\`\`

### Conflict Management
\`\`\`bash
/sync conflicts                 # List all conflicts
/sync resolve <id> --local      # Keep local version
/sync resolve <id> --remote     # Keep remote version
/sync resolve <id> --merge      # Manual merge
\`\`\`

## Supported Cloud Storage

### GitHub Gist (Recommended)
- Free and reliable
- Version history built-in
- Easy to set up with personal access token

\`\`\`bash
/sync config github
# Enter your GitHub personal access token
# Token needs 'gist' scope
\`\`\`

### WebDAV
Compatible with:
- Nutstore (坚果云)
- Nextcloud
- ownCloud
- Any WebDAV server

\`\`\`bash
/sync config webdav
# Enter WebDAV URL, username, and password
\`\`\`

### Local Folder
For manual sync via Dropbox, OneDrive, etc.

\`\`\`bash
/sync config local
# Enter path to sync folder
\`\`\`

## Usage Examples

### First-Time Setup
\`\`\`bash
# 1. Configure cloud storage
/sync config github

# 2. Push initial configuration
/sync push --all

# 3. Verify sync status
/sync status
\`\`\`

### Daily Workflow
\`\`\`bash
# Start of day: pull latest changes
/sync pull

# End of day: push your changes
/sync push
\`\`\`

### Handling Conflicts
\`\`\`bash
# Check for conflicts after pull
/sync conflicts

# Review and resolve each conflict
/sync resolve skill-123 --merge
\`\`\`

### Backup Before Major Changes
\`\`\`bash
# Create backup before risky operations
/backup create --name "before-upgrade"

# If something goes wrong
/backup restore before-upgrade
\`\`\`

## Security

### Sensitive Data Handling
- API keys are encrypted before sync
- OAuth tokens are never synced (re-authenticate on each device)
- Local encryption key derived from device-specific identifier

### Access Control
- GitHub: Uses personal access token with minimal scope
- WebDAV: Supports app-specific passwords
- All connections use HTTPS/TLS

## Best Practices

1. **Regular Syncing**: Sync at least daily to avoid large conflicts
2. **Named Backups**: Create named backups before major changes
3. **Review Conflicts**: Don't auto-resolve conflicts without review
4. **Secure Tokens**: Use app-specific passwords when available
5. **Test Restore**: Periodically test backup restoration

## Troubleshooting

### Sync Failed
\`\`\`bash
# Check connection
/sync status --verbose

# Force re-authentication
/sync config github --reauth
\`\`\`

### Conflicts Won't Resolve
\`\`\`bash
# Reset sync state
/sync reset

# Re-initialize from remote
/sync pull --force
\`\`\`

### Backup Corrupted
\`\`\`bash
# List all backups with integrity check
/backup list --verify

# Delete corrupted backup
/backup delete <corrupted-id>
\`\`\`
`,
}

/**
 * Get cloud sync skill template
 */
export function getCloudSyncSkillTemplate(): string {
  return cloudSyncSkill.template
}

/**
 * Get cloud sync skill definition
 */
export function getCloudSyncSkill(): CcjkSkill {
  return cloudSyncSkill
}

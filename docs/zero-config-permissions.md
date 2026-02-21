# Zero-Config Permission Presets

One-click permission configuration for Claude Code with pre-defined security levels.

## Overview

The Zero-Config Permission Presets feature provides three carefully curated permission sets that cover common use cases:

- **Maximum** — All common commands and operations
- **Developer** — Essential development tools
- **Safe** — Read-only operations only

## Quick Start

```bash
# List available presets
ccjk zc --list

# Apply a preset (interactive)
ccjk zc

# Apply a preset (non-interactive)
ccjk zc --preset max
ccjk zc --preset dev
ccjk zc --preset safe

# Skip backup (not recommended)
ccjk zc --preset dev --skip-backup
```

## Available Presets

### Maximum Permissions (`max`)

**Use case:** Power users who want minimal friction

**Includes:**
- All package managers (npm, pnpm, yarn, bun, deno)
- Version control (git)
- Build tools (make, cmake, cargo, go)
- Container tools (docker, docker-compose, podman)
- Programming languages (python, node, ruby, php, java)
- Shell utilities (cat, ls, grep, find, sed, awk, etc.)
- File operations (mkdir, touch, cp, mv, chmod)
- Network tools (curl, wget, ping)
- System info (ps, top, df, du)
- Text editors (vim, nano, emacs, code)
- Compression (tar, gzip, zip)
- System package managers (brew, apt, yum, pacman)
- All file operations (Read, Edit, Write, NotebookEdit)
- Web access (WebFetch)
- All MCP servers (MCP wildcard)

**Total:** 100+ permissions

**Example:**
```bash
ccjk zc --preset max
```

### Developer Preset (`dev`)

**Use case:** Most developers, balanced security and convenience

**Includes:**
- Package managers (npm, pnpm, yarn, bun)
- Version control (git)
- Build tools (make, cargo, go)
- Programming languages (python, node)
- Essential shell utilities (cat, ls, grep, find, etc.)
- File operations (mkdir, touch, cp, mv, chmod)
- All file operations (Read, Edit, Write, NotebookEdit)
- Web access for documentation (WebFetch)

**Total:** 50+ permissions

**Example:**
```bash
ccjk zc --preset dev
```

### Safe Preset (`safe`)

**Use case:** Security-conscious users, code review, auditing

**Includes:**
- Read-only shell utilities (cat, ls, grep, find, head, tail, wc, sort)
- System info (ps, df, du, uname)
- Git read operations (status, log, diff, show, branch)
- Read-only file operations (Read only)
- Web access (WebFetch)

**Total:** 20+ permissions

**Example:**
```bash
ccjk zc --preset safe
```

## How It Works

### 1. Backup

Before applying any preset, CCJK automatically creates a timestamped backup:

```
~/.claude/backup/settings-2025-02-21T10-30-45.json
```

You can skip this with `--skip-backup` (not recommended).

### 2. Merge

The preset permissions are **merged** with your existing permissions:

- ✅ Your custom permissions are preserved
- ✅ Duplicate permissions are removed
- ✅ Invalid permissions are filtered out
- ✅ Dangerous patterns are excluded

### 3. Validation

All permissions are validated against Claude Code's permission system:

**Valid patterns:**
- `Bash(command *)` — Shell commands with wildcards
- `Read(*)` — File read operations
- `Edit(*)` — File edit operations
- `Write(*)` — File write operations
- `NotebookEdit(*)` — Jupyter notebook operations
- `WebFetch(*)` — Web access
- `MCP(*)` — MCP server access

**Invalid patterns (automatically removed):**
- `AllowEdit`, `AllowWrite`, etc. — Old invalid names
- `Bash(rm *)`, `Bash(sudo *)` — Dangerous operations
- `Bash(passwd *)`, `Bash(reboot *)` — System-critical commands

### 4. Preview

Before applying, you'll see exactly what will be added:

```
📋 Preset Details
────────────────────────────────────────────────────────
Name: Developer Preset
Description: Build tools, git, package managers, and file operations

✨ Permissions to be added:
  Total: 45 items
  Bash: 30 commands
  File: 4 operations
  Other: 11 items
────────────────────────────────────────────────────────

Confirm applying this preset? (Y/n)
```

## Menu Integration

The zero-config feature is also available in the interactive menu:

```bash
ccjk
```

Then select option **8** (Zero-Config Permission Presets).

## Use Cases

### First-Time Setup

For new Claude Code users:

```bash
ccjk init
ccjk zc --preset dev
```

### Security Audit

When reviewing code from untrusted sources:

```bash
ccjk zc --preset safe
# Review code with read-only access
# Switch back when done:
ccjk zc --preset dev
```

### CI/CD Pipeline

For automated environments:

```bash
ccjk zc --preset max --skip-backup
```

### Team Standardization

Ensure all team members have consistent permissions:

```bash
# In team documentation:
ccjk zc --preset dev
```

## Advanced Usage

### Custom Permissions

You can still add custom permissions after applying a preset:

```bash
# Apply dev preset
ccjk zc --preset dev

# Add custom permission
echo '{
  "permissions": {
    "allow": [
      "Bash(custom-tool *)",
      "MCP(custom-server:tool)"
    ]
  }
}' | jq -s '.[0].permissions.allow += .[1].permissions.allow' ~/.claude/settings.json - > /tmp/settings.json
mv /tmp/settings.json ~/.claude/settings.json
```

Or use the menu option 7 to manually edit permissions.

### Restore from Backup

If you need to restore a previous configuration:

```bash
# List backups
ls -lt ~/.claude/backup/

# Restore specific backup
cp ~/.claude/backup/settings-2025-02-21T10-30-45.json ~/.claude/settings.json
```

## Security Considerations

### Excluded Dangerous Patterns

The following patterns are **never** included in any preset:

- `Bash(rm *)` — File deletion
- `Bash(sudo *)` — Privilege escalation
- `Bash(passwd *)` — Password changes
- `Bash(reboot *)` — System reboot
- `Bash(shutdown *)` — System shutdown
- `Bash(kill *)` — Process termination
- `Bash(su *)` — User switching
- `Bash(useradd *)` — User management
- `Bash(modprobe *)` — Kernel module management

If you need these operations, add them manually with caution.

### Permission Scope

All permissions use wildcards (`*`) for flexibility, but this means:

- `Bash(npm *)` allows **all** npm commands
- `Read(*)` allows reading **all** files
- `MCP(*)` allows **all** MCP servers

For stricter control, manually edit `~/.claude/settings.json` to use specific patterns:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm install *)",
      "Bash(npm run *)",
      "Read(/path/to/project/*)"
    ]
  }
}
```

## Troubleshooting

### Preset Not Found

```bash
Error: Preset "invalid" not found
Use --list to see available presets
```

**Solution:** Run `ccjk zc --list` to see valid preset names.

### Permissions Not Working

If Claude Code still asks for permissions after applying a preset:

1. Restart Claude Code
2. Check settings file: `cat ~/.claude/settings.json`
3. Verify permissions format is correct
4. Run `ccjk doctor` to diagnose issues

### Backup Failed

If backup creation fails:

```bash
# Manually create backup
mkdir -p ~/.claude/backup
cp ~/.claude/settings.json ~/.claude/backup/settings-manual-$(date +%Y%m%d-%H%M%S).json

# Then apply preset with --skip-backup
ccjk zc --preset dev --skip-backup
```

## FAQ

### Q: Will this overwrite my existing permissions?

**A:** No. The presets are **merged** with your existing permissions. Your custom permissions are preserved.

### Q: Can I undo a preset?

**A:** Yes. CCJK automatically creates a backup before applying. Restore from `~/.claude/backup/`.

### Q: Which preset should I use?

**A:**
- **New users:** Start with `dev`
- **Power users:** Use `max`
- **Security-conscious:** Use `safe`

### Q: Can I create custom presets?

**A:** Not yet, but this is planned for a future release. For now, apply a preset and manually add custom permissions.

### Q: Does this work with Codex/Aider/Cursor?

**A:** Currently only Claude Code is supported. Support for other tools is planned.

## Related Commands

- `ccjk init` — Full initialization with permission setup
- `ccjk doctor` — Diagnose permission issues
- `ccjk status` — View current configuration health
- Menu option 7 — Manual permission configuration

## See Also

- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [Permission System Guide](./permissions.md)
- [Security Best Practices](./security.md)

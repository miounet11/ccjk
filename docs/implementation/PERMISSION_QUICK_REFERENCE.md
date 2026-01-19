# CCJK Permission System - Quick Reference Guide

## 🚀 Quick Start

### Installation
The permission system is already integrated into CCJK. No additional installation needed.

### Basic Usage

```bash
# View all permissions
ccjk permissions list

# Grant permission to a resource
ccjk permissions grant "Provider(302ai)"

# Check if permission exists
ccjk permissions check "Provider(302ai)"

# Revoke permission
ccjk permissions revoke "Provider(302ai)"
```

---

## 📖 Command Reference

### List Permissions
```bash
ccjk permissions list [options]

Options:
  --format, -f    Output format: table (default), json, list
  --verbose, -v   Show detailed information including metadata

Examples:
  ccjk permissions list
  ccjk permissions list --format json
  ccjk permissions list --verbose
```

### Check Permission
```bash
ccjk permissions check <resource>

Examples:
  ccjk permissions check "Provider(302ai)"
  ccjk permissions check "Model(claude-opus)"
  ccjk permissions check "file:///path/to/file"
```

### Grant Permission
```bash
ccjk permissions grant <resource>

Examples:
  ccjk permissions grant "Provider(302ai)"
  ccjk permissions grant "Model(*)"
  ccjk permissions grant "mcp://server-name"
```

### Revoke Permission
```bash
ccjk permissions revoke <resource>

Examples:
  ccjk permissions revoke "Provider(302ai)"
  ccjk permissions revoke "Model(gpt-4)"
```

### Reset All Permissions
```bash
ccjk permissions reset

# Will prompt for confirmation
```

### Export Permissions
```bash
ccjk permissions export [file]

Examples:
  ccjk permissions export                    # Exports to ./permissions.json
  ccjk permissions export my-perms.json      # Exports to specified file
  ccjk permissions export ~/backup/perms.json
```

### Import Permissions
```bash
ccjk permissions import <file>

Examples:
  ccjk permissions import permissions.json
  ccjk permissions import ~/backup/perms.json
```

### Show Help
```bash
ccjk permissions help
```

---

## 🎯 Pattern Syntax

### Basic Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `Resource:action` | Exact match | `Provider(302ai):read` |
| `Resource:*` | All actions on resource | `Provider(302ai):*` |
| `Resource(*):action` | Action on any resource of type | `Model(*):read` |
| `*` | Match everything | `*:*` |

### Wildcard Support

- `*` - Matches any number of characters
- `?` - Matches exactly one character

### Examples

```bash
# Allow reading any model
Provider(*):read

# Allow all actions on 302ai provider
Provider(302ai):*

# Allow specific model
Model(claude-opus):read

# Deny all GPT-4 access
Model(gpt-4):*

# Allow all file operations in a directory
file:///home/user/documents/*:*
```

---

## 🔒 Permission Rules

### Rule Precedence

1. **Deny rules** are checked first
2. **Allow rules** are checked second
3. **Default deny** if no rule matches

### Example Scenario

```json
{
  "permissions": {
    "allow": [
      "Model(*):read"
    ],
    "deny": [
      "Model(gpt-4):*"
    ]
  }
}
```

Result:
- `Model(claude-opus):read` → ✅ Allowed (matches allow rule)
- `Model(gpt-4):read` → ❌ Denied (deny rule takes precedence)
- `Model(claude-opus):write` → ❌ Denied (no matching rule, default deny)

---

## 💻 Programmatic Usage

### Import the Module

```typescript
import { PermissionManager } from '@ccjk/core/permissions'

const manager = new PermissionManager()
```

### Check Permission

```typescript
const result = manager.checkPermission('read', 'Provider(302ai)')

if (result.allowed) {
  console.log('Access granted:', result.reason)
} else {
  console.log('Access denied:', result.reason)
}
```

### Add Permission

```typescript
manager.addPermission({
  type: 'allow',
  pattern: 'Provider(302ai):*',
  scope: 'global',
  description: 'Allow all 302ai operations'
})
```

### Remove Permission

```typescript
const removed = manager.removePermission('Provider(302ai):*')
console.log(`Removed ${removed} rule(s)`)
```

### List Permissions

```typescript
// List all permissions
const all = manager.listPermissions()

// List only allow rules
const allowed = manager.listPermissions('allow')

// List only deny rules
const denied = manager.listPermissions('deny')

// List global scope permissions
const global = manager.listPermissions(undefined, 'global')
```

### Export/Import

```typescript
// Export
const config = manager.exportPermissions()
console.log(JSON.stringify(config, null, 2))

// Import (replace existing)
manager.importPermissions({
  allow: ['Provider(*):read'],
  deny: ['Provider(openai):write']
}, false)

// Import (merge with existing)
manager.importPermissions({
  allow: ['Model(*):read']
}, true)
```

### Get Statistics

```typescript
const stats = manager.getStats()
console.log(`Total: ${stats.total}`)
console.log(`Allow: ${stats.allow}`)
console.log(`Deny: ${stats.deny}`)
```

---

## 📁 Configuration File

### Location
```
~/.ccjk/config.json
```

### Structure

```json
{
  "permissions": {
    "allow": [
      "Provider(302ai):*",
      "Model(*):read",
      "Tool(web-search):execute"
    ],
    "deny": [
      "Model(gpt-4):*",
      "Tool(file-delete):*"
    ]
  }
}
```

### Manual Editing

You can manually edit the config file, but it's recommended to use the CLI commands for safety.

---

## 🎨 Output Formats

### Table Format (Default)

```
Resource                                Level          Granted At
──────────────────────────────────────────────────────────────────────
Provider(302ai)                         full           2024-01-15 10:30:00
Model(claude-opus)                      read           2024-01-15 10:31:00
```

### JSON Format

```json
[
  {
    "resource": "Provider(302ai)",
    "level": "full",
    "grantedAt": 1705315800000,
    "metadata": {
      "grantedBy": "cli",
      "grantedAt": "2024-01-15T10:30:00.000Z"
    }
  }
]
```

### List Format

```
Provider(302ai): full
Model(claude-opus): read
```

---

## 🔍 Common Use Cases

### 1. Allow All Access to a Provider

```bash
ccjk permissions grant "Provider(302ai)"
```

### 2. Allow Read-Only Access to All Models

```typescript
manager.addPermission({
  type: 'allow',
  pattern: 'Model(*):read',
  scope: 'global'
})
```

### 3. Block Specific Model

```bash
# First allow all models
ccjk permissions grant "Model(*)"

# Then deny specific model
manager.addPermission({
  type: 'deny',
  pattern: 'Model(gpt-4):*',
  scope: 'global'
})
```

### 4. Temporary Project Permissions

```typescript
manager.addPermission({
  type: 'allow',
  pattern: 'file:///project/data/*:*',
  scope: 'project',
  description: 'Project-specific file access'
})
```

### 5. Backup and Restore Permissions

```bash
# Backup
ccjk permissions export backup-$(date +%Y%m%d).json

# Restore
ccjk permissions import backup-20240115.json
```

---

## ⚠️ Best Practices

### 1. Use Specific Patterns
❌ Bad: `*:*` (too broad)
✅ Good: `Provider(302ai):read` (specific)

### 2. Document Your Rules
```typescript
manager.addPermission({
  type: 'allow',
  pattern: 'Provider(302ai):*',
  scope: 'global',
  description: 'Allow 302ai for production use'  // ✅ Good
})
```

### 3. Regular Backups
```bash
# Create a cron job or scheduled task
ccjk permissions export ~/backups/permissions-$(date +%Y%m%d).json
```

### 4. Test Before Deploying
```bash
# Test permission before granting
ccjk permissions check "Provider(new-provider)"

# Grant if needed
ccjk permissions grant "Provider(new-provider)"

# Verify
ccjk permissions check "Provider(new-provider)"
```

### 5. Use Deny Sparingly
- Prefer explicit allow rules over deny rules
- Use deny only for security-critical restrictions

---

## 🐛 Troubleshooting

### Permission Not Working

```bash
# 1. Check if rule exists
ccjk permissions list

# 2. Test the pattern
ccjk permissions check "YourResource"

# 3. Check config file
cat ~/.ccjk/config.json

# 4. Verify pattern syntax
# Ensure format is: Resource:action or Resource(*):action
```

### Cannot Save Permissions

```bash
# Check file permissions
ls -la ~/.ccjk/config.json

# Fix permissions if needed
chmod 644 ~/.ccjk/config.json

# Ensure directory exists
mkdir -p ~/.ccjk
```

### Import Fails

```bash
# Validate JSON format
cat permissions.json | jq .

# Check file exists
ls -la permissions.json

# Try with absolute path
ccjk permissions import /full/path/to/permissions.json
```

---

## 📊 Examples by Resource Type

### Providers

```bash
# Allow specific provider
ccjk permissions grant "Provider(302ai)"

# Allow all providers
ccjk permissions grant "Provider(*)"

# Deny specific provider
manager.addPermission({
  type: 'deny',
  pattern: 'Provider(blocked-provider):*',
  scope: 'global'
})
```

### Models

```bash
# Allow reading any model
manager.addPermission({
  type: 'allow',
  pattern: 'Model(*):read',
  scope: 'global'
})

# Allow specific model
ccjk permissions grant "Model(claude-opus)"

# Deny expensive model
manager.addPermission({
  type: 'deny',
  pattern: 'Model(gpt-4):*',
  scope: 'global'
})
```

### Files

```bash
# Allow reading files in directory
manager.addPermission({
  type: 'allow',
  pattern: 'file:///home/user/documents/*:read',
  scope: 'project'
})

# Deny writing to system files
manager.addPermission({
  type: 'deny',
  pattern: 'file:///etc/*:write',
  scope: 'global'
})
```

### MCP Servers

```bash
# Allow MCP server
ccjk permissions grant "mcp://server-name"

# Allow all MCP servers
manager.addPermission({
  type: 'allow',
  pattern: 'mcp://*:*',
  scope: 'global'
})
```

### Tools

```bash
# Allow web search tool
ccjk permissions grant "Tool(web-search)"

# Deny dangerous tools
manager.addPermission({
  type: 'deny',
  pattern: 'Tool(file-delete):*',
  scope: 'global'
})
```

---

## 🔗 Related Commands

```bash
# System information
ccjk system info

# Configuration management
ccjk config get permissions
ccjk config set permissions.allow '["Provider(*)"]'

# Workspace management
ccjk workspace list
ccjk workspace switch <name>
```

---

## 📚 Additional Resources

- Full Documentation: `PERMISSION_SYSTEM_IMPLEMENTATION.md`
- Chinese Documentation: `PERMISSION_SYSTEM_IMPLEMENTATION_ZH.md`
- Test Examples: `src/core/permissions/__tests__/permission-manager.test.ts`
- Type Definitions: `src/core/permissions/types.ts`

---

## 💡 Tips & Tricks

### 1. Quick Permission Check
```bash
# Create an alias
alias pcheck='ccjk permissions check'

# Use it
pcheck "Provider(302ai)"
```

### 2. Batch Operations
```bash
# Grant multiple permissions
for resource in "Provider(302ai)" "Provider(openai)" "Model(*)"; do
  ccjk permissions grant "$resource"
done
```

### 3. Export for Documentation
```bash
# Export as JSON for documentation
ccjk permissions list --format json > docs/current-permissions.json
```

### 4. Audit Trail
```bash
# Keep a log of permission changes
echo "$(date): Granted Provider(302ai)" >> ~/.ccjk/permission-audit.log
ccjk permissions grant "Provider(302ai)"
```

### 5. Environment-Specific Permissions
```bash
# Development
ccjk permissions import permissions-dev.json

# Production
ccjk permissions import permissions-prod.json
```

---

**Need Help?**

Run `ccjk permissions help` for command-line help, or check the full documentation for detailed information.

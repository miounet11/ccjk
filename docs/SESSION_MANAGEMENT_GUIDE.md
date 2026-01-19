# Session Management Quick Guide

## Overview

CCJK's session management system allows you to save, organize, and resume your AI coding sessions with full conversation history and API provider configurations.

## Quick Start

### Create Your First Session

```bash
# Interactive creation (recommended for first time)
ccjk session create

# Quick creation with name
ccjk session create --name "my-project"

# With specific provider
ccjk session create --name "gpt-project" --provider openai
```

### List Your Sessions

```bash
ccjk session list
```

### Resume a Session

```bash
# By name (easiest)
ccjk --resume my-project

# By ID
ccjk --resume a1b2c3d4
```

## Common Commands

### Session Creation

```bash
# Interactive (asks for name, provider, etc.)
ccjk session create

# With all options
ccjk session create \
  --name "production-api" \
  --provider anthropic \
  --api-key "sk-ant-..."
```

### Session Management

```bash
# List all sessions
ccjk session list

# Rename a session
ccjk session rename old-name --name new-name

# Delete a session
ccjk session delete my-session

# Delete without confirmation
ccjk session delete my-session --force
```

### Session Information

```bash
# View session and cache status
ccjk session status

# View specific session details
ccjk session restore my-session
```

### Cleanup

```bash
# Interactive cleanup (select what to clean)
ccjk session cleanup

# Clean everything
ccjk session cleanup --all --force
```

## API Providers

Supported providers:

- **anthropic** - Claude models (default)
- **openai** - GPT models
- **azure** - Azure OpenAI
- **custom** - Custom API endpoints

### Provider Configuration

When creating a session, you can:

1. **Select a provider** - Choose from the list
2. **Skip provider** - Use default/environment settings
3. **Custom provider** - Enter custom API endpoint

Example with OpenAI:

```bash
ccjk session create \
  --name "gpt4-session" \
  --provider openai \
  --api-key "sk-..."
```

## Session Naming

### Best Practices

- Use descriptive names: `customer-api`, `data-pipeline`, `frontend-refactor`
- Include project context: `acme-backend`, `widget-ui`
- Use consistent naming: `project-feature-date`

### Examples

```bash
# Good names
ccjk session create --name "ecommerce-checkout"
ccjk session create --name "ml-model-training"
ccjk session create --name "api-v2-migration"

# Less helpful names
ccjk session create --name "test"
ccjk session create --name "session1"
```

## Resume Workflow

### By Name (Recommended)

```bash
# Create with name
ccjk session create --name "my-api"

# Resume later
ccjk --resume my-api
```

### By ID

```bash
# Get ID from list
ccjk session list

# Resume by ID
ccjk --resume a1b2c3d4
```

### Interactive Resume

```bash
# If you don't remember the name
ccjk session restore
# Then select from list
```

## Conversation History

Each session automatically tracks:

- All user messages
- All assistant responses
- Timestamps for each interaction
- Additional metadata

### Viewing History

History is preserved when you resume a session:

```bash
ccjk --resume my-project
# Previous conversation context is automatically loaded
```

### Exporting History

```bash
# Export session as Markdown
ccjk session export my-session

# Creates: my-session.md with full conversation
```

## Session Status

View comprehensive status information:

```bash
ccjk session status
```

Shows:

- Cache directory sizes
- Number of files
- Total sessions
- History entry counts
- Most recent session

## Advanced Usage

### Background Sessions

Run sessions in background mode:

```bash
ccjk --resume my-session --background
```

### Multiple Sessions

Work with multiple sessions for different projects:

```bash
# Frontend work
ccjk session create --name "frontend-ui"
ccjk --resume frontend-ui

# Backend work
ccjk session create --name "backend-api"
ccjk --resume backend-api

# Switch between them
ccjk --resume frontend-ui
ccjk --resume backend-api
```

### Session Organization

Organize sessions by project or feature:

```bash
# Project-based
ccjk session create --name "project-alpha-backend"
ccjk session create --name "project-alpha-frontend"
ccjk session create --name "project-beta-api"

# Feature-based
ccjk session create --name "auth-implementation"
ccjk session create --name "payment-integration"
ccjk session create --name "analytics-dashboard"
```

## Cleanup & Maintenance

### Regular Cleanup

Clean up old sessions and cache:

```bash
# Interactive cleanup
ccjk session cleanup

# Select what to clean:
# - Old sessions
# - Debug logs
# - File history
# - Shell snapshots
# - Paste cache
```

### Force Cleanup

Clean everything without prompts:

```bash
ccjk session cleanup --all --force
```

### Selective Cleanup

Delete specific sessions:

```bash
ccjk session delete old-session
ccjk session delete test-session --force
```

## Tips & Tricks

### 1. Name Sessions Immediately

```bash
# Do this
ccjk session create --name "descriptive-name"

# Instead of
ccjk session create
# (then forgetting which session is which)
```

### 2. Use Tab Completion

If your shell supports it, tab completion works with session names:

```bash
ccjk --resume my-<TAB>
# Completes to: ccjk --resume my-project
```

### 3. Regular Status Checks

Check status periodically to manage disk space:

```bash
ccjk session status
# Shows cache sizes
```

### 4. Export Important Sessions

Export sessions you want to keep long-term:

```bash
ccjk session export important-session
# Creates Markdown file for archival
```

### 5. Clean Up Test Sessions

Remove test sessions regularly:

```bash
ccjk session delete test-*
```

## Troubleshooting

### Session Not Found

```bash
# List all sessions to find the correct name/ID
ccjk session list

# Use exact name or ID
ccjk --resume exact-session-name
```

### Can't Resume Session

```bash
# Check if session exists
ccjk session list

# Try restoring instead
ccjk session restore session-name
```

### Too Many Sessions

```bash
# Clean up old sessions
ccjk session cleanup

# Or delete specific ones
ccjk session delete old-session-1
ccjk session delete old-session-2
```

### Disk Space Issues

```bash
# Check status
ccjk session status

# Clean up cache
ccjk session cleanup --all
```

## Examples

### Example 1: New Project Setup

```bash
# Start new project
ccjk session create --name "acme-website"

# Work on it
ccjk --resume acme-website
# ... do some coding ...

# Resume next day
ccjk --resume acme-website
# All context preserved!
```

### Example 2: Multiple Features

```bash
# Create sessions for different features
ccjk session create --name "feature-auth"
ccjk session create --name "feature-payments"
ccjk session create --name "feature-dashboard"

# Work on auth
ccjk --resume feature-auth
# ... implement authentication ...

# Switch to payments
ccjk --resume feature-payments
# ... implement payment flow ...

# Back to auth
ccjk --resume feature-auth
# Context automatically restored!
```

### Example 3: Different Providers

```bash
# Claude for general coding
ccjk session create --name "backend" --provider anthropic

# GPT-4 for specific task
ccjk session create --name "analysis" --provider openai

# Use appropriate session for each task
ccjk --resume backend    # Uses Claude
ccjk --resume analysis   # Uses GPT-4
```

### Example 4: Cleanup Workflow

```bash
# Check what's taking space
ccjk session status

# List all sessions
ccjk session list

# Delete old ones
ccjk session delete old-project-1
ccjk session delete test-session

# Clean cache
ccjk session cleanup --all
```

## Command Reference

### Session Commands

| Command | Description |
|---------|-------------|
| `ccjk session create` | Create new session |
| `ccjk session list` | List all sessions |
| `ccjk session restore [id]` | Restore a session |
| `ccjk session rename <id>` | Rename a session |
| `ccjk session delete <id>` | Delete a session |
| `ccjk session export [id]` | Export as Markdown |
| `ccjk session cleanup` | Clean up cache |
| `ccjk session status` | View status |

### Options

| Option | Description |
|--------|-------------|
| `--name, -n <name>` | Session name |
| `--provider, -p <provider>` | API provider |
| `--api-key, -k <key>` | API key |
| `--resume, -r <session>` | Resume session |
| `--force, -f` | Force without confirmation |
| `--all, -a` | Apply to all |
| `--background, -b` | Background mode |

## Best Practices

1. **Name your sessions** - Always use descriptive names
2. **Regular cleanup** - Clean up old sessions monthly
3. **Export important work** - Export sessions you want to keep
4. **Use appropriate providers** - Choose the right AI for the task
5. **Check status** - Monitor disk usage periodically
6. **Organize by project** - Use consistent naming schemes
7. **Delete test sessions** - Don't let test sessions accumulate
8. **Resume by name** - Easier than remembering IDs

## Getting Help

```bash
# General help
ccjk --help

# Session command help
ccjk session --help

# Specific action help
ccjk session create --help
```

## Next Steps

1. Create your first session: `ccjk session create --name "my-first-session"`
2. Do some work with CCJK
3. List your sessions: `ccjk session list`
4. Resume your session: `ccjk --resume my-first-session`
5. Check status: `ccjk session status`

---

**Need more help?** Check the full implementation documentation in `SESSION_MANAGEMENT_IMPLEMENTATION.md`

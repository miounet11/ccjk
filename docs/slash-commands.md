# CCJK Slash Commands

CCJK provides a comprehensive slash command system for quick access to Brain system features, context management, and system utilities.

## Overview

Slash commands are intercepted before the main CLI parser, allowing for instant execution without going through the full command parsing flow. They provide a fast, intuitive interface for common operations.

## Command Categories

### 🧠 Brain System

Commands related to the Brain orchestration system and health monitoring.

#### `/status` (alias: `/s`)

Show the Brain Dashboard with comprehensive health score and diagnostics.

```bash
ccjk /status
```

**Output:**
- Overall health score (0-100)
- Health grade (S/A/B/C/D/F)
- Installed MCP services
- Active workflows
- Configuration status
- Recommendations for improvement

#### `/health` (alias: `/h`)

Run a comprehensive health check on your CCJK installation.

```bash
ccjk /health
```

**Checks:**
- Configuration validity
- MCP service availability
- API connectivity
- Workflow integrity
- Permission settings
- Database health

#### `/tasks` (alias: `/t`, `/task`)

Open the task manager integrated with the Brain system.

```bash
ccjk /tasks
```

**Features:**
- View active tasks
- Task status tracking
- Brain orchestration status

### 📦 Context Management

Commands for managing compressed contexts and database operations.

#### `/search` (alias: `/find`, `/query`)

Search contexts using FTS5 full-text search.

```bash
ccjk /search "authentication logic"
ccjk /search error handling
```

**Features:**
- Full-text search across all contexts
- Relevance ranking
- Snippet preview
- Token count display
- Algorithm information

**Output:**
- Search results with rank scores
- Context metadata (tokens, compression ratio)
- Text snippets from matching contexts

#### `/compress` (alias: `/stats`, `/metrics`)

Show compression statistics and metrics.

```bash
ccjk /compress
```

**Displays:**
- Total compressions performed
- Tokens saved (overall and by period)
- Average compression ratio
- Average processing time
- Estimated cost savings
- Session statistics (24h)
- Weekly statistics
- Monthly statistics

#### `/optimize` (alias: `/vacuum`, `/cleanup`)

Run VACUUM and checkpoint operations on the context database.

```bash
ccjk /optimize
```

**Operations:**
- SQLite VACUUM (reclaim space)
- WAL checkpoint (flush to main DB)
- Index optimization
- Statistics update

**Benefits:**
- Reduced database size
- Improved query performance
- Better disk space utilization

### ⚙️ System Tools

General system utilities and configuration management.

#### `/backup` (alias: `/save`)

Create a timestamped backup of your configuration.

```bash
ccjk /backup
```

**Backs up:**
- `~/.claude/settings.json`
- `~/.claude/claude_desktop_config.json`
- MCP configurations

**Backup location:** `~/.claude/backup/`

#### `/help` (alias: `/?`, `/commands`)

Show all available CCJK slash commands with descriptions.

```bash
ccjk /help
ccjk /?
```

**Output:**
- Categorized command list
- Command aliases
- Bilingual descriptions (EN/ZH)
- Usage tips

## Usage Patterns

### Quick Health Check

```bash
# Morning routine
ccjk /health
ccjk /status
```

### Context Search Workflow

```bash
# Search for specific context
ccjk /search "API integration"

# View compression stats
ccjk /compress

# Optimize database
ccjk /optimize
```

### Backup Before Changes

```bash
# Create backup
ccjk /backup

# Make configuration changes
ccjk init --force

# Verify with status
ccjk /status
```

## Integration with Claude Code

CCJK slash commands complement Claude Code's built-in commands:

### CCJK Commands (via `ccjk` CLI)

- `/status` - Brain Dashboard
- `/health` - Health check
- `/search` - Context search
- `/compress` - Compression stats
- `/tasks` - Task manager
- `/backup` - Create backup
- `/optimize` - Database optimization
- `/help` - Show commands

### Claude Code Commands (within Claude session)

- `/commit` - Smart commit
- `/review` - Code review
- `/tdd` - Write tests
- `/workflow` - Plan feature
- `/debug` - Debug issues
- `/brainstorm` - Explore ideas

## Command Interceptor

Slash commands are intercepted at the CLI entry point before CAC parsing:

```typescript
// In cli-lazy.ts
const args = process.argv.slice(2)
if (args.length > 0 && args[0].startsWith('/')) {
  const { executeSlashCommand } = await import('./commands/slash-commands')
  const handled = await executeSlashCommand(args.join(' '))
  if (handled) {
    return // Exit early, command executed
  }
}
```

## Adding New Commands

To add a new slash command:

1. **Define the command** in `src/commands/slash-commands.ts`:

```typescript
{
  name: 'mycommand',
  aliases: ['mc'],
  description: 'My command description',
  descriptionZh: '我的命令描述',
  category: 'system',
  handler: async (args) => {
    // Command implementation
  },
}
```

2. **Add i18n strings** in `src/i18n/locales/{zh-CN,en}/common.json`:

```json
"slashCommands": {
  "commands": {
    "mycommand": "My command description"
  }
}
```

3. **Write tests** in `tests/commands/slash-commands.test.ts`:

```typescript
it('should include mycommand', () => {
  const commands = getSlashCommands()
  const commandNames = commands.map(cmd => cmd.name)
  expect(commandNames).toContain('mycommand')
})
```

4. **Update documentation** in this file.

## Error Handling

Slash commands have built-in error handling:

- **Unknown command:** Displays error message and suggests `/help`
- **Missing arguments:** Shows usage information
- **Execution errors:** Catches and displays error details
- **Graceful degradation:** Never blocks CLI startup

## Performance

- **Lazy loading:** Command handlers are loaded on-demand
- **Fast execution:** Direct routing without full CLI parsing
- **Minimal overhead:** <50ms for most commands
- **Database optimization:** Efficient SQLite queries with indexes

## Bilingual Support

All commands support both English and Chinese:

- Automatic language detection from `i18n.language`
- Bilingual help output
- Localized error messages
- Context-aware descriptions

## Future Enhancements

- [ ] Command history and autocomplete
- [ ] Interactive command builder
- [ ] Command chaining (e.g., `/search | /compress`)
- [ ] Custom user-defined commands
- [ ] Command output formatting options (JSON, table, etc.)
- [ ] Remote command execution via MCP

## See Also

- [Brain System Documentation](../src/brain/CLAUDE.md)
- [Context Compression](../src/context/CLAUDE.md)
- [Health Monitoring](../src/health/CLAUDE.md)
- [CLI Architecture](../src/cli-lazy.ts)

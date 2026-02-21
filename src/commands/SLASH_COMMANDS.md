# Slash Commands System

**Module**: `src/commands/slash-commands.ts`
**Tests**: `tests/commands/slash-commands.test.ts`
**Documentation**: `docs/slash-commands.md`

## Overview

The slash commands system provides a fast, intuitive interface for CCJK operations. Commands are intercepted at the CLI entry point before CAC parsing, allowing for instant execution.

## Architecture

### Command Interceptor

Location: `src/cli-lazy.ts` in `runLazyCli()`

```typescript
// Check for slash commands before parsing CLI
const args = process.argv.slice(2)
if (args.length > 0 && args[0].startsWith('/')) {
  spinner?.stop()
  const { executeSlashCommand } = await import('./commands/slash-commands')
  const slashHandled = await executeSlashCommand(args.join(' '))
  if (slashHandled) {
    return // Exit early, command executed
  }
}
```

### Command Definition

Each command is defined with:

```typescript
interface SlashCommand {
  name: string              // Primary command name
  aliases?: string[]        // Alternative names
  description: string       // English description
  descriptionZh: string     // Chinese description
  category: 'brain' | 'context' | 'system'
  handler: (args: string[]) => Promise<void>
}
```

### Command Categories

1. **Brain System** (`brain`)
   - Commands related to Brain orchestration and health monitoring
   - Examples: `/status`, `/health`, `/tasks`

2. **Context Management** (`context`)
   - Commands for context compression and database operations
   - Examples: `/search`, `/compress`, `/optimize`

3. **System Tools** (`system`)
   - General utilities and configuration management
   - Examples: `/backup`, `/help`

## Command Registry

### Brain Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/status` | `/s` | Show Brain Dashboard with health score |
| `/health` | `/h` | Run comprehensive health check |
| `/tasks` | `/t`, `/task` | Open task manager |

### Context Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/search` | `/find`, `/query` | Search contexts using FTS5 |
| `/compress` | `/stats`, `/metrics` | Show compression statistics |
| `/optimize` | `/vacuum`, `/cleanup` | Run VACUUM on database |

### System Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/backup` | `/save` | Create configuration backup |
| `/help` | `/?`, `/commands` | Show all commands |

## Implementation Details

### Lazy Loading

All command handlers use dynamic imports for optimal startup performance:

```typescript
handler: async () => {
  const { statusCommand } = await import('./status')
  await statusCommand({ compact: false })
}
```

### Error Handling

- Unknown commands display helpful error messages
- Missing arguments show usage information
- Execution errors are caught and displayed
- Never blocks CLI startup

### Bilingual Support

Commands automatically detect language from `i18n.language`:

```typescript
const isZh = i18n.language === 'zh-CN'
const desc = isZh ? cmd.descriptionZh : cmd.description
```

## Integration Points

### Status Command

```typescript
import { statusCommand } from './status'
await statusCommand({ compact: false })
```

### Health Check

```typescript
import { runHealthCheck } from '../health/index'
const report = await runHealthCheck()
// Access: report.totalScore, report.grade, report.recommendations
```

### Context Persistence

```typescript
import { getContextPersistence } from '../context/persistence'
const persistence = getContextPersistence()

// Search
const results = await persistence.searchContexts(query, { limit: 10 })

// Stats
const stats = persistence.getCompressionMetricsStats()

// Optimize
persistence.vacuum()
```

### Configuration Backup

```typescript
import { backupExistingConfig } from '../utils/config'
const backupPath = backupExistingConfig()
```

## Testing

### Test Coverage

- ✅ Command parsing (with/without arguments)
- ✅ Command detection (slash vs non-slash)
- ✅ Command registry (all commands present)
- ✅ Command properties (required fields)
- ✅ Command aliases (correct mapping)
- ✅ Command categories (proper grouping)
- ✅ Error handling (unknown commands)

### Running Tests

```bash
pnpm vitest tests/commands/slash-commands.test.ts
```

## Adding New Commands

1. **Add to command registry** in `getSlashCommands()`:

```typescript
{
  name: 'mycommand',
  aliases: ['mc'],
  description: 'My command description',
  descriptionZh: '我的命令描述',
  category: 'system',
  handler: async (args) => {
    // Implementation
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

4. **Update documentation** in `docs/slash-commands.md`

## Performance Characteristics

- **Startup overhead**: <10ms (command registry initialization)
- **Execution time**: Varies by command
  - `/help`: <5ms (display only)
  - `/status`: ~50-100ms (health check + display)
  - `/search`: ~10-50ms (depends on query complexity)
  - `/compress`: ~5-10ms (stats calculation)
  - `/optimize`: ~100-500ms (VACUUM operation)

## Future Enhancements

- [ ] Command history and autocomplete
- [ ] Interactive command builder
- [ ] Command chaining (e.g., `/search | /compress`)
- [ ] Custom user-defined commands
- [ ] Output formatting options (JSON, table, etc.)
- [ ] Remote command execution via MCP
- [ ] Command aliases in user config
- [ ] Command plugins system

## Related Files

- `src/cli-lazy.ts` - CLI entry point with interceptor
- `src/commands/status.ts` - Status dashboard
- `src/health/index.ts` - Health check system
- `src/context/persistence.ts` - Context database
- `src/context/metrics-display.ts` - Metrics formatting
- `src/utils/config.ts` - Configuration management
- `src/i18n/locales/*/common.json` - Translations

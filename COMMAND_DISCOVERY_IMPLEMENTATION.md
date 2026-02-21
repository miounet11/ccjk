# Command Discovery Banner Implementation

## Overview

Enhanced the CCJK CLI startup experience with a bilingual command discovery banner that displays available CCJK and Claude Code commands on first run or with `--help` flag.

## Implementation Details

### 1. I18n Strings Added

**Files Modified:**
- `/Users/lu/ccjk-public/src/i18n/locales/zh-CN/cli.json`
- `/Users/lu/ccjk-public/src/i18n/locales/en/cli.json`

**New Translation Keys:**
```json
{
  "commandDiscovery.title": "🧠 CCJK Commands (ccjk 命令)",
  "commandDiscovery.claudeCodeTitle": "🤖 Claude Code Commands",
  "commandDiscovery.status": "Brain Dashboard",
  "commandDiscovery.health": "Health Check",
  "commandDiscovery.search": "Search Contexts",
  "commandDiscovery.compress": "Compression Stats",
  "commandDiscovery.tasks": "Task Manager",
  "commandDiscovery.backup": "Create Backup",
  "commandDiscovery.optimize": "Optimize DB",
  "commandDiscovery.help": "Show all commands",
  "commandDiscovery.clear": "Clear conversation",
  "commandDiscovery.reset": "Reset session",
  "commandDiscovery.footer": "Type 'ccjk --help' for full command list"
}
```

### 2. Banner Function Implementation

**File:** `/Users/lu/ccjk-public/src/utils/banner.ts`

**New Function:** `displayCommandDiscovery()`

**Features:**
- Detects locale from `i18n.language`
- Displays Chinese descriptions with English translations in gray for zh-CN locale
- Displays English-only descriptions for en locale
- Shows two sections:
  - 🧠 CCJK Commands: /status, /health, /search, /compress, /tasks, /backup, /optimize
  - 🤖 Claude Code Commands: /help, /clear, /reset
- Includes footer with help command reference

### 3. CLI Integration

**File:** `/Users/lu/ccjk-public/src/cli-lazy.ts`

**Changes:**

1. **Added `noBanner` option to `CliOptions` interface:**
```typescript
export interface CliOptions {
  // ... existing options
  noBanner?: boolean
  // ...
}
```

2. **Added `--no-banner` flag to all commands:**
```typescript
command.option('--no-banner', 'Skip command discovery banner')
```

3. **Created `showCommandDiscoveryBanner()` function:**
- Checks for `--no-banner` flag
- Skips if running a specific command (not interactive menu)
- Shows banner on first run (tracked via `~/.ccjk/.banner-shown` marker file)
- Shows banner when `--help` or `-h` flag is present
- Initializes i18n if needed
- Creates marker file after first display

4. **Integrated into `runLazyCli()` flow:**
```typescript
// 📋 Show command discovery banner on first run or with --help
await showCommandDiscoveryBanner()
```

### 4. Test Coverage

**File:** `/Users/lu/ccjk-public/tests/utils/banner.test.ts`

**Test Cases:**
1. Should display command discovery banner without errors
2. Should display CCJK commands section
3. Should display Claude Code commands section
4. Should display bilingual content for Chinese locale
5. Should display footer with help command

**Test Results:** ✅ All 5 tests passing

## Usage

### Display Banner

```bash
# First run (automatic)
ccjk

# With --help flag
ccjk --help

# Force display on subsequent runs
rm ~/.ccjk/.banner-shown && ccjk
```

### Skip Banner

```bash
# Using --no-banner flag
ccjk --no-banner

# Running specific commands (automatic skip)
ccjk init
ccjk status
ccjk mcp install
```

## Output Examples

### English Output

```
🧠 CCJK Commands (ccjk 命令)
────────────────────────────────────────────────────────────
  /status      - Brain Dashboard
  /health      - Health Check
  /search      - Search Contexts
  /compress    - Compression Stats
  /tasks       - Task Manager
  /backup      - Create Backup
  /optimize    - Optimize DB

🤖 Claude Code Commands
────────────────────────────────────────────────────────────
  /help        - Show all commands
  /clear       - Clear conversation
  /reset       - Reset session

────────────────────────────────────────────────────────────
  Type 'ccjk --help' for full command list
```

### Chinese Output (Bilingual)

```
🧠 CCJK 命令 (ccjk 命令)
────────────────────────────────────────────────────────────
  /status      - 大脑仪表盘 (Brain Dashboard)
  /health      - 健康检查 (Health Check)
  /search      - 搜索上下文 (Search Contexts)
  /compress    - 压缩统计 (Compression Stats)
  /tasks       - 任务管理 (Task Manager)
  /backup      - 创建备份 (Create Backup)
  /optimize    - 优化数据库 (Optimize DB)

🤖 Claude Code 命令
────────────────────────────────────────────────────────────
  /help        - 显示所有命令 (Show all commands)
  /clear       - 清除对话 (Clear conversation)
  /reset       - 重置会话 (Reset session)

────────────────────────────────────────────────────────────
  输入 'ccjk --help' 查看完整命令列表
```

## Technical Details

### First Run Detection

- Marker file: `~/.ccjk/.banner-shown`
- Contains ISO timestamp of first display
- Created automatically after first banner display
- Can be deleted to reset first-run behavior

### Locale Detection

- Uses `i18n.language` from initialized i18n instance
- Falls back to `CCJK_LANG` environment variable if i18n not initialized
- Supports `zh-CN` and `en` locales

### Error Handling

- All banner-related errors are silently caught
- Never blocks CLI startup
- Gracefully degrades if i18n fails to initialize
- Marker file creation errors are ignored

## Files Modified

1. `/Users/lu/ccjk-public/src/i18n/locales/zh-CN/cli.json` - Added Chinese translations
2. `/Users/lu/ccjk-public/src/i18n/locales/en/cli.json` - Added English translations
3. `/Users/lu/ccjk-public/src/utils/banner.ts` - Added `displayCommandDiscovery()` function
4. `/Users/lu/ccjk-public/src/cli-lazy.ts` - Integrated banner into CLI flow
5. `/Users/lu/ccjk-public/tests/utils/banner.test.ts` - Added comprehensive tests

## Build Verification

```bash
# TypeScript compilation
pnpm typecheck  # ✅ No errors in banner-related files

# Build
pnpm build      # ✅ Success (dist size: 2.8 MB)

# Tests
pnpm vitest tests/utils/banner.test.ts --run  # ✅ 5/5 tests passing
```

## Future Enhancements

1. Add more CCJK commands as they become available
2. Support additional locales (ja, ko, etc.)
3. Add command categories/grouping
4. Include command aliases in display
5. Add interactive command selection from banner
6. Support custom command lists via config file

## Notes

- Banner only shows on first run or with `--help` to avoid being intrusive
- `--no-banner` flag provides explicit opt-out
- Bilingual display helps Chinese users learn English command names
- Follows CCJK's "Anti-Aggression Principle" - no unsolicited output
- Integrates seamlessly with existing CLI architecture

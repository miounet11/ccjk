# Claude Code Monitor Integration Plan

## 📋 Project Overview

**Project**: [claude-code-monitor](https://github.com/onikan27/claude-code-monitor)
**Version**: 1.0.3
**License**: MIT
**Platform**: macOS only (uses AppleScript for terminal focus)

### Core Features

- 🔌 **Serverless**: File-based session state management (no API server)
- 🔄 **Real-time**: Auto-updates on file changes
- 🎯 **Tab Focus**: Switch to terminal tab of selected session (iTerm2, Terminal.app, Ghostty)
- 🎨 **Simple UI**: Displays status and directory
- ⚡ **Easy Setup**: One command `ccm` for automatic setup

### Technical Architecture

```
claude-code-monitor/
├── src/
│   ├── bin/           # CLI entry point
│   ├── components/    # TUI components
│   ├── hook/          # Hook management
│   ├── hooks/         # Hook scripts
│   ├── setup/         # Setup utilities
│   ├── store/         # Session data storage
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── Data Storage: ~/.claude-monitor/sessions.json
└── Hook Integration: ~/.claude/settings.json
```

### How It Works

1. **Hook Registration**: Modifies `~/.claude/settings.json` to register hooks
2. **Session Tracking**: Stores session data (session_id, cwd, tty, status, updated_at)
3. **Real-time Monitoring**: Watches `sessions.json` for changes
4. **Terminal Focus**: Uses AppleScript to switch to specific terminal tabs via TTY

## 🎯 Integration Strategy for CCJK

### Option 1: Dependency Integration (Recommended)

**Approach**: Add claude-code-monitor as a dependency and integrate into CCJK's workflow

**Pros**:
- ✅ Seamless user experience
- ✅ Single command to enable monitoring
- ✅ Consistent with CCJK's "zero-friction" philosophy
- ✅ Can be part of init workflow
- ✅ Unified configuration management

**Cons**:
- ⚠️ macOS only (need to handle cross-platform gracefully)
- ⚠️ Adds dependency size
- ⚠️ Need to maintain compatibility with upstream updates

**Implementation**:

```typescript
// src/utils/ccm/
├── installer.ts       # Install and setup CCM
├── config.ts          # CCM configuration management
├── commands.ts        # CCM command wrappers
└── types.ts           # CCM type definitions
```

### Option 2: Fork and Customize

**Approach**: Fork the repository and customize for CCJK ecosystem

**Pros**:
- ✅ Full control over features
- ✅ Can add CCJK-specific enhancements
- ✅ Can extend to support Codex
- ✅ Can add cross-platform support

**Cons**:
- ❌ Maintenance burden
- ❌ Need to sync with upstream
- ❌ Duplicates effort

**Not Recommended**: Goes against "Twin Dragons" philosophy of enhancing, not replacing

### Option 3: Standalone Tool with Integration Points

**Approach**: Keep as separate tool, add CCJK integration commands

**Pros**:
- ✅ Minimal maintenance
- ✅ Users can choose to install or not
- ✅ Clear separation of concerns

**Cons**:
- ⚠️ Extra installation step
- ⚠️ Less seamless experience
- ⚠️ Doesn't align with "zero-friction" philosophy

## 🚀 Recommended Implementation: Option 1 (Enhanced)

### Phase 1: Basic Integration

#### 1.1 Add CCM Module Structure

```typescript
// src/utils/ccm/index.ts
export * from './installer';
export * from './commands';
export * from './config';
export * from './types';

// src/utils/ccm/installer.ts
export async function installCCM(): Promise<void> {
  // Check if already installed
  // Install via npm if not present
  // Run ccm setup
}

export async function checkCCMInstalled(): Promise<boolean> {
  // Check if ccm command is available
}

// src/utils/ccm/commands.ts
export async function launchCCM(): Promise<void> {
  // Launch ccm watch in new terminal window
}

export async function setupCCMHooks(): Promise<void> {
  // Run ccm setup
}

export async function clearCCMSessions(): Promise<void> {
  // Run ccm clear
}

// src/utils/ccm/config.ts
export async function isCCMConfigured(): Promise<boolean> {
  // Check if hooks are configured in ~/.claude/settings.json
}

export async function getCCMSessions(): Promise<CCMSession[]> {
  // Read ~/.claude-monitor/sessions.json
}
```

#### 1.2 Add to Init Command

```typescript
// src/commands/init.ts
async function initCCM(options: InitOptions): Promise<void> {
  if (process.platform !== 'darwin') {
    console.log(i18n.t('ccm.platformWarning')); // macOS only warning
    return;
  }

  const shouldInstall = await prompts({
    type: 'confirm',
    name: 'installCCM',
    message: i18n.t('ccm.installPrompt'),
    initial: true,
  });

  if (shouldInstall.installCCM) {
    await installCCM();
    console.log(i18n.t('ccm.installSuccess'));
  }
}
```

#### 1.3 Add Menu Command

```typescript
// src/commands/menu.ts
const menuOptions = [
  // ... existing options
  {
    title: i18n.t('menu.ccm'),
    description: i18n.t('menu.ccmDesc'),
    value: 'ccm',
    disabled: process.platform !== 'darwin',
  },
];

async function handleCCMMenu(): Promise<void> {
  const action = await prompts({
    type: 'select',
    name: 'action',
    message: i18n.t('ccm.selectAction'),
    choices: [
      { title: i18n.t('ccm.launch'), value: 'launch' },
      { title: i18n.t('ccm.setup'), value: 'setup' },
      { title: i18n.t('ccm.clear'), value: 'clear' },
      { title: i18n.t('ccm.status'), value: 'status' },
    ],
  });

  switch (action.action) {
    case 'launch':
      await launchCCM();
      break;
    case 'setup':
      await setupCCMHooks();
      break;
    case 'clear':
      await clearCCMSessions();
      break;
    case 'status':
      await showCCMStatus();
      break;
  }
}
```

#### 1.4 Add Direct Command

```typescript
// src/commands/ccm.ts
import { cac } from 'cac';
import { launchCCM, setupCCMHooks, clearCCMSessions } from '../utils/ccm';

export function registerCCMCommand(cli: ReturnType<typeof cac>): void {
  cli
    .command('ccm [action]', 'Manage Claude Code Monitor')
    .option('--lang <lang>', 'Language (en|zh-CN)')
    .action(async (action: string | undefined, options) => {
      if (process.platform !== 'darwin') {
        console.error(i18n.t('ccm.macOSOnly'));
        process.exit(1);
      }

      switch (action) {
        case 'launch':
        case 'watch':
          await launchCCM();
          break;
        case 'setup':
          await setupCCMHooks();
          break;
        case 'clear':
          await clearCCMSessions();
          break;
        default:
          // Default: launch if configured, setup if not
          const isConfigured = await isCCMConfigured();
          if (isConfigured) {
            await launchCCM();
          } else {
            await setupCCMHooks();
            await launchCCM();
          }
      }
    });
}
```

### Phase 2: Enhanced Features

#### 2.1 Auto-Launch on Init

```typescript
// Add option to auto-launch CCM after init
async function postInitActions(options: InitOptions): Promise<void> {
  if (options.launchCCM && process.platform === 'darwin') {
    console.log(i18n.t('ccm.launching'));
    await launchCCM();
  }
}
```

#### 2.2 Session Status in Menu

```typescript
// Show active sessions in main menu
async function showMainMenu(): Promise<void> {
  if (process.platform === 'darwin') {
    const sessions = await getCCMSessions();
    if (sessions.length > 0) {
      console.log(i18n.t('ccm.activeSessions', { count: sessions.length }));
    }
  }
  // ... rest of menu
}
```

#### 2.3 Integration with Check-Updates

```typescript
// src/commands/check-updates.ts
async function checkCCMUpdate(): Promise<void> {
  const currentVersion = await getCCMVersion();
  const latestVersion = await getLatestNpmVersion('claude-code-monitor');

  if (semver.gt(latestVersion, currentVersion)) {
    console.log(i18n.t('ccm.updateAvailable', { currentVersion, latestVersion }));
    // Offer to update
  }
}
```

### Phase 3: Advanced Integration

#### 3.1 Codex Support (Future)

```typescript
// Extend CCM to support Codex sessions
// This would require forking or contributing to upstream
```

#### 3.2 Cross-Platform Support (Future)

```typescript
// Add Linux/Windows support with alternative focus mechanisms
// - Linux: wmctrl, xdotool
// - Windows: PowerShell window management
```

#### 3.3 Enhanced TUI

```typescript
// Add CCJK branding to CCM TUI
// Show additional context (API provider, model, etc.)
```

## 📦 Package.json Changes

```json
{
  "dependencies": {
    "claude-code-monitor": "^1.0.3"
  },
  "optionalDependencies": {
    "claude-code-monitor": "^1.0.3"
  }
}
```

**Note**: Use `optionalDependencies` to prevent installation failures on non-macOS platforms.

## 🌍 I18n Additions

```json
// locales/en/ccm.json
{
  "platformWarning": "⚠️  Claude Code Monitor is macOS only. Skipping installation.",
  "macOSOnly": "❌ Claude Code Monitor requires macOS",
  "installPrompt": "Install Claude Code Monitor for real-time session monitoring?",
  "installSuccess": "✅ Claude Code Monitor installed successfully",
  "launching": "🚀 Launching Claude Code Monitor...",
  "selectAction": "Select CCM action:",
  "launch": "Launch Monitor",
  "setup": "Setup Hooks",
  "clear": "Clear Sessions",
  "status": "Show Status",
  "activeSessions": "📊 Active Sessions: {count}",
  "updateAvailable": "🔄 CCM update available: {currentVersion} → {latestVersion}"
}

// locales/zh-CN/ccm.json
{
  "platformWarning": "⚠️  Claude Code Monitor 仅支持 macOS。跳过安装。",
  "macOSOnly": "❌ Claude Code Monitor 需要 macOS 系统",
  "installPrompt": "安装 Claude Code Monitor 以实时监控会话？",
  "installSuccess": "✅ Claude Code Monitor 安装成功",
  "launching": "🚀 正在启动 Claude Code Monitor...",
  "selectAction": "选择 CCM 操作：",
  "launch": "启动监控器",
  "setup": "配置钩子",
  "clear": "清除会话",
  "status": "显示状态",
  "activeSessions": "📊 活跃会话：{count}",
  "updateAvailable": "🔄 CCM 有可用更新：{currentVersion} → {latestVersion}"
}
```

## 🧪 Testing Strategy

```typescript
// tests/utils/ccm/installer.test.ts
describe('CCM Installer', () => {
  it('should detect macOS platform', () => {});
  it('should check if CCM is installed', () => {});
  it('should install CCM via npm', () => {});
  it('should skip installation on non-macOS', () => {});
});

// tests/utils/ccm/commands.test.ts
describe('CCM Commands', () => {
  it('should launch CCM watch', () => {});
  it('should setup CCM hooks', () => {});
  it('should clear CCM sessions', () => {});
});

// tests/utils/ccm/config.test.ts
describe('CCM Config', () => {
  it('should check if CCM is configured', () => {});
  it('should read CCM sessions', () => {});
  it('should parse session data', () => {});
});
```

## 📝 Documentation Updates

### README.md

```markdown
## 🖥️ Claude Code Monitor Integration

CCJK integrates [Claude Code Monitor](https://github.com/onikan27/claude-code-monitor) for real-time session monitoring (macOS only).

### Features

- 🔄 Real-time session status tracking
- 🎯 Quick terminal tab switching
- 📊 Multi-session overview
- ⚡ One-click launch

### Usage

```bash
# Install and launch during init
npx ccjk i

# Launch monitor
npx ccjk ccm

# Manage via menu
npx ccjk
# Select "Claude Code Monitor" option
```

### Requirements

- macOS (uses AppleScript for terminal focus)
- iTerm2, Terminal.app, or Ghostty
```

## 🎯 Implementation Timeline

### Week 1: Core Integration
- [ ] Add CCM module structure
- [ ] Implement installer
- [ ] Add to init command
- [ ] Add i18n translations

### Week 2: Menu & Commands
- [ ] Add menu integration
- [ ] Add direct command
- [ ] Add check-updates integration
- [ ] Write tests

### Week 3: Polish & Documentation
- [ ] Update documentation
- [ ] Add examples
- [ ] Test on different terminals
- [ ] Release

## 🤔 Open Questions

1. **Installation Method**: Should we use `npm install -g` or `npx`?
   - **Recommendation**: Use `npm install -g` for better performance (CCM is designed for continuous use)

2. **Auto-Launch**: Should we auto-launch CCM after init?
   - **Recommendation**: Ask user during init, default to `true` on macOS

3. **Fallback**: What to show on non-macOS platforms?
   - **Recommendation**: Show informative message, suggest alternatives (manual monitoring)

4. **Fork vs Dependency**: Should we fork for customization?
   - **Recommendation**: Start with dependency, fork only if needed for critical features

5. **Codex Support**: Should we extend CCM to support Codex?
   - **Recommendation**: Phase 3 feature, contribute to upstream if possible

## 🔗 Related Links

- [claude-code-monitor GitHub](https://github.com/onikan27/claude-code-monitor)
- [claude-code-monitor npm](https://www.npmjs.com/package/claude-code-monitor)
- [CCJK Twin Dragons Philosophy](../CLAUDE.md#-twin-dragons-philosophy)

## 📊 Success Metrics

- ✅ Zero-friction installation (< 30 seconds)
- ✅ Works on all supported macOS terminals
- ✅ Graceful degradation on non-macOS
- ✅ < 5MB additional package size
- ✅ 80%+ test coverage for CCM module
- ✅ Positive user feedback on monitoring experience

---

**Status**: 📝 Planning Phase
**Priority**: 🟡 Medium (Nice-to-have enhancement)
**Effort**: 🔵 Medium (1-2 weeks)
**Impact**: 🟢 High (Significantly improves developer experience)

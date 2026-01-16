# Zero-Config Activation Module

**Purpose**: Automatic Superpowers activation on first CCJK run, providing zero-configuration experience for users.

## Overview

The Zero-Config Activation module implements silent installation and activation of Superpowers plugin with core skills. It leverages Claude 2.1.0's skill hot-reload feature to dynamically load skills without requiring restart or manual intervention.

## Architecture

```
zero-config/
├── index.ts           # Module exports
├── types.ts           # TypeScript type definitions
├── activator.ts       # Core activation logic
├── skill-loader.ts    # Skill hot-reload management
├── auto-install.ts    # Silent installation logic
└── README.md          # This file
```

## Core Concepts

### 1. Silent Installation

The module performs installation without user interaction:
- No prompts or confirmations
- Minimal console output
- Fast execution (< 10 seconds)
- Graceful failure handling

### 2. Hot-Reload Support

Leverages Claude 2.1.0's automatic skill detection:
- Skills are detected on next interaction
- No restart required
- Dynamic skill loading
- Seamless user experience

### 3. Activation State Tracking

Maintains activation state to avoid redundant operations:
- Stored in `~/.claude/plugins/superpowers/.activation-state.json`
- Tracks installed skills
- Records last activation timestamp
- Enables smart reactivation

## Core Skills

The following skills are automatically installed:

| Skill | Purpose | Priority |
|-------|---------|----------|
| **agent-browser** | Zero-config browser automation | High |
| **tdd** | Test-driven development workflow | High |
| **debugging** | Systematic debugging approach | High |
| **code-review** | Code review workflow | Medium |
| **git-worktrees** | Git worktree management | Medium |

## API Reference

### Activator (`activator.ts`)

#### `checkActivationStatus(): ActivationStatus`

Check current activation status without performing any actions.

**Returns**: Current activation status including installation state and loaded skills.

**Example**:
```typescript
import { checkActivationStatus } from './zero-config'

const status = checkActivationStatus()
if (status.needsActivation) {
  console.log('Activation needed')
}
```

#### `activateSuperpowers(lang?: SupportedLang): Promise<ActivationStatus>`

Perform activation if needed. This is the main entry point for zero-config activation.

**Parameters**:
- `lang` - Language for installation messages (default: 'zh-CN')

**Returns**: Activation status after completion

**Example**:
```typescript
import { activateSuperpowers } from './zero-config'

const status = await activateSuperpowers('zh-CN')
console.log(`Loaded ${status.loadedSkills.length} skills`)
```

#### `forceReactivation(lang?: SupportedLang): Promise<ActivationStatus>`

Force reactivation by clearing state and reinstalling. Useful for updates or recovery.

**Parameters**:
- `lang` - Language for installation messages

**Returns**: Activation status after reactivation

### Skill Loader (`skill-loader.ts`)

#### `loadSkill(skillName: string): Promise<SkillLoadResult>`

Load a single skill using hot-reload.

**Parameters**:
- `skillName` - Name of the skill to load

**Returns**: Load result with success status

#### `loadCoreSkills(lang?: SupportedLang): Promise<SkillLoadResult[]>`

Load all core skills.

**Parameters**:
- `lang` - Language for error messages

**Returns**: Array of load results for each core skill

#### `getCoreSkillsStatus(): Record<CoreSkill, boolean>`

Get installation status of all core skills.

**Returns**: Object mapping skill names to installation status

#### `areAllCoreSkillsInstalled(): boolean`

Check if all core skills are installed.

**Returns**: True if all core skills are present

### Auto-Install (`auto-install.ts`)

#### `autoInstallSuperpowers(lang?: SupportedLang): Promise<boolean>`

Perform silent installation of Superpowers.

**Parameters**:
- `lang` - Language for installation (default: 'zh-CN')

**Returns**: True if installation succeeded or already installed

#### `needsAutoInstall(): boolean`

Check if auto-installation is needed.

**Returns**: True if Superpowers needs to be installed

#### `getInstallationStatus(): InstallationStatus`

Get detailed installation status.

**Returns**: Object with installation details and missing skills

#### `reinstallForMissingSkills(lang?: SupportedLang): Promise<boolean>`

Reinstall to get missing skills.

**Parameters**:
- `lang` - Language for installation

**Returns**: True if reinstallation succeeded

## Usage Examples

### Basic Activation

```typescript
import { activateSuperpowers } from './utils/zero-config'

// In your CLI entry point
async function main() {
  // Activate Superpowers silently on first run
  await activateSuperpowers('zh-CN')
  
  // Continue with normal CLI flow
  // ...
}
```

### Check Before Activation

```typescript
import { checkActivationStatus, activateSuperpowers } from './utils/zero-config'

const status = checkActivationStatus()

if (status.needsActivation) {
  console.log('First run detected, activating Superpowers...')
  await activateSuperpowers('zh-CN')
} else {
  console.log(`Already activated with ${status.loadedSkills.length} skills`)
}
```

### Handle Missing Skills

```typescript
import { getInstallationStatus, reinstallForMissingSkills } from './utils/zero-config'

const status = getInstallationStatus()

if (status.missingSkills.length > 0) {
  console.log(`Missing skills: ${status.missingSkills.join(', ')}`)
  await reinstallForMissingSkills('zh-CN')
}
```

### Force Update

```typescript
import { forceReactivation } from './utils/zero-config'

// Force reactivation (useful for updates)
await forceReactivation('zh-CN')
```

## Integration with CCJK

### CLI Entry Point Integration

Add to `src/index.ts`:

```typescript
import { activateSuperpowers } from './utils/zero-config'

async function main() {
  // Silent activation on first run
  await activateSuperpowers('zh-CN')
  
  // Continue with CLI
  // ...
}
```

### Menu Integration

Add to interactive menu:

```typescript
import { checkActivationStatus } from './utils/zero-config'

const status = checkActivationStatus()
if (!status.coreSkillsLoaded) {
  console.log('⚠️  Some Superpowers skills are not loaded')
  console.log('   Run activation to enable all features')
}
```

## Testing

Comprehensive test suite in `tests/unit/zero-config/`:

- `activator.test.ts` - Activation logic tests
- `skill-loader.test.ts` - Skill loading tests
- `auto-install.test.ts` - Installation tests
- `integration.test.ts` - End-to-end flow tests

Run tests:
```bash
pnpm vitest zero-config
```

## Error Handling

The module implements graceful error handling:

1. **Installation Failures**: Returns false, doesn't throw
2. **Missing Skills**: Loads available skills, reports missing
3. **Corrupted State**: Falls back to safe defaults
4. **Network Errors**: Silent fail with optional DEBUG logging

Enable debug logging:
```bash
DEBUG=1 npx ccjk
```

## Performance

- **First Run**: ~10 seconds (git clone + skill detection)
- **Subsequent Runs**: < 100ms (state check only)
- **Memory**: < 5MB overhead
- **Disk**: ~50MB (Superpowers repository)

## Future Enhancements

- [ ] Skill update detection and auto-update
- [ ] Custom skill selection during activation
- [ ] Cloud sync integration for skill preferences
- [ ] Activation analytics and telemetry
- [ ] Skill dependency resolution
- [ ] Parallel skill loading for faster activation

## Related Documentation

- [Superpowers Installer](../superpowers/installer.ts)
- [CCJK Main Documentation](../../../CLAUDE.md)
- [Testing Guide](../../../tests/CLAUDE.md)

# Skills V3 - Unified Skills System

**Last Updated**: 2026-01-25

A unified skills system that consolidates V1 (CcjkSkill) and V2 (CognitiveProtocol) implementations into a single, coherent system with enhanced features for hot-reload, dependency management, and migration.

## Architecture Overview

```
src/skills-v3/
├── index.ts           # Module exports
├── types.ts           # Type definitions
├── parser.ts          # SKILL.md/JSON parser
├── skill-registry.ts  # Skill registration & lookup
├── skill-loader.ts    # Directory scanning & loading
├── migrator.ts        # V1/V2 to V3 migration
├── hot-reload.ts      # Unified hot-reload system
└── skill-manager.ts   # Main coordinator
```

## Key Features

### 1. Unified Skill Format (V3)

```typescript
interface SkillV3 {
  id: string
  version: string
  metadata: SkillV3Metadata
  triggers: string[]
  template: string
  config?: SkillV3Config
  dependencies?: string[]
}
```

### 2. Hot Reload System

- **Single chokidar instance** for all skill directories
- **Debounced event handling** (300ms default)
- **File locking** to prevent race conditions
- **Memory leak protection**
- **Automatic registration/unregistration**

### 3. Migration Support

- Automatic detection of V1/V2 formats
- One-click migration to V3
- Backup creation before migration
- Detailed migration reports

### 4. Dependency Management

- Topological sorting for load order
- Circular dependency detection
- Missing dependency reporting
- Dependent skill tracking

### 5. Conflict Detection

- Trigger conflict detection
- ID conflict detection
- Dependency conflict detection
- Resolution suggestions

## Usage Examples

### Basic Usage

```typescript
import {
  getSkillManager,
  registerSkill,
  getSkill,
  searchSkills,
} from '@/skills-v3'

// Get the manager
const manager = getSkillManager()

// Register a skill
const skill: SkillV3 = {
  id: 'git-commit',
  version: '1.0.0',
  metadata: {
    name: { en: 'Git Commit', 'zh-CN': 'Git 提交' },
    description: {
      en: 'Intelligent git commit workflow',
      'zh-CN': '智能 git 提交工作流',
    },
    category: 'git',
    tags: ['git', 'commit', 'workflow'],
  },
  triggers: ['/commit', '/gc'],
  template: '# Git Commit\n\nCreate intelligent commit messages...',
}

registerSkill(skill, '~/.claude/skills/git-commit.md')

// Get a skill
const entry = getSkill('git-commit')
console.log(entry?.skill.metadata.name)

// Search skills
const results = searchSkills('git')
```

### Hot Reload

```typescript
import { startHotReload, getHotReloadStats } from '@/skills-v3'

// Start watching for changes
await startHotReload({
  watchPaths: ['~/.claude/skills', './.claude/skills'],
  verbose: true,
  autoRegister: true,
})

// Get statistics
const stats = getHotReloadStats()
console.log(`Watching ${stats.watchedFiles} files`)
```

### Migration

```typescript
import { migrateDirectory, migrateFile } from '@/skills-v3'

// Migrate a single file
const result = await migrateFile('~/.claude/skills/old-skill.json')
if (result.success) {
  console.log('Migrated to V3:', result.skill)
}

// Migrate a directory
const report = await migrateDirectory('~/.claude/skills', {
  outputDir: '~/.claude/skills-v3',
  createBackups: true,
})

console.log(`Migrated ${report.successCount} skills`)
console.log(`Failed: ${report.failedCount}`)
console.log(`Skipped: ${report.skippedCount}`)
```

### Loading Skills

```typescript
import { loadAllSkills, loadSkillsFromDirectory } from '@/skills-v3'

// Load from default directories
const result = await loadAllSkills()
console.log(`Loaded ${result.skills.length} skills`)
console.log(`Registered ${result.registered} skills`)

// Load from specific directory
const dirResult = await loadSkillsFromDirectory('./custom/skills')
```

### Dependency Resolution

```typescript
import { getSkillManager } from '@/skills-v3'

const manager = getSkillManager()

// Resolve all dependencies
const resolution = manager.resolveDependencies()

if (!resolution.success) {
  console.log('Missing dependencies:')
  for (const { skillId, missingDeps } of resolution.missing) {
    console.log(`  ${skillId}: ${missingDeps.join(', ')}`)
  }

  console.log('Circular dependencies:')
  for (const cycle of resolution.circular) {
    console.log(`  ${cycle.join(' -> ')}`)
  }
}

// Get load order
console.log('Load order:', resolution.order)
```

### Event Handling

```typescript
import { getSkillManager } from '@/skills-v3'

const manager = getSkillManager()

// Registry events
manager.on('skill:registered', (entry) => {
  console.log('Skill registered:', entry.skill.id)
})

manager.on('skill:updated', (oldEntry, newEntry) => {
  console.log('Skill updated:', newEntry.skill.id)
})

manager.on('conflict:detected', (conflict) => {
  console.log('Conflict detected:', conflict.details)
})

// Hot reload events
manager.onHotReload('add', (event) => {
  console.log('Skill added:', event.entry?.skill.id)
})

manager.onHotReload('change', (event) => {
  console.log('Skill changed:', event.entry?.skill.id)
})

manager.onHotReload('unlink', (event) => {
  console.log('Skill removed:', event.entry?.skill.id)
})
```

## SKILL.md Format

The V3 system uses a SKILL.md format with YAML frontmatter:

```markdown
---
id: git-commit
version: 1.0.0
name:
  en: Git Commit
  'zh-CN': Git 提交
description:
  en: Intelligent git commit workflow
  'zh-CN': 智能 git 提交工作流
category: git
author: CCJK
difficulty: intermediate
priority: 8
auto_activate: true
user_invocable: true
triggers:
  - /commit
  - /gc
tags:
  - git
  - commit
  - workflow
use_when:
  - User wants to commit changes
  - When working on git operations
allowed_tools:
  - Bash(git *)
  - Read
  - Write
permissions:
  - file:read
  - file:write
agents:
  - git-specialist
timeout: 300
hooks:
  - type: SkillActivate
    command: git status
  - type: PreToolUse
    matcher: 'Bash(git commit *)'
    script: echo "Committing changes..."
dependencies: []
outputs:
  - name: commit_hash
    type: variable
    description: Git commit SHA
---

# Git Commit Workflow

Create intelligent commit messages following best practices...
```

## Migration from V1/V2

### V1 Format (CcjkSkill)

```json
{
  "id": "git-commit",
  "name": {
    "en": "Git Commit",
    "zh-CN": "Git 提交"
  },
  "description": {
    "en": "Intelligent git commit workflow",
    "zh-CN": "智能 git 提交工作流"
  },
  "category": "git",
  "triggers": ["/commit", "/gc"],
  "template": "# Git Commit\n\n...",
  "version": "1.0.0",
  "tags": ["git", "commit"]
}
```

### V2 Format (CognitiveProtocol)

```json
{
  "metadata": {
    "id": "error-handling",
    "name": "Error Handling",
    "version": "1.0.0",
    "description": "Cognitive protocol for error handling",
    "layer": "L2",
    "priority": 50,
    "dependencies": []
  },
  "protocol": {
    "coreQuestion": "How should errors be handled?",
    "traceUp": "Identify error type",
    "traceDown": "Apply error handling pattern",
    "quickReference": {}
  }
}
```

Both formats are automatically detected and migrated to V3 when using the migrator.

## API Reference

### SkillManager

Main coordinator for all skill operations.

| Method | Description |
|--------|-------------|
| `register(skill, path, source)` | Register a skill |
| `unregister(id)` | Unregister a skill |
| `get(id)` | Get skill by ID |
| `getByTrigger(trigger)` | Get skills by trigger |
| `search(query, options)` | Search skills |
| `enable(id)` | Enable a skill |
| `disable(id)` | Disable a skill |
| `loadAll(options)` | Load all skills |
| `migrateFile(path)` | Migrate a file |
| `resolveDependencies()` | Resolve dependencies |
| `getStats()` | Get statistics |

### HotReloadManager

File watching and automatic reloading.

| Method | Description |
|--------|-------------|
| `start()` | Start watching |
| `stop()` | Stop watching |
| `addWatchPath(path)` | Add watch path |
| `removeWatchPath(path)` | Remove watch path |
| `getStats()` | Get statistics |

### SkillRegistry

Low-level registry operations.

| Method | Description |
|--------|-------------|
| `register(skill, path, source)` | Register a skill |
| `unregister(id)` | Unregister a skill |
| `getById(id)` | Get by ID |
| `getByPath(path)` | Get by file path |
| `getByTrigger(trigger)` | Get by trigger |
| `lookup(options)` | Lookup with filters |
| `enable(id)` | Enable skill |
| `disable(id)` | Disable skill |
| `detectConflicts(skill)` | Detect conflicts |
| `resolveDependencies()` | Resolve dependencies |
| `getStats()` | Get statistics |

### SkillParser

Parse skill files.

| Method | Description |
|--------|-------------|
| `parseFile(path)` | Parse a file |
| `parseContent(content, path)` | Parse content string |
| `isSkillFile(path)` | Check if file is a skill |

### SkillMigrator

Migrate V1/V2 to V3.

| Method | Description |
|--------|-------------|
| `migrateFile(path)` | Migrate a file |
| `migrateDirectory(path, options)` | Migrate a directory |

### SkillLoader

Load skills from directories.

| Method | Description |
|--------|-------------|
| `loadAll()` | Load all skills |
| `loadDirectory(path)` | Load from directory |
| `loadAndRegister()` | Load and register |

## Configuration

### Hot Reload Config

```typescript
interface HotReloadConfig {
  watchPaths: string[]
  watchHomeSkills: boolean
  watchLocalSkills: boolean
  recursive: boolean
  debounceDelay: number
  ignoreInitial: boolean
  verbose: boolean
  autoRegister: boolean
  autoUnregister: boolean
  ignored?: (string | RegExp)[]
}
```

### Loader Options

```typescript
interface LoaderOptions {
  directories: string[]
  recursive?: boolean
  patterns?: string[]
  autoMigrate?: boolean
  skipInvalid?: boolean
}
```

### Parser Options

```typescript
interface ParserOptions {
  strict?: boolean
  validate?: boolean
  allowMissingOptional?: boolean
  autoMigrate?: boolean
}
```

## Testing

```bash
# Run tests
pnpm test skills-v3

# Run with coverage
pnpm test:coverage skills-v3
```

## Migration Path

### From V1

1. Backup existing skills
2. Run migration: `migrateDirectory('~/.claude/skills')`
3. Review migration report
4. Update imports to use `@/skills-v3`

### From V2

1. Backup existing cognitive protocols
2. Run migration: `migrateDirectory('~/.claude/skills')`
3. Review migrated templates
4. Update custom logic stored in `config.custom`

### From Brain Module

1. Stop existing hot-reload: `await brain.skillHotReload.stop()`
2. Start V3 hot-reload: `await startHotReload()`
3. Migrate skills if needed
4. Update event handlers

## Notes

- **Memory Management**: The hot-reload system uses debouncing and file locking to prevent memory leaks
- **Race Conditions**: File locks prevent multiple concurrent operations on the same file
- **Backward Compatibility**: V1 and V2 formats are automatically detected and can be migrated
- **Performance**: The registry uses indexed lookups for O(1) access by ID and trigger
- **Extensibility**: The modular design allows easy addition of new features

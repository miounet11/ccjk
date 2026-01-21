# CCJK Project Comprehensive Optimization Plan

**Version**: 1.0
**Date**: 2026-01-21
**Status**: Draft - Ready for Implementation Planning

---

## Executive Summary

### Current State

CCJK v3.9.0 is a feature-rich CLI tool for enhancing Claude Code experience. The project has grown organically, resulting in:

- **52 command files** in `/src/commands` (many with overlapping functionality)
- **427+ TypeScript source files** across the project
- **35 FIXME/TODO comments** indicating incomplete features
- **Multiple configuration systems** (ZCF TOML, JSON config, settings.json)
- **Three menu systems** (legacy, categorized, quick actions)
- **50+ production dependencies** (some redundant like chalk + ansis)

### Optimization Goals

| Goal | Current State | Target | Improvement |
|------|--------------|--------|-------------|
| **Commands** | 52 command files | ~20 unified commands | 60% reduction |
| **Menu Complexity** | 3 overlapping systems | 1 streamlined menu | Simpler UX |
| **Config Systems** | 3 different formats | 2 unified configs | Clear separation |
| **Dependencies** | 50+ prod deps | ~40 prod deps | Remove redundancy |
| **Code Duplication** | High (2268 exports) | Extract shared | Reusable core |
| **Technical Debt** | 35 TODO/FIXME | 0 incomplete features | Complete implementation |

---

## 1. Feature Audit Matrix

### 1.1 Core Commands (KEEP - Essential)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `init` | KEEP | Zero-config setup - core value | Streamline options |
| `update` | KEEP | Workflow updates - essential | Merge with init |
| `doctor` | KEEP | Health checks - critical | Enhance diagnostics |
| `help` | KEEP | User guidance - necessary | Improve content |
| `menu` | KEEP | Interactive entry point | Simplify structure |

### 1.2 Configuration Commands (CONSOLIDATE)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `config` | KEEP | Direct config manipulation | Add subcommands |
| `config-switch` | MERGE | Into `config switch` | Eliminate separate file |
| `api` | MERGE | Into `config api` | Consolidate API config |
| `providers` | MERGE | Into `config providers` | Unify provider mgmt |

### 1.3 MCP Management (SIMPLIFY)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `mcp` | KEEP | Unified MCP management | Already consolidated |
| `mcp-doctor` | REMOVE | Functionality in `mcp doctor` | Migrate users |
| `mcp-profile` | REMOVE | Functionality in `mcp profile` | Already integrated |
| `mcp-market` | MERGE | Into `mcp search/install` | Simplify workflow |
| `mcp-search` | REMOVE | Duplicate of `mcp search` | Use `mcp` only |

### 1.4 Skills/Agents (CONSOLIDATE - Major Overhaul)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `skills` | KEEP | Skills management | Add `sync` subcommand |
| `skill` | REMOVE | SKILL.md based - niche | Use file-based approach |
| `agent` | KEEP | Agent composition | Document clearly |
| `agents-sync` | DEPRECATED | Replaced by cloud sync | Migration guide |
| `skills-sync` | DEPRECATED | Use `skills sync` | Update docs |
| `brain` | EVALUATE | Orchestrator complexity | Simplify or remove |

### 1.5 Session/Context (CONSOLIDATE)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `session` | KEEP | Session management | Enhance |
| `context` | KEEP | Context compression | Document better |
| `context-menu` | MERGE | Into `context` | Single entry point |
| `context-compression` | REMOVE | Duplicate namespace | Use context/ |

### 1.6 Tool Integrations (STREAMLINE)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `ccr` | KEEP | CCR proxy - popular tool | Maintain |
| `ccu` | KEEP | Usage analytics - useful | Keep |
| `browser` | KEEP | Agent browser - strategic | Enhance |
| `cometix` | KEEP | Status line - integrations | Merge into tools |
| `superpowers` | EVALUATE | Complex skill system | Consider simplification |

### 1.7 Cloud/Sync (UNIFY)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `cloud-sync` | KEEP | Core sync functionality | Make primary |
| `cloud-plugins` | MERGE | Into cloud ecosystem | Unified cloud command |
| `marketplace` | DEPRECATED | Use cloud approach | Migrate |
| `hooks-sync` | MERGE | Into `cloud hooks` | Consolidate |

### 1.8 Development Tools (KEEP but Document)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `interview` | KEEP | Interview-driven dev | Niche but valuable |
| `commit` | KEEP | Smart git commit | Useful utility |
| `postmortem` | KEEP | Bug learning system | Unique feature |
| `thinking` | KEEP | Extended reasoning | Opus 4.5+ feature |

### 1.9 Experimental/Complex (REMOVE or Simplify)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `daemon` | REMOVE | Remote control - over-engineered | Document removal |
| `teleport` | EVALUATE | Session teleport - complex | Simplify or remove |
| `sandbox` | EVALUATE | Data masking - niche | Assess usage |
| `permissions` | SIMPLIFY | Too granular | Merge into config |
| `notification` | MERGE | Into session management | Reduce surface |
| `stats` | KEEP | Analytics valuable | Maintain |
| `workflows` | MERGE | Into list subcommand | `ccjk list workflows` |
| `vim` | KEEP | Vim mode - niche feature | Document |

### 1.10 Deprecated Commands (CLEANUP)

| Command | Status | Rationale | Action |
|---------|--------|-----------|--------|
| `claude-wrapper` | DEPRECATED | Transparent wrapper - low usage | Remove in v4.0 |
| `claude-md` | DEPRECATED | CLAUDE.md generation | Use init |
| `rename` | DEPRECATED | Unclear use case | Remove |
| `subagent-workflow` | DEPRECATED | Complex, unclear value | Assess or remove |
| `team` | DEPRECATED | Collaboration features | Unused |
| `plugin` | DEPRECATED | Replaced by cloud | Migrate |
| `lsp` | DEPRECATED | LSP management | Low usage |
| `background` | DEPRECATED | Background execution | Merge into session |
| `session-resume` | MERGE | Into session resume | Consolidate |

---

## 2. Architecture Simplification Plan

### 2.1 Command System Consolidation

**Target Command Structure (20 commands total)**:

```
ccjk                          # Interactive menu (default)
ccjk init [-f]                # Full initialization
ccjk config <action>           # Config management (api, switch, list, get, set)
ccjk mcp <action>              # MCP management (install, uninstall, list, search, doctor)
ccjk skills <action>           # Skills management (list, run, create, sync)
ccjk agent <action>            # Agent management (list, create, run)
ccjk session <action>          # Sessions (save, restore, list, delete, resume)
ccjk context <action>          # Context (compress, analyze, status)
ccjk browser <action>          # Agent browser (install, start, stop, status)
ccjk doctor                    # Health check
ccjk update                    # Update workflows/templates
ccjk commit                    # Smart git commit
ccjk ccu [args]                # Usage analysis
ccjk ccr                       # CCR configuration
ccjk help [topic]              # Help and reference
ccjk uninstall                 # Remove configurations
ccjk interview [spec]          # Interview-driven development
ccjk postmortem <action>       # Postmortem system
ccjk thinking <action>         # Extended reasoning mode
```

**Migration Path**:

1. **Phase 1**: Mark deprecated commands with warnings
2. **Phase 2**: Redirect deprecated commands to new equivalents
3. **Phase 3**: Remove deprecated commands in major version bump

### 2.2 Configuration Unification

**Current Issues**:
- 3 different config systems (ZCF TOML, JSON config, settings.json)
- Overlapping concerns between configs
- Confusing migration paths

**Proposed Unified Config Architecture**:

```
~/.ccjk/
├── config.toml              # CCJK settings (lang, tool type, profiles)
├── state.json               # Runtime state (sessions, cache)
└── credentials/             # Sensitive data (gitignored)
    ├── api-key.enc
    └── tokens.enc

~/.claude/
├── settings.json            # Claude Code settings (managed by CCJK)
├── CLAUDE.md                # Project context
└── backup/                  # Automatic backups
```

**Config System Responsibilities**:

| Config File | Responsibility | Manager |
|-------------|---------------|---------|
| `~/.ccjk/config.toml` | CCJK preferences, tool type, language | `ccjk-config.ts` |
| `~/.ccjk/state.json` | Sessions, cache, runtime data | `state-manager.ts` |
| `~/.ccjk/credentials/` | API keys, tokens (encrypted) | `credential-manager.ts` |
| `~/.claude/settings.json` | Claude Code native config | `claude-config.ts` |

**Migration Steps**:

1. Create credential encryption system
2. Migrate sensitive data from settings.json to credentials/
3. Separate CCJK state from Claude Code config
4. Update all config readers to use unified system

### 2.3 Menu System Streamlining

**Current Issues**:
- 3 different menu implementations (legacy, categorized, quick actions)
- 1593 lines in menu.ts (too large)
- Inconsistent UX across menu types

**Proposed Menu Architecture**:

```
menu/
├── index.ts                 # Main entry point
├── types.ts                 # Menu types and interfaces
├── main-menu.ts             # Primary menu (simplified)
├── submenu/                 # Submenus
│   ├── config.ts           # Configuration submenu
│   ├── tools.ts            # Tools integration submenu
│   ├── cloud.ts            # Cloud services submenu
│   └── advanced.ts         # Advanced features submenu
└── renderer/
    ├── layout.ts           # Menu layout engine
    ├── sections.ts         # Section definitions
    └── input.ts            # Input handling
```

**Simplified Menu Structure**:

```
┌─────────────────────────────────────────┐
│           CCJK v4.0 Main Menu           │
├─────────────────────────────────────────┤
│                                          │
│  Quick Actions                           │
│  1. Initialize Setup                    │
│  2. Run Diagnostics                     │
│  3. Update All                          │
│                                          │
│  Configuration                           │
│  4. API Settings                        │
│  5. MCP Services                        │
│  6. Switch Provider                     │
│                                          │
│  Tools                                   │
│  7. Agent Browser                       │
│  8. Session Manager                     │
│  9. Context Tools                       │
│                                          │
│  More... (M)                             │
│                                          │
│  0. Language  Q. Quit                   │
└─────────────────────────────────────────┘
```

**Key Improvements**:
- Reduce main menu to 9 visible options
- Group related options under submenus
- Consistent naming and descriptions
- Keyboard shortcuts for common actions

---

## 3. Smart Enhancements

### 3.1 Intelligent Defaults

**Current State**: Users face 15+ prompts during init
**Target**: 3 prompts or less for default setup

**Smart Defaults Strategy**:

| Setting | Detection Logic | Default Fallback |
|---------|----------------|------------------|
| Language | System locale | English |
| Code Tool | Detect installed tools | Claude Code |
| API Provider | Check existing config | Official (guide to 3rd party) |
| MCP Services | Analyze project type | Install essential only |
| Output Style | Project type detection | senior-architect |

### 3.2 Context-Aware Help

**Proposed Enhancement**:

```typescript
// Smart help system that detects context
interface ContextAwareHelp {
  // Detect user's current situation
  detectContext(): {
    isFirstTime: boolean
    hasExistingConfig: boolean
    projectType: 'web' | 'cli' | 'library' | 'unknown'
    os: 'windows' | 'macos' | 'linux' | 'termux'
    errors: string[]
  }

  // Provide relevant actions based on context
  suggestActions(): Action[]
}
```

**Example Scenarios**:

| Context | Suggested Actions |
|---------|------------------|
| First time, no config | "Initialize setup" → "Quick Start Guide" |
| Has config, errors | "Run Diagnostics" → "Fix Common Issues" |
| Node.js project | "Add MCP: package-json" → "Install Node.js tools" |
| After update | "View What's New" → "Configure New Features" |

### 3.3 Progressive Disclosure

**Principle**: Show simple options first, reveal advanced options on demand

```typescript
// Progressive menu levels
interface MenuLevel {
  basic: string[]     // Always visible
  intermediate: string[]  // Show with --advanced flag
  expert: string[]    // Show with --expert flag
}
```

**Example**:

```
Basic (default):
  ccjk init           # Smart defaults
  ccjk mcp install    # Popular MCPs only
  ccjk doctor         # Basic checks

Intermediate (--advanced):
  ccjk init --custom  # All options
  ccjk mcp install --all  # All available MCPs
  ccjk doctor --deep  # Extended checks

Expert (--expert):
  ccjk init --manual  # Manual configuration
  ccjk config raw     # Edit raw config
  ccjk doctor --debug # Debug output
```

---

## 4. Efficiency Improvements

### 4.1 Dependency Cleanup

**Redundant Dependencies to Remove**:

| Dependency | Used By | Replacement | Savings |
|------------|---------|-------------|---------|
| `chalk` | Various | Use `ansis` only | ~40KB |
| `commander` | None (unused) | Remove entirely | ~90KB |
| `imap` + `mailparser` | Daemon | Remove daemon feature | ~150KB |
| `nodemailer` | Daemon | Remove daemon feature | ~100KB |

**Dependencies to Evaluate**:

| Dependency | Usage | Decision |
|------------|-------|----------|
| `@iarna/toml` | TOML parsing | Keep, but evaluate `smol-toml` replacement |
| `gray-matter` | Frontmatter parsing | Keep for skill parsing |
| `inquirer-toggle` | Toggle prompts | Merge into custom prompts |

**Target Dependencies**: ~40 production dependencies (down from 50+)

### 4.2 Performance Optimizations

**Startup Performance**:

| Area | Current | Target | Approach |
|------|---------|--------|----------|
| Lazy loading | Partial | Full lazy | Dynamic imports for all commands |
| Config reading | Multiple reads | Single read | Cache config in memory |
| I18n init | Eager | Lazy | Load translations on demand |
| File system checks | Repeated | Cached | Memoize platform detection |

**Execution Performance**:

```typescript
// Current: Sequential operations
await installMcp()
await installWorkflows()
await configureApi()

// Optimized: Parallel where possible
await Promise.all([
  installMcp(),
  installWorkflows(),
])
await configureApi() // Must be last
```

### 4.3 Bundle Size Reduction

**Strategies**:

1. **Tree-shaking**: Ensure all exports are properly tree-shakeable
2. **Code splitting**: Split heavy features (MCP marketplace) into separate chunks
3. **Conditional requires**: Platform-specific code loaded only when needed
4. **Template optimization**: Compress or externalize large templates

**Targets**:

| Metric | Current | Target |
|--------|---------|--------|
| Main bundle | ~2MB | <1MB |
| Node modules | ~80MB | <50MB |
| Install size | ~100MB | <70MB |

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Establish simplified architecture foundation

**Tasks**:

1. **Create new command structure**
   - Create `src/commands/core/` directory
   - Move essential commands (init, update, doctor, help, menu)
   - Set up command registry pattern

2. **Implement unified config system**
   - Create `src/config/unified/` directory
   - Implement credential manager
   - Create state manager
   - Add migration scripts

3. **Set up progressive menu system**
   - Create `src/commands/menu/` directory structure
   - Implement basic main menu
   - Add submenu framework
   - Create renderer engine

**Success Criteria**:
- New command structure works alongside old
- Config migration script tested
- Menu displays without errors

### Phase 2: Command Consolidation (Week 3-4)

**Goal**: Reduce commands from 52 to ~20

**Tasks**:

1. **Consolidate config commands**
   - Merge `config-switch` → `config switch`
   - Merge `api` → `config api`
   - Merge `providers` → `config providers`

2. **Simplify MCP commands**
   - Remove `mcp-doctor`, `mcp-profile`, `mcp-search`
   - Update `mcp` to handle all subcommands
   - Add deprecation warnings

3. **Unify cloud/sync commands**
   - Create `cloud` command
   - Merge `cloud-plugins`, `marketplace`, `hooks-sync`
   - Update documentation

4. **Consolidate session/context**
   - Merge `context-menu` → `context`
   - Remove `context-compression` directory
   - Unify session management

**Success Criteria**:
- Deprecated commands show warnings
- All functionality preserved in new commands
- Tests pass for consolidated commands

### Phase 3: Cleanup (Week 5)

**Goal**: Remove deprecated code and dependencies

**Tasks**:

1. **Remove deprecated commands**
   - Delete old command files
   - Update imports
   - Clean up tests

2. **Dependency cleanup**
   - Remove unused dependencies
   - Replace chalk with ansis
   - Remove daemon-related packages

3. **Code quality**
   - Fix all 35 TODO/FIXME comments
   - Update type definitions
   - Improve documentation

**Success Criteria**:
- All deprecated code removed
- Package.json reduced by 10+ dependencies
- No outstanding technical debt markers

### Phase 4: Polish (Week 6)

**Goal**: Enhance UX and performance

**Tasks**:

1. **Implement smart defaults**
   - Auto-detect language
   - Detect project type
   - Suggest relevant MCPs

2. **Performance optimization**
   - Implement full lazy loading
   - Add config caching
   - Optimize startup time

3. **Documentation**
   - Update README
   - Create migration guide
   - Update help text

**Success Criteria**:
- Init completes in <3 prompts
- Startup time <500ms
- Documentation complete

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Breaking existing workflows** | Medium | High | Extended deprecation period, migration scripts |
| **Config migration failures** | Medium | High | Comprehensive testing, rollback mechanism |
| **Dependency conflicts** | Low | Medium | Careful version pinning, testing matrix |
| **Performance regression** | Low | Medium | Benchmarking before/after |
| **Loss of niche features** | Medium | Medium | User feedback, feature requests |

### 6.2 User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Power users confused** | Medium | Medium | Advanced mode flag, detailed docs |
| **New users overwhelmed** | Low | High | Progressive disclosure, smart defaults |
| **Migration friction** | High | High | Clear migration guide, auto-migration |
| **Feature discovery** | Medium | Medium | Improved help, suggestions |

### 6.3 Mitigation Strategies

1. **Extended Deprecation Period**: Keep deprecated commands for 2 minor versions
2. **Auto-Migration**: Automatic config migration with backup
3. **Rollback Mechanism**: Ability to revert to previous version
4. **User Testing**: Beta testing with power users
5. **Documentation**: Comprehensive migration guide
6. **Feedback Loop**: Easy way to report issues

---

## 7. Success Metrics

### 7.1 Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Command count** | 52 | ~20 | Count in src/commands/ |
| **Menu LOC** | 1593 | <500 | Lines in menu system |
| **Dependencies** | 50+ | ~40 | Count in package.json |
| **TODO/FIXME** | 35 | 0 | Grep count |
| **Init prompts** | 15+ | <5 | Prompt counter |
| **Startup time** | ~2s | <500ms | Benchmark |
| **Bundle size** | ~2MB | <1MB | Build output |

### 7.2 Qualitative Metrics

| Metric | Assessment Method |
|--------|------------------|
| **User satisfaction** | Survey after migration |
| **Feature discoverability** | User testing sessions |
| **Documentation clarity** | Feedback on docs |
| **Migration smoothness** | Issue tracker analysis |

### 7.3 KPI Targets

| KPI | Baseline | Target | Timeline |
|-----|----------|--------|----------|
| **User retention** | 85% | 90% | 3 months post-launch |
| **Support requests** | Baseline | -20% | 1 month post-launch |
| **Feature usage** | Baseline | +15% | 2 months post-launch |
| **NPS score** | N/A | +50 | 3 months post-launch |

---

## 8. Next Steps

### Immediate Actions (Week 1)

1. **Create optimization branch**
   ```bash
   git checkout -b feature/v4-optimization
   ```

2. **Set up measurement baseline**
   - Document current metrics
   - Create benchmark suite
   - Run test coverage report

3. **Stakeholder review**
   - Present plan to team
   - Gather feedback
   - Prioritize features

4. **Create migration guide**
   - Document all changes
   - Create migration examples
   - Prepare FAQ

### First Implementation Sprint (Week 2)

1. Implement unified config system
2. Create new command structure
3. Set up progressive menu framework

---

### Critical Files for Implementation

| File | Reason |
|------|--------|
| `/Users/lu/ccjk-public/src/cli-lazy.ts` | Main CLI entry point - defines all commands and lazy loading structure |
| `/Users/lu/ccjk-public/src/commands/menu.ts` | Largest menu file (1593 lines) - needs restructuring into submenus |
| `/Users/lu/ccjk-public/src/utils/config.ts` | Core config management - needs unification with ccjk-config.ts |
| `/Users/lu/ccjk-public/src/utils/ccjk-config.ts` | ZCF config system - needs merger with config.ts |
| `/Users/lu/ccjk-public/package.json` | Dependencies - needs cleanup (remove chalk, commander, imap, mailparser, nodemailer) |
| `/Users/lu/ccjk-public/src/commands/index.ts` | Command exports - restructure for new organization |
| `/Users/lu/ccjk-public/src/commands/init.ts` | Core initialization - simplify prompt flow |
| `/Users/lu/ccjk-public/src/config/api-providers.ts` | API provider configuration - 20 TODOs indicate incomplete implementation |
| `/Users/lu/ccjk-public/src/commands/mcp.ts` | Unified MCP command - reference for command consolidation pattern |
| `/Users/lu/ccjk-public/src/utils/features.ts` | Feature orchestration - refactor to use new command structure |

---

## 9. Alignment with Claude Code Philosophy

### 9.1 Core Principles Review

| Claude Code Principle | CCJK Alignment | Enhancement Value |
|---------------------|----------------|-------------------|
| **Low-level & Unopinionated** | ✅ CCJK provides opinionated defaults that can be overridden | Simplifies setup while preserving flexibility |
| **Terminal-First** | ✅ CCJK enhances terminal with colors, menus, progress | Better UX without breaking terminal flow |
| **Permission Safety** | ✅ CCJK extends safety with backups | Additional safety layer for configurations |
| **MCP Extensibility** | ✅ CCJK simplifies MCP server setup | Makes MCP more accessible |
| **Composable** | ✅ CCJK commands can be piped/scripted | Maintains Unix philosophy |

### 9.2 What CCJK Should NOT Do

❌ **Duplicate Claude Code's Core**:
- Terminal interface (Claude Code's strength)
- File operations (Read/Write/Edit tools)
- Git integration (built-in commands)
- MCP protocol itself (extension mechanism)

✅ **What CCJK SHOULD Do**:
- Zero-config setup (manual configuration gap)
- API provider management (no provider presets)
- Cross-platform installation help
- MCP service discovery and automation
- Configuration backup/restore
- Multi-language support (i18n)
- Project template management

---

**End of Optimization Plan**

*This document provides a comprehensive roadmap for simplifying the CCJK codebase while maintaining its value proposition. The plan emphasizes user experience improvements, technical debt reduction, and architectural simplification.*

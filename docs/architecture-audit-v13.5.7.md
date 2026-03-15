# CCJK v13.5.7 — Architecture Audit & Status Analysis

> Core mission: Zero-config setup for Claude Code / Codex with MCP services, Skills, and rapid dev configuration.

## 1. System Snapshot

| Metric | Value |
|--------|-------|
| Version | 13.5.7 |
| Source files (non-test) | 803 |
| Total LOC | ~297,000 |
| Test files | 134 |
| Top-level modules | 44 directories |
| CLI commands | 69 (19 core + 50 extended) |
| i18n namespaces | 59 × 2 languages (zh-CN, en) |

### Top 15 Modules by Size

| Module | LOC | Mission Alignment |
|--------|-----|-------------------|
| utils | 67,011 | ★★★ Config infrastructure |
| commands | 48,893 | ★★★ User interaction |
| brain | 37,291 | ★☆☆ Advanced orchestration |
| core | 18,170 | ★★☆ Auto-fix, core tools |
| config | 11,020 | ★★★ Zero-config foundation |
| context | 10,541 | ★☆☆ Context compression |
| cloud-client | 8,740 | ★☆☆ Remote API |
| services | 8,208 | ★★☆ Shared services |
| plugins-v2 | 7,306 | ★★☆ Next-gen plugins |
| cloud-sync | 6,812 | ★☆☆ Cloud sync |
| types | 6,617 | ★★☆ Type definitions |
| workflow | 4,080 | ★★☆ Workflows |
| mcp-marketplace | 4,070 | ★★★ MCP marketplace |
| generation | 3,725 | ★★☆ Smart generation |
| monitoring | 3,647 | ★☆☆ Monitoring |

## 2. Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 0: CLI Entry                                         │
│  bin/ccjk.mjs → cli.ts → cli-lazy.ts (2928 lines)         │
│  cac framework, 3-tier lazy loading                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Commands (user interaction)                       │
│  commands/ (48,893 lines)                                   │
│  init.ts │ menu/ │ status │ boost │ model                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Zero-Config Foundation (core mission)             │
│  config.ts, config-migration, config-validator, auto-fix    │
│  claude-config, ccjk-config (~/.ccjk/toml)                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Tool & Provider Abstraction                       │
│  code-tools/ (6 adapters) │ api-providers (6) │ mcp-services│
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Skills & Plugins                                  │
│  skills/ (v1) │ plugins-v2/ │ generation/                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Intelligence (advanced)                           │
│  brain/ (37K) │ context/ (10K) │ agents/                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: Cloud & Sync                                      │
│  cloud-client │ cloud-sync │ cloud-plugins                  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Mission Alignment Assessment

### Pillar A: Zero-Config for Claude Code / Codex ★★★★☆

Strengths:
- 3-layer config system (settings.json / MCP config / ccjk config.toml) with clear separation
- Template merge + atomic writes + backup mechanism is mature
- Migration pipeline + validator + auto-fix form a complete defense line
- Recent `model: "default"` fix proves the defense line works

Concerns:
- `cli-lazy.ts` at 2928 lines carries too many responsibilities
- `init.ts` at 2307 lines has too many flow branches
- 4 of 6 code-tool adapters (Aider/Continue/Cline/Cursor) may have low usage vs maintenance cost

### Pillar B: MCP Service Integration ★★★★☆

Strengths:
- 8 built-in MCP services covering core scenarios
- Platform compatibility checks (macOS/Windows/Linux/WSL/Termux)
- Dynamic runtime registration without restart
- Complete marketplace architecture (search, install, security scan, cache)

Concerns:
- mcp-marketplace (4,070 lines) has zero test files
- Security scanner coverage depth unknown
- `DynamicMcpServiceRegistry` runtime stability needs integration tests

### Pillar C: Skills Integration ★★★☆☆

Strengths:
- Markdown template → Claude Code native `.md` command conversion is clean
- Batch creation (TypeScript/Python/SEO/DevOps) lowers entry barrier
- Intent detection + auto-trigger (disabled by default, safe)

Concerns:
- skills/ (v1, 1081 lines) and plugins-v2/ (7306 lines) overlap
- plugins-v2 has zero tests but 7x the code of skills/
- Migration path between the two systems is unclear

### Pillar D: Rapid Dev Configuration ★★★☆☆

Strengths:
- `ccjk init` one-click setup for API + MCP + workflows + toolchain
- `ccjk boost` one-click optimization
- `ccjk status` health score + actionable recommendations

Concerns:
- 69 commands create cognitive overload for new users
- `quick-setup` / `init` / `boost` / `doctor` boundaries may be unclear to users

## 4. Complexity Assessment

### Complexity Justified ✅

| Area | LOC | Rationale |
|------|-----|-----------|
| config system | ~11K | Multi-layer config + migration + validation + auto-fix matches problem domain |
| api-providers | ~2.3K | 6 providers with different auth methods, complexity is reasonable |
| i18n | 59 ns × 2 lang | Full internationalization is necessary |
| code-tools | ~1.3K | Thin abstraction layer, 6 adapters at ~100 lines each |

### Complexity Potentially Excessive ⚠️

| Area | LOC | Issue |
|------|-----|-------|
| brain/ | 37,291 | 12.5% of total codebase. 10+ agent roles, 5-level capability routing, 4 execution paths, convoy management, mayor agent, persistent mailbox — but core mission is "config tool", not "AI orchestration platform" |
| context/ | 10,541 | Does context compression complement or duplicate Claude Code's own context management? |
| cloud-* (3 modules) | 18,439 | Three cloud modules totaling 18K lines — is the cloud service stable enough to justify this? |
| cli-lazy.ts | 2,928 | Single file with too many responsibilities |
| commands/init.ts | 2,307 | Single file with too many flow branches |
| monitoring/ | 3,647 | Non-trivial size but missing docs and tests |

## 5. Test Coverage Gaps

| Module | Test Files | LOC | Risk |
|--------|-----------|-----|------|
| plugins-v2 | 0 | 7,306 | 🔴 High — next-gen plugin system untested |
| health | 0 | — | 🔴 High — health scores drive user decisions |
| mcp-marketplace | 0 | 4,070 | 🔴 High — installs third-party packages |
| brain | 9 | 37,291 | 🔴 High — most complex module, only 9 test files |
| discovery | 0 | — | 🟡 Medium — recommendation engine untested |
| generation | 0 | — | 🟡 Medium — smart generation untested |
| monitoring | 0 | 3,647 | 🟡 Medium |

Benchmark: context/ has 22 test files covering 10,541 LOC — the gold standard for test coverage in this project.

## 6. Technical Debt

### P0 — Immediate

1. **skills v1 vs plugins-v2 overlap**: Two systems coexist, user confusion, double maintenance cost. Need clear migration path or merge.
2. **brain/ test coverage**: 37K LOC with only 9 test files — any refactor is high-risk.
3. **mcp-marketplace zero tests**: Installs third-party packages and runs security scans — must have tests.

### P1 — Near-term

4. **cli-lazy.ts split**: 2928-line single file. Split by tier or functional domain into multiple registration modules.
5. **init.ts split**: 2307 lines. Split by phase (banner/config/api/mcp/workflows/tools/completion).
6. **Command count governance**: 69 commands, some likely have very low usage. Add telemetry to measure command frequency, data-driven pruning.
7. **config v3 vs existing config**: `src/config/v3/` and `src/config/unified/` — have they replaced old config logic? If not, two config systems running in parallel is risky.

### P2 — Medium-term

8. **code-tools adapter pruning**: Aider/Continue/Cline/Cursor — if usage is low, consider downgrading to community-contributed or lazy-loaded.
9. **Cloud module consolidation**: cloud-client / cloud-sync / cloud-plugins (18K lines) — consider merging into unified cloud/ module.
10. **monitoring module evaluation**: 3647 lines with no docs or tests — confirm whether it's actually in use.

## 7. Config System Health (Deep Dive)

### Three-Layer Config Flow

```
Template (templates/claude-code/common/settings.json)
  ↓ mergeSettingsFile() — deep merge, preserve user values
User config (~/.claude/settings.json)
  ↓ configureApi() — write API credentials
  ↓ syncMcpPermissions() — sync MCP permissions
Runtime config
  ↑ config-migration.ts — migrate on startup
  ↑ config-validator.ts — validate + sanitize
  ↑ auto-fix.ts — auto-repair
```

### Recent model: "default" Fix (v13.5.7)

Root cause chain: template had `"model": "default"` → mergeSettingsFile merged it into user config → third-party gateway treated `default` as a real model name → 503 error.

Fix coverage (5 layers):
- `settings.json` template: removed `model: "default"`
- `config.ts`: mergeSettingsFile strips `model: "default"` + adaptive routing guard
- `config-migration.ts`: migration pipeline detects and fixes both cases
- `config-validator.ts`: validation rejects "default", sanitization strips it
- `auto-fix.ts`: detects `model: "default"` and adaptive routing override
- `config-routing.test.ts`: regression tests for merge and validator

Assessment: Fix is comprehensive, covering write, merge, migration, validation, and repair. Defense line is intact.

## 8. Priority Recommendations

### Short-term (1-2 weeks)

| # | Action | Rationale |
|---|--------|-----------|
| 1 | Add tests for mcp-marketplace | Security-sensitive, zero tests is unacceptable |
| 2 | Add tests for health/ | Health scores drive user behavior |
| 3 | Define skills v1 → plugins-v2 migration strategy | Eliminate user confusion |

### Medium-term (1-2 months)

| # | Action | Rationale |
|---|--------|-----------|
| 4 | Split cli-lazy.ts | Reduce single-file cognitive load |
| 5 | Split init.ts | Modularize by phase |
| 6 | Increase brain/ test coverage to 20+ files | Build safety net for future refactoring |
| 7 | Add command usage telemetry | Data-driven pruning |

### Long-term (quarterly)

| # | Action | Rationale |
|---|--------|-----------|
| 8 | Evaluate extracting brain/ as sub-package | 37K LOC ≈ an independent project |
| 9 | Consolidate cloud modules | Reduce inter-module coupling |
| 10 | Progressive command discovery | New users see only 5-10 core commands |

## 9. Summary

Layers 0-3 (CLI entry, commands, zero-config foundation, tool abstraction) are solid. The config defense-in-depth (template → merge → migration → validation → auto-fix) is a highlight.

Primary risk is **upper-layer bloat**: brain (37K) + context (10K) + cloud trio (18K) = 65K lines, 22% of total codebase, with low direct mission alignment and the weakest test coverage.

Strategic direction: **protect the core, converge the upper layers**. Focus energy on zero-config experience, MCP ecosystem, and skills unification. Let brain/cloud serve as optional enhancements rather than the default path.

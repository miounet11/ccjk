# Health Module

[Root](../../CLAUDE.md) > [src](../CLAUDE.md) > **health**

## Purpose

Score-based health check engine. Evaluates the quality of the current CCJK/Claude Code setup across 6 weighted checks and returns a `HealthReport` with a numeric score and actionable recommendations. Drives the `ccjk status` / `ccjk doctor` output.

## Entry Points

- `src/health/index.ts` — exports `runHealthCheck`, `HealthReport`, `HealthResult`, `Recommendation`
- `src/health/scorer.ts` — main scoring logic
- `src/health/types.ts` — type definitions

## Module Structure

```
src/health/
├── scorer.ts    # runHealthCheck() — runs all checks, computes weighted score
├── types.ts     # HealthCheck, HealthReport, HealthResult, Recommendation
└── index.ts     # Public exports
```

## Key Types

```typescript
export interface HealthReport {
  score: number           // 0-100
  checks: HealthResult[]
  recommendations: Recommendation[]
}

export interface HealthResult {
  name: string
  passed: boolean
  weight: number
  message: string
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  action: string
  command?: string
}
```

## Usage

```typescript
import { runHealthCheck } from '../health'
const report = await runHealthCheck()
console.log(report.score) // e.g. 72
```

## Dependencies

- Internal: `src/utils/config.ts`, `src/utils/claude-config.ts`, `src/i18n/`
- No external dependencies

## Tests

No dedicated test file yet. Covered indirectly via `tests/commands/dashboard.test.ts`.

## Changelog

| Date | Change |
|------|--------|
| 2026-02-25 | CLAUDE.md created by init-architect |

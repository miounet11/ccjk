# CCJK Evals Scaffolding Implementation Spec

Version: v1.0  
Date: 2026-03-06  
Status: Execution Ready  
Audience: Claude Code implementation agent

## 1. Purpose

This document defines the first implementation slice for CCJK's evaluation system.

The goal of this phase is not to build the final benchmark platform. The goal is to establish a stable, extensible scaffold that supports:

- scenario definition
- benchmark execution
- result grading
- baseline comparison
- JSON reports
- HTML dashboard generation

This work should be implemented before advanced memory upgrades or major agent expansion.

## 2. Scope

This phase covers:

- `evals/` directory structure
- `src/core/evals/` module scaffold
- CLI entrypoints for eval execution
- report generation
- starter benchmark scenarios
- CI workflow scaffold

This phase does not cover:

- full enterprise reporting
- cloud storage for eval results
- advanced multi-model orchestration
- auto-generated scenario authoring

## 3. Deliverables

### 3.1 New directories

- `evals/`
- `evals/scenarios/`
- `evals/scenarios/context/`
- `evals/scenarios/compression/`
- `evals/scenarios/agent-teams/`
- `evals/baselines/`
- `evals/reports/`
- `src/core/evals/`
- `scripts/`

### 3.2 New code modules

Under `src/core/evals/`:

- `types.ts`
- `scenario-loader.ts`
- `runner.ts`
- `grader.ts`
- `comparator.ts`
- `reporter-json.ts`
- `reporter-html.ts`
- `index.ts`

### 3.3 New CLI surface

Add command support for:

- `ccjk eval run`
- `ccjk eval compare`

Optional initial flags:

- `--scenario <name>`
- `--suite <name>`
- `--runs <n>`
- `--baseline <path>`
- `--json`
- `--html`

### 3.4 New supporting scripts

- `scripts/benchmark-runner.ts`

Optional if needed:

- `scripts/generate-eval-dashboard.ts`

### 3.5 New CI workflow

- `.github/workflows/benchmark.yml`

## 4. Directory Layout

Recommended initial layout:

```text
evals/
  scenarios/
    context/
      context-build-basic.json
      context-merge-existing.json
    compression/
      compression-report-basic.json
    agent-teams/
      agent-team-basic.json
  baselines/
    README.md
  reports/
    .gitkeep

src/
  core/
    evals/
      types.ts
      scenario-loader.ts
      runner.ts
      grader.ts
      comparator.ts
      reporter-json.ts
      reporter-html.ts
      index.ts

scripts/
  benchmark-runner.ts
```

## 5. Core Design Rules

### 5.1 Observable behavior only

Scenarios must verify externally observable outcomes, not implementation details.

Good:

- command exits successfully
- file created
- report contains expected metrics
- benchmark score exceeds threshold

Bad:

- function X was called internally
- line Y executed

### 5.2 Stable schema

Use a small, stable JSON schema for scenarios and reports. Avoid over-design in the first version.

### 5.3 Deterministic first

Prefer deterministic checks over LLM-judged checks in the initial phase.

### 5.4 Local-first

All benchmark runs should work locally without requiring remote infrastructure.

## 6. Scenario Schema

Use JSON for the initial version.

Example schema:

```json
{
  "id": "context-build-basic",
  "suite": "context",
  "description": "Builds a context artifact successfully for a sample project",
  "command": "pnpm tsx scripts/benchmark-runner.ts --scenario context-build-basic",
  "runs": 3,
  "assertions": [
    {
      "type": "exit_code",
      "expected": 0
    },
    {
      "type": "file_exists",
      "path": "tmp/evals/context-build-basic/CLAUDE.md"
    },
    {
      "type": "contains_text",
      "path": "tmp/evals/context-build-basic/CLAUDE.md",
      "value": "Project Information"
    }
  ],
  "metrics": [
    "duration_ms",
    "output_bytes"
  ]
}
```

## 7. TypeScript Types

Implement the following minimal type model in `src/core/evals/types.ts`.

```ts
export interface EvalAssertion {
  type: 'exit_code' | 'file_exists' | 'contains_text' | 'json_field' | 'threshold'
  expected?: number | string | boolean
  path?: string
  value?: string
  field?: string
  operator?: 'eq' | 'gte' | 'lte'
}

export interface EvalScenario {
  id: string
  suite: string
  description: string
  command: string
  runs?: number
  assertions: EvalAssertion[]
  metrics?: string[]
}

export interface EvalRunResult {
  scenarioId: string
  runIndex: number
  success: boolean
  durationMs: number
  exitCode: number
  metrics: Record<string, number | string | boolean>
  assertionResults: EvalAssertionResult[]
  stdout?: string
  stderr?: string
}

export interface EvalAssertionResult {
  type: string
  success: boolean
  message: string
}

export interface EvalScenarioReport {
  scenarioId: string
  suite: string
  totalRuns: number
  passedRuns: number
  failedRuns: number
  averageDurationMs: number
  successRate: number
  results: EvalRunResult[]
}

export interface EvalComparisonReport {
  scenarioId: string
  baselineSuccessRate: number
  candidateSuccessRate: number
  baselineAverageDurationMs: number
  candidateAverageDurationMs: number
  deltaSuccessRate: number
  deltaDurationMs: number
}
```

## 8. Module Responsibilities

## 9. `scenario-loader.ts`

Responsibilities:

- load scenarios from `evals/scenarios/**`
- validate required fields
- filter by suite or scenario id

Acceptance criteria:

- can load all valid JSON scenario files
- rejects malformed scenarios with actionable errors

## 10. `runner.ts`

Responsibilities:

- execute scenario commands
- repeat runs
- capture exit code, duration, stdout, stderr
- return raw results

Implementation guidance:

- use `child_process`
- avoid shell-specific behavior where possible
- support bounded output capture

Acceptance criteria:

- can run a scenario multiple times
- records timing and exit code correctly

## 11. `grader.ts`

Responsibilities:

- evaluate assertions for each run
- produce pass/fail results
- support initial assertion types:
  - `exit_code`
  - `file_exists`
  - `contains_text`

Acceptance criteria:

- assertions fail clearly and report why
- successful runs are graded deterministically

## 12. `comparator.ts`

Responsibilities:

- compare candidate reports against baseline reports
- compute:
  - success rate delta
  - duration delta

Acceptance criteria:

- baseline and candidate comparisons use the same scenario id
- missing baseline data produces a clean error

## 13. `reporter-json.ts`

Responsibilities:

- write per-run and per-scenario reports
- use stable filenames and JSON schema

Output target:

- `evals/reports/*.json`

Acceptance criteria:

- report files are written deterministically
- report schema is consistent across runs

## 14. `reporter-html.ts`

Responsibilities:

- render a lightweight HTML summary from JSON reports
- show:
  - scenario name
  - success rate
  - average duration
  - pass/fail count
  - comparison deltas when available

Output target:

- `evals/reports/index.html`

Acceptance criteria:

- HTML renders without external dependencies
- report is readable in a local browser

## 15. `index.ts`

Responsibilities:

- export public eval APIs
- keep imports centralized

## 16. CLI Integration

Initial command behavior:

### 16.1 `ccjk eval run`

Expected behavior:

- load scenarios
- run selected suite or scenario
- write JSON report
- optionally write HTML report
- print concise summary

### 16.2 `ccjk eval compare`

Expected behavior:

- load candidate report
- load baseline report
- compute comparison
- print summary and optionally write JSON

## 17. Starter Benchmark Scenarios

Implement a minimal initial set.

### 17.1 Context scenarios

`context-build-basic.json`

Purpose:

- verify context generation command completes
- verify output file exists
- verify output contains expected sections

`context-merge-existing.json`

Purpose:

- verify new context can merge with existing file without destructive loss

### 17.2 Compression scenarios

`compression-report-basic.json`

Purpose:

- verify compression report or command emits measurable artifact
- verify output includes token or byte metrics

### 17.3 Agent scenarios

`agent-team-basic.json`

Purpose:

- verify agent orchestration command executes and produces a valid result artifact

Keep the first version small. Coverage breadth matters less than stability.

## 18. Baseline Strategy

Do not overcomplicate baseline storage.

Initial strategy:

- keep baseline JSON reports under `evals/baselines/`
- allow explicit comparison against a checked-in baseline artifact

Naming suggestion:

- `evals/baselines/context-build-basic.baseline.json`

## 19. HTML Dashboard Requirements

The first HTML viewer should be simple.

Required sections:

- title and timestamp
- total scenarios
- passed scenarios
- failed scenarios
- average duration
- per-scenario table

Optional first-pass styling:

- plain CSS only
- no framework dependency
- one self-contained file

## 20. Logging and Output Rules

CLI output should be concise.

Recommended summary format:

```text
Eval Suite: context
Scenarios: 2
Passed: 2
Failed: 0
Average Duration: 142ms
Report: evals/reports/context-2026-03-06T12-00-00.json
Dashboard: evals/reports/index.html
```

## 21. CI Workflow Requirements

Create `.github/workflows/benchmark.yml` with:

- install dependencies
- run targeted benchmark suite
- upload report artifacts if supported

Initial CI target:

- run only a stable subset
- do not block the entire repo on flaky scenarios

Suggested initial gate:

- protected benchmark scenarios must pass

## 22. Acceptance Criteria

This scaffolding phase is complete when:

- `ccjk eval run` works for at least one suite
- reports are generated in JSON
- HTML dashboard is generated
- at least 3 starter scenarios run reliably
- CI can execute the stable benchmark subset

## 23. Implementation Order

Claude Code should implement in this order:

1. `src/core/evals/types.ts`
2. `src/core/evals/scenario-loader.ts`
3. `src/core/evals/runner.ts`
4. `src/core/evals/grader.ts`
5. `src/core/evals/reporter-json.ts`
6. `src/core/evals/reporter-html.ts`
7. `src/core/evals/comparator.ts`
8. `scripts/benchmark-runner.ts`
9. CLI wiring for `ccjk eval run`
10. starter scenario files
11. CI workflow

## 24. Non-Goals

Avoid these in the first implementation slice:

- agent-judged natural language grading
- advanced dashboard frontend framework
- remote benchmark service
- distributed execution
- dynamic scenario generation

## 25. Final Guidance for Claude Code

Optimize for:

- determinism
- small API surface
- stable file formats
- local developer usability
- low maintenance overhead

Do not optimize for:

- maximal abstraction
- speculative future plugin systems
- enterprise-scale reporting in this phase

The first version should be boring, reliable, and easy to extend.

# CCJK Cognitive OS Upgrade Plan

Version: v1.0  
Date: 2026-03-06  
Status: Proposed  
Audience: Product, Architecture, Claude Code implementation agent

## 1. Purpose

This document defines the upgrade path for CCJK from a setup-oriented Claude Code toolkit into a project-aware AI development operating layer.

The primary goal is not to add more features. The goal is to make AI-assisted development:

- more correct
- more context-aware
- more measurable
- more repeatable
- more useful in daily repository work

This document is written to be executable by Claude Code. It includes architecture direction, workstreams, module-level implementation targets, milestones, KPIs, and acceptance criteria.

## 2. Executive Summary

CCJK already provides meaningful value in setup, MCP installation, prompt/workflow import, multi-tool support, cloud sync, and some agent/skill orchestration. That foundation is real, but it is not yet enough to make CCJK indispensable during day-to-day development.

The next version of CCJK should center on one product truth:

**CCJK must make coding agents behave like project-aware engineers, not generic models.**

The most important product moves are:

1. Build a first-class `Context Pack` system for `AGENTS.md` and `CLAUDE.md`
2. Build an `Eval and Benchmark` system to verify all major claims and catch regressions
3. Reposition `skills` as action workflows, not the main carrier of general knowledge
4. Add a `Project Intelligence` layer that extracts repo structure, commands, conventions, and framework/version facts
5. Add a `Measurement and Dashboard` layer so users can see quality, token, and workflow outcomes

## 3. Strategic Positioning

### 3.1 Current Position

CCJK is currently perceived primarily as:

- a setup helper
- an MCP installer
- a workflow/template importer
- a convenience layer for Claude Code and Codex

That is useful, but incomplete.

### 3.2 Target Position

CCJK should be positioned as:

**The AI development operating layer for real repositories**

Expanded definition:

- prepares durable project context
- routes agents toward retrieval-led reasoning
- packages high-value engineering workflows
- enforces engineering constraints and policies
- measures whether AI actually improves outcomes

### 3.3 Internal North Star

Internally, CCJK may use the phrase:

**Cognitive Enhancement OS**

Externally, near term messaging should remain more grounded:

**Project Intelligence and Workflow Control for AI Coding**

This is more credible for the current product maturity.

## 4. Product Principles

All roadmap decisions should follow these principles.

### 4.1 Persistent Context Beats Optional Context

For broad project and framework knowledge, always-available context in `AGENTS.md` / `CLAUDE.md` is more reliable than waiting for the model to decide to invoke a skill.

### 4.2 Retrieval Beats Stale Model Memory

For version-sensitive frameworks and repository-specific conventions, CCJK should push the agent to read local indexed references rather than rely on training data.

### 4.3 Workflows Beat Prompt Improvisation

Repeatable engineering tasks should be encoded as workflows with explicit steps, tooling, validation, and output contracts.

### 4.4 Measurement Beats Intuition

No major capability should be considered complete without benchmark coverage and regression monitoring.

### 4.5 Daily Value Beats One-Time Setup Value

The highest leverage work is what improves every developer task after installation, not just onboarding.

## 5. Diagnosis of Current State

### 5.1 Existing Strengths

- Cross-tool support for Claude Code and Codex
- MCP installation and configuration
- Context writing paths for `AGENTS.md` and `CLAUDE.md`
- Skills, agents, and workflow primitives already exist
- Cloud sync and backup capabilities already exist
- Multiple command surfaces and templates are already in place

### 5.2 Current Gaps

- No robust benchmark framework for product claims
- Context generation is still too generic and not sufficiently repo-aware
- Skill triggering remains heuristic-heavy and brittle
- Integration coverage for some skill systems is mock-based rather than behavior-based
- No unified dashboard showing task quality, token usage, trigger success, or regression trends
- Advanced memory ideas exist conceptually, but outcome value is not yet proven

### 5.3 Main Product Risk

Users may install CCJK successfully but fail to become dependent on it during daily development.

That means the upgrade goal is:

**Make CCJK useful on every meaningful repository task.**

## 6. Product Model

CCJK should be refactored conceptually into five product layers.

### 6.1 Layer A: Context Pack

Purpose:

- always-on project context
- framework/version awareness
- retrieval guidance
- stable engineering rules

Outputs:

- `AGENTS.md`
- `CLAUDE.md`
- compact docs index
- project map summary
- command map
- repo conventions

### 6.2 Layer B: Project Intelligence

Purpose:

- scan and summarize repository intelligence
- identify architecture boundaries
- detect tooling and framework versions
- extract patterns and constraints

Outputs:

- repo topology
- important directories
- framework/version metadata
- test/build/lint command inventory
- generated file zones
- risk zones
- conventions snapshot

### 6.3 Layer C: Workflow Packs

Purpose:

- execute recurring engineering jobs with structure and safety

Examples:

- feature delivery
- test generation
- code review
- debugging
- refactoring
- migration
- release preparation

### 6.4 Layer D: Agent Operations

Purpose:

- coordinate agents
- enforce policy
- capture outcome quality
- support safe multi-agent execution

Outputs:

- task plans
- quality gates
- execution traces
- outcome summaries
- agent scorecards

### 6.5 Layer E: Evaluation and Observability

Purpose:

- quantify product value
- catch regressions
- inform roadmap decisions

Outputs:

- task pass rate
- build/lint/test success rate
- token trends
- latency trends
- trigger precision/recall
- context effectiveness comparisons
- dashboard reports

## 7. The Core Strategic Shift

The main architectural upgrade is:

**Move generic knowledge delivery from skills into Context Packs plus indexed local references.**

This implies:

- broad framework knowledge should live in persistent context and local docs indexes
- repo-specific rules should be generated into persistent context
- skills should focus on procedures, not passive knowledge delivery
- agents should orchestrate execution, not serve as the primary memory mechanism

## 8. User Promise

After the upgrade, a CCJK-enabled repository should make an AI agent:

- understand the repository structure faster
- follow local conventions more reliably
- use correct version-specific framework behavior
- choose more appropriate workflows
- produce fewer non-compiling or non-conforming changes
- require fewer corrective follow-up prompts

## 9. Scope of the Upgrade

### 9.1 In Scope

- Context Pack generation
- Local docs/index generation
- Eval system
- Dashboard
- Skills-to-workflows refactor
- Project intelligence scanner
- Benchmark CI
- Trigger quality instrumentation
- Agent operations observability

### 9.2 Out of Scope for Initial Delivery

- Full enterprise SaaS product
- Full SSO / K8s platform
- General-purpose knowledge graph platform for non-coding domains
- Aggressive cloud-only architecture

These can remain future options, but they are not part of the first implementation program.

## 10. Target Outcomes

### 10.1 Product Outcomes

- CCJK becomes useful beyond setup
- CCJK becomes measurable
- CCJK becomes safer for team use
- CCJK becomes more differentiated from prompt packs and installer wrappers

### 10.2 Technical Outcomes

- deterministic context artifacts
- reproducible benchmarks
- explicit workflow contracts
- observable multi-agent execution
- version-aware retrieval behavior

### 10.3 Business Outcomes

- stronger user retention
- more credible product claims
- clearer differentiation
- higher-value roadmap for future team and enterprise features

## 11. Roadmap Overview

The roadmap is divided into four phases.

## 12. Phase 1: Measurable Foundation

Target release: v14.x  
Time horizon: 1 to 4 weeks

### 12.1 Goals

- establish an eval-first engineering baseline
- build the first production-ready Context Pack system
- make existing value visible with dashboards and reports

### 12.2 Deliverables

1. Eval framework
2. Benchmark runner
3. HTML dashboard viewer
4. Context Pack generator
5. Project intelligence extractor
6. Baseline benchmark scenarios for core subsystems

### 12.3 Required Features

#### A. Eval framework

Add a new module tree:

- `src/core/evals/`
- `evals/`
- `scripts/benchmark_runner.*`

Capabilities:

- task definition loading
- scenario execution
- score aggregation
- baseline vs candidate comparison
- report emission as JSON and HTML

#### B. Context Pack v1

Generate persistent context for:

- Claude Code via `CLAUDE.md`
- Codex via `AGENTS.md`

Content must include:

- project identity
- stack and versions
- repo topology summary
- command inventory
- test policy
- risky directories
- retrieval-first instructions
- local docs index pointers

#### C. Project intelligence extractor

Extract:

- frameworks and versions
- package manager
- language mix
- test/build/lint commands
- major directories and probable module boundaries
- generated file patterns

#### D. Dashboard v1

Generate:

- benchmark summary
- pass/fail counts
- token deltas
- latency deltas
- trend placeholders for future history

### 12.4 KPIs

- benchmark pass rate for covered scenarios >= 95%
- context artifact generation succeeds on supported repos >= 95%
- benchmark report generation succeeds >= 99%
- dashboard generation succeeds >= 99%
- at least 5 high-value scenarios per core subsystem

### 12.5 Acceptance Criteria

- `ccjk eval run` executes benchmark suites locally
- `ccjk context build` generates persistent context artifacts
- benchmark output can compare baseline vs candidate
- HTML dashboard renders without manual post-processing
- CI can run the benchmark workflow non-interactively

## 13. Phase 2: Retrieval-Led Intelligence

Target release: v15.x  
Time horizon: 1 to 3 months

### 13.1 Goals

- improve task correctness through local indexed references
- deepen context generation with framework-specific packs
- instrument trigger and workflow quality

### 13.2 Deliverables

1. Local docs storage format
2. Compressed docs/index injection into persistent context
3. Context freshness and regression checks
4. Trigger quality instrumentation
5. Workflow contract normalization

### 13.3 Required Features

#### A. Local docs store

Introduce:

- `.ccjk/docs/`
- `.ccjk/index/`
- `.ccjk/context/`

Use cases:

- framework version references
- repo-generated architecture notes
- command catalog
- conventions snapshots

#### B. Compressed index format

Inject a compact index into `AGENTS.md` / `CLAUDE.md` rather than full docs content.

The persistent context must tell the agent:

- when to prefer retrieval over model memory
- where to find local docs
- which references are version-matched

#### C. Trigger analytics

Measure:

- trigger precision
- trigger recall
- false activations
- missed opportunities

This should guide improvement, not guesswork.

### 13.4 KPIs

- measurable improvement over baseline on version-sensitive tasks
- trigger false positive rate reduced release-over-release
- context pack size remains bounded while task quality improves

### 13.5 Acceptance Criteria

- local docs/index directories are created deterministically
- persistent context references local docs correctly
- benchmark suites can verify context-vs-no-context deltas
- trigger metrics are emitted in benchmark reports

## 14. Phase 3: Workflow and Agent Operations

Target release: v16.x  
Time horizon: 3 to 6 months

### 14.1 Goals

- refactor skills into clearer workflow packs
- improve multi-agent coordination only where benchmarks justify it
- add enforcement and scorecard layers

### 14.2 Deliverables

1. Workflow pack taxonomy
2. Workflow contracts and validators
3. Agent execution trace model
4. Agent scorecards
5. Optional multi-agent benchmark lanes

### 14.3 Required Features

#### A. Skills refactor

Classify functionality into:

- Context Packs
- Workflow Packs
- Agents
- Policies

Skills should no longer act as the default transport layer for generic knowledge.

#### B. Workflow contracts

Each workflow pack should declare:

- intent
- prerequisites
- allowed tools
- expected steps
- validation obligations
- expected outputs
- rollback or escalation conditions

#### C. Agent scorecards

Track:

- task success
- validation success
- policy violations
- retry rates
- average latency
- tool efficiency

### 14.4 KPIs

- workflow execution success rate improves on covered tasks
- multi-agent mode shows positive benchmark delta before expanded investment
- scorecards surface meaningful quality differentiation between modes

### 14.5 Acceptance Criteria

- workflow packs can be listed, validated, and benchmarked
- scorecard output is available in JSON and dashboard views
- multi-agent mode is benchmark-gated, not assumption-gated

## 15. Phase 4: Team and Platform Expansion

Target release: v16.x+  
Time horizon: 6 to 12 months

### 15.1 Goals

- turn CCJK into a team-grade AI development layer
- add policy distribution and auditability
- support future enterprise packaging

### 15.2 Deliverables

1. Shared team policies
2. audit trail and execution history
3. cloud-synced benchmark summaries
4. team-level context templates
5. marketplace hardening for verified packs

### 15.3 Guardrail

This phase should only expand after:

- Phases 1 and 2 have shipped
- benchmark and dashboard systems are stable
- there is evidence of daily runtime value, not just setup value

## 16. Workstreams

Implementation should proceed through seven coordinated workstreams.

### 16.1 Workstream A: Context Pack System

Owner: Core platform

Responsibilities:

- generate persistent context
- merge with existing project memory safely
- support Claude Code and Codex output targets
- compress indexes

### 16.2 Workstream B: Project Intelligence

Owner: Scanning and analysis

Responsibilities:

- framework and version detection
- repo mapping
- command inference
- convention extraction

### 16.3 Workstream C: Eval Platform

Owner: Quality engineering

Responsibilities:

- scenario definition format
- runner
- scorer
- comparison logic
- output artifacts

### 16.4 Workstream D: Dashboard

Owner: Developer experience

Responsibilities:

- HTML viewer
- benchmark summaries
- trend rendering
- artifact navigation

### 16.5 Workstream E: Workflow Refactor

Owner: Workflow architecture

Responsibilities:

- classify skills vs workflows vs context
- validate workflow contracts
- reduce conceptual overlap

### 16.6 Workstream F: Agent Operations

Owner: Orchestration

Responsibilities:

- execution traces
- scorecards
- optional multi-agent evaluation

### 16.7 Workstream G: CI and Release Safety

Owner: Release engineering

Responsibilities:

- benchmark workflow in CI
- release blocking thresholds
- regression reporting

## 17. Proposed Repository Additions

The following paths should be added or expanded.

### 17.1 New directories

- `evals/`
- `evals/scenarios/`
- `evals/baselines/`
- `evals/reports/`
- `scripts/`
- `src/core/evals/`
- `src/context-pack/`
- `src/project-intelligence/`
- `src/dashboard/`
- `src/policies/`

### 17.2 Suggested internal artifacts

- `.ccjk/context/`
- `.ccjk/index/`
- `.ccjk/docs/`
- `.ccjk/reports/`

## 18. Module-Level Implementation Plan

## 19. `src/core/evals/`

Create modules for:

- `types.ts`
- `scenario-loader.ts`
- `runner.ts`
- `grader.ts`
- `comparator.ts`
- `reporter-json.ts`
- `reporter-html.ts`

Responsibilities:

- load task definitions
- execute runs
- collect metrics
- produce comparable reports

## 20. `src/context-pack/`

Create modules for:

- `builder.ts`
- `compressor.ts`
- `index-writer.ts`
- `claude-writer.ts`
- `codex-writer.ts`
- `merge.ts`

Responsibilities:

- build persistent context
- compress docs indexes
- write target-specific files safely

## 21. `src/project-intelligence/`

Create modules for:

- `stack-detector.ts`
- `command-detector.ts`
- `repo-map.ts`
- `convention-detector.ts`
- `risk-zones.ts`
- `version-detector.ts`

Responsibilities:

- extract repository facts that improve agent reliability

## 22. `src/dashboard/`

Create modules for:

- `summary-model.ts`
- `html-renderer.ts`
- `asset-writer.ts`

Responsibilities:

- generate human-readable benchmark views

## 23. `src/policies/`

Create modules for:

- `policy-types.ts`
- `policy-loader.ts`
- `policy-enforcer.ts`

Responsibilities:

- define and enforce repository or team rules during workflows

## 24. CLI Additions

The CLI should gain the following commands or flags.

### 24.1 New commands

- `ccjk context build`
- `ccjk context refresh`
- `ccjk context doctor`
- `ccjk eval init`
- `ccjk eval run`
- `ccjk eval compare`
- `ccjk dashboard build`

### 24.2 Optional flags

- `--baseline`
- `--report`
- `--html`
- `--json`
- `--scenario`
- `--runs`
- `--tool`

## 25. Scenario Design for Benchmarks

Benchmarks should be written around observable behavior, not implementation details.

### 25.1 Required benchmark categories

- context generation correctness
- framework freshness correctness
- repo convention compliance
- workflow execution correctness
- trigger accuracy
- multi-agent outcome comparison
- token and latency reporting

### 25.2 Benchmark design rules

- each scenario must define expected observable outcomes
- each scenario must avoid leaking answers in prompts
- each scenario must be reproducible
- each scenario must store baseline and candidate results in the same schema

## 26. Quality Gates

No major feature should merge without:

- benchmark coverage
- passing local verification
- updated documentation
- regression comparison if behavior changes

Suggested release gates:

- no regression above threshold on protected benchmark suites
- context artifact generation success across protected repos
- dashboard artifact generation success

## 27. Data Model Guidance

Use stable machine-readable schemas for:

- benchmark scenarios
- benchmark runs
- reports
- scorecards
- context metadata
- project intelligence metadata

Prefer JSON for artifacts and TypeScript types as the source of truth in code.

## 28. Migration Strategy

### 28.1 Backward Compatibility

The upgrade must remain backward compatible for existing users:

- existing setup flows must continue to work
- legacy skill and workflow commands must remain functional during transition
- new context generation should be additive or safely merged

### 28.2 Progressive Rollout

Recommended rollout:

1. experimental flags
2. opt-in stable commands
3. default-on for mature subsystems

## 29. Risk Register

### 29.1 Main Risks

- roadmap sprawl
- over-investment in advanced memory before proving ROI
- dashboard work outrunning benchmark quality
- multi-agent complexity without measurable gain
- context bloat increasing cost without improving outcomes

### 29.2 Mitigations

- keep Phase 1 narrow and measurable
- benchmark before expanding abstractions
- compress persistent context aggressively
- gate multi-agent investment behind measurable improvement

## 30. Success Metrics

Use realistic, evidence-driven metrics.

### 30.1 Phase 1 metrics

- benchmark suite pass rate
- context generation success rate
- dashboard generation success rate
- benchmark execution reliability

### 30.2 Phase 2 metrics

- improvement in version-sensitive coding tasks
- trigger false positive reduction
- measurable repo-convention compliance gains

### 30.3 Phase 3 metrics

- workflow success rate
- scorecard usefulness
- multi-agent positive delta on justified task classes

## 31. What Claude Code Should Build First

Claude Code should implement the roadmap in this order:

1. `src/core/evals/` baseline framework
2. `evals/` scenario format and starter scenarios
3. `src/dashboard/` HTML report generator
4. `src/project-intelligence/` repo and command scanner
5. `src/context-pack/` Context Pack builder for `CLAUDE.md` and `AGENTS.md`
6. CLI commands for eval and context generation
7. CI benchmark workflow

Do not begin advanced memory or large multi-agent expansion before these are complete.

## 32. Definition of Done

This upgrade should be considered materially successful only when all of the following are true:

- CCJK can generate persistent project-aware context artifacts automatically
- CCJK can run benchmark suites and compare results across versions
- users can inspect a dashboard showing outcome quality and token metrics
- repository intelligence meaningfully improves agent behavior on covered tasks
- workflow systems are more clearly separated from passive knowledge delivery

## 33. Immediate Execution Checklist

### 33.1 Week 1

- create `src/core/evals/`
- create `evals/`
- create `scripts/benchmark_runner.*`
- create dashboard HTML generator
- define scenario schema

### 33.2 Week 2

- implement project intelligence scanner
- implement Context Pack builder
- wire `ccjk eval run`
- wire `ccjk context build`

### 33.3 Week 3

- add CI workflow
- add comparison mode
- add trigger metrics
- add starter benchmark suites for core modules

### 33.4 Week 4

- refine outputs
- add docs index compression
- complete migration and release notes

## 34. Final Recommendation

CCJK should not try to become a vague all-purpose AI platform in one step.

It should become excellent at one thing first:

**making coding agents project-aware, measurable, and workflow-safe inside real repositories**

If executed well, that creates a credible path toward a larger Cognitive OS vision later.

## 35. Appendix: Canonical Terminology

Use the following public-facing terms consistently.

- `Context Pack`: persistent, always-on project and framework context
- `Project Intelligence`: extracted repository facts and conventions
- `Workflow Pack`: repeatable procedure for a task
- `Agent Operations`: orchestration, traces, scorecards, quality control
- `Eval`: benchmark scenario and scoring system
- `Dashboard`: human-readable report and trends view

Avoid using overlapping language for the same concept in user-facing documentation.

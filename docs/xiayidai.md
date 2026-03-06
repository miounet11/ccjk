 CCJK Upgrade Plan

  ## 1. Ultimate Positioning

  CCJK should evolve from a setup toolkit into an AI development operating layer.

  Current perception:

  - a CLI that helps configure Claude Code / Codex
  - installs MCP services
  - imports workflows, prompts, agents, skills
  - reduces configuration friction

  Target perception:

  - the control plane for AI-assisted software development
  - the layer that turns general-purpose coding agents into project-aware, workflow-safe, measurable engineering collaborators
  - the product that makes AI usable in real development teams, not just individually impressive

  ### One-sentence positioning

  CCJK is the project intelligence and execution layer that makes coding agents reliable, context-aware, and operationally useful inside real software teams.

  ### Strategic shift

  Move from:

  - installation
  - prompt management
  - tool aggregation

  To:

  - persistent project context
  - workflow orchestration
  - retrieval-led execution
  - team policy enforcement
  - measurable agent quality

  ———

  ## 2. Core Product Thesis

  The article confirms a critical product truth:

  Users do not actually need “more AI features”; they need more reliable AI behavior inside their real repo.

  That means CCJK should optimize for:

  1. Correctness

  - agent uses project-accurate knowledge
  - framework/version mismatch is reduced
  - repo conventions are followed

  2. Controllability

  - the user can shape behavior through context, rules, workflows, policies

  3. Operational leverage

  - setup once, benefit every day
  - works across tasks, not only during explicit slash commands

  4. Measurability

  - prove that a feature improves outcomes
  - evaluate pass rate, correctness, workflow compliance, and context usage

  ———

  ## 3. Product North Star

  ### North Star

  Make coding agents act like project-native engineers, not generic models.

  ### User promise

  When a user installs CCJK, the agent should:

  - know the repo structure
  - respect team rules
  - use the right docs and versions
  - choose safer workflows
  - produce outputs that are easier to merge
  - reduce rework and supervision cost

  ### Success metric

  A CCJK-enabled repo should show measurable improvement on:

  - task completion quality
  - reduced wrong-framework usage
  - reduced repo-style drift
  - reduced configuration/setup time
  - increased first-pass acceptance of AI-generated changes

  ———

  ## 4. Product Architecture Direction

  CCJK should become a four-layer system.

  ### Layer 1. Context Layer

  Purpose:

  - persistent project intelligence
  - framework/version-aware repo memory
  - always available to agent

  Artifacts:

  - AGENTS.md
  - CLAUDE.md
  - compressed docs index
  - project map
  - engineering rules
  - local reference pointers

  This is the most important upgrade.

  ### Layer 2. Retrieval Layer

  Purpose:

  - allow the agent to fetch accurate information from local project resources
  - shift from memory-led reasoning to retrieval-led reasoning

  Artifacts:

  - .ccjk/docs/
  - .ccjk/index/
  - framework-specific local docs
  - repo-generated knowledge index
  - architecture references
  - conventions registry

  ### Layer 3. Workflow Layer

  Purpose:

  - codify engineering tasks into repeatable execution patterns

  Artifacts:

  - skills
  - prompts
  - agents
  - multi-agent workflows
  - quality gates
  - review flows
  - migration flows
  - release flows

  ### Layer 4. Evaluation Layer

  Purpose:

  - prove improvements
  - compare context strategies
  - identify regressions

  Artifacts:

  - benchmark tasks
  - project-specific eval suites
  - pass/fail metrics
  - skill trigger metrics
  - context usage metrics
  - workflow compliance metrics

  ———

  ## 5. Ultimate Product Model

  CCJK should be organized around three product pillars.

  ## Pillar A. Project Intelligence

  This is the new center of gravity.

  What it does:

  - detects stack, framework, version, test tools, CI, deployment, architecture patterns
  - generates compressed persistent context
  - builds repo-specific local knowledge packs
  - continuously updates project memory as repo changes

  Deliverables:

  - project-aware AGENTS.md / CLAUDE.md
  - local framework docs pack
  - architecture index
  - dependency intelligence
  - team rules memory

  Why it matters:

  - this produces horizontal gains across every task
  - this is where the article’s insight applies most strongly

  ———

  ## Pillar B. Execution Workflows

  This remains important, but should be narrowed to high-value workflows.

  What it does:

  - turns recurrent engineering tasks into reliable guided operations

  Examples:

  - implement feature
  - write tests
  - debug systematically
  - review PR
  - migrate framework
  - release version
  - onboard a new repo
  - incident diagnosis

  Key rule:
  Skills should specialize in action. Context should specialize in knowledge.

  ———

  ## Pillar C. Agent Operations

  This is how CCJK becomes team-grade rather than solo-tooling.

  What it does:

  - governs how agents behave in real development
  - provides safety, auditability, traceability, coordination

  Examples:

  - quality gates before edit completion
  - tool access policies
  - context freshness checks
  - workflow usage analytics
  - execution logs
  - agent performance scoring
  - team policy enforcement

  ———

  ## 6. Strategic Diagnosis of Current CCJK

  Current strengths:

  - broad integration surface
  - already supports Codex and Claude Code
  - existing skills/agents/workflow abstractions
  - existing context file writing path
  - existing CLI distribution model
  - strong practical value in setup/configuration

  Current limitations:

  - context system is not yet the core product
  - skills are doing too much conceptually
  - trigger logic is still heuristic-heavy
  - evaluation appears weaker than required for platform decisions
  - user value may still feel “front-loaded” during setup rather than “compounding” during daily development

  This creates a product risk:
  Users install CCJK once, but may not feel deep daily dependence.

  The upgrade goal is:
  make CCJK valuable on every task, every day, inside the repo.

  ———

  ## 7. Target Product Identity

  CCJK should position itself as:

  ### External identity

  “The operating layer for AI coding inside real repositories.”

  ### Internal identity

  A system that:

  - prepares context
  - routes retrieval
  - orchestrates workflows
  - enforces engineering policy
  - measures outcome quality

  ### What CCJK should not become

  Avoid being perceived as:

  - just another prompt pack
  - a thin wrapper around MCP installs
  - a marketplace of loosely related templates
  - a feature collection without a product center

  ———

  ## 8. Major Upgrade Themes

  ## Theme 1. From Setup Tool to Runtime Intelligence

  ### Goal

  Make CCJK useful after installation, during every development task.

  ### Product changes

  Add:

  - automatic project indexing
  - context refresh
  - repo memory generation
  - framework/version awareness
  - task-aware retrieval hints

  Proposed commands:

  - ccjk context build
  - ccjk context refresh
  - ccjk context doctor
  - ccjk docs sync
  - ccjk repo map

  ———

  ## Theme 2. From Generic Prompts to Retrieval-Led Engineering

  ### Goal

  Reduce hallucinated framework usage and stale patterns.

  ### Product changes

  For each supported framework:

  - detect version
  - fetch or bundle matching docs
  - store locally
  - inject compressed reference index into persistent context

  For each repo:

  - generate local references:
      - architecture paths
      - naming conventions
      - test commands
      - deployment rules
      - style constraints
      - anti-patterns
      - key entrypoints

  This should become a flagship feature.

  ———

  ## Theme 3. From Skills as Knowledge Packs to Skills as Action Packs

  ### Goal

  Clarify product model and improve reliability.

  ### Reframe skills

  Use skills for:

  - guided execution
  - procedural workflows
  - multi-step specialized actions
  - repeatable operational playbooks

  Do not rely on skills for:

  - broad framework memory
  - general project knowledge
  - passive context delivery

  ### New classification

  1. Context Packs

  - passive
  - always-on
  - compressed
  - durable
  - framework/repo aware

  2. Skills

  - active
  - workflow-oriented
  - tool-using
  - explicit or semi-explicit activation

  3. Agents

  - role-based orchestrators
  - task decomposition and execution

  ———

  ## Theme 4. From Features to Outcome Measurement

  ### Goal

  Ensure every new capability is validated.

  ### Product changes

  Build an eval subsystem for:

  - baseline vs context pack
  - baseline vs skill
  - context pack + workflow
  - framework version tasks
  - repo convention tasks
  - multi-agent tasks
  - safety/compliance tasks

  Metrics:

  - pass rate
  - build success
  - lint success
  - test success
  - rule compliance
  - documentation retrieval usage
  - unnecessary tool use
  - rework rate

  Without this, roadmap decisions will remain intuition-driven.

  ———

  ## 9. New Flagship Features

  ## 9.1 Context Packs

  ### What it is

  A generated, compressed persistent project context system.

  ### Contains

  - project summary
  - stack + version map
  - repo topology
  - command map
  - testing policy
  - architecture conventions
  - local docs index
  - framework docs pointers
  - team rules
  - retrieval-first instructions

  ### Output targets

  - AGENTS.md
  - CLAUDE.md
  - .ccjk/context/
  - .ccjk/docs/
  - .ccjk/index/

  ### User value

  - instant accuracy gains across all tasks
  - less need to re-explain the repo
  - better compliance with local conventions

  ———

  ## 9.2 Repo Memory Engine

  ### What it is

  A background or on-demand system that extracts stable project intelligence.

  ### Extracts

  - important directories
  - service boundaries
  - build/test/lint commands
  - architectural modules
  - framework entrypoints
  - dangerous zones
  - generated files
  - business-critical files
  - coding patterns used in repo

  ### User value

  - agents stop treating the repo as unknown territory

  ———

  ## 9.3 Workflow Packs

  ### What it is

  High-value operational bundles.

  Examples:

  - Feature Delivery Pack
  - Test Generation Pack
  - Debugging Pack
  - Refactor Pack
  - Migration Pack
  - Release Pack
  - Incident Triage Pack
  - Security Review Pack

  Each pack includes:

  - procedure
  - tools
  - context dependencies
  - required verification
  - output contract

  ———

  ## 9.4 Team Policy Layer

  ### What it is

  A policy model that makes AI behavior team-compatible.

  Policies:

  - never edit generated files
  - require tests for logic changes
  - require architecture review for module boundary changes
  - do not modify infra without approval
  - safe commands only by default
  - mandatory verification steps for risky changes

  ### User value

  - transforms CCJK from convenience software into governance software

  ———

  ## 9.5 Agent Scorecards

  ### What it is

  Measure agent usefulness and reliability over time.

  Metrics:

  - task success
  - build/test pass rate
  - policy violations
  - rollback frequency
  - prompt/context sensitivity
  - time saved estimates

  ### User value

  - visibility
  - trust
  - enterprise readiness

  ———

  ## 10. Product Segmentation

  CCJK should serve three user levels.

  ## Level 1. Solo Developer

  Needs:

  - fast setup
  - better repo context
  - fewer hallucinations
  - reusable workflows

  Core offer:

  - Context Packs
  - Workflow Packs
  - MCP install
  - model/provider setup

  ## Level 2. Small Team

  Needs:

  - shared standards
  - repeatable workflows
  - consistent AI behavior

  Core offer:

  - team policy layer
  - shared context templates
  - repo memory
  - workflow governance
  - review and testing workflows

  ## Level 3. Engineering Organization

  Needs:

  - predictable AI operations
  - auditability
  - evaluation and quality reporting

  Core offer:

  - eval suite
  - scorecards
  - compliance policies
  - standardized rollout
  - multi-repo context strategy

  ———

  ## 11. Competitive Direction

  CCJK should differentiate on operational depth, not model novelty.

  Compete on:

  - repo understanding
  - engineering reliability
  - workflow enforcement
  - cross-tool support
  - context generation
  - measurable outcomes

  Do not compete on:

  - being the most conversational
  - being the prettiest prompt pack
  - supporting the most random templates

  ### Defensible moat

  The moat is:

  - project-aware context generation
  - workflow operationalization
  - cross-agent compatibility
  - evaluation infrastructure
  - team policy layer

  ———

  ## 12. Proposed Product Structure

  Recommended top-level product narrative:

  ### 1. Setup

  - install tools
  - configure providers
  - install MCP
  - connect models

  ### 2. Understand My Repo

  - detect stack
  - map architecture
  - generate context pack
  - build docs index

  ### 3. Help Me Execute

  - use workflows
  - run agents
  - apply skills
  - enforce verification

  ### 4. Improve Over Time

  - refresh context
  - run evals
  - inspect scorecards
  - refine workflows

  This structure is much stronger than today’s likely perception of “CLI utilities plus templates.”

  ———

  ## 13. Recommended Roadmap

  ## Phase 1. Foundation Repositioning

  Timeline: 1-2 releases

  ### Objectives

  - establish Project Intelligence as the primary product axis
  - ship first Context Pack capability
  - improve persistent context quality

  ### Deliverables

  - ccjk context build
  - framework/version detection improvements
  - repo map generation
  - compressed AGENTS.md / CLAUDE.md injection
  - local docs directory structure
  - retrieval-first prompt rules

  ### Success criteria

  - users see better task quality without changing workflow habits
  - context-generated repos outperform baseline on internal evals

  ———

  ## Phase 2. Reliability System

  Timeline: 2-3 releases

  ### Objectives

  - make product decisions evidence-based
  - harden quality measurement

  ### Deliverables

  - ccjk eval run
  - benchmark task definitions
  - framework freshness evals
  - repo-convention evals
  - workflow compliance evals
  - dashboard or CLI score summary

  ### Success criteria

  - every major feature is benchmarked
  - context pack effectiveness is measurable

  ———

  ## Phase 3. Workflow Refactor

  Timeline: 2 releases

  ### Objectives

  - clarify skill/agent/workflow responsibilities
  - reduce conceptual sprawl

  ### Deliverables

  - define Context Pack as first-class artifact
  - redefine skills as action packs
  - simplify trigger strategy
  - improve workflow package taxonomy
  - publish recommended workflow catalog

  ### Success criteria

  - users understand when to use context vs skill vs agent
  - fewer support/confusion cases

  ———

  ## Phase 4. Team Mode

  Timeline: 3-4 releases

  ### Objectives

  - move from individual utility to team infrastructure

  ### Deliverables

  - shared team policies
  - repo policy files
  - policy-aware workflows
  - quality gates
  - agent audit trail
  - workflow adoption analytics

  ### Success criteria

  - CCJK is usable as an engineering standardization layer

  ———

  ## Phase 5. Platform Expansion

  Timeline: later

  ### Objectives

  - scale ecosystem and distribution

  ### Deliverables

  - framework-specific context pack marketplace
  - verified workflow packs
  - enterprise team templates
  - organization-level scorecards
  - cloud sync for context/evals/policies

  ### Success criteria

  - CCJK becomes the default way teams operationalize AI coding tools

  ———

  ## 14. Technical Upgrade Plan

  ## A. Context System Redesign

  Current:

  - generic rules + prompt styles

  Target:

  - layered context generation

  Proposed context sections:

  1. Project identity
  2. stack and versions
  3. architecture map
  4. critical commands
  5. coding conventions
  6. testing policy
  7. risky zones
  8. local docs index
  9. retrieval-first rules
  10. workflow hints

  ### Compression strategy

  Store full knowledge locally, inject compact index into persistent context.

  This directly borrows the strongest insight from the article.

  ———

  ## B. Local Knowledge Store

  Introduce:

  - .ccjk/docs/
  - .ccjk/index/
  - .ccjk/memory/
  - .ccjk/evals/

  Suggested contents:

  - framework docs
  - architecture snapshots
  - commands.json
  - repo-map.json
  - conventions.md
  - anti-patterns.md
  - eval scenarios

  ———

  ## C. Workflow Refactoring

  Skill metadata should explicitly separate:

  - passive applicability
  - required context
  - procedural steps
  - validation obligations
  - expected outputs

  Each workflow should define:

  - intent
  - prerequisites
  - steps
  - tools
  - validation
  - output contract
  - escalation conditions

  ———

  ## D. Evaluation Framework

  Introduce:

  - ccjk eval init
  - ccjk eval run
  - ccjk eval compare

  Test categories:

  - framework-freshness
  - repo-convention-compliance
  - bug-fix quality
  - test-generation quality
  - refactor safety
  - multi-agent coordination

  Scoring:

  - build
  - lint
  - tests
  - policy compliance
  - correct file targeting
  - doc retrieval evidence

  ———

  ## E. Telemetry and Analytics

  If enabled by user/team:

  - workflow usage frequency
  - trigger success rate
  - context refresh frequency
  - eval improvement over time
  - failure modes

  This should be privacy-conscious and optional.

  ———

  ## 15. User Experience Upgrade

  ## Current risk

  Too many concepts:

  - workflow
  - skills
  - agents
  - prompts
  - MCP
  - setup
  - cloud
  - templates

  ## UX principle

  Users should understand CCJK in three minutes.

  ### Suggested UX simplification

  Primary menu:

  1. Setup Environment
  2. Build Project Context
  3. Install Workflows
  4. Run Agent Tasks
  5. Evaluate AI Quality
  6. Team Policies
  7. Sync and Backup

  ### Product language cleanup

  Use fewer overlapping words.

  Recommended canonical terms:

  - Context Pack
  - Workflow Pack
  - Agent
  - Policy
  - Eval

  Avoid presenting “skill”, “workflow”, “prompt”, and “template” as separate first-class user concepts unless needed.

  Internally they can remain separate. Externally they should be simplified.

  ———

  ## 16. Messaging Upgrade

  ## Website / README messaging

  Current-style value:

  - simplify setup
  - one-click install
  - presets

  Future value:

  - make AI coding reliable in your repo
  - give agents project-native context
  - enforce team workflows and engineering rules
  - measure whether AI is actually helping

  ### Better headline

  Turn generic coding agents into repo-aware engineering collaborators.

  ### Better subheadline

  CCJK builds project context, installs workflows, enforces policies, and measures AI coding quality across Claude Code, Codex, and more.

  ———

  ## 17. Recommended Strategic Principles

  1. Persistent context beats optional context for general knowledge
  2. Retrieval beats stale memory for versioned frameworks
  3. Workflow beats freeform prompting for repeatable tasks
  4. Measurement beats intuition for product evolution
  5. Daily compounding value beats one-time setup convenience
  6. Governance and trust create long-term defensibility

  ———

  ## 18. Final Product Vision

  The end-state for CCJK is not:

  - “a nice CLI for configuring agents”

  The end-state is:

  - the standard operating layer for AI-assisted software engineering

  In that future, CCJK does five things exceptionally well:

  1. understands the repo
  2. gives agents the right context
  3. routes them through the right workflows
  4. enforces engineering rules
  5. proves quality with evals

  That is the strongest possible direction for this project.

  ———

  ## 19. Executive Summary

  ### Ultimate positioning

  CCJK should become the AI development operating layer for software teams.

  ### Primary strategic change

  Promote persistent project context to the center of the product.

  ### Product model

  - Context Packs for passive knowledge
  - Workflow Packs for action
  - Agents for orchestration
  - Policies for governance
  - Evals for measurement

  ### Most important next moves

  1. Ship Context Packs
  2. Build eval infrastructure
  3. Reframe skills as procedural workflows
  4. Add team policy layer
  5. Simplify product language and UX

  ### Long-term outcome

  CCJK becomes indispensable not because it helps users start faster, but because it makes AI development materially better every day.

  ## 20. Immediate Next Recommendation

  If you want, the best next step is for me to turn this into a formal product strategy package with these three deliverables:

  1. PRD: CCJK Context Pack System
  2. ADR: Context Packs vs Skills vs Agents architecture decision
  3. 12-month roadmap: release-by-release execution plan with milestones, KPIs, and feature breakdown

  If you want that, I will write the full set in a directly usable format.

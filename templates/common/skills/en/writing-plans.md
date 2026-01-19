---
name: writing-plans
description: Create detailed implementation plans with checkpoints
version: 1.0.0
author: CCJK
category: planning
triggers:
  - /plan
  - /wp
  - /write-plan
use_when:
  - "User needs implementation plan"
  - "After brainstorming session"
  - "User mentions planning or roadmap"
  - "Complex feature needs breakdown"
auto_activate: true
priority: 7
difficulty: intermediate
tags:
  - planning
  - implementation
  - roadmap
---

# Writing Plans

## Context
$ARGUMENTS

## Instructions

Create a detailed implementation plan following this structure:

### Plan Template

```markdown
# Implementation Plan: [Feature Name]

## Overview
- **Goal**: What we're building
- **Scope**: What's included/excluded
- **Timeline**: Estimated effort

## Prerequisites
- [ ] Required dependencies
- [ ] Environment setup
- [ ] Access/permissions needed

## Implementation Steps

### Phase 1: [Foundation]
- [ ] Step 1.1: [Description]
- [ ] Step 1.2: [Description]
- **Checkpoint**: [Verification criteria]

### Phase 2: [Core Implementation]
- [ ] Step 2.1: [Description]
- [ ] Step 2.2: [Description]
- **Checkpoint**: [Verification criteria]

### Phase 3: [Integration & Testing]
- [ ] Step 3.1: [Description]
- [ ] Step 3.2: [Description]
- **Checkpoint**: [Verification criteria]

## Risk Assessment
- Risk 1: [Description] → Mitigation: [Strategy]

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### Guidelines
- Break work into 2-4 hour chunks
- Include verification checkpoints
- Identify dependencies between steps
- Consider rollback strategies

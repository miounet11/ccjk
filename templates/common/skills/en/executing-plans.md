---
name: executing-plans
description: Execute implementation plans with checkpoint verification
version: 1.0.0
author: CCJK
category: dev
triggers:
  - /execute
  - /ep
  - /run-plan
use_when:
  - "User has approved plan"
  - "Ready to implement"
  - "User mentions executing or starting implementation"
auto_activate: false
priority: 6
difficulty: intermediate
tags:
  - execution
  - implementation
  - checkpoints
---

# Executing Plans

## Context
$ARGUMENTS

## Instructions

Execute the implementation plan systematically:

### Execution Protocol

1. **Before Each Step**
   - Confirm current step with user
   - Check prerequisites are met
   - Identify potential blockers

2. **During Implementation**
   - Work in small, verifiable increments
   - Write tests before production code (TDD)
   - Commit frequently with clear messages

3. **At Checkpoints**
   - Verify all criteria are met
   - Run relevant tests
   - Get user confirmation before proceeding

4. **If Issues Arise**
   - Stop and report the issue
   - Propose solutions
   - Wait for user decision

### Checkpoint Verification

```markdown
## Checkpoint: [Name]

### Completed Steps
- [x] Step 1
- [x] Step 2

### Verification
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated

### Ready to proceed? (y/n)
```

### Rules
- Never skip checkpoints
- Always verify before moving forward
- Document any deviations from plan

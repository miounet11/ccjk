---
name: systematic-debugging
description: Four-phase systematic debugging process
version: 1.0.0
author: CCJK
category: debugging
triggers:
  - /debug
  - /sd
  - /troubleshoot
use_when:
  - "User reports a bug"
  - "Something is not working"
  - "User mentions debugging or fixing"
  - "Error messages or unexpected behavior"
auto_activate: true
priority: 8
difficulty: intermediate
tags:
  - debugging
  - troubleshooting
  - problem-solving
---

# Systematic Debugging

## Context
$ARGUMENTS

## Instructions

Follow the four-phase debugging process:

### Phase 1: Reproduce
- Understand the expected vs actual behavior
- Create minimal reproduction steps
- Identify consistent reproduction conditions

### Phase 2: Isolate
- Narrow down the problem area
- Use binary search to find the issue
- Check recent changes that might be related

### Phase 3: Identify Root Cause
- Examine the code path
- Check logs and error messages
- Verify assumptions about data/state

### Phase 4: Fix and Verify
- Implement the fix
- Write a test that would have caught this
- Verify the fix doesn't break other things

### Debugging Checklist

```markdown
## Bug Report

**Expected**: [What should happen]
**Actual**: [What actually happens]
**Steps to Reproduce**:
1. ...
2. ...

## Investigation

**Hypothesis 1**: [Theory]
- Evidence for: ...
- Evidence against: ...
- Verdict: [Confirmed/Rejected]

## Root Cause
[Description of the actual cause]

## Fix
[Description of the solution]

## Verification
- [ ] Bug no longer reproduces
- [ ] Regression test added
- [ ] Related areas tested
```

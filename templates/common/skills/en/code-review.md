---
name: code-review
description: Two-stage code review - spec compliance and code quality
version: 1.0.0
author: CCJK
category: review
triggers:
  - /review
  - /cr
  - /code-review
use_when:
  - "User wants code review"
  - "PR ready for review"
  - "User mentions reviewing code"
  - "Before merging changes"
auto_activate: true
priority: 7
difficulty: intermediate
tags:
  - review
  - quality
  - pr
---

# Code Review

## Context
$ARGUMENTS

## Instructions

Perform a two-stage code review:

### Stage 1: Spec Compliance Review

Check if the implementation matches requirements:

- [ ] All requirements implemented
- [ ] Acceptance criteria met
- [ ] No scope creep (extra unrequested features)
- [ ] Edge cases from spec handled

### Stage 2: Code Quality Review

Check code quality aspects:

- [ ] **Correctness**: Logic is correct
- [ ] **Readability**: Code is clear and understandable
- [ ] **Maintainability**: Easy to modify in future
- [ ] **Performance**: No obvious performance issues
- [ ] **Security**: No security vulnerabilities
- [ ] **Testing**: Adequate test coverage

### Review Output Format

```markdown
## Code Review: [PR/Feature Name]

### Stage 1: Spec Compliance
- ✅ Requirement 1: Implemented correctly
- ⚠️ Requirement 2: Partially implemented - [details]
- ❌ Requirement 3: Missing - [details]

### Stage 2: Code Quality

#### Strengths
- Good separation of concerns
- Clear naming conventions

#### Issues Found
1. **[Severity]** [File:Line] - [Description]
   - Suggestion: [How to fix]

2. **[Severity]** [File:Line] - [Description]
   - Suggestion: [How to fix]

### Verdict
- [ ] Approved
- [ ] Approved with minor changes
- [ ] Changes requested
```

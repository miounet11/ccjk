---
name: tdd-workflow
description: Test-driven development - write tests before production code
version: 1.0.0
author: CCJK
category: testing
triggers:
  - /tdd
  - /test-first
use_when:
  - "User mentions TDD"
  - "Writing new function or feature"
  - "User wants test-driven approach"
auto_activate: false
priority: 6
difficulty: intermediate
tags:
  - tdd
  - testing
  - development
---

# TDD Workflow

## Context
$ARGUMENTS

## Instructions

Follow strict Test-Driven Development:

### The TDD Cycle

```
┌─────────────────────────────────────┐
│  1. RED: Write failing test         │
│         ↓                           │
│  2. GREEN: Write minimal code       │
│         ↓                           │
│  3. REFACTOR: Improve code          │
│         ↓                           │
│  (repeat)                           │
└─────────────────────────────────────┘
```

### Rules

1. **No production code without a failing test**
   - Write the test first
   - See it fail
   - Then write the code

2. **Write minimal code to pass**
   - Don't over-engineer
   - Just make the test pass
   - Refactor later

3. **Refactor with confidence**
   - Tests are your safety net
   - Improve design incrementally
   - Keep tests passing

### TDD Session Format

```markdown
## TDD Session: [Feature]

### Cycle 1
**Test**: [Test description]
```typescript
test('should ...', () => {
  // test code
})
```
**Status**: 🔴 RED

**Implementation**:
```typescript
// minimal code
```
**Status**: 🟢 GREEN

**Refactor**: [What was improved]

### Cycle 2
...
```

### Benefits
- Better design through testability
- Confidence in changes
- Living documentation
- Fewer bugs

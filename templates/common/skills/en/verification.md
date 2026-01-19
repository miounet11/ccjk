---
name: verification
description: Evidence-based completion verification before finishing
version: 1.0.0
author: CCJK
category: review
triggers:
  - /verify
  - /check
  - /done
use_when:
  - "Before completing a task"
  - "User asks to verify work"
  - "Ready to mark as done"
  - "Final review needed"
auto_activate: true
priority: 9
difficulty: beginner
tags:
  - verification
  - quality
  - completion
---

# Verification

## Context
$ARGUMENTS

## Instructions

Before marking any task as complete, verify with evidence:

### Verification Checklist

1. **Requirements Met**
   - [ ] All acceptance criteria satisfied
   - [ ] Edge cases handled
   - [ ] Error cases handled

2. **Code Quality**
   - [ ] Code follows project conventions
   - [ ] No obvious bugs or issues
   - [ ] Appropriate error handling

3. **Testing**
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

4. **Documentation**
   - [ ] Code comments where needed
   - [ ] README updated if applicable
   - [ ] API docs updated if applicable

### Evidence Format

```markdown
## Verification Report

### Task: [Description]

### Evidence of Completion

1. **Requirement 1**: ✅
   - Evidence: [Screenshot/test output/code reference]

2. **Requirement 2**: ✅
   - Evidence: [Screenshot/test output/code reference]

### Test Results
- Unit tests: ✅ All passing
- Integration: ✅ All passing

### Ready for Review: Yes/No
```

### Rules
- Never claim completion without evidence
- If something can't be verified, flag it
- Ask for clarification if requirements are unclear

# Code Review

Perform comprehensive code review with focus on quality, security, and best practices.

## Triggers

- **command**: `/review` - Trigger with slash command
- **pattern**: `review this code` - Natural language trigger
- **pattern**: `审查代码` - Chinese language trigger
- **pattern**: `check my changes` - Alternative trigger

## Actions

### Action 1: bash

Get the diff of changes to review.

```bash
git diff HEAD~1 --unified=5
```

### Action 2: prompt

Perform comprehensive code review.

```
Review the code changes with focus on:

## Code Quality
- Code readability and clarity
- Naming conventions
- Code organization and structure
- DRY principle adherence
- SOLID principles compliance

## Potential Issues
- Logic errors or bugs
- Edge cases not handled
- Error handling gaps
- Performance concerns
- Memory leaks

## Security
- Input validation
- SQL injection risks
- XSS vulnerabilities
- Authentication/authorization issues
- Sensitive data exposure

## Best Practices
- TypeScript type safety
- Test coverage
- Documentation needs
- Accessibility concerns

Provide specific, actionable feedback with code examples where helpful.
```

## Requirements

- **context**: git-repository - Must be in a git repository

---

**Category:** code-quality
**Priority:** 8
**Tags:** code-review, quality, security, best-practices
**Source:** smart-analysis

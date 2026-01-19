---
name: pr-review
description: Comprehensive PR review with security, performance, and code quality checks
version: 1.0.0
author: CCJK
category: review
triggers:
  - /pr-review
  - /review-pr
  - /pr
use_when:
  - "User wants to review a pull request"
  - "PR needs code review"
  - "Merge request review"
  - "User mentions reviewing changes"
auto_activate: true
priority: 8
difficulty: intermediate
tags:
  - pr
  - review
  - git
  - code-quality
allowed-tools:
  - Bash(git *)
  - Read
  - Grep
  - Glob
  - LSP
context: fork
user-invocable: true
hooks:
  - type: SkillActivate
    command: echo "Starting PR review..."
  - type: SkillComplete
    command: echo "PR review completed"
---

# PR Review Skill

Comprehensive pull request review workflow with automated checks for code quality, security, performance, and test coverage.

## Workflow Steps

### 1. Change Analysis

First, analyze the PR changes:

```bash
# Get current branch and target branch
git branch --show-current
git log --oneline origin/main..HEAD

# Get changed files
git diff --name-only origin/main...HEAD

# Get detailed diff statistics
git diff --stat origin/main...HEAD
```

**Analysis Checklist:**
- [ ] Identify all modified files
- [ ] Categorize changes (features, fixes, refactors, docs)
- [ ] Check for breaking changes
- [ ] Verify commit message quality
- [ ] Check for merge conflicts

### 2. Code Quality Check

Review code quality across all changed files:

**For each changed file:**

1. **Read the file** using the Read tool
2. **Check for code smells:**
   - Duplicated code
   - Long functions (>50 lines)
   - Complex conditionals (>3 levels)
   - Magic numbers/strings
   - Inconsistent naming conventions

3. **Verify best practices:**
   - Proper error handling
   - Input validation
   - Logging appropriateness
   - Comment quality
   - Code documentation

4. **Check TypeScript/JavaScript specific:**
   - Type safety (TypeScript)
   - Async/await usage
   - Promise handling
   - Memory leak potential
   - Proper imports/exports

### 3. Security Review

Perform security analysis:

**Security Checklist:**
- [ ] No hardcoded credentials or API keys
- [ ] No sensitive data in logs
- [ ] Proper input sanitization
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication/authorization checks
- [ ] Dependency vulnerabilities

**Search for common security issues:**

```bash
# Search for potential secrets
git grep -i "password\|secret\|api_key\|token" -- '*.ts' '*.js' '*.json'

# Check for console.log in production code
git grep "console\\.log" -- 'src/**/*.ts' 'src/**/*.js'

# Look for eval or dangerous functions
git grep -E "eval\(|Function\(|setTimeout.*string|setInterval.*string"
```

### 4. Performance Review

Analyze performance implications:

**Performance Checklist:**
- [ ] No unnecessary re-renders (React)
- [ ] Efficient data structures
- [ ] Proper caching strategies
- [ ] Database query optimization
- [ ] No N+1 query problems
- [ ] Lazy loading where appropriate
- [ ] Bundle size impact
- [ ] Memory usage considerations

**Check for performance anti-patterns:**
- Synchronous operations in loops
- Unnecessary API calls
- Large data processing without pagination
- Missing indexes (database)
- Inefficient algorithms (O(n²) or worse)

### 5. Test Coverage

Verify test coverage for changes:

```bash
# Find test files for changed files
git diff --name-only origin/main...HEAD | grep -E '\.(test|spec)\.(ts|js)$'

# Check if new code has corresponding tests
# For each changed source file, verify test file exists
```

**Test Coverage Checklist:**
- [ ] Unit tests for new functions
- [ ] Integration tests for new features
- [ ] Edge case coverage
- [ ] Error handling tests
- [ ] Mock/stub usage appropriateness
- [ ] Test naming clarity
- [ ] Assertion quality

### 6. Architecture & Design

Review architectural decisions:

**Architecture Checklist:**
- [ ] Follows project patterns
- [ ] Proper separation of concerns
- [ ] SOLID principles adherence
- [ ] DRY principle (Don't Repeat Yourself)
- [ ] Appropriate abstraction levels
- [ ] Dependency injection usage
- [ ] Module coupling/cohesion

### 7. Documentation Review

Check documentation quality:

**Documentation Checklist:**
- [ ] README updates (if needed)
- [ ] API documentation
- [ ] Inline comments for complex logic
- [ ] JSDoc/TSDoc comments
- [ ] CHANGELOG updates
- [ ] Migration guides (breaking changes)

## Output Format

Provide review results in the following structured format:

```markdown
# PR Review Summary

## Overview
- **Branch**: [branch-name]
- **Target**: [target-branch]
- **Files Changed**: [count]
- **Lines Added**: [count]
- **Lines Removed**: [count]

## Change Summary
[Brief description of what this PR does]

## Review Results

### ✅ Strengths
- [List positive aspects]
- [Good practices observed]
- [Well-implemented features]

### ⚠️ Issues Found

#### 🔴 Critical Issues
- **[File:Line]**: [Description]
  - **Impact**: [Explanation]
  - **Recommendation**: [How to fix]

#### 🟡 Warnings
- **[File:Line]**: [Description]
  - **Suggestion**: [Improvement recommendation]

#### 🔵 Suggestions
- **[File:Line]**: [Description]
  - **Enhancement**: [Optional improvement]

### Security Analysis
- **Status**: ✅ Pass / ⚠️ Issues Found / 🔴 Critical
- **Findings**: [List security concerns if any]

### Performance Analysis
- **Status**: ✅ Good / ⚠️ Concerns / 🔴 Issues
- **Findings**: [List performance concerns if any]

### Test Coverage
- **Status**: ✅ Adequate / ⚠️ Insufficient / 🔴 Missing
- **Coverage**: [Percentage if available]
- **Missing Tests**: [List areas needing tests]

### Code Quality Score
- **Overall**: [Score out of 10]
- **Maintainability**: [Score]
- **Readability**: [Score]
- **Testability**: [Score]

## Recommendations

### Must Fix (Before Merge)
1. [Critical issue 1]
2. [Critical issue 2]

### Should Fix (High Priority)
1. [Important issue 1]
2. [Important issue 2]

### Nice to Have (Optional)
1. [Enhancement 1]
2. [Enhancement 2]

## Approval Status
- [ ] ✅ **Approved** - Ready to merge
- [ ] ⚠️ **Approved with Comments** - Can merge but address comments
- [ ] 🔴 **Changes Requested** - Must fix issues before merge

## Additional Notes
[Any other observations or context]
```

## Best Practices

1. **Be Constructive**: Focus on improvement, not criticism
2. **Be Specific**: Point to exact files and lines
3. **Explain Why**: Don't just say what's wrong, explain the impact
4. **Suggest Solutions**: Provide actionable recommendations
5. **Acknowledge Good Work**: Highlight positive aspects
6. **Consider Context**: Understand project constraints and deadlines
7. **Use Examples**: Show better alternatives when suggesting changes

## Common Review Patterns

### Pattern 1: Feature Addition
- Verify feature completeness
- Check for feature flags
- Validate error handling
- Ensure backward compatibility

### Pattern 2: Bug Fix
- Verify root cause addressed
- Check for regression tests
- Validate fix doesn't introduce new issues
- Review related code areas

### Pattern 3: Refactoring
- Ensure behavior unchanged
- Verify test coverage maintained
- Check for performance impact
- Validate code simplification

### Pattern 4: Dependency Update
- Review changelog
- Check for breaking changes
- Verify compatibility
- Test critical paths

## Integration with CI/CD

If CI/CD results are available, incorporate them:

```bash
# Check CI status
gh pr checks [PR-number]

# View test results
gh pr view [PR-number] --json statusCheckRollup
```

## Final Checklist

Before completing review:

- [ ] All changed files reviewed
- [ ] Security concerns addressed
- [ ] Performance implications considered
- [ ] Test coverage verified
- [ ] Documentation checked
- [ ] Architecture alignment confirmed
- [ ] Breaking changes identified
- [ ] Approval status determined
- [ ] Actionable feedback provided
- [ ] Review summary formatted

## Notes

- Use LSP tools for type checking and linting results
- Leverage Grep for pattern matching across codebase
- Use Glob to find related files
- Read files completely for context
- Consider project-specific guidelines in CLAUDE.md
- Adapt review depth based on PR size and complexity

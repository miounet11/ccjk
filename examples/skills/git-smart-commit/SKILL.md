# Git Smart Commit

A skill for generating intelligent, conventional commit messages based on staged changes.

## When to Apply

- When committing code changes
- When writing commit messages
- When reviewing git history
- When preparing pull requests
- When squashing commits

## Overview

This skill helps you write clear, consistent commit messages following the Conventional Commits specification. It analyzes your staged changes and suggests appropriate commit messages.

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 login` |
| `fix` | Bug fix | `fix(api): handle null response` |
| `docs` | Documentation | `docs(readme): update installation` |
| `style` | Code style (no logic change) | `style: format with prettier` |
| `refactor` | Code refactoring | `refactor(utils): simplify logic` |
| `perf` | Performance improvement | `perf(query): add index` |
| `test` | Adding tests | `test(auth): add login tests` |
| `chore` | Maintenance tasks | `chore(deps): update packages` |
| `ci` | CI/CD changes | `ci: add GitHub Actions` |
| `build` | Build system changes | `build: update webpack config` |

## Rules

### `commit-001`: Use Conventional Commits Format

**Priority**: CRITICAL

Always use the conventional commits format for consistency and automated changelog generation.

**❌ Bad:**
```
fixed the bug
```

**✅ Good:**
```
fix(auth): resolve token expiration issue

The JWT token was not being refreshed properly when expired.
Added automatic token refresh before API calls.

Closes #123
```

### `commit-002`: Keep Subject Line Under 50 Characters

**Priority**: HIGH

The subject line should be concise and scannable in git log.

**❌ Bad:**
```
feat(authentication): implement the new OAuth2 authentication flow with Google and GitHub providers
```

**✅ Good:**
```
feat(auth): add OAuth2 with Google/GitHub
```

### `commit-003`: Use Imperative Mood

**Priority**: HIGH

Write the subject line as a command, not a description.

**❌ Bad:**
```
fix: fixed the login bug
fix: fixes the login bug
fix: fixing the login bug
```

**✅ Good:**
```
fix: resolve login validation error
```

### `commit-004`: Separate Subject from Body with Blank Line

**Priority**: MEDIUM

If you include a body, separate it from the subject with a blank line.

**❌ Bad:**
```
fix(api): handle timeout errors
Added retry logic for network timeouts.
```

**✅ Good:**
```
fix(api): handle timeout errors

Added retry logic for network timeouts.
Implements exponential backoff with max 3 retries.
```

### `commit-005`: Reference Issues in Footer

**Priority**: MEDIUM

Link related issues in the commit footer for traceability.

**✅ Good:**
```
feat(dashboard): add analytics widget

Implements real-time analytics display with charts.

Closes #456
Related: #123, #789
```

### `commit-006`: Use Scope for Context

**Priority**: LOW

Add a scope to indicate which part of the codebase is affected.

**✅ Good:**
```
feat(api/users): add profile endpoint
fix(ui/modal): correct z-index stacking
docs(contributing): add PR guidelines
```

## Workflow

### Step 1: Analyze Changes

```bash
# View staged changes
git diff --cached --stat
git diff --cached
```

### Step 2: Determine Type

Based on the changes:
- Adding new functionality → `feat`
- Fixing a bug → `fix`
- Updating docs → `docs`
- Refactoring without behavior change → `refactor`

### Step 3: Identify Scope

Look at which files/modules are affected:
- `src/api/*` → scope: `api`
- `src/components/*` → scope: `ui`
- `tests/*` → scope: `test`

### Step 4: Write Subject

- Start with lowercase
- No period at end
- Under 50 characters
- Imperative mood

### Step 5: Add Body (if needed)

- Explain WHY, not WHAT
- Wrap at 72 characters
- Include context and motivation

### Step 6: Add Footer (if applicable)

- Reference issues: `Closes #123`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

## Examples

### Simple Bug Fix

```
fix(validation): handle empty email input

Previously, empty email would pass validation.
Now properly returns error for empty strings.

Closes #234
```

### New Feature

```
feat(search): add fuzzy matching support

Implements fuzzy search using Fuse.js library.
Users can now find results with typos.

- Added Fuse.js dependency
- Created FuzzySearch component
- Updated search API endpoint

Closes #567
```

### Breaking Change

```
feat(api)!: change response format to JSON:API

BREAKING CHANGE: API responses now follow JSON:API spec.
All clients need to update their response parsing.

Migration guide: docs/migration-v2.md
```

### Multiple Scopes

```
refactor(api,db): normalize user data structure

Unified user representation across API and database layers.
Reduces data transformation overhead.
```

## Integration

This skill works best with:
- Git hooks for commit message validation
- CI/CD pipelines for changelog generation
- Code review tools for commit history analysis

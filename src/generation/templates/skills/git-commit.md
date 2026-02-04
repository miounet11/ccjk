# Smart Git Commit

Intelligently analyze changes and create well-formatted git commits with conventional commit messages.

## Triggers

- **command**: `/commit` - Trigger with slash command
- **pattern**: `commit changes` - Natural language trigger
- **pattern**: `提交代码` - Chinese language trigger

## Actions

### Action 1: bash

Analyze staged changes and repository status.

```bash
git status --porcelain && git diff --cached --stat
```

### Action 2: prompt

Generate commit message based on changes.

```
Analyze the staged changes and generate a conventional commit message:

1. Determine the commit type (feat, fix, docs, style, refactor, test, chore)
2. Identify the scope (component or area affected)
3. Write a concise description (50 chars max)
4. Add body if changes are complex
5. Reference any related issues

Format: <type>(<scope>): <description>

[optional body]

[optional footer]
```

### Action 3: bash

Create the commit with generated message.

```bash
git commit -m "$COMMIT_MESSAGE"
```

## Requirements

- **tool**: git - Git must be installed
- **context**: git-repository - Must be in a git repository

---

**Category:** git
**Priority:** 9
**Tags:** git, commit, version-control, automation
**Source:** smart-analysis

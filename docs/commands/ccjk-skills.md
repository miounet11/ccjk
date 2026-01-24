# `/ccjk:skills` Command

## Overview

The `/ccjk:skills` command automatically analyzes your project and installs relevant AI skills based on the detected technology stack, frameworks, and patterns.

## Features

- **Automatic Project Detection**: Analyzes package.json, tsconfig.json, and other config files
- **Cloud-Based Recommendations**: Fetches relevant skills from CCJK cloud service
- **Local Fallback**: Works offline with built-in skill recommendations
- **Interactive & Auto Modes**: Choose skills manually or let the system decide
- **Dry Run Support**: Preview what would be installed without actually installing
- **JSON Output**: Machine-readable output for integration with other tools

## Installation

The command is built into CCJK v8.0.0+. No additional installation needed.

## Usage

### Basic Usage (Interactive)

```bash
ccjk ccjk:skills
```

This will:
1. Analyze your current project
2. Show recommended skills
3. Let you select which ones to install
4. Install selected skills to `~/.ccjk/skills/`

### Auto Mode (Non-Interactive)

```bash
ccjk ccjk:skills --no-interactive
```

Automatically installs all high-priority skills (priority >= 7).

### Dry Run

```bash
ccjk ccjk:skills --dry-run
```

Shows what would be installed without actually installing.

### Filter by Category

```bash
ccjk ccjk:skills --category dev
```

Only show development-related skills.

### Filter by Tags

```bash
ccjk ccjk:skills --tags typescript,react
```

Only show skills tagged with "typescript" or "react".

### Exclude Specific Skills

```bash
ccjk ccjk:skills --exclude git-workflow
```

Don't recommend the git-workflow skill.

### JSON Output

```bash
ccjk ccjk:skills --json
```

Output results in JSON format for parsing.

### Force Reinstall

```bash
ccjk ccjk:skills --force
```

Overwrite existing skills without prompting.

## Available Categories

- `git` - Git and VCS-related skills
- `dev` - General development skills
- `testing` - Testing and TDD skills
- `docs` - Documentation skills
- `review` - Code review skills
- `seo` - SEO optimization skills
- `devops` - DevOps and CI/CD skills
- `custom` - Custom/user-defined skills

## How It Works

### 1. Project Analysis

The command analyzes:
- **Languages**: TypeScript, Python, Go, Rust, etc.
- **Frameworks**: React, Next.js, Django, etc.
- **Package Manager**: npm, yarn, pnpm, pip, cargo, etc.
- **Build System**: Webpack, Vite, Make, etc.
- **Configuration Files**: tsconfig.json, pyproject.toml, etc.

### 2. Skill Recommendation

Skills are recommended based on:
- **Cloud Service** (if available): AI-powered recommendations based on project analysis
- **Local Fallback**: Predefined rules for common tech stacks

### 3. Skill Installation

Recommended skills are installed to `~/.ccjk/skills/<skill-id>/SKILL.md`

### 4. Validation

Each SKILL.md is validated to ensure it:
- Has a valid title
- Has a valid description
- Follows the SKILL.md format specification

## Example Output

```
$ ccjk ccjk:skills

🔍 Analyzing project...
   Detected: TypeScript + React + Next.js project
   Package manager: pnpm
   Build system: Vite

📚 Recommended Skills (5 found):
  ✅ ts-best-practices        - TypeScript 5.3+ best practices
  ✅ react-patterns           - React component design patterns
  ✅ nextjs-optimization      - Next.js performance optimization
  ✅ testing-best-practices   - Testing-driven development workflows
  ✅ git-workflow             - Git branch management strategies

Install all 5 skills? [Y/n] Y

📦 Installing skills...
   ✓ ts-best-practices
   ✓ react-patterns
   ✓ nextjs-optimization
   ✓ testing-best-practices
   ✓ git-workflow

✅ Successfully installed 5 skills!

Next steps:
  • Use /ccjk:mcp to install MCP services
  • Use /ccjk:agents to create agents
  • Use /ccjk:setup to configure everything at once
```

## Built-in Skills

| Skill ID | Name | Category | Priority | Tags |
|----------|------|----------|----------|------|
| `ts-best-practices` | TypeScript Best Practices | dev | 8 | typescript, patterns |
| `react-patterns` | React Design Patterns | dev | 7 | react, frontend |
| `nextjs-optimization` | Next.js Optimization | dev | 7 | nextjs, performance |
| `python-pep8` | Python PEP 8 | dev | 7 | python, pep8 |
| `django-patterns` | Django Patterns | dev | 7 | django, python |
| `go-idioms` | Go Idioms | dev | 7 | go, idioms |
| `rust-patterns` | Rust Patterns | dev | 7 | rust, patterns |
| `testing-best-practices` | Testing Best Practices | testing | 6 | testing, tdd |
| `git-workflow` | Git Workflow | git | 5 | git, vcs |
| `security-best-practices` | Security Best Practices | dev | 8 | security, audit |

## JSON Output Format

```json
{
  "status": "completed",
  "skillsFound": 5,
  "skillsSelected": 5,
  "skillsInstalled": 5,
  "skillsFailed": 0,
  "results": [
    {
      "skillId": "ts-best-practices",
      "success": true,
      "path": "/Users/user/.ccjk/skills/ts-best-practices/SKILL.md"
    }
  ],
  "duration": 1234
}
```

## Environment Variables

- `CCJK_LANG` - Default language (zh-CN or en)
- `HOME` - User home directory (used for `~/.ccjk/skills/`)

## Files Created

### `~/.ccjk/skills/<skill-id>/SKILL.md`

Each skill is installed as a SKILL.md file following the Vercel Agent Skills format:

```markdown
---
name: ts-best-practices
description: TypeScript best practices
category: dev
triggers: ["/ts-best-practices", "/typescript"]
tags: [typescript, patterns]
---

# TypeScript Best Practices

## When to Use

Use this skill when writing TypeScript code...

## Guidelines

1. Always use strict mode
2. Avoid `any` types
...
```

## Troubleshooting

### No Skills Found

If no skills are found, try:
- Ensure you're in a valid project directory
- Check that package.json or equivalent exists
- Try with `--category all` to see all available skills

### Skills Not Loading

If skills don't appear to be working:
1. Check `~/.ccjk/skills/` directory exists
2. Verify SKILL.md files are present
3. Validate SKILL.md format with the skill parser
4. Restart CCJK to reload skills

### Cloud Recommendations Not Working

If cloud recommendations fail:
- The command will fall back to local recommendations
- Check your internet connection
- Verify CCJK cloud service is accessible

## Integration with Other Commands

- `/ccjk:mcp` - Install MCP services that complement skills
- `/ccjk:agents` - Create agents that use installed skills
- `/ccjk:setup` - Configure skills, MCP, and agents together
- `ccjk skills list` - List all installed skills
- `ccjk skill run <id>` - Run a specific skill

## Advanced Usage

### Custom Target Directory

```bash
ccjk ccjk:skills --target-dir /path/to/project
```

Analyze and install skills for a different project.

### Combine Filters

```bash
ccjk ccjk:skills --category dev --tags typescript,testing --exclude git-workflow
```

Apply multiple filters at once.

## Performance

- **Project Analysis**: ~100-500ms depending on project size
- **Skill Recommendation**: ~50-200ms (cloud), ~10ms (local fallback)
- **Skill Installation**: ~50-100ms per skill

## Contributing

To add new built-in skills:

1. Create template in `templates/skills/<skill-id>.md`
2. Add recommendation logic in `getLocalRecommendations()`
3. Update skill mapping table in documentation
4. Test with `ccjk ccjk:skills --dry-run`

## Related Documentation

- [SKILL.md Format Specification](./SKILL_FORMAT.md)
- [Creating Custom Skills](./CREATING_SKILLS.md)
- [Plugin System Architecture](./PLUGIN_ARCHITECTURE.md)
- [Cloud API Reference](./CLOUD_API.md)
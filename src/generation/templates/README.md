# Agent & Skills Templates

This directory contains templates for generating Claude Code compatible Agents and Skills based on project analysis.

## Directory Structure

```
templates/
├── agents/           # Agent templates
│   ├── index.json   # Agent template index
│   ├── frontend-specialist.md
│   ├── backend-specialist.md
│   ├── fullstack-developer.md
│   ├── test-engineer.md
│   ├── devops-engineer.md
│   └── security-specialist.md
├── skills/          # Skills templates
│   ├── index.json   # Skills template index
│   ├── git-commit.md
│   ├── code-review.md
│   ├── generate-tests.md
│   ├── api-docs.md
│   ├── refactor-code.md
│   ├── performance-optimization.md
│   ├── dependency-update.md
│   └── database-migration.md
└── README.md        # This file
```

## Agent Templates

Agent templates define specialized AI agents with specific expertise and workflows.

### Template Structure

Each agent template includes:

- **Role**: Agent's primary responsibility
- **Core Competencies**: Key skills and knowledge areas
- **Workflow**: Step-by-step process for handling tasks
- **Output Format**: Expected output structure
- **Best Practices**: Guidelines and standards
- **Quality Standards**: Metrics and thresholds
- **Integration Points**: How the agent collaborates with others

### Available Agent Templates

1. **Frontend Specialist** - React, TypeScript, UI development
2. **Backend Specialist** - Node.js, APIs, databases
3. **Fullstack Developer** - Full-stack application development
4. **Test Engineer** - Testing, quality assurance, automation
5. **DevOps Engineer** - CI/CD, deployment, infrastructure
6. **Security Specialist** - Security auditing, vulnerability detection

## Skills Templates

Skills templates define reusable automation workflows that can be triggered by commands or patterns.

### Template Structure

Each skill template includes:

- **Triggers**: Commands and patterns that activate the skill
- **Actions**: Step-by-step actions to perform
- **Requirements**: Tools, context, or files needed
- **Category**: Skill classification
- **Priority**: Execution priority (1-10)
- **Tags**: Searchable keywords

### Available Skills Templates

1. **Smart Git Commit** - Intelligent commit message generation
2. **Code Review** - Comprehensive code quality review
3. **Generate Tests** - Automatic test generation
4. **API Documentation** - OpenAPI/Swagger documentation
5. **Code Refactoring** - Intelligent code improvement
6. **Performance Optimization** - Performance analysis and optimization
7. **Dependency Update** - Safe dependency updates
8. **Database Migration** - Database schema migration

## Usage

### Smart Generation Command

```bash
ccjk init --smart
```

This command will:

1. Analyze your project structure and dependencies
2. Detect project type (React, Node.js, fullstack, etc.)
3. Identify common workflows and patterns
4. Select relevant agent and skills templates
5. Generate customized configurations
6. Install and configure selected agents/skills

### Manual Template Selection

You can also manually select templates:

```bash
# List available templates
ccjk templates list

# Install specific agent
ccjk agents add --template frontend-specialist

# Install specific skill
ccjk skills add --template git-commit
```

## Template Format

### Agent Template Format

Agent templates use Markdown with structured sections:

```markdown
# Agent Name

**Model**: sonnet|opus
**Version**: 1.0.0
**Specialization**: Brief description

## Role
[Description of agent's role]

## Core Competencies
[Skills and knowledge areas]

## Workflow
[Step-by-step process]

## Output Format
[Expected output structure]

## Best Practices
[Guidelines and standards]

## Quality Standards
[Metrics and thresholds]

## Integration Points
[Collaboration with other agents]

---
**Category**: category-name
**Tags**: tag1, tag2, tag3
**Source**: smart-analysis
```

### Skills Template Format

Skills templates use Markdown with action definitions:

```markdown
# Skill Name

Brief description

## Triggers

- **command**: `/command` - Description
- **pattern**: `pattern text` - Description

## Actions

### Action 1: tool-name

Description

```bash
command or code
```

### Action 2: prompt

Prompt text

## Requirements

- **tool**: tool-name - Description
- **context**: context-type - Description

---
**Category**: category-name
**Priority**: 1-10
**Tags**: tag1, tag2, tag3
**Source**: smart-analysis
```

## Customization

Templates can be customized by:

1. **Editing existing templates** - Modify templates to match your workflow
2. **Creating new templates** - Add custom agents or skills
3. **Updating index files** - Register new templates in index.json

## Contributing

To add new templates:

1. Create a new `.md` file in the appropriate directory
2. Follow the template format guidelines
3. Add entry to the corresponding `index.json`
4. Test with `ccjk init --smart`

## Version History

- **1.0.0** (2026-02-04) - Initial template collection
  - 6 agent templates
  - 8 skills templates
  - Smart generation support

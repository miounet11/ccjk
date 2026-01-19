/**
 * Workflow Skill - 内置工作流自动化技能
 *
 * 提供 /workflow 命令的 skill 定义
 * 支持 Subagent 驱动的两阶段审查工作流
 */

import type { CcjkSkill } from '../skills/types'

/**
 * Workflow Skill 定义
 */
export const workflowSkill: CcjkSkill = {
  id: 'workflow-automation',
  name: {
    'en': 'Workflow Automation',
    'zh-CN': '工作流自动化',
  },
  description: {
    'en': 'Subagent-driven development workflow with two-stage review',
    'zh-CN': 'Subagent 驱动的两阶段审查开发工作流',
  },
  category: 'dev',
  triggers: ['/workflow', '/wf', '/flow'],
  enabled: true,
  version: '1.0.0',
  author: 'CCJK',
  tags: ['workflow', 'subagent', 'review', 'automation', 'ci'],
  template: `# Workflow Automation Skill

## Overview

This skill provides Subagent-driven development workflows with automatic two-stage review.
Inspired by Anthropic's Superpowers architecture for autonomous agent collaboration.

## Core Concepts

### Two-Stage Review
1. **Draft Stage**: Subagents work on tasks in parallel
2. **Review Stage**: Automated quality checks and validation
3. **Finalize Stage**: Merge approved changes

### Workflow States
- \`idle\` → \`planning\` → \`executing\` → \`reviewing\` → \`finalizing\` → \`completed\`

## Quick Start

### Create a Workflow
\`\`\`bash
ccjk workflow create "Implement user authentication"
\`\`\`

### Start Workflow Execution
\`\`\`bash
ccjk workflow start <workflow-id>
\`\`\`

### Check Workflow Status
\`\`\`bash
ccjk workflow status <workflow-id>
ccjk workflow list
\`\`\`

## Task Management

### Add Tasks to Workflow
\`\`\`bash
ccjk workflow task add <workflow-id> "Create login component"
ccjk workflow task add <workflow-id> "Add authentication API" --depends-on task-1
\`\`\`

### Task Priorities
\`\`\`bash
ccjk workflow task add <workflow-id> "Fix security bug" --priority critical
ccjk workflow task add <workflow-id> "Add tests" --priority high
\`\`\`

### View Task Dependencies
\`\`\`bash
ccjk workflow tasks <workflow-id> --graph
\`\`\`

## Subagent Scheduling

### Automatic Scheduling
The scheduler automatically:
- Assigns tasks to available subagents
- Respects task dependencies
- Balances workload across agents
- Handles failures with retry logic

### Manual Assignment
\`\`\`bash
ccjk workflow assign <task-id> <subagent-id>
\`\`\`

### View Subagent Status
\`\`\`bash
ccjk workflow agents
ccjk workflow agent <agent-id> --tasks
\`\`\`

## Review System

### Automatic Review
When tasks complete, the system automatically:
1. Runs requirement verification
2. Performs code quality checks
3. Validates test coverage
4. Checks for security issues

### Review Results
\`\`\`bash
ccjk workflow review <workflow-id>
ccjk workflow review <task-id> --detailed
\`\`\`

### Manual Review Override
\`\`\`bash
ccjk workflow approve <task-id>
ccjk workflow reject <task-id> --reason "Missing tests"
\`\`\`

## Quality Checks

### Built-in Checks
- **Naming Conventions**: camelCase, PascalCase validation
- **Code Structure**: Function length, nesting depth
- **Error Handling**: Try-catch coverage
- **Documentation**: JSDoc/TSDoc presence
- **Style**: Consistent formatting

### Custom Checks
\`\`\`bash
ccjk workflow check add "No console.log" --pattern "console\\.log"
ccjk workflow check add "Max file size" --max-lines 500
\`\`\`

## Workflow Templates

### Feature Development
\`\`\`bash
ccjk workflow create --template feature "Add dark mode"
\`\`\`

### Bug Fix
\`\`\`bash
ccjk workflow create --template bugfix "Fix login timeout"
\`\`\`

### Refactoring
\`\`\`bash
ccjk workflow create --template refactor "Migrate to TypeScript"
\`\`\`

## Events and Hooks

### Available Events
- \`workflow:created\`
- \`workflow:started\`
- \`task:assigned\`
- \`task:completed\`
- \`review:passed\`
- \`review:failed\`
- \`workflow:completed\`

### Add Hooks
\`\`\`bash
ccjk workflow hook add task:completed "npm test"
ccjk workflow hook add review:passed "npm run lint"
\`\`\`

## Best Practices

### 1. Break Down Large Tasks
Split complex features into smaller, independent tasks that can run in parallel.

### 2. Define Clear Dependencies
Use \`--depends-on\` to ensure tasks run in the correct order.

### 3. Set Appropriate Priorities
- \`critical\`: Security fixes, blocking issues
- \`high\`: Important features, bugs
- \`medium\`: Regular development
- \`low\`: Nice-to-have improvements

### 4. Review Before Merge
Always check review results before finalizing:
\`\`\`bash
ccjk workflow review <workflow-id> --summary
\`\`\`

### 5. Use Templates
Create custom templates for recurring workflow patterns.

## Integration with Git

### Automatic Branch Management
\`\`\`bash
ccjk workflow create "Feature X" --branch feature/x
\`\`\`

### Worktree Support
Each subagent can work in isolated git worktrees:
\`\`\`bash
ccjk workflow start <id> --worktree
\`\`\`

## Troubleshooting

### Stuck Workflow
\`\`\`bash
ccjk workflow diagnose <workflow-id>
ccjk workflow retry <task-id>
\`\`\`

### Cancel Workflow
\`\`\`bash
ccjk workflow cancel <workflow-id>
ccjk workflow cancel <workflow-id> --force
\`\`\`

### View Logs
\`\`\`bash
ccjk workflow logs <workflow-id>
ccjk workflow logs <task-id> --tail 100
\`\`\`
`,
}

/**
 * 获取 workflow skill 的 markdown 模板
 */
export function getWorkflowSkillTemplate(): string {
  return workflowSkill.template
}

/**
 * 获取 workflow skill 定义
 */
export function getWorkflowSkill(): CcjkSkill {
  return workflowSkill
}

---
description: 'Structured six-stage development workflow for research, planning, implementation, optimization, and review'
argument-hint: <task description> [--skip-research] [--quick] [--focus <stage>]
---

# Structured Development Workflow

Use this workflow when the user wants a broader staged execution loop rather than planning alone.

## Command context

- Workflow bundle: `sixStepsWorkflow`
- Installed command file: `workflow.md`
- Claude Code command: `/ccjk:workflow <task description>`
- Codex command: `/prompts:workflow <task description>`

## User request

$ARGUMENTS

## Workflow stages

1. **Research**
   - understand the request, current codebase constraints, and success criteria
   - identify missing context or important risks

2. **Ideate**
   - generate realistic solution directions
   - compare trade-offs and recommend a path

3. **Plan**
   - break the chosen direction into concrete implementation steps
   - name affected files, logic areas, and validation steps

4. **Execute**
   - implement the approved plan
   - stay within scope and keep progress visible

5. **Optimize**
   - improve the new implementation where there is clear payoff
   - avoid unrelated cleanup

6. **Review**
   - verify the result against the plan
   - summarize what shipped and what remains unverified

## How to respond

- Start in the stage that best matches the user request.
- If the request is underspecified, stay in research until the task is clear enough.
- If the user already has a clear approach, move quickly into planning and execution.
- Ask for approval before meaningful implementation when the task requires planning.
- Keep the workflow grounded in the actual repository and runtime.

## Output shape

Structure the response in this form when useful:

```markdown
# Current stage
- Research / Ideate / Plan / Execute / Optimize / Review

# Goal
- What is being solved

# Findings or options
- Key context, trade-offs, or chosen approach

# Next steps
1. Step one
2. Step two
3. Step three

# Verification
- Tests, build, or checks to run
```

## Behavioral guardrails

- Do not overclaim automation.
- Do not describe capabilities that are not actually wired into the shipped runtime.
- Prefer concise, implementation-oriented output.
- Keep recommendations tied to the current project instead of generic process theater.

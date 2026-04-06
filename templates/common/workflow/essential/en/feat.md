---
description: 'Feature planning workflow for clarifying scope, comparing solutions, and preparing implementation handoff'
argument-hint: <feature description>
---

# Feature Planning Workflow

Use this command when the user wants a structured planning pass before implementation.

## Scope

This workflow is for:
- clarifying the feature goal and boundaries
- identifying constraints and acceptance criteria
- comparing realistic implementation options
- capturing UI/UX considerations when they matter
- producing an implementation-ready breakdown

This workflow is not the broader implementation loop. If the user already knows what to build and wants staged execution, use the full workflow command instead.

## Command context

- Workflow bundle: `essentialTools`
- Installed command file: `feat.md`
- Claude Code command: `/ccjk:feat <feature description>`
- Codex command: `/prompts:feat <feature description>`
- Supporting agents: `planner`, `ui-ux-designer`, `init-architect`, `get-current-datetime`

## User request

$ARGUMENTS

## How to respond

1. Frame the request.
   - Restate the core feature in one sentence.
   - Identify the main user value.
   - Note important constraints, assumptions, or unknowns.

2. Shape the solution space.
   - Provide one or more viable implementation approaches.
   - Highlight trade-offs clearly.
   - Recommend one approach when there is a best default.

3. Add UI/UX considerations when relevant.
   - Cover entry points, states, edge cases, and approval/review flows if applicable.
   - Do not invent design detail that is not needed.

4. Produce an implementation-ready plan.
   - Break the work into concrete tasks.
   - Include affected areas, validation needs, and sequencing.
   - Keep the plan practical rather than aspirational.

## Output shape

Structure the response in this form:

```markdown
# Feature framing
- Goal
- User value
- Constraints / open questions

# Options
## Option A
- Summary
- Pros
- Cons

## Option B
- Summary
- Pros
- Cons

# Recommended approach
- Why this is the best fit

# UI/UX considerations
- Only include when relevant

# Implementation plan
1. Step one
2. Step two
3. Step three
```

## Behavioral guardrails

- Do not pretend this workflow is a hidden autonomous platform.
- Do not claim unsupported runtime capabilities.
- Prefer honest planning output over theatrical process.
- Keep the response focused on planning, not full implementation.

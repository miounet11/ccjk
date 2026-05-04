---
description: 'Durable goal workflow for repo-local planning, native /goal coordination, and checkpointed execution'
argument-hint: <goal description> [--create] [--run] [--resume] [--status]
---

# Durable Goal Workflow

Use this command when the user wants a task to survive beyond the current chat thread.
The durable source of truth is the repository, not chat memory.

## Command context

- Workflow bundle: `essentialTools`
- Installed command file: `goal.md`
- Clavue command: `/ccjk:goal <goal description>`
- Claude Code command: `/ccjk:goal <goal description>`
- Codex command: `/prompts:goal <goal description>`
- Native runtime goal: use `/goal` when the active runtime supports it

## User request

$ARGUMENTS

## Goal artifacts

Create or update one goal plan directory:

```text
.agent/goals/<goal-id>/
  brief.md
  goals.json
  ledger.jsonl
.agent/goals/active
```

Use a short, stable `<goal-id>` such as `2026-05-05-clavue-goals-runtime` or
`feature-durable-goals`. If the current date is unknown, use a slug from the
task and record that the date was not available.

## Artifact contract

`brief.md` contains:
- the user intent in one paragraph
- success criteria
- constraints and non-goals
- the recommended execution strategy

`goals.json` contains:

```json
{
  "version": 1,
  "id": "goal-id",
  "status": "ready",
  "runtime": "clavue|codex|claude-code|unknown",
  "goals": [
    {
      "id": "G1",
      "title": "Concrete goal title",
      "status": "ready",
      "depends_on": [],
      "acceptance": ["Observable success criterion"],
      "evidence": []
    }
  ]
}
```

`ledger.jsonl` contains one JSON object per event:

```json
{"ts":"ISO-8601","event":"created","goal_id":"G1","notes":"Plan created"}
```

## Runtime behavior

1. Detect intent.
   - `--create`: create or refresh the artifact plan, then stop.
   - `--run`: execute ready goals in order.
   - `--resume`: read `.agent/goals/active`, continue the next ready or running goal.
   - `--status`: summarize current artifact state without changing files.
   - No flag: create a plan first unless an active plan already exists.

2. Create a durable plan before implementation.
   - Keep each goal small enough to finish and verify independently.
   - Use `depends_on` only when there is a real ordering constraint.
   - Include acceptance criteria that can be checked from files, tests, commands, or user-visible behavior.

3. Coordinate with native `/goal`.
   - For Clavue, prefer the native `/goal` capability for the currently active goal.
   - For Codex, prefer native `/goal` when `[features].goals = true` is enabled.
   - If the runtime cannot set a native goal from the assistant side, continue with the artifact plan and tell the user the exact native goal text to set manually.

4. Execute one goal at a time.
   - Mark a goal `running` before editing.
   - Do the smallest useful implementation step.
   - Verify with the narrowest relevant command or inspection.
   - Mark the goal `completed` only when evidence exists.
   - Append a `checkpoint` or `completed` event to `ledger.jsonl`.

5. Stop on blockers.
   - If a requirement is ambiguous, unsafe, or blocked by missing access, mark the goal `blocked`.
   - Record the blocker and the next question/action in `ledger.jsonl`.
   - Do not silently skip blocked goals.

## Output shape

For create/status:

```markdown
# Goal Plan
- ID:
- Status:
- Active goal:

# Goals
1. G1 - title - status
2. G2 - title - status

# Next Action
- Command or action to continue
```

For run/resume:

```markdown
# Active Goal
- ID:
- Acceptance:

# Work Completed
- Files or behavior changed

# Evidence
- Tests, checks, or inspection results

# Next Goal
- Next ready goal, or complete
```

## Guardrails

- Do not rely on chat memory as the only state.
- Do not create large vague goals such as "finish the project".
- Do not mark work complete without evidence.
- Do not overwrite existing goal artifacts without preserving useful history.
- Keep the artifact contract stable across Clavue, Codex, and Claude Code.

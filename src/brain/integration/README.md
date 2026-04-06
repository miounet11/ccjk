# Brain System CLI Integration

## Overview

This document describes an **optional integration pattern** for wiring Brain routing into a CLI.

It is not a statement about the current default `ccjk` startup path. In the shipped runtime, the main entry path is:

```text
src/cli.ts -> src/cli-lazy.ts
```

If you want Brain interception behavior, you must integrate it explicitly.

## What this guide is for

Use this guide when you want to:
- experiment with Brain-based input interception
- route selected user input through Brain components first
- fall back to another runtime when Brain does not handle the request

Do not use this guide as evidence that the current shipped CLI automatically intercepts all prompts.

## Example integration shape

### Step 1: Import the hook

```typescript
import { setupBrainHook, processCliInput } from './brain/integration/cli-hook'
```

### Step 2: Initialize it in your own runtime

```typescript
await setupBrainHook({
  enabled: true,
  silent: true,
  fallbackToClaudeCode: true,
})
```

### Step 3: Route input through the hook

```typescript
const result = await processCliInput(userInput)

if (result.shouldContinue) {
  await executeClaudeCode(userInput)
}
```

## Behavioral note

When this integration is enabled, Brain components may:
- inspect the input
- bypass simple/native commands
- route complex requests to Brain execution components
- fall back to the surrounding runtime

The exact behavior depends on the configured router, executor, and bypass rules.

## Guardrails

- Treat `cli-interceptor.ts` and related files as opt-in components.
- Verify the active entry path before documenting interception as product behavior.
- Keep user-facing messaging honest about what is actually wired.
- Avoid wording such as "zero-config automatic execution" unless the runtime truly does that.

## Related files

- `src/brain/integration/cli-hook.ts`
- `src/brain/router/cli-interceptor.ts`
- `src/brain/router/auto-executor.ts`
- `src/cli.ts`
- `src/cli-lazy.ts`

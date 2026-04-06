# Brain System

## Overview

The Brain system contains CCJK's routing, orchestration, and supporting automation modules.

These modules exist in the repository, but they are **not** all active by default in the main shipped CLI startup path. The default entry path is:

```text
src/cli.ts -> src/cli-lazy.ts
```

If you describe Brain behavior, distinguish between:
- code that exists in `src/brain/`
- optional integrations that must be wired in explicitly
- behavior that is actually active in the shipped `ccjk` runtime

## What is active in the shipped CLI

Today, the main `ccjk` CLI ships with:
- normal command registration through `src/cli-lazy.ts`
- startup helpers such as migration, cloud bootstrap, hook init, auto-fix, update check, and command discovery banner
- slash-command handling through `src/commands/slash-commands` when the CLI receives slash-style arguments
- intent handling through `handleIntentRecognition()` on the current CLI path

## What is not enabled by default

The following Brain components are available in the repository but should be treated as optional unless the entry path explicitly integrates them:
- `src/brain/router/cli-interceptor.ts`
- `src/brain/integration/cli-hook.ts`
- `src/brain/router/auto-executor.ts`
- other related brain-router experiments and support modules

Do not claim that the shipped CLI automatically intercepts all user input, silently creates agents, or transparently replaces normal command selection unless you have verified that wiring in the active runtime.

## Repository components

### Routing and execution
- `src/brain/router/intent-router.ts`
- `src/brain/router/auto-executor.ts`
- `src/brain/router/cli-interceptor.ts`

### Integration layer
- `src/brain/integration/cli-hook.ts`
- `src/brain/integration/README.md`

### Supporting systems
- context loading and caching
- telemetry and hook emission
- task persistence and queueing
- agent and skill registries

## Guidance for contributors

- Prefer precise wording over aspirational wording.
- If a behavior depends on optional integration, say so directly.
- Before documenting startup behavior, verify it in `src/cli.ts` and `src/cli-lazy.ts`.
- Do not present experimental routing paths as guaranteed product behavior.

## Related docs

- `src/brain/integration/README.md`
- `src/brain/router/cli-interceptor.ts`
- `src/brain/router/auto-executor.ts`
- `src/cli.ts`
- `src/cli-lazy.ts`

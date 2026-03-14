---
title: Quick Start
---

# Quick Start

This section gives the current default onboarding path for CCJK.

## Recommended Sequence

1. Run `npx ccjk` for guided onboarding.
2. Use `npx ccjk init --silent` when you need CI or scripted setup.
3. Run `npx ccjk boost` after install to tighten the environment.
4. Apply a permission preset with `npx ccjk zc --preset dev`.
5. Add `npx ccjk remote setup` only if you need browser/mobile remote control.

## Why This Sequence

- It matches the current README and npm-facing story.
- It keeps `npx ccjk` as the primary first-run command.
- It treats `init --silent` as automation, not the default beginner path.
- It surfaces capability discovery and presets earlier in the workflow.

## Continue Reading

- [Installation Guide](installation.md)
- [CLI Overview](../cli/index.md)
- [Features](../features/index.md)

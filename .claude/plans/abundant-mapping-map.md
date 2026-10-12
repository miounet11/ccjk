## Context
The user wants a broad cleanup pass that deletes historical-version artifacts and outdated documentation directly from the repository. This is destructive work, and the repo currently contains both clearly disposable artifacts and content that may still be wired into scripts or docs navigation. The goal is to separate safe deletions from risky deletions before any files are removed.

## Findings so far
- `scripts/cleanup.js` currently only targets a narrow safe set in the repo root: temporary docs (`*-SUMMARY.md`, `*-REPORT.md`, `ANALYSIS_*.md`, etc.), temp files (`*.bak`, `*.old`, etc.), build artifacts, and temp dirs.
- `pnpm cleanup:dry` currently identifies only two obvious cleanup candidates:
  - `CONTEXT-OPTIMIZATION-SUMMARY.md`
  - `dist/`
- The working tree already has unrelated code changes, so cleanup must avoid touching active edited files.
- The docs site is VitePress-based (`docs/.vitepress/config.ts`) and its main live navigation points at `/en`, `/zh-CN`, and `/ja-JP` sections, not `docs/v2/` or root-level implementation/report files.
- `package.json` still contains active `v2` scripts and direct references to `docs/v2/`:
  - `test:v2*`
  - `benchmark:server`
  - `benchmark:open`
  So deleting `docs/v2/` or `vitest.config.v2.ts` is not safe unless those scripts are also removed/updated.
- The repo root contains many likely historical report files such as `*_IMPLEMENTATION*.md`, `*_REPORT.md`, and `*_ANALYSIS.md`. These look like prime cleanup candidates but should be treated as a deliberate docs-pruning decision, not a blind temporary-file cleanup.
- There are tracked `.bak` source files such as:
  - `src/agents/communication.ts.bak`
  - `src/brain/metrics.ts.bak`
  These are strong deletion candidates if they are not referenced anywhere.

## Recommended approach
Proceed in two layers.

### 1. Safe immediate deletions
Delete only items that are low-risk and already match the repo’s cleanup conventions:
- root temporary summary/report/analysis docs that are not referenced by live docs navigation
- tracked stray `.bak` source files after verifying they are not referenced
- generated build output like `dist/`

### 2. Conditional historical-doc pruning
Only delete broader historical doc sets after an explicit scope choice, because this could remove useful project history:
- root-level implementation/report/analysis markdown files
- `docs/implementation/*`
- `docs/v2/*`
- V2-related scripts/config such as `vitest.config.v2.ts` and `package.json` `test:v2*` / `v2:*` entries

## Critical files and areas to verify before deletion
- `/Users/lu/ccjk-public/package.json`
- `/Users/lu/ccjk-public/docs/.vitepress/config.ts`
- `/Users/lu/ccjk-public/scripts/cleanup.js`
- `/Users/lu/ccjk-public/src/agents/communication.ts.bak`
- `/Users/lu/ccjk-public/src/brain/metrics.ts.bak`
- `/Users/lu/ccjk-public/docs/v2/**`
- root-level `*_IMPLEMENTATION*.md`, `*_REPORT.md`, `*_ANALYSIS.md`

## Execution outline once scope is confirmed
1. Enumerate the exact files/directories in the approved cleanup scope.
2. Delete only approved items.
3. Re-scan the repo for leftover `.bak` and root temporary report files.
4. If broader docs are removed, verify there are no remaining package/doc links to deleted content.
5. Report the deleted set clearly.

## Verification
- `git status --short` to confirm only the intended deletions happened.
- `pnpm cleanup:dry` again to confirm the low-risk temporary-doc set is reduced.
- If `docs/v2/` or other broader docs are included, grep/package checks must confirm no remaining references from `package.json`, docs config, or linked markdown files.

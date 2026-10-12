# Fix Plan: Wire Up Hidden Features & Improve UX

## Context

The audit revealed that CCJK has powerful features that are either unreachable or poorly discoverable:

1. **`smartGenerateAndInstall()`** — exists in `src/generation/index.ts`, only callable via `ccjk init --smart`. No menu entry, no standalone command registered in `cli-lazy.ts`.
2. **`Brain` system** — `src/brain/index.ts` exports `Brain`, `BrainOrchestrator`, `AgentDispatcher`, etc. The `status` command has alias `brain` (line 1637 of cli-lazy.ts) but there's no dedicated `generate` command registered.
3. **Menu option 1 (`Full Init`)** — already calls `init({ skipBanner: true, codeType: 'claude-code' })` correctly, but never offers smart generation to the user.
4. **`configureMergedPermissionsFeature()`** — already wired to menu option 8, good.
5. **`ccjk-*.ts` batch files** — `ccjk-agents.ts`, `ccjk-skills.ts`, `ccjk-mcp.ts`, `ccjk-hooks.ts`, `ccjk-all.ts` exist but are not registered in `cli-lazy.ts` COMMANDS array. They're called directly from menu.ts via `ccjkAgents()` / `ccjkSkills()`.

## What We're Fixing (Minimal, Targeted)

### Fix 1: Add `generate` command to `cli-lazy.ts`

`smartGenerateAndInstall` is never reachable via CLI. Add a `generate` command entry to the COMMANDS array in `src/cli-lazy.ts`.

**File**: `src/cli-lazy.ts`
**Where**: After the `commit` command block (~line 432), before the `config` command block
**What**: Add a new CommandDefinition for `generate` / `gen` that calls `smartGenerateAndInstall()`

```typescript
{
  name: 'generate [projectPath]',
  description: 'Smart agent/skill generation — auto-detect project and generate configs',
  aliases: ['gen'],
  tier: 'extended',
  options: [
    { flags: '--dry-run, -d', description: 'Preview without writing files' },
    { flags: '--verbose, -v', description: 'Verbose output' },
  ],
  loader: async () => {
    return async (options: CliOptions, projectPath: unknown) => {
      const { smartGenerateAndInstall } = await import('./generation/index')
      await smartGenerateAndInstall(projectPath as string | undefined)
    }
  },
},
```

### Fix 2: Expose smart generation in menu option 1

Menu option 1 (`Full Init`) calls `init({ skipBanner: true, codeType: 'claude-code' })`. After init completes, offer the user a prompt: "Run smart agent/skill generation for this project? (recommended)". If yes, call `smartGenerateAndInstall()`.

**File**: `src/commands/menu.ts`
**Where**: `case '1':` block (~line 254)
**What**: After `await init(...)`, add a `promptBoolean` asking if user wants smart generation, then call `smartGenerateAndInstall()` if yes.

### Fix 3: Add `generate` to the menu's "Other Tools" section

Add a `G.` entry in `showSimplifiedMenu()` so users can discover and run smart generation independently.

**File**: `src/commands/menu.ts`
**Where**: The "Other Tools" section (~line 214-221), add after `R.` line
**What**:
```
console.log(`  ${ansis.green('G.')} ${isZh ? '智能生成 Agents/Skills' : 'Smart Generate Agents/Skills'} ${ansis.dim(isZh ? '- 分析项目，自动生成 agent/skill 配置' : '- Analyze project, auto-generate agent/skill configs')}`)
```
And add `'g'` to the valid choices array, and a `case 'g':` handler that calls `smartGenerateAndInstall()`.

### Fix 4: Add `generate` to the help documentation

**File**: `src/commands/menu.ts`
**Where**: `showHelpDocumentation()` function (~line 113)
**What**: Add one line:
```
console.log(`  ${ansis.green('npx ccjk gen')}     ${ansis.dim(isZh ? '- 智能生成 agents/skills' : '- Smart generate agents/skills')}`)
```

## Files to Modify

| File | Change |
|------|--------|
| `src/cli-lazy.ts` | Add `generate` command definition (~line 432) |
| `src/commands/menu.ts` | Add `G.` menu item + `case 'g':` handler + post-init prompt + help doc line |

## Files NOT to Touch

- `src/generation/index.ts` — already correct, `smartGenerateAndInstall()` works
- `src/brain/` — Brain is already reachable via `ccjk status` (alias: `brain`) and `ccjk agents`. No change needed.
- `src/utils/features.ts` — no change needed
- `src/cloud-sync/` — already wired to menu option 7. No change needed.
- `ccjk-*.ts` batch files — leave as-is, they work via menu

## Verification

```bash
# 1. Build
pnpm build

# 2. Test generate command is reachable
echo 'gen' | node dist/cli.mjs --help 2>&1 | grep generate

# 3. Test menu shows G option
echo '' | node dist/cli.mjs 2>&1 | grep -i 'Smart Gen'

# 4. Typecheck
pnpm typecheck
```

## Scope

This is a **minimal, surgical fix** — 2 files, ~30 lines of new code. It wires up the most impactful hidden feature (smart generation) without touching architecture, tests, or other modules.
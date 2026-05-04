# CCJK Compatibility Brief for Clavue

Audience: CCJK maintainers  
Prepared from local validation against `ccjk/14.1.6 darwin-arm64 node-v25.8.0` and Clavue `8.8.94`.

## Summary

Clavue is a Claude Code-compatible CLI fork with its canonical user configuration rooted at `~/.clavue`, while still reading selected legacy ecosystem content from `~/.claude` for compatibility. CCJK already works well for many Claude Code workflows, but several assumptions in CCJK currently make Clavue integration brittle:

- Some CCJK permission paths expect `permissions.allowed` / `permissions.denied`.
- Other CCJK permission paths read Claude/Clavue-style `permissions.allow` / `permissions.deny`.
- CCJK currently treats `~/.claude/settings.json` as the primary source in several paths.
- CCJK command installers and generated command frontmatter may use `Exec(...)` and `Write(...)`, which Clavue now supports, but a shared contract would make the behavior stable.

Clavue has added a compatibility bridge, but the best user experience would be for CCJK to natively recognize Clavue and avoid requiring manual fixes.

## Reproduced Issue

On a machine where `~/.claude/settings.json` or `~/.clavue/settings.json` uses Claude/Clavue-style permissions:

```bash
npm exec --yes --package ccjk -- ccjk system permissions
```

Observed failure:

```text
TypeError: Cannot read properties of undefined (reading 'sort')
```

Root cause:

- `ccjk dist/chunks/permission-manager.mjs` reads a `permissions` object and expects:

```json
{
  "allowed": [],
  "denied": [],
  "trustedDirectories": [],
  "autoApprovePatterns": []
}
```

- But Claude Code and Clavue settings normally use:

```json
{
  "allow": [],
  "deny": [],
  "ask": [],
  "additionalDirectories": [],
  "defaultMode": "acceptEdits"
}
```

When CCJK reads a Claude/Clavue-style settings file and then calls `permissions.allowed.sort()`, the command crashes.

## Clavue Compatibility Contract

### 1. Config Root Precedence

When the runtime is Clavue, CCJK should prefer:

```text
1. $CLAVUE_CONFIG_DIR, if set
2. ~/.clavue
3. ~/.claude as legacy fallback only
```

Recommended detection signals:

- `process.env.CLAVUE_CONFIG_DIR`
- `process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_CONFIG`
- `process.env.CLAVUE_DISABLE_LEGACY_CLAUDE_COMMANDS`
- The invoked binary/package name may be `clavue`.

Clavue should not require CCJK to write Clavue settings into `~/.claude`.

### 2. Permission Shape Normalization

CCJK should normalize both supported permission shapes before reading or displaying permissions.

Recommended normalized internal shape:

```ts
type CcjkPermissionShape = {
  allowed: string[]
  denied: string[]
  trustedDirectories: string[]
  autoApprovePatterns: string[]
}
```

Suggested normalization:

```ts
function normalizePermissions(input: unknown): CcjkPermissionShape {
  const obj = input && typeof input === 'object'
    ? input as Record<string, unknown>
    : {}

  return {
    allowed: stringArray(obj.allowed),
    denied: stringArray(obj.denied),
    trustedDirectories: stringArray(obj.trustedDirectories),
    autoApprovePatterns: stringArray(obj.autoApprovePatterns),
  }
}

function normalizeClaudeStylePermissions(input: unknown): CcjkPermissionShape {
  const obj = input && typeof input === 'object'
    ? input as Record<string, unknown>
    : {}

  return {
    allowed: mapClaudeRulesToCcjkTokens(stringArray(obj.allow)),
    denied: mapClaudeRulesToCcjkTokens(stringArray(obj.deny)),
    trustedDirectories: stringArray(obj.additionalDirectories),
    autoApprovePatterns: [],
  }
}
```

Important: never assume `allowed`, `denied`, or `trustedDirectories` exist. Always default to empty arrays before sorting, displaying, or comparing.

### 3. Dedicated CCJK Permission Bridge File

Clavue now supports writing CCJK’s expected permission shape to:

```text
~/.ccjk/permissions.json
```

Example bridge file:

```json
{
  "allowed": [
    "file-read",
    "file-write",
    "git-operations",
    "npm-commands",
    "node-execution",
    "mcp-server"
  ],
  "denied": [
    "system-commands",
    "network-access",
    "file-delete"
  ],
  "trustedDirectories": [
    "/path/to/current/workspace"
  ],
  "autoApprovePatterns": [
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx",
    "*.json",
    "*.md",
    "*.css",
    "*.html"
  ]
}
```

Recommended CCJK precedence:

```text
1. ~/.ccjk/permissions.json
2. ~/.clavue/settings.json permissions, normalized if running with Clavue
3. ~/.claude/settings.json permissions, normalized as legacy fallback
4. CCJK development template
```

This avoids mutating user Claude Code settings while still giving CCJK a stable permission source.

### 4. Command Discovery Locations

Clavue reads user command and skill content from:

```text
~/.clavue/commands
~/.clavue/skills
~/.claude/commands  legacy fallback unless disabled
~/.claude/skills    legacy fallback unless disabled
```

Project-local content:

```text
<repo>/.clavue/commands
<repo>/.clavue/skills
```

Recommended CCJK installer behavior:

- Prefer installing Clavue-targeted commands into `~/.clavue/commands/ccjk`.
- Continue supporting `~/.claude/commands/ccjk` for Claude Code.
- If both exist, prefer `~/.clavue` for Clavue.

### 5. Slash Command Naming

Clavue supports `ccjk:*` command names and aliases. For example:

```text
/ccjk:git-commit
/git-commit  if installed as a non-conflicting alias
```

Recommended CCJK command naming:

- Canonical CCJK namespace: `ccjk:<command>`.
- Optional bare alias only when it does not conflict with a built-in Clavue command.
- Do not assume `/maoclaw` is a built-in command. It is not registered as a Clavue built-in.

### 6. Frontmatter Tool Compatibility

Clavue supports CCJK-style command frontmatter such as:

```yaml
allowed-tools: Read(**), Exec(git status, git diff, git add, git commit), Write(.git/COMMIT_EDITMSG)
```

Clavue normalizes:

```text
Exec(...)  -> scoped Bash rules
Write(...) -> scoped Edit rules
```

Recommended CCJK generation rules:

- Prefer scoped commands, not broad `Exec` or `Bash`.
- Avoid empty `Exec()` or `Write()` unless the command is intentionally read-only.
- Preserve quoted commas in command lists, for example:

```yaml
allowed-tools: Exec(git log --format="%h,%s", git status)
```

### 7. Zero-Config Permission Setup

Clavue has added a one-command user flow:

```text
/permissions setup
```

This installs a safe Clavue permission preset and writes the CCJK bridge file. CCJK can improve zero-config behavior by:

- Detecting a missing or malformed `~/.ccjk/permissions.json`.
- Offering a non-crashing repair prompt.
- Supporting a non-interactive repair command, for example:

```bash
ccjk system permissions repair --target clavue
```

Suggested repair behavior:

- Create `~/.ccjk/permissions.json` with the CCJK development template.
- Add the current working directory to `trustedDirectories`.
- Do not overwrite `~/.clavue/settings.json` or `~/.claude/settings.json` unless explicitly requested.

## Proposed CCJK Fix Checklist

- Normalize `permissions.allowed`, `permissions.denied`, `permissions.trustedDirectories`, and `permissions.autoApprovePatterns` before any `.sort()`, `.includes()`, or iteration.
- Read `~/.ccjk/permissions.json` first.
- Add Clavue config root discovery: `$CLAVUE_CONFIG_DIR` then `~/.clavue`.
- Treat `~/.claude` as legacy fallback when running under Clavue.
- Support both `allow` / `deny` and `allowed` / `denied` permission shapes.
- Install Clavue-targeted commands under `~/.clavue/commands/ccjk`.
- Use canonical `ccjk:<command>` slash command names with optional non-conflicting bare aliases.
- Do not require Clavue users to modify `~/.claude/settings.json`.
- Add a regression test for `ccjk system permissions` with a Claude/Clavue-style settings file.

## Regression Test Cases

### Case 1: Missing CCJK Permission File

Setup:

```bash
rm -f ~/.ccjk/permissions.json
```

Expected:

```bash
ccjk system permissions
```

Should not crash. It should show the development template or a repair suggestion.

### Case 2: Claude/Clavue-Style Permission Shape

Settings:

```json
{
  "permissions": {
    "allow": ["Read(**)", "Edit(**)", "Bash(git status:*)"],
    "deny": ["Bash(rm:*)"],
    "additionalDirectories": ["/tmp/example"]
  }
}
```

Expected:

- CCJK should normalize this shape.
- CCJK should not call `.sort()` on undefined fields.
- CCJK should display a meaningful status.

### Case 3: CCJK Bridge Shape

Settings:

```json
{
  "allowed": ["file-read", "git-operations"],
  "denied": ["file-delete"],
  "trustedDirectories": ["/tmp/example"],
  "autoApprovePatterns": ["*.ts", "*.md"]
}
```

Expected:

- CCJK should display the current template or custom template.
- Trusted directories should render correctly.
- No fallback to `~/.claude/settings.json` should be required.

## Clavue-Side Status

Clavue `8.8.94` already includes:

- `ccjk:*` skill and command permission matching.
- CCJK `Exec(...)` and `Write(...)` frontmatter normalization.
- Legacy `~/.claude/commands` and `~/.claude/skills` read fallback.
- Primary `~/.clavue` config root.
- `/doctor` diagnostics for the CCJK permission bridge.
- `/permissions setup` to write `~/.ccjk/permissions.json`.

The remaining improvement is for CCJK to consume these contracts natively so users do not have to run manual repair steps after installing CCJK.

# Round 1 (cont.) — Reality scan: runtime env shadow black-hole

## Round goal

After shipping v15.27.1–v15.27.4 (menu Ctrl+C / status language / help description / onboard exit), audit what high-friction surface remains on the default user path: setup → code → validate → recover → deliver.

## Baseline observation

Reading the live shell of the current machine reveals the silent friction:

```
ANTHROPIC_BASE_URL=https://ttqq.inping.com         ← from .zshrc:26
ANTHROPIC_API_KEY=...                              ← shadowed in shell
ANTHROPIC_MODEL=claude-opus-4-7-max                ← shadows settings.json
ANTHROPIC_SMALL_FAST_MODEL=claude-opus-4-7-low     ← deprecated env still exported
ANTHROPIC_CUSTOM_MODEL_OPTION=claude-opus-4-7-max  ← third-party only
CLAUDE_CODE_SUBAGENT_MODEL=claude-opus-4-7-high    ← non-official
```

User had `~/.zshrc:26-28` exporting these in 2025 and forgot. Then user runs `ccjk use other-profile`, ccjk writes `~/.claude/settings.json` perfectly, but Claude Code starts with `process.env` populated by the parent shell — and **shell env beats settings.json env**. The profile switch silently has no effect.

`ccjk doctor` today: **completely blind**. Only lints config files; never inspects `process.env`. Output 32 lines, finds 10 file-level issues, but misses the actual cause of "切了 profile 没生效".

## Primary metric

A user with the conflicting shell env above currently sees:

- `ccjk status` → green "healthy", reports baseUrl=B from settings, hides A from shell
- `ccjk doctor` → 10 findings, none about the conflict
- Claude Code → silently uses shell value, ignores settings.json

After the fix:

- `ccjk doctor` includes a `[Runtime] shell environment` section
- New rule `shell-env-shadow` warns when `process.env.ANTHROPIC_*` exists **and conflicts** with `settings.env.*`
- New rule `shell-env-deprecated-export` infos when shell exports already-known-bad env
- exit code stays warn (1)

## Drift / friction inventory

| Surface         | Friction                                                                                  | Severity |
| --------------- | ----------------------------------------------------------------------------------------- | -------- |
| doctor          | **No runtime env scan** — file-only lint misses the most common "切了没生效" cause       | high     |
| status          | No drift indicator if process.env shadows settings.json                                  | medium   |
| init / use      | After writing settings, no warning that shell env may override                            | medium   |
| tools           | Single-line OK, not a friction point                                                      | none     |
| perms-show      | Single-line OK after v15.27.3                                                             | none     |

The doctor gap is highest leverage: it is the de-facto "why doesn't my profile work" command, and a single new rule + a 30-line runtime scan turns the worst silent failure into a visible warning.

## Quality dimensions

- **Compatibility**: a runtime section is additive; existing findings/exit codes unchanged. JSON schema adds one optional `targets[]` entry, gated by schemaVersion=1 (callers ignoring unknown tools still parse).
- **Stability**: lint stays a pure function over `settings + env`. Runtime scan is its own module, no IO except `process.env`.
- **Interaction logic**: the new section follows the existing `[Tool] path` heading style — no new visual idiom.
- **Reliability**: deterministic per process invocation; tests fully control env via `vi.stubEnv`.

## Decision

Proceed to round 2 with the slice **doctor runtime env shadow detection** as the leading candidate. Other candidates (env-doctor as standalone, init-time shell warning, status drift badge) are evaluated next.

## Next hypothesis

A 30-line `core/runtime-env.ts` + 20-line doctor integration + 5 focused tests will let `ccjk doctor` catch the single highest-frequency user-visible failure mode on the default path, with zero regression to existing findings.

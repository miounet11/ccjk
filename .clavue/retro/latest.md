## Run tag
2026-05-25-product-interaction-retro (v15.27.5)

## Slice
doctor-runtime-env-shadow — `ccjk doctor` 新增 `[Runtime] shell environment` 段，
检测 shell rc 残留 env shadow 文件配置（切了 profile 没生效的头号黑洞）。

## Baseline
- `pnpm test` → 325 passed / 29 files
- `node dist/cli.js doctor` → 32 行输出，10 个文件 findings，runtime 段缺失

## Verification
- `pnpm typecheck` → passed
- `pnpm lint` → passed
- `pnpm test` → 335 passed / 30 files (+10)
- `pnpm build` → passed
- 实机 `node dist/cli.js doctor` → runtime 段出现，3 条 deprecated-export 命中
  （ANTHROPIC_CUSTOM_MODEL_OPTION / ANTHROPIC_SMALL_FAST_MODEL / CLAUDE_CODE_SUBAGENT_MODEL）
- shadow 逻辑细化：clavue settings 与 shell 一致时不再误报
- `--json` 含 `runtime.findings[]`，schemaVersion 不变

## Scorecard
- user impact: 5/5
- roadmap alignment: 5/5
- implementation risk: 4/5
- verification clarity: 5/5
- simplicity payoff: 4/5
- total: 23/25

## Keep/discard decision
keep

Compatibility: improved（JSON 字段 additive；human 输出仅在有 findings 时打段）。
Stability: improved（inspectRuntimeEnv 纯函数无 IO；test 完全控 env）。
Interaction logic: improved（最常见的静默失败现在在用户已经会去的恢复入口可见）。
Reliability: improved（顺便修了 doctor-json suite 漏 stub host env 的 flake 风险）。

## Next hypothesis
`ccjk status` 给 baseUrl/model 字段加一个 ⚠ drift badge：把 doctor 已经知道的 shadow
事实推到「每次都看」的 status 入口。risk = 表格列宽，所以下一轮再说。

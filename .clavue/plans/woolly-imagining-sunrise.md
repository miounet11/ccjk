# Retro upgrade loop plan

## Context

本次 `/retro` 要按 autoresearch 风格跑产品升级循环：用仓库事实而不是空谈，围绕 AI coding CLI 身份、兼容性、稳定性、交互逻辑、可靠性做至少 3 个巡检/升级记录。

只读侦察结论：
- `PRODUCT.md`、`ARCHITECTURE.md` 当前缺失；不能伪造控制文档。
- 可用产品地面事实来自 `README.md`、`package.json`、`CLAUDE.md`、`AGENTS.md`、`linian.md`、源码和测试。
- 默认产品方向已经偏向 Clavue：`DEFAULT_CODE_TOOL_TYPE = 'clavue'`，`STARTUP_CODE_TOOL_CHOICES = ['clavue', 'claude-code', 'codex']`。
- 一个高杠杆摩擦点在 `src/config/smart-defaults.ts`：`detect()` 先执行 `detectClaudeCodeVersion()`，而该函数固定按 `claude` 再 `clavue` 探测版本；这会让 Clavue 默认路径的运行时证据偏向 Claude Code，和产品身份/默认 runtime 不一致。

## Run tag

`2026-05-06-cli-continuity`

## Operating contract

- 留在当前 `main` 分支。
- 创建/维护未跟踪 ledger：`.clavue/retro/results.tsv`。
- 创建/维护 rolling note：`.clavue/retro/latest.md`。
- 每个巡检计划写到：
  - `.clavue/retro/plans/2026-05-06-cli-continuity-round-1-reality-scan.md`
  - `.clavue/retro/plans/2026-05-06-cli-continuity-round-2-ranking.md`
  - `.clavue/retro/plans/2026-05-06-cli-continuity-round-3-upgrade-evaluation.md`
- 每个巡检完成后向 `.clavue/retro/results.tsv` 追加一行。
- 这些 retro 文件保持未跟踪，不提交。

## Recommended slice

修正 smart defaults 的 runtime 版本探测顺�：先确定 active/default code tool，再优先探测对应 runtime 命令；保留 `claudeCodeVersion` 字段兼容旧调用，同时新增或内部使用 runtime-aware 结果，避免 Clavue 默认路径被 Claude Code 版本误导。

## Files to inspect/modify

- `src/config/smart-defaults.ts`
  - 复用 `CODE_TOOL_INFO`、`commandExists`。
  - 调整 `detect()` 顺序：先 `const codeToolType = this.detectCodeToolType()`，再 runtime-aware version detection。
  - 将版本探测候选顺序改为 `[active runtime, claude-code, clavue]` 去重。
- `tests/config/smart-defaults.test.ts`
  - 增加 Clavue marker 存在时优先执行 `clavue --version` 的回归测试。
  - 保持已有 `claudeCodeVersion` 断言兼容。
- `.clavue/retro/results.tsv`
- `.clavue/retro/latest.md`
- `.clavue/retro/plans/*.md`

## Patrol cycles

### Round 1: Reality scan

Goal: 固化事实，不再假设 `PRODUCT.md`/`ARCHITECTURE.md` 存在。

Baseline command/observation:
- `test -f PRODUCT.md; echo $?` and `test -f ARCHITECTURE.md; echo $?`
- source observations from `README.md`, `package.json`, `src/constants.ts`, `src/utils/code-type-resolver.ts`, `src/config/smart-defaults.ts`.

Primary metric:
- 产品身份事实是否能落到具体 runtime 代码路径。

Output:
- 写 round-1 plan artifact。
- ledger row status `keep`，slice 为 reality scan/no-code。

### Round 2: Critique and ranking

Goal: 排 3-5 个候选，只选一个最小可验证切片。

Candidate ranking draft:
1. Smart defaults runtime version routing — high user impact, high roadmap alignment, low risk, clear tests.
2. Startup discovery banner command wording — visible but mostly copy/UI.
3. Completion guidance for Clavue slash commands — mostly already covered by tests.
4. Capability executable matrix — valuable but too broad.
5. PRODUCT/ARCHITECTURE docs reconstruction — blocked by missing source of truth; risk of invention.

Primary metric:
- 能用单个 focused Vitest 验证的默认路径改进。

Output:
- 写 round-2 plan artifact。
- ledger row status `keep`，slice 为 ranking/no-code。

### Round 3: Upgrade and evaluation

Goal: 实现 runtime-aware version probing，并用 before/after 同一测试面验证。

Baseline command:
- `pnpm vitest run tests/config/smart-defaults.test.ts`

Implementation notes:
- 在 `detect()` 中保存 `codeToolType` 局部变量，避免重复探测导致不一致。
- 将 `detectClaudeCodeVersion()` 改为接受 `preferredCodeTool?: string` 或重命名内部 helper；若 active 是 `clavue`，先查 `clavue --version`，再 fallback `claude --version`。
- 对候选命令去重，避免 `clavue`/alias 重复执行。
- 不改公共配置格式，除非测试显示需要；避免破坏兼容。

Verification command:
- Targeted: `pnpm vitest run tests/config/smart-defaults.test.ts`
- If targeted survives: optionally `pnpm typecheck` if scope remains small and time allows.

Scorecard dimensions:
- compatibility: should improve/neutral; old `claudeCodeVersion` remains.
- stability: should improve; active runtime version detection deterministic.
- interaction logic: should improve; Clavue default path no longer reports Claude-first evidence.
- reliability: should improve; tests lock fallback behavior.

Keep/discard rule:
- Keep only if focused test passes and no public API break.
- Discard/narrow if version command mocking becomes brittle or the change requires broad config migration.

## Final reporting

End response must include for each completed round:
- run tag
- finding
- change made
- verification run
- keep/discard decision
- next hypothesis

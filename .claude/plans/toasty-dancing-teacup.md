# Context

用户要参考 `karpathy/autoresearch`，把 CCJK 现有的 research / brain / workflow 能力升级成一个“多轮次、可持续迭代、直到停止条件满足才结束”的自治研究流程，而不是当前的一次性 `ccjk research run`。

`autoresearch` 的关键不是单次实验，而是持续循环：先建立 baseline，再逐轮验证 candidate，比较结果，接受/拒绝，记录结论，并在满足停止条件时结束。

结合当前仓库状态，最稳妥的首版路径不是接入 `brain` mock / placeholder 执行链路，而是复用已经可运行的 `src/services/research-runner.ts`，在其上新增 loop 与 program 两层能力。

额外确认到的实现约束：
- `src/commands/research.ts` 目前只处理单次 run/status/report/results/sessions。
- `src/cli-commands.ts` 当前 research 命令 options 还没有 `--program`、`--db-path`、`--max-rounds` 等 loop 所需参数。
- `src/brain/task-persistence.ts` 的 `saveSession()` 已足够存 loop metadata，但当前是 `INSERT OR REPLACE`，会刷新 `created_at`；首版应把 loop 的真实创建时间记在 `metadata.createdAt`，不要把数据库行时间当权威来源。
- `src/brain/orchestrator.ts` / `src/brain/agents/research-agent.ts` 仍有 mock / placeholder，不适合成为首版核心执行引擎。

# Recommended approach

## 1. 先落一套“program + loop state + round executor”的最小闭环
- 新增 `src/services/research-program.ts`：
  - 解析固定路径 `.ccjk/research/program.md`
  - 生成默认 program 模板
  - 将文本配置归一化为结构化 `ResearchProgram`
- 新增 `src/services/research-loop.ts`：
  - 创建/恢复 loop session
  - 运行 baseline
  - 逐轮执行 candidate run
  - 基于结果 accept/reject
  - 维护 best/no-improve/stop reason
  - 输出 loop 级 status/report
- 不重写命令执行与 metric 比较逻辑；baseline 和 candidate round 都通过 `runResearchExperiment()` 执行。

## 2. program 文件采用固定路径 + 极简结构化字段
- 首版固定使用 `.ccjk/research/program.md`，避免和仓库现有文档混淆。
- 文件格式保持简单：顶部结构化字段，下面 markdown 正文说明 goal / guardrails / notes。
- 结构化字段最低包含：
  - `name`
  - `metric`
  - `objective`
  - `baselineCommand`
  - `candidateCommand`
  - `cwd`
  - `maxRounds`
  - `maxNoImproveRounds`
  - `budgetMs`
  - `targetMetric`
- `research-program.ts` 提供：
  - 默认路径解析
  - 默认模板生成
  - 文件读取与解析
  - 缺省值归一化与基础校验
- `ccjk research init` 只负责写模板，不把运行结果回写到 program 文件。

## 3. loop persistence 直接复用现有 `TaskPersistence.sessions.metadata`
- 不新建数据库表。
- 新的 loop session metadata 至少记录：
  - `kind: 'research-loop'`
  - `programPath`
  - `status` (`running` / `stopped` / `completed` / `failed`)
  - `baselineSessionId`
  - `currentRound`
  - `bestSessionId`
  - `bestMetricValue`
  - `acceptedRoundSessionIds`
  - `rejectedRoundSessionIds`
  - `noImproveStreak`
  - `stopReason`
  - `createdAt`
  - `updatedAt`
- 单轮 baseline / candidate 结果继续沿用现有 `research` session + `research-results.tsv`；loop service 只聚合，不重复存底层 run 数据。

## 4. round executor 固定走 baseline → candidate → compare → accept/reject
- `research-loop.ts` 提供这些主入口：
  - `initResearchProgram()`
  - `startResearchLoop()`
  - `runResearchRound()`
  - `resumeResearchLoop()`
  - `stopResearchLoop()`
  - `getResearchLoopStatus()`
  - `getResearchLoopReport()`
- 执行顺序：
  1. 读取并解析 program
  2. 创建/恢复 loop session
  3. 若无 baseline，则先调用 `runResearchExperiment()` 跑 baseline
  4. 执行一轮 candidate run，`baselineSessionId` 指向当前 best 或初始 baseline
  5. 根据 `comparison.result` 与 `verdict` 判定 accept/reject
  6. 更新 best/no-improve streak/stop reason
  7. `loop` 模式继续下一轮，`round` 模式执行一轮后返回
- 首版“完整多轮次处理”先聚焦**循环决策与持久化**；暂不接入自动改代码/工作树改写能力，避免把不稳定的 brain mock 接进关键路径。

## 5. 停止条件做成独立纯函数
- 在 `research-loop.ts` 内抽出 stop condition evaluator，输入 loop state + latest round result，输出：
  - `shouldStop`
  - `reason`
- 首版支持：
  - 达到 `maxRounds`
  - 达到 `maxNoImproveRounds`
  - 达到 `targetMetric`
  - baseline 或 candidate 连续失败触发 fail-safe
  - 手动 stop 标记
- 这样服务层测试可以直接覆盖状态迁移，而不是只测 CLI 文案。

## 6. 扩展 CLI，但保持现有单次 run 兼容
- 修改 `src/commands/research.ts`：
  - 扩 `ResearchCommandOptions`
  - 增加 action：`init` / `loop` / `round` / `resume` / `stop`
  - `status` / `report` 同时兼容传统 `research` session 与新的 `research-loop` session
  - 把 loop 相关逻辑拆进独立 helper，避免单文件 switch 继续膨胀
- 修改 `src/cli-commands.ts`：
  - research options 增加 `--program <path>`
  - 增加 `--db-path <path>`
  - 增加 `--max-rounds <n>`、`--max-no-improve-rounds <n>`、`--target-metric <value>`（作为 CLI override，可选）
  - 透传到 `researchCommand()`
- 保留现有 `run/results/report/status/sessions` 行为，避免回归。

## 7. services 导出最小增量扩展
- 修改 `src/services/index.ts`：
  - 导出 `research-program.ts` 的主要类型与函数
  - 导出 `research-loop.ts` 的主要类型与函数
- 不修改 `src/brain/orchestrator.ts`、`src/brain/task-decomposer.ts`、`src/commands/brain.ts`，首版不把它们放进关键执行链路。

## 8. 测试按“纯函数 → 服务 → CLI”顺序补齐
1. `tests/services/research-program.test.ts`
   - 默认路径
   - 默认模板内容
   - parser 对缺省值/非法值的归一化
2. `tests/services/research-loop.test.ts`
   - baseline 初始化
   - accept/reject
   - best round 更新
   - no-improve streak 递增
   - stop/resume/report
3. `tests/commands/research.test.ts`
   - 新 action 参数透传
   - CLI guardrail
   - loop status/report 输出分支

## 9. 推荐实施顺序
1. `src/services/research-program.ts`
2. `tests/services/research-program.test.ts`
3. `src/services/research-loop.ts`
4. `tests/services/research-loop.test.ts`
5. `src/commands/research.ts`
6. `src/cli-commands.ts`
7. `tests/commands/research.test.ts`
8. `src/services/index.ts`

# Critical files to modify
- `src/services/research-program.ts` (new)
- `src/services/research-loop.ts` (new)
- `src/commands/research.ts`
- `src/cli-commands.ts`
- `src/services/index.ts`
- `tests/services/research-program.test.ts` (new)
- `tests/services/research-loop.test.ts` (new)
- `tests/commands/research.test.ts`

# Existing code to reuse
- `runResearchExperiment()` in `src/services/research-runner.ts`
- `buildComparisonSummary()` / `determineVerdict()` semantics already embodied by `runResearchExperiment()` outputs in `src/services/research-runner.ts`
- `TaskPersistence.saveSession()` / `restoreContext()` / `listSessions()` in `src/brain/task-persistence.ts`
- Existing CLI formatting helpers in `src/commands/research.ts` such as `printDivider()`, `formatMetric()`, `formatTimestamp()`, `previewCommand()`

# Verification
- `pnpm vitest tests/services/research-program.test.ts tests/services/research-loop.test.ts tests/commands/research.test.ts`
- `pnpm typecheck`
- 如 CLI 注册或导出改动带来额外影响，再跑 `pnpm build`
- 手动验证：
  - `ccjk research init`
  - `ccjk research loop`
  - `ccjk research round`
  - `ccjk research resume`
  - `ccjk research stop`
  - `ccjk research status`
  - `ccjk research report`

# Done when
- 可以初始化 program 模板
- 可以创建可恢复的 research loop session
- baseline / candidate / accept / reject / stop reason 都能持久化
- `status` / `report` 能展示 loop 级信息
- 传统 `ccjk research run` 行为不回归

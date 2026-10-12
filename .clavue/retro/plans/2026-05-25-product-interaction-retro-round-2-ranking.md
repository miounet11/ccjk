# Round 2 — Ranking (JEPA imagined rollouts)

## Run tag
2026-05-25-product-interaction-retro

## Round goal
列出 3–5 个交互层升级候选；每个评分并预测能量 delta；选总分最高 + 简单优先的那个进 Round 3 实施。

## Baseline 命令
- 看 Round 1 摩擦清单。
- `grep ExitPromptError src/`：顶层 cli.ts 已有处理（cli.ts:415-419），但 `menu.ts:261` 内层 catch 把它当普通错误吞掉。
- `src/commands/menu.ts.bak` 里曾有 `handleExitPromptError` helper，迁移到新版菜单时**没保留**。

## Primary metric
默认菜单路径上「视觉污染 / 多余 prompt 数」减少量；用 1 次菜单+1 次 Ctrl+C 取消的实跑作为对比。

## 能量公式
`energy = unmet_doneWhen * 0.5 + constraint_drift * 0.3 - simplicity_payoff * 0.2`（值越小越好；预测的 delta 是「能量减少量」，越正越好）。

## 候选清单

| # | 候选 | 用户影响 | 路线图对齐 | 实施风险 (低=高分) | 验证清晰度 | 简洁回报 | 总分 | 预测 Δ |
|---|---|---|---|---|---|---|---|---|
| **A** | **menu.ts 内层 catch 识别 ExitPromptError，静默回菜单（不打红字、不强制再选「回菜单/退出」）** | 5 | 5 | 5 | 5 | 5 | **25/25** | **+0.7** |
| B | status.ts Profile 段语言统一（去掉 `(直接配置)`/`未配置` 矛盾，改成「Clavue: profile=glm」或「Clavue: 直接 env（未 profile 化）」） | 3 | 3 | 5 | 4 | 4 | 19/25 | +0.25 |
| C | doctor 分阶段输出：先 errors 一屏，问 fix yes/no，再 warnings | 4 | 4 | 2 | 3 | 2 | 15/25 | +0.15 |
| D | 补 PRODUCT.md / ARCHITECTURE.md 草稿（steering 文档） | 2 | 5 | 3 | 2 | 3 | 15/25 | +0.0（doc-only） |
| E | menu 完成动作后自动回菜单（去掉强制「完成。回菜单/退出」prompt，改成 1.2s 后自动回，或按任意键回） | 4 | 3 | 3 | 4 | 4 | 18/25 | +0.3 |

理由：能量公式里 simplicity_payoff 权重 0.2 + risk 反向 → A 在所有维度都拿 5，且每次菜单 Ctrl+C 都被命中（高频），用户感知最强。

## 选择
**候选 A — menu 内层 ExitPromptError 静默处理**。

理由：
1. 高频：用户在子菜单里按 ESC/Ctrl+C 取消是日常操作。
2. 现有顶层 catch 已经证明这是「不该报错」的事件类型——只需把同样逻辑下沉到 menu 内层。
3. 顺手可以裁掉 Round 1 摩擦点 #2（菜单完成强制再问「回菜单/退出」——既然取消能静默回菜单，**正常完成也应该静默回菜单**，去掉那一道 prompt）。这是同一个修复范围内的自然附带改进，**不属于"顺手优化"**：因为不修就会出现「取消静默回、正常完成反而要再点一下」的反直觉。
4. 既不动业务逻辑也不动测试基线（除了菜单交互；菜单本身没单测，但底层命令测试不变）。

候选 B/C/D/E 全部 → 入 `parked.tsv`。

## Predicted energy delta
+0.7（A 一次性消除 Round 1 的 #1 + #2 两个摩擦，覆盖菜单默认路径每次取消和每次完成）。

## Verification 计划
- before：手动跑 `node dist/cli.js menu` → 选 quick → Ctrl+C 取消 → 观察红字 + 「完成。回菜单/退出」prompt。
- after：相同操作 → 期待静默回主菜单，无红字、无额外 prompt。
- 测试 baseline：`pnpm typecheck && pnpm test && pnpm lint` 仍全绿（317 tests）。
- menu 本身没单测；但子命令测试不变，且 menu 改动只在错误路径 / 完成后的 prompt。

## Keep/discard decision
（待 Round 3/4 完成后给）

## Next hypothesis
若 A 验证通过 → 下一轮考虑 B（status 语言统一）或 D（PRODUCT.md 草稿）。

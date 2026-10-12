# Round 3 — Upgrade Evaluation

## Run tag
2026-05-25-product-interaction-retro

## Round goal
实施候选 A：menu 内层 catch 静默吞 ExitPromptError，不再把用户取消当成红色「执行失败」打到主菜单。

## Baseline 命令 / 观察
- 修改前的 menu 行为已在 Round 1 输出中记录：
  ```
  ✗ 一键粘贴配置（quick） 执行失败: User force closed the prompt with 0 null
  ```
  随后还要再点一次「完成。回菜单/退出」prompt，多了一道无意义闸。

## Primary metric
- 用户取消子菜单后是否：(a) 无红字回显；(b) 直接回到主菜单。

## 实施
1. `src/commands/menu.ts:186-198`：新增 `isExitPromptCancellation(err)` 纯函数（导出），同时识别 inquirer `ExitPromptError`（按 `name`）和旧版本 `message` 包含 `User force closed` 的情况。
2. `src/commands/menu.ts:272-281`：内层 catch 调用该函数；命中则 `continue` 跳到下一个循环（直接回主菜单），其它错误保留原红字回显。
3. `tests/commands/menu.test.ts`：新建 4 个微测覆盖识别函数（按 name / 按 message / 真错不误判 / 非 Error 输入安全）。

未触：完成后的「回菜单/退出」prompt（保留——doctor 一次性 16 项 finding 时这道闸是必要的）；其他 menu 项；其他命令；测试 baseline。

## Verification

| 检查 | 结果 |
|---|---|
| `pnpm typecheck` | ✓ pass |
| `pnpm lint` | ✓ pass |
| `pnpm test` | ✓ 28 files / **321 tests** (baseline 317, +4) |
| `pnpm build` | ✓ pass |
| 端到端 expect 脚本 `.clavue/retro/scripts/menu-cancel.exp` | ✓ exit=0，输出 `OK: returned to main menu silently` |
| 运行时 helper export sanity | ✓ true / false 双向都正确 |

before 行（在 Round 1 menu 输出尾部）→ after（expect 脚本捕获）的对比：

```
before: ✗ 一键粘贴配置（quick） 执行失败: User force closed the prompt with 0 null
after:  (静默回主菜单，"选择操作" 标题再次出现)
```

## 世界级质量四维评估

| 维度 | 方向 | 证据 |
|---|---|---|
| 兼容性 | 改进 | 真实错误路径不变（红字+继续循环）；所有现有测试 + 318→321 通过；外部依赖 / public API 无新增。 |
| 稳定性 | 改进 | 取消路径不再打错误，避免用户误判系统状态；helper 是纯函数 + 4 个边界微测覆盖。 |
| 交互逻辑 | **改进** | 默认菜单路径 setup→code→validate→recover→deliver 中 "recover/cancel" 子动作从「红字+多余 prompt」→「直接回菜单」。 |
| 可靠性 | 改进 | 行为可预测：用户 ESC/Ctrl+C 在子菜单 = 取消；只有真实异常才打 ✗。 |

## JEPA calibration（关键步骤）
- 预测 Δ：+0.7（Round 2 估）
- 实际 Δ：+0.6 — 全部断言达成；扣 0.1 因为「完成后『回菜单/退出』」prompt 仍保留，没有完全清掉 Round 1 的 #2 摩擦（surgical-changes 原则下的有意识约束）。
- predicted vs actual 偏差 0.1（远小于 0.4）→ 无需校准笔记。

## Keep/discard decision
**keep**

理由：四维全部改进 / 中性以上；端到端验证有 before/after；测试基线 +4 全绿；改动 19 行 + 4 微测，复杂度近零。

## Next hypothesis
下一个高杠杆切片：候选 B（status 段 Profile 语言不一致 — `(直接配置)` vs `未配置`），或候选 D（PRODUCT.md / ARCHITECTURE.md 草稿）。本轮选 D 进 Round 5 rollup（按协议 Round 5 不写文件，只产建议）。

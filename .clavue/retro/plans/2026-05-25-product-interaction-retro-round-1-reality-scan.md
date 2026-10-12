# Round 1 — Reality Scan

## Run tag
2026-05-25-product-interaction-retro

## Round goal
基于真实交互复盘 ccjk 在「产品力 + 效率」上是否完美，重点扫"交互"部分（菜单 / Ctrl+C / 状态输出 / 错误回显）。

## Baseline 命令 / 观察
- `node dist/cli.js menu` 进交互菜单，选「一键粘贴配置」→ 在 provider 选项上按 Ctrl+C。
- `node dist/cli.js status` 看分段输出。
- `node dist/cli.js doctor` 看体检输出体量。
- `ls PRODUCT.md ARCHITECTURE.md tisheng.md` → 全部 not found。

## Primary metric
- 「默认用户路径」上的可见交互摩擦项数（红色错误回显、概念不一致、强制多余确认）。

## 产品身份 / 目标用户 / 主路径（README + QUICKSTART）
- **产品**：Clavue / Claude Code / Codex 的本地配置 CLI。
- **目标用户**：会用终端、想在多个 API key/provider/profile 之间切换的开发者。
- **主路径（5 分钟）**：`onboard` → `init` → `use` → `doctor` / `probe` → `profile export`。
- **承诺**：「不写代码、不装 hooks、不开后台进程」（QUICKSTART.md:15）。

## 现实 vs 路线图（drift）

| 维度 | 评分 | 证据 |
|---|---|---|
| 产品事实 | ✓ | README + QUICKSTART 与 cli.ts 命令表完全对齐，命令真实存在。 |
| 当前行为 | 部分回归 | menu 内层 catch 把 `ExitPromptError`（Ctrl+C）当作执行失败打红字，cli 顶层有处理但被内层吞掉。`status` 表格列 profile=`(直接配置)`，下方 Profile 段写 `未配置`，两套语言。 |
| 漂移 | 中 | doctor 单次输出可达 16 项 finding 不分阶段；用户「先 --fix 再看剩下的」要靠脑补。 |
| 兼容性 | 中性 | 现有命令签名稳定；CHANGELOG v15.20–v15.27 都明确记录 breaking。 |
| 稳定性 | 中性 | 测试 317 通过；菜单异常不会让进程崩，但会让用户以为崩。 |
| 交互逻辑 | **回归** | Ctrl+C 在子命令里=红色错误；菜单完成后再加一次「回菜单/退出」prompt（实际"直接回菜单"才符合直觉，因为用户进入菜单的意图就是连续操作）。 |
| 可靠性 | 中性 | 行为可预测，但回显误导会让用户误判系统状态。 |

## 关键文件
- `src/commands/menu.ts:258-264`（内层 catch 把 ExitPromptError 转成红字）
- `src/commands/menu.ts:267-278`（强制问回菜单/退出）
- `src/cli.ts:405-413`（顶层已经识别 ExitPromptError 静默退出）
- `src/commands/status.ts:70-78`（Profile 段语言不一致）
- `src/commands/doctor.ts`（待评估单次回显体量）

## 协议性观察
- 用户要求把 PRODUCT.md / ARCHITECTURE.md 当 program.md。这两个文档不存在；前任 retro 已记录这一事实但未补建。Round 5 会基于本轮发现产出**建议草稿**（不直接写入）。

## Keep/discard decision
keep（reality scan 本身是只读、无副作用）

## Next hypothesis
最高杠杆的可立即修的交互摩擦是 **#1（Ctrl+C 红字误报）**：是默认菜单路径上**每次取消**都会触发的视觉污染，修复改动小、可验证、不动业务逻辑。

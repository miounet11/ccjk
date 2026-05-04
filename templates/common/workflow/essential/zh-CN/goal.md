---
description: '持久化目标工作流：仓库内目标计划、原生 /goal 协同、可恢复执行'
argument-hint: <目标描述> [--create] [--run] [--resume] [--status]
---

# 持久化目标工作流

当用户希望一个任务不只存在于当前对话里，而是可以被恢复、检查和继续执行时，使用这个命令。
真实状态必须写入仓库，而不是只依赖聊天记忆。

## 命令上下文

- 工作流 bundle：`essentialTools`
- 安装命令文件：`goal.md`
- Clavue 命令：`/ccjk:goal <目标描述>`
- Claude Code 命令：`/ccjk:goal <目标描述>`
- Codex 命令：`/prompts:goal <目标描述>`
- 原生目标能力：运行时支持时，优先配合 `/goal`

## 用户请求

$ARGUMENTS

## 目标产物

创建或更新一个目标计划目录：

```text
.agent/goals/<goal-id>/
  brief.md
  goals.json
  ledger.jsonl
.agent/goals/active
```

`<goal-id>` 使用简短稳定的名称，例如 `2026-05-05-clavue-goals-runtime` 或
`feature-durable-goals`。如果无法确认当前日期，就使用任务语义生成 slug，并在记录里说明日期不可用。

## 产物契约

`brief.md` 包含：
- 用户意图的一段话总结
- 成功标准
- 约束与非目标
- 推荐执行策略

`goals.json` 包含：

```json
{
  "version": 1,
  "id": "goal-id",
  "status": "ready",
  "runtime": "clavue|codex|claude-code|unknown",
  "goals": [
    {
      "id": "G1",
      "title": "明确的目标标题",
      "status": "ready",
      "depends_on": [],
      "acceptance": ["可观察的验收标准"],
      "evidence": []
    }
  ]
}
```

`ledger.jsonl` 每行记录一个事件：

```json
{"ts":"ISO-8601","event":"created","goal_id":"G1","notes":"Plan created"}
```

## 运行逻辑

1. 识别意图。
   - `--create`：创建或刷新目标产物，然后停止。
   - `--run`：按顺序执行 ready 状态的目标。
   - `--resume`：读取 `.agent/goals/active`，继续下一个 ready 或 running 目标。
   - `--status`：只汇总当前目标状态，不修改文件。
   - 无参数：如果没有 active 目标，先创建计划。

2. 实施前先创建持久计划。
   - 每个目标必须足够小，可以单独完成和验证。
   - 只有真实依赖才写入 `depends_on`。
   - 验收标准必须能通过文件、测试、命令或用户可见行为检查。

3. 与原生 `/goal` 协同。
   - Clavue：优先使用当前运行时的原生 `/goal` 能力。
   - Codex：当 `[features].goals = true` 已启用时，优先使用原生 `/goal`。
   - 如果助手侧无法直接设置原生目标，就继续使用产物计划，并告诉用户应手动设置的 `/goal` 文本。

4. 一次只执行一个目标。
   - 编辑前把目标标记为 `running`。
   - 做最小但有价值的一步。
   - 用最窄的相关命令或检查验证。
   - 只有存在 evidence 时，才把目标标记为 `completed`。
   - 向 `ledger.jsonl` 追加 `checkpoint` 或 `completed` 事件。

5. 遇到阻塞就停止。
   - 如果需求不清楚、不安全或缺少访问权限，把目标标记为 `blocked`。
   - 在 `ledger.jsonl` 记录阻塞点和下一步问题/动作。
   - 不要静默跳过 blocked 目标。

## 输出格式

创建或查看状态时：

```markdown
# Goal Plan
- ID:
- Status:
- Active goal:

# Goals
1. G1 - title - status
2. G2 - title - status

# Next Action
- 继续执行所需的命令或动作
```

执行或恢复时：

```markdown
# Active Goal
- ID:
- Acceptance:

# Work Completed
- 已修改的文件或行为

# Evidence
- 测试、检查或人工核验结果

# Next Goal
- 下一个 ready 目标，或说明已完成
```

## 约束

- 不要把聊天记忆当作唯一状态。
- 不要创建类似“完成整个项目”的巨大模糊目标。
- 没有 evidence 时不要标记完成。
- 不要覆盖已有目标产物里的有效历史。
- Clavue、Codex、Claude Code 必须共享同一套产物契约。

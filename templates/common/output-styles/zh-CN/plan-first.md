---
name: plan-first
description: OpenAI Codex 推荐 - 复杂任务先规划再编码，明确 Goal/Context/Constraints/Done-when
---

# Plan-First 工程风格

> 来源：[Codex Best Practices](https://developers.openai.com/codex/learn/best-practices) — 复杂、模糊或多步骤任务先规划再动手。

## 任务启动四要素

每次接到任务，先在心里（或输出中）对齐：

1. **Goal**：要达成什么结果？
2. **Context**：哪些文件、目录、文档、错误信息相关？
3. **Constraints**：架构、安全、风格、不可触碰的边界是什么？
4. **Done when**：怎样算完成？（测试通过、行为改变、bug 不再复现）

## 规划纪律

- 多文件改动、架构决策、需求不清时：**先出计划，不写代码**。
- 计划包含：影响范围、步骤顺序、验证方式、风险点。
- 计划经确认或自洽后再实施；实施中偏离计划时先说明原因。
- 大任务可拆为可独立验证的小步，每步有明确完成标准。

## 编码原则

- 按计划的最小步骤推进，不做计划外重构。
- 发现计划有误时，更新计划再继续，不硬改。
- 引用代码用 `路径:行号`，便于审查。
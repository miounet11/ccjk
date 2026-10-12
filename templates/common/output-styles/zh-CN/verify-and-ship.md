---
name: verify-and-ship
description: OpenAI Codex 推荐 - 测试/静态检查/自审闭环，确认行为后再交付
---

# Verify-and-Ship 工程风格

> 来源：[Codex Best Practices](https://developers.openai.com/codex/learn/best-practices) — Codex 应测试、检查、确认结果，而非只生成代码。

## 验证闭环（必须）

完成改动后按顺序执行：

1. **测试**：运行与变更相关的最小测试集（单元/集成）；新增逻辑需补测试。
2. **静态检查**：运行项目已有的 lint、format、typecheck（如 `pnpm test`、`pnpm lint`）。
3. **行为确认**：对照任务要求验证实际行为，不只「编译通过」。
4. **Diff 自审**：检查回归、边界条件、危险模式（未处理错误、硬编码密钥等）。

失败则修复并重复闭环，通过后再报告完成。

## 交付标准

- 说明改了什么、为什么、如何验证。
- 列出已运行的命令及结果。
- 未跑全量测试时说明原因与已覆盖范围。
- 不声称「完成」除非 Done-when 条件已满足。

## 协作

- 使用仓库文档中的包管理器与脚本，不臆造命令。
- 破坏性操作前确认；不跳过验证步骤。
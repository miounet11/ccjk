---
description: PR 级代码审查工作流 - 对照 diff 查回归、边界与可维护性（OpenAI /review 实践）
argument-hint: [--uncommitted] [--base <branch>] [--commit <sha>]
---

# Code Review 工作流

> 参考 [Codex Best Practices](https://developers.openai.com/codex/learn/best-practices) 与 `/review`：审查未提交改动、指定 commit 或相对 base 分支的 diff。

## 审查范围

根据参数选择：

- 默认：当前未提交改动
- `--base main`：相对主分支的 PR 式审查
- `--commit <sha>`：单 commit 审查

## 审查清单

1. **正确性**：逻辑是否满足需求？边界与错误路径是否处理？
2. **回归**：是否破坏现有行为或测试？调用方是否需同步修改？
3. **测试**：新逻辑是否有测试？是否只测了 happy path？
4. **安全**：注入、权限、密钥、危险命令、数据泄露风险。
5. **可维护性**：命名、职责单一、重复代码、过度抽象。
6. **Diff 规模**：是否可做更小步？有无无关改动？

## 输出格式

- **Summary**：一句话结论（可合并 / 需修改 / 需讨论）
- **Blocking**：必须修的问题（附文件与行号）
- **Suggestions**：非阻塞改进
- **Verified**：已检查的测试/命令（若运行过）

不自动改代码，除非用户明确要求「审查并修复」。
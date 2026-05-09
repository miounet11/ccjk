export const SLASH_TEMPLATES = {
  'git-commit': `---
description: 用 git diff 分析改动并生成 conventional commit 信息
allowed-tools: Bash(git:*)
---

请按以下步骤生成 commit message：

1. 跑 \`git status -s\` 看暂存/工作区状态。
2. 跑 \`git diff --cached --stat\` 和 \`git diff --cached\` 看已暂存的实际改动。
3. 如果暂存区为空，提示用户 \`git add\` 后再来。
4. 按 conventional commit 规范生成 message：
   - 格式：\`<type>(<scope>): <subject>\`
   - type：feat / fix / refactor / docs / test / chore / perf / style / build / ci
   - subject：祈使句，小写起，<= 50 字符
   - 如果改动超过 5 个文件或跨越多个无关模块，先建议拆分提交
5. 把 message 用代码块输出给用户审阅，**不要直接 commit**。
6. 用户确认后再跑 \`git commit -m "<message>"\`。

注意：不加 emoji。不写"made by Claude"之类的署名。
`,

  'git-rollback': `---
description: 交互式回滚分支到历史版本（reset 或 revert）
allowed-tools: Bash(git:*)
---

请按以下步骤帮用户回滚：

1. \`git log --oneline -20\` 列最近 20 条提交。
2. 让用户选目标 commit hash。
3. 问用户回滚方式：
   - **reset --hard**：重写历史（仅当未推送）
   - **revert**：保留历史，新增反向提交（推荐用于已推送）
4. **强制二次确认**：明确告知会丢失/改写哪些 commit。
5. 用户确认后执行。
6. 执行后跑 \`git status\` 显示结果。

警告：默认不加 \`--no-verify\`。如果有 git hook 失败，先排查根因。
`,

  'git-clean-branches': `---
description: 安全清理已合并的本地分支（dry-run 默认）
allowed-tools: Bash(git:*)
---

请按以下步骤帮用户清理分支：

1. \`git branch --merged main\` 列出已合并到 main 的分支。
2. 排除：\`main\`、\`master\`、当前分支、HEAD。
3. **默认 dry-run**：先列出"将被删除"的分支，不真删。
4. 用户确认后再 \`git branch -d <name>\` 逐个删除。
5. 如果用户传 \`--force\`，可对未合并分支用 \`-D\`，但要单独二次确认。

注意：不删远程分支。不动 \`develop\`/\`release/*\` 类保护分支。
`,
} as const;

export type SlashName = keyof typeof SLASH_TEMPLATES;

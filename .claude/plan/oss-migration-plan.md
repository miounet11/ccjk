# CCJK 项目分身计划 (开源 vs 私有)

## 1. 目录架构拆分定义

### A. 开源版 (Public Repo - "ccjk-core")
*目标：提供 CLI 工具框架，支持基础插件，作为社区分发版。*
- `bin/`: 完整的 CLI 入口。
- `src/core/`: 基础架构逻辑。
- `src/i18n/`: 多语言支持。
- `src/utils/`: 通用工具函数。
- `src/types/`: 基础类型定义。
- `src/prompts/`: 基础系统提示词。
- `templates/`: 开源模板。
- `docs/`: 仅保留基础使用文档和 API 文档。
- `package.json`: 仅保留开源依赖。

### B. 私有版 (Private Repo - "ccjk-pro")
*目标：核心商业逻辑、AI 调度算法、高级功能。*
- `src/brain/`: **[核心保护]** AI 思考逻辑、复杂决策链。
- `src/cloud-plugins/`: 云端集成、收费功能。
- `src/commands-v4/`: 高级指令集。
- `src/mcp-marketplace/`: MCP 市场核心逻辑。
- `.claude/plan/`: **[核心保护]** 所有的开发路径和未来思路。
- `.bmad-core/`: 核心配置。

---

## 2. GitHub 迁移执行计划 (由 Claude Code 执行)

### 第一阶段：现状锁定
1. 将当前 GitHub 仓库 `ccjk` 立即设为 **Private**。
2. 备份所有 Issue 和 Pull Request (如果需要)。

### 第二阶段：开源库提取
1. 创建一个新的临时本地分支 `open-source-squash`。
2. 使用 `git filter-repo` 或手动清理，删除所有私有目录 (`src/brain`, `src/cloud-*`, `.claude/plan` 等)。
3. **彻底清除 Git 历史**：由于旧提交中包含私有代码，开源库必须以一个新的 `Initial Commit` 开始。
4. 初始化新的公开仓库 `github.com/yourname/ccjk`。

### 第三阶段：构建流程调整
1. **源码混淆**：在发布到 NPM 或公开库之前，使用 `tsup` 或 `terser` 对 `src/brain` 的逻辑进行混淆处理。
2. **私有依赖化**：将 `ccjk-pro` 模块作为私有 NPM 包或 Git Submodule 引入开源框架。

---

## 3. Claude Code 执行指令 (Actionable Prompts)

**请将以下指令分步骤输入给 Claude Code：**

### 步骤 1：清理本地私有文件 (准备开源快照)
> "请帮我清理当前目录，准备一个开源版本。
> 1. 删除以下目录及其所有内容：`src/brain`, `src/cloud-plugins`, `src/cloud-sync`, `src/mcp-marketplace`, `.claude/plan`, `.bmad-core`。
> 2. 检查 `src/index.ts` 和 `src/cli.ts`，移除所有对上述被删除模块的引用（改为动态加载或 Mock 掉）。
> 3. 确保项目在移除这些核心后仍能编译通过并运行基础 `help` 命令。"

### 步骤 2：创建干净的 Git 历史
> "我需要为开源版创建一个全新的 Git 仓库，不能包含任何之前的历史记录。
> 1. 在当前目录下运行 `rm -rf .git`。
> 2. 运行 `git init`。
> 3. 添加所有现有（已清理）文件并提交：`git add . && git commit -m 'Initial Open Source Release'`。"

### 步骤 3：配置混淆构建 (保护思路)
> "修改 `build.config.ts`。
> 1. 在 `rollup` 配置中添加 `esbuild: { minify: true }` 以确保输出代码混淆。
> 2. 确认 `inlineDependencies: true` 已开启，以将核心逻辑打包在一起，增加逆向难度。
> 3. 运行 `pnpm build` 并检查 `dist/` 目录，确保核心代码不可直观阅读。"

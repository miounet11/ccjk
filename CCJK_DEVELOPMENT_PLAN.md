# CCJK v12.0 核心架构升级与功能演进实施方案 (Development Implementation Plan)

**文档目标**：将前期产品、架构与 UX 分析报告转化为开发团队可执行的具体研发任务。
**执行周期**：2026 Q1 - Q2
**优先级定义**：P0 (阻断性/核心重构) > P1 (高价值体验优化) > P2 (战略级新功能)

---

## 阶段一：消除技术债与底座加固 (P0 - 立即执行)
*目标：解决跨平台安装失败问题，提升测试稳定性，降低代码维护成本。*

### 任务 1.1：替换原生数据库依赖 (跨平台兼容性修复)
- **现状痛点**：`persistence-manager` 强依赖 `better-sqlite3`，导致在 macOS ARM64、Linux 等环境下经常出现 C++ 绑定编译失败（如测试用例中的报错）。
- **实施方案**：
  1. 移除 `better-sqlite3` 依赖。
  2. 引入纯 JavaScript 实现的本地数据库方案。推荐使用 **`lowdb`** (基于 JSON，轻量且易于调试) 或 **`lmdb`** (高性能键值对存储，无需复杂编译)。
  3. 重写 `src/commands/persistence-manager.ts` 中的数据读写逻辑，确保上下文存储和层级管理功能平滑迁移。
- **验收标准**：`pnpm install` 在全新 macOS/Linux/Windows 环境下 100% 成功，无 node-gyp 编译报错；相关单元测试全部通过。

### 任务 1.2：解耦 UI 输出与业务逻辑 (测试稳定性修复)
- **现状痛点**：业务代码中大量硬编码 `console.log(ansis.cyan(...))`，导致 Vitest 在 Mock 环境下极易崩溃（如 `default.cyan is not a function`）。
- **实施方案**：
  1. 在 `src/utils/` 下新建 `logger.ts` 服务。
  2. 封装 `logger.info()`, `logger.error()`, `logger.success()`, `logger.warn()` 等方法，内部统一处理 `ansis` 颜色渲染。
  3. 全局替换 `src/commands/` 和 `src/utils/features.ts` 中的直接 `console` 调用。
  4. 在测试环境 (`tests/setup.ts`) 中，只需 Mock 这个 `logger` 服务，彻底绕过 `ansis` 的链式调用问题。
- **验收标准**：`pnpm test:run` 稳定通过，不再出现因 UI 渲染库导致的断言失败。

### 任务 1.3：CLI 路由层重构 (代码解耦)
- **现状痛点**：`src/cli-lazy.ts` 长达 2200+ 行，路由注册与业务逻辑严重耦合，违反单一职责原则。
- **实施方案**：
  1. 引入现代 CLI 框架（如 `citty` 或 `cac`）重构入口。
  2. 将 `cli-lazy.ts` 拆分为 `src/commands/` 下的独立 Handler 文件（如 `cmd-init.ts`, `cmd-mcp.ts`）。
  3. 保留现有的分层懒加载机制（core/extended），但通过框架的 sub-command 机制进行注册。
- **验收标准**：`cli-lazy.ts` 代码量缩减至 300 行以内，仅保留核心初始化和命令注册逻辑。

---

## 阶段二：UX 优化与 CLI 能力增强 (P1 - 短期目标)
*目标：提升极客用户和自动化脚本的友好度，降低认知门槛。*

### 任务 2.1：全面支持非交互式命令 (Command Discovery)
- **现状痛点**：许多高级功能（如切换预设、导入环境变量）必须通过交互式菜单（Inquirer）进入，无法被脚本或 Claude Code 直接调用。
- **实施方案**：
  1. 为所有子菜单功能暴露直接的 CLI 参数。
  2. 示例实现：
     - `ccjk env --preset max` (直接应用最大权限预设)
     - `ccjk mcp install mcp-deepwiki context7 --yes` (静默安装指定服务)
     - `ccjk mcp switch dev` (一键切换 MCP 预设)
- **验收标准**：核心功能均可通过单行命令完成，无需人工干预。

### 任务 2.2：机器可读输出支持 (Machine-Readable Output)
- **现状痛点**：`ccjk doctor` 和 `ccjk mcp status` 输出包含大量 ANSI 颜色代码，Claude Code 等 AI 代理难以解析。
- **实施方案**：
  1. 在诊断和状态命令中增加 `--json` 参数。
  2. 当检测到 `--json` 时，跳过所有 UI 渲染，直接 `process.stdout.write(JSON.stringify(data))`。
- **验收标准**：运行 `ccjk doctor --json` 能输出结构化的健康分数和修复建议 JSON。

### 任务 2.3：MCP 市场体验优化
- **现状痛点**：用户在安装 MCP 服务时，面对列表不知道具体服务的用途。
- **实施方案**：
  1. 扩展 `MCP_SERVICE_CONFIGS` 数据结构，增加 `description_zh` 和 `description_en` 字段。
  2. 在 Inquirer 列表中，利用 `ansis.gray` 在服务名称后追加简短的用途说明。
- **验收标准**：MCP 安装列表清晰展示每个服务的一句话简介。

---

## 阶段三：杀手级功能研发 (P2 - 中期目标)
*目标：实现降维打击，从极客工具向大众开发者基础设施演进。*

### 任务 3.1：可视化控制面板 (Web UI)
- **实施方案**：
  1. 新增 `ccjk ui` 命令。
  2. 使用 Vite + Vue/React 构建一个轻量级的本地 SPA。
  3. 后端使用简单的 Node.js HTTP Server（或 Hono）暴露 API，读取和修改 `~/.claude/settings.json`。
  4. 功能包含：MCP 服务拖拽管理、健康分数仪表盘、API 密钥可视化配置。
- **验收标准**：运行 `ccjk ui` 自动在浏览器打开 `localhost:xxxx`，提供完整的图形化配置能力。

### 任务 3.2：团队级配置同步 (Team Sync)
- **实施方案**：
  1. 扩展现有的 Cloud Sync 模块。
  2. 支持读取远程 Git 仓库或指定 URL 的 `ccjk-team.json`。
  3. 新增命令 `ccjk init --team <url>`，拉取团队统一的 API 代理、MCP 列表和工作流规范并强制覆盖本地。
- **验收标准**：团队新员工可通过一行命令瞬间对齐开发环境。

---

## 👨‍💻 开发者执行指南 (Execution Guidelines)
1. **分支策略**：所有 P0 任务必须在 `feat/v12-architecture` 分支上进行，完成后统一合并。
2. **测试驱动 (TDD)**：在重构 `logger` 和 `lowdb` 时，必须先修复并保证现有的 Vitest 用例通过，不允许跳过测试。
3. **向下兼容**：在重构 CLI 路由时，必须保证原有的 `ccjk menu` 和 `ccjk init` 行为与 v11.x 保持完全一致。

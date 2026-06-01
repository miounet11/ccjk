# CCJK 下一实施单元计划

## Context

当前这轮收敛工作已经完成了三块基础修正：

1. `src/code-tools/core/types.ts` / `src/code-tools/index.ts` 已引入 runtime capability descriptor，`status` 已能展示宿主原生能力与 CCJK 托管能力。
2. `src/utils/claude-config.ts` 已修正 myclaude provider 三模式语义（`official` / `openai-native` / `ccr-proxy`），菜单启动 hero 已能显示 route family / strategy / model slots。
3. `src/commands/init.ts` 已修正 myclaude 完成提示，去掉错误的 `/ccjk` 总览入口，改为区分工作流命令与 Smart Guide 快捷入口。

下一步不应继续零散修补，而应把 capability 模型真正接入主菜单，并同步审计 `src/cli-lazy.ts` 中仍可能越界的启动接管点。目标是让 CCJK 在 Claude Code / myclaude / Codex 上表现为“兼容层 + 配置层”，而不是宿主 runtime 的替代者。

## Recommended approach

### 1. 把菜单层改为 capability-aware，而不是继续散落 runtime 分支

在 `src/commands/menu/index.ts` 中，以现有 runtime descriptor 为唯一真相源，梳理当前菜单项与能力的映射关系。

实施方式：
- 复用 `getRuntimeCapabilityDescriptor()` 作为菜单判断入口。
- 为菜单项建立一层最小 capability gate：
  - 宿主原生能力优先显示为“runtime native”
  - CCJK 托管能力显示为“managed by CCJK”
  - 当前 runtime 明确不支持或不应由 CCJK 接管的项，隐藏或降级为说明文案
- 保留已有 `codex` 特殊 handler，但把散落的 `if (codeTool === 'codex')` / `if (codeTool === 'myclaude')` 收敛到少数 capability-aware helper 中，而不是继续在每个菜单项里扩散。

优先影响文件：
- `src/commands/menu/index.ts`
- `src/code-tools/index.ts`
- `src/code-tools/core/types.ts`
- 如有必要：`src/commands/menu/renderer/*`

### 2. 把 myclaude 菜单提示继续对齐“真实可用能力”

在已有启动 hero 基础上，补充菜单级别的真实能力约束：
- 原生命令参考应以 `CODE_TOOL_INFO.myclaude.nativeSlashCommands` 为准。
- 自定义 workflow 命令继续视为安装到 `~/.claude/commands/ccjk` 的扩展命令，而不是伪装成 myclaude 原生命令。
- Smart Guide 的 `/commit`、`/workflow` 等快捷入口只在相关功能已安装或已注入时展示。

复用现有实现：
- `src/constants.ts` 中 `CODE_TOOL_INFO`
- `src/utils/smart-guide.ts`
- `src/utils/workflow-installer.ts`
- `src/commands/init.ts` 中 `getSetupCompletionGuidance()`

### 3. 审计并收敛 `src/cli-lazy.ts` 的启动接管点

以“显式触发优先、默认不抢入口”为标准，审计以下启动行为：
- `bootstrapCloudServices()`
- `autoInitBrainHooks()`
- `executeSlashCommand()`
- `handleIntentRecognition()`

输出结论应明确三类状态：
- 必须保留：属于安装器/兼容层职责
- 改为显式触发：当前默认开启会与宿主 runtime 重叠
- 仅保留桥接/提示：宿主已有原生能力，CCJK 不应接管执行

优先影响文件：
- `src/cli-lazy.ts`
- 如追溯需要：`src/brain/router/*`、`src/core/intent-engine*`、相关 hooks/bootstrap 模块

### 4. 用测试把“真实能力边界”锁住

新增或调整测试，覆盖以下断言：
- 菜单在 `claude-code` / `myclaude` / `codex` 下只展示当前 runtime 真实可用或应由 CCJK 托管的项。
- myclaude 不再把 workflow 命令与原生命令混淆。
- 启动路径在交互菜单模式下不再执行不必要的接管逻辑。

优先测试文件：
- `tests/commands/menu-startup.test.ts`
- `tests/commands/menu-renderer.test.ts`
- 新增：菜单 capability gating 测试
- 如修改启动逻辑：`tests/*cli*` 或对应入口测试

## Critical files

- `src/commands/menu/index.ts`
- `src/cli-lazy.ts`
- `src/code-tools/index.ts`
- `src/code-tools/core/types.ts`
- `src/constants.ts`
- `src/utils/smart-guide.ts`
- `src/utils/workflow-installer.ts`
- `src/commands/init.ts`

## Verification

1. 定向测试：
- `pnpm vitest tests/commands/menu-startup.test.ts tests/commands/menu-renderer.test.ts`
- 新增的菜单 capability 测试

2. 静态验证：
- `pnpm typecheck`
- `pnpm build`

3. 交互验证：
- `node dist/cli.mjs`
- 分别验证 `claude-code` / `myclaude` / `codex` 模式菜单
- 确认只显示当前 runtime 真实能力
- 确认 myclaude 完成提示与 `/commands`、Smart Guide、workflow 安装结果一致

4. 启动行为验证：
- 验证交互菜单路径不会触发多余的 cloud/brain/intent 接管
- 验证显式命令路径仍保留必要初始化行为

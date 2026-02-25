# CCJK 产品力提升 — 开发规格文档 v1.0

更新时间：2026-02-25
代码基线：v12.0.8
文档性质：**可立即排期执行的开发规格**，非概念建议

---

## 零：诊断背景（基于真实代码审查，非假设）

阅读以下源码后得出的实际问题：

| 文件 | 实际观察 |
|---|---|
| [src/commands/init.ts](src/commands/init.ts) | 2059 行，单函数超过 150 行，内嵌闭包函数 4 个，入口分支 5 条（silent/smart/skipPrompt/skipBanner/interactive）|
| [src/commands/menu.ts](src/commands/menu.ts) | 菜单项 16 个（1-8 + K/M/A/P/R/G/0/S/-/+/D/H/Q），新用户看到这个后认知负担极高 |
| [src/health/types.ts](src/health/types.ts) | `HealthResult` 已有 `fix` 和 `command` 字段，但 `renderHealthSection` 里只打印了 3 条 recommendation，`fix` 字段**从未在主 UI 呈现** |
| [src/health/checks/mcp-check.ts](src/health/checks/mcp-check.ts) | `command` 是固定字符串 `'ccjk ccjk:mcp'`，无一键执行逻辑，只展示文字 |
| `showNewUserWelcome()` | 新用户欢迎仅输出 3 行文本，无路径引导，无 `init` 自动触发 |

**核心结论：产品问题不是"能力不足"，而是三个工程断点：**

1. **入口断点**：`init()` 过于全量，新用户和老用户走同一套 2059 行逻辑
2. **诊断断点**：健康检查的 `fix/command` 字段有值但从未被执行，只被展示
3. **路径断点**：菜单 16 项，缺少"只对新用户可见的最小路径"

---

## 一、P0 — 修复入口断点：新用户默认路径改造

### 问题描述

**现状代码路径**（`src/commands/menu.ts:showMainMenu`）：

```
新用户进入菜单
  → isFirstTimeUser() 检测为 true
  → showNewUserWelcome() 输出 3 行文字  ← 仅此而已
  → 展示全部 16 项菜单（与老用户完全相同）
  → 用户自行选择 "1. 完整初始化"
```

**问题**：新用户检测逻辑已经存在，但结果只是打印欢迎语，没有做任何路径差异化。

### 目标状态

```
新用户进入菜单
  → isFirstTimeUser() = true
  → 展示"快速启动向导"（3 步，仅此路径）
  → 完成后标记为老用户，切回完整菜单
```

### 开发规格

#### Task P0-1：提取新用户向导模块

**新增文件**：`src/commands/onboarding-wizard.ts`

```typescript
export interface OnboardingStep {
  id: string
  title: string
  description: string
  action: () => Promise<{ success: boolean; message: string }>
  skipable: boolean
}

export interface OnboardingResult {
  completed: boolean
  steps: Array<{ id: string; success: boolean; message: string }>
  durationMs: number
}

/**
 * 新用户专属 3 步向导，完成后标记为老用户
 */
export async function runOnboardingWizard(): Promise<OnboardingResult>
```

**3 个步骤定义**：

| 步骤 | ID | 内容 | 可跳过 |
|---|---|---|---|
| 1 | `env-check` | 环境检测（调用 `smartDefaults.detect()`）+ 展示结果 | 否 |
| 2 | `api-setup` | API 或代理配置（调用 `configureApiFeature()`）| 是（已配置则跳过）|
| 3 | `verify` | 运行 `runHealthCheck()` 并展示"成功/待修复"摘要 | 否 |

**完成标记**：向导完成后写入 `~/.ccjk/config.json`：

```json
{ "onboardingCompleted": true, "onboardingCompletedAt": "ISO8601 timestamp" }
```

#### Task P0-2：改造 `src/commands/menu.ts`

修改 `showMainMenu()` 中的新用户分支：

**现状**（约第 87 行）：

```typescript
const isNewUser = await isFirstTimeUser()
if (isNewUser) {
  showNewUserWelcome()
}
```

**目标**：

```typescript
const isNewUser = await isFirstTimeUser()
if (isNewUser) {
  const { runOnboardingWizard } = await import('./onboarding-wizard')
  await runOnboardingWizard()
  // 向导内部会标记完成，后续进入正常菜单循环
}
```

#### Task P0-3：改造 `isFirstTimeUser()` 检测逻辑

**现状检测条件**：config 无 version 字段 OR `~/.claude/commands` 目录不存在

**问题**：向导完成后这两个条件仍可能成立（config 无 version 是 CCJK 版本，与向导状态无关）

**修改**：在检测中追加：

```typescript
async function isFirstTimeUser(): Promise<boolean> {
  const config = readZcfConfig()
  // 优先检查明确的 onboarding 完成标记
  if (config?.onboardingCompleted) return false
  // 原有逻辑作为 fallback
  if (!config || !config.version) return true
  if (!existsSync(join(CLAUDE_DIR, 'commands'))) return true
  return false
}
```

#### Task P0-4：简化菜单默认视图（新用户完成向导后可见完整菜单）

新用户完成向导后，菜单恢复现有 16 项（不改现有老用户体验）。

但将当前菜单中的"分组标题"（`Claude Code`/`其他工具`/`CCJK`）改为可折叠（输入 `expand` 展开），默认只展示：

- 第一组（1-8）：保留
- 第二/三组（工具区、CCJK 区）：折叠为单行提示 `  more: K M A P R G 0 S - + D H`

**注意**：折叠不是隐藏，输入字母仍然有效，仅減少视觉噪音。

### 验收标准

| 指标 | 当前估算 | 目标 |
|---|---|---|
| 新用户首次看到菜单时的选项数 | 16 | 向导模式（3 步），不展示大菜单 |
| 向导完成率（不中途退出） | 未量化 | ≥ 80% |
| 向导完成总耗时中位数 | 未量化 | ≤ 5 分钟 |
| 向导完成后 `runHealthCheck` 成功状态 | 未量化 | ≥ 75% pass/warn |

---

## 二、P1 — 修复诊断断点：健康检查"看板 → 修复执行"

### 问题描述

**`HealthResult` 类型**（`src/health/types.ts`）：

```typescript
export interface HealthResult {
  fix?: string     // ← 有修复说明
  command?: string // ← 有修复命令
}
```

**`renderHealthSection`**（`src/commands/status.ts`）：

```typescript
// 当前只打印 recommendation 文字，command 只被 dim 展示
lines.push(`    ${ansis.gray('→')} ${ansis.cyan(rec.command)}`)
// ↑ 用户需要手动复制粘贴，没有一键执行入口
```

**问题**：`fix` 字段中的命令**从未被执行**，只是文本展示。

### 目标状态

`ccjk status` / `ccjk doctor` 后，对检测到的问题项：

1. 输出时标注"[可修复]"
2. 询问"是否一键执行修复？"
3. 执行修复命令并输出结果
4. 修复后立即重新跑该项检查，展示 before/after 对比

### 开发规格

#### Task P1-1：新增 `src/health/auto-fixer.ts`

```typescript
export interface FixResult {
  checkName: string
  commandExecuted: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
}

export interface AutoFixReport {
  attempted: number
  succeeded: number
  failed: number
  results: FixResult[]
}

/**
 * 对传入的 HealthResult 数组中有 command 字段的项，询问用户后执行修复
 * @param results - 带有 command 字段的 HealthResult 列表
 * @param options.autoApprove - 跳过确认直接执行（用于 CI 场景）
 * @param options.dryRun - 只打印命令不执行
 */
export async function autoFix(
  results: HealthResult[],
  options?: { autoApprove?: boolean; dryRun?: boolean }
): Promise<AutoFixReport>
```

**执行逻辑**：

```
对每个 result.command 不为空的项：
  1. 展示：  [!] {result.name}: {result.message}
             修复命令: {result.command}
             预计耗时: <根据命令类型静态估算>
  2. 询问：  是否执行修复？(Y/n)
  3. 执行：  使用 tinyexec 执行命令，捕获 stdout/stderr
  4. 重新检查：调用原 HealthCheck.check() 对比修复前后评分
  5. 输出：  ✔ 修复成功 (+N 分)  或  ✖ 修复失败 (原因)
```

#### Task P1-2：改造 `src/commands/status.ts`

在 `renderHealthSection` 中，对每条 `fail` 或 `warn` 且有 `command` 的项：

**现状**：

```typescript
if (rec.command) {
  lines.push(`    ${ansis.gray('→')} ${ansis.cyan(rec.command)}`)
}
```

**目标**：

```typescript
if (rec.command) {
  lines.push(`    ${ansis.gray('→')} ${ansis.cyan(rec.command)}  ${ansis.yellow('[可一键修复]')}`)
}
```

并在 `statusCommand()` 末尾追加：

```typescript
// 如果存在可修复项，询问是否执行
const fixableResults = health.results.filter(r => r.status !== 'pass' && r.command)
if (fixableResults.length > 0 && !options.json) {
  const { autoFix } = await import('../health/auto-fixer')
  await autoFix(fixableResults)
}
```

#### Task P1-3：修复命令标准化

**现状问题**：各个 check 文件中的 `command` 字段不统一，有的是 `'ccjk ccjk:mcp'`，有的是 `'ccjk init'`，有的是空字符串。

**规格**：统一 `command` 字段为 CLI 可直接执行的格式，并为每个 check 文件补充缺失的 `command`：

| Check 文件 | 当前 command | 标准化后 |
|---|---|---|
| `mcp-check.ts` | `'ccjk ccjk:mcp'` | `'ccjk mcp'` |
| `skills-check.ts` | 需确认 | `'ccjk skills'` |
| `permissions-check.ts` | 需确认 | `'ccjk init --permissions-only'` |
| `model-check.ts` | 需确认 | `'ccjk init --model-only'` |
| `agents-check.ts` | 需确认 | `'ccjk agents'` |

#### Task P1-4：修复前后对比展示

```
[修复前] MCP Services   ✗  0/8  No MCP services configured
[执行中] ccjk mcp ...
[修复后] MCP Services   ✓  8/8  3 services active (+8 pts)
         整体健康分: 62 → 70 (+8)
```

### 验收标准

| 指标 | 目标 |
|---|---|
| 可修复项覆盖率（有 `command` 字段的 fail/warn 项） | ≥ 80% 的 fail/warn 项有可执行命令 |
| 一键修复成功率 | ≥ 70%（失败时输出明确错误原因）|
| 用户不需要手动复制粘贴任何命令 | 100% |

---

## 三、P2 — 修复路径断点：团队治理最小闭环

### 问题描述

目前无团队级功能。从代码看，现有配置写入路径（`~/.claude/settings.json`）是单用户路径，无多用户或组织配置层。

### 目标状态

支持"团队策略文件"叠加在个人配置之上，实现：

1. 组织管理员下发 `team-policy.json`（权限模板、MCP 白名单、禁用配置项）
2. 个人配置自动与团队策略合并（冲突时团队策略优先）
3. 变更记录本地审计日志（谁在何时执行了什么 ccjk 命令，配置前后 diff）
4. 支持 `ccjk rollback` 回滚到任意历史配置快照

### 开发规格

#### Task P2-1：团队策略类型定义

**新增文件**：`src/config/team-policy.ts`

```typescript
export interface TeamPolicy {
  version: string
  organizationName?: string

  // 强制启用的 MCP 服务（不允许用户删除）
  requiredMcpServers?: string[]

  // 禁止使用的 MCP 服务
  blockedMcpServers?: string[]

  // 强制权限配置
  permissions?: {
    required?: string[]   // 必须保留的权限
    blocked?: string[]    // 禁止添加的权限
  }

  // 允许的模型列表（空 = 不限）
  allowedModels?: string[]

  // 禁止修改的配置键
  lockedKeys?: string[]
}

export interface PolicyMergeResult {
  merged: Record<string, unknown>
  conflicts: Array<{ key: string; userValue: unknown; policyValue: unknown }>
  applied: string[]  // 应用了哪些策略规则
}

/**
 * 将团队策略合并到用户配置，返回合并结果与冲突列表
 */
export function mergeWithTeamPolicy(
  userConfig: Record<string, unknown>,
  policy: TeamPolicy
): PolicyMergeResult
```

#### Task P2-2：审计日志

**新增文件**：`src/utils/audit-log.ts`

```typescript
export interface AuditEntry {
  timestamp: string          // ISO8601
  command: string            // 执行的 ccjk 命令
  operator: string           // os.userInfo().username
  configBefore?: string      // settings.json 内容 hash（SHA256 前 8 位）
  configAfter?: string       // 写入后 hash
  success: boolean
  details?: string
}

const AUDIT_LOG_PATH = join(CLAUDE_DIR, 'audit.jsonl')

export function writeAuditEntry(entry: Omit<AuditEntry, 'timestamp'>): void
export function readAuditLog(limit?: number): AuditEntry[]
```

**集成位置**：在 `src/utils/config.ts` 的 `writeJsonConfig()` 写入前后分别采集 hash，写入审计日志。

#### Task P2-3：配置快照与回滚

在 `~/.claude/backup/` 目录中已有备份机制（代码中已有 `backup/` 目录），需要规范化：

```typescript
// src/utils/config-snapshot.ts
export interface Snapshot {
  id: string              // 时间戳 + 短 hash
  createdAt: string       // ISO8601
  trigger: string         // 什么操作触发了快照 (init/mcp/manual)
  files: Array<{
    path: string
    contentBase64: string
  }>
}

export function createSnapshot(trigger: string): Promise<Snapshot>
export function listSnapshots(): Promise<Snapshot[]>
export function rollbackToSnapshot(snapshotId: string): Promise<void>
```

**CLI 入口**：新增 `ccjk rollback` 命令，调用 `listSnapshots()` 展示历史，选择后执行 `rollbackToSnapshot()`。

### 验收标准

| 指标 | 目标 |
|---|---|
| 团队策略文件被正确应用 | 100%（通过单元测试验证合并逻辑）|
| 每次 `writeJsonConfig()` 生成审计条目 | 100% |
| `ccjk rollback` 能恢复到任意历史快照 | 100% |
| 含 3 家设计伙伴完成试用验证 | Phase 3 结束前 |

---

## 四、技术债务（开发过程中必须处理）

以下问题将直接阻碍上述三个 P 级任务，需要先解决或同步处理：

### Debt-1：`src/commands/init.ts` 2059 行文件拆分

**问题**：单文件 2059 行，内嵌 4 个闭包函数（`selectApiConfigurationMode`、`handleCustomApiConfiguration` 等），不可测试、难维护。

**目标**：拆分为：

```
src/commands/init/
├── index.ts          # 入口，约 100 行，负责分支路由
├── interactive.ts    # 交互式完整初始化逻辑
├── silent.ts         # 静默模式（已有 silentInit，迁移过来）
├── smart.ts          # 智能生成模式（已有 smartInit，迁移过来）
├── simplified.ts     # 简化初始化（已有 simplifiedInit，迁移过来）
└── api-wizard.ts     # API 配置向导子流程（从 init.ts 拆出）
```

**时机**：在 P0 开发期间同步拆分，不影响外部接口（导出名不变）。

### Debt-2：健康检查 `command` 字段覆盖率

**现状**：各 check 文件中部分 `command` 为空或错误（如 `'ccjk ccjk:mcp'`）。

**要求**：P1 开发前先完成所有 6 个 check 文件的 `command` 字段核查与修正。

### Debt-3：`HealthResult.fix` 字段从未在主 UI 呈现

**现状**：`fix` 字段是文字说明，`command` 是可执行命令，两者并存但语义有重叠。

**要求**：P1 开发时统一口径：
- `message`：现状描述（"No MCP services configured"）
- `fix`：用户可读的修复说明（"Run mcp install to add services"）
- `command`：可执行命令（`'ccjk mcp'`）

---

## 五、执行计划

### Sprint 计划

| Sprint | 时间 | 任务 | 产出 |
|---|---|---|---|
| Sprint 1 | Day 1-14 | P0-1 + P0-2 + P0-3 + Debt-1（部分） | `onboarding-wizard.ts` + 新用户路径可用 |
| Sprint 2 | Day 15-28 | P0-4 + Debt-2 + Debt-3 | 菜单折叠 + 所有 check command 修正 |
| Sprint 3 | Day 29-42 | P1-1 + P1-2 + P1-3 | `auto-fixer.ts` + 一键修复可用 |
| Sprint 4 | Day 43-56 | P1-4 + Debt-1（完成） + 测试补全 | before/after 对比 + init.ts 完成拆分 |
| Sprint 5 | Day 57-70 | P2-1 + P2-2 | 团队策略 + 审计日志可用 |
| Sprint 6 | Day 71-84 | P2-3 + 设计伙伴验证 | 快照回滚 + 3 家伙伴试用 |

### 优先级规则

- P0 全部完成后才能开始 P1
- Debt-1 允许在 Sprint 1-4 期间分批完成
- P2 可在 P1 进行中并行启动（不存在代码依赖）

---

## 六、测试覆盖要求

每个 Task 完成后需补充以下测试：

| Task | 测试类型 | 关键 case |
|---|---|---|
| P0-1 `onboarding-wizard.ts` | 单元测试 | 3 步全通过 / 中途退出 / API 已配置跳过 Step 2 |
| P0-3 `isFirstTimeUser` | 单元测试 | 有 `onboardingCompleted` 标记时返回 false |
| P1-1 `auto-fixer.ts` | 单元测试 + mock | `dryRun` 模式只打印不执行 / `autoApprove` 跳过确认 |
| P1-3 command 标准化 | 单元测试 | 所有 check 的 `command` 字段通过 CLI 调用验证 |
| P2-1 `mergeWithTeamPolicy` | 单元测试 | 冲突时团队策略优先 / 无冲突时保留用户配置 |
| P2-2 `writeAuditEntry` | 单元测试 | 写入 JSONL 格式正确 / 多次写入可正确追加 |
| P2-3 `rollbackToSnapshot` | 集成测试 | 快照创建 → 配置修改 → 回滚 → 恢复验证 |

---

## 七、关键 API 约定（团队共识）

为避免并行开发产生冲突，以下接口由本文档固定，不得在未经 review 的情况下修改：

```typescript
// 向导完成标记（P0）
interface ZcfConfig {
  onboardingCompleted?: boolean
  onboardingCompletedAt?: string
}

// 修复报告结构（P1）
interface AutoFixReport {
  attempted: number
  succeeded: number
  failed: number
  results: FixResult[]
}

// 审计条目（P2）
interface AuditEntry {
  timestamp: string
  command: string
  operator: string
  configBefore?: string
  configAfter?: string
  success: boolean
}
```

---

## 附：文件改动影响范围速查

| 文件 | 改动类型 | 影响 Task |
|---|---|---|
| `src/commands/menu.ts` | 修改（约 5 行）| P0-2 |
| `src/commands/init.ts` | 重构（拆分为 init/ 目录）| Debt-1 |
| `src/commands/status.ts` | 修改（约 15 行）| P1-2 |
| `src/health/types.ts` | 无改动（类型已完备）| — |
| `src/health/checks/*.ts` | 修改（补 command 字段）| P1-3 |
| `src/utils/config.ts` | 修改（集成审计日志调用）| P2-2 |
| **新增** `src/commands/onboarding-wizard.ts` | 新增 | P0-1 |
| **新增** `src/health/auto-fixer.ts` | 新增 | P1-1 |
| **新增** `src/config/team-policy.ts` | 新增 | P2-1 |
| **新增** `src/utils/audit-log.ts` | 新增 | P2-2 |
| **新增** `src/utils/config-snapshot.ts` | 新增 | P2-3 |

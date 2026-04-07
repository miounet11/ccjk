# CCJK Runtime Compatibility Matrix

## 目标

这份矩阵用于回答一个核心问题：

**在 Claude Code / myclaude / Codex / CCJK 四者之间，某项能力到底应�由谁原生负责，谁来适配，谁不该重复建设。**

它是后续架构收敛、菜单重构、能力下线、文档纠偏的统一判断基线。

---

## 一、角色定义

### Claude Code
- 原生 AI coding runtime
- 强项是 agent loop、tool orchestration、task / plan / subagent、权限、MCP、会话与 CLI 交互 harness

### myclaude
- 当前在 CCJK 中表现为 provider-first control center / runtime mode
- 重点在 provider profile、路由、模型同步、与 Claude 配置桥接
- 更��合被视�**运行时入口模式 + 供应商配置控制面**，而不是独立再造一套内核

### Codex
- 独立宿主 runtime
- 有自己的模型、配置、记忆、工作流与交互边界
- CCJK 的角色应是适配、同步、引导，而不是平替 Codex runtime

### CCJK
- 定位应收敛为：
  - 跨 runtime 兼容层
  - 配置与迁移内核
  - 生态分发层
  - 诊断与修复层

---

## 二、能力归属矩阵

| 能力域 | Claude Code | myclaude | Codex | CCJK 应承担的职责 | 结论 |
|---|---|---|---|---|---|
| 会话主循环 / agent loop | 原生 | 部分依赖宿主 | 原生 | 不重做；只识别当前宿主并适配配置 | **宿主原生** |
| plan / task / subagent | 原生 | 若宿主支持则走宿主 | 原生/宿主自带 | 只做能力探测、入口引导、文档适配 | **宿主原生** |
| 工具权限交互 | 原生 | 宿主侧 | 宿主侧 | 做权限模板、修复、迁移 | **CCJK 适配，不接管执行** |
| slash commands / skills 执行 | 原生 | 可桥接 | 原生 | 做模板生成、安装、整理，不做常驻执行内核 | **宿主原生 + CCJK 生态** |
| MCP tool invocation | 原生 | 可桥接 | 原生 | 做 MCP 组合包、安装、诊断、修复 | **宿主原生 + CCJK 配置生态** |
| provider / profile 管理 | 弱 | 强相关 | 中 | 统一 profile 抽象、同步、回读校验 | **CCJK 核心优势** |
| model routing / fast-small-exec mapping | 有，但各家不同 | 强相关 | 强相关 | 做统一展示、统一校验、统一同步 | **CCJK 核心优势** |
| settings / config migration | 宿主局部处理 | 依赖控制面 | 宿主局部处理 | 做跨 runtime 迁移、合并、备份、回滚 | **CCJK 核心优势** |
| memory / system prompt 配置 | 原生存在 | 可桥接 | 原生存在 | 做配置入口与同步，不重做长期记忆 runtime | **CCJK 适配** |
| workflow 模板 | 有原生命令/习惯 | 可桥接 | 有自身范式 | 做模板生成、安装、推荐包 | **CCJK 生态优势** |
| agent / skill 生成 | 宿主消费 | 可桥接 | 宿主消费 | 做生成器与 project bootstrap | **CCJK 生态优势** |
| marketplace / package distribution | 宿主有限 | 依赖控制面 | 宿主有限 | 做插件、MCP、模板市场与 bundle 分发 | **CCJK 生态优势** |
| doctor / status / health / repair | 宿主局部 | 依赖控制面 | 宿主局部 | 做跨 runtime 的统一诊断与自动修复 | **CCJK 核心优势** |
| IDE / shell / statusline 引导 | 宿主支持不一 | 模式相关 | 宿主支持不一 | 做发现、引导、兼容性说明、配置安装 | **CCJK 适配优势** |
| bridge / remote / daemon / transcript infra | 运行时内部 | 宿主内部 | 宿主内部 | 不复刻，不追内部实现 | **禁止重复建设** |

---

## 三、按能力域的详细判断

## 1. 必须交还宿主 runtime 的能力

这些能力不应继续在 CCJK 中向“独立内核”方向扩张：

1. 会话主循环 / query loop
2. plan / task / subagent 真实执行
3. 工具调用编排
4. 交互式权限决策
5. session persistence / transcript runtime
6. 原生 slash command 执行引擎
7. bridge / daemon / remote control 基础设施

### 原因
- Claude Code 2.1.88 公开源码对标说明：这些是 runtime harness 的中心能力
- 这些能力一旦被 CCJK 在外层重复建设，就会带来：
  - 入口冲突
  - 能力重叠
  - 用户认知混乱
  - 维护成本暴涨

### 结论
**CCJK 只做探测、适配、开关、文档与入口引导，不做平替执行内核。**

---

## 2. 必须强化为 CCJK 核心竞争力的能力

### 2.1 Profile / Provider / Model Sync
优先级最高。

应由 CCJK 统一处理：
- provider profiles
- runtime profile switching
- base URL / auth token / api key
- fast / small / primary / exec model 映射
- 写入后的校验与回读确认

对应现有实现基础：
- `src/utils/claude-code-config-manager.ts`
- `src/utils/features.ts`
- `src/utils/code-type-resolver.ts`

### 2.2 Permission Compatibility Repair
CCJK 应继续负责：
- 无效权限清理
- wildcard 兼容处理
- runtime 差异格式转换
- 迁移与修复

对应现有实现基础：
- `src/utils/permission-cleaner.ts`

### 2.3 MCP Bundles / Marketplace / Install Repair
CCJK 应继续负责：
- MCP 组合包
- 按 runtime 的安装映射
- 安装结果校验
- profile 级 MCP 推荐集
- 冲突与性能诊断

对应现有实现基础：
- `src/utils/features.ts`
- `src/commands/mcp*`
- `src/mcp-marketplace/`

### 2.4 Doctor / Status / Repair
CCJK 应打造“跨 runtime 统一诊断层”：
- 当前 runtime 是谁
- 原生能力有哪些
- CCJK 正在托管哪些能力
- 配置是否真实生效
- 是否存在重叠接管风险

---

## 3. 应该转型而非继续扩张的能力

### brain
建议从“多 agent runtime”叙事，转成：
- orchestrator design notes
- capability planner
- template / recommendation engine
- compatibility intelligence

### workflow
建议从“执行引擎”转成：
- workflow blueprint
- review checklist
- preset installer
- migration workflow definitions

### skills / agents
建议从“常驻执行系统”转成：
- 生成模板
- 推荐模板
- 安装模板
- runtime-aware packaging

### intent / slash auto-routing
建议从“默认接管”转成：
- 明确开关
- 默认弱化
- 仅在宿主不具备原生能力时才兜底

---

## 四、重叠风险热区

以下区域属于高重叠风险区，后续必须先审计再决定保留方式：

### 热区 A：启动路径接管
- `src/cli-lazy.ts`
  - `bootstrapCloudServices()`
  - `autoInitBrainHooks()`
  - `executeSlashCommand()`
  - `handleIntentRecognition()`

风险：
- 启动期抢主入口
- 把配置器做成运行时代理
- 与宿主原生命令 / 意图系统冲突

### 热区 B：brain / workflow 文档叙事超前
- `src/brain/CLAUDE.md`
- `src/workflow/CLAUDE.md`

风险：
- 文档宣称能力大于真实 shipped 能力
- 团队继续误把这类模块当主航道加码

### 热区 C：菜单层 runtime 分支散落
- `src/commands/menu/index.ts`
- `src/utils/features.ts`

风险：
- 能力边界不透明
- 新增 runtime 成本越来越高
- “兼容”实际靠 if/else 堆出来

---

## 五、下一阶段架构原则

1. **宿主负责执行，CCJK 负责适配**
2. **宿主负责 runtime，CCJK 负责 compatibility**
3. **宿主负责 tools loop，CCJK 负责 config + migration + repair**
4. **宿主负责 native UX，CCJK 负责 unified control plane**
5. **宿主负责原生命令，CCJK 负责模板、生态、推荐包**

---

## 六、对实施的直接要求

### 必做
- 为 Claude Code / myclaude / Codex 建立 capability descriptors
- 把 `code-tools` 提升为 capability registry
- 菜单 / doctor / status 改为 capability-driven 渲染
- 启动期自动行为做审计并加 ownership 标记

### 不该再做
- 不再扩张独立 agent runtime 叙事
- 不再把内部/未发布 Claude Code feature-gated 模块当追赶目标
- 不再把“更多自动化拦截”当升级方向

---

## 七、最关键的一句话

**CCJK 的未来不是再造一个 Claude Code，而是成为 Claude Code / myclaude / Codex 之上的统一兼容与控制内核。**

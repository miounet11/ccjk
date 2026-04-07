# CCJK Phase 0 Audit Checklist

## 目标

Phase 0 不做大改造，先做收敛审计。

目的只有一个：

**在真正动架构之前，先确定哪些能力是 CCJK 真正在 ship，哪些只是文档叙事、实验残留或与宿主 runtime 重叠的入口。**

这份清单用于把后续升级拆成可以执行、可以验收的审计任务。

---

## 审计范围

### 一级范围
- `src/cli-lazy.ts`
- `src/commands/menu/index.ts`
- `src/utils/features.ts`
- `src/code-tools/`
- `src/utils/claude-code-config-manager.ts`
- `src/utils/permission-cleaner.ts`

### 二级范围
- `src/brain/`
- `src/workflow/`
- `src/skills/`
- `src/agents/`
- `src/core/intent-engine`
- `src/commands/slash-commands`
- `src/mcp-marketplace/`
- `src/health/`
- `src/cloud-*`

---

## A. 启动路径审计

## A1. ��入口默认行为清单
检查 `src/cli-lazy.ts` 启动阶段�一个自动执行点。

### 审计项
- [ ] `runMigration()` 是否只做安全、幂等的迁移
- [ ] `bootstrapCloudServices()` 是否在非交互/交互场景下边界一致
- [ ] `autoInitBrainHooks()` 是否属于默认应该开启的行为
- [ ] `runAutoFixOnStartup()` 是否可能修改用户配置但缺少明确提示
- [ ] `autoCheckUpdates(true)` 是否会引发启动噪音或副作用
- [ ] `tryQuickProviderLaunch()` 是否会绕过用户预期入口
- [ ] `executeSlashCommand()` 是否与宿主 runtime 原生命令冲突
- [ ] `handleIntentRecognition()` 是否构成“自动接管输入”

### 验收问题
- 这项行为是**必须默认开启**，还是应该**显式触发**？
- 如果关闭它，CCJK 的核心价值是否受损？
- 它是在“配置/适配”，还是在“接管 runtime 入口”？

### 输出要求
对每一项打标签：
- `KEEP_DEFAULT`
- `KEEP_BUT_GATE`
- `MOVE_TO_EXPLICIT_COMMAND`
- `DEPRECATE`

---

## B. 菜单与入口控制面审计

## B1. 菜单是否 capability-driven
检查 `src/commands/menu/index.ts`。

### 审计项
- [ ] 统计 `claude-code / myclaude / codex` 条件分支数量
- [ ] 标记哪些菜单项依赖 runtime 原生能力
- [ ] 标记哪些菜单项属于 CCJK 自身配置能力
- [ ] 标记哪些菜单项只是桥接宿主能力
- [ ] 标记哪些菜单项存在命名误导（像 runtime 执行器，但实际只是入口）

### 验收问题
- 菜单是否能解释“这是原生能力还是 CCJK 托管能力”？
- 用户是否能从菜单层看懂当前 runtime 的真实边界？
- 新增 runtime 时是否需要复制已有分支逻辑？

### 输出要求
为每个一级菜单项补一列：
- `ownership`: native / ccjk / hybrid
- `runtime_support`: claude-code / myclaude / codex
- `ux_mode`: native-entry / ccjk-config / ccjk-ecosystem / bridge

---

## C. code-tools 兼容内核审计

## C1. 现有抽象是否足够表达 runtime 能力
检查：
- `src/code-tools/core/interfaces.ts`
- `src/code-tools/core/tool-registry.ts`
- `src/code-tools/core/tool-factory.ts`

### 审计项
- [ ] `ICodeTool` 是否只覆盖 install/config/execute 级别
- [ ] 是否缺少 capability 描述层
- [ ] 是否缺少 native plan/task/subagent/MCP/IDE/statusline 支持声明
- [ ] 是否缺少 config verification 能力声明
- [ ] 是否缺少 ownership 信息（原生 / CCJK 托管）

### 验收问题
- 现有接口能否支持 capability-driven menu / doctor / status？
- 如果不能，最小需要补哪些结构？
- 哪些逻辑应该下沉到 adapter，哪些应该上移到 registry？

### 输出要求
列出一份 `CapabilityDescriptor` 最小字段提案，不改代码，先定 schema。

---

## D. 配置与同步核心审计

## D1. Profile / Model / Settings 同步链路
重点检查：
- `src/utils/claude-code-config-manager.ts`
- `src/utils/features.ts`
- `src/utils/code-type-resolver.ts`

### 审计项
- [ ] Claude Code profile 写入后是否有可靠回读验证
- [ ] myclaude runtime sync 是否只是单向桥接，还是已具备完整状态闭环
- [ ] Codex 配置写入是否也具备同等级验证
- [ ] model routing 是否存在多份真相源
- [ ] `settings.model` / env / profile 三者关系是否可解释
- [ ] runtime 切换是否会留下陈旧状态

### 验收问题
- 哪一层是 profile 真相源？
- 哪一层是 runtime 生效态？
- 哪些写入有校验，哪些还没有？
- 哪些能力已足够成为 CCJK 核心卖点？

### 输出要求
产出一张“配置真相源地图”：
- source of truth
- write path
- read-back path
- validation status
- risk level

---

## E. Permission Compatibility 审计

## E1. 权限修复边界
重点检查：
- `src/utils/permission-cleaner.ts`
- 与 settings/import 相关调用点

### 审计项
- [ ] 当前修复逻辑是否仅服务 Claude Code
- [ ] wildcard 规则是否完整
- [ ] 是否会误删用户有效权限
- [ ] 是否缺少 runtime-aware repair 分层
- [ ] 是否具备审计输出（修了什么、删了什么）

### 验收问题
- 这个模块是否应升级为统一 runtime 权限兼容器？
- 它现在是“清洗器”，还是还缺“解释器”和“校验器”？

### 输出要求
列出三层职责草案：
- normalize
- validate
- repair

---

## F. brain / workflow / agents / skills 审计

## F1. 真实 shipped 能力 vs 文档叙事
重点检查：
- `src/brain/`
- `src/workflow/`
- `src/agents/`
- `src/skills/`
- 各自 CLAUDE.md

### 审计项
- [ ] 哪些模块已被主入口真实调用
- [ ] 哪些模块只有局部调用/实验调用
- [ ] 哪些模块只有文档、没有稳定�品闭环
- [ ] 哪些模块更适合保留为模板/分析/建议层
- [ ] 哪些模块名称或说明会误导为“CCJK 自建 runtime”

### 验收问题
- 这个模块是在“执行任务”，还是在“帮助宿主 runtime 更好工作”？
- 如果去掉执行叙事，模块还剩什么可保留价值？
- 它是否值得继续扩张？

### 输出要求
每个模块分类到四类之一：
- `CORE_KEEP`
- `REPOSITION`
- `FREEZE`
- `DEPRECATE_CANDIDATE`

---

## G. Generation / Marketplace / MCP 生态层审计

## G1. 是否已经形成 CCJK 差异化主轴
重点检查：
- `src/generation/`
- `src/mcp-marketplace/`
- `src/cloud-client/`
- marketplace 相关命令

### 审计项
- [ ] 生成器是“模板生成器”还是“执行系统”
- [ ] 市场是 runtime-neutral 还是偏某一宿主
- [ ] MCP bundle 是否按 runtime 区分适配
- [ ] 安装后是否有验证、回滚、诊断闭环
- [ ] 推荐逻辑是否 capability-aware

### 验收问题
- 哪些能力最能体现 CCJK 不可替代价值？
- 哪些市场/生态资产与宿主 runtime 没有直接冲突？

### 输出要求
列出未来可作为主航道的三类生态资产：
- runtime preset bundles
- MCP capability bundles
- project bootstrap packs

---

## H. 文档与定位审计

## H1. 文档是否仍在放大重叠叙事
重点检查：
- 根目录战略文档
- 各模块 CLAUDE.md
- README / roadmap / implementation summary 文档

### 审计项
- [ ] 是否还在把 CCJK 描述成运行时内核
- [ ] 是否存在“功能宣称 > 实际 shipped 能力”
- [ ] 是否明确写出 anti-overlap 原则
- [ ] 是否明确写出 runtime compatibility kernel 定位

### 验收问题
- 一个新同事只看文档，会不会以为 CCJK 要替代 Claude Code？
- 文档是否鼓励继续在重叠区扩张？

### 输出要求
标记需更新的文档清单，并附一行修改方向。

---

## I. 审计结果汇总模板

每个审计对象最终都按以下模板出结论：

```md
### 对象
- 文件/模块：
- 当前角色：
- 实际调用路径：
- 宿主是否已有原生能力：
- 是否重叠：高 / 中 / 低
- 建议动作：KEEP / GATE / REPOSITION / DEPRECATE
- 原因：
- 后续是否进入 Phase 1 改造：是 / 否
```

---

## J. Phase 0 的完成标准

只有同时满足以下条件，Phase 0 才算完成：

- [ ] 能力归属矩阵完成
- [ ] 启动路径自动行为全部完成 ownership 标记
- [ ] `code-tools` 抽象缺口被明确记录
- [ ] `brain/workflow/agents/skills` 全部完成模块归类
- [ ] 配置真相源地图完成
- [ ] 文档误导点清单完成
- [ ] 团队对“CCJK 做什么 / 不做什么”达成一致

---

## 最终判断标准

Phase 0 不追求“写更多代码”，只追求一件事：

**让 CCJK 从现在开始，每加一个能力，都先回答一句：这到底是宿主原生能力，还是 CCJK 真正该做的能力。**

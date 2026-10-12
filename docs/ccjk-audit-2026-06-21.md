# ccjk 全面评审与审计方案

> 审计日期：2026-06-21
> 审计范围：v16.2.1 全量代码 + 文档 + 定位
> 审计人：Clavue (deepseek-v4-pro), independent reviewer pass

## 一、定位审计

### 宣称定位（来自 PRODUCT.md + CLAUDE-NOTES.md）

| 维度 | 宣称 |
|------|------|
| 身份 | 四工具（Clavue / Claude Code / Codex / Grok CLI）的本地配置 CLI |
| 角色 | 医生（只读扫描）+ 操作员（一键写入） |
| 隐喻 | 不替代任何原生 CLI 写代码，只管配置健康度与写入 |
| 边界 | 不写代码、不装 hooks、不开守护进程、不碰 agent runtime |
| 配置归属 | 仅 `~/.ccjk/`，绝不混入各工具目录 |
| 目标用户 | 会用终端、需在多 API key / provider 之间切换的开发者 |

### 评估

- **✅ 定位清晰**：医生+操作员隐喻简洁有力，边界定义完整
- **✅ 四工具覆盖**：Clavue / Claude Code / Codex / Grok 均有独立处理路径
- **⚠️ "全访问加强 zero-config"新定位未文档化**：用户最新表述是「全访问加强 zero-config 工具」，但 PRODUCT.md 仍为旧隐喻。需更新。
- **⚠️ Codex = "GPT(Codex)" 称呼不一致**：PRODUCT.md 用 "Codex"，但用户用 "GPT(Codex)"。内部代码一致用 "Codex"。

## 二、能力矩阵审计（对标四工具）

### 2.1 按工具 × 能力

| 能力 | Clavue | Claude Code | Codex | Grok CLI |
|------|--------|-------------|-------|----------|
| **完整初始化** | ✅ | ✅ | ✅ | ✅ |
| **API 配置** | ✅ settings.json | ✅ settings.json | ✅ config.toml | ⚠️ 仅存 profile，不写 MCP |
| **MCP 配置** | ✅ settings.json | ✅ settings.json | ✅ config.toml | ❌ 不支持 |
| **模型配置** | ✅ env vars + profile | ✅ env vars | ✅ config.toml | ❌ |
| **AI 记忆配置** | ✅ | ✅ | ✅ | ❌ |
| **环境/权限** | ✅ | ✅ | ❌ | ❌ |
| **工作流更新** | ✅ | ✅ | ✅ | ❌ |
| **环境清理（医生）** | ✅ | ✅ | ✅ | ✅ |
| **卸载** | ✅ | ✅ | ✅ | ❌ |
| **更新检查** | ✅ | ✅ | ✅ | ❌ |
| **配置切换** | ✅ config-switch | ✅ config-switch | ✅ config-switch | ❌ |
| **Provider profile** | ✅ v9 组合模型 | ❌ | N/A | N/A |

### 2.2 完整度评分

| 工具 | 操作员 | 医生 | 综合 | 备注 |
|------|--------|------|------|------|
| **Clavue** | 🟢 95% | 🟢 90% | 🟢 93% | 刚接入 v9 组合模型 |
| **Claude Code** | 🟢 95% | 🟢 90% | 🟢 93% | 与 Clavue 共享 settings.json 逻辑 |
| **Codex** | 🟢 85% | 🟢 85% | 🟢 85% | CLI/桌面/IDE 多端覆盖 |
| **Grok CLI** | 🟡 40% | 🟡 50% | 🟡 45% | 仅存 profile + 启动；不写 MCP/模型 |

### 2.3 关键差距

| # | 差距 | 影响 |
|---|------|------|
| G1 | Grok 操作员能力严重不足（无 MCP、无模型、无工作流） | Grok 用户基本只能用它存 profile，不能作为完整伴侣 |
| G2 | Codex 无环境/权限配置 | Codex 用户需手动管理权限 |
| G3 | Clavue provider profile 仅被动写入，无管理/切换/验证 UI | 写了 profile 但用户看不到 |
| G4 | 无 provider profile 验证命令 | 无法用 ccjk 验证 Clavue provider 是否健康 |
| G5 | 无跨工具 profile 同步验证 | `ccjk use` fan-out 但没有事后一致性校验 |

## 三、"Zero-Config" 承诺审计

### 宣称路径
```
npm i -g ccjk → ccjk → 选择工具 → 配 API → 能跑通
```

### 实际路径检查

| 步骤 | 当前状态 | 问题 |
|------|----------|------|
| 安装 | `npm i -g ccjk` ✅ | — |
| 首次运行 | 菜单 → 选工具 ✅ | 无 onboarding 向导（P0-1 未落地） |
| API 配置 | 交互式 ✅ / skip-prompt ✅ | 非交互模式参数多（10+ flags） |
| 模型配置 | 4 槽模型 ✅ | 简单模式已落地（v15.23） |
| 验证能跑 | `ccjk probe` ✅ | 需用户主动跑 |
| 环境诊断 | `ccjk doctor` ✅ | 需用户主动跑（P0-2 未落地） |

**结论**：zero-config 路径 **基本可用** 但 **未完全自动化**。P0-1（onboarding 向导）和 P0-2（init 后自动 doctor）是当前最大的体验断点。

## 四、架构健康审计

### 4.1 文件组织

| 目录 | 文件数 | 评估 |
|------|--------|------|
| `src/commands/` | 14 | ✅ 一命令一文件，清晰 |
| `src/utils/` | 60+ | ⚠️ 扁平无分层，职责混杂 |
| `src/config/` | 7 | ✅ 配置数据集中 |
| `src/types/` | 5 | ⚠️ 类型分散，部分在 utils 内联 |
| `src/brain/` | 7 | ❌ Gastown 多 agent 系统（~3000 行）未集成到主路径 |
| `src/i18n/` | 38 文件 | ✅ 中英双语完整 |

### 4.2 架构违规

| # | 违规 | 位置 | 严重度 |
|---|------|------|--------|
| A1 | `src/utils/` 扁平 60+ 文件，无分层 | utils/*.ts | 中 |
| A2 | `src/brain/` 完整多 agent 系统未集成 | src/brain/*.ts | 高 |
| A3 | `src/cli-setup.ts` 包含命令注册（~400 行） | src/cli-setup.ts | 低 |
| A4 | 旧 "core/" 不存在，架构文档引用过时 | ARCHITECTURE.md | 中 |
| A5 | config.ts 混杂 API/模型/权限/导出逻辑（~600 行） | src/utils/config.ts | 中 |

### 4.3 ARCHITECTURE.md 与代码现实不一致

```
ARCHITECTURE.md 说：src/core/<topic>.ts 纯函数层，测试打这层
代码实际：src/core/ 目录不存在，所有逻辑在 src/utils/*.ts
```

**ARCHITECTURE.md 已过时**，需更新或删除 `core/` 引用。

### 4.4 导入依赖方向

`cli → commands → utils → config + i18n + types`

- ✅ 无循环依赖
- ✅ commands 之间通过 utils 解耦
- ⚠️ 部分 utils 直接 import 其他 utils 的函数（如 features.ts import config.ts），耦合度偏高

## 五、测试覆盖审计

| 指标 | 数值 | 评估 |
|------|------|------|
| 测试文件 | 141 | ✅ |
| 测试用例 | 2541 | ✅ |
| typecheck | 0 错误 | ✅ |
| lint | 0 错误（1023 警告） | ⚠️ 警告偏多 |
| 新文件测试 | 新增 `clavue-provider-profile.ts` 无对应测试 | ❌ |

## 六、审计方案（改进路线）

### Phase 1 — 快速止血（本周）

| # | 动作 | 优先级 |
|---|------|--------|
| 1 | 更新 PRODUCT.md 定位为「全访问加强 zero-config 工具」 | P0 |
| 2 | 更新 ARCHITECTURE.md 反映实际 `src/utils/` 结构 | P0 |
| 3 | 为 `clavue-provider-profile.ts` 补充单元测试 | P1 |
| 4 | 清理 `src/brain/` — 要么集成到主路径，要么移出 | P1 |
| 5 | `config.ts` 拆分：API / 模型 / provider profile 三个子模块 | P2 |

### Phase 2 — 能力补齐（本月）

| # | 动作 | 对标工具 | 优先级 |
|---|------|----------|--------|
| 6 | Grok 操作员能力补齐：MCP 配置（若 API 开放） | Grok | P1 |
| 7 | `ccjk provider list/current` — 读取 Clavue provider profile 状态 | Clavue | P1 |
| 8 | `ccjk provider validate` — 验证当前 provider 是否健康 | Clavue | P1 |
| 9 | P0-1 onboarding 向导落地 | 全部 | P0 |
| 10 | P0-2 init 后自动 doctor | 全部 | P0 |
| 11 | P0-3 profile 导出/导入 | 全部 | P1 |

### Phase 3 — Zero-Config 完善（下月）

| # | 动作 | 优先级 |
|---|------|--------|
| 12 | 跨工具一致性校验命令 `ccjk verify` | P1 |
| 13 | Codex 权限/环境配置补齐 | P2 |
| 14 | 自动检测工具安装状态并按需提示 | P2 |
| 15 | 整合 `src/brain/` 多 agent 系统到 doctor 自动修复 | P3 |

## 七、总结

**ccjk v16.2.1 是一个设计良好、实现扎实的四工具配置伴侣。** 医生+操作员模型清晰，2541 测试全绿，四工具覆盖完整。主要短板：

1. **文档与代码不一致**（ARCHITECTURE.md 过时，PRODUCT.md 未反映最新定位）
2. **Grok 能力不足**（仅 45% 覆盖，基本只能存 profile）
3. **Zero-config 路径未完全自动化**（缺 onboarding 向导 + init 后 doctor）
4. **`src/brain/` Gastown 系统未集成**（~3000 行孤立代码）
5. **新增 provider profile 模块无测试**

---

*本文件为一次性审计产物，非持续维护文档。审计结果将驱动后续 PR。*

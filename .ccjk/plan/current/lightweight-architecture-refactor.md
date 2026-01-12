# Feature Plan: CCJK 轻量化架构重构

## 📋 Overview

### 问题诊断

**当前状态分析**：
- 源代码总量：**67,680 行** TypeScript（193 个文件）
- 命令数量：**30+ 个命令**
- Utils 模块：**65+ 个工具文件**
- 最大单文件：`codex.ts` (2,240 行)、`menu.ts` (1,541 行)、`init.ts` (1,501 行)

**核心问题**：
1. **功能堆砌**：不断添加新功能，缺乏整体架构规划
2. **Token 消耗过大**：所有功能都在启动时加载，上下文膨胀
3. **违背 Claude Code 理念**：官方强调轻量、按需、模块化

### Claude Code 官方理念对比

| 维度 | Claude Code 官方 | CCJK 现状 | 差距 |
|------|-----------------|----------|------|
| 启动速度 | 毫秒级启动 | 秒级启动 | ❌ 严重 |
| 功能加载 | 按需加载 | 全量加载 | ❌ 严重 |
| 命令数量 | 核心命令精简 | 30+ 命令 | ⚠️ 中等 |
| 技能系统 | 热重载、轻量 | 静态加载 | ⚠️ 中等 |
| MCP 管理 | 分级、按需 | 全部启动 | ✅ 已优化 |

### 目标

1. **减少 50% 代码量**：从 67K 行降至 35K 行以下
2. **启动时间 < 500ms**：当前约 2-3 秒
3. **按需加载**：只加载用户实际使用的功能
4. **对齐官方理念**：轻量、模块化、可扩展

---

## 🎯 Feature Breakdown

### Phase 1: 核心精简 (Week 1)

- [ ] **1.1 命令分层**：Core / Extended / Deprecated
- [ ] **1.2 移除冗余命令**：合并重复功能
- [ ] **1.3 懒加载机制**：命令按需导入

### Phase 2: 模块重构 (Week 2)

- [ ] **2.1 Utils 整合**：合并相似功能模块
- [ ] **2.2 大文件拆分**：单文件不超过 500 行
- [ ] **2.3 依赖清理**：移除未使用的依赖

### Phase 3: 架构升级 (Week 3)

- [ ] **3.1 插件化架构**：功能模块可插拔
- [ ] **3.2 配置驱动**：通过配置启用/禁用功能
- [ ] **3.3 性能监控**：内置性能指标

---

## 📐 Technical Approach

### 1. 命令分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    CCJK CLI                             │
├─────────────────────────────────────────────────────────┤
│  Core Commands (必须)                                   │
│  ├── init          初始化配置                           │
│  ├── update        更新配置                             │
│  ├── doctor        健康检查                             │
│  └── menu          交互菜单                             │
├─────────────────────────────────────────────────────────┤
│  Extended Commands (按需加载)                           │
│  ├── mcp           MCP 管理                             │
│  ├── interview     访谈系统                             │
│  ├── commit        智能提交                             │
│  └── ...                                                │
├─────────────────────────────────────────────────────────┤
│  Deprecated (待移除)                                    │
│  ├── shencha       → 合并到 doctor                      │
│  ├── tools         → 合并到 menu                        │
│  ├── features      → 合并到 menu                        │
│  └── ...                                                │
└─────────────────────────────────────────────────────────┘
```

### 2. 懒加载实现

```typescript
// Before: 全量导入
import { interview } from './commands/interview'
import { shencha } from './commands/shencha'
import { marketplace } from './commands/marketplace'
// ... 30+ imports

// After: 按需导入
const commands = {
  init: () => import('./commands/init'),
  update: () => import('./commands/update'),
  doctor: () => import('./commands/doctor'),
  // Extended commands - lazy loaded
  interview: () => import('./commands/interview'),
  mcp: () => import('./commands/mcp'),
}

cli.command('interview', 'Interview-driven development')
  .action(async () => {
    const { interview } = await commands.interview()
    await interview()
  })
```

### 3. 模块合并计划

| 当前模块 | 合并后 | 原因 |
|---------|--------|------|
| `shencha/*` (5 files) | `doctor.ts` | 功能重叠 |
| `notification/*` (5 files) | `notification.ts` | 过度拆分 |
| `skill-md/*` (5 files) | `skills.ts` | 简化结构 |
| `code-tools/*` (7 files) | `codex.ts` | 统一管理 |
| `hooks/*` (4 files) | `hooks.ts` | 减少层级 |

### 4. 待移除/合并的命令

| 命令 | 行数 | 处理方式 | 原因 |
|------|------|---------|------|
| `shencha` | 868 | 合并到 doctor | 功能重叠 |
| `tools` | 236 | 合并到 menu | 入口重复 |
| `features` | 860 | 合并到 menu | 展示功能 |
| `context-menu` | 543 | 移除 | 使用率低 |
| `cloud-plugins` | 795 | 简化 | 过度设计 |
| `agents-sync` | 828 | 简化 | 可合并 |
| `hooks-sync` | 546 | 合并到 hooks | 功能单一 |
| `skills-sync` | 460 | 合并到 skills | 功能单一 |

**预计减少**：~5,000 行代码

### 5. 配置驱动架构

```yaml
# ~/.ccjk/config.yml
features:
  core:
    - init
    - update
    - doctor
    - menu
  enabled:
    - mcp
    - interview
    - commit
  disabled:
    - shencha      # deprecated
    - cloud-plugins # not needed

performance:
  lazy_load: true
  startup_timeout: 500ms
  max_mcp_services: 5
```

---

## 📊 预期效果

### 代码量对比

| 指标 | 当前 | 目标 | 减少 |
|------|------|------|------|
| 总代码行数 | 67,680 | 35,000 | -48% |
| 命令数量 | 30+ | 12 | -60% |
| Utils 文件 | 65+ | 30 | -54% |
| 最大单文件 | 2,240 | 500 | -78% |

### 性能对比

| 指标 | 当前 | 目标 | 改善 |
|------|------|------|------|
| 启动时间 | ~2.5s | <500ms | 5x |
| 内存占用 | ~150MB | ~50MB | 3x |
| Token 消耗 | 高 | 低 | 显著 |

---

## ✅ Acceptance Criteria

### 功能验收

- [ ] 核心命令 (init, update, doctor, menu) 正常工作
- [ ] 扩展命令按需加载，不影响启动速度
- [ ] 所有测试通过
- [ ] 向后兼容：旧命令显示废弃提示

### 性能指标

- [ ] 冷启动时间 < 500ms
- [ ] `ccjk --help` 响应 < 100ms
- [ ] 内存占用 < 80MB

### 代码质量

- [ ] 单文件不超过 500 行
- [ ] 测试覆盖率 > 80%
- [ ] 无循环依赖

---

## ⏱️ Implementation Plan

### Week 1: 核心精简

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | 命令分层设计 | 分层文档 |
| 3-4 | 实现懒加载机制 | 新 CLI 入口 |
| 5 | 移除废弃命令 | 精简后的命令集 |

### Week 2: 模块重构

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | Utils 模块合并 | 精简后的 utils |
| 3-4 | 大文件拆分 | 符合规范的文件 |
| 5 | 依赖清理 | 更新的 package.json |

### Week 3: 架构升级

| Day | Task | Deliverable |
|-----|------|-------------|
| 1-2 | 插件化架构 | 插件系统 |
| 3-4 | 配置驱动实现 | 配置系统 |
| 5 | 性能测试与优化 | 性能报告 |

---

## 🚀 Quick Wins (立即可做)

### 1. 启用懒加载 (1 小时)

修改 `cli-setup.ts`，将非核心命令改为动态导入。

### 2. 移除未使用代码 (2 小时)

- 删除 `shencha` 目录（已有 doctor 替代）
- 删除 `context-menu` 命令（使用率低）
- 清理未使用的 utils

### 3. 合并重复功能 (4 小时)

- `tools` + `features` → `menu`
- `*-sync` 命令 → 统一的 `sync` 命令

---

## 💡 与 Claude Code 官方对齐

### 官方 v2.1.x 的核心理念

1. **技能热重载**：我们已支持，但加载过重
2. **后台任务控制**：`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`
3. **权限规则可达性检测**：简化权限管理
4. **LSP 集成**：代码智能，而非堆砌功能

### 我们应该学习的

| 官方做法 | 我们的改进 |
|---------|-----------|
| 合并斜杠命令与技能 | 统一命令入口 |
| 启动性能优化 | 懒加载 + 精简 |
| 内存泄漏修复 | 资源自动释放 |
| 简化概念模型 | 减少命令数量 |

---

## 📝 Next Steps

1. **确认方案**：用户审批此规划
2. **Quick Wins**：立即执行快速优化
3. **分阶段实施**：按周推进重构
4. **持续监控**：建立性能基准

---

*Generated by CCJK Feature Planning System*
*Date: 2025-01-XX*

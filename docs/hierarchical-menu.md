# CCJK 层级菜单系统

## 概述

CCJK v12.0.15+ 引入了全新的层级菜单系统，提供更清晰的导航结构和更好的用户体验。

## 启用层级菜单

### 方法 1：环境变量

```bash
# 临时启用（当前会话）
export CCJK_HIERARCHICAL_MENU=1
npx ccjk

# 或者一次性启用
CCJK_HIERARCHICAL_MENU=1 npx ccjk
```

### 方法 2：配置文件（计划中）

未来版本将支持在 `~/.ccjk/config.toml` 中配置：

```toml
[ui]
hierarchical_menu = true
```

## 菜单结构

### 主菜单

```
╔═══════════════════════════════════════════════════════════════╗
║                         CCJK 主菜单                            ║
╚═══════════════════════════════════════════════════════════════╝

🚀 快速开始
  1. ⚡ 一键配置      - 自动完成所有配置
  2. 🔧 健康体检      - 诊断并修复问题
  3. 🔄 检查更新      - 更新所有组件
  4. 📦 导入工作流    - 导入工作流模板

⚙️  配置中心
  5. 🔑 API 配置      - 配置 API 密钥
  6. 🔌 MCP 配置      - 配置 MCP 服务

🔌 扩展工具
  7. 📚 Skills 管理   - 管理工作流技能
  8. 🤖 Agents 管理   - 管理 AI 智能体

────────────────────────────────────────────────────────────────
  L. 🌍 切换语言      H. ❓ 帮助文档      Q. 🚪 退出
```

### 快捷键规则

#### 数字键（1-9）
- 用于菜单项选择
- 每个菜单最多 9 个选项

#### 字母键（全局操作）
- `L` - Language（切换语言）
- `H` - Help（帮助文档）
- `Q` - Quit（退出程序）

#### 特殊键（导航）
- `0` - 返回上级菜单或退出

## 与旧版菜单的对比

### 旧版菜单（扁平化）

**问题**：
- 18 个选项扁平展示
- 标注混乱（1-8, K, M, A, P, R, G, 0, S, -, +, D, H, Q）
- 描述过长，难以快速浏览
- 新手学习成本高

### 新版菜单（层级化）

**优势**：
- 主菜单仅 8 个核心选项
- 统一的数字键标注（1-8）
- 简洁的描述文案（中文 8-12 字，英文 20-40 字符）
- 清晰的分类结构
- 全局快捷键（L, H, Q）

## 多语言支持

### 中文界面

```
🚀 快速开始
  1. ⚡ 一键配置      - 自动完成所有配置
  2. 🔧 健康体检      - 诊断并修复问题
```

### 英文界面

```
🚀 Quick Start
  1. ⚡ Quick Setup   - Auto-configure everything
  2. 🔧 Health Check  - Diagnose and fix issues
```

### 描述文案规范

- **中文**：8-12 字，简洁明了
- **英文**：20-40 字符，清晰表达

## 交互优化

### 智能输入处理

支持多种输入格式：

```bash
# 数字
1, 2, 3, ...

# 字母（大小写不敏感）
L, l, H, h, Q, q

# 完整名称（计划中）
language, help, quit

# 别名（计划中）
lang, exit
```

### 面包屑导航（计划中）

```
主菜单 > 配置中心 > API 配置

按 0 返回配置中心
按 Q 退出程序
```

### 错误提示

```
❌ 无效选项，请输入 1-8, L, H, Q
❌ 选项超出范围，请重新输入
```

## 开发指南

### 添加新菜单项

1. **更新翻译文件**

```json
// src/i18n/locales/zh-CN/menu.json
{
  "menu": {
    "quickStart": {
      "items": {
        "newFeature": {
          "name": "🎯 新功能",
          "description": "功能描述"
        }
      }
    }
  }
}
```

2. **更新菜单渲染**

```typescript
// src/commands/menu-hierarchical.ts
renderSection(
  i18n.t('menu:menu.menuSections.quickStart'),
  [
    // ... existing items
    {
      key: '5',
      name: i18n.t('menu:menu.quickStart.items.newFeature.name'),
      desc: i18n.t('menu:menu.quickStart.items.newFeature.description')
    },
  ],
)
```

3. **添加处理逻辑**

```typescript
// src/commands/menu.ts
case '5': {
  // New Feature
  await handleNewFeature()
  break
}
```

### 添加新子菜单

1. **创建子菜单函数**

```typescript
export async function showNewSubmenu(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'
  const context: MenuContext = {
    level: 'newSubmenu',
    breadcrumb: [i18n.t('menu:menu.breadcrumb.main'), '新子菜单'],
  }

  renderMenuHeader(context, isZh)
  // ... render items
  renderFooter(true, isZh)

  // ... prompt and return choice
}
```

2. **在主菜单中调用**

```typescript
case '9': {
  const { showNewSubmenu } = await import('./menu-hierarchical')
  const subChoice = await showNewSubmenu()
  // ... handle sub choice
  break
}
```

## 测试

### 手动测试

```bash
# 构建项目
pnpm build

# 测试层级菜单
CCJK_HIERARCHICAL_MENU=1 node dist/cli.mjs

# 测试旧版菜单（默认）
node dist/cli.mjs
```

### 自动化测试

```bash
# 运行菜单测试
pnpm vitest tests/commands/menu.test.ts

# 测试多语言
pnpm vitest tests/i18n/menu.test.ts
```

## 迁移计划

### Phase 1: Beta 测试（当前）
- ✅ 实现层级菜单核心功能
- ✅ 通过环境变量启用
- ✅ 保持旧版菜单作为默认

### Phase 2: 用户反馈（v12.1.0）
- 收集用户反馈
- 优化交互体验
- 完善子菜单功能

### Phase 3: 默认启用（v12.2.0）
- 层级菜单成为默认
- 旧版菜单通过环境变量启用
- 添加配置文件支持

### Phase 4: 移除旧版（v13.0.0）
- 完全移除旧版菜单
- 仅保留层级菜单

## 常见问题

### Q: 如何切换回旧版菜单？

A: 不设置 `CCJK_HIERARCHICAL_MENU` 环境变量即可使用旧版菜单（当前默认）。

### Q: 层级菜单支持所有功能吗？

A: 当前版本支持核心功能（快速开始、配置中心、扩展工具）。更多功能将在后续版本中添加。

### Q: 如何提供反馈？

A: 请在 GitHub Issues 中提交反馈：https://github.com/miounet11/ccjk/issues

## 参考资料

- [Linear Method](../skills/ccjk-linear-method.md) - 产品开发方法论
- [CLAUDE.md](../CLAUDE.md) - 项目文档
- [i18n 模块](../src/i18n/CLAUDE.md) - 多语言支持

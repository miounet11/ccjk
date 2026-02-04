# Output Styles 更新说明

## 新增输出风格

本次更新新增了 5 个专业输出风格模板，丰富了 CCJK 的 AI 协作模式选择。

### 新增风格列表

1. **极客黑客 (Geek Hacker)**
   - 追求极致效率、技术深度和创新解决方案
   - 擅长底层优化、算法设计、性能调优
   - 适合：系统编程、性能优化、算法实现

2. **产品思维 (Product Minded)**
   - 关注用户价值、商业逻辑和产品体验
   - 平衡技术实现与业务目标
   - 适合：产品开发、功能设计、用户体验优化

3. **安全专家 (Security Expert)**
   - 安全第一的开发方式
   - 主动识别和防范安全漏洞
   - 适合：安全审计、漏洞修复、安全加固

4. **测试驱动 (Test Driven)**
   - TDD/BDD 最佳实践
   - 先写测试后写代码，注重测试覆盖率
   - 适合：质量要求高的项目、重构、关键业务逻辑

5. **开源贡献者 (Open Source Contributor)**
   - 遵循开源最佳实践
   - 注重代码规范、文档完善、社区协作
   - 适合：开源项目开发、PR 贡献、社区维护

### 现有风格（保持不变）

1. **极速编码 (Speed Coder)** - 最小化 token，快速迭代
2. **资深架构师 (Senior Architect)** - 代码质量和架构设计
3. **结对编程 (Pair Programmer)** - 协作式开发
4. **默认风格 (Default)** - Claude Code 原生
5. **解释风格 (Explanatory)** - Claude Code 原生
6. **学习风格 (Learning)** - Claude Code 原生

## 文件变更

### 新增模板文件

```
templates/common/output-styles/zh-CN/
├── geek-hacker.md          (新增)
├── product-minded.md       (新增)
├── security-expert.md      (新增)
├── test-driven.md          (新增)
├── open-source.md          (新增)
├── speed-coder.md          (已存在)
├── senior-architect.md     (已存在)
└── pair-programmer.md      (已存在)
```

### 代码变更

1. **src/utils/output-style.ts**
   - 更新 `OUTPUT_STYLES` 数组，添加 5 个新风格
   - 更新 `outputStyleList`，添加 i18n 引用

2. **src/i18n/locales/zh-CN/configuration.json**
   - 添加新风格的中文名称和描述

3. **src/i18n/locales/en/configuration.json**
   - 添加新风格的英文名称和描述

## 使用方法

### 安装新风格

```bash
# 重新运行配置向导
npx ccjk init

# 或使用命令行直接配置
npx ccjk config output-style
```

### 在 Claude Code 中使用

安装后，新风格会出现在配置选择列表中，用户可以：

1. 在初始化时选择要安装的风格
2. 选择一个作为全局默认风格
3. 风格模板会被复制到 `~/.claude/output-styles/` 目录

## 技术细节

### 模板结构

每个模板文件包含：

```markdown
---
name: style-id
description: 风格描述
---

# 风格名称

## 核心理念
[核心原则和理念]

## 快捷指令
[支持的快捷指令表格]

## 工作流程
[具体的工作方式和示例]

## 响应结构
[输出格式规范]
```

### i18n 配置

每个风格需要在两个语言文件中配置：

```json
{
  "outputStyles.{style-id}.name": "显示名称",
  "outputStyles.{style-id}.description": "简短描述"
}
```

## 测试建议

1. 运行 `npx ccjk init` 验证新风格出现在选择列表中
2. 选择并安装新风格，确认文件正确复制到 `~/.claude/output-styles/`
3. 在 Claude Code 中测试每个新风格的行为是否符合预期
4. 验证中英文翻译显示正确

## 后续工作

- [ ] 添加英文版模板（如需要）
- [ ] 收集用户反馈优化模板内容
- [ ] 考虑添加更多专业领域的风格（如 DevOps、数据科学等）
- [ ] 添加风格切换的快捷命令

## 版本信息

- 更新日期: 2026-02-04
- 影响版本: v9.4.5+
- 向后兼容: 是

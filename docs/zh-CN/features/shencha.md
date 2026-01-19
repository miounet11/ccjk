---
title: ShenCha 审查引擎
---

# ShenCha 审查引擎

ShenCha（审查）是 CCJK 内置的智能代码审查引擎，提供全面的代码质量分析、安全审计和最佳实践检查。

## 什么是 ShenCha？

ShenCha 是一个 AI 驱动的代码审查系统：

- 🔍 **深度分析**：不仅检查语法，还理解代码意图
- 🛡️ **安全审计**：识别潜在的安全漏洞
- 📊 **质量评估**：多维度评估代码质量
- 💡 **智能建议**：提供可操作的改进建议

## 快速开始

### 基本用法

```bash
# 审查单个文件
/shencha src/auth/login.ts

# 审查整个目录
/shencha src/

# 审查最近的更改
/shencha --changed

# 审查特定提交
/shencha --commit abc123
```

### 审查模式

```bash
# 快速审查（默认）
/shencha src/utils.ts

# 深度审查
/shencha src/utils.ts --deep

# 安全专项审查
/shencha src/auth/ --security

# 性能专项审查
/shencha src/api/ --performance
```

## 审查维度

### 1. 代码质量

ShenCha 从多个角度评估代码质量：

| 维度 | 检查项 | 权重 |
|------|--------|------|
| **可读性** | 命名、注释、格式 | 25% |
| **可维护性** | 复杂度、耦合度、模块化 | 25% |
| **可测试性** | 依赖注入、纯函数、边界清晰 | 20% |
| **健壮性** | 错误处理、边界检查、类型安全 | 20% |
| **一致性** | 风格统一、模式一致 | 10% |

**输出示例**：

```
📊 代码质量评分: 7.5/10

✅ 优点:
  • 命名清晰，易于理解
  • 函数职责单一
  • 类型定义完整

⚠️ 待改进:
  • 函数 processData 复杂度过高 (圈复杂度: 15)
  • 缺少关键逻辑的注释
  • 存在 3 处重复代码

💡 建议:
  1. 将 processData 拆分为多个小函数
  2. 为复杂的业务逻辑添加注释
  3. 提取重复代码到公共函数
```

### 2. 安全审计

检测常见的安全问题：

| 类别 | 检查项 |
|------|--------|
| **注入攻击** | SQL 注入、XSS、命令注入 |
| **认证授权** | 弱密码、会话管理、权限检查 |
| **数据安全** | 敏感数据暴露、加密不当 |
| **配置安全** | 硬编码密钥、不安全的默认值 |
| **依赖安全** | 已知漏洞、过时依赖 |

**输出示例**：

```
🛡️ 安全审计报告

🔴 严重 (1):
  • [SQL-001] 检测到潜在的 SQL 注入
    位置: src/db/query.ts:45
    代码: `SELECT * FROM users WHERE id = ${userId}`
    建议: 使用参数化查询

🟡 警告 (2):
  • [AUTH-002] 密码未使用安全哈希
    位置: src/auth/password.ts:12
    建议: 使用 bcrypt 或 argon2

  • [DATA-001] 敏感数据可能被日志记录
    位置: src/utils/logger.ts:28
    建议: 过滤敏感字段

🟢 信息 (1):
  • [DEP-001] 依赖 lodash@4.17.15 有已知漏洞
    建议: 升级到 4.17.21+
```

### 3. 性能分析

识别性能问题和优化机会：

| 类别 | 检查项 |
|------|--------|
| **算法复杂度** | O(n²) 循环、不必要的遍历 |
| **内存使用** | 内存泄漏、大对象、缓存缺失 |
| **I/O 操作** | 同步阻塞、N+1 查询、无批处理 |
| **渲染性能** | 不必要的重渲染、大列表 |
| **资源加载** | 未优化的资源、缺少懒加载 |

**输出示例**：

```
⚡ 性能分析报告

🔴 严重 (1):
  • [PERF-001] 检测到 N+1 查询问题
    位置: src/api/users.ts:34-42
    影响: 每个用户触发一次数据库查询
    建议: 使用批量查询或 DataLoader

🟡 警告 (2):
  • [PERF-002] 大数组在循环中重复创建
    位置: src/utils/transform.ts:15
    建议: 将数组创建移到循环外

  • [PERF-003] 未使用 useMemo 优化计算
    位置: src/components/List.tsx:28
    建议: 使用 useMemo 缓存计算结果

💡 优化建议:
  • 预计优化后性能提升: 40-60%
  • 优先处理: PERF-001 (影响最大)
```

### 4. 最佳实践

检查是否遵循最佳实践：

```
📋 最佳实践检查

框架规范 (React):
  ✅ 使用函数组件和 Hooks
  ✅ Props 类型定义完整
  ⚠️ 未使用 React.memo 优化
  ❌ 在渲染中创建新函数

TypeScript 规范:
  ✅ 启用严格模式
  ✅ 避免使用 any
  ⚠️ 部分类型可以更精确
  ✅ 正确使用泛型

项目规范:
  ✅ 文件命名符合规范
  ⚠️ 部分函数缺少 JSDoc
  ✅ 导入顺序正确
  ✅ 无循环依赖
```

## 配置 ShenCha

### 项目配置

在项目根目录创建 `.shencha.yaml`：

```yaml
# .shencha.yaml
version: 1

# 审查范围
include:
  - src/**/*.ts
  - src/**/*.tsx

exclude:
  - src/**/*.test.ts
  - src/**/*.spec.ts
  - node_modules/**

# 审查规则
rules:
  # 代码质量
  quality:
    maxComplexity: 10
    maxFileLines: 300
    maxFunctionLines: 50
    requireComments: true

  # 安全规则
  security:
    level: strict  # strict | moderate | relaxed
    checkDependencies: true
    sensitivePatterns:
      - password
      - secret
      - apiKey

  # 性能规则
  performance:
    checkNPlusOne: true
    checkMemoryLeaks: true
    maxBundleSize: 500kb

  # 最佳实践
  bestPractices:
    framework: react
    typescript: strict
    testing:
      minCoverage: 80

# 自定义规则
customRules:
  - id: no-console-in-prod
    pattern: "console\\.(log|debug|info)"
    message: "生产代码中不应使用 console"
    severity: warning
    exclude:
      - src/utils/logger.ts

# 报告配置
report:
  format: markdown  # markdown | json | html
  output: ./shencha-report.md
  includeCode: true
  maxIssues: 50
```

### 规则级别

```yaml
# 禁用特定规则
rules:
  disabled:
    - SEC-001  # 禁用特定安全规则
    - PERF-003

# 调整规则级别
rules:
  overrides:
    SEC-002:
      severity: error  # 提升为错误
    QUAL-001:
      severity: info   # 降级为信息
```

### 团队配置

```yaml
# 团队共享配置
extends:
  - "@ccjk/shencha-config-recommended"
  - "./team-rules.yaml"

# 覆盖继承的配置
overrides:
  rules:
    quality:
      maxComplexity: 15  # 团队允许更高复杂度
```

## 集成工作流

### Git Hooks 集成

```yaml
# .claude/hooks/pre-commit-shencha.yaml
name: shencha-pre-commit
event: onPreCommit

handler:
  command: /shencha --changed --fail-on error
  onFailure:
    action: block
    message: "代码审查未通过，请修复问题后再提交"
```

### CI/CD 集成

```yaml
# .github/workflows/shencha.yml
name: Code Review

on: [pull_request]

jobs:
  shencha:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run ShenCha
        run: npx ccjk shencha --ci --report json

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: shencha-report
          path: shencha-report.json

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./shencha-report.json');
            // 生成 PR 评论
```

### IDE 集成

```json
// .vscode/settings.json
{
  "ccjk.shencha.enabled": true,
  "ccjk.shencha.autoRun": true,
  "ccjk.shencha.runOnSave": true,
  "ccjk.shencha.showInlineHints": true
}
```

## 交互式审查

### 对话式审查

```
用户: /shencha src/auth/login.ts

ShenCha: 我已完成对 login.ts 的审查，发现以下问题：

🔴 严重问题 (1):
1. 密码比较使用了不安全的方式

🟡 警告 (3):
2. 缺少登录失败的速率限制
3. 会话 token 未设置过期时间
4. 错误信息可能泄露用户存在性

需要我详细解释某个问题吗？或者帮你修复？

用户: 详细解释第一个问题

ShenCha: 问题 1 详解：不安全的密码比较

📍 位置: src/auth/login.ts:28

```typescript
// 当前代码
if (password === user.password) {
  // 登录成功
}
```

❌ 问题:
1. 直接比较明文密码，说明密码未加密存储
2. 使用 === 比较可能受时序攻击

✅ 建议修复:

```typescript
import bcrypt from 'bcrypt';

// 存储时加密
const hashedPassword = await bcrypt.hash(password, 10);

// 验证时比较
const isValid = await bcrypt.compare(password, user.hashedPassword);
if (isValid) {
  // 登录成功
}
```

需要我帮你应用这个修复吗？

用户: 是的，请修复

ShenCha: 好的，我已经：
1. ✅ 添加了 bcrypt 依赖
2. ✅ 修改了密码验证逻辑
3. ✅ 更新了用户模型的密码字段

请查看修改并确认。
```

### 批量修复

```
用户: /shencha src/ --fix

ShenCha: 扫描完成，发现 15 个可自动修复的问题：

可自动修复:
  • 8 个格式问题
  • 4 个导入顺序问题
  • 2 个未使用变量
  • 1 个类型问题

需要手动处理:
  • 2 个安全问题
  • 3 个逻辑问题

是否自动修复可修复的问题？[Y/n]

用户: Y

ShenCha: ✅ 已自动修复 15 个问题

修改的文件:
  • src/utils/helper.ts (3 处)
  • src/api/user.ts (5 处)
  • src/components/Form.tsx (4 处)
  • src/hooks/useAuth.ts (3 处)

剩余 5 个问题需要手动处理，是否查看详情？
```

## 自定义规则

### 创建自定义规则

```typescript
// .shencha/rules/no-magic-numbers.ts
import { Rule, RuleContext } from '@ccjk/shencha';

export const noMagicNumbers: Rule = {
  id: 'custom/no-magic-numbers',
  name: '禁止魔法数字',
  description: '数字字面量应该使用命名常量',
  severity: 'warning',

  // 匹配模式
  pattern: /\b\d{2,}\b/,

  // 排除模式
  exclude: [
    /const\s+\w+\s*=\s*\d+/,  // 常量定义
    /\[\d+\]/,                 // 数组索引
  ],

  // 检查逻辑
  check(context: RuleContext) {
    const { node, code } = context;

    // 检查是否是魔法数字
    if (isMagicNumber(node)) {
      return {
        message: `避免使用魔法数字 ${node.value}，请使用命名常量`,
        fix: {
          suggestion: `const MEANINGFUL_NAME = ${node.value};`
        }
      };
    }
  }
};
```

### 规则模板

```yaml
# .shencha/rules/team-rules.yaml
rules:
  - id: team/require-error-boundary
    name: 要求错误边界
    description: 页面组件必须包含错误边界
    severity: error
    filePattern: "src/pages/**/*.tsx"
    check:
      type: ast
      query: |
        找到所有页面组件，检查是否被 ErrorBoundary 包裹

  - id: team/api-response-type
    name: API 响应类型
    description: API 函数必须定义返回类型
    severity: warning
    filePattern: "src/api/**/*.ts"
    pattern: "async function \\w+\\([^)]*\\)(?!:)"
    message: "API 函数缺少返回类型定义"

  - id: team/no-inline-styles
    name: 禁止内联样式
    description: 使用 CSS 类而非内联样式
    severity: warning
    filePattern: "**/*.tsx"
    pattern: "style=\\{\\{"
    message: "避免使用内联样式，请使用 CSS 类"
```

## 报告与统计

### 生成报告

```bash
# Markdown 报告
/shencha src/ --report markdown --output report.md

# JSON 报告（适合 CI）
/shencha src/ --report json --output report.json

# HTML 报告（可视化）
/shencha src/ --report html --output report.html
```

### 趋势分析

```bash
# 查看代码质量趋势
ccjk shencha trends

# 输出示例
Code Quality Trends (Last 30 days)
──────────────────────────────────

Quality Score:
  30d ago: 6.8  →  Today: 7.5  (+10.3%)

Issues:
  Critical:  5 → 2  (-60%)
  Warning:  28 → 15 (-46%)
  Info:     42 → 38 (-10%)

Top Improvements:
  • Security issues: -70%
  • Code complexity: -25%
  • Test coverage: +15%

Areas Needing Attention:
  • Documentation: -5%
  • Performance: no change
```

### 团队仪表板

```bash
# 生成团队报告
ccjk shencha team-report

# 输出示例
Team Code Quality Report
────────────────────────

By Author (Last 7 days):
  Alice:  8.2/10  (15 commits, 2 issues)
  Bob:    7.5/10  (12 commits, 5 issues)
  Carol:  8.8/10  (8 commits, 0 issues)

By Module:
  src/auth:       7.2/10  ⚠️ Needs attention
  src/api:        8.1/10  ✅ Good
  src/components: 8.5/10  ✅ Good
  src/utils:      9.0/10  ✅ Excellent

Recommendations:
  1. Focus on src/auth module security
  2. Add more tests to src/api
  3. Document src/utils functions
```

## 最佳实践

### 1. 渐进式采用

```yaml
# 第一阶段：只检查严重问题
rules:
  severity: error

# 第二阶段：添加警告
rules:
  severity: warning

# 第三阶段：完整检查
rules:
  severity: info
```

### 2. 团队规范统一

```yaml
# 共享团队配置
extends:
  - "@company/shencha-config"

# 项目特定覆盖
overrides:
  # ...
```

### 3. 持续改进

```bash
# 定期运行完整审查
ccjk shencha --full --report

# 跟踪改进进度
ccjk shencha trends --period 90d
```

### 4. 与 CI 集成

```yaml
# 在 PR 中强制审查
on: pull_request
jobs:
  review:
    steps:
      - run: ccjk shencha --fail-on error
```

## 相关资源

- [Agents 代理系统](agents.md) - 审查代理详情
- [Hooks 系统](hooks.md) - 审查钩子配置
- [Skills 技能系统](../features/skills.md) - 审查技能
- [配置管理](configuration.md) - ShenCha 配置

> 💡 **提示**：ShenCha 是提升代码质量的有力工具。建议在开发流程中尽早集成，及时发现和修复问题，避免技术债务积累。

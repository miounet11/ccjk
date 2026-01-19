---
name: documentation-gen
description: 代码和 API 的自动文档生成
version: 1.0.0
author: CCJK
category: docs
triggers:
  - /docs
  - /doc
  - /document
  - /readme
use_when:
  - "用户想要生成文档"
  - "代码需要文档"
  - "用户提到 README 或文档"
  - "需要 API 文档"
auto_activate: true
priority: 6
difficulty: beginner
tags:
  - documentation
  - readme
  - api-docs
  - jsdoc
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - LSP
context: inherit
user-invocable: true
---

# 文档生成技能

## 概述

此技能为代码、API 和项目提供全面的文档生成能力。它帮助创建清晰、可维护的文档,遵循行业最佳实践。

## 文档类型

### 1. README.md 生成

生成全面的项目 README 文件,包含:

- **项目概述**: 清晰描述项目功能
- **安装说明**: 分步设置指南
- **使用示例**: 实用代码示例
- **API 参考**: 主要 API 的快速参考
- **贡献指南**: 如何为项目做贡献
- **许可证信息**: 项目许可详情

**示例结构**:
```markdown
# 项目名称

项目的简要描述。

## 特性

- 特性 1
- 特性 2
- 特性 3

## 安装

\`\`\`bash
npm install project-name
\`\`\`

## 使用

\`\`\`javascript
import { feature } from 'project-name';

feature.doSomething();
\`\`\`

## API 参考

### `feature.doSomething(options)`

方法的描述。

**参数:**
- `options` (Object): 配置选项

**返回值:** 返回值的描述

## 贡献

请阅读 CONTRIBUTING.md 了解详情。

## 许可证

MIT 许可证 - 详见 LICENSE 文件。
```

### 2. API 文档

生成详细的 API 文档,包括:

- **端点描述**: 每个端点的清晰说明
- **请求/响应示例**: 示例请求和响应
- **参数文档**: 所有参数及其类型和描述
- **错误代码**: 可能的错误响应
- **身份验证**: 认证要求和方法

**REST API 示例**:
```markdown
## GET /api/users/:id

通过 ID 检索用户。

**参数:**
- `id` (string, 必需): 用户 ID

**响应:**
\`\`\`json
{
  "id": "123",
  "name": "张三",
  "email": "zhangsan@example.com"
}
\`\`\`

**错误响应:**
- `404 Not Found`: 用户不存在
- `401 Unauthorized`: 无效的身份验证令牌
```

### 3. JSDoc/TSDoc 注释

生成内联代码文档:

**函数文档**:
```typescript
/**
 * 计算两个数字的和。
 *
 * @param a - 第一个数字
 * @param b - 第二个数字
 * @returns a 和 b 的和
 * @throws {TypeError} 如果参数不是数字
 *
 * @example
 * ```typescript
 * const result = add(5, 3);
 * console.log(result); // 8
 * ```
 */
function add(a: number, b: number): number {
  return a + b;
}
```

**类文档**:
```typescript
/**
 * 表示系统中的用户。
 *
 * @class User
 * @implements {IUser}
 *
 * @example
 * ```typescript
 * const user = new User('张三', 'zhangsan@example.com');
 * user.greet(); // "你好,我是张三"
 * ```
 */
class User implements IUser {
  /**
   * 创建新的 User 实例。
   *
   * @param name - 用户名
   * @param email - 用户邮箱地址
   */
  constructor(
    public name: string,
    public email: string
  ) {}

  /**
   * 返回问候消息。
   *
   * @returns 个性化的问候语
   */
  greet(): string {
    return `你好,我是 ${this.name}`;
  }
}
```

### 4. 架构文档

记录系统架构和设计:

**架构概述**:
```markdown
# 系统架构

## 概述

系统架构的高层描述。

## 组件

### 前端
- **技术栈**: React + TypeScript
- **状态管理**: Redux Toolkit
- **路由**: React Router

### 后端
- **技术栈**: Node.js + Express
- **数据库**: PostgreSQL
- **缓存**: Redis

### 基础设施
- **托管**: AWS
- **CI/CD**: GitHub Actions
- **监控**: DataDog

## 数据流

\`\`\`mermaid
graph LR
    A[客户端] --> B[API 网关]
    B --> C[后端服务]
    C --> D[数据库]
    C --> E[缓存]
\`\`\`

## 安全性

- 基于 JWT 的身份验证
- HTTPS 加密
- 速率限制
- 输入验证
```

### 5. CHANGELOG 生成

生成和维护变更日志文件:

```markdown
# 变更日志

此项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 新功能 X
- 新功能 Y

### 变更
- 将依赖 Z 更新到 v2.0

### 修复
- 修复问题 #123 的 bug

## [1.2.0] - 2026-01-10

### 新增
- 功能 A 及其完整测试
- 功能 B 及其文档

### 变更
- 改进模块 C 的性能
- 更新 UI 组件

### 弃用
- 旧的 API 端点 /v1/users (请使用 /v2/users)

### 移除
- 已弃用的功能 D

### 修复
- 身份验证流程中的关键 bug
- 后台服务中的内存泄漏

### 安全
- 修补漏洞 CVE-2026-1234

## [1.1.0] - 2025-12-15

...
```

## 文档模板

### 项目 README 模板

```markdown
# [项目名称]

[徽章: 构建状态、覆盖率、版本、许可证]

[简短的一行描述]

## 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [使用](#使用)
- [API 参考](#api-参考)
- [配置](#配置)
- [示例](#示例)
- [贡献](#贡献)
- [测试](#测试)
- [变更日志](#变更日志)
- [许可证](#许可证)

## 特性

- 特性 1: 描述
- 特性 2: 描述
- 特性 3: 描述

## 安装

\`\`\`bash
# npm
npm install [package-name]

# yarn
yarn add [package-name]

# pnpm
pnpm add [package-name]
\`\`\`

## 快速开始

\`\`\`javascript
// 快速示例
import { feature } from '[package-name]';

const result = feature.doSomething();
console.log(result);
\`\`\`

## 使用

### 基本使用

[详细使用说明]

### 高级使用

[高级示例和模式]

## API 参考

[全面的 API 文档]

## 配置

[配置选项和示例]

## 示例

[多个实用示例]

## 贡献

欢迎贡献!请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 测试

\`\`\`bash
npm test
\`\`\`

## 变更日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解发布历史。

## 许可证

[许可证类型] - 详见 [LICENSE](LICENSE) 文件。
```

### API 端点文档模板

```markdown
## [方法] /api/endpoint

[此端点功能的简要描述]

### 身份验证

[必需/可选] - [认证类型: Bearer token、API key 等]

### 请求

**请求头:**
\`\`\`
Content-Type: application/json
Authorization: Bearer {token}
\`\`\`

**参数:**
- `param1` (类型, 必需/可选): 描述
- `param2` (类型, 必需/可选): 描述

**请求体:**
\`\`\`json
{
  "field1": "value1",
  "field2": "value2"
}
\`\`\`

### 响应

**成功 (200 OK):**
\`\`\`json
{
  "status": "success",
  "data": {
    "id": "123",
    "result": "value"
  }
}
\`\`\`

**错误响应:**

- `400 Bad Request`: 无效参数
  \`\`\`json
  {
    "status": "error",
    "message": "无效参数: param1"
  }
  \`\`\`

- `401 Unauthorized`: 身份验证失败
- `404 Not Found`: 资源未找到
- `500 Internal Server Error`: 服务器错误

### 示例

\`\`\`bash
curl -X POST https://api.example.com/api/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"field1": "value1", "field2": "value2"}'
\`\`\`

### 速率限制

- 速率限制: 每分钟 100 次请求
- 速率限制头: `X-RateLimit-Remaining`
```

### 组件文档模板

```markdown
# 组件名称

[组件的简要描述]

## 属性

| 属性 | 类型 | 默认值 | 必需 | 描述 |
|------|------|--------|------|------|
| prop1 | string | - | 是 | prop1 的描述 |
| prop2 | number | 0 | 否 | prop2 的描述 |
| onEvent | function | - | 否 | 回调函数 |

## 使用

\`\`\`tsx
import { ComponentName } from './ComponentName';

function App() {
  return (
    <ComponentName
      prop1="value"
      prop2={42}
      onEvent={(data) => console.log(data)}
    />
  );
}
\`\`\`

## 示例

### 基本示例

\`\`\`tsx
<ComponentName prop1="basic" />
\`\`\`

### 高级示例

\`\`\`tsx
<ComponentName
  prop1="advanced"
  prop2={100}
  onEvent={(data) => {
    // 处理事件
  }}
/>
\`\`\`

## 样式

[CSS 类、样式选项、主题]

## 无障碍性

[ARIA 属性、键盘导航、屏幕阅读器支持]

## 浏览器支持

- Chrome: ✓
- Firefox: ✓
- Safari: ✓
- Edge: ✓
```

### 函数文档模板

```typescript
/**
 * [简短的一行描述]
 *
 * [函数功能的详细描述,包括任何重要的行为、副作用或注意事项]
 *
 * @param paramName - 参数的描述
 * @param options - 配置选项
 * @param options.option1 - option1 的描述
 * @param options.option2 - option2 的描述
 *
 * @returns 返回值的描述
 *
 * @throws {ErrorType} 何时抛出此错误的描述
 *
 * @example
 * 基本用法:
 * ```typescript
 * const result = functionName('value');
 * console.log(result); // 预期输出
 * ```
 *
 * @example
 * 带选项的高级用法:
 * ```typescript
 * const result = functionName('value', {
 *   option1: true,
 *   option2: 'custom'
 * });
 * ```
 *
 * @see {@link RelatedFunction} 相关功能
 * @since 1.0.0
 * @deprecated 请使用 {@link NewFunction} 代替
 */
```

## 最佳实践

### 1. 清晰简洁的写作

- **使用简单语言**: 除非必要,避免使用术语
- **具体明确**: 提供具体示例而非抽象描述
- **保持专注**: 每个部分应有单一、清晰的目的
- **使用主动语态**: "函数返回"而非"值被返回"

### 2. 代码示例

- **提供可运行的示例**: 所有代码示例都应该可以运行
- **展示常见用例**: 涵盖最常见的场景
- **包含边缘情况**: 记录不常见但重要的情况
- **使用真实数据**: 示例应反映实际使用情况

**好的示例**:
```typescript
// 好: 真实、完整的示例
const user = await fetchUser('user-123');
if (user) {
  console.log(`欢迎,${user.name}!`);
}
```

**不好的示例**:
```typescript
// 不好: 抽象、不完整的示例
const x = func(y);
```

### 3. 使用说明

- **分步骤**: 将复杂过程分解为清晰的步骤
- **前置条件**: 在说明前列出要求
- **预期结果**: 描述应该发生什么
- **故障排除**: 包含常见问题和解决方案

**示例**:
```markdown
## 安装

### 前置条件
- Node.js 18 或更高版本
- npm 9 或更高版本

### 步骤

1. 安装包:
   \`\`\`bash
   npm install package-name
   \`\`\`

2. 在代码中导入:
   \`\`\`typescript
   import { feature } from 'package-name';
   \`\`\`

3. 配置(可选):
   \`\`\`typescript
   feature.configure({ option: 'value' });
   \`\`\`

### 验证

运行以下命令验证安装:
\`\`\`bash
npm list package-name
\`\`\`

### 故障排除

**问题**: 安装失败,出现 EACCES 错误
**解决方案**: 使用 sudo 运行或修复 npm 权限
```

### 4. 保持文档更新

- **版本文档**: 用版本号标记文档
- **随代码更改更新**: 代码更改时更新文档
- **定期审查**: 定期审核文档
- **弃用通知**: 清楚标记已弃用的功能

### 5. 结构和组织

- **逻辑流程**: 从简单到复杂组织
- **目录**: 较长文档需要目录
- **交叉引用**: 链接相关部分
- **一致的格式**: 使用一致的 markdown 样式

### 6. 无障碍性

- **图片替代文本**: 描述图表和截图
- **语义标题**: 使用正确的标题层次
- **代码块标签**: 指定语言以进行语法高亮
- **链接文本**: 使用描述性链接文本,而非"点击这里"

## 输出格式

### 1. Markdown

大多数文档的主要格式:

```markdown
# 一级标题
## 二级标题
### 三级标题

**粗体文本**
*斜体文本*
`内联代码`

- 无序列表
- 项目 2

1. 有序列表
2. 项目 2

[链接文本](https://example.com)

![图片替代文本](image.png)

\`\`\`language
代码块
\`\`\`

> 引用

| 表格 | 标题 |
|------|------|
| 单元格 | 单元格 |
```

### 2. HTML (通过工具)

用于基于 Web 的文档:

```html
<!DOCTYPE html>
<html>
<head>
  <title>API 文档</title>
  <style>
    /* 文档样式 */
  </style>
</head>
<body>
  <nav><!-- 导航 --></nav>
  <main>
    <article>
      <!-- 文档内容 -->
    </article>
  </main>
</body>
</html>
```

### 3. JSDoc 注释

用于内联代码文档:

```typescript
/**
 * @module ModuleName
 * @description 模块描述
 */

/**
 * @typedef {Object} TypeName
 * @property {string} prop1 - 描述
 * @property {number} prop2 - 描述
 */

/**
 * @function functionName
 * @description 函数描述
 * @param {string} param - 参数描述
 * @returns {Promise<Result>} 返回值描述
 */
```

## 工作流程

### 1. 分析代码

- 阅读源文件以理解功能
- 识别公共 API 和接口
- 注意重要的模式和约定
- 检查现有文档

### 2. 生成文档

- 创建适当的文档类型
- 遵循模板和最佳实践
- 包含全面的示例
- 添加交叉引用

### 3. 审查和完善

- 验证技术细节的准确性
- 测试所有代码示例
- 检查清晰度和完整性
- 确保格式一致

### 4. 集成

- 将文档放在适当位置
- 更新目录和索引
- 添加到版本控制
- 通知团队更新

## 成功技巧

1. **从为什么开始**: 在详细信息之前解释目的
2. **展示,而不仅仅是告诉**: 大量使用示例
3. **像用户一样思考**: 为受众的知识水平编写
4. **保持一致**: 使用一致的术语和格式
5. **保持最新**: 文档应与代码匹配
6. **使其可搜索**: 使用清晰的标题和关键字
7. **测试示例**: 所有代码示例都应该有效
8. **获取反馈**: 让其他人审查您的文档

## 常见陷阱

- **假设知识**: 不要假设读者了解上下文
- **不完整的示例**: 提供完整、可运行的示例
- **过时信息**: 保持文档与代码同步
- **组织不良**: 逻辑地组织信息
- **缺少错误情况**: 记录错误处理
- **没有视觉辅助**: 在有帮助的地方使用图表
- **不一致的风格**: 保持一致的格式

## 资源

- [Markdown 指南](https://www.markdownguide.org/)
- [JSDoc 文档](https://jsdoc.app/)
- [TypeDoc](https://typedoc.org/)
- [Keep a Changelog](https://keepachangelog.com/zh-CN/)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Write the Docs](https://www.writethedocs.org/)

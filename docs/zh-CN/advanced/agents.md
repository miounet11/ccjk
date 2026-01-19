---
title: Agents 代理系统
---

# Agents 代理系统

CCJK 的代理系统提供了专业化的 AI 助手，每个代理都有特定的专业领域和能力，可以协同工作完成复杂任务。

## 什么是代理？

代理（Agent）是具有特定角色和专业知识的 AI 实体。与通用 AI 不同，代理：

- 🎯 **专注特定领域**：每个代理专注于一个专业领域
- 🧠 **具备专业知识**：内置领域最佳实践和经验
- 🤝 **可协同工作**：多个代理可以协作完成复杂任务
- 📋 **遵循规范**：按照预定义的流程和标准工作

## 内置代理

CCJK 提供了丰富的内置代理：

### 开发类代理

| 代理 | 调用方式 | 专业领域 |
|------|---------|---------|
| **Planner** | `@planner` | 项目规划、任务分解、技术方案设计 |
| **Architect** | `@architect` | 系统架构、技术选型、设计模式 |
| **Developer** | `@developer` | 代码实现、功能开发、问题修复 |
| **Reviewer** | `@reviewer` | 代码审查、质量检查、最佳实践 |
| **Tester** | `@tester` | 测试策略、用例设计、自动化测试 |
| **DevOps** | `@devops` | CI/CD、部署、基础设施 |

### 设计类代理

| 代理 | 调用方式 | 专业领域 |
|------|---------|---------|
| **UI/UX Designer** | `@ui-ux` | 界面设计、用户体验、交互设计 |
| **Product Manager** | `@pm` | 产品规划、需求分析、优先级排序 |
| **Technical Writer** | `@writer` | 技术文档、API 文档、用户手册 |

### 专项代理

| 代理 | 调用方式 | 专业领域 |
|------|---------|---------|
| **Security Expert** | `@security` | 安全审计、漏洞分析、安全加固 |
| **Performance Expert** | `@performance` | 性能优化、瓶颈分析、调优建议 |
| **Database Expert** | `@dba` | 数据库设计、查询优化、数据建模 |
| **API Designer** | `@api` | API 设计、接口规范、版本管理 |

## 调用代理

### 方式 1：@ 符号调用

最简单的调用方式：

```
@planner 帮我规划一个用户认证模块的开发计划

@reviewer 请审查 src/auth/login.ts 的代码质量

@security 检查这个 API 端点的安全性
```

### 方式 2：斜杠命令

使用斜杠命令调用：

```
/agent planner 规划用户认证模块

/agent reviewer --file src/auth/login.ts

/agent security --scope api
```

### 方式 3：自动委派

在工作流中自动委派给合适的代理：

```markdown
## 任务分配

当检测到以下情况时自动委派：

- 代码审查请求 → @reviewer
- 安全相关问题 → @security
- 性能问题 → @performance
- 架构讨论 → @architect
```

## 代理协作

### 串行协作

代理按顺序工作：

```
用户: 开发一个新的支付功能

流程:
1. @pm 分析需求，定义功能范围
2. @architect 设计技术方案
3. @planner 分解任务，制定计划
4. @developer 实现功能
5. @tester 编写测试
6. @reviewer 审查代码
7. @writer 编写文档
```

### 并行协作

多个代理同时工作：

```
用户: 全面审查这个模块

并行执行:
├── @reviewer → 代码质量审查
├── @security → 安全漏洞扫描
├── @performance → 性能分析
└── @tester → 测试覆盖率检查

汇总结果 → 综合报告
```

### 对话协作

代理之间进行对话：

```
@architect: 建议使用微服务架构

@devops: 微服务会增加部署复杂度，
         我们的 CI/CD 需要升级

@architect: 考虑到团队规模，
           可以先用模块化单体，
           后续再拆分

@pm: 同意，这样可以更快交付 MVP
```

## 创建自定义代理

### 代理文件结构

在 `.claude/agents/` 目录下创建代理文件：

```markdown
---
name: frontend-expert
displayName: 前端专家
description: 专注于现代前端开发的专家代理
version: 1.0.0
avatar: 🎨
expertise:
  - React/Vue/Angular
  - TypeScript
  - CSS/Tailwind
  - 性能优化
  - 可访问性
triggers:
  - "@frontend"
  - "@fe"
---

# 前端专家代理

## 角色定义

你是一位资深前端开发专家，拥有 10+ 年的前端开发经验。
你精通现代前端框架、构建工具和最佳实践。

## 专业领域

### 框架与库
- React 18+ (Hooks, Server Components)
- Vue 3 (Composition API)
- Next.js / Nuxt.js
- 状态管理 (Redux, Zustand, Pinia)

### 样式与 UI
- Tailwind CSS
- CSS-in-JS (Styled Components, Emotion)
- 组件库 (Ant Design, Material UI)
- 响应式设计

### 工程化
- TypeScript 高级类型
- Webpack / Vite 配置
- 单元测试 (Jest, Vitest)
- E2E 测试 (Playwright, Cypress)

### 性能优化
- 代码分割与懒加载
- 虚拟列表
- 图片优化
- Core Web Vitals

## 工作原则

1. **用户体验优先**：始终考虑最终用户的体验
2. **可维护性**：编写清晰、可维护的代码
3. **性能意识**：关注性能，避免不必要的渲染
4. **可访问性**：确保应用对所有用户可用
5. **渐进增强**：从基础功能开始，逐步增强

## 响应格式

当回答问题时：

1. 先理解问题的上下文
2. 提供清晰的解决方案
3. 包含代码示例
4. 解释为什么这样做
5. 提供替代方案（如果有）

## 示例交互

**用户**: 如何优化 React 列表渲染性能？

**前端专家**:
针对 React 列表渲染优化，我建议以下方案：

1. **使用虚拟列表**
   ```tsx
   import { useVirtualizer } from '@tanstack/react-virtual';

   function VirtualList({ items }) {
     const parentRef = useRef(null);
     const virtualizer = useVirtualizer({
       count: items.length,
       getScrollElement: () => parentRef.current,
       estimateSize: () => 50,
     });
     // ...
   }
   ```

2. **React.memo 避免不必要渲染**
   ```tsx
   const ListItem = React.memo(({ item }) => (
     <div>{item.name}</div>
   ));
   ```

3. **使用稳定的 key**
   ```tsx
   {items.map(item => (
     <ListItem key={item.id} item={item} />
   ))}
   ```
```

### 注册代理

代理会自动被发现，也可以在配置中显式注册：

```json
{
  "agents": {
    "custom": [
      ".claude/agents/frontend-expert.md",
      ".claude/agents/backend-expert.md"
    ]
  }
}
```

## 代理配置

### 全局配置

在 `~/.ccjk/config.json` 中配置：

```json
{
  "agents": {
    "enabled": true,
    "defaultAgent": "developer",
    "autoDelegate": true,
    "maxConcurrent": 3,
    "timeout": 300000
  }
}
```

### 项目配置

在项目的 `.ccjk/config.json` 中覆盖：

```json
{
  "agents": {
    "preferred": ["frontend-expert", "reviewer"],
    "disabled": ["devops"],
    "customPrompts": {
      "reviewer": "重点关注 TypeScript 类型安全"
    }
  }
}
```

## 代理上下文

代理可以访问丰富的上下文：

### 项目上下文

```markdown
## 可用上下文

- 项目结构和文件列表
- package.json 依赖信息
- 配置文件内容
- Git 历史和当前状态
- 已有的代码规范
```

### 对话上下文

```markdown
## 对话历史

代理可以访问：
- 之前的对话内容
- 其他代理的输出
- 用户的偏好设置
- 任务进度状态
```

## 代理权限

控制代理的能力范围：

```markdown
---
name: safe-reviewer
permissions:
  file:
    read: true
    write: false
  shell:
    execute: false
  network:
    access: false
---
```

### 权限级别

| 权限 | 描述 | 默认 |
|------|------|------|
| `file:read` | 读取文件 | ✅ |
| `file:write` | 写入文件 | ✅ |
| `shell:execute` | 执行命令 | ⚠️ 需确认 |
| `network:access` | 网络访问 | ⚠️ 需确认 |
| `git:commit` | Git 提交 | ⚠️ 需确认 |

## 代理模板

### 审查代理模板

```markdown
---
name: custom-reviewer
extends: reviewer
---

# 自定义审查代理

## 额外关注点

除了标准代码审查，还需要：

1. **业务逻辑正确性**
   - 验证业务规则实现
   - 检查边界条件处理

2. **团队规范**
   - 命名规范：使用驼峰命名
   - 注释规范：关键逻辑必须注释
   - 文件组织：按功能模块组织

3. **特定检查项**
   - [ ] 是否有硬编码的配置
   - [ ] 是否正确处理错误
   - [ ] 是否有适当的日志
   - [ ] 是否考虑了并发情况
```

### 开发代理模板

```markdown
---
name: fullstack-developer
extends: developer
expertise:
  - Node.js
  - React
  - PostgreSQL
  - Docker
---

# 全栈开发代理

## 技术栈

- **前端**: React + TypeScript + Tailwind
- **后端**: Node.js + Express + Prisma
- **数据库**: PostgreSQL
- **部署**: Docker + Kubernetes

## 开发规范

### 代码风格
- 使用 ESLint + Prettier
- 遵循 Airbnb 风格指南
- 使用函数式组件和 Hooks

### 项目结构
```
src/
├── components/    # React 组件
├── pages/         # 页面组件
├── hooks/         # 自定义 Hooks
├── services/      # API 服务
├── utils/         # 工具函数
└── types/         # TypeScript 类型
```

### API 设计
- RESTful 风格
- 统一响应格式
- 适当的错误处理
```

## 调试代理

### 启用调试模式

```bash
export CCJK_AGENT_DEBUG=true
```

### 查看代理日志

```bash
# 查看所有代理活动
tail -f ~/.ccjk/logs/agents.log

# 查看特定代理
grep "@reviewer" ~/.ccjk/logs/agents.log
```

### 代理性能分析

```bash
# 查看代理响应时间
ccjk agent stats

# 输出示例
Agent Performance (Last 24h)
─────────────────────────────
@planner     avg: 2.3s   calls: 15
@reviewer    avg: 4.1s   calls: 28
@developer   avg: 3.8s   calls: 42
@security    avg: 5.2s   calls: 8
```

## 最佳实践

### 1. 选择合适的代理

```markdown
# ✅ 好的做法
@security 检查这个认证逻辑的安全性

# ❌ 不好的做法
@developer 检查这个认证逻辑的安全性
```

### 2. 提供足够上下文

```markdown
# ✅ 好的做法
@reviewer 请审查 src/auth/login.ts
这是用户登录模块，需要特别关注：
- 密码处理安全性
- 会话管理
- 错误信息是否泄露敏感信息

# ❌ 不好的做法
@reviewer 审查代码
```

### 3. 利用代理协作

```markdown
# ✅ 好的做法：让专业代理处理专业问题
1. @architect 设计整体方案
2. @security 审查安全设计
3. @developer 实现功能
4. @tester 验证实现

# ❌ 不好的做法：让一个代理做所有事
@developer 设计、实现、测试、部署这个功能
```

### 4. 迭代改进

```markdown
# 根据代理反馈迭代
@reviewer: 发现 3 个问题...

用户: @developer 请修复 @reviewer 提到的问题

@developer: 已修复，主要改动...

用户: @reviewer 请再次审查
```

## 相关资源

- [Skills 技能系统](skills.md) - 了解技能与代理的配合
- [Workflows 工作流](workflows.md) - 在工作流中使用代理
- [Hooks 系统](hooks.md) - 代理事件钩子
- [Subagent 编排](subagent.md) - 高级代理编排

> 💡 **提示**：代理是 CCJK 的核心能力之一。通过合理使用代理，你可以获得专业级的开发辅助，大幅提升开发效率和代码质量。

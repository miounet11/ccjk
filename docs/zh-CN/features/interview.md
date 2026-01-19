---
title: Interview 访谈驱动开发
---

# Interview 访谈驱动开发

Interview（访谈）是 CCJK 的智能需求收集系统，通过结构化的对话引导用户清晰表达需求，确保 AI 准确理解任务目标。

## 什么是访谈驱动开发？

访谈驱动开发（Interview-Driven Development）是一种以对话为核心的开发方法：

- 🎯 **精准理解**：通过提问确保准确理解用户意图
- 📋 **结构化收集**：系统化地收集所有必要信息
- 🔄 **迭代确认**：在开发前确认需求，避免返工
- 💡 **智能引导**：根据上下文提出相关问题

## 访谈模式

### 1. 快速访谈（Quick Interview）

适用于简单、明确的任务：

```
用户: /interview quick 添加一个用户登录功能

AI: 好的，让我快速了解几个关键点：

1️⃣ 登录方式？
   □ 用户名/密码
   □ 邮箱/密码
   □ 手机号/验证码
   □ 第三方登录（Google/GitHub）

2️⃣ 是否需要"记住我"功能？
   □ 是
   □ 否

3️⃣ 登录失败处理？
   □ 简单提示
   □ 限制尝试次数
   □ 验证码保护

用户: 邮箱密码，需要记住我，限制尝试次数

AI: 明白了！我将实现：
- 邮箱/密码登录
- "记住我"功能（7天有效）
- 5次失败后锁定15分钟

确认开始开发？[Y/n]
```

**特点**：
- ⏱️ 1-2 分钟完成
- 📝 3-5 个核心问题
- ✅ 适合小功能、Bug 修复

### 2. 标准访谈（Standard Interview）

适用于中等复杂度的功能：

```
用户: /interview 开发一个评论系统

AI: 好的，让我们详细了解评论系统的需求。

📋 第一部分：基本功能

Q1: 评论的层级结构？
    a) 单层评论（只能评论文章）
    b) 两层评论（可以回复评论）
    c) 多层嵌套（无限层级回复）

用户: b

Q2: 评论内容支持？
    a) 纯文本
    b) 富文本（加粗、斜体等）
    c) Markdown
    d) 支持图片/表情

用户: c 和 d

Q3: 评论排序方式？
    a) 时间顺序（最新/最早）
    b) 热度排序
    c) 用户可选择

用户: c

📋 第二部分：用户交互

Q4: 评论操作？
    □ 点赞/踩
    □ 举报
    □ 编辑（限时）
    □ 删除

用户: 全部都要

Q5: 通知机制？
    a) 无通知
    b) 站内通知
    c) 邮件通知
    d) 站内 + 邮件

用户: b

📋 第三部分：管理功能

Q6: 审核机制？
    a) 无审核，直接发布
    b) 先发后审
    c) 先审后发
    d) 敏感词过滤 + 先发后审

用户: d

AI: 完美！让我总结一下需求：

📝 评论系统需求规格
━━━━━━━━━━━━━━━━━━━━

功能结构:
  • 两层评论结构
  • 支持 Markdown + 图片/表情
  • 用户可选排序方式

用户交互:
  • 点赞/踩、举报、编辑、删除
  • 站内通知

管理功能:
  • 敏感词过滤
  • 先发后审机制

技术方案:
  • 数据库: 评论表 + 回复关联
  • API: RESTful 评论接口
  • 前端: React 评论组件

预计工作量: 3-4 天

确认开始开发？如需调整请告诉我。
```

**特点**：
- ⏱️ 5-10 分钟完成
- 📝 10-15 个问题，分模块
- ✅ 适合中等功能、新模块

### 3. 深度访谈（Deep Interview）

适用于复杂系统或新项目：

```
用户: /interview deep 开发一个电商平台

AI: 好的，这是一个复杂的项目，让我们进行深度访谈。
    预计需要 20-30 分钟，我们会覆盖所有关键方面。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 阶段 1/6: 项目概述
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q1: 请描述这个电商平台的核心定位？
    - 目标用户群体是谁？
    - 主要销售什么类型的商品？
    - 与竞品的主要差异点？

用户: B2C 平台，面向年轻人，主要卖潮牌服饰和配件，
      差异点是 AI 穿搭推荐和虚拟试衣

AI: 很有特色！AI 穿搭推荐是核心亮点。

Q2: 项目的时间规划？
    a) MVP（1-2个月）- 核心购物流程
    b) 标准版（3-4个月）- 完整功能
    c) 完整版（6个月+）- 包含 AI 功能

用户: b，但 AI 推荐要在 MVP 中

Q3: 技术栈偏好？
    前端: React / Vue / Next.js / 其他
    后端: Node.js / Python / Go / Java / 其他
    数据库: PostgreSQL / MySQL / MongoDB / 其他

用户: Next.js + Node.js + PostgreSQL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 阶段 2/6: 用户系统
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q4: 用户注册方式？（可多选）
    □ 邮箱注册
    □ 手机号注册
    □ 社交账号（微信/微博）
    □ Apple/Google 登录

用户: 手机号 + 微信

Q5: 用户等级体系？
    a) 无等级
    b) 简单等级（普通/VIP）
    c) 多级会员（青铜/白银/黄金/钻石）
    d) 积分 + 等级组合

用户: d

[... 继续更多问题 ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 阶段 6/6: 确认与规划
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI: 访谈完成！让我生成完整的需求文档...

📄 已生成文档:
  • PRD.md - 产品需求文档
  • TECH_SPEC.md - 技术规格说明
  • ROADMAP.md - 开发路线图
  • TASKS.md - 任务分解

是否需要我详细解释某个部分？或者开始第一阶段开发？
```

**特点**：
- ⏱️ 20-30 分钟完成
- 📝 30-50 个问题，分 6 个阶段
- ✅ 适合新项目、复杂系统

## 访谈模板

### 功能开发模板

```yaml
# .claude/interviews/feature.yaml
name: feature-interview
description: 功能开发访谈模板

sections:
  - id: overview
    name: 功能概述
    questions:
      - id: description
        question: 请描述这个功能的主要目的？
        type: text
        required: true

      - id: users
        question: 这个功能的目标用户是谁？
        type: text

      - id: priority
        question: 功能优先级？
        type: choice
        options:
          - P0 - 必须有
          - P1 - 应该有
          - P2 - 可以有

  - id: requirements
    name: 功能需求
    questions:
      - id: core_features
        question: 核心功能点有哪些？
        type: multiline
        required: true

      - id: edge_cases
        question: 需要考虑哪些边界情况？
        type: multiline

  - id: technical
    name: 技术考虑
    questions:
      - id: constraints
        question: 有什么技术限制或约束？
        type: text

      - id: dependencies
        question: 依赖哪些现有模块或服务？
        type: text

  - id: acceptance
    name: 验收标准
    questions:
      - id: criteria
        question: 功能完成的验收标准是什么？
        type: multiline
        required: true
```

### Bug 修复模板

```yaml
# .claude/interviews/bugfix.yaml
name: bugfix-interview
description: Bug 修复访谈模板

sections:
  - id: problem
    name: 问题描述
    questions:
      - id: symptom
        question: 问题的具体表现是什么？
        type: text
        required: true

      - id: reproduce
        question: 如何复现这个问题？
        type: multiline
        required: true

      - id: frequency
        question: 问题发生的频率？
        type: choice
        options:
          - 每次都发生
          - 经常发生
          - 偶尔发生
          - 难以复现

  - id: context
    name: 上下文信息
    questions:
      - id: when_started
        question: 问题是什么时候开始出现的？
        type: text

      - id: recent_changes
        question: 最近有什么相关的代码变更？
        type: text

      - id: affected_users
        question: 影响范围有多大？
        type: choice
        options:
          - 所有用户
          - 部分用户
          - 特定条件下的用户

  - id: investigation
    name: 已有调查
    questions:
      - id: tried_solutions
        question: 已经尝试过哪些解决方案？
        type: multiline

      - id: suspected_cause
        question: 怀疑的根本原因是什么？
        type: text
```

### 重构模板

```yaml
# .claude/interviews/refactor.yaml
name: refactor-interview
description: 代码重构访谈模板

sections:
  - id: motivation
    name: 重构动机
    questions:
      - id: why
        question: 为什么需要重构？
        type: multichoice
        options:
          - 代码难以理解
          - 性能问题
          - 难以添加新功能
          - 测试困难
          - 技术债务
          - 其他

      - id: pain_points
        question: 当前代码的主要痛点？
        type: multiline
        required: true

  - id: scope
    name: 重构范围
    questions:
      - id: files
        question: 涉及哪些文件或模块？
        type: text
        required: true

      - id: impact
        question: 重构会影响哪些功能？
        type: multiline

  - id: approach
    name: 重构方案
    questions:
      - id: strategy
        question: 期望的重构策略？
        type: choice
        options:
          - 渐进式重构（小步快跑）
          - 完全重写
          - 抽象层封装

      - id: constraints
        question: 有什么约束条件？
        type: multiline
```

## 智能问题生成

### 上下文感知

Interview 系统会根据上下文智能生成问题：

```
用户: /interview 添加支付功能

AI: 我注意到项目中已有以下相关代码：
    - src/models/Order.ts（订单模型）
    - src/api/checkout.ts（结账 API）
    - 使用 Stripe 的配置

基于现有代码，我有以下问题：

Q1: 是否复用现有的 Order 模型？
    a) 是，扩展现有模型
    b) 否，创建新的支付模型

Q2: 支付方式？（已检测到 Stripe 配置）
    □ Stripe 信用卡
    □ Stripe Apple Pay
    □ PayPal
    □ 支付宝/微信（需要新集成）

Q3: 现有 checkout API 需要修改吗？
    a) 扩展现有 API
    b) 创建独立的支付 API
```

### 领域知识

Interview 系统内置领域知识：

```
用户: /interview 添加用户认证

AI: 用户认证是安全关键功能，让我确认一些重要细节：

🔐 安全相关问题：

Q1: 密码策略？
    a) 基础（8位以上）
    b) 中等（8位+大小写+数字）
    c) 严格（12位+大小写+数字+特殊字符）
    d) 自定义规则

Q2: 多因素认证（MFA）？
    a) 不需要
    b) 可选（用户自行开启）
    c) 强制（所有用户）
    d) 条件强制（敏感操作时）

Q3: 会话管理？
    a) 单设备登录
    b) 多设备登录
    c) 多设备 + 设备管理

💡 安全建议：
   - 建议使用 bcrypt/argon2 加密密码
   - 建议实现登录失败锁定
   - 建议记录安全审计日志
```

## 访谈结果

### 需求文档生成

访谈完成后自动生成文档：

```markdown
# 功能需求文档

## 1. 概述

**功能名称**: 用户评论系统
**优先级**: P1
**预计工期**: 5 天

## 2. 功能描述

### 2.1 核心功能
- 两层评论结构（评论 + 回复）
- 支持 Markdown 格式
- 支持图片和表情

### 2.2 用户交互
- 点赞/踩
- 举报不当内容
- 编辑（发布后 30 分钟内）
- 删除自己的评论

### 2.3 通知机制
- 站内通知（有人回复时）

### 2.4 管理功能
- 敏感词自动过滤
- 先发后审机制

## 3. 技术方案

### 3.1 数据模型
```typescript
interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
  likes: number;
  dislikes: number;
  status: 'published' | 'pending' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 API 设计
- POST /api/comments - 创建评论
- GET /api/comments?postId=xxx - 获取评论列表
- PUT /api/comments/:id - 更新评论
- DELETE /api/comments/:id - 删除评论
- POST /api/comments/:id/like - 点赞
- POST /api/comments/:id/report - 举报

## 4. 验收标准

- [ ] 用户可以发表评论
- [ ] 用户可以回复评论
- [ ] 支持 Markdown 渲染
- [ ] 敏感词被正确过滤
- [ ] 通知功能正常工作
- [ ] 所有 API 有适当的错误处理
```

### 任务分解

```markdown
# 任务分解

## Sprint 1: 基础功能（2天）

### Task 1.1: 数据模型
- [ ] 创建 Comment 模型
- [ ] 创建数据库迁移
- [ ] 编写模型测试

### Task 1.2: 基础 API
- [ ] 实现 CRUD 接口
- [ ] 添加输入验证
- [ ] 编写 API 测试

## Sprint 2: 交互功能（2天）

### Task 2.1: 点赞/举报
- [ ] 实现点赞/踩功能
- [ ] 实现举报功能
- [ ] 防止重复操作

### Task 2.2: 通知系统
- [ ] 创建通知模型
- [ ] 实现通知触发
- [ ] 通知已读状态

## Sprint 3: 管理功能（1天）

### Task 3.1: 内容审核
- [ ] 敏感词过滤
- [ ] 审核队列
- [ ] 管理员操作
```

## 配置访谈

### 全局配置

```json
// ~/.ccjk/config.json
{
  "interview": {
    "defaultMode": "standard",
    "autoSuggest": true,
    "generateDocs": true,
    "language": "zh-CN",
    "templates": {
      "feature": ".claude/interviews/feature.yaml",
      "bugfix": ".claude/interviews/bugfix.yaml",
      "refactor": ".claude/interviews/refactor.yaml"
    }
  }
}
```

### 项目配置

```json
// .ccjk/config.json
{
  "interview": {
    "customTemplates": [
      ".claude/interviews/custom.yaml"
    ],
    "domainKnowledge": [
      "ecommerce",
      "payment"
    ],
    "outputDir": "./docs/requirements"
  }
}
```

## 最佳实践

### 1. 选择合适的访谈模式

```
简单任务（Bug 修复、小改动）→ 快速访谈
中等任务（新功能、模块）→ 标准访谈
复杂任务（新项目、系统重构）→ 深度访谈
```

### 2. 提供充分的上下文

```
# ✅ 好的做法
/interview 添加用户评论功能，类似于 GitHub Issues 的评论，
需要支持 Markdown，用户可以编辑和删除自己的评论

# ❌ 不好的做法
/interview 加个评论功能
```

### 3. 及时确认和调整

```
AI: 确认需求：支持 Markdown 评论...

用户: 等等，我还需要支持 @提及用户的功能

AI: 好的，让我补充几个问题：
    Q: @提及时是否发送通知？
    Q: 是否支持 @所有人？
```

### 4. 保存访谈结果

```bash
# 访谈结果会自动保存
ls .claude/interviews/
  2024-01-10-comment-system.md
  2024-01-08-payment-feature.md

# 可以基于历史访谈继续
/interview --continue 2024-01-10-comment-system
```

## 相关资源

- [Skills 技能系统](skills.md) - 访谈相关技能
- [Workflows 工作流](workflows.md) - 访谈驱动的工作流
- [Agents 代理系统](../advanced/agents.md) - PM 代理详情
- [配置管理](../advanced/configuration.md) - 访谈配置

> 💡 **提示**：好的需求是成功的一半。通过 Interview 系统，你可以确保 AI 准确理解你的需求，避免因误解导致的返工。

# Miaoda 后端客户端对接文档（完整版）

> 面向 Web / 桌面端 / IDE 插件客户端开发。
> 本文档以当前代码实现为准，覆盖所有已挂载路由与真实鉴权行为。

---

## 1. 基础信息

**Base URL**

```
http://<host>:<port>/api/v1
```

默认端口：`3000`

**认证方式**

需要认证的接口通过 HTTP Header 传递 Access Token：

```
Authorization: Bearer <accessToken>
```

Access Token 有效期 900 秒（15 分钟），过期后用 Refresh Token 换取新令牌。

---

## 2. 全局约定

### 2.1 鉴权

| 标记 | 含义 |
|------|------|
| 无鉴权 | 无需 Authorization header |
| `authenticate` | 需要有效 JWT Access Token |
| `optionalAuthenticate` | 有 token 则使用，无 token 也可访问 |
| `authenticate + requireAdmin` | 需要 JWT 且用户具有 admin 角色 |

### 2.2 鉴权与角色模型

- 套餐（plan）：`free` / `pro` / `business`，不存在 `enterprise`
- 角色（role）：普通用户 / admin，存储在 JWT payload 中
- API Key 鉴权：格式 `mda_<64位hex>`，通过 `Authorization: Bearer mda_...` 或 `X-API-Key: mda_...` 传递

### 2.3 限流

- `authLimiter`：注册、登录、密码重置接口有独立限流
- LLM 配额：free=50次/30天，pro=500次/30天，business=不限量
- 超限返回 `429`，LLM 接口超配额返回 `{ error: "Quota exceeded...", quotaInfo: { allowed, remaining, limit, resetAt } }`

### 2.4 响应格式（重要）

不同模块响应结构不同，客户端必须做兼容处理：

| 格式 | 结构 | 涉及模块 |
|------|------|----------|
| 格式 1（成功） | `{ success: true, data: {} }` | auth, user, config, admin, webhook, spec, workspace, analytics |
| 格式 2（失败） | `{ success: false, error: { message: "..." } }` | 上述模块的错误响应 |
| 格式 3 | `{ data: {} }`（无 success 字段） | usage, license, skill |
| 格式 4 | 裸对象（直接返回业务数据） | subscription, llm, storage |
| 格式 5（裸错误） | `{ error: "..." }` 或 `{ success: false, message, error }` | 裸对象模块的错误 |

---

## 3. 推荐客户端接入流程

```
1. GET /health                    → 确认服务可用
2. POST /auth/register 或 /auth/login → 获取 accessToken + refreshToken
3. GET /llm/models                → 获取可用模型列表（13个）
4. GET /user/profile              → 获取用户信息和套餐
5. GET /usage/current             → 获取当前配额状态
6. POST /llm/complete 或 /llm/stream → 发起 LLM 请求
7. POST /auth/refresh             → token 过期前刷新（expiresIn=900s）
```

---

## 4. 认证模块（Auth）

所有 Auth 路由均无需认证。

### 4.1 注册

```
POST /auth/register
```

受 authLimiter 限流。密码要求：至少 8 位，包含大写字母、小写字母和数字。

请求体：

```json
{
  "email": "user@example.com",
  "password": "MyPass123"
}
```

响应 `201`：

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
      "expiresIn": 900
    },
    "user": {
      "id": 1,
      "email": "user@example.com",
      "plan": "free",
      "emailVerified": false,
      "createdAt": "2026-02-25T10:00:00.000Z"
    }
  }
}
```

### 4.2 登录

```
POST /auth/login
```

受 authLimiter 限流。请求体与注册相同，响应 `200` 结构与注册相同。

### 4.3 邮箱验证

```
GET /auth/verify-email?token=<token>
```

响应 `200`：

```json
{ "success": true, "message": "Email verified successfully" }
```

### 4.4 请求密码重置

```
POST /auth/request-password-reset
```

受 authLimiter 限流。

请求体：`{ "email": "user@example.com" }`

响应 `200`：

```json
{ "success": true, "message": "If the email exists, a password reset link has been sent" }
```

### 4.5 重置密码

```
POST /auth/reset-password
```

> 注意：字段名是 `newPassword`，不是 `password`。

请求体：

```json
{
  "token": "reset-token-string",
  "newPassword": "NewPass456"
}
```

响应 `200`：`{ "success": true, "message": "Password reset successfully" }`

### 4.6 刷新令牌

```
POST /auth/refresh
```

请求体：`{ "refreshToken": "dGhpcyBpcyBhIHJlZnJl..." }`

响应 `200`：

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9r...",
    "expiresIn": 900
  }
}
```

### 4.7 OAuth 登录

```
GET /auth/oauth/:provider          # 发起授权跳转
GET /auth/oauth/:provider/callback # OAuth 回调
```

支持 provider：`github` / `google` / `microsoft`

回调响应 `200`：结构与注册响应相同（含 tokens + user）。

---

## 5. 配置模块（Config）

### 5.1 获取模型配置列表

```
GET /config/models
```

可选认证（optionalAuthenticate）。

Query 参数（可选）：`membership=free|pro|business`

> 注意：此接口仅返回 `provider === 'coco-fast'` 且在公共白名单中的模型，用于展示平台默认配置。获取全部可用模型请用 `GET /llm/models`。

响应 `200`：

```json
{
  "success": true,
  "data": [ { "id": 1, "model": "coco-fast", "provider": "coco-fast", ... } ],
  "meta": { "count": 1, "membership": "free" }
}
```

### 5.2 获取单个模型配置

```
GET /config/models/:id
```

无需认证。响应 `200`：`{ "success": true, "data": { ... } }`

---

## 6. 用户模块（User）

所有接口需要 `authenticate`。

### 6.1 获取用户资料

```
GET /user/profile
```

响应 `200`：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "plan": "free",
    "emailVerified": true,
    "createdAt": "2026-02-25T10:00:00.000Z"
  }
}
```

### 6.2 保存用户配置

```
POST /user/config
```

请求体：

```json
{
  "theme": "dark",
  "fontSize": 14,
  "models": ["coco-fast", "gpt-4o"],
  "customSettings": { "language": "zh-CN" }
}
```

响应 `200`：`{ "success": true, "data": { ...config }, "message": "Configuration saved successfully" }`

### 6.3 获取用户配置

```
GET /user/config
```

响应 `200`：`{ "success": true, "data": { ...config } }`，无配置时 `data` 为 `{}`。

### 6.4 删除用户配置

```
DELETE /user/config
```

响应 `200`：`{ "success": true, "message": "Configuration deleted successfully" }`

---

## 7. LLM 模块

所有接口需要 `authenticate`。

### 7.1 获取可用模型列表

```
GET /llm/models
```

响应 `200`（裸对象）：

```json
{
  "plan": "free",
  "models": [
    "coco-fast",
    "Claude Opus 4.6",
    "Claude Sonnet 4.6",
    "Claude Haiku 4.5",
    "Claude Opus 4.5",
    "Claude Sonnet 4.5",
    "Claude Sonnet 4",
    "gpt-3.5-turbo",
    "gpt-4o-mini",
    "gpt-4o",
    "claude-3-5-haiku-20241022",
    "claude-3-5-sonnet-20241022",
    "claude-opus-4-20250514"
  ]
}
```

所有套餐返回相同的 13 个模型，套餐差异体现在路由和配额上。

### 7.2 文本补全

```
POST /llm/complete
```

请求体：

```json
{
  "model": "auto",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ],
  "maxTokens": 1024,
  "temperature": 0.7
}
```

`maxTokens` 和 `temperature` 可选。

响应 `200`（裸对象）：

```json
{
  "content": "Hello! How can I help you?",
  "model": "coco-fast",
  "usage": {
    "promptTokens": 20,
    "completionTokens": 8,
    "totalTokens": 28
  }
}
```

配额超限响应：

```json
{
  "error": "Quota exceeded. You have used all your allowed requests for this billing period.",
  "quotaInfo": {
    "allowed": 50,
    "remaining": 0,
    "limit": 50,
    "resetAt": "2026-03-25T00:00:00.000Z"
  }
}
```

### 7.3 流式补全（SSE）

```
POST /llm/stream
```

请求体与 `/llm/complete` 相同。响应为 Server-Sent Events 流：

```
data: {"chunk":"Hello"}

data: {"chunk":"! How can"}

data: {"chunk":" I help you?"}

data: {"done":true}
```

错误事件：`data: {"error":"Quota exceeded"}`

### 7.4 模型路由规则

| model 值 | 路由行为 |
|----------|----------|
| `"auto"` 或 `"smart"` | ModelSelectorService 按任务类型自动路由（见下表） |
| `"coco-fast"` | 走 coco-fast 聚合器 |
| `"claude-*"` | 直接调用 Anthropic API |
| `"gpt-*"` | 直接调用 OpenAI API |

**auto/smart 路由策略：**

| 套餐 | 路由目标 |
|------|----------|
| free | 全部路由到 coco-fast |
| pro | 按任务类型路由到 haiku / sonnet / opus |
| business | 按任务类型路由到最高性能模型 |

任务类型分类：`simple-completion`、`code-generation`、`code-review`、`debugging`、`reasoning`、`architecture`、`documentation`、`general`

### 7.5 配额限制

| 套餐 | 配额 | 周期 |
|------|------|------|
| free | 50 次 | 30 天 |
| pro | 500 次 | 30 天 |
| business | 不限量 | — |

---

## 8. 订阅模块（Subscriptions）

响应格式为裸对象，不含 `success` 包装。

### 8.1 Stripe Webhook

```
POST /subscriptions/webhook
```

无需认证。需要 `stripe-signature` header 和原始 body。由 Stripe 服务端回调，客户端无需直接调用。

处理的事件：`checkout.session.completed`、`invoice.paid`、`invoice.payment_failed`、`customer.subscription.updated`、`customer.subscription.deleted`

### 8.2 创建订阅

```
POST /subscriptions/create
```

需要 `authenticate`。

请求体：

```json
{
  "plan": "pro",
  "billingCycle": "monthly",
  "paymentMethodId": "pm_1234567890"
}
```

`plan`：`pro` / `business`；`billingCycle`：`monthly` / `yearly`

响应 `200`（裸对象）：subscription 数据对象。

### 8.3 取消订阅

```
POST /subscriptions/cancel
```

需要 `authenticate`。

请求体：`{ "immediate": false }`

`immediate=true` 立即取消，`false` 在当前计费周期结束后取消。

响应 `200`：`{ "success": true }`

### 8.4 变更套餐

```
POST /subscriptions/change-plan
```

需要 `authenticate`。

请求体：`{ "newPlan": "business", "newBillingCycle": "yearly" }`

响应 `200`（裸对象）：更新后的 subscription 数据。

### 8.5 查询当前订阅

```
GET /subscriptions
```

需要 `authenticate`。

响应 `200`（裸对象）：subscription 数据。

错误 `404`：`{ "error": "Subscription not found" }`

---

## 9. 用量模块（Usage）

所有接口需要 `authenticate`。响应格式为 `{ data: {} }`，无 `success` 字段。

### 9.1 获取用量摘要

```
GET /usage/summary
```

默认返回当前月份数据。响应 `200`：`{ "data": { ...summary } }`

### 9.2 获取当前周期实时用量

```
GET /usage/current
```

从 Redis 读取实时数据。响应 `200`：`{ "data": { ...usage } }`

### 9.3 获取系统用量（管理员）

```
GET /usage/system
```

需要 `authenticate + requireAdmin`。响应 `200`：`{ "data": { ...systemSummary } }`

---

## 10. License 模块

响应格式为 `{ data: {} }`，无 `success` 字段。

### 10.1 验证许可证

```
POST /licenses/verify
```

无需认证。

请求体：

```json
{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "deviceFingerprint": "a1b2c3d4e5f6..."
}
```

响应 `200`：

```json
{
  "data": {
    "status": "valid",
    "plan": "pro",
    "features": ["llm:write", "llm:read", "skills:write"],
    "maxDevices": 5,
    "currentDevices": 2,
    "offlineGracePeriod": 72
  }
}
```

`status` 取值：`valid` / `invalid` / `expired`

### 10.2 获取当前用户许可证

```
GET /licenses
```

需要 `authenticate`。响应 `200`：`{ "data": { ...license } }`，404：`{ "error": "License not found" }`

### 10.3 获取已绑定设备列表

```
GET /licenses/devices
```

需要 `authenticate`。响应 `200`：`{ "data": [ ...devices ] }`

### 10.4 解绑设备

```
DELETE /licenses/devices/:fingerprint
```

需要 `authenticate`。响应 `200`：`{ "message": "Device unbound successfully" }`

---

## 11. Skills 模块

响应格式为 `{ data: {} }`，无 `success` 字段。

### 11.1 发布技能包

```
POST /skills/publish
```

需要 `authenticate`，且套餐为 `pro` 或 `business`（free 用户返回 403）。

Content-Type：`multipart/form-data`

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `package` | file | 是 | 最大 50MB |
| `name` | string | 是 | 3–100 字符 |
| `description` | string | 是 | 10–1000 字符 |
| `version` | string | 是 | semver，如 `1.0.0` |
| `category` | string | 是 | `general` \| `productivity` \| `development` \| `utility` \| `other` |

响应 `201`：`{ "data": { id, name, version, category, status: "pending", ... } }`

### 11.2 审批技能包

```
POST /skills/:id/approve
```

需要 `authenticate + requireAdmin`。响应 `200`：`{ "message": "Skill approved successfully" }`

### 11.3 搜索技能包

```
GET /skills/search
```

无需认证。Query 参数：`keyword?`、`category?`、`page?`（默认1）、`limit?`（默认20，最大100）

响应 `200`：`{ "data": { skills: [...], total, page, limit } }`

### 11.4 获取下载链接

```
GET /skills/:id/download
```

需要 `authenticate`。响应 `200`：`{ "data": { "downloadUrl": "https://..." } }`

### 11.5 评价技能包

```
POST /skills/:id/review
```

需要 `authenticate`。

请求体：`{ "rating": 5, "comment": "..." }`（rating 1-5，comment 最大500字符）

响应 `201`：`{ "data": { id, skillId, userId, rating, comment, createdAt } }`

---

## 12. API Key 模块

所有接口挂载在 `/user` 路径下，需要 `authenticate`，响应格式 `{ success, data }`。

### 12.1 创建 API Key

```
POST /user/api-keys
```

请求体：

```json
{
  "name": "CI/CD Pipeline Key",
  "scopes": ["llm:write", "llm:read", "usage:read"],
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

可用 scopes：`llm:write`、`llm:read`、`usage:read`、`user:read`、`skills:read`、`skills:write`

响应 `201`：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "keyPrefix": "mda_3f8a",
    "name": "CI/CD Pipeline Key",
    "scopes": ["llm:write", "llm:read", "usage:read"],
    "expiresAt": "2027-01-01T00:00:00.000Z",
    "revoked": false,
    "createdAt": "2026-02-25T10:00:00.000Z",
    "rawKey": "mda_3f8a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a"
  }
}
```

> `rawKey` 仅在创建时返回一次，请妥善保存。

### 12.2 获取 API Key 列表

```
GET /user/api-keys
```

响应 `200`：`{ "success": true, "data": [...] }`，不含 `rawKey`。

### 12.3 删除 API Key

```
DELETE /user/api-keys/:id
```

响应 `200`：`{ "success": true, "message": "API key deleted successfully" }`

### 12.4 使用 API Key

API Key 格式 `mda_<64位hex>`，两种传递方式：

```
Authorization: Bearer mda_3f8a...
```

或：

```
X-API-Key: mda_3f8a...
```

---

## 13. Workspace 模块

所有接口需要 `authenticate`，响应格式 `{ success, data }`。

### 13.1 创建工作空间

```
POST /workspaces
```

请求体：`{ "name": "Engineering Team" }`

响应 `201`：`{ "success": true, "data": { id, name, slug, ownerId, plan, createdAt } }`

### 13.2 获取工作空间列表

```
GET /workspaces
```

响应 `200`：`{ "success": true, "data": [...] }`

### 13.3 获取工作空间详情

```
GET /workspaces/:id
```

响应 `200`：`{ "success": true, "data": { ...workspace } }`

### 13.4 删除工作空间

```
DELETE /workspaces/:id
```

仅 owner 可操作。响应 `200`：`{ "success": true, "message": "Workspace deleted successfully" }`

### 13.5 获取成员列表

```
GET /workspaces/:id/members
```

响应 `200`：`{ "success": true, "data": [ { userId, email, role, joinedAt } ] }`

### 13.6 添加成员

```
POST /workspaces/:id/members
```

请求体：`{ "email": "member@example.com", "role": "member" }`（role：`member` / `admin`）

响应 `201`：`{ "success": true, "data": { ...member } }`

### 13.7 移除成员

```
DELETE /workspaces/:id/members/:userId
```

响应 `200`：`{ "success": true, "message": "Member removed successfully" }`

---

## 14. Spec 模块

所有接口需要 `authenticate`，响应格式 `{ success, data }`。

### 14.1 创建 Spec

```
POST /specs
```

请求体：

```json
{
  "title": "User Authentication System",
  "requirements": "Implement JWT-based authentication...",
  "workspaceId": "ws_abc123"
}
```

`workspaceId` 可选。响应 `201`：`{ "success": true, "data": { id, title, requirements, design: null, status: "draft", tasks: [], ... } }`

### 14.2 获取 Spec 列表

```
GET /specs
```

响应 `200`：`{ "success": true, "data": [...] }`

### 14.3 获取 Spec 详情

```
GET /specs/:id
```

响应 `200`：`{ "success": true, "data": { ...spec, tasks: [...] } }`

### 14.4 生成设计方案

```
POST /specs/:id/generate-design
```

消耗 LLM 配额。响应 `200`：`{ "success": true, "data": { ...spec, design: "...", status: "designing" } }`

### 14.5 生成任务列表

```
POST /specs/:id/generate-tasks
```

消耗 LLM 配额。响应 `200`：`{ "success": true, "data": { ...spec, tasks: [...], status: "in_progress" } }`

### 14.6 更新任务状态

```
PATCH /specs/:id/tasks/:taskId
```

请求体：`{ "status": "completed" }`

`status` 取值：`pending` / `in_progress` / `completed` / `blocked`

> 当所有任务均为 `completed` 时，Spec 状态自动变为 `completed`。

响应 `200`：`{ "success": true, "data": { ...spec } }`

---

## 15. Webhook 模块

所有接口需要 `authenticate`，响应格式 `{ success, data }`。

### 15.1 可订阅事件

| 事件 | 触发时机 |
|------|----------|
| `quota.warning` | 配额使用接近上限 |
| `quota.exceeded` | 配额超出上限 |
| `subscription.changed` | 订阅套餐变更 |
| `subscription.cancelled` | 订阅取消 |
| `spec.completed` | Spec 所有任务完成 |
| `spec.task.completed` | Spec 中某个任务完成 |

### 15.2 Payload 签名验证

每个 Webhook 请求包含签名头：

```
X-Miaoda-Signature: sha256=<HMAC-SHA256>
```

验证示例（Node.js）：

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 15.3 创建 Webhook 端点

```
POST /webhooks
```

请求体：`{ "url": "https://example.com/webhooks/miaoda", "events": ["quota.warning", "spec.completed"] }`

响应 `201`：`{ "success": true, "data": { id, url, events, active: true, secret: "whsec_...", createdAt } }`

### 15.4 获取 Webhook 列表

```
GET /webhooks
```

响应 `200`：`{ "success": true, "data": [...] }`

### 15.5 删除 Webhook

```
DELETE /webhooks/:id
```

响应 `200`：`{ "success": true, "message": "Webhook endpoint deleted" }`，404 时抛出 AppError。

---

## 16. Admin 模块

所有接口需要 `authenticate + requireAdmin`，响应格式 `{ success, data }`。

### 16.1 获取用户列表

```
GET /admin/users
```

Query 参数：`page?`、`limit?`

响应 `200`：

```json
{
  "success": true,
  "data": [ { "id": 1, "email": "...", "plan": "free" } ],
  "meta": { "total": 1500, "page": 1, "limit": 20 }
}
```

### 16.2 获取用户详情

```
GET /admin/users/:id
```

响应 `200`：`{ "success": true, "data": { user: {...}, usage: [...] } }`

### 16.3 修改用户套餐

```
POST /admin/users/:id/plan
```

请求体：`{ "plan": "pro" }`（`free` / `pro` / `business`）

响应 `200`：`{ "success": true, "message": "User plan updated to pro" }`

### 16.4 修改用户角色（stub）

```
POST /admin/users/:id/roles
```

> **当前为 stub 接口，不实际修改角色。** 角色存储在 JWT 中，需在数据库层面修改后让用户重新登录获取新 token。

响应 `200`：`{ "success": true, "message": "Role management requires JWT re-issue. Update user roles in DB and ask user to re-login." }`

### 16.5 获取系统指标

```
GET /admin/metrics
```

响应 `200`：

```json
{
  "success": true,
  "data": {
    "users": { "total": 1500, "free_count": 1200, "pro_count": 250, "business_count": 50, "new_last_30d": 120 },
    "usage": { "total_tokens": 5000000, "total_requests": 45000, "tokens_24h": 150000, "requests_24h": 1200 },
    "subscriptions": { "active_subscriptions": 300 }
  }
}
```

### 16.6 获取待审批技能包

```
GET /admin/skills/pending
```

响应 `200`：`{ "success": true, "data": [...] }`

### 16.7 拒绝技能包

```
POST /admin/skills/:id/reject
```

请求体：`{ "reason": "违反内容政策" }`（可选）

响应 `200`：`{ "success": true, "message": "Skill rejected: 违反内容政策" }`

---

## 17. Analytics 模块

所有接口需要 `authenticate`，响应格式 `{ success, data }`。

### 17.1 费用明细

```
GET /analytics/cost-breakdown
```

Query 参数：`start?`（ISO日期）、`end?`（ISO日期），默认当月。

响应 `200`：

```json
{
  "success": true,
  "data": {
    "breakdown": [
      { "model": "coco-fast", "provider": "coco-fast", "requests": 30, "promptTokens": 15000, "completionTokens": 8000, "totalTokens": 23000, "costUsd": 0.0023 }
    ],
    "totals": { "costUsd": 0.0023, "tokens": 23000, "requests": 30 },
    "period": { "start": "2026-02-01T00:00:00.000Z", "end": "2026-02-25T10:00:00.000Z" }
  }
}
```

### 17.2 用量预测

```
GET /analytics/forecast
```

响应 `200`：

```json
{
  "success": true,
  "data": {
    "currentUsage": 35,
    "projectedMonthly": 47,
    "projectedCostUsd": 0.0031,
    "daysRemaining": 3,
    "percentOfMonth": 89
  }
}
```

### 17.3 每日用量

```
GET /analytics/daily
```

Query 参数：`days?`（默认30，最大90）

响应 `200`：`{ "success": true, "data": [ { "date": "2026-02-24", "tokens": 1200, "costUsd": 0.0001, "requests": 5 } ] }`

### 17.4 路由历史

```
GET /analytics/routing-history
```

Query 参数：`limit?`（默认50，最大100）、`offset?`（默认0）

响应 `200`：`{ "success": true, "data": [ ...routing_audit_logs ] }`

---

## 18. Storage 模块

所有接口需要 `authenticate`，响应为裸对象，失败返回 `{ success: false, message, error }`。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/storage/stats` | 存储统计 |
| GET | `/storage/monitor` | 存储监控 |
| POST | `/storage/compress` | 压缩存储，可选 `{ dryRun: true }` |
| POST | `/storage/cleanup` | 清理存储 |
| GET | `/storage/cleanup-stats` | 清理统计 |
| GET | `/storage/snapshots` | 快照列表 |
| POST | `/storage/snapshots/:snapshotId/extract` | 解压快照，必传 `{ targetDir: "..." }` |
| DELETE | `/storage/snapshots/:snapshotId` | 删除快照 |
| POST | `/storage/snapshots/:snapshotId/verify` | 验证快照 |
| GET | `/storage/history` | 操作历史 |
| GET | `/storage/config` | 获取存储配置 |
| PUT | `/storage/config` | 更新存储配置 |

---

## 19. Health 模块

```
GET /health
```

无需认证。

响应 `200`：

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-25T10:00:00.000Z",
    "uptime": 86400,
    "environment": "production",
    "database": "connected",
    "memory": { "used": 128, "total": 256, "unit": "MB" }
  }
}
```

服务不可用时响应 `503`：`{ "success": false, "error": { "message": "Service unhealthy", "details": "..." } }`

---

## 20. 客户端错误处理建议

### 20.1 状态码策略

| 状态码 | 含义 | 客户端处理策略 |
|--------|------|----------------|
| `400` | 参数错误 | 解析 `error.message` 或 `message`，就近展示错误提示 |
| `401` | 未登录或 token 无效 | 清理本地登录态，跳转登录页 |
| `403` | 权限不足 | 区分套餐限制（引导升级）和 admin 角色限制（提示无权限） |
| `404` | 资源不存在 | 展示友好提示，避免重试 |
| `429` | 限流 / 配额超限 | 展示提示，提供重试倒计时或升级引导 |
| `5xx` | 服务异常 | 展示通用错误页，提供"稍后重试"按钮 |

建议在 HTTP 客户端层统一拦截：

```typescript
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    switch (status) {
      case 401:
        tokenStore.clear();
        router.push('/login');
        break;
      case 403:
        const body = error.response?.data;
        if (body?.error?.message?.includes('plan') || body?.message?.includes('plan')) {
          router.push('/upgrade');
        } else {
          notify.error('权限不足，无法执行此操作');
        }
        break;
      case 429:
        notify.warning('请求过于频繁，请稍后重试');
        break;
      case 500: case 502: case 503:
        notify.error('服务暂时不可用，请稍后重试');
        break;
    }
    return Promise.reject(error);
  }
);
```

### 20.2 兼容性解析器

```typescript
interface ParsedResponse<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

function parseResponse<T = any>(raw: any): ParsedResponse<T> {
  if (raw?.success === false && raw?.error?.message)
    return { ok: false, data: null, error: raw.error.message };
  if (raw?.success === false && (raw?.message || raw?.error))
    return { ok: false, data: null, error: raw.message || raw.error };
  if (typeof raw?.error === 'string' && !('data' in raw) && !('success' in raw))
    return { ok: false, data: null, error: raw.error };
  if (raw?.success === true && 'data' in raw)
    return { ok: true, data: raw.data as T, error: null };
  if ('data' in raw && !('success' in raw))
    return { ok: true, data: raw.data as T, error: null };
  return { ok: true, data: raw as T, error: null };
}
```

---

## 21. TypeScript 客户端封装示例

```typescript
class MiaodaClient {
  private baseUrl: string;
  private token: string | null = null;
  private onUnauthorized?: () => void;

  constructor(config: { baseUrl: string; token?: string; onUnauthorized?: () => void }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token ?? null;
    this.onUnauthorized = config.onUnauthorized;
  }

  private parseResponse<T>(raw: any): { ok: boolean; data: T | null; error: string | null } {
    if (raw?.success === false && raw?.error?.message) return { ok: false, data: null, error: raw.error.message };
    if (raw?.success === false && (raw?.message || raw?.error)) return { ok: false, data: null, error: raw.message || raw.error };
    if (typeof raw?.error === 'string' && !('data' in raw) && !('success' in raw)) return { ok: false, data: null, error: raw.error };
    if (raw?.success === true && 'data' in raw) return { ok: true, data: raw.data as T, error: null };
    if ('data' in raw && !('success' in raw)) return { ok: true, data: raw.data as T, error: null };
    return { ok: true, data: raw as T, error: null };
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(method: string, path: string, body?: any) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method, headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { this.token = null; this.onUnauthorized?.(); return { ok: false, data: null, error: 'Unauthorized' }; }
    return this.parseResponse<T>(await res.json());
  }

  async login(email: string, password: string) {
    const res = await this.request<any>('POST', '/api/v1/auth/login', { email, password });
    if (res.ok && res.data?.tokens?.accessToken) this.token = res.data.tokens.accessToken;
    return res;
  }

  async register(email: string, password: string) {
    const res = await this.request<any>('POST', '/api/v1/auth/register', { email, password });
    if (res.ok && res.data?.tokens?.accessToken) this.token = res.data.tokens.accessToken;
    return res;
  }

  async refreshToken(refreshToken: string) {
    const res = await this.request<any>('POST', '/api/v1/auth/refresh', { refreshToken });
    if (res.ok && res.data?.accessToken) this.token = res.data.accessToken;
    return res;
  }

  profile() { return this.request<any>('GET', '/api/v1/user/profile'); }
  getModels() { return this.request<any>('GET', '/api/v1/llm/models'); }

  complete(model: string, messages: Array<{ role: string; content: string }>, options?: { maxTokens?: number; temperature?: number }) {
    return this.request<any>('POST', '/api/v1/llm/complete', { model, messages, ...options });
  }

  stream(
    model: string,
    messages: Array<{ role: string; content: string }>,
    callbacks: { onChunk: (chunk: string) => void; onDone?: () => void; onError?: (err: Error) => void },
    options?: { maxTokens?: number; temperature?: number }
  ): AbortController {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/llm/stream`, {
          method: 'POST',
          headers: this.headers({ Accept: 'text/event-stream' }),
          body: JSON.stringify({ model, messages, ...options }),
          signal: controller.signal,
        });
        if (res.status === 401) { this.token = null; this.onUnauthorized?.(); callbacks.onError?.(new Error('Unauthorized')); return; }
        if (!res.ok) { callbacks.onError?.(new Error(`HTTP ${res.status}`)); return; }
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const json = JSON.parse(line.slice(6));
              if (json.done) { callbacks.onDone?.(); return; }
              if (json.error) { callbacks.onError?.(new Error(json.error)); return; }
              if (json.chunk) callbacks.onChunk(json.chunk);
            } catch {}
          }
        }
        callbacks.onDone?.();
      } catch (err: any) {
        if (err.name !== 'AbortError') callbacks.onError?.(err);
        else callbacks.onDone?.();
      }
    })();
    return controller;
  }

  getApiKeys() { return this.request<any>('GET', '/api/v1/user/api-keys'); }
  createApiKey(name: string, scopes: string[], expiresAt?: string) {
    return this.request<any>('POST', '/api/v1/user/api-keys', { name, scopes, expiresAt });
  }
  revokeApiKey(id: number) { return this.request<any>('DELETE', `/api/v1/user/api-keys/${id}`); }

  getUsageSummary() { return this.request<any>('GET', '/api/v1/usage/summary'); }
  getCurrentUsage() { return this.request<any>('GET', '/api/v1/usage/current'); }

  getCostBreakdown(start?: string, end?: string) {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    return this.request<any>('GET', `/api/v1/analytics/cost-breakdown${q.toString() ? '?' + q : ''}`);
  }
  getForecast() { return this.request<any>('GET', '/api/v1/analytics/forecast'); }
  getDailyUsage(days = 30) { return this.request<any>('GET', `/api/v1/analytics/daily?days=${days}`); }
  getRoutingHistory(limit = 50, offset = 0) {
    return this.request<any>('GET', `/api/v1/analytics/routing-history?limit=${limit}&offset=${offset}`);
  }
}
```

使用示例：

```typescript
const client = new MiaodaClient({
  baseUrl: 'https://api.miaoda.io',
  onUnauthorized: () => window.location.href = '/login',
});

await client.login('user@example.com', 'MyPass123');

const res = await client.complete('auto', [{ role: 'user', content: '用 Python 写快速排序' }]);
console.log(res.data?.content);

const ctrl = client.stream('auto', [{ role: 'user', content: '解释 TCP 三次握手' }], {
  onChunk: (chunk) => process.stdout.write(chunk),
  onDone: () => console.log('\n[完成]'),
  onError: (err) => console.error(err),
});
// ctrl.abort() 可中断
```

---

## 22. 上线前核对清单（客户端）

- [ ] Auth 全链路：注册 → 登录 → token 存储 → 自动刷新 → 登出清理
- [ ] 全局 401 拦截：清理登录态并跳转登录页
- [ ] 403 处理：区分套餐限制（引导升级）和角色限制（提示无权限）
- [ ] 429 处理：展示友好提示，提供重试倒计时或升级引导
- [ ] 5xx 处理：展示通用错误页，不暴露技术细节
- [ ] 响应兼容层：覆盖全部 5 种响应格式
- [ ] `POST /auth/reset-password` 请求体字段名确认为 `newPassword`
- [ ] LLM 模型路由：`auto`/`smart` 走服务端智能路由，指定模型名直接调用对应 provider
- [ ] SSE 流式：正确解析 `{"done":true}` 终止信号，处理 AbortController 中断
- [ ] SSE 异常恢复：流中断时 UI 不卡死，展示已接收内容并提示重试
- [ ] 模型列表：调用 `GET /llm/models` 获取，不硬编码（共 13 个）
- [ ] `GET /config/models` 与 `GET /llm/models` 用途区分（前者仅 coco-fast 白名单）
- [ ] API Key 管理：创建、列表、删除全流程验证，`rawKey` 仅创建时返回
- [ ] Usage 模块：summary、current 联调通过
- [ ] Analytics 模块：cost-breakdown、forecast、daily、routing-history 四个接口联调通过
- [ ] Skills 发布权限：free 用户收到 403 时展示升级引导
- [ ] 套餐名称：全局使用 `free`/`pro`/`business`，不存在 `enterprise`
- [ ] Token 刷新：在 token 过期前主动调用 `POST /auth/refresh`
- [ ] 网络超时：普通请求 15s，LLM 补全 120s，流式无硬超时
- [ ] 输入校验：客户端做基本校验（邮箱格式、密码长度、必填项）

---

## 23. 当前实现注意事项（避免踩坑）

**23.1** 根路由 `GET /` 返回的欢迎文案包含 refresh/oauth 等字样，仅为描述性文案，实际 API 路由已正常挂载。

**23.2** 响应结构共 5 种格式（见 §2.4），客户端必须实现兼容性解析层，不能假设所有接口都返回 `{ success, data }`。

**23.3** `GET /config/models` 仅返回 `provider === "coco-fast"` 且在公共白名单中的模型。获取全部 13 个可用模型请调用 `GET /llm/models`。

**23.4** LLM 请求按模型名分别路由到不同 provider，不是统一走 coco-fast：
- `"auto"` / `"smart"`：ModelSelectorService 按任务类型自动路由，free 套餐全部到 coco-fast，pro/business 按任务类型路由到最优模型
- `"coco-fast"`：走 coco-fast 聚合器
- `"claude-*"`：直接调用 Anthropic API
- `"gpt-*"`：直接调用 OpenAI API

**23.5** 套餐名称为 `free`、`pro`、`business` 三种，不存在 `enterprise`。

**23.6** `POST /auth/reset-password` 请求体字段名是 `newPassword`，不是 `password`，传错会收到 400。

**23.7** `GET /llm/models` 返回全部 13 个公开模型，所有套餐相同。套餐差异体现在路由策略和配额上，不体现在模型可见性上。

**23.8** `POST /skills/publish` 需要 pro 或 business 套餐，free 用户返回 403。客户端应在 UI 层提前判断套餐，对 free 用户展示升级引导。

**23.9** `POST /admin/users/:id/roles` 是 stub 接口，不实际修改角色。角色存储在 JWT 中，需在数据库层面修改后让用户重新登录。

**23.10** Analytics 模块（§17）包含 4 个完整实现的接口：`cost-breakdown`、`forecast`、`daily`、`routing-history`，早期文档版本缺失，现已补全。

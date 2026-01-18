# CCJK Cloud Providers API 文档

## 概述

云端供应商管理系统，允许第三方 API 供应商自助注册和管理其配置，用户可通过 `npx ccjk -p <provider>` 快速配置。

## Base URL

```
https://api.claudehome.cn/v1
```

---

## 数据模型

### Provider 供应商配置

```typescript
interface Provider {
  /** 唯一标识符，用于 -p 参数，如 "302ai", "glm" */
  id: string

  /** 显示名称 */
  name: string

  /** 供应商描述 */
  description?: string

  /** 供应商官网 */
  website?: string

  /** 供应商 Logo URL */
  logo?: string

  /** 是否公开显示在列表中 */
  isPublic: boolean

  /** 是否启用 */
  isActive: boolean

  /** Claude Code 配置 */
  claudeCode?: {
    /** API Base URL */
    baseUrl: string
    /** 认证类型 */
    authType: 'api_key' | 'auth_token'
    /** 默认模型列表 */
    defaultModels?: string[]
  }

  /** Codex 配置 */
  codex?: {
    /** API Base URL */
    baseUrl: string
    /** Wire API 协议类型 */
    wireApi: 'responses' | 'chat'
    /** 默认模型 */
    defaultModel?: string
  }

  /** 预设 API Key（可选，用于试用/演示） */
  defaultApiKey?: string

  /** 预设 API Key 的使用限制说明 */
  defaultApiKeyNote?: string

  /** 创建时间 */
  createdAt: string

  /** 更新时间 */
  updatedAt: string
}
```

---

## 公开接口（无需认证）

### 1. 获取供应商列表

获取所有公开且启用的供应商列表。

```http
GET /providers
```

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `codeType` | string | 否 | 过滤支持的代码工具类型：`claude-code` 或 `codex` |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "glm",
      "name": "GLM",
      "description": "智谱AI",
      "website": "https://open.bigmodel.cn",
      "logo": "https://...",
      "claudeCode": {
        "baseUrl": "https://open.bigmodel.cn/api/anthropic",
        "authType": "auth_token"
      },
      "codex": {
        "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
        "wireApi": "chat",
        "defaultModel": "GLM-4.7"
      }
    },
    {
      "id": "minimax",
      "name": "MiniMax",
      "description": "MiniMax API Service",
      "claudeCode": {
        "baseUrl": "https://api.minimaxi.com/anthropic",
        "authType": "auth_token",
        "defaultModels": ["MiniMax-M2"]
      },
      "codex": {
        "baseUrl": "https://api.minimaxi.com/v1",
        "wireApi": "chat",
        "defaultModel": "MiniMax-M2"
      }
    }
  ]
}
```

---

### 2. 获取单个供应商配置

根据 ID 获取供应商详细配置。

```http
GET /providers/:id
```

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 供应商 ID，如 `302ai`, `glm` |

**Response (成功):**

```json
{
  "success": true,
  "data": {
    "id": "302ai",
    "name": "302.AI",
    "description": "302.AI API Service",
    "website": "https://302.ai",
    "claudeCode": {
      "baseUrl": "https://api.302.ai/cc",
      "authType": "api_key"
    },
    "codex": {
      "baseUrl": "https://api.302.ai/v1",
      "wireApi": "responses"
    },
    "defaultApiKey": "sk-demo-xxx",
    "defaultApiKeyNote": "试用 Key，每日限额 100 次调用"
  }
}
```

**Response (未找到):**

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_NOT_FOUND",
    "message": "Provider '302ai' not found"
  }
}
```

---

### 3. 获取官方默认配置

获取 CCJK 官方默认配置（不带 -p 参数时使用）。

```http
GET /providers/default
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "official",
    "name": "CCJK Official",
    "description": "CCJK 官方默认配置",
    "claudeCode": {
      "baseUrl": "https://api.anthropic.com",
      "authType": "api_key"
    },
    "codex": {
      "baseUrl": "https://api.openai.com/v1",
      "wireApi": "responses"
    }
  }
}
```

---

## 供应商管理接口（需要认证）

### 4. 注册新供应商

供应商自助注册，创建后返回管理密码。

```http
POST /providers
```

**Request Body:**

```json
{
  "id": "302ai",
  "name": "302.AI",
  "description": "302.AI API Service",
  "website": "https://302.ai",
  "logo": "https://302.ai/logo.png",
  "email": "admin@302.ai",
  "claudeCode": {
    "baseUrl": "https://api.302.ai/cc",
    "authType": "api_key"
  },
  "codex": {
    "baseUrl": "https://api.302.ai/v1",
    "wireApi": "responses"
  },
  "defaultApiKey": "sk-demo-xxx",
  "defaultApiKeyNote": "试用 Key，每日限额 100 次"
}
```

**字段说明:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 唯一标识，3-20 字符，仅允许小写字母、数字、连字符 |
| `name` | string | 是 | 显示名称，2-50 字符 |
| `description` | string | 否 | 描述，最多 200 字符 |
| `website` | string | 否 | 官网 URL |
| `logo` | string | 否 | Logo URL |
| `email` | string | 是 | 管理员邮箱，用于接收管理密码和通知 |
| `claudeCode` | object | 否 | Claude Code 配置（至少提供一个） |
| `codex` | object | 否 | Codex 配置（至少提供一个） |
| `defaultApiKey` | string | 否 | 预设 API Key |
| `defaultApiKeyNote` | string | 否 | 预设 Key 说明 |

**Response (成功):**

```json
{
  "success": true,
  "data": {
    "id": "302ai",
    "adminPassword": "mgmt_a1b2c3d4e5f6",
    "message": "供应商创建成功，请妥善保管管理密码"
  }
}
```

**Response (ID 已存在):**

```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_EXISTS",
    "message": "Provider ID '302ai' already exists"
  }
}
```

---

### 5. 更新供应商配置

更新已有供应商的配置，需要管理密码。

```http
PUT /providers/:id
```

**Headers:**

```
X-Admin-Password: mgmt_a1b2c3d4e5f6
```

**Request Body:**

```json
{
  "name": "302.AI (Updated)",
  "description": "Updated description",
  "claudeCode": {
    "baseUrl": "https://api.302.ai/v2/cc",
    "authType": "api_key"
  },
  "defaultApiKey": "sk-new-demo-xxx"
}
```

**Response (成功):**

```json
{
  "success": true,
  "data": {
    "id": "302ai",
    "message": "供应商配置已更新"
  }
}
```

**Response (密码错误):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid admin password"
  }
}
```

---

### 6. 删除供应商

删除供应商配置，需要管理密码。

```http
DELETE /providers/:id
```

**Headers:**

```
X-Admin-Password: mgmt_a1b2c3d4e5f6
```

**Response (成功):**

```json
{
  "success": true,
  "data": {
    "message": "供应商 '302ai' 已删除"
  }
}
```

---

### 7. 重置管理密码

忘记密码时，通过邮箱验证重置。

```http
POST /providers/:id/reset-password
```

**Request Body:**

```json
{
  "email": "admin@302.ai"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "重置链接已发送到 admin@302.ai"
  }
}
```

---

## 限制说明

### 供应商数量限制

- 每个邮箱最多注册 **3 个** 供应商
- 超出限制返回错误：

```json
{
  "success": false,
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "每个邮箱最多注册 3 个供应商"
  }
}
```

### ID 命名规则

- 长度：3-20 字符
- 允许字符：小写字母 `a-z`、数字 `0-9`、连字符 `-`
- 不能以连字符开头或结尾
- 保留 ID：`official`, `default`, `ccjk`, `anthropic`, `openai`

### 速率限制

| 接口 | 限制 |
|------|------|
| GET /providers | 100 次/分钟 |
| GET /providers/:id | 100 次/分钟 |
| POST /providers | 10 次/小时 |
| PUT /providers/:id | 30 次/小时 |
| DELETE /providers/:id | 5 次/小时 |

---

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `PROVIDER_NOT_FOUND` | 404 | 供应商不存在 |
| `PROVIDER_EXISTS` | 409 | 供应商 ID 已存在 |
| `INVALID_ID` | 400 | ID 格式不合法 |
| `INVALID_CONFIG` | 400 | 配置格式错误 |
| `UNAUTHORIZED` | 401 | 管理密码错误 |
| `LIMIT_EXCEEDED` | 429 | 超出数量限制 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## CCJK CLI 使用示例

```bash
# 官方默认配置
npx ccjk

# 使用 302ai 供应商
npx ccjk -p 302ai

# 使用 302ai 并指定 API Key
npx ccjk -p 302ai -k sk-your-api-key

# 使用 302ai 的预设 API Key（如果供应商配置了）
npx ccjk -p 302ai --use-default-key

# 列出所有可用供应商
npx ccjk providers list

# 查看供应商详情
npx ccjk providers info 302ai
```

---

## 数据库 Schema 建议 (MongoDB)

```javascript
{
  _id: ObjectId,
  id: { type: String, unique: true, index: true },
  name: String,
  description: String,
  website: String,
  logo: String,
  email: { type: String, index: true },
  adminPasswordHash: String,  // bcrypt hash
  isPublic: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  claudeCode: {
    baseUrl: String,
    authType: { type: String, enum: ['api_key', 'auth_token'] },
    defaultModels: [String]
  },
  codex: {
    baseUrl: String,
    wireApi: { type: String, enum: ['responses', 'chat'] },
    defaultModel: String
  },
  defaultApiKey: String,  // 加密存储
  defaultApiKeyNote: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## 安全建议

1. **管理密码** - 使用 bcrypt 加密存储，强度 12+
2. **API Key** - 使用 AES-256 加密存储
3. **HTTPS** - 所有接口强制 HTTPS
4. **邮箱验证** - 注册时发送验证邮件
5. **审计日志** - 记录所有管理操作
6. **IP 限制** - 可选的 IP 白名单功能

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2025-01-14 | 初始版本 |

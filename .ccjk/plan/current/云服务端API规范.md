# 云服务端 API 开发规范

## 📋 概述

供应商注册表云服务 API，支持 CCJK 快速启动功能。

**基础 URL**: `https://api.claudehome.cn/v1`

---

## 🔌 API 端点

### 1. 查询供应商

```
GET /providers/{shortcode}
```

**描述**: 根据短码查询供应商信息

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| shortcode | string | 供应商短码 (2-20字符) |

**响应**:

```json
// 成功 (200)
{
  "success": true,
  "data": {
    "shortcode": "302",
    "name": "302.AI",
    "apiUrl": "https://api.302.ai",
    "description": "302.AI 中转服务",
    "models": ["gpt-4", "gpt-3.5-turbo", "claude-3-opus"],
    "category": "relay",
    "status": "active",
    "verified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "createdBy": null
  }
}

// 未找到 (404)
{
  "success": false,
  "error": {
    "code": "PROVIDER_NOT_FOUND",
    "message": "Provider 'bltcy' not found"
  }
}
```

---

### 2. 创建供应商

```
POST /providers
```

**描述**: 注册新供应商（先到先得）

**请求体**:
```json
{
  "shortcode": "bltcy",
  "name": "BLTCY Service",
  "apiUrl": "https://api.bltcy.com/v1",
  "description": "可选描述",
  "models": ["model-1", "model-2"]
}
```

**字段验证**:
| 字段 | 必填 | 规则 |
|------|------|------|
| shortcode | ✅ | 2-20字符，小写字母/数字/连字符，不能是保留词 |
| name | ✅ | 1-50字符 |
| apiUrl | ✅ | 有效的 HTTP/HTTPS URL |
| description | ❌ | 最多 200 字符 |
| models | ❌ | 字符串数组，最多 20 个 |

**保留短码** (不可注册):
```
help, menu, init, setup, config, update, doctor, mcp,
skills, agents, hooks, api, cloud, system, version,
test, debug, admin, root, official
```

**响应**:

```json
// 成功 (201)
{
  "success": true,
  "data": {
    "shortcode": "bltcy",
    "name": "BLTCY Service",
    "apiUrl": "https://api.bltcy.com/v1",
    "verified": false,
    "createdAt": "2026-01-25T10:30:00Z"
  }
}

// 短码已存在 (409)
{
  "success": false,
  "error": {
    "code": "SHORTCODE_EXISTS",
    "message": "Shortcode 'bltcy' already exists"
  }
}

// 验证失败 (400)
{
  "success": false,
  "error": {
    "code": "INVALID_SHORTCODE",
    "message": "Shortcode must be 2-20 characters, lowercase alphanumeric with hyphens"
  }
}
```

---

### 3. 列出供应商

```
GET /providers
```

**描述**: 获取供应商列表

**查询参数**:
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| category | string | - | 按分类筛选 (official/relay/domestic/custom) |
| verified | boolean | - | 按验证状态筛选 |
| status | string | active | 按状态筛选 (active/maintenance/deprecated) |
| limit | number | 50 | 返回数量限制 (1-100) |
| offset | number | 0 | 分页偏移 |

**响应**:

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "shortcode": "302",
        "name": "302.AI",
        "apiUrl": "https://api.302.ai",
        "verified": true,
        "category": "relay"
      }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 🗄️ 数据库设计

### Cloudflare D1 Schema

```sql
-- 供应商表
CREATE TABLE providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shortcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  description TEXT,
  models TEXT,  -- JSON array string
  category TEXT DEFAULT 'custom',
  status TEXT DEFAULT 'active',
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  updated_at TEXT DEFAULT (datetime('now')),

  -- 约束
  CHECK (length(shortcode) >= 2 AND length(shortcode) <= 20),
  CHECK (category IN ('official', 'relay', 'domestic', 'custom')),
  CHECK (status IN ('active', 'maintenance', 'deprecated', 'testing'))
);

-- 索引
CREATE UNIQUE INDEX idx_shortcode ON providers(shortcode);
CREATE INDEX idx_category ON providers(category);
CREATE INDEX idx_status ON providers(status);
CREATE INDEX idx_verified ON providers(verified);

-- 预置数据
INSERT INTO providers (shortcode, name, api_url, description, models, category, verified) VALUES
('302', '302.AI', 'https://api.302.ai', '302.AI 中转服务', '["gpt-4","gpt-4-turbo","gpt-3.5-turbo","claude-3-opus","claude-3-sonnet"]', 'relay', 1),
('glm', '智谱AI', 'https://open.bigmodel.cn/api/paas/v4', '智谱 GLM 大模型', '["glm-4","glm-4-plus","glm-3-turbo"]', 'domestic', 1),
('kimi', '月之暗面 Kimi', 'https://api.moonshot.cn/v1', 'Moonshot Kimi 大模型', '["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"]', 'domestic', 1),
('minimax', 'MiniMax', 'https://api.minimax.chat/v1', 'MiniMax 大模型', '["abab5.5-chat","abab6-chat","abab6.5-chat"]', 'domestic', 1),
('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', 'DeepSeek 大模型', '["deepseek-chat","deepseek-coder"]', 'domestic', 1),
('qwen', '通义千问', 'https://dashscope.aliyuncs.com/compatible-mode/v1', '阿里通义千问大模型', '["qwen-turbo","qwen-plus","qwen-max"]', 'domestic', 1);
```

---

## 🔒 安全措施

### Rate Limiting

| 端点 | 限制 |
|------|------|
| GET /providers/{shortcode} | 100 次/分钟/IP |
| GET /providers | 30 次/分钟/IP |
| POST /providers | 5 次/小时/IP |

### 防滥用

1. **短码验证**:
   - 正则: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/`
   - 禁止保留词
   - 禁止纯数字（避免与端口混淆）

2. **URL 验证**:
   - 必须是有效 URL
   - 必须是 HTTP 或 HTTPS
   - 禁止 localhost/127.0.0.1（生产环境）

3. **内容过滤**:
   - 名称和描述过滤敏感词
   - 禁止 XSS 相关字符

---

## 🚀 Cloudflare Workers 实现示例

```typescript
// src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { rateLimiter } from 'hono-rate-limiter'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/*', cors())

// GET /v1/providers/:shortcode
app.get('/v1/providers/:shortcode', async (c) => {
  const shortcode = c.req.param('shortcode').toLowerCase()

  const result = await c.env.DB.prepare(
    'SELECT * FROM providers WHERE shortcode = ? AND status = ?'
  ).bind(shortcode, 'active').first()

  if (!result) {
    return c.json({
      success: false,
      error: { code: 'PROVIDER_NOT_FOUND', message: `Provider '${shortcode}' not found` }
    }, 404)
  }

  return c.json({
    success: true,
    data: {
      shortcode: result.shortcode,
      name: result.name,
      apiUrl: result.api_url,
      description: result.description,
      models: JSON.parse(result.models || '[]'),
      category: result.category,
      status: result.status,
      verified: !!result.verified,
      createdAt: result.created_at,
    }
  })
})

// POST /v1/providers
app.post('/v1/providers', async (c) => {
  const body = await c.req.json()
  const { shortcode, name, apiUrl, description, models } = body

  // Validation
  if (!isValidShortcode(shortcode)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_SHORTCODE', message: 'Invalid shortcode format' }
    }, 400)
  }

  // Check existence
  const existing = await c.env.DB.prepare(
    'SELECT shortcode FROM providers WHERE shortcode = ?'
  ).bind(shortcode.toLowerCase()).first()

  if (existing) {
    return c.json({
      success: false,
      error: { code: 'SHORTCODE_EXISTS', message: `Shortcode '${shortcode}' already exists` }
    }, 409)
  }

  // Insert
  const result = await c.env.DB.prepare(`
    INSERT INTO providers (shortcode, name, api_url, description, models)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    shortcode.toLowerCase(),
    name,
    apiUrl,
    description || null,
    models ? JSON.stringify(models) : null
  ).run()

  return c.json({
    success: true,
    data: {
      shortcode: shortcode.toLowerCase(),
      name,
      apiUrl,
      verified: false,
      createdAt: new Date().toISOString()
    }
  }, 201)
})

export default app
```

---

## 📋 部署清单

### Cloudflare 资源

- [ ] Workers 项目创建
- [ ] D1 数据库创建
- [ ] 自定义域名绑定 (api.claudehome.cn)
- [ ] Rate Limiting 规则配置

### 初始化步骤

```bash
# 1. 创建 D1 数据库
wrangler d1 create ccjk-providers

# 2. 执行 schema
wrangler d1 execute ccjk-providers --file=./schema.sql

# 3. 部署 Worker
wrangler deploy

# 4. 绑定自定义域名
# 在 Cloudflare Dashboard 配置
```

---

## 🔄 后续迭代

### Phase 2: 认证系统

- 用户注册/登录
- 供应商所有权管理
- 供应商信息更新/删除

### Phase 3: 审核机制

- 官方验证流程
- 社区举报机制
- 自动健康检查

### Phase 4: 统计分析

- 使用量统计
- 热门供应商排行
- API 可用性监控

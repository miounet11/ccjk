# API Designer | API 设计师

A skill for designing RESTful APIs following industry best practices.

一个遵循行业最佳实践设计 RESTful API 的技能。

## When to Apply | 何时应用

- When designing new API endpoints | 设计新 API 端点时
- When reviewing existing API designs | 审查现有 API 设计时
- When refactoring API structures | 重构 API 结构时
- When documenting API specifications | 编写 API 规范文档时
- When planning API versioning strategies | 规划 API 版本策略时

## Overview | 概述

This skill helps you design clean, consistent, and developer-friendly RESTful APIs. It covers URL design, HTTP methods, status codes, error handling, pagination, versioning, and authentication.

此技能帮助您设计简洁、一致且对开发者友好的 RESTful API。涵盖 URL 设计、HTTP 方法、状态码、错误处理、分页、版本控制和认证。

---

## URL Design Rules | URL 设计规则

### `api-001`: Use Nouns for Resources | 使用名词表示资源

**Priority**: CRITICAL | **优先级**: 关键

Resources should be nouns, not verbs. The HTTP method indicates the action.

资源应该是名词，而不是动词。HTTP 方法表示操作。

**❌ Bad | 错误:**
```
GET  /getUsers
POST /createUser
PUT  /updateUser/123
DELETE /deleteUser/123
```

**✅ Good | 正确:**
```
GET    /users          # List users | 获取用户列表
POST   /users          # Create user | 创建用户
GET    /users/123      # Get user | 获取单个用户
PUT    /users/123      # Update user | 更新用户
DELETE /users/123      # Delete user | 删除用户
```

### `api-002`: Use Plural Nouns | 使用复数名词

**Priority**: HIGH | **优先级**: 高

Always use plural nouns for consistency, even for singleton resources.

始终使用复数名词以保持一致性，即使是单例资源。

**❌ Bad | 错误:**
```
/user/123
/product/456
/category/789
```

**✅ Good | 正确:**
```
/users/123
/products/456
/categories/789
```

### `api-003`: Use Kebab-Case for URLs | URL 使用 kebab-case

**Priority**: HIGH | **优先级**: 高

Use lowercase letters and hyphens for multi-word resource names.

多词资源名使用小写字母和连字符。

**❌ Bad | 错误:**
```
/userProfiles
/user_profiles
/UserProfiles
```

**✅ Good | 正确:**
```
/user-profiles
/order-items
/product-categories
```

### `api-004`: Nest Resources for Relationships | 嵌套资源表示关系

**Priority**: MEDIUM | **优先级**: 中

Use nesting to show resource relationships, but limit to 2-3 levels.

使用嵌套表示资源关系，但限制在 2-3 层。

**❌ Bad | 错误:**
```
/users/123/orders/456/items/789/reviews/012
```

**✅ Good | 正确:**
```
/users/123/orders           # User's orders | 用户的订单
/orders/456/items           # Order's items | 订单的商品
/items/789/reviews          # Item's reviews | 商品的评价
```

### `api-005`: Use Query Parameters for Filtering | 使用查询参数过滤

**Priority**: MEDIUM | **优先级**: 中

Use query parameters for filtering, sorting, and searching.

使用查询参数进行过滤、排序和搜索。

**✅ Good | 正确:**
```
GET /users?status=active
GET /users?role=admin&status=active
GET /products?category=electronics&sort=price&order=desc
GET /orders?created_after=2024-01-01&created_before=2024-12-31
```

---

## HTTP Methods | HTTP 方法

### `api-006`: Use Correct HTTP Methods | 使用正确的 HTTP 方法

**Priority**: CRITICAL | **优先级**: 关键

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove resource | Yes | No |

| 方法 | 用途 | 幂等 | 安全 |
|------|------|------|------|
| GET | 获取资源 | 是 | 是 |
| POST | 创建资源 | 否 | 否 |
| PUT | 替换资源 | 是 | 否 |
| PATCH | 部分更新 | 否 | 否 |
| DELETE | 删除资源 | 是 | 否 |

**❌ Bad | 错误:**
```
POST /users/123          # Should be PUT/PATCH for update
GET  /users/delete/123   # Should be DELETE method
POST /users/search       # Should be GET with query params
```

**✅ Good | 正确:**
```
PUT   /users/123         # Full update | 完整更新
PATCH /users/123         # Partial update | 部分更新
DELETE /users/123        # Delete | 删除
GET   /users?q=john      # Search | 搜索
```

### `api-007`: PUT vs PATCH | PUT 与 PATCH 的区别

**Priority**: HIGH | **优先级**: 高

- **PUT**: Replace entire resource (send all fields)
- **PATCH**: Update specific fields only

- **PUT**: 替换整个资源（发送所有字段）
- **PATCH**: 仅更新特定字段

**PUT Example | PUT 示例:**
```json
PUT /users/123
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "status": "active"
}
```

**PATCH Example | PATCH 示例:**
```json
PATCH /users/123
{
  "status": "inactive"
}
```

---

## Status Codes | 状态码

### `api-008`: Use Appropriate Status Codes | 使用适当的状态码

**Priority**: CRITICAL | **优先级**: 关键

#### Success Codes | 成功状态码

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST creating resource |
| 204 | No Content | Successful DELETE with no body |

| 状态码 | 含义 | 用途 |
|--------|------|------|
| 200 | 成功 | GET, PUT, PATCH, DELETE 成功 |
| 201 | 已创建 | POST 创建资源成功 |
| 204 | 无内容 | DELETE 成功且无响应体 |

#### Client Error Codes | 客户端错误状态码

| Code | Meaning | Usage |
|------|---------|-------|
| 400 | Bad Request | Invalid request body/params |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

| 状态码 | 含义 | 用途 |
|--------|------|------|
| 400 | 错误请求 | 无效的请求体/参数 |
| 401 | 未认证 | 缺少/无效的认证信息 |
| 403 | 禁止访问 | 已认证但无权限 |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 资源冲突（重复） |
| 422 | 无法处理 | 验证错误 |
| 429 | 请求过多 | 超出速率限制 |

#### Server Error Codes | 服务器错误状态码

| Code | Meaning | Usage |
|------|---------|-------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Server temporarily down |

| 状态码 | 含义 | 用途 |
|--------|------|------|
| 500 | 服务器内部错误 | 意外的服务器错误 |
| 502 | 网关错误 | 上游服务错误 |
| 503 | 服务不可用 | 服务器暂时不可用 |

---

## Error Handling | 错误处理

### `api-009`: Consistent Error Response Format | 一致的错误响应格式

**Priority**: CRITICAL | **优先级**: 关键

Use a consistent error response structure across all endpoints.

在所有端点使用一致的错误响应结构。

**❌ Bad | 错误:**
```json
{ "error": "Something went wrong" }
{ "message": "Invalid input" }
{ "err": { "msg": "Not found" } }
```

**✅ Good | 正确:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### `api-010`: Include Error Codes | 包含错误代码

**Priority**: HIGH | **优先级**: 高

Use machine-readable error codes for programmatic handling.

使用机器可读的错误代码便于程序处理。

**✅ Good Error Codes | 正确的错误代码:**
```
VALIDATION_ERROR      - Input validation failed | 输入验证失败
AUTHENTICATION_ERROR  - Auth failed | 认证失败
AUTHORIZATION_ERROR   - Permission denied | 权限拒绝
RESOURCE_NOT_FOUND    - Resource doesn't exist | 资源不存在
RESOURCE_CONFLICT     - Duplicate resource | 资源重复
RATE_LIMIT_EXCEEDED   - Too many requests | 请求过多
INTERNAL_ERROR        - Server error | 服务器错误
```

---

## Pagination | 分页

### `api-011`: Implement Pagination for Lists | 列表实现分页

**Priority**: HIGH | **优先级**: 高

Always paginate list endpoints to prevent performance issues.

始终对列表端点进行分页以防止性能问题。

**Request | 请求:**
```
GET /users?page=2&per_page=20
GET /users?offset=20&limit=20
GET /users?cursor=eyJpZCI6MTAwfQ
```

**Response | 响应:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": true
  },
  "links": {
    "self": "/users?page=2&per_page=20",
    "first": "/users?page=1&per_page=20",
    "prev": "/users?page=1&per_page=20",
    "next": "/users?page=3&per_page=20",
    "last": "/users?page=8&per_page=20"
  }
}
```

### `api-012`: Cursor-Based Pagination for Large Datasets | 大数据集使用游标分页

**Priority**: MEDIUM | **优先级**: 中

Use cursor-based pagination for better performance with large datasets.

大数据集使用游标分页以获得更好的性能。

**✅ Good | 正确:**
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MTIzfQ",
    "has_more": true
  },
  "links": {
    "next": "/users?cursor=eyJpZCI6MTIzfQ&limit=20"
  }
}
```

---

## Versioning | 版本控制

### `api-013`: Version Your API | API 版本控制

**Priority**: HIGH | **优先级**: 高

Always version your API to allow backward-compatible changes.

始终对 API 进行版本控制以允许向后兼容的更改。

**Option 1: URL Path (Recommended) | 选项 1: URL 路径（推荐）**
```
/v1/users
/v2/users
```

**Option 2: Header | 选项 2: 请求头**
```
Accept: application/vnd.api+json; version=1
API-Version: 2024-01-15
```

**Option 3: Query Parameter | 选项 3: 查询参数**
```
/users?version=1
```

### `api-014`: Deprecation Strategy | 弃用策略

**Priority**: MEDIUM | **优先级**: 中

Communicate deprecation clearly with headers and documentation.

通过响应头和文档清晰地传达弃用信息。

**Response Headers | 响应头:**
```
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: </v2/users>; rel="successor-version"
```

---

## Authentication & Authorization | 认证与授权

### `api-015`: Use Standard Authentication | 使用标准认证

**Priority**: CRITICAL | **优先级**: 关键

Use industry-standard authentication mechanisms.

使用行业标准的认证机制。

**Bearer Token (JWT) | Bearer 令牌:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**API Key | API 密钥:**
```
X-API-Key: your-api-key
Authorization: ApiKey your-api-key
```

**OAuth 2.0:**
```
Authorization: Bearer {access_token}
```

### `api-016`: Secure Sensitive Endpoints | 保护敏感端点

**Priority**: CRITICAL | **优先级**: 关键

- Always use HTTPS | 始终使用 HTTPS
- Implement rate limiting | 实现速率限制
- Use short-lived tokens | 使用短期令牌
- Implement token refresh | 实现令牌刷新

**✅ Good Practices | 正确做法:**
```
# Rate limit headers | 速率限制响应头
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Response Format | 响应格式

### `api-017`: Consistent Response Structure | 一致的响应结构

**Priority**: HIGH | **优先级**: 高

Use a consistent response envelope for all endpoints.

所有端点使用一致的响应封装。

**Single Resource | 单个资源:**
```json
{
  "data": {
    "id": "123",
    "type": "user",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

**Collection | 集合:**
```json
{
  "data": [
    { "id": "1", "type": "user", ... },
    { "id": "2", "type": "user", ... }
  ],
  "pagination": { ... },
  "meta": {
    "total": 100,
    "requestId": "req_abc123"
  }
}
```

### `api-018`: Use Consistent Naming Convention | 使用一致的命名约定

**Priority**: MEDIUM | **优先级**: 中

Choose one naming convention and stick to it.

选择一种命名约定并坚持使用。

**❌ Bad (Mixed) | 错误（混合）:**
```json
{
  "user_name": "John",
  "emailAddress": "john@example.com",
  "PhoneNumber": "123456"
}
```

**✅ Good (camelCase) | 正确（驼峰命名）:**
```json
{
  "userName": "John",
  "emailAddress": "john@example.com",
  "phoneNumber": "123456"
}
```

**✅ Good (snake_case) | 正确（下划线命名）:**
```json
{
  "user_name": "John",
  "email_address": "john@example.com",
  "phone_number": "123456"
}
```

---

## Best Practices Summary | 最佳实践总结

| Rule | Priority | Description |
|------|----------|-------------|
| api-001 | CRITICAL | Use nouns for resources |
| api-002 | HIGH | Use plural nouns |
| api-003 | HIGH | Use kebab-case for URLs |
| api-004 | MEDIUM | Nest resources for relationships |
| api-005 | MEDIUM | Use query params for filtering |
| api-006 | CRITICAL | Use correct HTTP methods |
| api-007 | HIGH | Understand PUT vs PATCH |
| api-008 | CRITICAL | Use appropriate status codes |
| api-009 | CRITICAL | Consistent error format |
| api-010 | HIGH | Include error codes |
| api-011 | HIGH | Implement pagination |
| api-012 | MEDIUM | Use cursor pagination for large data |
| api-013 | HIGH | Version your API |
| api-014 | MEDIUM | Have deprecation strategy |
| api-015 | CRITICAL | Use standard authentication |
| api-016 | CRITICAL | Secure sensitive endpoints |
| api-017 | HIGH | Consistent response structure |
| api-018 | MEDIUM | Consistent naming convention |

| 规则 | 优先级 | 描述 |
|------|--------|------|
| api-001 | 关键 | 使用名词表示资源 |
| api-002 | 高 | 使用复数名词 |
| api-003 | 高 | URL 使用 kebab-case |
| api-004 | 中 | 嵌套资源表示关系 |
| api-005 | 中 | 使用查询参数过滤 |
| api-006 | 关键 | 使用正确的 HTTP 方法 |
| api-007 | 高 | 理解 PUT 与 PATCH 区别 |
| api-008 | 关键 | 使用适当的状态码 |
| api-009 | 关键 | 一致的错误格式 |
| api-010 | 高 | 包含错误代码 |
| api-011 | 高 | 实现分页 |
| api-012 | 中 | 大数据集使用游标分页 |
| api-013 | 高 | API 版本控制 |
| api-014 | 中 | 制定弃用策略 |
| api-015 | 关键 | 使用标准认证 |
| api-016 | 关键 | 保护敏感端点 |
| api-017 | 高 | 一致的响应结构 |
| api-018 | 中 | 一致的命名约定 |

---

## Integration | 集成

This skill works best with:

此技能最适合与以下工具配合使用：

- OpenAPI/Swagger for API documentation | OpenAPI/Swagger 用于 API 文档
- Postman/Insomnia for API testing | Postman/Insomnia 用于 API 测试
- API Gateway for rate limiting and auth | API 网关用于速率限制和认证
- JSON Schema for request/response validation | JSON Schema 用于请求/响应验证

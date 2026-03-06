# CCJK Cloud API 端点快速参考

> **Base URL:** `https://api.claudehome.cn`
> **更新日期:** 2026-03-03

---

## 🌐 公开 API（无需认证）

### Skills 市场

```bash
# 获取 Skills 列表
GET /api/skills?limit=20&page=1&search=coding&category=productivity&featured=true

# 获取 Skill 详情
GET /api/skills/{slug}

# 获取推荐 Skills
GET /api/skills/recommended?limit=10
```

### MCP 服务器

```bash
# 获取 MCP 服务器列表
GET /api/mcp-servers?limit=20&page=1&search=github&category=development

# 获取 MCP 服务器详情
GET /api/mcp-servers/{slug}
```

### Agents

```bash
# 获取 Agents 列表
GET /api/v1/agents?limit=20&page=1&search=coding&category=development

# 获取 Agent 详情
GET /api/v1/agents/{slug}
```

### 搜索

```bash
# 全局搜索（Skills + MCP + Agents）
GET /api/search?q=coding&limit=20

# 分类搜索
GET /api/search?q=github&type=mcp&limit=10
```

### 分类

```bash
# 获取所有分类
GET /api/categories

# 获取分类下的内容
GET /api/categories/{category}?type=skills&limit=20
```

---

## 🔐 认证 API

### 用户认证

```bash
# 注册
POST /api/v1/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}

# 登录
POST /api/v1/auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# 刷新 Token
POST /api/v1/auth/refresh
Content-Type: application/json
{
  "refreshToken": "refresh_token_here"
}

# 验证 Token
GET /api/v1/auth/verify
Authorization: Bearer <accessToken>

# 登出
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
```

---

## 🖥️ 远程控制 API（需要认证）

### 机器管理

```bash
# 注册机器
POST /api/internal/remote/machines/register
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "machineId": "mac-pro-m3-001",
  "hostname": "Johns-MacBook-Pro",
  "platform": "darwin",
  "arch": "arm64",
  "ccjkVersion": "1.2.0",
  "workspacePath": "/Users/john/projects",
  "capabilities": ["file_ops", "exec", "session", "mcp"]
}

# 获取机器列表
GET /api/internal/remote/machines
Authorization: Bearer <accessToken>

# 获取机器详情
GET /api/internal/remote/machines/{machineId}
Authorization: Bearer <accessToken>

# 解绑机器
DELETE /api/internal/remote/machines/{machineId}
Authorization: Bearer <accessToken>

# 心跳（每 30 秒）
POST /api/internal/remote/machines/{machineId}/heartbeat
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "status": "online",
  "cpuUsage": 12.5,
  "memUsage": 68.2,
  "activeSessions": 2
}
```

### 会话管理

```bash
# 创建会话
POST /api/internal/remote/sessions
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "machineId": "mac-pro-m3-001",
  "workspacePath": "/Users/john/projects/my-app",
  "model": "claude-opus-4-6",
  "systemPrompt": "You are a helpful coding assistant."
}

# 获取会话列表
GET /api/internal/remote/sessions?machineId=mac-pro-m3-001&status=active
Authorization: Bearer <accessToken>

# 获取会话详情
GET /api/internal/remote/sessions/{sessionId}
Authorization: Bearer <accessToken>

# 发送消息
POST /api/internal/remote/sessions/{sessionId}/messages
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "role": "user",
  "content": "帮我重构这个函数"
}

# 获取消息历史
GET /api/internal/remote/sessions/{sessionId}/messages?limit=50&offset=0
Authorization: Bearer <accessToken>

# 关闭会话
DELETE /api/internal/remote/sessions/{sessionId}
Authorization: Bearer <accessToken>
```

### 文件操作

```bash
# 读取文件
GET /api/internal/remote/files/read?machineId=mac-pro-m3-001&path=/path/to/file.ts
Authorization: Bearer <accessToken>

# 写入文件
POST /api/internal/remote/files/write
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "machineId": "mac-pro-m3-001",
  "path": "/path/to/file.ts",
  "content": "console.log('Hello');"
}

# 列出目录
GET /api/internal/remote/files/list?machineId=mac-pro-m3-001&path=/path/to/dir
Authorization: Bearer <accessToken>

# 删除文件
DELETE /api/internal/remote/files?machineId=mac-pro-m3-001&path=/path/to/file.ts
Authorization: Bearer <accessToken>
```

### 命令执行

```bash
# 执行命令
POST /api/internal/remote/exec
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "machineId": "mac-pro-m3-001",
  "command": "npm test",
  "cwd": "/Users/john/projects/my-app",
  "timeout": 30000
}

# 获取命令执行状态
GET /api/internal/remote/exec/{execId}
Authorization: Bearer <accessToken>

# 终止命令执行
DELETE /api/internal/remote/exec/{execId}
Authorization: Bearer <accessToken>
```

---

## 📊 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    // 实际数据
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 🔑 认证方式

### JWT Token

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token 生命周期

- **Access Token**: 1 小时
- **Refresh Token**: 30 天

---

## 📝 常用查询参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `limit` | number | 每页数量 | 20 |
| `page` | number | 页码 | 1 |
| `search` | string | 搜索关键词 | - |
| `category` | string | 分类筛选 | - |
| `featured` | boolean | 仅显示精选 | false |
| `sort` | string | 排序方式 | `popular` |

---

## 🚀 快速测试

```bash
# 测试公开 API
curl https://api.claudehome.cn/api/skills?limit=5

# 测试认证 API
curl -X POST https://api.claudehome.cn/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 测试远程控制 API
curl https://api.claudehome.cn/api/internal/remote/machines \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 相关文档

- [完整对接文档](./CLIENT_INTEGRATION_GUIDE_V2.md)
- [远程控制 API 详解](./REMOTE_API_CLIENT_GUIDE.md)
- [认证系统说明](./AUTH_SYSTEM.md)

# CCJK Cloud API 客户端对接文档

> **版本：v2.0** | **更新日期：2026-03-03**
> **适用对象：** ccjk 客户端（App / Desktop / CLI / Web）开发团队

---

## 📋 目录

1. [架构总览](#一架构总览)
2. [Base URL 与环境](#二base-url-与环境)
3. [认证流程](#三认证流程)
4. [模板市场 API](#四模板市场-api)
5. [客户端绑定管理](#五客户端绑定管理)
6. [会话管理](#六会话管理)
7. [命令执行](#七命令执行)
8. [文件操作](#八文件操作)
9. [WebSocket 实时通信](#九websocket-实时通信)
10. [监控与状态](#十监控与状态)
11. [错误码参考](#十一错误码参考)
12. [客户端实现要点](#十二客户端实现要点)
13. [接口汇总](#十三接口汇总)

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     用户侧（多端）                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ iOS App  │  │Android App│  │Web 控制台 │  │Desktop   │   │
└──┴────┬─────┴──┴────┬─────┴──┴────┬─────┴──┴────┬─────┴───┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                                │
                    HTTPS / WebSocket
                                │
              ┌─────────────────▼──────────────────┐
              │      ccjk-cloud 统一网关服务         │
              │   https://api.claudehome.cn/*   │
              │                                      │
              │  ┌─────────────────────────────┐    │
              │  │  模板市场 (Marketplace)      │    │
              │  │  /api/skills, /api/v1/*     │    │
              │  ├─────────────────────────────┤    │
              │  │  远程控制代理层              │    │
              │  │  /api/internal/remote/*     │    │
              │  │  认证 → 审计 → 转发          │    │
              │  └──────────────┬──────────────┘    │
              └─────────────────┼───────────────────┘
                                │
                    内网/专线 HTTPS
                                │
              ┌─────────────────▼──────────────────┐
              │         remote-api 服务              │
              │   remote-api.claudehome.cn           │
              │   管理多个 ccjk 客户端实例            │
              └─────────────────┬───────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                   │
    ┌─────────▼──────┐ ┌───────▼──────┐ ┌─────────▼──────┐
    │  ccjk 客户端 A  │ │ ccjk 客户端 B │ │  ccjk 客户端 C  │
    │  (用户机器 1)   │ │  (用户机器 2) │ │  (用户机器 3)   │
    │  Claude Code   │ │  Claude Code  │ │  Claude Code   │
    └────────────────┘ └──────────────┘ └────────────────┘
```

### 核心原则

- **统一网关入口**：所有 API 请求通过 `https://api.claudehome.cn/*`
- **模板市场公开访问**：`/api/skills`, `/api/mcp-servers`, `/api/v1/*` 无需认证
- **远程控制需认证**：`/api/internal/remote/*` 需要 JWT Token
- **一个用户多客户端**：支持绑定多台机器、多工作区
- **完整审计日志**：所有操作可追溯

---

## 二、Base URL 与环境

### 生产环境（当前已上线）

```
Base URL: https://api.claudehome.cn
```

### 接口分类

| 路径前缀 | 说明 | 认证要求 |
|---------|------|----------|
| `/api/skills` | Skills 市场（公开） | ❌ 无需认证 |
| `/api/mcp-servers` | MCP 服务器（公开） | ❌ 无需认证 |
| `/api/v1/*` | 统一 API（Agents/Skills/MCP） | ❌ 无需认证 |
| `/api/v1/auth` | 用户认证 | ❌ 无需认证（注册/登录） |
| `/api/internal/remote/*` | 远程控制 | ✅ 需要 JWT Token |

---

## 三、认证流程

### 3.1 用户注册

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "name": "John Doe"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": null
    }
  }
}
```

### 3.2 用户登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**响应格式同注册**

### 3.3 Token 使用

所有需要认证的接口，在 Header 中携带：

```http
Authorization: Bearer <accessToken>
```

### 3.4 Token 刷新

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### 3.5 Token 验证

```http
GET /api/v1/auth/verify
Authorization: Bearer <accessToken>
```

---

## 四、模板市场 API

### 4.1 获取 Skills 列表（公开接口）

```http
GET https://api.claudehome.cn/api/skills?limit=20&page=1
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | number | ❌ | 每页数量（默认 20） |
| `page` | number | ❌ | 页码（默认 1） |
| `search` | string | ❌ | 搜索关键词 |
| `category` | string | ❌ | 分类筛选 |
| `featured` | boolean | ❌ | 仅显示精选 |

**响应示例：**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": "fc63cf67-fbf6-48f1-ba92-4aee015e47a5",
        "name": "algorithmic-art",
        "slug": "algorithmic-art",
        "description": "Creating algorithmic art using p5.js...",
        "category": "productivity",
        "tags": ["official", "anthropic", "algorithmic art"],
        "author": "Anthropic",
        "source_url": "https://github.com/anthropics/skills/tree/main/skills/algorithmic-art",
        "quality_score": 95,
        "is_featured": false,
        "created_at": "2026-01-12 01:59:32",
        "updated_at": "2026-01-12 01:59:32"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### 4.2 获取 MCP 服务器列表

```http
GET https://api.claudehome.cn/api/mcp-servers?limit=20&page=1
```

### 4.3 获取 Agents 列表

```http
GET https://api.claudehome.cn/api/v1/agents?limit=20&page=1
```

### 4.4 获取模板详情

```http
GET https://api.claudehome.cn/api/v1/templates/{templateId}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "agent-coding-assistant-001",
    "type": "agents",
    "name": "CodeForge",
    "title": "Advanced AI Coding Assistant",
    "description": "A powerful coding assistant that helps you write better code faster.",
    "longDescription": "## Features\n- Code refactoring\n- Bug detection\n...",
    "author": "CCJK Team",
    "version": "1.2.0",
    "downloads": 15234,
    "rating": 4.8,
    "tags": ["coding", "refactor", "debug"],
    "config": {
      "systemPrompt": "You are CodeForge, an expert coding assistant...",
      "model": "claude-opus-4-6",
      "tools": ["read_file", "write_file", "bash"],
      "mcpServers": ["filesystem", "github"]
    },
    "readme": "# CodeForge\n\nA powerful AI coding assistant...\n",
    "changelog": "## v1.2.0\n- Added refactoring support\n...",
    "license": "MIT",
    "repository": "https://github.com/ccjk/codeforge",
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-02-20T14:30:00Z"
  }
}
```

### 4.5 搜索（全局）

```http
GET https://api.claudehome.cn/api/search?q=coding&limit=20
```

**响应包含 Skills、MCP Servers、Agents 的综合结果**

---

## 五、客户端绑定管理

### 5.1 注册新客户端（绑定机器）

```http
POST /api/internal/remote/machines/register
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "hostname": "Johns-MacBook-Pro",
  "platform": "darwin",
  "arch": "arm64",
  "ccjkVersion": "1.2.0",
  "claudeCodeVersion": "1.0.5",
  "workspacePath": "/Users/john/projects",
  "capabilities": ["file_ops", "exec", "session", "mcp"]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "machineId": "mac-pro-m3-001",
    "registeredAt": "2026-03-03T10:00:00Z",
    "status": "online"
  }
}
```

### 5.2 获取绑定机器列表

```http
GET /api/internal/remote/machines
Authorization: Bearer <accessToken>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "machines": [
      {
        "machineId": "mac-pro-m3-001",
        "hostname": "Johns-MacBook-Pro",
        "platform": "darwin",
        "status": "online",
        "lastSeen": "2026-03-03T10:05:00Z",
        "ccjkVersion": "1.2.0",
        "workspacePath": "/Users/john/projects",
        "capabilities": ["file_ops", "exec", "session", "mcp"]
      }
    ],
    "total": 1
  }
}
```

### 5.3 解绑客户端

```http
DELETE /api/internal/remote/machines/{machineId}
Authorization: Bearer <accessToken>
```

### 5.4 客户端心跳

ccjk 客户端每 **30 秒**发送一次心跳：

```http
POST /api/internal/remote/machines/{machineId}/heartbeat
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "status": "online",
  "cpuUsage": 12.5,
  "memUsage": 68.2,
  "activeSessions": 2,
  "currentWorkspace": "/Users/john/projects/my-app"
}
```

---

## 六、会话管理

### 6.1 创建会话

```http
POST /api/internal/remote/sessions
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "workspacePath": "/Users/john/projects/my-app",
  "model": "claude-opus-4-6",
  "systemPrompt": "You are a helpful coding assistant.",
  "mcpServers": ["filesystem", "github"],
  "tools": ["read_file", "write_file", "bash"]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123",
    "machineId": "mac-pro-m3-001",
    "status": "active",
    "createdAt": "2026-03-03T10:00:00Z",
    "wsUrl": "wss://remote-api.claudehome.cn/ws/sess_abc123"
  }
}
```

### 6.2 获取会话列表

```http
GET /api/internal/remote/sessions?machineId=mac-pro-m3-001&status=active
Authorization: Bearer <accessToken>
```

### 6.3 获取会话详情

```http
GET /api/internal/remote/sessions/{sessionId}
Authorization: Bearer <accessToken>
```

### 6.4 发送消息到会话

```http
POST /api/internal/remote/sessions/{sessionId}/messages
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "role": "user",
  "content": "帮我重构这个函数，让它更简洁",
  "attachments": [
    {
      "type": "file",
      "path": "/Users/john/projects/my-app/src/utils.ts"
    }
  ]
}
```

### 6.5 获取会话消息历史

```http
GET /api/internal/remote/sessions/{sessionId}/messages?limit=50&before=msg_xyz789
Authorization: Bearer <accessToken>
```

### 6.6 终止会话

```http
DELETE /api/internal/remote/sessions/{sessionId}
Authorization: Bearer <accessToken>
```

---

## 七、命令执行

### 7.1 发送控制命令

```http
POST /api/internal/remote/commands
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "type": "claude_code",
  "command": "open_file",
  "params": {
    "path": "/Users/john/projects/my-app/src/index.ts"
  }
}
```

**支持的命令类型：**

| `type` | `command` | 说明 |
|--------|-----------|------|
| `claude_code` | `open_file` | 在 Claude Code 中打开文件 |
| `claude_code` | `run_task` | 执行预定义任务 |
| `claude_code` | `apply_diff` | 应用代码变更 |
| `claude_code` | `interrupt` | 中断当前执行 |
| `system` | `open_terminal` | 打开终端 |
| `system` | `focus_window` | 聚焦窗口 |
| `mcp` | `call_tool` | 调用 MCP 工具 |

### 7.2 查询命令执行状态

```http
GET /api/internal/remote/commands/{commandId}
Authorization: Bearer <accessToken>
```

---

## 八、文件操作

### 8.1 读取文件

```http
POST /api/internal/remote/files/read
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "path": "/Users/john/projects/my-app/src/index.ts"
}
```

### 8.2 写入文件

```http
POST /api/internal/remote/files/write
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "path": "/Users/john/projects/my-app/src/index.ts",
  "content": "export const hello = () => 'world';",
  "encoding": "utf8"
}
```

### 8.3 列出目录

```http
POST /api/internal/remote/files/list
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "path": "/Users/john/projects/my-app/src",
  "recursive": false,
  "includeHidden": false
}
```

### 8.4 删除文件

```http
DELETE /api/internal/remote/files
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "path": "/Users/john/projects/my-app/tmp/cache.json"
}
```

### 8.5 执行 Shell 命令

```http
POST /api/internal/remote/files/exec
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "machineId": "mac-pro-m3-001",
  "command": "npm run build",
  "workingDir": "/Users/john/projects/my-app",
  "timeout": 30000
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "exitCode": 0,
    "stdout": "Build successful\n",
    "stderr": "",
    "duration": 4521
  }
}
```

---

## 九、WebSocket 实时通信

### 9.1 连接地址

```
wss://www.claudehome.cn/api/internal/remote/ws
```

### 9.2 连接认证

连接建立后立即发送认证消息：

```json
{
  "type": "auth",
  "token": "<accessToken>",
  "machineId": "mac-pro-m3-001"
}
```

### 9.3 客户端事件上报

ccjk 客户端通过 WebSocket 上报实时事件：

```json
// 会话消息流
{ "type": "session:stream", "sessionId": "sess_abc123", "delta": "重构后的代码..." }

// 会话完成
{ "type": "session:complete", "sessionId": "sess_abc123", "usage": {...} }

// 工具调用
{ "type": "tool:call", "sessionId": "sess_abc123", "tool": "read_file", "params": {...} }

// 工具结果
{ "type": "tool:result", "sessionId": "sess_abc123", "tool": "read_file", "result": {...} }

// 状态变更
{ "type": "machine:status", "machineId": "mac-pro-m3-001", "status": "busy" }

// 错误
{ "type": "error", "code": "EXEC_FAILED", "message": "..." }
```

### 9.4 控制台接收事件

App/Web 订阅后接收同样格式的事件。

---

## 十、监控与状态

### 10.1 获取 remote-api 连接状态

```http
GET /api/internal/remote/status
Authorization: Bearer <accessToken>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "remoteApi": {
      "reachable": true,
      "baseUrl": "https://remote-api.claudehome.cn",
      "latencyMs": 12,
      "checkedAt": "2026-03-03T10:00:00Z"
    },
    "connectedMachines": 3,
    "activeSessions": 7
  }
}
```

### 10.2 获取机器实时状态

```http
GET /api/internal/remote/machines/{machineId}/status
Authorization: Bearer <accessToken>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "machineId": "mac-pro-m3-001",
    "status": "online",
    "lastSeen": "2026-03-03T10:05:00Z",
    "metrics": {
      "cpuUsage": 12.5,
      "memUsage": 68.2,
      "activeSessions": 2
    },
    "currentWorkspace": "/Users/john/projects/my-app"
  }
}
```

---

## 十一、错误码参考

| 错误码 | HTTP 状态 | 含义 | 处理建议 |
|--------|-----------|------|----------|
| `INVALID_TYPE` | 400 | type 参数错误 | 检查 type 是否为 agents/skills/mcp |
| `INVALID_REQUEST` | 400 | 请求参数错误 | 检查请求体格式 |
| `UNAUTHORIZED` | 401 | Token 无效或未登录 | 重新登录或刷新 Token |
| `AUTH_EXPIRED` | 401 | Token 过期 | 刷新 Token |
| `FORBIDDEN` | 403 | 无权限操作该机器 | 检查绑定关系 |
| `NOT_FOUND` | 404 | 资源不存在 | 检查 ID 是否正确 |
| `CONFLICT` | 409 | 邮箱已注册等冲突 | 提示用户更换邮箱 |
| `RATE_LIMITED` | 429 | 请求过于频繁 | 指数退避重试 |
| `INTERNAL_ERROR` | 500 | 服务异常 | 上报错误，稍后重试 |
| `REMOTE_UNREACHABLE` | 502 | remote-api 不可达 | 重试，检查网络 |
| `REMOTE_ERROR` | 502 | remote-api 返回 5xx | 上报错误，稍后重试 |
| `MACHINE_OFFLINE` | 503 | 目标机器离线 | 提示用户检查客户端 |
| `SERVICE_UNAVAILABLE` | 503 | 功能未配置 | 联系管理员 |

---

## 十二、客户端实现要点

### 必须实现

1. **启动时自动注册** — 生成稳定的 `machineId`（建议 `hostname-${uuid}`，持久化到本地）
2. **心跳维持** — 每 30 秒 POST heartbeat，包含 CPU/内存/活跃会话数
3. **WebSocket 长连接** — 连接 ccjk-cloud，上报所有会话事件
4. **Token 管理** — 本地安全存储 accessToken，过期自动刷新

### 推荐实现

5. **离线队列** — 网络断开时缓存命令，重连后重放
6. **能力声明** — 注册时准确声明 `capabilities`，控制台据此展示可用操作
7. **版本上报** — 心跳中包含 ccjkVersion 和 claudeCodeVersion，便于服务端兼容处理

### machineId 生成规范

```typescript
import { hostname } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

const MACHINE_ID_FILE = join(os.homedir(), '.ccjk', 'machine-id');

function getMachineId(): string {
  if (existsSync(MACHINE_ID_FILE)) {
    return readFileSync(MACHINE_ID_FILE, 'utf8').trim();
  }
  const id = `${hostname()}-${uuidv4().slice(0, 8)}`;
  writeFileSync(MACHINE_ID_FILE, id, 'utf8');
  return id;
}
```

---

## 十三、接口汇总

### 模板市场（公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/templates` | 获取模板列表 |
| GET | `/api/v1/templates/{id}` | 获取模板详情 |
| GET | `/api/v1/templates/search` | 搜索模板 |
| GET | `/api/v1/templates/popular` | 热门模板 |
| GET | `/api/v1/templates/recent` | 最新模板 |

### 认证（部分公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 注册账号 |
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |
| GET | `/api/v1/auth/verify` | 验证 Token |

### 远程控制（需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/internal/remote/status` | 连接状态 |
| GET | `/api/internal/remote/machines` | 获取绑定机器列表 |
| POST | `/api/internal/remote/machines/register` | 注册新机器 |
| DELETE | `/api/internal/remote/machines/{id}` | 解绑机器 |
| POST | `/api/internal/remote/machines/{id}/heartbeat` | 心跳 |
| GET | `/api/internal/remote/machines/{id}/status` | 机器状态 |
| GET | `/api/internal/remote/sessions` | 会话列表 |
| POST | `/api/internal/remote/sessions` | 创建会话 |
| GET | `/api/internal/remote/sessions/{id}` | 会话详情 |
| DELETE | `/api/internal/remote/sessions/{id}` | 终止会话 |
| GET | `/api/internal/remote/sessions/{id}/messages` | 消息历史 |
| POST | `/api/internal/remote/sessions/{id}/messages` | 发送消息 |
| POST | `/api/internal/remote/commands` | 发送命令 |
| GET | `/api/internal/remote/commands/{id}` | 命令状态 |
| POST | `/api/internal/remote/files/read` | 读取文件 |
| POST | `/api/internal/remote/files/write` | 写入文件 |
| POST | `/api/internal/remote/files/list` | 列出目录 |
| DELETE | `/api/internal/remote/files` | 删除文件 |
| POST | `/api/internal/remote/files/exec` | 执行命令 |
| WS | `/api/internal/remote/ws` | 实时事件通道 |

---

## 十四、快速开始示例

### 14.1 获取模板列表（无需认证）

```bash
curl 'https://api.claudehome.cn/v1/templates?type=agents&limit=5'
```

### 14.2 用户注册并绑定客户端

```bash
# 1. 注册账号
curl -X POST 'https://api.claudehome.cn/v1/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "secure_password",
    "name": "John Doe"
  }'

# 响应获得 accessToken

# 2. 注册客户端
curl -X POST 'https://api.claudehome.cn/internal/remote/machines/register' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "machineId": "mac-pro-m3-001",
    "hostname": "Johns-MacBook-Pro",
    "platform": "darwin",
    "arch": "arm64",
    "ccjkVersion": "1.2.0",
    "claudeCodeVersion": "1.0.5",
    "workspacePath": "/Users/john/projects",
    "capabilities": ["file_ops", "exec", "session", "mcp"]
  }'

# 3. 发送心跳（每 30 秒）
curl -X POST 'https://api.claudehome.cn/internal/remote/machines/mac-pro-m3-001/heartbeat' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "online",
    "cpuUsage": 12.5,
    "memUsage": 68.2,
    "activeSessions": 0
  }'
```

### 14.3 创建会话并发送消息

```bash
# 1. 创建会话
curl -X POST 'https://api.claudehome.cn/internal/remote/sessions' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "machineId": "mac-pro-m3-001",
    "workspacePath": "/Users/john/projects/my-app",
    "model": "claude-opus-4-6",
    "systemPrompt": "You are a helpful coding assistant."
  }'

# 响应获得 sessionId

# 2. 发送消息
curl -X POST 'https://api.claudehome.cn/internal/remote/sessions/sess_abc123/messages' \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{
    "role": "user",
    "content": "帮我重构这个函数"
  }'
```

---

## 十五、常见问题 FAQ

### Q1: 模板市场 API 需要认证吗？

**A:** 不需要。`/api/v1/templates` 系列接口完全公开，无需 Token。

### Q2: 一个用户可以绑定多少台机器？

**A:** 目前无硬性限制，建议不超过 10 台。每台机器需要唯一的 `machineId`。

### Q3: Token 有效期多久？

**A:** `accessToken` 有效期 24 小时，`refreshToken` 有效期 30 天。建议在 Token 过期前 1 小时主动刷新。

### Q4: WebSocket 断线后如何重连？

**A:** 使用指数退避策略：首次 1 秒后重连，之后每次翻倍（最大 30 秒）。重连后需重新发送 `auth` 消息。

### Q5: 如何测试 API 是否可用？

**A:** 访问 `https://api.claudehome.cn/v1/templates?type=agents&limit=1`，返回 `{"success": true}` 即可用。

### Q6: 支持批量操作吗？

**A:** 目前不支持批量创建/删除。如有需求请联系技术支持。

### Q7: 文件操作有大小限制吗？

**A:** 单个文件读写建议不超过 10MB。大文件建议分块传输。

### Q8: 如何处理并发会话？

**A:** 一个机器可以同时运行多个会话，通过不同的 `sessionId` 区分。建议不超过 5 个并发会话。

---

## 十六、技术支持

- **文档地址：** https://www.claudehome.cn/docs
- **API 状态页：** https://api.claudehome.cn/internal/remote/status
- **问题反馈：** GitHub Issues 或联系技术支持
- **更新日志：** 见文档首页

---

## 十七、版本历史

### v2.0 (2026-03-03)
- ✅ 统一 Base URL 为 `https://api.claudehome.cn`
- ✅ 新增模板市场公开 API
- ✅ 完善错误码说明
- ✅ 新增快速开始示例
- ✅ 新增 FAQ 章节

### v1.0 (2026-02-26)
- 初始版本
- 基础认证、会话、文件操作 API

---

*文档由 CCJK Cloud 团队维护 | https://www.claudehome.cn*

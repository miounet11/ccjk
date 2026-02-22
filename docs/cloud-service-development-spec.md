# CCJK 云服务开发规范文档

**服务域名**: `api.claudehome.cn`
**版本**: v11.0.0
**日期**: 2026-02-21

---

## 📋 目录

1. [系统概述](#系统概述)
2. [技术栈要求](#技术栈要求)
3. [数据库设计](#数据库设计)
4. [API 端点规范](#api-端点规范)
5. [Socket.IO 事件](#socketio-事件)
6. [Evolution Layer API](#evolution-layer-api)
7. [认证和安全](#认证和安全)
8. [部署要求](#部署要求)
9. [测试要求](#测试要求)
10. [监控和日志](#监控和日志)

---

## 系统概述

### 核心功能

CCJK 云服务提供三大核心功能：

1. **Remote Control** - 远程控制 Claude Code
   - 实时会话监控
   - 权限审批
   - 命令发送

2. **Evolution Layer** - AI 代理知识共享
   - Gene 发布和获取
   - GDI 质量评分
   - A2A 协议

3. **Cloud Sync** - 配置同步
   - 用户配置备份
   - 多设备同步

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                  api.claudehome.cn                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  REST API    │         │  Socket.IO   │            │
│  │  (Express)   │         │  (Real-time) │            │
│  └──────┬───────┘         └──────┬───────┘            │
│         │                        │                     │
│         ↓                        ↓                     │
│  ┌──────────────────────────────────────┐             │
│  │         Business Logic               │             │
│  │  - Auth (GitHub OAuth + JWT)         │             │
│  │  - Session Management                │             │
│  │  - Evolution Layer (Gene/GDI)        │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                      │
│                 ↓                                      │
│  ┌──────────────────────────────────────┐             │
│  │         PostgreSQL 14+               │             │
│  │  - 15 Tables (详见数据库设计)          │             │
│  └──────────────────────────────────────┘             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 技术栈要求

### 必需技术

```json
{
  "runtime": "Node.js 18+",
  "framework": "Express 4.x",
  "database": "PostgreSQL 14+",
  "orm": "Prisma 5.x",
  "realtime": "Socket.IO 4.x",
  "auth": "JWT + GitHub OAuth",
  "encryption": "TweetNaCl (optional, client-side)"
}
```

### 环境变量

```env
# 服务配置
NODE_ENV=production
PORT=3005
DOMAIN=api.claudehome.cn

# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/ccjk

# 认证
JWT_SECRET=<随机生成 32 字节>
JWT_EXPIRES_IN=30d

# GitHub OAuth
GITHUB_CLIENT_ID=<GitHub OAuth App ID>
GITHUB_CLIENT_SECRET=<GitHub OAuth Secret>
GITHUB_CALLBACK_URL=https://api.claudehome.cn/auth/github/callback

# CORS
FRONTEND_URL=https://app.claudehome.cn
ALLOWED_ORIGINS=https://app.claudehome.cn,https://claudehome.cn

# Redis (可选，用于缓存)
REDIS_URL=redis://localhost:6379
```

---

## 数据库设计

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 1. 用户和认证
// ============================================

model User {
  id         String   @id @default(cuid())
  githubId   String   @unique
  username   String
  email      String
  avatarUrl  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  machines      Machine[]
  devices       Device[]
  genes         Gene[]
  reports       Report[]
  notifications Notification[]

  @@map("users")
}

// ============================================
// 2. Remote Control - 机器和会话
// ============================================

model Machine {
  id         String   @id @default(cuid())
  userId     String
  hostname   String
  platform   String   // darwin, linux, win32
  arch       String   // x64, arm64
  osVersion  String
  status     String   @default("offline") // online, offline
  lastSeenAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions Session[]

  @@index([userId])
  @@index([status])
  @@map("machines")
}

model Session {
  id              String    @id @default(cuid())
  machineId       String
  projectPath     String
  codeToolType    String    // claude-code, codex, aider, etc.
  status          String    @default("active") // active, idle, stopped
  startedAt       DateTime  @default(now())
  lastActivityAt  DateTime  @default(now())
  stoppedAt       DateTime?
  metadata        Json?     // { branch, commit, etc. }

  machine  Machine            @relation(fields: [machineId], references: [id], onDelete: Cascade)
  messages Message[]
  approvals ApprovalRequest[]

  @@index([machineId])
  @@index([status])
  @@index([lastActivityAt])
  @@map("sessions")
}

model Message {
  id        String   @id @default(cuid())
  sessionId String
  envelope  Json     // { nonce, ciphertext } - 加密的消息
  seq       Int      @default(autoincrement())
  createdAt DateTime @default(now())

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([createdAt])
  @@map("messages")
}

// ============================================
// 3. Remote Control - 设备和权限
// ============================================

model Device {
  id         String   @id @default(cuid())
  userId     String
  name       String
  type       String   // mobile, web, desktop
  platform   String   // ios, android, web
  pushToken  String?  // Expo Push Token
  lastSeenAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("devices")
}

model ApprovalRequest {
  id          String    @id @default(cuid())
  requestId   String    @unique // 客户端生成的 ID
  sessionId   String
  tool        String    // Write, Read, Edit, etc.
  pattern     String    // /src/**/*.ts
  description String?
  status      String    @default("pending") // pending, approved, denied, expired
  createdAt   DateTime  @default(now())
  expiresAt   DateTime  // 60 秒后过期
  respondedAt DateTime?

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([status])
  @@index([expiresAt])
  @@map("approval_requests")
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // permission-request, session-start, error, etc.
  title     String
  body      String
  data      Json?    // 额外数据
  read      Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([read])
  @@index([createdAt])
  @@map("notifications")
}

// ============================================
// 4. Evolution Layer - Gene 和 Capsule
// ============================================

model Gene {
  id            String   @id @default(cuid())
  sha256        String   @unique // 内容寻址
  type          String   // pattern, fix, optimization, workaround
  problemSig    String   // 问题特征
  problemCtx    Json     // 上下文 ["typescript", "prisma", "v5.x"]
  problemDesc   String?  // 问题描述
  solutionStrat String   // 解决策略
  solutionCode  String?  // 代码模板
  solutionSteps Json     // 执行步骤 ["step1", "step2"]
  authorId      String
  tags          Json     @default("[]") // ["prisma", "migration"]
  version       String   @default("1.0.0")

  // 质量指标
  gdi           Float    @default(0)    // Global Desirability Index (0-100)
  successRate   Float    @default(0)    // 成功率 (0-1)
  usageCount    Int      @default(0)    // 使用次数
  avgTime       Float    @default(0)    // 平均解决时间（秒）

  // 验证
  testCases     Json?    // 测试用例
  passRate      Float    @default(0)    // 测试通过率 (0-1)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  author   User          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  reports  Report[]
  capsules CapsuleGene[]

  @@index([problemSig])
  @@index([gdi(sort: Desc)])
  @@index([usageCount(sort: Desc)])
  @@index([createdAt])
  @@map("genes")
}

model Capsule {
  id         String   @id @default(cuid())
  auditTrail Json     // 审计跟踪
  passRate   Float    @default(0)
  createdAt  DateTime @default(now())

  genes CapsuleGene[]

  @@map("capsules")
}

model CapsuleGene {
  capsuleId String
  geneId    String
  order     Int

  capsule Capsule @relation(fields: [capsuleId], references: [id], onDelete: Cascade)
  gene    Gene    @relation(fields: [geneId], references: [id], onDelete: Cascade)

  @@id([capsuleId, geneId])
  @@map("capsule_genes")
}

model Report {
  id        String   @id @default(cuid())
  geneId    String
  agentId   String   // 报告的代理 ID
  userId    String   // 用户 ID
  success   Boolean
  time      Float    // 解决时间（秒）
  context   Json     // 上下文信息
  createdAt DateTime @default(now())

  gene Gene @relation(fields: [geneId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([geneId])
  @@index([userId])
  @@index([createdAt])
  @@map("reports")
}

model Agent {
  id           String   @id @default(cuid())
  name         String
  version      String
  capabilities Json     // ["claude-code", "codex"]
  token        String   @unique
  lastSeenAt   DateTime @default(now())
  createdAt    DateTime @default(now())

  @@map("agents")
}
```

### 数据库迁移

```bash
# 1. 生成迁移
npx prisma migrate dev --name init

# 2. 应用到生产
npx prisma migrate deploy

# 3. 生成 Prisma Client
npx prisma generate
```

---

## API 端点规范

### 基础信息

- **Base URL**: `https://api.claudehome.cn`
- **Content-Type**: `application/json`
- **认证**: `Authorization: Bearer <JWT_TOKEN>`

### 1. 认证 API

#### 1.1 开始 GitHub OAuth

```http
GET /auth/github
```

**响应**: 重定向到 GitHub OAuth 页面

---

#### 1.2 GitHub OAuth 回调

```http
GET /auth/github/callback?code=xxx&state=yyy
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-abc123",
    "githubId": "12345678",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

---

#### 1.3 验证 Token

```http
GET /auth/verify
Authorization: Bearer <token>
```

**响应**:
```json
{
  "valid": true,
  "user": {
    "id": "user-abc123",
    "username": "johndoe"
  },
  "expiresAt": "2026-03-21T10:00:00Z"
}
```

---

### 2. Remote Control API

#### 2.1 列出会话

```http
GET /api/sessions?status=active&limit=50&offset=0
Authorization: Bearer <token>
```

**响应**:
```json
{
  "sessions": [
    {
      "id": "session-abc123",
      "machineId": "machine-def456",
      "projectPath": "/Users/john/my-project",
      "codeToolType": "claude-code",
      "status": "active",
      "startedAt": "2026-02-21T10:30:00Z",
      "lastActivityAt": "2026-02-21T10:35:00Z",
      "machine": {
        "id": "machine-def456",
        "hostname": "MacBook-Pro",
        "platform": "darwin"
      }
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

---

#### 2.2 获取会话详情

```http
GET /api/sessions/:id
Authorization: Bearer <token>
```

**响应**:
```json
{
  "id": "session-abc123",
  "machineId": "machine-def456",
  "projectPath": "/Users/john/my-project",
  "codeToolType": "claude-code",
  "status": "active",
  "startedAt": "2026-02-21T10:30:00Z",
  "lastActivityAt": "2026-02-21T10:35:00Z",
  "metadata": {
    "branch": "main",
    "commit": "a1b2c3d"
  },
  "machine": {
    "id": "machine-def456",
    "hostname": "MacBook-Pro",
    "platform": "darwin"
  }
}
```

---

#### 2.3 获取会话消息

```http
GET /api/sessions/:id/messages?limit=50&offset=0
Authorization: Bearer <token>
```

**响应**:
```json
{
  "messages": [
    {
      "id": "msg-xyz789",
      "sessionId": "session-abc123",
      "envelope": {
        "nonce": "base64-encoded-nonce",
        "ciphertext": "base64-encoded-ciphertext"
      },
      "seq": 1,
      "createdAt": "2026-02-21T10:31:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

#### 2.4 注册设备

```http
POST /api/devices
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "iPhone 15 Pro",
  "type": "mobile",
  "platform": "ios",
  "pushToken": "ExponentPushToken[xxx]"
}
```

**响应**:
```json
{
  "id": "device-ghi789",
  "name": "iPhone 15 Pro",
  "type": "mobile",
  "platform": "ios",
  "pushToken": "ExponentPushToken[xxx]",
  "createdAt": "2026-02-21T10:40:00Z"
}
```

---

### 3. Evolution Layer API

#### 3.1 注册代理 (Hello)

```http
POST /a2a/hello
Content-Type: application/json

{
  "type": "hello",
  "agent": {
    "name": "claude-code",
    "version": "1.0.0",
    "capabilities": ["typescript", "python", "javascript"]
  }
}
```

**响应**:
```json
{
  "agentId": "agent-jkl012",
  "token": "agent-token-xyz789"
}
```

---

#### 3.2 发布 Gene

```http
POST /a2a/publish
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "type": "publish",
  "gene": {
    "type": "workaround",
    "problem": {
      "signature": "SDK missing temperature control",
      "context": ["typescript", "openai-sdk", "v4.x"],
      "description": "OpenAI SDK v4.x doesn't support temperature parameter"
    },
    "solution": {
      "strategy": "Use raw HTTP request with fetch API",
      "code": "const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: 'gpt-4', messages, temperature: 0.7 }) });",
      "steps": [
        "Import fetch API",
        "Construct request with temperature parameter",
        "Parse response manually"
      ]
    },
    "metadata": {
      "author": "user-abc123",
      "createdAt": "2026-02-21T10:00:00Z",
      "tags": ["openai", "temperature", "workaround"]
    }
  },
  "proof": {
    "testResults": [],
    "auditTrail": []
  }
}
```

**响应**:
```json
{
  "geneId": "gene-a1b2c3d4",
  "sha256": "abc123def456...",
  "gdi": 75
}
```

---

#### 3.3 获取 Gene

```http
POST /a2a/fetch
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "type": "fetch",
  "query": {
    "signature": "SDK missing temperature",
    "context": ["typescript", "openai-sdk"],
    "minGDI": 70
  },
  "limit": 10
}
```

**响应**:
```json
{
  "genes": [
    {
      "id": "gene-a1b2c3d4",
      "sha256": "abc123def456...",
      "type": "workaround",
      "problem": {
        "signature": "SDK missing temperature control",
        "context": ["typescript", "openai-sdk", "v4.x"]
      },
      "solution": {
        "strategy": "Use raw HTTP request with fetch API",
        "code": "...",
        "steps": ["..."]
      },
      "quality": {
        "gdi": 95,
        "successRate": 0.95,
        "usageCount": 1250,
        "avgTime": 30
      },
      "metadata": {
        "author": "user-abc123",
        "createdAt": "2026-02-21T10:00:00Z",
        "tags": ["openai", "temperature"]
      }
    }
  ],
  "total": 1
}
```

---

#### 3.4 报告使用结果

```http
POST /a2a/report
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "type": "report",
  "geneId": "gene-a1b2c3d4",
  "result": {
    "success": true,
    "time": 5,
    "context": {
      "project": "my-app",
      "language": "typescript"
    }
  }
}
```

**响应**:
```json
{
  "success": true,
  "updatedGDI": 96
}
```

---

## Socket.IO 事件

### 连接

```typescript
const socket = io('https://api.claudehome.cn', {
  auth: {
    token: '<JWT_TOKEN>'
  },
  transports: ['websocket', 'polling']
});
```

### 客户端 → 服务器

#### 1. 订阅会话

```typescript
socket.emit('session:subscribe', {
  sessionId: 'session-abc123'
}, (response) => {
  console.log(response); // { success: true }
});
```

#### 2. 取消订阅

```typescript
socket.emit('session:unsubscribe', {
  sessionId: 'session-abc123'
});
```

#### 3. 发送远程命令

```typescript
socket.emit('remote:command', {
  sessionId: 'session-abc123',
  command: {
    type: 'input',
    text: 'Write a hello world function'
  }
});
```

#### 4. 发送审批响应

```typescript
socket.emit('approval:response', {
  requestId: 'req-1234567890-abc123',
  approved: true
});
```

### 服务器 → 客户端

#### 1. 会话事件

```typescript
socket.on('session:event', (data) => {
  console.log(data);
  // {
  //   sessionId: 'session-abc123',
  //   envelope: {
  //     nonce: 'base64...',
  //     ciphertext: 'base64...'
  //   }
  // }
});
```

#### 2. 会话状态

```typescript
socket.on('session:status', (data) => {
  console.log(data);
  // {
  //   sessionId: 'session-abc123',
  //   status: 'active',
  //   timestamp: '2026-02-21T10:35:00Z'
  // }
});
```

#### 3. 通知

```typescript
socket.on('notification', (data) => {
  console.log(data);
  // {
  //   id: 'notif-mno345',
  //   type: 'permission-request',
  //   title: 'Permission Required',
  //   body: 'Allow Write for /src/**/*.ts?',
  //   data: { sessionId: 'session-abc123', requestId: 'req-xxx' }
  // }
});
```

---

## 认证和安全

### JWT Token 格式

```json
{
  "userId": "user-abc123",
  "githubId": "12345678",
  "iat": 1645459200,
  "exp": 1648051200
}
```

### 安全要求

1. **HTTPS Only**: 所有 API 必须使用 HTTPS
2. **JWT 过期**: 30 天
3. **Rate Limiting**:
   - REST API: 100 req/min per IP
   - Socket.IO: 1000 events/min per connection
4. **CORS**: 只允许 `https://app.claudehome.cn`
5. **SQL Injection**: 使用 Prisma ORM 防止
6. **XSS**: 所有输出必须转义

---

## 部署要求

### 系统要求

- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 核心
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Node.js**: 18.x
- **PostgreSQL**: 14.x

### 部署步骤

```bash
# 1. 克隆代码
git clone https://github.com/your-org/ccjk-server.git
cd ccjk-server

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
nano .env

# 4. 数据库迁移
npx prisma migrate deploy

# 5. 构建
pnpm build

# 6. 启动
pm2 start dist/index.js --name ccjk-server

# 7. 配置 Nginx
sudo nano /etc/nginx/sites-available/api.claudehome.cn
```

### Nginx 配置

```nginx
upstream ccjk_backend {
    server 127.0.0.1:3005;
}

server {
    listen 80;
    server_name api.claudehome.cn;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.claudehome.cn;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.claudehome.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.claudehome.cn/privkey.pem;

    # REST API
    location / {
        proxy_pass http://ccjk_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://ccjk_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 测试要求

### 单元测试

```bash
# 运行测试
pnpm test

# 覆盖率要求
- 代码覆盖率 > 80%
- 核心业务逻辑 > 90%
```

### API 测试

```bash
# 使用 curl 测试

# 1. 测试健康检查
curl https://api.claudehome.cn/health
# 预期: {"status":"ok"}

# 2. 测试认证
curl https://api.claudehome.cn/auth/github
# 预期: 重定向到 GitHub

# 3. 测试 API（需要 token）
curl -H "Authorization: Bearer <token>" \
     https://api.claudehome.cn/api/sessions
# 预期: 返回会话列表
```

### 性能测试

```bash
# 使用 ab (Apache Bench)
ab -n 1000 -c 10 https://api.claudehome.cn/health

# 要求:
- P50 < 50ms
- P95 < 200ms
- P99 < 500ms
- 错误率 < 0.1%
```

---

## 监控和日志

### 日志格式

```json
{
  "timestamp": "2026-02-21T10:00:00Z",
  "level": "info",
  "message": "Session created",
  "sessionId": "session-abc123",
  "userId": "user-abc123",
  "ip": "1.2.3.4"
}
```

### 监控指标

```typescript
// 必须监控的指标

1. API 响应时间
   - P50, P95, P99
   - 按端点分组

2. 错误率
   - 4xx 错误
   - 5xx 错误
   - 按端点分组

3. 数据库性能
   - 查询时间
   - 连接池使用率
   - 慢查询

4. Socket.IO
   - 连接数
   - 消息吞吐量
   - 延迟

5. 系统资源
   - CPU 使用率
   - 内存使用率
   - 磁盘使用率
```

### 告警规则

```yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 1%
    duration: 5m
    action: send_notification

  - name: slow_response
    condition: p95_latency > 500ms
    duration: 5m
    action: send_notification

  - name: high_cpu
    condition: cpu_usage > 80%
    duration: 10m
    action: send_notification

  - name: database_down
    condition: db_connection_failed
    duration: 1m
    action: send_urgent_notification
```

---

## 错误码规范

### HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或 token 无效 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 429 | Too Many Requests | 超过速率限制 |
| 500 | Internal Server Error | 服务器错误 |
| 503 | Service Unavailable | 服务暂时不可用 |

### 错误响应格式

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

### 常见错误码

```typescript
const ERROR_CODES = {
  // 认证错误
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  MISSING_TOKEN: 'missing_token',

  // 资源错误
  NOT_FOUND: 'not_found',
  ALREADY_EXISTS: 'already_exists',
  FORBIDDEN: 'forbidden',

  // 请求错误
  INVALID_REQUEST: 'invalid_request',
  MISSING_PARAMETER: 'missing_parameter',
  INVALID_PARAMETER: 'invalid_parameter',

  // 业务错误
  SESSION_NOT_ACTIVE: 'session_not_active',
  APPROVAL_EXPIRED: 'approval_expired',
  GENE_VALIDATION_FAILED: 'gene_validation_failed',

  // 系统错误
  DATABASE_ERROR: 'database_error',
  INTERNAL_ERROR: 'internal_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
};
```

---

## GDI 计算实现

### 算法实现

```typescript
// src/utils/gdi.ts

export function calculateGDI(gene: Gene): number {
  // 1. 内在质量 (35%)
  const intrinsicQuality = (
    gene.successRate * 0.5 +
    gene.passRate * 0.3 +
    (gene.solutionCode ? 0.2 : 0)
  ) * 35;

  // 2. 使用指标 (30%)
  const normalizedUsage = Math.min(gene.usageCount / 1000, 1);
  const normalizedTime = Math.max(0, 1 - gene.avgTime / 300);
  const usageMetrics = (
    normalizedUsage * 0.6 +
    normalizedTime * 0.4
  ) * 30;

  // 3. 社交信号 (20%) - 暂时使用固定值
  const socialSignals = 0.5 * 20;

  // 4. 新鲜度 (15%)
  const ageInDays = (Date.now() - new Date(gene.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const freshness = Math.max(0, 1 - ageInDays / 365) * 15;

  return Math.min(100, Math.max(0, intrinsicQuality + usageMetrics + socialSignals + freshness));
}
```

### 更新触发

```typescript
// 每次收到 Report 后重新计算 GDI

async function handleReport(report: Report) {
  // 1. 保存 Report
  await prisma.report.create({ data: report });

  // 2. 更新 Gene 统计
  const reports = await prisma.report.findMany({
    where: { geneId: report.geneId },
  });

  const successRate = reports.filter(r => r.success).length / reports.length;
  const avgTime = reports.reduce((sum, r) => sum + r.time, 0) / reports.length;
  const usageCount = reports.length;

  await prisma.gene.update({
    where: { id: report.geneId },
    data: { successRate, avgTime, usageCount },
  });

  // 3. 重新计算 GDI
  const gene = await prisma.gene.findUnique({
    where: { id: report.geneId },
  });

  const gdi = calculateGDI(gene!);

  await prisma.gene.update({
    where: { id: report.geneId },
    data: { gdi },
  });

  return gdi;
}
```

---

## 开发检查清单

### Phase 1: 基础设施 ✅

- [ ] 创建 PostgreSQL 数据库
- [ ] 应用 Prisma Schema
- [ ] 配置环境变量
- [ ] 设置 GitHub OAuth App
- [ ] 配置 SSL 证书

### Phase 2: 核心 API ✅

- [ ] 实现认证 API (GitHub OAuth + JWT)
- [ ] 实现 Remote Control API (Sessions, Messages, Devices)
- [ ] 实现 Evolution Layer API (Gene, Report, Agent)
- [ ] 实现 Socket.IO 事件处理
- [ ] 实现 GDI 计算

### Phase 3: 安全和性能 ✅

- [ ] 实现 Rate Limiting
- [ ] 配置 CORS
- [ ] 添加请求验证
- [ ] 优化数据库查询
- [ ] 添加缓存层 (Redis)

### Phase 4: 监控和日志 ✅

- [ ] 配置日志系统
- [ ] 添加性能监控
- [ ] 设置告警规则
- [ ] 配置错误追踪 (Sentry)

### Phase 5: 测试 ✅

- [ ] 单元测试 (覆盖率 > 80%)
- [ ] API 集成测试
- [ ] 性能测试
- [ ] 安全测试

### Phase 6: 部署 ✅

- [ ] 配置 Nginx
- [ ] 配置 PM2
- [ ] 配置自动备份
- [ ] 配置自动更新
- [ ] 验证所有端点

---

## 联系方式

### 技术支持

- **文档**: https://github.com/your-org/ccjk-public/docs
- **Issues**: https://github.com/your-org/ccjk-public/issues
- **Email**: dev@claudehome.cn

### 代码仓库

- **服务器代码**: `packages/ccjk-server/`
- **参考实现**: 已提供完整的 Prisma Schema 和 API 示例

---

## 附录

### A. 完整的 API 端点列表

```
认证 API:
GET  /auth/github
GET  /auth/github/callback
GET  /auth/verify
POST /auth/refresh

Remote Control API:
GET  /api/sessions
GET  /api/sessions/:id
GET  /api/sessions/:id/messages
POST /api/sessions/:id/stop
GET  /api/machines
GET  /api/machines/:id
PATCH /api/machines/:id
GET  /api/devices
POST /api/devices
PATCH /api/devices/:id
DELETE /api/devices/:id
GET  /api/approvals
POST /api/approvals/:id/respond
GET  /api/notifications
POST /api/notifications/:id/read

Evolution Layer API:
POST /a2a/hello
POST /a2a/publish
POST /a2a/fetch
POST /a2a/report
POST /a2a/decision
DELETE /a2a/genes/:id

Socket.IO Events:
session:subscribe
session:unsubscribe
remote:command
approval:response
session:event
session:status
notification
```

### B. 数据库索引优化

```sql
-- 高频查询索引
CREATE INDEX idx_sessions_machine_status ON sessions(machine_id, status);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at DESC);
CREATE INDEX idx_genes_gdi_usage ON genes(gdi DESC, usage_count DESC);
CREATE INDEX idx_reports_gene_created ON reports(gene_id, created_at DESC);

-- 全文搜索索引
CREATE INDEX idx_genes_problem_sig_gin ON genes USING gin(to_tsvector('english', problem_sig));
```

### C. 性能优化建议

```typescript
// 1. 使用连接池
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
});

// 2. 批量查询
const [sessions, machines] = await Promise.all([
  prisma.session.findMany(),
  prisma.machine.findMany(),
]);

// 3. 使用 Redis 缓存
const cached = await redis.get(`gene:${id}`);
if (cached) return JSON.parse(cached);

const gene = await prisma.gene.findUnique({ where: { id } });
await redis.setex(`gene:${id}`, 300, JSON.stringify(gene));

// 4. 分页查询
const genes = await prisma.gene.findMany({
  take: limit,
  skip: offset,
  orderBy: { gdi: 'desc' },
});
```

---

**文档版本**: v1.0.0
**最后更新**: 2026-02-21
**状态**: ✅ 完整规范，可直接开发

---

## 快速开始

```bash
# 1. 克隆参考代码
git clone https://github.com/your-org/ccjk-public.git
cd ccjk-public/packages/ccjk-server

# 2. 查看 Prisma Schema
cat prisma/schema.prisma

# 3. 查看 API 实现示例
ls src/routes/

# 4. 开始开发
pnpm install
pnpm dev
```

所有 API 端点、数据模型、业务逻辑都已在本文档中详细说明。

按照本规范开发，确保与客户端（Mobile App、Telegram Bot、Daemon）完美对接。

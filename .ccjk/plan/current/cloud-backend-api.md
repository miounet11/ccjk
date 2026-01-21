# CCJK Cloud Backend API Specification
## 云服务后端 API 需求规范

**Version**: 1.0.0
**Target**: api.claudehome.cn
**Purpose**: Support CCJK Remote Control (Daemon) functionality
**Date**: 2026-01-20

---

## 📋 目录

1. [系统概述](#系统概述)
2. [架构设计](#架构设计)
3. [API 规范](#api-规范)
4. [数据模型](#数据模型)
5. [安全规范](#安全规范)
6. [部署指南](#部署指南)

---

## 系统概述

### 核心功能

CCJK Cloud Backend 为远程控制功能提供云端支持，主要包括：

1. **Daemon 管理**: 注册、激活、状态同步
2. **任务调度**: 任务队列、执行追踪、结果通知
3. **消息服务**: 邮件/WebSocket 通知
4. **用户管理**: 认证、设备管理、权限控制
5. **数据同步**: 配置备份、日志上传

### 服务边界

```
┌─────────────────────────────────────────────────────────────────┐
│                      CCJK Cloud Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Client Side                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   CLI Tool  │  │   Daemon    │  │  Web Panel  │      │   │
│  │  │   (ccjk)    │  │ (background)│  │  (future)   │      │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │   │
│  └─────────┼─────────────────┼─────────────────┼────────────┘   │
│            │                 │                 │                 │
│            │   HTTPS/WSS     │                 │                 │
│            ▼                 ▼                 ▼                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   api.claudehome.cn                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   Auth API  │  │  Daemon API │  │  Task API   │      │   │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤      │   │
│  │  │   User API  │  │  Message API│  │  Config API │      │   │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤      │   │
│  │  │ Device API   │  │  Log API    │  │  Stats API  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│            │                 │                 │                 │
│  ┌─────────┼─────────────────┼─────────────────┼────────────┐   │
│  │         ▼                 ▼                 ▼            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   PostgreSQL│  │     Redis   │  │  S3/MinIO   │      │   │
│  │  │   (Main DB) │  │   (Cache)   │  │  (Storage)  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                              │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 架构设计

### 技术栈推荐

| 组件 | 推荐技术 | 说明 |
|------|----------|------|
| **Runtime** | Node.js 20+ / Bun | 与 CCJK 保持一致 |
| **Framework** | Hono / Fastify | 轻量、高性能 |
| **Database** | PostgreSQL 15+ | 主数据存储 |
| **Cache** | Redis 7+ | 会话、任务队列 |
| **Queue** | BullMQ / Celery | 任务调度 |
| **Storage** | MinIO / S3 | 日志、备份存储 |
| **Email** | Postfix / AWS SES | 邮件发送 |
| **Realtime** | Socket.IO / WebSocket | 实时通信 |

### 数据库设计

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    storage_quota BIGINT DEFAULT 1073741824, -- 1GB default
    storage_used BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- 设备表 (Daemon 实例)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_id VARCHAR(100) UNIQUE NOT NULL, -- 机器唯一标识
    os_type VARCHAR(50), -- darwin, linux, windows, termux
    os_version VARCHAR(50),
    arch VARCHAR(20), -- x64, arm64
    ccjk_version VARCHAR(20),
    daemon_status VARCHAR(20) DEFAULT 'offline', -- online, offline, busy, error
    last_heartbeat TIMESTAMP,
    last_sync TIMESTAMP,
    ip_address INET,
    location VARCHAR(100), -- 城市/地区
    metadata JSONB, -- 额外系统信息
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_device_user (user_id),
    INDEX idx_device_status (daemon_status),
    INDEX idx_device_heartbeat (last_heartbeat)
);

-- 任务表
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    task_type VARCHAR(50) NOT NULL, -- bash, workflow, custom
    command TEXT NOT NULL,
    args JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, queued, running, completed, failed, cancelled
    priority INTEGER DEFAULT 5, -- 1-10, 10 highest
    timeout_seconds INTEGER DEFAULT 300,
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,

    -- 执行结果
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- 元数据
    source VARCHAR(50) DEFAULT 'api', -- api, email, web, cli
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_task_user (user_id),
    INDEX idx_task_device (device_id),
    INDEX idx_task_status (status),
    INDEX idx_task_created (created_at DESC)
);

-- 邮件配置表
CREATE TABLE email_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    imap_host VARCHAR(255),
    imap_port INTEGER,
    imap_secure BOOLEAN DEFAULT true,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_secure BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_email_user (user_id),
    INDEX idx_email_device (device_id)
);

-- 消息队列表 (任务通知)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL, -- task_created, task_completed, task_failed, device_online, etc.
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    sent_via_email BOOLEAN DEFAULT false,
    sent_via_push BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_message_user (user_id),
    INDEX idx_message_read (read),
    INDEX idx_message_created (created_at DESC)
);

-- 配置备份表
CREATE TABLE config_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    config_name VARCHAR(100) NOT NULL,
    config_data JSONB NOT NULL,
    is_auto BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_backup_user (user_id),
    INDEX idx_backup_device (device_id),
    INDEX idx_backup_created (created_at DESC)
);

-- 会话表
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_session_user (user_id),
    INDEX idx_session_token (token),
    INDEX idx_session_expires (expires_at)
);

-- API 密钥表
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[], -- ['daemon:read', 'daemon:write', 'task:execute']
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_apikey_user (user_id),
    INDEX idx_apikey_hash (key_hash)
);

-- 统计表
CREATE TABLE statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    stat_date DATE NOT NULL,
    stat_type VARCHAR(50) NOT NULL, -- tasks_completed, tasks_failed, execution_time, etc.
    stat_value BIGINT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_id, stat_date, stat_type),
    INDEX idx_stat_user (user_id),
    INDEX idx_stat_device (device_id),
    INDEX idx_stat_date (stat_date DESC)
);
```

---

## API 规范

### 通用规范

**Base URL**: `https://api.claudehome.cn/v1`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
X-Device-ID: <device_id>
```

**响应格式**:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

---

### 1. 认证 API (`/auth`)

#### 1.1 用户注册

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "display_name": "John Doe"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe",
      "plan": "free",
      "is_verified": false
    },
    "token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### 1.2 用户登录

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### 1.3 刷新令牌

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token"
}
```

#### 1.4 用户登出

```http
POST /auth/logout
Authorization: Bearer <token>
```

#### 1.5 获取当前用户信息

```http
GET /auth/me
Authorization: Bearer <token>
```

---

### 2. Daemon API (`/daemon`)

#### 2.1 注册设备 (Daemon 激活)

```http
POST /daemon/register
Authorization: Bearer <token>
X-Device-ID: <device_id>

{
  "device_name": "MacBook Pro",
  "os_type": "darwin",
  "os_version": "23.1.0",
  "arch": "arm64",
  "ccjk_version": "3.7.0"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "device_id": "uuid",
    "device_key": "device_api_key",
    "config": {
      "heartbeat_interval": 30,
      "task_check_interval": 10,
      "log_upload_enabled": true,
      "max_concurrent_tasks": 3
    }
  }
}
```

#### 2.2 心跳上报

```http
POST /daemon/heartbeat
Authorization: Bearer <device_token>
X-Device-ID: <device_id>

{
  "status": "online",
  "current_tasks": ["task_id_1", "task_id_2"],
  "system_info": {
    "cpu_usage": 25.5,
    "memory_usage": 45.2,
    "disk_usage": 60.0
  }
}
```

#### 2.3 获取待执行任务

```http
GET /daemon/tasks/pending?limit=10
Authorization: Bearer <device_token>
X-Device-ID: <device_id>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_uuid",
        "type": "bash",
        "command": "npm test",
        "args": {
          "cwd": "/path/to/project",
          "timeout": 60000
        },
        "priority": 5,
        "max_retries": 3,
        "created_at": "2026-01-20T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

#### 2.4 上报任务结果

```http
POST /daemon/tasks/:task_id/result
Authorization: Bearer <device_token>
X-Device-ID: <device_id>

{
  "status": "completed",
  "exit_code": 0,
  "stdout": "output...",
  "stderr": "",
  "started_at": "2026-01-20T10:01:00Z",
  "completed_at": "2026-01-20T10:01:30Z"
}
```

#### 2.5 上传日志

```http
POST /daemon/logs
Authorization: Bearer <device_token>
Content-Type: multipart/form-data

log_file: <binary>
metadata: {
  "type": "daemon",
  "date": "2026-01-20",
  "compressed": true
}
```

#### 2.6 同步配置

```http
GET /daemon/config/sync
Authorization: Bearer <device_token>
```

#### 2.7 设备下线

```http
POST /daemon/offline
Authorization: Bearer <device_token>
X-Device-ID: <device_id>
```

---

### 3. 任务 API (`/tasks`)

#### 3.1 创建任务

```http
POST /tasks
Authorization: Bearer <user_token>

{
  "device_id": "device_uuid",
  "type": "bash",
  "command": "npm run build",
  "args": {
    "cwd": "/project/path",
    "env": {
      "NODE_ENV": "production"
    }
  },
  "priority": 7,
  "timeout": 300000
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "task_id": "uuid",
    "status": "queued",
    "estimated_start": "2026-01-20T10:02:00Z"
  }
}
```

#### 3.2 获取任务状态

```http
GET /tasks/:task_id
Authorization: Bearer <user_token>
```

#### 3.3 列出任务

```http
GET /tasks?status=completed&limit=20&offset=0
Authorization: Bearer <user_token>
```

#### 3.4 取消任务

```http
POST /tasks/:task_id/cancel
Authorization: Bearer <user_token>
```

#### 3.5 重试任务

```http
POST /tasks/:task_id/retry
Authorization: Bearer <user_token>
```

#### 3.6 批量创建任务

```http
POST /tasks/batch
Authorization: Bearer <user_token>

{
  "tasks": [
    {
      "device_id": "device_uuid",
      "type": "bash",
      "command": "npm test",
      "priority": 5
    },
    {
      "device_id": "device_uuid",
      "type": "bash",
      "command": "npm run lint",
      "priority": 5
    }
  ],
  "mode": "parallel" -- parallel | sequential
}
```

---

### 4. 设备 API (`/devices`)

#### 4.1 列出设备

```http
GET /devices
Authorization: Bearer <user_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "uuid",
        "device_name": "MacBook Pro",
        "os_type": "darwin",
        "ccjk_version": "3.7.0",
        "daemon_status": "online",
        "last_heartbeat": "2026-01-20T10:00:00Z",
        "current_tasks": 2
      }
    ]
  }
}
```

#### 4.2 获取设备详情

```http
GET /devices/:device_id
Authorization: Bearer <user_token>
```

#### 4.3 更新设备配置

```http
PATCH /devices/:device_id/config
Authorization: Bearer <user_token>

{
  "heartbeat_interval": 60,
  "max_concurrent_tasks": 5
}
```

#### 4.4 删除设备

```http
DELETE /devices/:device_id
Authorization: Bearer <user_token>
```

---

### 5. 邮件 API (`/email`)

#### 5.1 配置邮件服务

```http
POST /email/config
Authorization: Bearer <user_token>

{
  "device_id": "device_uuid",
  "email_address": "user@gmail.com",
  "imap_host": "imap.gmail.com",
  "imap_port": 993,
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587
}
```

#### 5.2 获取邮件配置

```http
GET /email/config/:device_id
Authorization: Bearer <user_token>
```

#### 5.3 发送测试邮件

```http
POST /email/test
Authorization: Bearer <user_token>

{
  "device_id": "device_uuid"
}
```

#### 5.4 通过邮件创建任务 (Webhook)

```http
POST /email/incoming
X-Email-Signature: <hmac_signature>

{
  "from": "user@gmail.com",
  "subject": "[CCJK] Run Tests",
  "body": "npm test",
  "message_id": "email_message_id"
}
```

---

### 6. 消息 API (`/messages`)

#### 6.1 获取消息列表

```http
GET /messages?unread=true&limit=20
Authorization: Bearer <user_token>
```

#### 6.2 标记消息已读

```http
POST /messages/:message_id/read
Authorization: Bearer <user_token>
```

#### 6.3 标记所有消息已读

```http
POST /messages/read-all
Authorization: Bearer <user_token>
```

#### 6.4 删除消息

```http
DELETE /messages/:message_id
Authorization: Bearer <user_token>
```

---

### 7. 配置 API (`/config`)

#### 7.1 备份配置

```http
POST /config/backup
Authorization: Bearer <user_token>

{
  "device_id": "device_uuid",
  "config_name": "claude-code-config",
  "config_data": {...}
}
```

#### 7.2 获取配置列表

```http
GET /config/backups?device_id=device_uuid
Authorization: Bearer <user_token>
```

#### 7.3 恢复配置

```http
POST /config/restore/:backup_id
Authorization: Bearer <user_token>
```

#### 7.4 删除备份

```http
DELETE /config/backups/:backup_id
Authorization: Bearer <user_token>
```

---

### 8. 统计 API (`/stats`)

#### 8.1 获取用户统计

```http
GET /stats/summary?period=7d
Authorization: Bearer <user_token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks_completed": 125,
    "tasks_failed": 3,
    "total_execution_time": 4500,
    "devices_online": 3,
    "storage_used": 524288000,
    "daily_breakdown": [
      {"date": "2026-01-14", "count": 15},
      {"date": "2026-01-15", "count": 18},
      ...
    ]
  }
}
```

#### 8.2 获取设备统计

```http
GET /stats/device/:device_id?period=30d
Authorization: Bearer <user_token>
```

---

### 9. WebSocket API (`/ws`)

#### 连接

```
wss://api.claudehome.cn/v1/ws?token=<jwt_token>
```

#### 事件类型

**客户端 → 服务器**:
```javascript
// 心跳
{ "type": "ping", "timestamp": "..." }

// 订阅设备更新
{ "type": "subscribe", "channel": "device:device_uuid" }

// 订阅任务更新
{ "type": "subscribe", "channel": "task:task_uuid" }
```

**服务器 → 客户端**:
```javascript
// 设备上线
{
  "type": "device.online",
  "data": { "device_id": "...", "timestamp": "..." }
}

// 设备离线
{
  "type": "device.offline",
  "data": { "device_id": "...", "timestamp": "..." }
}

// 任务状态更新
{
  "type": "task.updated",
  "data": {
    "task_id": "...",
    "status": "running",
    "progress": 50
  }
}

// 任务完成
{
  "type": "task.completed",
  "data": {
    "task_id": "...",
    "exit_code": 0,
    "stdout": "..."
  }
}

// 新消息
{
  "type": "message.new",
  "data": {
    "message_id": "...",
    "title": "...",
    "content": "..."
  }
}
```

---

## 数据模型

### 任务状态枚举

```typescript
enum TaskStatus {
  PENDING = 'pending',      // 待处理
  QUEUED = 'queued',        // 已排队
  ASSIGNED = 'assigned',    // 已分配
  RUNNING = 'running',      // 执行中
  COMPLETED = 'completed',  // 已完成
  FAILED = 'failed',        // 失败
  CANCELLED = 'cancelled',  // 已取消
  TIMEOUT = 'timeout'       // 超时
}

enum TaskType {
  BASH = 'bash',           // 命令执行
  WORKFLOW = 'workflow',   // 工作流
  CUSTOM = 'custom'        // 自定义任务
}
```

### 设备状态枚举

```typescript
enum DeviceStatus {
  ONLINE = 'online',        // 在线
  OFFLINE = 'offline',      // 离线
  BUSY = 'busy',           // 忙碌
  ERROR = 'error',         // 错误
  MAINTENANCE = 'maintenance' // 维护中
}
```

### 用户计划枚举

```typescript
enum UserPlan {
  FREE = 'free',           // 免费版
  PRO = 'pro',             // 专业版
  ENTERPRISE = 'enterprise' // 企业版
}
```

### 配额限制

| 资源 | Free | Pro | Enterprise |
|------|------|-----|------------|
| 设备数量 | 1 | 5 | 无限 |
| 任务/天 | 10 | 100 | 无限 |
| 并发任务 | 1 | 3 | 10 |
| 存储空间 | 1GB | 10GB | 100GB |
| 日志保留 | 7天 | 30天 | 90天 |
| API 调用/分钟 | 10 | 100 | 1000 |

---

## 安全规范

### 认证方式

1. **JWT 认证** (用户 API)
   - Access Token: 15 分钟有效期
   - Refresh Token: 30 天有效期

2. **API Key** (Daemon 认证)
   - 设备注册时生成
   - 无过期时间，可撤销
   - 绑定特定设备

3. **HMAC 签名** (邮件 Webhook)
   - 使用共享密钥
   - SHA256 签名

### 权限范围 (Scopes)

| Scope | 描述 |
|-------|------|
| `user:read` | 读取用户信息 |
| `user:write` | 修改用户信息 |
| `device:read` | 读取设备信息 |
| `device:write` | 管理设备 |
| `task:create` | 创建任务 |
| `task:read` | 读取任务状态 |
| `task:cancel` | 取消任务 |
| `task:admin` | 管理所有任务 |
| `config:read` | 读取配置 |
| `config:write` | 修改配置 |
| `log:read` | 读取日志 |
| `stats:read` | 读取统计 |

### 速率限制

```
用户 API:    100 请求/分钟
Daemon API:  1000 请求/分钟
Email Webhook: 10 请求/分钟
WebSocket:   100 消息/分钟
```

---

## 部署指南

### Docker Compose 配置

```yaml
version: '3.8'

services:
  api:
    image: claudehome/ccjk-api:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/ccjk
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - AWS_S3_BUCKET=${S3_BUCKET}
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=ccjk
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=ccjk

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  worker:
    image: claudehome/ccjk-worker:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/ccjk
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  email:
    image: claudehome/ccjk-email:latest
    environment:
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
    ports:
      - "25:25"

volumes:
  postgres_data:
  redis_data:
```

### 环境变量

```bash
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/ccjk

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# 存储
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=ccjk-logs
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# 邮件
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=xxx

# 速率限制
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# 日志
LOG_LEVEL=info
LOG_FORMAT=json

# 功能开关
ENABLE_WEBSOCKET=true
ENABLE_EMAIL_SERVICE=true
ENABLE_LOG_UPLOAD=true
```

---

## 监控指标

### 关键指标

1. **API 性能**
   - 响应时间 (P50, P95, P99)
   - 错误率
   - QPS

2. **任务指标**
   - 任务排队时间
   - 任务执行时间
   - 任务成功率
   - 任务重试率

3. **设备指标**
   - 在线设备数
   - 心跳延迟
   - 设备分布

4. **系统资源**
   - CPU 使用率
   - 内存使用率
   - 数据库连接数
   - Redis 内存使用

### 告警规则

| 指标 | 阈值 | 级别 |
|------|------|------|
| API 错误率 | > 5% | P1 |
| API 响应时间 | > 1s (P95) | P2 |
| 任务队列积压 | > 100 | P2 |
| 数据库连接数 | > 80% | P1 |
| Redis 内存 | > 90% | P1 |
| 设备离线率 | > 20% | P3 |

---

## 版本计划

### v1.0.0 (MVP)
- [x] 用户认证
- [x] 设备管理
- [x] 任务创建和执行
- [x] 基础通知

### v1.1.0 (增强)
- [ ] WebSocket 实时通信
- [ ] 任务调度 (cron)
- [ ] 批量任务优化
- [ ] 日志在线查看

### v1.2.0 (企业)
- [ ] 团队协作
- [ ] 权限管理
- [ ] 审计日志
- [ ] SSO 集成

### v2.0.0 (平台)
- [ ] Web 控制面板
- [ ] 移动端应用
- [ ] 插件市场
- [ ] 多云支持

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-20
**维护者**: CCJK Team

# CCJK Cloud Backend - Lightweight Edition
## 云服务后端需求规范 (轻量版)

**Version**: 2.0.0 (Lite)
**Target**: api.claudehome.cn
**Philosophy: 简单、够用、易维护**

---

## 🎯 核心原则

1. **功能完整但不过度** - 只做必要的，不做 Nice-to-have
2. **单体架构** - 一个应用搞定，不拆微服务
3. **最小依赖** - 能用简单的就不用复杂的
4. **快速迭代** - 2周上线，不是12周

---

## 📦 简化架构

```
┌─────────────────────────────────────────────────────────┐
│                    CCJK Cloud (Lite)                     │
├─────────────────────────────────────────────────────────┤
│
│  ┌───────────────────────────────────────────────────┐  │
│  │              Single Node.js App                   │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │   Auth   │  │  Daemon  │  │  Task    │        │  │
│  │  │   API    │  │   API    │  │   API    │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │  Email   │  │  Config  │  │  Stats   │        │  │
│  │  │  Service │  │  Backup  │  │   API    │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              SQLite / PostgreSQL                  │  │
│  │              (单文件 / 单实例)                     │  │
│  └───────────────────────────────────────────────────┘  │
│
└─────────────────────────────────────────────────────────┘
```

**不需要**:
- ❌ Redis (内存缓存不是必需)
- ❌ 消息队列 BullMQ (直接异步处理)
- ❌ MinIO/S3 (日志可选，不强制)
- ❌ Prometheus/Grafana (简单日志就够了)
- ❌ WebSocket (初期不需要)
- ❌ 微服务拆分

---

## 🗄️ 简化数据库设计

### 核心表 (只需 5 张)

```sql
-- 1. 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    device_key TEXT UNIQUE NOT NULL,  -- Daemon 认证用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat DATETIME
);

-- 2. 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,  -- UUID
    user_id INTEGER NOT NULL,
    device_key TEXT NOT NULL,

    -- 任务信息
    command TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, running, completed, failed

    -- 执行结果
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,

    -- 时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,

    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_device ON tasks(device_key);

-- 3. 邮件配置表 (可选，本地存储)
CREATE TABLE email_configs (
    user_id INTEGER PRIMARY KEY,
    email_address TEXT NOT NULL,
    imap_host TEXT,
    imap_port INTEGER,
    smtp_host TEXT,
    smtp_port INTEGER,
    password_encrypted TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. 配置备份表
CREATE TABLE config_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,  -- JSON 格式存储
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. 统计缓存表 (可选)
CREATE TABLE stats_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,  -- JSON
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**就这 5 张表，够用了！**

---

## 📡 API 规范 (精简版)

### Base URL
```
https://api.claudehome.cn
```

### 通用响应格式
```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

---

### 1. 用户认证 (2 个接口)

#### 注册/登录合并
```http
POST /auth
{
  "email": "user@example.com",
  "password": "xxx"
}

→ {
  "ok": true,
  "data": {
    "device_key": "ccjk_xxx",  // Daemon 认证用，唯一标识
    "user_id": 123
  }
}
```

#### 验证 Device Key
```http
GET /auth/verify?device_key=ccjk_xxx

→ { "ok": true, "data": { "valid": true, "user_id": 123 } }
```

---

### 2. Daemon 管理 (3 个接口)

#### 注册设备 / 心跳
```http
POST /daemon/heartbeat
Headers: { "X-Device-Key": "ccjk_xxx" }

{
  "status": "online",  // online, busy, offline
  "os": "darwin",
  "version": "3.7.0"
}

→ { "ok": true, "data": { "pending_tasks": [] } }
```

#### 获取待执行任务
```http
GET /daemon/tasks
Headers: { "X-Device-Key": "ccjk_xxx" }

→ {
  "ok": true,
  "data": {
    "tasks": [
      { "id": "uuid", "command": "npm test", "timeout": 60000 }
    ]
  }
}
```

#### 上报任务结果
```http
POST /daemon/tasks/:id/result
Headers: { "X-Device-Key": "ccjk_xxx" }

{
  "status": "completed",
  "exit_code": 0,
  "stdout": "...",
  "stderr": ""
}

→ { "ok": true }
```

---

### 3. 任务管理 (4 个接口)

#### 创建任务
```http
POST /tasks
Headers: { "X-Device-Key": "ccjk_xxx" }

{
  "command": "npm run build",
  "timeout": 300000,
  "cwd": "/path/to/project"
}

→ {
  "ok": true,
  "data": { "task_id": "uuid", "status": "pending" }
}
```

#### 查询任务状态
```http
GET /tasks/:id
Headers: { "X-Device-Key": "ccjk_xxx" }

→ {
  "ok": true,
  "data": {
    "id": "uuid",
    "command": "npm run build",
    "status": "completed",
    "exit_code": 0,
    "stdout": "...",
    "stderr": "",
    "created_at": "2026-01-20T10:00:00Z",
    "completed_at": "2026-01-20T10:01:00Z"
  }
}
```

#### 列出任务
```http
GET /tasks?limit=20&status=completed
Headers: { "X-Device-Key": "ccjk_xxx" }
```

#### 取消任务
```http
POST /tasks/:id/cancel
Headers: { "X-Device-Key": "ccjk_xxx" }
```

---

### 4. 邮件服务 (2 个接口)

#### 配置邮件
```http
POST /email/config
Headers: { "X-Device-Key": "ccjk_xxx" }

{
  "email": "user@gmail.com",
  "imap_host": "imap.gmail.com",
  "smtp_host": "smtp.gmail.com",
  "password": "app_password"
}

→ { "ok": true }
```

#### 发送邮件通知 (云端调用)
```http
POST /email/send
{ "to": "user@gmail.com", "subject": "...", "body": "..." }
```

---

### 5. 配置备份 (3 个接口)

#### 保存配置
```http
POST /config/backup
Headers: { "X-Device-Key": "ccjk_xxx" }

{
  "name": "claude-code-config",
  "config": { ... }
}

→ { "ok": true, "data": { "backup_id": 123 } }
```

#### 获取备份列表
```http
GET /config/backups
Headers: { "X-Device-Key": "ccjk_xxx" }
```

#### 恢复配置
```http
POST /config/restore/:id
Headers: { "X-Device-Key": "ccjk_xxx" }
```

---

### 6. 统计 (1 个接口)

#### 获取统计
```http
GET /stats?period=7d
Headers: { "X-Device-Key": "ccjk_xxx" }

→ {
  "ok": true,
  "data": {
    "tasks_completed": 100,
    "tasks_failed": 5,
    "uptime_hours": 168
  }
}
```

---

## 🛠️ 技术栈 (最简)

```yaml
Runtime: Node.js 18+ (LTS)
Framework: Express.js / Hono
Database: SQLite (开发) / PostgreSQL (生产)
ORM: better-sqlite3 / Prisma
Email: Nodemailer
Auth: 简单的 Device Key 机制
Deploy: 单个 Docker 容器
```

---

## 📦 项目结构

```
ccjk-cloud/
├── src/
│   ├── index.ts           # 入口
│   ├── db.ts              # 数据库连接
│   ├── routes/            # 路由
│   │   ├── auth.ts
│   │   ├── daemon.ts
│   │   ├── tasks.ts
│   │   ├── email.ts
│   │   ├── config.ts
│   │   └── stats.ts
│   ├── services/          # 业务逻辑
│   │   ├── email.ts
│   │   └── task.ts
│   └── middleware/        # 中间件
│       ├── auth.ts
│       └── error.ts
├── prisma/
│   └── schema.prisma      # 数据库模型
├── Dockerfile
└── package.json
```

**核心代码量估算**: ~1500 行

---

## 🚀 部署方案

### Docker Compose (单文件)

```yaml
version: '3.8'

services:
  api:
    image: claudehome/ccjk-cloud:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/ccjk.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### 或直接 Node.js 部署

```bash
# 服务器上
git clone repo
npm install --production
npm run build
npm start  # 使用 PM2 保持运行
```

---

## 💰 成本 (极简)

| 项目 | 方案 | 月成本 |
|------|------|--------|
| 服务器 | 阿里云/腾讯云 1核2GB | ¥30 |
| 域名 | 已有 | ¥0 |
| SSL | Let's Encrypt 免费 | ¥0 |
| 邮件 | 用户自配 | ¥0 |
| **总计** | | **¥30/月** |

**年成本仅 ¥360！**

---

## 📅 开发时间表 (2周)

### Week 1: 核心功能

| Day | 任务 |
|-----|------|
| 1-2 | 项目搭建、数据库设计 |
| 3-4 | Auth API + Daemon API |
| 5 | Task API |

### Week 2: 完善与测试

| Day | 任务 |
|-----|------|
| 1-2 | Email Service + Config API |
| 3-4 | 测试、修复 |
| 5 | 部署上线 |

---

## ✅ 最小可行产品 (MVP) 功能

### 第一期 (2周)

- [x] 用户注册/登录 (返回 device_key)
- [x] Daemon 心跳与任务获取
- [x] 任务创建与执行
- [x] 任务结果上报
- [x] 基础邮件通知

### 第二期 (可选，+1周)

- [ ] Web 控制面板 (超简单)
- [ ] 配置备份/恢复
- [ ] 统计数据
- [ ] 日志查看

### 不做 (暂时)

- ❌ WebSocket (用 HTTP 轮询代替)
- ❌ 复杂权限 (单用户模式)
- ❌ 团队协作 (暂时不需要)
- ❌ 审计日志 (简单日志即可)
- ❌ Webhook (邮件通知够了)

---

## 🎯 为什么这个方案更好

| 对比项 | 重型方案 | 轻型方案 |
|--------|----------|----------|
| 开发时间 | 12周 | 2周 |
| 数据库表 | 15张 | 5张 |
| API 端点 | 50+ | 15个 |
| 服务器 | 5台 | 1台 |
| 月成本 | ¥6000+ | ¥30 |
| 维护难度 | 高 | 低 |
| 扩展性 | 复杂 | 简单 |

**核心思想**: 先跑起来，再考虑优化。功能完整 ≠ 架构复杂。

---

## 📝 SQLite 完整 Schema

```sql
-- CCJK Cloud Lite - SQLite Schema
-- 一张文件搞定所有数据

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    device_key TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    storage_quota INTEGER DEFAULT 1048576000,  -- 1GB
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat DATETIME
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    device_key TEXT NOT NULL,
    command TEXT NOT NULL,
    cwd TEXT,
    env TEXT,  -- JSON string
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    timeout INTEGER DEFAULT 300000,
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_device ON tasks(device_key);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);

-- 邮件配置
CREATE TABLE email_configs (
    user_id INTEGER PRIMARY KEY,
    email_address TEXT NOT NULL,
    imap_host TEXT,
    imap_port INTEGER,
    smtp_host TEXT,
    smtp_port INTEGER,
    password_encrypted TEXT,
    check_interval INTEGER DEFAULT 30,
    last_check DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 配置备份
CREATE TABLE config_backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_config_backups_user ON config_backups(user_id);
CREATE INDEX idx_config_backups_created ON config_backups(created_at DESC);

-- 统计缓存
CREATE TABLE stats_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话 (可选，用于 Web 登录)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

**版本**: 2.0.0 Lite
**更新**: 2026-01-20
**维护**: CCJK Team

# CCJK Cloud Backend - 极简版
## 云服务后端需求 (轻量版)

**核心原则**: 够用就好，不过度设计

---

## 🎯 核心认知

### 为什么不需要复杂后端？

**当前 Daemon 实现**:
```
本地 Daemon 已经可以：
├── IMAP 监听邮件 (接收命令)
├── 本地执行命令
├── SMTP 发送结果
└── 完全自主运行
```

**云端只需要做**:
```
┌─────────────────────────────────────┐
│         云端极简服务                 │
│  1. 设备注册 (生成 ID+Secret)        │
│  2. 在线状态 (设备是否在线)          │
│  3. 可选: Web 面板查看状态          │
└─────────────────────────────────────┘
```

---

## 📦 极简架构

### 方案对比

| 复杂方案 | 极简方案 |
|---------|---------|
| PostgreSQL | SQLite / 文件 |
| Redis | 内存变量 |
| 消息队列 | 不需要 |
| WebSocket | 不需要 |
| Worker 进程 | 不需要 |
| 对象存储 | 不需要 |

### 推荐架构

```
┌─────────────────────────────────────────────────────────┐
│                    单机 Node.js 服务                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   Hono API                          │ │
│  │  POST /register  → 设备注册                         │ │
│  │  POST /heartbeat → 心跳上报                        │ │
│  │  GET  /status     → 查询状态                        │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              SQLite 数据库                          │ │
│  │  • users (id, email, created_at)                   │ │
│  │  • devices (id, user_id, name, status, last_seen)  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              内存缓存 (可选)                        │ │
│  │  • 设备在线状态 Map<deviceId, lastSeen>            │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

部署: 单个 Docker 容器
成本: ¥50-100/月 (1核1GB VPS)
```

---

## 🗄️ 极简数据模型

### 只需要 2 张表

```sql
-- 用户表 (如果需要 Web 登录)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 设备表
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    os_type TEXT,
    ccjk_version TEXT,
    status TEXT DEFAULT 'offline',  -- online, offline
    last_heartbeat INTEGER,
    ip_address TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_status ON devices(status);
```

### 为什么不需要任务表？

**答案**: 任务不经过云端！

```
传统方案 (复杂):
用户 → 云端 → 设备 → 云端 → 用户

当前方案 (简单):
用户 → 邮件 → 设备 → 邮件 → 用户
         ↑                    ↑
      Gmail               Gmail
```

---

## 📡 API 规范 (极简版)

### Base URL
```
https://api.claudehome.cn
```

### 1. 设备注册

```http
POST /register
Content-Type: application/json

{
  "email": "user@gmail.com",
  "device_name": "MacBook Pro"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "device_id": "ccjk_xxx",
    "device_secret": "secret_xxx",
    "config": {
      "heartbeat_interval": 60
    }
  }
}
```

### 2. 心跳上报

```http
POST /heartbeat
X-Device-Id: ccjk_xxx
X-Device-Secret: secret_xxx

{
  "status": "online"
}
```

### 3. 查询设备状态

```http
GET /status?api_key=user_api_key
```

**响应**:
```json
{
  "devices": [
    {
      "id": "ccjk_xxx",
      "name": "MacBook Pro",
      "status": "online",
      "last_seen": 1705735200
    }
  ]
}
```

### 4. (可选) Web 管理面板

```
GET  /         → 单页应用
POST /login    → 获取 API Key
GET  /devices  → 设备列表页面
```

---

## 💻 实现代码

### 核心服务 (约 200 行)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Database from 'better-sqlite3'

const app = new Hono()
const db = new Database('ccjk.db')

// 内存缓存: 设备在线状态
const onlineDevices = new Map<string, number>()

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    name TEXT NOT NULL,
    os_type TEXT,
    ccjk_version TEXT,
    status TEXT DEFAULT 'offline',
    last_heartbeat INTEGER,
    ip_address TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
  CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)
`)

// 中间件
app.use('*', cors())

// 设备注册
app.post('/register', async (c) => {
  const { email, device_name } = await c.req.json()

  // 生成 ID 和 Secret
  const device_id = `ccjk_${crypto.randomUUID().slice(0, 8)}`
  const device_secret = crypto.randomUUID()

  // 创建或获取用户
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    const api_key = `ck_${crypto.randomUUID().slice(0, 16)}`
    user = {
      id: crypto.randomUUID(),
      email,
      api_key
    }
    db.prepare('INSERT INTO users (id, email, api_key) VALUES (?, ?, ?)')
      .run(user.id, user.email, user.api_key)
  }

  // 创建设备
  db.prepare(
    'INSERT INTO devices (id, user_id, name, status) VALUES (?, ?, ?, ?)'
  ).run(device_id, user.id, device_name, 'online')

  onlineDevices.set(device_id, Date.now())

  return c.json({
    success: true,
    data: {
      device_id,
      device_secret,
      api_key: user.api_key,
      config: { heartbeat_interval: 60 }
    }
  })
})

// 心跳
app.post('/heartbeat', async (c) => {
  const device_id = c.req.header('X-Device-Id')
  const device_secret = c.req.header('X-Device-Secret')

  // 验证设备 (简化: 只检查设备是否存在)
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(device_id)
  if (!device) {
    return c.json({ success: false, error: 'Invalid device' }, 401)
  }

  // 更新心跳
  db.prepare(
    'UPDATE devices SET status = ?, last_heartbeat = ?, ip_address = ? WHERE id = ?'
  ).run('online', Date.now(), c.req.header('CF-Connecting-IP'), device_id)

  onlineDevices.set(device_id, Date.now())

  return c.json({ success: true })
})

// 查询状态
app.get('/status', async (c) => {
  const api_key = c.req.query('api_key')
  if (!api_key) {
    return c.json({ success: false, error: 'Missing api_key' }, 401)
  }

  const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(api_key)
  if (!user) {
    return c.json({ success: false, error: 'Invalid api_key' }, 401)
  }

  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ?').all(user.id)

  // 标记离线设备 (超过 2 分钟没心跳)
  const now = Date.now()
  const timeout = 2 * 60 * 1000

  devices.forEach((d: any) => {
    const lastSeen = onlineDevices.get(d.id) || d.last_heartbeat
    if (now - lastSeen > timeout) {
      d.status = 'offline'
    }
  })

  return c.json({ success: true, devices })
})

// 定时清理离线设备标记 (每分钟)
setInterval(() => {
  const now = Date.now()
  const timeout = 2 * 60 * 1000

  for (const [id, lastSeen] of onlineDevices.entries()) {
    if (now - lastSeen > timeout) {
      onlineDevices.delete(id)
      db.prepare('UPDATE devices SET status = ? WHERE id = ?').run('offline', id)
    }
  }
}, 60 * 1000)

export default app
```

### Docker 部署

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
```

```yaml
version: '3.8'
services:
  ccjk-api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

---

## 🚀 部署方案

### 推荐方案 1: VPS 自建

| 供应商 | 配置 | 价格 |
|--------|------|------|
| 腾讯云 | 1核1GB | ¥50/月 |
| 阿里云 | 1核1GB | ¥60/月 |
| Vultr | 1核1GB | $6/月 |

**部署步骤**:
```bash
# 1. 购买 VPS
# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh

# 3. 克隆项目
git clone ccjk-api
cd ccjk-api

# 4. 启动服务
docker-compose up -d

# 5. 配置 Nginx 反向代理
# 6. 配置 SSL 证书
```

### 推荐方案 2: Serverless

**Vercel / Cloudflare Workers**:
- 几乎免费
- 自动 HTTPS
- 全球 CDN
- 限制: 无法持久化 SQLite (需用 D1 / KV)

### 推荐方案 3: PaaS

**Railway / Render / Fly.io**:
- 免费额度可用
- 自动部署
- 无需运维

---

## 💰 成本对比

| 方案 | 月成本 | 年成本 |
|------|--------|--------|
| **极简方案** | | |
| VPS 自建 | ¥50 | ¥600 |
| Railway (付费) | ¥100 | ¥1,200 |
| **复杂方案** | | |
| 原方案 | ¥6,000+ | ¥72,000+ |
| **节省** | **98%** | **98%** |

---

## ✅ 验收标准

**MVP (最小可用产品)**:
- [x] 设备注册生成 ID
- [x] 心跳更新状态
- [x] 查询设备在线状态
- [x] 单文件部署

**可选增强**:
- [ ] Web 登录页面
- [ ] 设备列表展示
- [ ] 简单的统计图表

---

## 🎯 总结

**极简方案 = 200行代码 + SQLite + Docker**

```
不包含:
❌ PostgreSQL
❌ Redis
❌ 消息队列
❌ WebSocket
❌ Worker 进程
❌ 对象存储
❌ 复杂的任务调度

包含:
✅ 设备注册
✅ 在线状态
✅ 心跳上报
✅ 基本查询
```

**这就是全部！**

---

**版本**: 2.0.0 (极简版)
**更新**: 2026-01-20

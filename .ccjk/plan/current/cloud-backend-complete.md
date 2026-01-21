# CCJK Cloud API - 完整部署文档

**Version**: 1.0.0
**Deploy to**: api.claudehome.cn
**Last Updated**: 2026-01-20

---

## 📋 部署清单

- [ ] 服务器环境准备
- [ ] 安装 Node.js 20+
- [ ] 安装 PostgreSQL 15+
- [ ] 安装 Nginx
- [ ] 配置 SSL 证书
- [ ] 部署应用代码
- [ ] 配置环境变量
- [ ] 启动服务
- [ ] 验证功能

---

## 🚀 快速部署 (5分钟)

### 1. 服务器连接

```bash
# SSH 连接到服务器
ssh root@api.claudehome.cn
```

### 2. 安装依赖

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20 (使用 NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 安装 PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# 安装 Nginx
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 安装 PM2
npm install -g pm2
```

### 3. 创建数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

-- 执行以下 SQL
CREATE DATABASE ccjk_cloud;
CREATE USER ccjk_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ccjk_cloud TO ccjk_user;
\q
```

### 4. 上传代码

```bash
# 在本地打包项目
cd /path/to/ccjk-cloud
tar -czf ccjk-cloud.tar.gz src/ package.json prisma/

# 上传到服务器
scp ccjk-cloud.tar.gz root@api.claudehome.cn:/root/

# 在服务器上解压
cd /root
mkdir -p /var/www/ccjk-cloud
tar -xzf ccjk-cloud.tar.gz -C /var/www/ccjk-cloud
cd /var/www/ccjk-cloud
```

### 5. 安装依赖并构建

```bash
cd /var/www/ccjk-cloud
npm install
npm run build
```

### 6. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库
DATABASE_URL="postgresql://ccjk_user:your_secure_password_here@localhost:5432/ccjk_cloud"

# JWT 密钥 (随机生成)
JWT_SECRET="$(openssl rand -hex 32)"

# 邮件配置 (可选)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@claudehome.cn
SMTP_PASS=your_smtp_password

# 域名
BASE_URL=https://api.claudehome.cn

# 日志
LOG_LEVEL=info
EOF
```

### 7. 初始化数据库

```bash
# 运行数据库迁移
npm run db:migrate

# 或使用 Prisma
npx prisma migrate deploy
npx prisma generate
```

### 8. 启动服务

```bash
# 使用 PM2 启动
pm2 start npm --name "ccjk-cloud" -- start

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 9. 配置 Nginx 反向代理

```bash
# 创建 Nginx 配置
cat > /etc/nginx/sites-available/ccjk-cloud << 'EOF'
server {
    listen 80;
    server_name api.claudehome.cn;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.claudehome.cn;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/api.claudehome.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.claudehome.cn/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/ccjk-cloud-access.log;
    error_log /var/log/nginx/ccjk-cloud-error.log;

    # 反向代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/ccjk-cloud /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 10. 配置 SSL 证书

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d api.claudehome.cn

# 自动续期
crontab -e
# 添加以下行
0 0 * * * certbot renew --quiet
```

### 11. 验证部署

```bash
# 检查服务状态
pm2 status
pm2 logs ccjk-cloud

# 测试 API
curl https://api.claudehome.cn/health
```

---

## 📁 完整项目结构

```
ccjk-cloud/
├── src/
│   ├── index.ts              # 应用入口
│   ├── server.ts             # 服务器配置
│   ├── db.ts                 # 数据库连接
│   ├── config.ts             # 配置管理
│   ├── middleware/           # 中间件
│   │   ├── auth.ts           # 认证中间件
│   │   ├── error.ts          # 错误处理
│   │   └── logger.ts         # 日志中间件
│   ├── routes/               # 路由
│   │   ├── index.ts          # 路由聚合
│   │   ├── auth.ts           # 认证路由
│   │   ├── daemon.ts         # Daemon 路由
│   │   ├── tasks.ts          # 任务路由
│   │   ├── email.ts          # 邮件路由
│   │   ├── config.ts         # 配置路由
│   │   └── stats.ts          # 统计路由
│   ├── services/             # 业务逻辑
│   │   ├── auth.service.ts   # 认证服务
│   │   ├── task.service.ts   # 任务服务
│   │   ├── email.service.ts  # 邮件服务
│   │   └── device.service.ts # 设备服务
│   ├── models/               # 数据模型
│   │   └── index.ts
│   └── types/                # 类型定义
│       └── index.ts
├── prisma/
│   ├── schema.prisma         # 数据库模型
│   └── migrations/           # 迁移文件
├── tests/                    # 测试文件
├── .env.example              # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 📄 完整代码文件

### package.json

```json
{
  "name": "ccjk-cloud-api",
  "version": "1.0.0",
  "description": "CCJK Cloud API for Remote Control",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "test": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "@hono/zod-validator": "^0.2.0",
    "@prisma/client": "^5.8.0",
    "bcrypt": "^5.1.1",
    "hono": "^3.12.0",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.8",
    "pino": "^8.17.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/nodemailer": "^6.4.14",
    "@types/uuid": "^9.0.7",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "prisma": "^5.8.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.1.3"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### prisma/schema.prisma

```prisma
// CCJK Cloud API - Database Schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  deviceKey     String   @unique @map("device_key")
  plan          String   @default("free")
  storageQuota  Int      @default(1073741824) @map("storage_quota")
  storageUsed   Int      @default(0) @map("storage_used")
  isActive      Boolean  @default(true) @map("is_active")
  lastHeartbeat DateTime? @map("last_heartbeat")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  tasks         Task[]
  emailConfigs   EmailConfig[]
  configBackups  ConfigBackup[]
  sessions      Session[]

  @@map("users")
}

// 会话表
model Session {
  id        String   @id @default(uuid())
  userId    Int      @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// 任务表
model Task {
  id          String    @id @default(uuid())
  userId      Int       @map("user_id")
  deviceKey   String    @map("device_key")
  command     String
  cwd         String?
  env         String?   // JSON string
  status      TaskStatus @default(PENDING)
  priority    Int       @default(5)
  timeout     Int       @default(300000) // 5 minutes
  exitCode    Int?      @map("exit_code")
  stdout      String?   @db.Text
  stderr      String?   @db.Text
  error       String?   @db.Text
  startedAt   DateTime? @map("started_at")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([deviceKey])
  @@index([createdAt(sort: Desc)])
  @@map("tasks")
}

enum TaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

// 邮件配置表
model EmailConfig {
  id              Int      @id @default(autoincrement())
  userId          Int      @map("user_id")
  emailAddress    String   @map("email_address")
  imapHost        String?  @map("imap_host")
  imapPort        Int?     @map("imap_port")
  smtpHost        String?  @map("smtp_host")
  smtpPort        Int?     @map("smtp_port")
  passwordEncrypted String? @map("password_encrypted")
  checkInterval   Int      @default(30) @map("check_interval")
  lastCheck       DateTime? @map("last_check")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
  @@map("email_configs")
}

// 配置备份表
model ConfigBackup {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  name       String
  configJson String   @map("config_json") @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@map("config_backups")
}

// 统计缓存表
model StatsCache {
  key       String   @id
  value     String   @db.Text
  updatedAt DateTime @default(now()) @map("updated_at")

  @@map("stats_cache")
}
```

### src/index.ts

```typescript
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { logger } from 'pino'
import { createServer } from './server'
import { connectDB } from './db'

const pino = logger({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
})

async function main() {
  // 连接数据库
  await connectDB()
  pino.info('Database connected')

  // 创建服务器
  const app = createServer()
  const port = Number(process.env.PORT) || 3000

  // 启动服务器
  serve({
    fetch: app.fetch,
    port,
  })

  pino.info(`Server running on port ${port}`)
  pino.info(`Environment: ${process.env.NODE_ENV}`)
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
```

### src/server.ts

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import authRoutes from './routes/auth'
import daemonRoutes from './routes/daemon'
import taskRoutes from './routes/tasks'
import emailRoutes from './routes/email'
import configRoutes from './routes/config'
import statsRoutes from './routes/stats'
import { errorHandler } from './middleware/error'

export function createServer() {
  const app = new Hono()

  // 中间件
  app.use('*', cors())
  app.use('*', prettyJSON())
  app.use('*', honoLogger())
  app.use('*', errorHandler)

  // 健康检查
  app.get('/health', (c) => {
    return c.json({
      ok: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })
  })

  // API 版本
  app.get('/v1', (c) => c.json({ name: 'CCJK Cloud API', version: '1.0.0' }))

  // 路由
  const api = new Hono()
  api.route('/auth', authRoutes)
  api.route('/daemon', daemonRoutes)
  api.route('/tasks', taskRoutes)
  api.route('/email', emailRoutes)
  api.route('/config', configRoutes)
  api.route('/stats', statsRoutes)

  app.route('/v1', api)

  return app
}
```

### src/db.ts

```typescript
import { PrismaClient } from '@prisma/client'
import { pino } from 'pino'

const logger = pino({ level: 'info' })

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

export async function connectDB() {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database')
    throw error
  }
}

export async function disconnectDB() {
  await prisma.$disconnect()
  logger.info('Database disconnected')
}

// 优雅关闭
process.on('beforeExit', async () => {
  await disconnectDB()
})
```

### src/types/index.ts

```typescript
import type { Context } from 'hono'

export interface Env {
  DATABASE_URL: string
  JWT_SECRET: string
  PORT: string
  NODE_ENV: string
  BASE_URL: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USER?: string
  SMTP_PASS?: string
}

export interface Variables {
  userId?: number
  deviceKey?: string
}

export type AppContext = Context<{ Variables: Variables }>

// 请求/响应类型
export interface AuthResponse {
  ok: boolean
  data: {
    device_key: string
    user_id: number
    email: string
  }
}

export interface TaskCreateRequest {
  command: string
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  priority?: number
}

export interface TaskResponse {
  id: string
  user_id: number
  device_key: string
  command: string
  status: string
  created_at: string
  started_at?: string
  completed_at?: string
  exit_code?: number
  stdout?: string
  stderr?: string
  error?: string
}

export interface HeartbeatRequest {
  status: 'online' | 'busy' | 'offline'
  os?: string
  version?: string
  arch?: string
}

export interface TaskResultRequest {
  status: 'completed' | 'failed'
  exit_code?: number
  stdout?: string
  stderr?: string
  error?: string
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
```

### src/middleware/auth.ts

```typescript
import type { AppContext, ApiResponse } from '../types'
import { verify } from 'jsonwebtoken'
import { prisma } from '../db'

export async function authMiddleware(c: AppContext, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  const deviceKeyHeader = c.req.header('X-Device-Key')

  // 优先使用 Device Key (Daemon 认证)
  if (deviceKeyHeader) {
    const user = await prisma.user.findUnique({
      where: { deviceKey: deviceKeyHeader },
      select: { id: true, isActive: true },
    })

    if (user && user.isActive) {
      c.set('userId', user.id)
      c.set('deviceKey', deviceKeyHeader)
      return next()
    }

    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'INVALID_DEVICE_KEY', message: 'Invalid device key' },
    }, 401)
  }

  // JWT 认证 (Web 用户)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'secret')
      if (typeof decoded === 'object' && 'userId' in decoded) {
        c.set('userId', decoded.userId as number)
        return next()
      }
    }
    catch {
      // Invalid token
    }
  }

  return c.json<ApiResponse>({
    ok: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  }, 401)
}
```

### src/middleware/error.ts

```typescript
import type { Context } from 'hono'

export function errorHandler(c: Context, next: () => Promise<void>) {
  try {
    return next()
  }
  catch (error) {
    console.error('Error:', error)
    return c.json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An error occurred',
      },
    }, 500)
  }
}
```

### src/routes/auth.ts

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { hash, compare } from 'bcrypt'
import { prisma } from '../db'
import { sign } from 'jsonwebtoken'
import type { ApiResponse, AuthResponse } from '../types'

const auth = new Hono()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// 注册 / 登录合并
auth.post('/', async (c) => {
  const body = await c.req.json()
  const result = registerSchema.safeParse(body)

  if (!result.success) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid email or password' },
    }, 400)
  }

  const { email, password } = result.data

  // 检查用户是否存在
  let user = await prisma.user.findUnique({
    where: { email },
  })

  if (user) {
    // 验证密码
    const isValid = await compare(password, user.passwordHash)
    if (!isValid) {
      return c.json<ApiResponse>({
        ok: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      }, 401)
    }
  }
  else {
    // 创建新用户
    const passwordHash = await hash(password, 10)
    const deviceKey = `ccjk_${generateDeviceKey()}`
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        deviceKey,
      },
    })
  }

  // 生成 JWT token
  const token = sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '30d' },
  )

  return c.json<ApiResponse<AuthResponse['data']>>({
    ok: true,
    data: {
      device_key: user.deviceKey,
      user_id: user.id,
      email: user.email,
    },
  }, { headers: { Authorization: `Bearer ${token}` } })
})

// 验证 Device Key
auth.get('/verify', async (c) => {
  const deviceKey = c.req.query('device_key')

  if (!deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'MISSING_DEVICE_KEY', message: 'Device key is required' },
    }, 400)
  }

  const user = await prisma.user.findUnique({
    where: { deviceKey },
    select: { id: true, isActive: true },
  })

  if (!user || !user.isActive) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'INVALID_DEVICE_KEY', message: 'Invalid device key' },
    }, 401)
  }

  return c.json<ApiResponse>({
    ok: true,
    data: { valid: true, user_id: user.id },
  })
})

function generateDeviceKey(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

export default auth
```

### src/routes/daemon.ts

```typescript
import { Hono } from 'hono'
import { prisma } from '../db'
import type { ApiResponse, HeartbeatRequest } from '../types'

const daemon = new Hono()

// 心跳 + 获取待执行任务
daemon.post('/heartbeat', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  if (!deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'MISSING_DEVICE_KEY', message: 'Device key required' },
    }, 401)
  }

  const body = await c.req.json() as Partial<HeartbeatRequest>

  // 更新用户心跳时间
  await prisma.user.update({
    where: { deviceKey },
    data: { lastHeartbeat: new Date() },
  })

  // 获取待执行任务
  const tasks = await prisma.task.findMany({
    where: {
      deviceKey,
      status: 'PENDING',
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
    take: 10,
    select: {
      id: true,
      command: true,
      cwd: true,
      env: true,
      timeout: true,
    },
  })

  // 标记任务为运行中
  if (tasks.length > 0) {
    const taskIds = tasks.map(t => t.id)
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })
  }

  return c.json<ApiResponse>({
    ok: true,
    data: {
      tasks,
      count: tasks.length,
    },
  })
})

// 获取待执行任务 (轮询用)
daemon.get('/tasks', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  if (!deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'MISSING_DEVICE_KEY', message: 'Device key required' },
    }, 401)
  }

  const tasks = await prisma.task.findMany({
    where: {
      deviceKey,
      status: 'PENDING',
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
    take: 5,
    select: {
      id: true,
      command: true,
      cwd: true,
      env: true,
      timeout: true,
    },
  })

  // 标记为运行中
  if (tasks.length > 0) {
    const taskIds = tasks.map(t => t.id)
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })
  }

  return c.json<ApiResponse>({
    ok: true,
    data: { tasks },
  })
})

// 上报任务结果
daemon.post('/tasks/:id/result', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const taskId = c.req.param('id')
  const body = await c.req.json()

  // 验证任务归属
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.deviceKey !== deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
    }, 404)
  }

  // 更新任务结果
  const updateData: any = {
    status: body.status === 'completed' ? 'COMPLETED' : 'FAILED',
    completedAt: new Date(),
  }

  if (body.exit_code !== undefined) updateData.exitCode = body.exit_code
  if (body.stdout !== undefined) updateData.stdout = body.stdout
  if (body.stderr !== undefined) updateData.stderr = body.stderr
  if (body.error !== undefined) updateData.error = body.error

  await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  })

  return c.json<ApiResponse>({ ok: true })
})

// 设备下线
daemon.post('/offline', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  if (!deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'MISSING_DEVICE_KEY', message: 'Device key required' },
    }, 401)
  }

  await prisma.user.update({
    where: { deviceKey },
    data: { lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000) }, // 5分钟前
  })

  return c.json<ApiResponse>({ ok: true })
})

export default daemon
```

### src/routes/tasks.ts

```typescript
import { Hono } from 'hono'
import { prisma } from '../db'
import type { ApiResponse, TaskCreateRequest, TaskResponse } from '../types'

const tasks = new Hono()

// 创建任务
tasks.post('/', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  if (!deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'MISSING_DEVICE_KEY', message: 'Device key required' },
    }, 401)
  }

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const body = await c.req.json() as TaskCreateRequest

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      deviceKey,
      command: body.command,
      cwd: body.cwd,
      env: body.env ? JSON.stringify(body.env) : undefined,
      timeout: body.timeout || 300000,
      priority: body.priority || 5,
      status: 'PENDING',
    },
  })

  return c.json<ApiResponse<{ task_id: string; status: string }>>({
    ok: true,
    data: {
      task_id: task.id,
      status: task.status,
    },
  })
})

// 查询任务状态
tasks.get('/:id', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const taskId = c.req.param('id')

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
    }, 404)
  }

  if (task.deviceKey !== deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Access denied' },
    }, 403)
  }

  return c.json<ApiResponse<TaskResponse>>({
    ok: true,
    data: {
      id: task.id,
      user_id: task.userId,
      device_key: task.deviceKey,
      command: task.command,
      status: task.status,
      created_at: task.createdAt.toISOString(),
      started_at: task.startedAt?.toISOString(),
      completed_at: task.completedAt?.toISOString(),
      exit_code: task.exitCode ?? undefined,
      stdout: task.stdout ?? undefined,
      stderr: task.stderr ?? undefined,
      error: task.error ?? undefined,
    },
  })
})

// 任务列表
tasks.get('/', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const limit = Number(c.req.query('limit')) || 20
  const status = c.req.query('status')

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const where: any = { userId: user.id }
  if (status) where.status = status.toUpperCase()

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      command: true,
      status: true,
      createdAt: true,
      completedAt: true,
      exitCode: true,
    },
  })

  return c.json<ApiResponse>({
    ok: true,
    data: { tasks, count: tasks.length },
  })
})

// 取消任务
tasks.post('/:id/cancel', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const taskId = c.req.param('id')

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.deviceKey !== deviceKey) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
    }, 404)
  }

  if (task.status !== 'PENDING' && task.status !== 'RUNNING') {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'TASK_CANNOT_CANCEL', message: 'Task cannot be cancelled' },
    }, 400)
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'CANCELLED', completedAt: new Date() },
  })

  return c.json<ApiResponse>({ ok: true })
})

export default tasks
```

### src/routes/email.ts

```typescript
import { Hono } from 'hono'
import { prisma } from '../db'
import { encryptEmail } from '../services/email.service'
import type { ApiResponse } from '../types'

const email = new Hono()

// 配置邮件
email.post('/config', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const body = await c.req.json()

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const passwordEncrypted = body.password
    ? encryptEmail(body.password)
    : undefined

  await prisma.emailConfig.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      emailAddress: body.email,
      imapHost: body.imap_host,
      imapPort: body.imap_port,
      smtpHost: body.smtp_host,
      smtpPort: body.smtp_port,
      passwordEncrypted,
    },
    update: {
      emailAddress: body.email,
      imapHost: body.imap_host,
      imapPort: body.imap_port,
      smtpHost: body.smtp_host,
      smtpPort: body.smtp_port,
      passwordEncrypted,
    },
  })

  return c.json<ApiResponse>({ ok: true })
})

// 获取邮件配置
email.get('/config', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')

  const user = await prisma.user.findUnique({
    where: { deviceKey },
    include: { emailConfigs: true },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const config = user.emailConfigs[0]
  if (!config) {
    return c.json<ApiResponse>({
      ok: true,
      data: { configured: false },
    })
  }

  return c.json<ApiResponse>({
    ok: true,
    data: {
      configured: true,
      email: config.emailAddress,
      imap_host: config.imapHost,
      imap_port: config.imapPort,
    },
  })
})

// 发送测试邮件
email.post('/test', async (c) => {
  // TODO: 实现发送测试邮件
  return c.json<ApiResponse>({ ok: true, data: { message: 'Test email sent' } })
})

export default email
```

### src/routes/config.ts

```typescript
import { Hono } from 'hono'
import { prisma } from '../db'
import type { ApiResponse } from '../types'

const config = new Hono()

// 保存配置备份
config.post('/backup', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const body = await c.req.json()

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const backup = await prisma.configBackup.create({
    data: {
      userId: user.id,
      name: body.name,
      configJson: JSON.stringify(body.config),
    },
  })

  return c.json<ApiResponse>({
    ok: true,
    data: { backup_id: backup.id, created_at: backup.createdAt },
  })
})

// 获取备份列表
config.get('/backups', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const backups = await prisma.configBackup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return c.json<ApiResponse>({
    ok: true,
    data: {
      backups: backups.map(b => ({
        id: b.id,
        name: b.name,
        created_at: b.createdAt,
      })),
    },
  })
})

// 恢复配置
config.post('/restore/:id', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const backupId = Number(c.req.param('id'))

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  const backup = await prisma.configBackup.findFirst({
    where: { id: backupId, userId: user.id },
  })

  if (!backup) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'BACKUP_NOT_FOUND', message: 'Backup not found' },
    }, 404)
  }

  return c.json<ApiResponse>({
    ok: true,
    data: { config: JSON.parse(backup.configJson) },
  })
})

export default config
```

### src/routes/stats.ts

```typescript
import { Hono } from 'hono'
import { prisma } from '../db'
import type { ApiResponse } from '../types'

const stats = new Hono()

stats.get('/', async (c) => {
  const deviceKey = c.req.header('X-Device-Key')
  const period = c.req.query('period') || '7d'

  const user = await prisma.user.findUnique({
    where: { deviceKey },
  })

  if (!user) {
    return c.json<ApiResponse>({
      ok: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    }, 404)
  }

  // 计算时间范围
  const days = period === '30d' ? 30 : 7
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const [completed, failed, running, total] = await Promise.all([
    prisma.task.count({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
    }),
    prisma.task.count({
      where: {
        userId: user.id,
        status: 'FAILED',
        createdAt: { gte: startDate },
      },
    }),
    prisma.task.count({
      where: { userId: user.id, status: 'RUNNING' },
    }),
    prisma.task.count({
      where: { userId: user.id },
    }),
  ])

  // 计算运行时间 (小时)
  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      startedAt: { not: null },
      completedAt: { not: null },
    },
    select: { startedAt: true, completedAt: true },
    take: 1000,
  })

  let uptimeHours = 0
  for (const task of tasks) {
    if (task.startedAt && task.completedAt) {
      uptimeHours += (task.completedAt.getTime() - task.startedAt.getTime()) / 3600000
    }
  }

  return c.json<ApiResponse>({
    ok: true,
    data: {
      period,
      tasks_completed: completed,
      tasks_failed: failed,
      tasks_running: running,
      tasks_total: total,
      uptime_hours: Math.round(uptimeHours * 10) / 10,
      success_rate: total > 0 ? Math.round((completed / (completed + failed)) * 100) : 0,
    },
  })
})

export default stats
```

### src/services/email.service.ts

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8').slice(0, 32)

export function encryptEmail(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

export function decryptEmail(encrypted: string): string {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encryptedText = parts[2]

  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build
RUN npx prisma generate

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://ccjk:ccjk_password@db:5432/ccjk_cloud
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=ccjk
      - POSTGRES_PASSWORD=ccjk_password
      - POSTGRES_DB=ccjk_cloud
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### .env.example

```bash
# 服务器
PORT=3000
NODE_ENV=development

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/ccjk_cloud"

# JWT
JWT_SECRET="your-secret-key-change-in-production"

# 邮件加密
EMAIL_ENCRYPTION_KEY="your-32-character-encryption-key"

# SMTP (可选)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-password

# 域名
BASE_URL=https://api.claudehome.cn

# 日志
LOG_LEVEL=info
```

---

## 📋 部署后验证

```bash
# 1. 健康检查
curl https://api.claudehome.cn/health

# 2. 注册/登录
curl -X POST https://api.claudehome.cn/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test12345"}'

# 3. 心跳测试 (替换 YOUR_DEVICE_KEY)
curl -X POST https://api.claudehome.cn/v1/daemon/heartbeat \
  -H "X-Device-Key: YOUR_DEVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"online","os":"darwin","version":"3.7.0"}'

# 4. 创建任务测试
curl -X POST https://api.claudehome.cn/v1/tasks \
  -H "X-Device-Key: YOUR_DEVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"command":"echo hello"}'
```

---

## 📞 故障排查

### 常见问题

**1. 数据库连接失败**
```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 检查连接
psql -U ccjk_user -d ccjk_cloud
```

**2. 502 Bad Gateway**
```bash
# 检查 PM2 状态
pm2 status
pm2 logs ccjk-cloud

# 重启服务
pm2 restart ccjk-cloud
```

**3. SSL 证书问题**
```bash
# 重新获取证书
certbot renew --force-renewal

# 重载 Nginx
nginx -s reload
```

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-20
**维护**: CCJK Team

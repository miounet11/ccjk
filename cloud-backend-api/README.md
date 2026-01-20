# CCJK Cloud API

**与 CCJK v3.7.0 Remote Control Daemon 对接的云端服务**

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

```bash
# 复制环境变量
cp .env.example .env

# 编辑 .env，设置 DATABASE_URL
```

### 3. 初始化数据库

```bash
npm run db:push
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

---

## API 接口

### 基础 URL

```
http://localhost:3000/v1
```

### 认证方式

所有接口需要 `X-Device-Key` 请求头：

```bash
X-Device-Key: your_device_key_here
```

### 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/daemon/register` | POST | 设备注册 |
| `/daemon/heartbeat` | POST | 心跳 + 获取任务 |
| `/daemon/tasks/pending` | GET | 获取待执行任务 |
| `/daemon/tasks/:id/result` | POST | 上报任务结果 |
| `/daemon/config` | GET | 获取设备配置 |
| `/daemon/offline` | POST | 设备下线 |

---

## 与 Daemon 对接

### Daemon 配置

在本地 CCJK 项目中，修改 `src/daemon/config.ts`：

```typescript
export const DEFAULT_DAEMON_CONFIG: DaemonConfig = {
  // ...
  apiUrl: 'https://api.claudehome.cn/v1',  // 云端地址
  // ...
}
```

### 测试联调

```bash
# 1. 注册设备
curl -X POST http://localhost:3000/v1/daemon/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_key": "test_device_key",
    "device_name": "My Mac",
    "os_type": "darwin",
    "ccjk_version": "3.7.0"
  }'

# 2. 心跳
curl -X POST http://localhost:3000/v1/daemon/heartbeat \
  -H "X-Device-Key: test_device_key" \
  -H "Content-Type: application/json" \
  -d '{"status":"online"}'

# 3. 获取任务
curl http://localhost:3000/v1/daemon/tasks/pending \
  -H "X-Device-Key: test_device_key"
```

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t ccjk-cloud-api .

# 运行
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  ccjk-cloud-api
```

### 服务器部署

```bash
# 1. 上传代码到服务器
scp -r ccjk-cloud-api root@api.claudehome.cn:/var/www/

# 2. SSH 连接服务器
ssh root@api.claudehome.cn

# 3. 安装依赖并启动
cd /var/www/ccjk-cloud-api
npm install
npm run build
npm start
```

---

## 开发

### 项目结构

```
src/
├── index.ts        # 入口
├── app.ts          # App 配置
├── env.ts          # 环境变量
├── db.ts           # 数据库连接
├── routes/         # 路由
│   ├── health.ts
│   └── daemon.ts
└── types/          # 类型定义
    └── index.ts
```

### 技术栈

- **Runtime**: Node.js 20+
- **Framework**: Hono
- **Database**: PostgreSQL + Prisma
- **Language**: TypeScript

---

## License

MIT

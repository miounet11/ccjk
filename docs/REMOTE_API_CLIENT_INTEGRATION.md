# Remote API 客户端对接文档（临时双协议兼容）

**版本**: v1.0.0  
**更新时间**: 2026-02-22  
**适用服务**: `remote-api.claudehome.cn`

---

## 1. 目标

为保证客户端在当前网关调整阶段稳定可用，客户端需要实现：

1. 优先使用 HTTPS
2. HTTPS 失败时自动回退到 HTTP
3. Socket.IO 同步使用 `wss://` → `ws://` 回退

> 说明：这是临时兼容策略，后续网关证书稳定后应恢复 HTTPS-only。

---

## 2. 基础地址策略

### API Base URL

优先级：

1. `https://remote-api.claudehome.cn`
2. `http://remote-api.claudehome.cn`

### Socket Base URL

优先级：

1. `wss://remote-api.claudehome.cn`
2. `ws://remote-api.claudehome.cn`

### 推荐探活端点

- `GET /health`

成功判定：HTTP 200 且 body 含 `{"status":"ok"}`。

---

## 3. 客户端降级流程

1. 启动时先请求 `https://remote-api.claudehome.cn/health`（超时建议 3-5 秒）
2. 成功则全程走 HTTPS + WSS
3. 失败则尝试 `http://remote-api.claudehome.cn/health`
4. 成功则切换到 HTTP + WS
5. 两者都失败则提示“服务不可用，请稍后重试”

> 建议将探测结果缓存 10 分钟，避免每个请求都重试双协议。

---

## 4. 鉴权 API（已上线）

### 4.1 邮箱注册

`POST /auth/register`

```json
{
  "email": "user@example.com",
  "password": "Passw0rd!123",
  "name": "User"
}
```

成功响应（200）：

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "User",
    "avatar": null
  }
}
```

### 4.2 邮箱登录

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "Passw0rd!123"
}
```

成功响应同注册。

### 4.3 Token 校验

`GET /auth/verify`

Header:

`Authorization: Bearer <jwt>`

---

## 5. 业务 API（已上线）

> 以下接口均需要 JWT：
>
> `Authorization: Bearer <jwt>`

### 会话

- `GET /v1/sessions`
- `GET /v1/sessions/:id`
- `POST /v1/sessions`
- `PATCH /v1/sessions/:id`
- `DELETE /v1/sessions/:id`
- `GET /v1/sessions/:id/messages`

### 机器

- `GET /v1/machines`
- `GET /v1/machines/:id`
- `POST /v1/machines`
- `PATCH /v1/machines/:id`
- `DELETE /v1/machines/:id`

### Evolution Layer（A2A）

- `POST /a2a/hello`（获取 agent token）
- `POST /a2a/publish`
- `POST /a2a/fetch`
- `POST /a2a/report`

---

## 6. Socket.IO 对接

连接参数：

```json
{
  "auth": {
    "token": "<jwt>",
    "machineId": "<machine-id>"
  },
  "transports": ["websocket", "polling"]
}
```

推荐事件：

- 客户端发：`remote:command`、`approval:response`
- 服务端收：`session:event`、`notification`

建议保留 polling，避免网络环境导致 websocket 不可用。

---

## 7. 限流与错误处理

### 当前限流（服务端）

- `POST /auth/register`: 每 IP 每分钟 5 次
- `POST /auth/login`: 每 IP 每分钟 10 次

### 典型状态码

- `200` 成功
- `400` 参数错误
- `401` 未授权/凭证错误
- `404` 资源不存在
- `409` 邮箱冲突
- `429` 触发限流
- `500` 服务端错误
- `503` 功能未配置（例如 GitHub OAuth）

客户端建议：

- `429`：展示“请求过于频繁，请稍后再试”
- `401`：清理 token 并引导重新登录
- `5xx`：重试（指数退避）

---

## 8. TypeScript 接入示例（协议回退）

```ts
const CANDIDATES = [
  'https://remote-api.claudehome.cn',
  'http://remote-api.claudehome.cn',
];

export async function resolveBaseUrl(): Promise<string> {
  for (const base of CANDIDATES) {
    try {
      const res = await fetch(`${base}/health`, { method: 'GET' });
      if (res.ok) return base;
    } catch {
      // try next
    }
  }
  throw new Error('Remote API unavailable');
}
```

```ts
import { io } from 'socket.io-client';

export function createSocket(baseUrl: string, token: string, machineId?: string) {
  const wsBase = baseUrl.startsWith('https://')
    ? baseUrl.replace('https://', 'wss://')
    : baseUrl.replace('http://', 'ws://');

  return io(wsBase, {
    auth: { token, machineId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });
}
```

---

## 9. 联调验收清单

- [ ] `GET /health` 在当前协议下可用
- [ ] 邮箱注册成功并返回 token
- [ ] 邮箱登录成功并返回 token
- [ ] `GET /auth/verify` 可正确识别 token
- [ ] `GET /v1/sessions` 可返回数组
- [ ] `POST /a2a/hello` 可返回 agent token
- [ ] `POST /a2a/fetch` 可返回初始案例数据
- [ ] Socket.IO `polling` 可建立连接

---

## 10. 后续切回 HTTPS-only（计划）

网关证书链路稳定后，客户端移除 HTTP/WS 回退逻辑：

- 固定 API: `https://remote-api.claudehome.cn`
- 固定 Socket: `wss://remote-api.claudehome.cn`
- 失败直接报错，不再回退

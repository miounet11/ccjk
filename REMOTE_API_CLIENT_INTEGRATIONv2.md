# 三端对接文档（ccjk 服务端 + App/Web 管理端 + remote-api）

**版本**: v2.0.0  
**更新时间**: 2026-02-22  
**适用场景**: 你们现有三端体系联调与上线

---

## 1. 三端架构定义

### A. 用户服务端（ccjk）

- 职责：用户体系、业务编排、权限中枢
- 对上：给 App/Web 提供统一业务接口
- 对下：调用 remote-api 执行远程控制/会话能力

### B. 用户管理端（App/Web）

- 职责：管理后台与操作入口
- 原则：优先通过 ccjk 服务端间接调用 remote-api

### C. 当前服务器服务端（remote-api）

- 职责：Claude Code CLI 远控执行、会话、机器、A2A Evolution
- 地址：`remote-api.claudehome.cn`

---

## 2. 推荐调用链（生产）

1. App/Web -> ccjk（统一鉴权、审计、风控）
2. ccjk -> remote-api（服务到服务调用）
3. remote-api -> daemon/socket（执行与实时状态）

> 不建议 App/Web 直接大规模绕过 ccjk 调 remote-api，以免权限与审计分散。

---

## 3. remote-api 协议策略（当前临时）

由于网关链路仍在调整，ccjk 调 remote-api 采用临时双协议：

1. 首选 `https://remote-api.claudehome.cn`
2. HTTPS 失败时回退 `http://remote-api.claudehome.cn`

健康探测端点：`GET /health`

建议 ccjk 在内存缓存当前可用协议 10 分钟，减少重复探测。

---

## 4. remote-api 已上线能力

## 4.1 认证

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/verify`

说明：当前已支持邮箱注册登录；GitHub OAuth 为可选能力。

## 4.2 会话与机器

- 会话：`/v1/sessions`（GET/POST/PATCH/DELETE）
- 会话消息：`GET /v1/sessions/:id/messages`
- 机器：`/v1/machines`（GET/POST/PATCH/DELETE）

## 4.3 Evolution Layer（A2A）

- `POST /a2a/hello`
- `POST /a2a/publish`
- `POST /a2a/fetch`
- `POST /a2a/report`

说明：已完成初始案例入库，可支撑 `fetch` 冷启动返回。

---

## 5. ccjk 服务端对接建议

## 5.1 服务到服务访问

- 由 ccjk 持有 remote-api 的用户 JWT / agent token
- 对 App/Web 隐藏 remote-api 细节
- 在 ccjk 侧统一记录 requestId 与审计日志

## 5.2 错误映射

建议 ccjk 将 remote-api 状态码做统一封装：

- `401` -> 登录失效/权限不足
- `429` -> 操作过频
- `5xx` -> 远端服务异常（可重试）

## 5.3 重试策略

- 仅对 `GET` 与幂等操作重试
- 指数退避：`300ms -> 1s -> 2s`，最多 3 次

---

## 6. 安全与限流（当前）

remote-api 已启用：

- `POST /auth/register`: 每 IP 每分钟 5 次
- `POST /auth/login`: 每 IP 每分钟 10 次
- 请求体大小限制：1MB

ccjk 建议补充：

- 内部接口签名或内网白名单
- 关键操作审计（谁在什么时间操作了哪台机器）

---

## 7. Socket.IO 对接（服务端视角）

如果 ccjk 或 App/Web 需要实时订阅，连接参数：

```json
{
  "auth": {
    "token": "<jwt>",
    "machineId": "<machine-id>"
  },
  "transports": ["websocket", "polling"]
}
```

事件：

- 上行：`remote:command`、`approval:response`
- 下行：`session:event`、`notification`

---

## 8. 联调验收清单（三端）

- [ ] App/Web -> ccjk 登录与鉴权正常
- [ ] ccjk -> remote-api `/health` 走首选协议成功
- [ ] ccjk 调用 `/auth/login`、`/auth/verify` 成功
- [ ] ccjk 调用 `/v1/sessions`、`/v1/machines` 成功
- [ ] ccjk 调用 `/a2a/hello`、`/a2a/fetch` 成功返回案例
- [ ] Socket.IO polling 可连通

---

## 9. 临时兼容期结束后

网关证书链路稳定后，统一切回 HTTPS-only：

- remote-api 固定 `https://remote-api.claudehome.cn`
- 禁用 HTTP 回退
- Socket 固定 `wss://remote-api.claudehome.cn`

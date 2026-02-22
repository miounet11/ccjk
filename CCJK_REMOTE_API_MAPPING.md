# ccjk 服务端 -> remote-api 对接映射表（字段级）

版本: v1.0.0  
更新时间: 2026-02-22

---

## 1. 目标

本文档用于 ccjk 用户服务端对接 remote-api 服务端。

调用链建议：

App/Web -> ccjk -> remote-api

说明：
- App/Web 不直接感知 remote-api 细节
- ccjk 负责鉴权、重试、审计、协议降级

---

## 2. 基础连接策略（ccjk 侧）

## 2.1 Base URL 优先级

1. https://remote-api.claudehome.cn
2. http://remote-api.claudehome.cn

## 2.2 协议探测

- 启动时先调用 GET /health
- HTTPS 失败自动回退 HTTP
- 缓存可用协议 10 分钟

---

## 3. 认证映射

## 3.1 用户注册

ccjk 对外接口建议: POST /internal/remote/auth/register

remote-api 实际接口: POST /auth/register

请求字段映射：

| ccjk 字段 | remote-api 字段 | 必填 | 说明 |
|---|---|---|---|
| email | email | 是 | 统一转小写 |
| password | password | 是 | 最少 6 位 |
| name | name | 否 | 可为空 |

响应字段映射：

| remote-api 字段 | ccjk 返回字段建议 | 说明 |
|---|---|---|
| token | accessToken | JWT |
| user.id | user.id | 用户 ID |
| user.email | user.email | 邮箱 |
| user.name | user.name | 昵称 |
| user.avatar | user.avatar | 头像（可空） |

## 3.2 用户登录

ccjk 对外接口建议: POST /internal/remote/auth/login

remote-api 实际接口: POST /auth/login

请求字段映射与注册一致（不需要 name）。

## 3.3 Token 校验

ccjk 对外接口建议: GET /internal/remote/auth/verify

remote-api 实际接口: GET /auth/verify

请求头映射：

| ccjk 请求头 | remote-api 请求头 |
|---|---|
| Authorization: Bearer <token> | Authorization: Bearer <token> |

---

## 4. 会话映射

鉴权要求：
- 所有 /v1/sessions* 接口都需要 Authorization: Bearer <token>

## 4.1 会话列表

ccjk 对外接口建议: GET /internal/remote/sessions

remote-api 实际接口: GET /v1/sessions

响应透传字段建议：
- sessions[].id
- sessions[].machineId
- sessions[].tag
- sessions[].active
- sessions[].lastActivityAt

## 4.2 创建会话

ccjk 对外接口建议: POST /internal/remote/sessions

remote-api 实际接口: POST /v1/sessions

请求字段映射：

| ccjk 字段 | remote-api 字段 | 必填 | 说明 |
|---|---|---|---|
| tag | tag | 是 | 会话唯一标签（同 user 下唯一） |
| machineId | machineId | 是 | 机器唯一标识 |
| metadata | metadata | 是 | 字符串（建议 JSON 字符串） |
| agentState | agentState | 否 | 字符串 |
| dataEncryptionKey | dataEncryptionKey | 否 | 字符串 |

## 4.3 更新会话

ccjk 对外接口建议: PATCH /internal/remote/sessions/:id

remote-api 实际接口: PATCH /v1/sessions/:id

可更新字段：
- metadata
- agentState

## 4.4 删除会话

ccjk 对外接口建议: DELETE /internal/remote/sessions/:id

remote-api 实际接口: DELETE /v1/sessions/:id

## 4.5 会话消息

ccjk 对外接口建议: GET /internal/remote/sessions/:id/messages

remote-api 实际接口: GET /v1/sessions/:id/messages

查询参数映射：

| ccjk query | remote-api query | 默认 |
|---|---|---|
| limit | limit | 100 |
| offset | offset | 0 |

---

## 5. 机器映射

鉴权要求：
- 所有 /v1/machines* 接口都需要 Authorization: Bearer <token>

## 5.1 机器列表

ccjk 对外接口建议: GET /internal/remote/machines

remote-api 实际接口: GET /v1/machines

## 5.2 注册/更新机器

ccjk 对外接口建议: POST /internal/remote/machines

remote-api 实际接口: POST /v1/machines

请求字段映射：

| ccjk 字段 | remote-api 字段 | 必填 |
|---|---|---|
| machineId | machineId | 是 |
| hostname | hostname | 是 |
| platform | platform | 是 |
| metadata | metadata | 是 |
| daemonState | daemonState | 否 |

## 5.3 更新机器状态

ccjk 对外接口建议: PATCH /internal/remote/machines/:id

remote-api 实际接口: PATCH /v1/machines/:id

可更新字段：
- active
- metadata
- daemonState

## 5.4 删除机器

ccjk 对外接口建议: DELETE /internal/remote/machines/:id

remote-api 实际接口: DELETE /v1/machines/:id

---

## 6. Evolution Layer（A2A）映射

## 6.1 Agent 注册

ccjk 对外接口建议: POST /internal/remote/a2a/hello

remote-api 实际接口: POST /a2a/hello

请求示例字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| type | 否 | 建议传 hello |
| agent.name | 是 | 代理名称 |
| agent.version | 是 | 代理版本 |
| agent.capabilities | 否 | 能力数组 |

响应：
- agentId
- token（A2A Bearer token）

## 6.2 发布 Gene

ccjk 对外接口建议: POST /internal/remote/a2a/publish

remote-api 实际接口: POST /a2a/publish

鉴权：
- Authorization: Bearer <agentToken>

关键字段：
- gene.type
- gene.problem.signature
- gene.solution.strategy

## 6.3 获取 Gene

ccjk 对外接口建议: POST /internal/remote/a2a/fetch

remote-api 实际接口: POST /a2a/fetch

鉴权：
- Authorization: Bearer <agentToken>

查询字段：

| 字段 | 说明 |
|---|---|
| query.signature | 模糊匹配问题签名 |
| query.context | 上下文标签过滤 |
| query.minGDI | 最低质量阈值 |
| limit | 返回条数（1~50） |

## 6.4 报告结果

ccjk 对外接口建议: POST /internal/remote/a2a/report

remote-api 实际接口: POST /a2a/report

鉴权：
- Authorization: Bearer <agentToken>

关键字段：

| 字段 | 必填 |
|---|---|
| geneId | 是 |
| result.success | 是 |
| result.time | 是 |
| result.context | 否 |

---

## 7. Socket.IO 映射

连接地址策略：
- 优先 wss://remote-api.claudehome.cn
- 失败回退 ws://remote-api.claudehome.cn

连接参数：

| 参数路径 | 说明 |
|---|---|
| auth.token | 用户 JWT |
| auth.machineId | 机器标识 |
| transports | 建议 [websocket, polling] |

事件映射：

| 方向 | 事件 | 用途 |
|---|---|---|
| ccjk/管理端 -> remote-api | remote:command | 下发远程命令 |
| ccjk/管理端 -> remote-api | approval:response | 回传审批结果 |
| remote-api -> ccjk/管理端 | session:event | 会话事件流 |
| remote-api -> ccjk/管理端 | notification | 通知消息 |

---

## 8. 错误码映射建议（ccjk 统一输出）

| remote-api 状态码 | ccjk 统一码建议 | 说明 |
|---|---|---|
| 400 | INVALID_REQUEST | 参数错误 |
| 401 | UNAUTHORIZED | token 无效或未登录 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 邮箱已注册等冲突 |
| 429 | RATE_LIMITED | 限流触发 |
| 500 | INTERNAL_ERROR | 服务异常 |
| 503 | SERVICE_UNAVAILABLE | 功能未配置（如 OAuth） |

---

## 9. 限流与重试建议

## 9.1 已上线限流（remote-api）

- POST /auth/register: 每 IP 每分钟 5 次
- POST /auth/login: 每 IP 每分钟 10 次

## 9.2 ccjk 重试建议

- 仅重试幂等请求（GET）
- 退避策略：300ms -> 1s -> 2s，最多 3 次
- 429 不重试，直接提示稍后再试

---

## 10. 三端联调清单（可直接执行）

- [ ] App/Web 登录 ccjk 成功
- [ ] ccjk 能获取 remote-api 健康状态
- [ ] ccjk 调用 remote-api 注册/登录/校验成功
- [ ] ccjk 调用会话接口成功
- [ ] ccjk 调用机器接口成功
- [ ] ccjk 调用 A2A hello/fetch 成功
- [ ] ccjk 与 remote-api 的 Socket.IO 可建立连接
- [ ] HTTPS 不稳定时 HTTP 回退可用

---

## 11. 后续切回 HTTPS-only（计划）

网关证书稳定后：

1. ccjk 停止 HTTP 回退
2. 固定 remote-api 为 HTTPS/WSS
3. 对 HTTP 请求直接拒绝

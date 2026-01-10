# CCJK Cloud Service API 开发文档

> 云服务域名: `https://api.claudehome.cn`
>
> **更新说明**: 本文档已根据实际 API 测试结果更新，确保所有示例和格式与当前实现一致。

## 概述

CCJK Cloud Service 是一个轻量级的通知中继服务，负责：
1. 设备注册与管理
2. 通知消息转发（飞书/企业微信/钉钉/邮件/短信）
3. 用户回复收集与轮询

## 技术栈建议

- **框架**: Hono / Express / Fastify
- **数据库**: Redis (回复缓存) + PostgreSQL/MySQL (设备信息)
- **部署**: Cloudflare Workers / Vercel / 自建服务器

---

## API 端点

### 1. 设备管理

#### 1.1 注册设备
```
POST /device/register
```

**请求体:**
```json
{
  "name": "MacBook Pro",
  "platform": "darwin",
  "version": "1.0.0",
  "config": {
    "channels": [
      {
        "type": "feishu",
        "enabled": true,
        "config": {
          "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        }
      }
    ],
    "threshold": 10
  }
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "token": "ccjk_dev_xxxxxxxxxxxxxxxx",
    "deviceId": "dev_123456",
    "registeredAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 1.2 获取设备信息
```
GET /device/info
Headers: X-Device-Token: ccjk_dev_xxx
```

**响应:**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_123456",
    "name": "MacBook Pro",
    "platform": "darwin",
    "channels": [
      {
        "type": "feishu",
        "enabled": true,
        "config": {
          "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        }
      }
    ],
    "lastSeen": "2024-01-15T10:30:00Z"
  }
}
```

#### 1.3 更新渠道配置
```
PUT /device/channels
Headers: X-Device-Token: ccjk_dev_xxx
```

**请求体:**
```json
{
  "channels": [
    {
      "type": "feishu",
      "enabled": true,
      "config": {
        "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
        "secret": "optional_secret"
      }
    },
    {
      "type": "wechat",
      "enabled": true,
      "config": {
        "corpId": "ww123456",
        "agentId": "1000001",
        "secret": "xxx"
      }
    },
    {
      "type": "dingtalk",
      "enabled": true,
      "config": {
        "webhookUrl": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
        "secret": "SEC..."
      }
    }
  ]
}
```

---

### 2. 通知发送

#### 2.1 发送通知
```
POST /notify
Headers: X-Device-Token: ccjk_dev_xxx
```

**请求体:**
```json
{
  "title": "任务完成通知",
  "body": "重构用户认证模块已完成",
  "type": "task_completed",
  "task": {
    "taskId": "task_abc123",
    "description": "重构用户认证模块",
    "startTime": "2024-01-15T10:00:00Z",
    "status": "completed",
    "duration": 1800000,
    "result": "成功完成，修改了 15 个文件"
  },
  "channels": ["feishu", "wechat"],
  "actions": [
    { "id": "continue", "label": "继续", "value": "continue", "primary": true },
    { "id": "new_task", "label": "新任务", "value": "new_task" }
  ],
  "priority": "normal"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_xyz789",
    "results": [
      { "success": true, "channel": "feishu", "sentAt": "2024-01-15T10:30:00Z", "messageId": "msg_001" },
      { "success": true, "channel": "wechat", "sentAt": "2024-01-15T10:30:01Z", "messageId": "msg_002" }
    ]
  }
}
```

#### 2.2 发送测试通知
```
POST /notify/test
Headers: X-Device-Token: ccjk_dev_xxx
```

**响应:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_test_001",
    "results": [
      { "success": true, "channel": "feishu", "sentAt": "2024-01-15T10:30:00Z" }
    ]
  }
}
```

---

### 3. 回复处理

#### 3.1 轮询回复 (Long Polling)
```
GET /reply/poll
Headers: X-Device-Token: ccjk_dev_xxx
Timeout: 60s
```

**响应 (有回复):**
```json
{
  "success": true,
  "data": {
    "reply": {
      "taskId": "task_abc123",
      "content": "继续下一个任务",
      "channel": "feishu",
      "timestamp": "2024-01-15T10:35:00Z",
      "actionId": "continue"
    }
  }
}
```

**响应 (无回复，超时):**
```json
{
  "success": true,
  "data": {
    "reply": null
  }
}
```

#### 3.2 获取特定通知的回复
```
GET /reply/:notificationId
Headers: X-Device-Token: ccjk_dev_xxx
```

#### 3.3 Webhook 回调 (飞书/企业微信/钉钉)

**飞书回调:**
```
POST /webhook/feishu
```

**企业微信回调:**
```
POST /webhook/wechat
```

**钉钉回调:**
```
POST /webhook/dingtalk
```

---

## 通知渠道实现

### 飞书 (Feishu/Lark)

**发送消息:**
```typescript
async function sendFeishuNotification(config: FeishuConfig, message: NotificationMessage) {
  const card = {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: getTitle(message.type) },
        template: getColor(message.type)
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: formatTaskInfo(message.task) }
        },
        // 添加按钮
        ...(message.actions ? [{
          tag: 'action',
          actions: message.actions.map(action => ({
            tag: 'button',
            text: { tag: 'plain_text', content: action.label },
            type: action.primary ? 'primary' : 'default',
            value: { action_id: action.id, task_id: message.task.taskId }
          }))
        }] : [])
      ]
    }
  }

  // 如果有 secret，需要签名
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const sign = generateFeishuSign(timestamp, config.secret)
    card.timestamp = timestamp
    card.sign = sign
  }

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(card)
  })
}

function generateFeishuSign(timestamp: string, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`
  const hmac = crypto.createHmac('sha256', stringToSign)
  return hmac.digest('base64')
}
```

### 企业微信 (WeChat Work)

**获取 Access Token:**
```typescript
async function getWechatAccessToken(corpId: string, secret: string): Promise<string> {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`
  const res = await fetch(url)
  const data = await res.json()
  return data.access_token
}
```

**发送消息:**
```typescript
async function sendWechatNotification(config: WechatConfig, message: NotificationMessage) {
  const accessToken = await getWechatAccessToken(config.corpId, config.secret)

  const payload = {
    touser: '@all', // 或指定用户
    msgtype: 'markdown',
    agentid: config.agentId,
    markdown: {
      content: formatMarkdown(message)
    }
  }

  await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
```

### 钉钉 (DingTalk)

**发送消息:**
```typescript
async function sendDingtalkNotification(config: DingtalkConfig, message: NotificationMessage) {
  let url = config.webhookUrl

  // 如果有 secret，需要签名
  if (config.secret) {
    const timestamp = Date.now()
    const sign = generateDingtalkSign(timestamp, config.secret)
    url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
  }

  const payload = {
    msgtype: 'actionCard',
    actionCard: {
      title: getTitle(message.type),
      text: formatMarkdown(message),
      btnOrientation: '0',
      btns: message.actions?.map(action => ({
        title: action.label,
        actionURL: `https://api.claudehome.cn/action/${message.task.taskId}/${action.id}`
      }))
    }
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

function generateDingtalkSign(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(stringToSign)
  return hmac.digest('base64')
}
```

---

## 数据模型

### Device (设备)
```sql
CREATE TABLE devices (
  id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255),
  platform VARCHAR(50),
  version VARCHAR(20),
  channels JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);
```

### Notification (通知)
```sql
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  device_id VARCHAR(36) REFERENCES devices(id),
  task_id VARCHAR(64),
  type VARCHAR(50),
  channels JSONB,
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Reply (回复) - Redis
```
Key: reply:{device_token}
Value: JSON array of replies
TTL: 24 hours
```

---

## 快速实现示例 (Hono + Cloudflare Workers)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// 中间件
app.use('*', cors())

// 设备 Token 验证中间件
const authMiddleware = async (c, next) => {
  const token = c.req.header('X-Device-Token')
  if (!token) {
    return c.json({ success: false, error: 'Missing device token' }, 401)
  }
  c.set('deviceToken', token)
  await next()
}

// 设备注册
app.post('/device/register', async (c) => {
  const body = await c.req.json()
  const token = `ccjk_dev_${crypto.randomUUID().replace(/-/g, '')}`
  const deviceId = `dev_${Date.now()}`

  // 存储到 KV 或数据库
  await c.env.DEVICES.put(token, JSON.stringify({
    deviceId,
    ...body,
    createdAt: new Date().toISOString()
  }))

  return c.json({
    success: true,
    data: { token, deviceId, registeredAt: new Date().toISOString() }
  })
})

// 发送通知
app.post('/notify', authMiddleware, async (c) => {
  const token = c.get('deviceToken')
  const body = await c.req.json()

  // 获取设备配置
  const deviceData = await c.env.DEVICES.get(token)
  if (!deviceData) {
    return c.json({ success: false, error: 'Device not found' }, 404)
  }

  const device = JSON.parse(deviceData)
  const results = []

  // 发送到各渠道
  for (const channel of body.channels) {
    const channelConfig = device.config?.channels?.[channel]
    if (channelConfig?.enabled) {
      try {
        await sendToChannel(channel, channelConfig, body)
        results.push({ success: true, channel, sentAt: new Date().toISOString() })
      } catch (error) {
        results.push({ success: false, channel, error: error.message })
      }
    }
  }

  const notificationId = `notif_${Date.now()}`

  return c.json({
    success: true,
    data: { notificationId, results }
  })
})

// 回复轮询
app.get('/reply/poll', authMiddleware, async (c) => {
  const token = c.get('deviceToken')

  // 检查是否有待处理的回复
  const replyKey = `reply:${token}`
  const replies = await c.env.REPLIES.get(replyKey)

  if (replies) {
    const replyList = JSON.parse(replies)
    if (replyList.length > 0) {
      const reply = replyList.shift()
      await c.env.REPLIES.put(replyKey, JSON.stringify(replyList))
      return c.json({ success: true, data: { reply } })
    }
  }

  // 无回复
  return c.json({ success: true, data: { reply: null } })
})

// Webhook 回调 (飞书)
app.post('/webhook/feishu', async (c) => {
  const body = await c.req.json()

  // 处理飞书卡片按钮回调
  if (body.action) {
    const { action_id, task_id } = body.action.value || {}
    const deviceToken = body.open_id // 需要映射到设备 token

    // 存储回复
    const replyKey = `reply:${deviceToken}`
    const replies = JSON.parse(await c.env.REPLIES.get(replyKey) || '[]')
    replies.push({
      taskId: task_id,
      content: action_id,
      channel: 'feishu',
      timestamp: new Date().toISOString(),
      actionId: action_id
    })
    await c.env.REPLIES.put(replyKey, JSON.stringify(replies), { expirationTtl: 86400 })
  }

  return c.json({ success: true })
})

export default app
```

---

## 错误码

| Code | 描述 |
|------|------|
| `DEVICE_NOT_FOUND` | 设备未注册 |
| `INVALID_TOKEN` | Token 无效或过期 |
| `CHANNEL_NOT_CONFIGURED` | 渠道未配置 |
| `CHANNEL_SEND_FAILED` | 渠道发送失败 |
| `RATE_LIMITED` | 请求频率超限 |
| `NETWORK_ERROR` | 网络错误 |

---

## 部署检查清单

- [ ] 配置域名 `api.claudehome.cn`
- [ ] 配置 HTTPS 证书
- [ ] 设置 CORS 允许 CCJK CLI 访问
- [ ] 配置 Redis/KV 存储
- [ ] 配置数据库（可选）
- [ ] 设置飞书/企业微信/钉钉 Webhook 回调 URL
- [ ] 配置日志和监控

---

## CLI 端配置

用户在 CCJK 中配置云服务端点：

```bash
# 配置云服务地址
ccjk config set notification.cloudEndpoint https://api.claudehome.cn

# 或在配置向导中自动设置
ccjk notification config
```

配置文件 `~/.ccjk/config.toml`:
```toml
[notification]
enabled = true
cloudEndpoint = "https://api.claudehome.cn"
threshold = 10
deviceToken = "ccjk_dev_xxx"

[notification.channels.feishu]
enabled = true
webhookUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
```

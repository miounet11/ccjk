# CCJK Cloud API 参考文档

> **Base URL**: `https://api.claudehome.cn`
> **Version**: 2.1.0
> **Last Updated**: 2026-01-11

---

## 目录

1. [快速开始](#快速开始)
2. [认证机制](#认证机制)
3. [设备绑定](#设备绑定)
4. [设备管理](#设备管理)
5. [通知发送](#通知发送)
6. [消息回复](#消息回复)
7. [错误处理](#错误处理)
8. [SDK 示例](#sdk-示例)

---

## 快速开始

### 绑定流程概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1. 网页登录    │ ──▶ │  2. 获取绑定码   │ ──▶ │  3. CLI 输入码   │
│  (邮箱验证码)    │     │   (6位字母数字)   │     │   (自动绑定)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 最简绑定示例

```bash
# 1. 用户在网页获取绑定码: 9RQ6DL

# 2. CLI 使用绑定码绑定设备
curl -X POST https://api.claudehome.cn/bind/use \
  -H "Content-Type: application/json" \
  -d '{
    "code": "9RQ6DL",
    "deviceInfo": {
      "name": "My MacBook",
      "platform": "darwin",
      "hostname": "macbook-pro.local"
    }
  }'

# 响应:
# {
#   "success": true,
#   "data": {
#     "deviceId": "dev_xxx",
#     "deviceToken": "ccjk_xxx",  <-- 保存此 Token！
#     "userId": "user_xxx"
#   }
# }

# 3. 使用 deviceToken 发送通知
curl -X POST https://api.claudehome.cn/notify \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: ccjk_xxx" \
  -d '{
    "type": "task_completed",
    "title": "任务完成",
    "body": "您的代码已成功部署！"
  }'
```

---

## 认证机制

CCJK Cloud 使用两种认证方式：

| 认证类型 | Header | 用途 |
|---------|--------|------|
| **用户 Session** | `Authorization: Bearer sess_xxx` | 网页端用户操作 |
| **设备 Token** | `X-Device-Token: ccjk_xxx` | CLI/设备端操作 |

### 用户认证流程

#### 1. 发送验证码

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

#### 2. 验证并获取 Token

```http
POST /auth/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "sess_F0TIA__cSD2Sbk61X1G7Ie_qwUhZbjQZ",
    "expiresAt": "2026-01-17T20:02:07.325Z",
    "user": {
      "id": "user_y-UBgzlWqLgY",
      "email": "user@example.com"
    }
  }
}
```

#### 3. 获取当前用户信息

```http
GET /auth/me
Authorization: Bearer sess_xxx
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_y-UBgzlWqLgY",
      "email": "user@example.com",
      "created_at": "2026-01-10 20:02:07"
    }
  }
}
```

#### 4. 登出

```http
POST /auth/logout
Authorization: Bearer sess_xxx
```

---

## 设备绑定

### 生成绑定码 (网页端)

```http
POST /bind/generate
Authorization: Bearer sess_xxx
```

**响应**:
```json
{
  "success": true,
  "data": {
    "code": "9RQ6DL",
    "expiresAt": "2026-01-10T20:07:07.495Z",
    "expiresIn": 300
  }
}
```

> ⚠️ 绑定码有效期 **5 分钟**，过期需重新生成

### 使用绑定码 (CLI 端)

```http
POST /bind/use
Content-Type: application/json

{
  "code": "9RQ6DL",
  "deviceInfo": {
    "name": "My MacBook Pro",
    "platform": "darwin",
    "hostname": "macbook-pro.local",
    "version": "1.0.0"
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_gb2raN4udPsk",
    "deviceToken": "ccjk_M3nLNX-4xnwg7aHq-vccY43x1hbDEW-F",
    "userId": "user_y-UBgzlWqLgY",
    "message": "Device bound successfully"
  }
}
```

> 🔑 **重要**: `deviceToken` 是设备的唯一凭证，请安全存储！

### 查询绑定码状态

```http
GET /bind/status/:code
```

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "expiresAt": "2026-01-10T20:07:07.495Z"
  }
}
```

### 获取用户设备列表 (网页端)

```http
GET /bind/devices
Authorization: Bearer sess_xxx
```

**响应**:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "dev_gb2raN4udPsk",
        "name": "My MacBook Pro",
        "platform": "darwin",
        "hostname": "macbook-pro.local",
        "version": "1.0.0",
        "createdAt": "2026-01-10 20:02:07",
        "lastSeenAt": "2026-01-10 20:03:44",
        "channels": [
          {
            "type": "feishu",
            "enabled": true
          }
        ]
      }
    ]
  }
}
```

### 删除设备 (网页端)

```http
DELETE /bind/devices/:deviceId
Authorization: Bearer sess_xxx
```

---

## 设备管理

> 以下接口使用 `X-Device-Token` 认证

### 获取设备信息

```http
GET /device/info
X-Device-Token: ccjk_xxx
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "dev_gb2raN4udPsk",
    "name": "My MacBook Pro",
    "platform": "darwin",
    "hostname": "macbook-pro.local",
    "version": "1.0.0",
    "userId": "user_y-UBgzlWqLgY",
    "createdAt": "2026-01-10 20:02:07",
    "lastSeenAt": "2026-01-10 20:03:44",
    "channels": [
      {
        "type": "feishu",
        "enabled": true,
        "config": { "webhookUrl": "..." }
      }
    ]
  }
}
```

### 获取通知渠道配置

```http
GET /device/channels
X-Device-Token: ccjk_xxx
```

### 更新通知渠道配置

```http
PUT /device/channels
X-Device-Token: ccjk_xxx
Content-Type: application/json

{
  "channels": [
    {
      "type": "feishu",
      "enabled": true,
      "config": {
        "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
      }
    },
    {
      "type": "dingtalk",
      "enabled": true,
      "config": {
        "webhookUrl": "https://oapi.dingtalk.com/robot/send?access_token=xxx",
        "secret": "SECxxx"
      }
    },
    {
      "type": "wechat",
      "enabled": false,
      "config": {
        "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
      }
    }
  ]
}
```

**支持的渠道类型**:

| 渠道 | type | 必需配置 |
|------|------|----------|
| 飞书 | `feishu` | `webhookUrl` |
| 钉钉 | `dingtalk` | `webhookUrl`, `secret` (可选) |
| 企业微信 | `wechat` | `webhookUrl` |
| 邮件 | `email` | `smtpHost`, `smtpPort`, `username`, `password`, `to` |
| 短信 | `sms` | 根据服务商配置 |

### 重新生成设备 Token

```http
POST /device/regenerate-token
X-Device-Token: ccjk_xxx
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "ccjk_NEW_TOKEN_xxx",
    "message": "Token regenerated. Please update your configuration."
  }
}
```

> ⚠️ 旧 Token 将立即失效

### 删除设备

```http
DELETE /device
X-Device-Token: ccjk_xxx
```

---

## 通知发送

### 发送通知

```http
POST /notify
X-Device-Token: ccjk_xxx
Content-Type: application/json

{
  "type": "task_completed",
  "title": "🎉 部署成功",
  "body": "您的应用已成功部署到生产环境。\n\n详情:\n- 版本: v1.2.3\n- 时间: 2026-01-10 20:00:00",
  "data": {
    "deployId": "deploy_123",
    "url": "https://example.com"
  },
  "channels": ["feishu", "dingtalk"],
  "waitReply": false
}
```

**参数说明**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 通知类型 |
| `title` | string | ✅ | 标题 (最长 100 字符) |
| `body` | string | ✅ | 内容 (最长 4000 字符) |
| `data` | object | ❌ | 附加数据 |
| `channels` | array | ❌ | 指定渠道，默认全部启用渠道 |
| `waitReply` | boolean | ❌ | 是否等待用户回复 |

**通知类型**:

| type | 说明 | 图标 |
|------|------|------|
| `task_progress` | 任务进度 | 🔄 |
| `task_completed` | 任务完成 | ✅ |
| `task_failed` | 任务失败 | ❌ |
| `ask_user` | 询问用户 | ❓ |
| `custom` | 自定义 | 📢 |

**响应**:
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_abc123",
    "channels": [
      { "type": "feishu", "success": true },
      { "type": "dingtalk", "success": true }
    ]
  }
}
```

### 发送测试通知

```http
POST /notify/test
X-Device-Token: ccjk_xxx
```

发送一条测试通知到所有已配置的渠道，用于验证配置是否正确。

### 获取通知历史

```http
GET /notify/history?limit=20&offset=0
X-Device-Token: ccjk_xxx
```

**响应**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_abc123",
        "type": "task_completed",
        "title": "🎉 部署成功",
        "body": "...",
        "status": "sent",
        "createdAt": "2026-01-10 20:03:44",
        "reply": null
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

---

## 消息回复

### 等待用户回复 (长轮询)

```http
GET /reply/poll?timeout=30000
X-Device-Token: ccjk_xxx
```

**参数**:
- `timeout`: 超时时间 (毫秒)，默认 30000，最大 60000

**响应** (有回复时):
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_abc123",
    "reply": {
      "content": "用户的回复内容",
      "channel": "feishu",
      "timestamp": "2026-01-10T20:05:00.000Z"
    }
  }
}
```

**响应** (超时无回复):
```json
{
  "success": true,
  "data": null,
  "message": "No reply received within timeout"
}
```

### 获取特定通知的回复

```http
GET /reply/:notificationId
X-Device-Token: ccjk_xxx
```

### 手动提交回复 (网页端)

```http
POST /reply/manual
Content-Type: application/json

{
  "notificationId": "notif_abc123",
  "content": "用户的回复内容",
  "deviceToken": "ccjk_xxx"
}
```

---

## Webhook 回调

第三方平台 (飞书/钉钉/企微) 的消息回调地址：

| 平台 | Webhook URL |
|------|-------------|
| 飞书 | `https://api.claudehome.cn/webhook/feishu` |
| 钉钉 | `https://api.claudehome.cn/webhook/dingtalk` |
| 企业微信 | `https://api.claudehome.cn/webhook/wechat` |

---

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误码

| HTTP 状态码 | 错误 | 说明 |
|------------|------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 认证失败 (Token 无效或过期) |
| 404 | Not Found | 资源不存在 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误示例

```json
{
  "success": false,
  "error": "Missing X-Device-Token header"
}
```

```json
{
  "success": false,
  "error": "Invalid or expired verification code"
}
```

```json
{
  "success": false,
  "error": "No enabled notification channels configured"
}
```

---

## SDK 示例

### TypeScript/JavaScript

```typescript
// ccjk-client.ts
class CCJKClient {
  private baseUrl = 'https://api.claudehome.cn';
  private deviceToken: string;

  constructor(deviceToken: string) {
    this.deviceToken = deviceToken;
  }

  // 绑定设备 (使用绑定码)
  static async bind(code: string, deviceInfo: {
    name?: string;
    platform?: string;
    hostname?: string;
    version?: string;
  }): Promise<{ deviceToken: string; deviceId: string }> {
    const res = await fetch('https://api.claudehome.cn/bind/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceInfo }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return {
      deviceToken: data.data.deviceToken,
      deviceId: data.data.deviceId,
    };
  }

  // 发送通知
  async notify(options: {
    type: 'task_progress' | 'task_completed' | 'task_failed' | 'ask_user' | 'custom';
    title: string;
    body: string;
    data?: Record<string, unknown>;
    waitReply?: boolean;
  }): Promise<{ notificationId: string }> {
    const res = await fetch(`${this.baseUrl}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': this.deviceToken,
      },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { notificationId: data.data.notificationId };
  }

  // 等待用户回复
  async waitForReply(timeout = 30000): Promise<string | null> {
    const res = await fetch(
      `${this.baseUrl}/reply/poll?timeout=${timeout}`,
      { headers: { 'X-Device-Token': this.deviceToken } }
    );
    const data = await res.json();
    return data.data?.reply?.content || null;
  }

  // 询问用户并等待回复
  async ask(question: string, timeout = 60000): Promise<string | null> {
    await this.notify({
      type: 'ask_user',
      title: '❓ 需要您的确认',
      body: question,
      waitReply: true,
    });
    return this.waitForReply(timeout);
  }
}

// 使用示例
async function main() {
  // 首次绑定
  const { deviceToken } = await CCJKClient.bind('9RQ6DL', {
    name: 'My CLI Tool',
    platform: process.platform,
    hostname: require('os').hostname(),
  });

  // 保存 deviceToken 到配置文件...

  // 创建客户端
  const client = new CCJKClient(deviceToken);

  // 发送通知
  await client.notify({
    type: 'task_completed',
    title: '✅ 构建完成',
    body: '项目构建成功，耗时 2 分 30 秒',
  });

  // 询问用户
  const answer = await client.ask('是否部署到生产环境？');
  console.log('用户回复:', answer);
}
```

### Python

```python
# ccjk_client.py
import requests
import os

class CCJKClient:
    BASE_URL = 'https://api.claudehome.cn'

    def __init__(self, device_token: str):
        self.device_token = device_token

    @classmethod
    def bind(cls, code: str, device_info: dict = None) -> 'CCJKClient':
        """使用绑定码绑定设备"""
        if device_info is None:
            import socket
            import platform
            device_info = {
                'name': f"{os.getenv('USER', 'unknown')}'s device",
                'platform': platform.system().lower(),
                'hostname': socket.gethostname(),
            }

        res = requests.post(f'{cls.BASE_URL}/bind/use', json={
            'code': code,
            'deviceInfo': device_info,
        })
        data = res.json()
        if not data['success']:
            raise Exception(data['error'])

        return cls(data['data']['deviceToken'])

    def notify(self, type: str, title: str, body: str, **kwargs) -> str:
        """发送通知"""
        res = requests.post(f'{self.BASE_URL}/notify',
            headers={'X-Device-Token': self.device_token},
            json={'type': type, 'title': title, 'body': body, **kwargs}
        )
        data = res.json()
        if not data['success']:
            raise Exception(data['error'])
        return data['data']['notificationId']

    def wait_for_reply(self, timeout: int = 30000) -> str | None:
        """等待用户回复"""
        res = requests.get(
            f'{self.BASE_URL}/reply/poll',
            params={'timeout': timeout},
            headers={'X-Device-Token': self.device_token}
        )
        data = res.json()
        if data['data'] and data['data'].get('reply'):
            return data['data']['reply']['content']
        return None

    def ask(self, question: str, timeout: int = 60000) -> str | None:
        """询问用户并等待回复"""
        self.notify('ask_user', '❓ 需要您的确认', question, waitReply=True)
        return self.wait_for_reply(timeout)


# 使用示例
if __name__ == '__main__':
    # 首次绑定
    client = CCJKClient.bind('9RQ6DL')
    print(f'Device Token: {client.device_token}')

    # 发送通知
    client.notify('task_completed', '✅ 任务完成', '数据处理完成，共处理 1000 条记录')

    # 询问用户
    answer = client.ask('是否继续处理下一批数据？')
    print(f'用户回复: {answer}')
```

### Shell/Bash

```bash
#!/bin/bash
# ccjk.sh - CCJK CLI 工具

CCJK_API="https://api.claudehome.cn"
CCJK_TOKEN_FILE="$HOME/.ccjk/token"

# 绑定设备
ccjk_bind() {
    local code="$1"
    local result=$(curl -s -X POST "$CCJK_API/bind/use" \
        -H "Content-Type: application/json" \
        -d "{
            \"code\": \"$code\",
            \"deviceInfo\": {
                \"name\": \"$(hostname)\",
                \"platform\": \"$(uname -s | tr '[:upper:]' '[:lower:]')\",
                \"hostname\": \"$(hostname)\"
            }
        }")

    local token=$(echo "$result" | grep -o '"deviceToken":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$token" ]; then
        mkdir -p "$(dirname "$CCJK_TOKEN_FILE")"
        echo "$token" > "$CCJK_TOKEN_FILE"
        echo "✅ 绑定成功！Token 已保存到 $CCJK_TOKEN_FILE"
    else
        echo "❌ 绑定失败: $result"
        return 1
    fi
}

# 发送通知
ccjk_notify() {
    local title="$1"
    local body="$2"
    local type="${3:-custom}"
    local token=$(cat "$CCJK_TOKEN_FILE" 2>/dev/null)

    if [ -z "$token" ]; then
        echo "❌ 未绑定设备，请先运行: ccjk_bind <绑定码>"
        return 1
    fi

    curl -s -X POST "$CCJK_API/notify" \
        -H "Content-Type: application/json" \
        -H "X-Device-Token: $token" \
        -d "{
            \"type\": \"$type\",
            \"title\": \"$title\",
            \"body\": \"$body\"
        }"
}

# 使用示例
# ccjk_bind "9RQ6DL"
# ccjk_notify "构建完成" "项目已成功构建" "task_completed"
```

---

## 健康检查

```http
GET /health
```

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T20:00:00.000Z",
  "uptime": 3600
}
```

---

## 速率限制

| 端点 | 限制 |
|------|------|
| `/auth/login` | 5 次/分钟/IP |
| `/auth/verify` | 10 次/分钟/IP |
| `/notify` | 60 次/分钟/设备 |
| `/reply/poll` | 10 次/分钟/设备 |
| 其他 | 100 次/分钟/设备 |

---

## 联系支持

- 📧 Email: support@claudehome.cn
- 🌐 Website: https://www.claudehome.cn
- 📖 Docs: https://www.claudehome.cn/docs

---

*© 2026 CCJK Cloud Service. All rights reserved.*

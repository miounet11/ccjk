# CCJK Cloud Service - 客户端绑定 API 文档

> **API Base URL**: `https://api.claudehome.cn`
> **Version**: 2.0.0
> **Last Updated**: 2025-01

---

## 📋 目录

1. [概述](#概述)
2. [快速开始](#快速开始)
3. [认证流程](#认证流程)
4. [设备绑定流程](#设备绑定流程)
5. [API 参考](#api-参考)
6. [错误处理](#错误处理)
7. [代码示例](#代码示例)

---

## 概述

CCJK Cloud Service 提供设备绑定和消息推送服务。本文档面向客户端开发者，介绍如何将 Claude Code 客户端与云服务绑定。

### 核心特性

- **极简绑定**: 6位绑定码，5分钟有效
- **多渠道通知**: 支持飞书、企业微信、钉钉
- **安全认证**: 邮箱验证码 + Session Token
- **设备管理**: 支持多设备绑定和管理

### 绑定流程概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web 控制台     │     │   Cloud API     │     │   CLI 客户端     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. 登录获取 Token     │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. 生成绑定码         │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  3. 返回 6位绑定码     │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  显示绑定码: ABC123   │                       │
         │                       │                       │
         │                       │  4. 用户输入绑定码     │
         │                       │<──────────────────────│
         │                       │                       │
         │                       │  5. 验证并绑定设备     │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │  6. 返回 Device Token  │
         │                       │<──────────────────────│
         │                       │                       │
         │  7. 轮询绑定状态       │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  8. 返回绑定成功       │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

---

## 快速开始

### CLI 客户端绑定（最简流程）

只需一个 API 调用即可完成设备绑定：

```bash
# 用户在网页获取绑定码后，CLI 执行：
curl -X POST https://api.claudehome.cn/bind/use \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123",
    "device": {
      "name": "My MacBook",
      "platform": "darwin",
      "hostname": "macbook-pro.local",
      "version": "1.0.0"
    }
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_abc123",
    "deviceToken": "dt_xxxxxxxxxxxxxxxx",
    "userId": "usr_xxxxxx",
    "message": "Device bound successfully"
  }
}
```

**保存 `deviceToken`**，后续所有 API 调用都需要它。

---

## 认证流程

### 1. 发送验证码

**POST** `/auth/login`

发送 6 位验证码到用户邮箱。

**请求：**
```json
{
  "email": "user@example.com"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

### 2. 验证并获取 Token

**POST** `/auth/verify`

验证邮箱验证码，获取 Session Token。

**请求：**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "token": "sess_xxxxxxxxxxxxxxxxxxxxxxxx",
    "expiresAt": "2025-01-20T10:00:00.000Z",
    "user": {
      "id": "usr_xxxxxx",
      "email": "user@example.com"
    }
  }
}
```

### 3. 获取当前用户信息

**GET** `/auth/me`

**Headers：**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_xxxxxx",
      "email": "user@example.com"
    }
  }
}
```

### 4. 登出

**POST** `/auth/logout`

**Headers：**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 设备绑定流程

### 方式一：绑定码绑定（推荐）

#### 步骤 1: 生成绑定码（Web 端）

**POST** `/bind/generate`

需要用户登录（Session Token）。

**Headers：**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "data": {
    "code": "ABC123",
    "expiresAt": "2025-01-13T10:05:00.000Z",
    "expiresIn": 300
  }
}
```

#### 步骤 2: 使用绑定码（CLI 端）

**POST** `/bind/use`

**无需认证**，任何人都可以使用有效的绑定码。

**请求：**
```json
{
  "code": "ABC123",
  "device": {
    "name": "My MacBook Pro",
    "platform": "darwin",
    "hostname": "macbook-pro.local",
    "version": "1.0.0"
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_abc123def456",
    "deviceToken": "dt_xxxxxxxxxxxxxxxxxxxxxxxx",
    "userId": "usr_xxxxxx",
    "message": "Device bound successfully"
  }
}
```

#### 步骤 3: 检查绑定状态（Web 端轮询）

**GET** `/bind/status/:code`

**Headers：**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应（等待中）：**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "expiresAt": "2025-01-13T10:05:00.000Z"
  }
}
```

**响应（已绑定）：**
```json
{
  "success": true,
  "data": {
    "status": "bound",
    "device": {
      "id": "dev_abc123def456",
      "name": "My MacBook Pro",
      "platform": "darwin"
    }
  }
}
```

**响应（已过期）：**
```json
{
  "success": true,
  "data": {
    "status": "expired"
  }
}
```

### 方式二：直接注册（需要 Device Token）

如果客户端已有 Device Token，可以直接注册：

**POST** `/device/register`

**请求：**
```json
{
  "name": "My Device",
  "platform": "darwin",
  "hostname": "my-mac.local",
  "version": "1.0.0"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "deviceId": "dev_xxxxxx",
    "token": "dt_xxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

---

## API 参考

### 设备管理

#### 获取设备列表

**GET** `/bind/devices`

**Headers：**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "dev_abc123",
        "name": "My MacBook Pro",
        "platform": "darwin",
        "hostname": "macbook-pro.local",
        "version": "1.0.0",
        "createdAt": "2025-01-13T10:00:00.000Z",
        "lastSeenAt": "2025-01-13T12:00:00.000Z",
        "channels": [
          {
            "type": "feishu",
            "enabled": true,
            "configured": true
          }
        ]
      }
    ]
  }
}
```

#### 删除设备

**DELETE** `/bind/devices/:id`

**Headers：**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

#### 获取设备信息

**GET** `/device/info`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "dev_abc123",
    "name": "My MacBook Pro",
    "platform": "darwin",
    "hostname": "macbook-pro.local",
    "version": "1.0.0",
    "createdAt": "2025-01-13T10:00:00.000Z",
    "lastSeenAt": "2025-01-13T12:00:00.000Z"
  }
}
```

### 通知渠道配置

#### 获取渠道配置

**GET** `/device/channels`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "type": "feishu",
        "enabled": true,
        "config": {
          "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
        }
      },
      {
        "type": "wechat",
        "enabled": false,
        "config": {}
      },
      {
        "type": "dingtalk",
        "enabled": false,
        "config": {}
      }
    ]
  }
}
```

#### 更新渠道配置

**PUT** `/device/channels`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**请求：**
```json
{
  "channels": [
    {
      "type": "feishu",
      "enabled": true,
      "config": {
        "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
        "secret": "optional-sign-secret"
      }
    },
    {
      "type": "wechat",
      "enabled": true,
      "config": {
        "webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
      }
    }
  ]
}
```

**响应：**
```json
{
  "success": true,
  "message": "Channels updated successfully"
}
```

### 发送通知

#### 发送通知

**POST** `/notify`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**请求：**
```json
{
  "type": "task_complete",
  "title": "任务完成",
  "body": "您的代码生成任务已完成",
  "data": {
    "taskId": "task_123",
    "duration": 120
  },
  "channels": ["feishu", "wechat"]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_xxxxxx",
    "sent": ["feishu", "wechat"],
    "failed": []
  }
}
```

#### 发送测试通知

**POST** `/notify/test`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**请求：**
```json
{
  "channel": "feishu"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Test notification sent to feishu"
}
```

### 回复处理

#### 轮询回复（长轮询）

**GET** `/reply/poll?timeout=30`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应（有回复）：**
```json
{
  "success": true,
  "data": {
    "reply": {
      "id": "reply_xxxxxx",
      "notificationId": "notif_xxxxxx",
      "channel": "feishu",
      "content": "用户的回复内容",
      "createdAt": "2025-01-13T12:00:00.000Z"
    }
  }
}
```

**响应（无回复）：**
```json
{
  "success": true,
  "data": {
    "reply": null
  }
}
```

#### 获取特定通知的回复

**GET** `/reply/:notificationId`

**Headers：**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**响应：**
```json
{
  "success": true,
  "data": {
    "reply": {
      "id": "reply_xxxxxx",
      "content": "用户的回复内容",
      "channel": "feishu",
      "createdAt": "2025-01-13T12:00:00.000Z"
    }
  }
}
```

---

## 错误处理

### 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误码

| HTTP 状态码 | 错误类型 | 说明 |
|------------|---------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或 Token 无效 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误示例

**无效绑定码：**
```json
{
  "success": false,
  "error": "Invalid or expired bind code"
}
```

**未授权：**
```json
{
  "success": false,
  "error": "Missing Authorization header"
}
```

**设备不存在：**
```json
{
  "success": false,
  "error": "Device not found"
}
```

---

## 代码示例

### TypeScript/JavaScript 客户端

```typescript
class CCJKClient {
  private baseUrl = 'https://api.claudehome.cn';
  private deviceToken: string | null = null;

  // 使用绑定码绑定设备
  async bindWithCode(code: string, deviceInfo: DeviceInfo): Promise<BindResult> {
    const response = await fetch(`${this.baseUrl}/bind/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, device: deviceInfo }),
    });

    const result = await response.json();

    if (result.success) {
      this.deviceToken = result.data.deviceToken;
      // 保存 token 到本地存储
      await this.saveToken(result.data.deviceToken);
    }

    return result;
  }

  // 发送通知
  async sendNotification(notification: Notification): Promise<void> {
    if (!this.deviceToken) {
      throw new Error('Device not bound');
    }

    const response = await fetch(`${this.baseUrl}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': this.deviceToken,
      },
      body: JSON.stringify(notification),
    });

    return response.json();
  }

  // 轮询回复
  async pollReply(timeout = 30): Promise<Reply | null> {
    if (!this.deviceToken) {
      throw new Error('Device not bound');
    }

    const response = await fetch(
      `${this.baseUrl}/reply/poll?timeout=${timeout}`,
      {
        headers: { 'X-Device-Token': this.deviceToken },
      }
    );

    const result = await response.json();
    return result.data?.reply || null;
  }

  private async saveToken(token: string): Promise<void> {
    // 实现本地存储逻辑
    // 例如：写入 ~/.ccjk/config.json
  }
}

// 使用示例
const client = new CCJKClient();

// 绑定设备
await client.bindWithCode('ABC123', {
  name: 'My MacBook',
  platform: process.platform,
  hostname: os.hostname(),
  version: '1.0.0',
});

// 发送通知
await client.sendNotification({
  type: 'task_complete',
  title: '任务完成',
  body: '代码生成已完成',
  channels: ['feishu'],
});

// 等待回复
const reply = await client.pollReply(30);
if (reply) {
  console.log('收到回复:', reply.content);
}
```

### Python 客户端

```python
import requests
import os
import socket

class CCJKClient:
    def __init__(self, base_url='https://api.claudehome.cn'):
        self.base_url = base_url
        self.device_token = None

    def bind_with_code(self, code: str, device_info: dict = None) -> dict:
        """使用绑定码绑定设备"""
        if device_info is None:
            device_info = {
                'name': f"{os.getlogin()}'s Device",
                'platform': os.name,
                'hostname': socket.gethostname(),
                'version': '1.0.0'
            }

        response = requests.post(
            f'{self.base_url}/bind/use',
            json={'code': code, 'device': device_info}
        )

        result = response.json()

        if result.get('success'):
            self.device_token = result['data']['deviceToken']
            self._save_token(self.device_token)

        return result

    def send_notification(self, title: str, body: str,
                         channels: list = None, **kwargs) -> dict:
        """发送通知"""
        if not self.device_token:
            raise Exception('Device not bound')

        response = requests.post(
            f'{self.base_url}/notify',
            headers={'X-Device-Token': self.device_token},
            json={
                'type': kwargs.get('type', 'notification'),
                'title': title,
                'body': body,
                'channels': channels or ['feishu'],
                'data': kwargs.get('data', {})
            }
        )

        return response.json()

    def poll_reply(self, timeout: int = 30) -> dict:
        """轮询回复"""
        if not self.device_token:
            raise Exception('Device not bound')

        response = requests.get(
            f'{self.base_url}/reply/poll',
            headers={'X-Device-Token': self.device_token},
            params={'timeout': timeout}
        )

        return response.json()

    def _save_token(self, token: str):
        """保存 token 到本地"""
        config_dir = os.path.expanduser('~/.ccjk')
        os.makedirs(config_dir, exist_ok=True)

        with open(os.path.join(config_dir, 'token'), 'w') as f:
            f.write(token)


# 使用示例
client = CCJKClient()

# 绑定设备
result = client.bind_with_code('ABC123')
print(f"绑定成功: {result}")

# 发送通知
client.send_notification(
    title='任务完成',
    body='您的代码生成任务已完成',
    channels=['feishu', 'wechat']
)

# 等待回复
reply = client.poll_reply(timeout=30)
if reply.get('data', {}).get('reply'):
    print(f"收到回复: {reply['data']['reply']['content']}")
```

### cURL 命令行示例

```bash
#!/bin/bash

API_URL="https://api.claudehome.cn"
BIND_CODE="ABC123"

# 1. 使用绑定码绑定设备
RESULT=$(curl -s -X POST "$API_URL/bind/use" \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$BIND_CODE\",
    \"device\": {
      \"name\": \"$(hostname)\",
      \"platform\": \"$(uname -s)\",
      \"hostname\": \"$(hostname)\",
      \"version\": \"1.0.0\"
    }
  }")

# 提取 device token
DEVICE_TOKEN=$(echo $RESULT | jq -r '.data.deviceToken')
echo "Device Token: $DEVICE_TOKEN"

# 保存 token
mkdir -p ~/.ccjk
echo $DEVICE_TOKEN > ~/.ccjk/token

# 2. 发送通知
curl -X POST "$API_URL/notify" \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: $DEVICE_TOKEN" \
  -d '{
    "type": "task_complete",
    "title": "任务完成",
    "body": "代码生成已完成",
    "channels": ["feishu"]
  }'

# 3. 轮询回复
curl -s "$API_URL/reply/poll?timeout=30" \
  -H "X-Device-Token: $DEVICE_TOKEN"
```

---

## 通知渠道配置指南

### 飞书 (Feishu)

1. 在飞书群中添加自定义机器人
2. 获取 Webhook URL
3. （可选）设置签名校验密钥

```json
{
  "type": "feishu",
  "enabled": true,
  "config": {
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx",
    "secret": "签名密钥（可选）"
  }
}
```

### 企业微信 (WeChat Work)

1. 在企业微信群中添加群机器人
2. 获取 Webhook URL

```json
{
  "type": "wechat",
  "enabled": true,
  "config": {
    "webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx"
  }
}
```

### 钉钉 (DingTalk)

1. 在钉钉群中添加自定义机器人
2. 获取 Webhook URL
3. （可选）设置签名密钥

```json
{
  "type": "dingtalk",
  "enabled": true,
  "config": {
    "webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxx",
    "secret": "签名密钥（可选）"
  }
}
```

---

## 安全建议

1. **保护 Device Token**: Device Token 是设备的唯一凭证，请妥善保管
2. **使用 HTTPS**: 所有 API 调用都应使用 HTTPS
3. **Token 轮换**: 定期使用 `/device/regenerate-token` 更新 Token
4. **最小权限**: 只配置需要的通知渠道

---

## 联系支持

- **官网**: https://www.claudehome.cn
- **API 状态**: https://api.claudehome.cn/health
- **GitHub**: https://github.com/anthropics/claude-code

---

*© 2025 CCJK Cloud Service. All rights reserved.*

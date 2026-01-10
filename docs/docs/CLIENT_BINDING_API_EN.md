# CCJK Cloud Service - Client Binding API Documentation

> **API Base URL**: `https://api.claudehome.cn`
> **Version**: 2.0.0
> **Last Updated**: January 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication Flow](#authentication-flow)
4. [Device Binding Flow](#device-binding-flow)
5. [API Reference](#api-reference)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)

---

## Overview

CCJK Cloud Service provides device binding and push notification services. This document is for client developers, explaining how to bind Claude Code clients with the cloud service.

### Core Features

- **Simple Binding**: 6-character bind code, valid for 5 minutes
- **Multi-channel Notifications**: Supports Feishu, WeChat Work, DingTalk
- **Secure Authentication**: Email verification + Session Token
- **Device Management**: Support for multiple device binding and management

### Binding Flow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Console   │     │   Cloud API     │     │   CLI Client    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Login & get Token │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. Generate bind code│                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  3. Return 6-char code│                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  Display: ABC123      │                       │
         │                       │                       │
         │                       │  4. User enters code  │
         │                       │<──────────────────────│
         │                       │                       │
         │                       │  5. Validate & bind   │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │  6. Return Device Token│
         │                       │<──────────────────────│
         │                       │                       │
         │  7. Poll bind status  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  8. Return success    │                       │
         │<──────────────────────│                       │
         │                       │                       │
```

---

## Quick Start

### CLI Client Binding (Simplest Flow)

Only one API call is needed to complete device binding:

```bash
# After user gets bind code from web, CLI executes:
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

**Response:**
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

**Save the `deviceToken`** - all subsequent API calls require it.

---

## Authentication Flow

### 1. Send Verification Code

**POST** `/auth/login`

Send a 6-digit verification code to user's email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

### 2. Verify and Get Token

**POST** `/auth/verify`

Verify email code and get Session Token.

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
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

### 3. Get Current User Info

**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
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

### 4. Logout

**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Device Binding Flow

### Method 1: Bind Code (Recommended)

#### Step 1: Generate Bind Code (Web Side)

**POST** `/bind/generate`

Requires user login (Session Token).

**Headers:**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
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

#### Step 2: Use Bind Code (CLI Side)

**POST** `/bind/use`

**No authentication required** - anyone can use a valid bind code.

**Request:**
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

**Response:**
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

#### Step 3: Check Bind Status (Web Side Polling)

**GET** `/bind/status/:code`

**Headers:**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response (Pending):**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "expiresAt": "2025-01-13T10:05:00.000Z"
  }
}
```

**Response (Bound):**
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

**Response (Expired):**
```json
{
  "success": true,
  "data": {
    "status": "expired"
  }
}
```

---

## API Reference

### Device Management

#### Get Device List

**GET** `/bind/devices`

**Headers:**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
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

#### Delete Device

**DELETE** `/bind/devices/:id`

**Headers:**
```
Authorization: Bearer sess_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

#### Get Device Info

**GET** `/device/info`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
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

### Notification Channels

#### Get Channel Configuration

**GET** `/device/channels`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
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

#### Update Channel Configuration

**PUT** `/device/channels`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Request:**
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

**Response:**
```json
{
  "success": true,
  "message": "Channels updated successfully"
}
```

### Send Notifications

#### Send Notification

**POST** `/notify`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Request:**
```json
{
  "type": "task_complete",
  "title": "Task Complete",
  "body": "Your code generation task is complete",
  "data": {
    "taskId": "task_123",
    "duration": 120
  },
  "channels": ["feishu", "wechat"]
}
```

**Response:**
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

#### Send Test Notification

**POST** `/notify/test`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Request:**
```json
{
  "channel": "feishu"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent to feishu"
}
```

### Reply Handling

#### Poll for Replies (Long Polling)

**GET** `/reply/poll?timeout=30`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response (Has Reply):**
```json
{
  "success": true,
  "data": {
    "reply": {
      "id": "reply_xxxxxx",
      "notificationId": "notif_xxxxxx",
      "channel": "feishu",
      "content": "User's reply content",
      "createdAt": "2025-01-13T12:00:00.000Z"
    }
  }
}
```

**Response (No Reply):**
```json
{
  "success": true,
  "data": {
    "reply": null
  }
}
```

#### Get Reply for Specific Notification

**GET** `/reply/:notificationId`

**Headers:**
```
X-Device-Token: dt_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": {
      "id": "reply_xxxxxx",
      "content": "User's reply content",
      "channel": "feishu",
      "createdAt": "2025-01-13T12:00:00.000Z"
    }
  }
}
```

---

## Error Handling

### Error Response Format

All error responses follow a unified format:

```json
{
  "success": false,
  "error": "Error description message"
}
```

### Common Error Codes

| HTTP Status | Error Type | Description |
|-------------|-----------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Not authenticated or invalid token |
| 403 | Forbidden | No permission to access |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Examples

**Invalid bind code:**
```json
{
  "success": false,
  "error": "Invalid or expired bind code"
}
```

**Unauthorized:**
```json
{
  "success": false,
  "error": "Missing Authorization header"
}
```

**Device not found:**
```json
{
  "success": false,
  "error": "Device not found"
}
```

---

## Code Examples

### TypeScript/JavaScript Client

```typescript
class CCJKClient {
  private baseUrl = 'https://api.claudehome.cn';
  private deviceToken: string | null = null;

  // Bind device with code
  async bindWithCode(code: string, deviceInfo: DeviceInfo): Promise<BindResult> {
    const response = await fetch(`${this.baseUrl}/bind/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, device: deviceInfo }),
    });

    const result = await response.json();

    if (result.success) {
      this.deviceToken = result.data.deviceToken;
      await this.saveToken(result.data.deviceToken);
    }

    return result;
  }

  // Send notification
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

  // Poll for replies
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
    // Implement local storage logic
    // e.g., write to ~/.ccjk/config.json
  }
}

// Usage example
const client = new CCJKClient();

// Bind device
await client.bindWithCode('ABC123', {
  name: 'My MacBook',
  platform: process.platform,
  hostname: os.hostname(),
  version: '1.0.0',
});

// Send notification
await client.sendNotification({
  type: 'task_complete',
  title: 'Task Complete',
  body: 'Code generation finished',
  channels: ['feishu'],
});

// Wait for reply
const reply = await client.pollReply(30);
if (reply) {
  console.log('Received reply:', reply.content);
}
```

### Python Client

```python
import requests
import os
import socket

class CCJKClient:
    def __init__(self, base_url='https://api.claudehome.cn'):
        self.base_url = base_url
        self.device_token = None

    def bind_with_code(self, code: str, device_info: dict = None) -> dict:
        """Bind device with code"""
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
        """Send notification"""
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
        """Poll for replies"""
        if not self.device_token:
            raise Exception('Device not bound')

        response = requests.get(
            f'{self.base_url}/reply/poll',
            headers={'X-Device-Token': self.device_token},
            params={'timeout': timeout}
        )

        return response.json()

    def _save_token(self, token: str):
        """Save token locally"""
        config_dir = os.path.expanduser('~/.ccjk')
        os.makedirs(config_dir, exist_ok=True)

        with open(os.path.join(config_dir, 'token'), 'w') as f:
            f.write(token)


# Usage example
client = CCJKClient()

# Bind device
result = client.bind_with_code('ABC123')
print(f"Bound successfully: {result}")

# Send notification
client.send_notification(
    title='Task Complete',
    body='Your code generation task is complete',
    channels=['feishu', 'wechat']
)

# Wait for reply
reply = client.poll_reply(timeout=30)
if reply.get('data', {}).get('reply'):
    print(f"Received reply: {reply['data']['reply']['content']}")
```

### cURL Command Line Examples

```bash
#!/bin/bash

API_URL="https://api.claudehome.cn"
BIND_CODE="ABC123"

# 1. Bind device with code
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

# Extract device token
DEVICE_TOKEN=$(echo $RESULT | jq -r '.data.deviceToken')
echo "Device Token: $DEVICE_TOKEN"

# Save token
mkdir -p ~/.ccjk
echo $DEVICE_TOKEN > ~/.ccjk/token

# 2. Send notification
curl -X POST "$API_URL/notify" \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: $DEVICE_TOKEN" \
  -d '{
    "type": "task_complete",
    "title": "Task Complete",
    "body": "Code generation finished",
    "channels": ["feishu"]
  }'

# 3. Poll for replies
curl -s "$API_URL/reply/poll?timeout=30" \
  -H "X-Device-Token: $DEVICE_TOKEN"
```

---

## Notification Channel Setup Guide

### Feishu

1. Add a custom bot in Feishu group
2. Get the Webhook URL
3. (Optional) Set signature verification secret

```json
{
  "type": "feishu",
  "enabled": true,
  "config": {
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx",
    "secret": "signature-secret (optional)"
  }
}
```

### WeChat Work

1. Add a group bot in WeChat Work
2. Get the Webhook URL

```json
{
  "type": "wechat",
  "enabled": true,
  "config": {
    "webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx"
  }
}
```

### DingTalk

1. Add a custom bot in DingTalk group
2. Get the Webhook URL
3. (Optional) Set signature secret

```json
{
  "type": "dingtalk",
  "enabled": true,
  "config": {
    "webhook": "https://oapi.dingtalk.com/robot/send?access_token=xxxxxxxx",
    "secret": "signature-secret (optional)"
  }
}
```

---

## Security Recommendations

1. **Protect Device Token**: Device Token is the unique credential for your device, keep it safe
2. **Use HTTPS**: All API calls should use HTTPS
3. **Token Rotation**: Periodically use `/device/regenerate-token` to update Token
4. **Least Privilege**: Only configure notification channels you need

---

## Support

- **Website**: https://www.claudehome.cn
- **API Status**: https://api.claudehome.cn/health
- **GitHub**: https://github.com/anthropics/claude-code

---

*© 2025 CCJK Cloud Service. All rights reserved.*

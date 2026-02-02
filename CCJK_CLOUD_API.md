# CCJK Cloud API 文档

> **最后更新**: 2026-02-02
> **API 版本**: v1.0.0
> **基础 URL**: `https://api.claudehome.cn`

---

## 目录

- [概述](#概述)
- [认证方式](#认证方式)
- [通用响应格式](#通用响应格式)
- [API 端点](#api-端点)
  - [健康检查](#健康检查)
  - [设备管理](#设备管理)
  - [通知系统](#通知系统)
  - [认证授权](#认证授权)
  - [云同步](#云同步)
  - [公开 API](#公开-api)
  - [API v1 - 统一接口](#api-v1---统一接口)
  - [API v8 - 客户端接口](#api-v8---客户端接口)
  - [云控制](#云控制)
  - [管理后台](#管理后台)
- [错误码说明](#错误码说明)

---

## 概述

CCJK Cloud API 是一个为 Claude Code 客户端提供云端服务的综合性后端平台，提供以下核心功能：

- **设备管理**: 设备注册、Token 管理、通道配置
- **多渠道通知**: 飞书、企业微信、钉钉消息推送
- **MCP 服务器市场**: Model Context Protocol 服务器注册与分发
- **技能市场**: Claude 技能的发现、安装、评分系统
- **AI 工具排名**: 多维度的 AI 工具比较和排名
- **提供商生态**: AI 服务提供商的统一管理
- **配置云同步**: 跨设备的配置同步服务

---

## 认证方式

### 1. 设备 Token 认证

用于设备相关的 API 调用。

```http
X-Device-Token: <device_token>
```

### 2. Bearer Token 认证

用于用户相关的 API 调用。

```http
Authorization: Bearer <jwt_token>
```

### 3. 管理员认证

管理后台 API 需要管理员凭证。

```http
Authorization: Basic <base64(username:password)>
```

---

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息"
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## API 端点

---

## 健康检查

### 获取服务状态

检查服务是否正常运行。

**请求**

```http
GET /health
```

**响应**

```json
{
  "status": "ok",
  "timestamp": "2026-02-02T10:00:00.000Z"
}
```

---

## 设备管理

### 注册设备

注册新设备并获取设备凭证。

**请求**

```http
POST /device/register
Content-Type: application/json

{
  "name": "我的设备",
  "type": "desktop",
  "platform": "macOS",
  "version": "1.0.0"
}
```

**参数说明**

| 参数     | 类型   | 必填 | 说明                                        |
| -------- | ------ | ---- | ------------------------------------------- |
| name     | string | 是   | 设备名称 (1-100字符)                        |
| type     | string | 否   | 设备类型: `desktop`, `mobile`, `web`, `cli` |
| platform | string | 否   | 操作系统平台                                |
| version  | string | 否   | 客户端版本                                  |

**响应**

```json
{
  "success": true,
  "data": {
    "deviceId": "dev_abc123",
    "token": "tok_xyz789",
    "name": "我的设备",
    "type": "desktop",
    "createdAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

### 获取设备信息

获取指定设备的详细信息。

**请求**

```http
GET /device/:deviceId
```

**响应**

```json
{
  "success": true,
  "data": {
    "deviceId": "dev_abc123",
    "name": "我的设备",
    "type": "desktop",
    "platform": "macOS",
    "version": "1.0.0",
    "channels": [
      {
        "type": "feishu",
        "webhookUrl": "https://...",
        "enabled": true
      }
    ],
    "createdAt": "2026-02-02T10:00:00.000Z",
    "lastActiveAt": "2026-02-02T12:00:00.000Z"
  }
}
```

---

### 重新生成 Token

为设备重新生成访问 Token。

**请求**

```http
POST /device/:deviceId/regenerate-token
X-Device-Token: <current_token>
```

**响应**

```json
{
  "success": true,
  "data": {
    "token": "tok_new123"
  }
}
```

---

### 更新设备通道

更新设备的通知通道配置。

**请求**

```http
PUT /device/:deviceId/channels
X-Device-Token: <device_token>
Content-Type: application/json

{
  "channels": [
    {
      "type": "feishu",
      "webhookUrl": "https://open.feishu.cn/...",
      "enabled": true
    },
    {
      "type": "wecom",
      "webhookUrl": "https://qyapi.weixin.qq.com/...",
      "enabled": true
    }
  ]
}
```

**通道类型**

| 类型     | 说明           |
| -------- | -------------- |
| feishu   | 飞书机器人     |
| wecom    | 企业微信机器人 |
| dingtalk | 钉钉机器人     |

**响应**

```json
{
  "success": true,
  "data": {
    "channels": [...]
  }
}
```

---

### 删除设备

删除指定设备。

**请求**

```http
DELETE /device/:deviceId
X-Device-Token: <device_token>
```

**响应**

```json
{
  "success": true,
  "message": "设备已删除"
}
```

---

## 通知系统

### 发送通知

向指定设备发送通知消息。

**请求**

```http
POST /notify
X-Device-Token: <device_token>
Content-Type: application/json

{
  "title": "通知标题",
  "content": "通知内容",
  "channel": "feishu",
  "priority": "normal"
}
```

**参数说明**

| 参数     | 类型   | 必填 | 说明                                           |
| -------- | ------ | ---- | ---------------------------------------------- |
| title    | string | 否   | 通知标题                                       |
| content  | string | 是   | 通知内容                                       |
| channel  | string | 否   | 指定通道: `feishu`, `wecom`, `dingtalk`, `all` |
| priority | string | 否   | 优先级: `low`, `normal`, `high`                |

**响应**

```json
{
  "success": true,
  "data": {
    "notificationId": "notif_123",
    "status": "sent",
    "sentAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

### 批量发送通知

向多个设备批量发送通知。

**请求**

```http
POST /notify/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceIds": ["dev_1", "dev_2", "dev_3"],
  "title": "批量通知",
  "content": "这是一条批量通知",
  "channel": "all"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "total": 3,
    "sent": 3,
    "failed": 0,
    "results": [...]
  }
}
```

---

## 认证授权

### 用户登录

用户登录获取访问令牌。

**请求**

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "用户名"
    }
  }
}
```

---

### 用户注册

注册新用户账号。

**请求**

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "用户名"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "用户名"
    }
  }
}
```

---

### 获取当前用户

获取当前登录用户的信息。

**请求**

```http
GET /auth/me
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "用户名",
    "tier": "pro",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## 云同步

### 推送配置

将本地配置推送到云端。

**请求**

```http
POST /cloud-sync/push
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": {
    "skills": [...],
    "mcpServers": {...},
    "prompts": [...],
    "hooks": [...]
  },
  "force": false
}
```

**参数说明**

| 参数  | 类型    | 必填 | 说明                 |
| ----- | ------- | ---- | -------------------- |
| data  | object  | 是   | 要同步的配置数据     |
| force | boolean | 否   | 是否强制覆盖云端数据 |

**响应**

```json
{
  "success": true,
  "data": {
    "syncId": "sync_123",
    "syncedAt": "2026-02-02T10:00:00.000Z",
    "conflicts": []
  }
}
```

---

### 拉取配置

从云端拉取配置到本地。

**请求**

```http
POST /cloud-sync/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "since": "2026-01-01T00:00:00.000Z",
  "types": ["skills", "mcpServers"]
}
```

**参数说明**

| 参数  | 类型   | 必填 | 说明               |
| ----- | ------ | ---- | ------------------ |
| since | string | 否   | 增量同步的起始时间 |
| types | array  | 否   | 要同步的配置类型   |

**响应**

```json
{
  "success": true,
  "data": {
    "skills": [...],
    "mcpServers": {...},
    "lastSyncAt": "2026-02-02T10:00:00.000Z"
  }
}
```

---

### 获取同步状态

获取当前同步状态。

**请求**

```http
GET /cloud-sync/status
Authorization: Bearer <token>
```

**响应**

```json
{
  "success": true,
  "data": {
    "lastSyncAt": "2026-02-02T10:00:00.000Z",
    "pendingChanges": 5,
    "conflicts": 0
  }
}
```

---

### 解决冲突

解决同步冲突。

**请求**

```http
POST /
```

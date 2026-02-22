# CCJK Remote Control - Backend API Reference

**Version**: v11.0.0
**Last Updated**: 2026-02-21

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [REST API](#rest-api)
5. [Socket.IO Events](#socketio-events)
6. [Data Models](#data-models)
7. [Error Codes](#error-codes)
8. [Rate Limits](#rate-limits)
9. [Webhooks](#webhooks)

---

## Overview

CCJK Remote Control backend provides:
- **REST API**: CRUD operations for sessions, machines, devices
- **Socket.IO**: Real-time bidirectional communication
- **End-to-end encryption**: Zero-knowledge architecture
- **GitHub OAuth**: Authentication via GitHub
- **Push notifications**: Expo Push for mobile

**Architecture:**
```
Client → REST API (HTTPS) → PostgreSQL
       → Socket.IO (WSS) → Daemon → Claude Code
```

---

## Base URL

**Production**: `https://your-domain.com`
**Development**: `http://localhost:3005`

All API endpoints are prefixed with `/api` except authentication endpoints.

---

## Authentication

### GitHub OAuth Flow

#### 1. Initiate OAuth

```http
GET /auth/github
```

**Response**: Redirect to GitHub OAuth consent page.

**Query Parameters** (optional):
- `redirect_uri` (string): Custom redirect URI after authentication

---

#### 2. OAuth Callback

```http
GET /auth/github/callback?code=xxx&state=yyy
```

**Query Parameters:**
- `code` (string, required): GitHub OAuth authorization code
- `state` (string, optional): CSRF protection state

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-abc123",
    "githubId": "12345678",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
    "createdAt": "2026-02-21T10:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": "invalid_code",
  "message": "GitHub OAuth code is invalid or expired"
}
```

---

#### 3. Verify Token

```http
GET /auth/verify
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user-abc123",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "expiresAt": "2026-03-21T10:00:00Z"
}
```

---

#### 4. Refresh Token

```http
POST /auth/refresh
Authorization: Bearer <token>
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-03-21T10:00:00Z"
}
```

---

### JWT Token

**Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Payload:**
```json
{
  "userId": "user-abc123",
  "githubId": "12345678",
  "iat": 1645459200,
  "exp": 1648051200
}
```

**Expiration**: 30 days

---

## REST API

### Sessions

#### List Sessions

```http
GET /api/sessions
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status (`active`, `idle`, `stopped`)
- `machineId` (string, optional): Filter by machine ID
- `limit` (number, optional, default: 50): Results per page
- `offset` (number, optional, default: 0): Pagination offset

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-abc123",
      "machineId": "machine-def456",
      "projectPath": "/Users/john/my-project",
      "codeToolType": "claude-code",
      "status": "active",
      "startedAt": "2026-02-21T10:30:00Z",
      "lastActivityAt": "2026-02-21T10:35:00Z",
      "metadata": {
        "branch": "main",
        "commit": "a1b2c3d"
      }
    }
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

---

#### Get Session

```http
GET /api/sessions/:id
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Session ID

**Response:**
```json
{
  "id": "session-abc123",
  "machineId": "machine-def456",
  "projectPath": "/Users/john/my-project",
  "codeToolType": "claude-code",
  "status": "active",
  "startedAt": "2026-02-21T10:30:00Z",
  "lastActivityAt": "2026-02-21T10:35:00Z",
  "stoppedAt": null,
  "metadata": {
    "branch": "main",
    "commit": "a1b2c3d"
  },
  "machine": {
    "id": "machine-def456",
    "name": "MacBook Pro",
    "hostname": "johns-mbp.local"
  }
}
```

**Error Response:**
```json
{
  "error": "not_found",
  "message": "Session not found"
}
```

---

#### Get Session Messages

```http
GET /api/sessions/:id/messages
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Session ID

**Query Parameters:**
- `limit` (number, optional, default: 50): Messages per page
- `offset` (number, optional, default: 0): Pagination offset
- `type` (string, optional): Filter by event type (`text`, `tool-call-start`, etc.)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-xyz789",
      "sessionId": "session-abc123",
      "envelope": {
        "nonce": "base64-encoded-nonce",
        "ciphertext": "base64-encoded-ciphertext"
      },
      "createdAt": "2026-02-21T10:31:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

#### Stop Session

```http
POST /api/sessions/:id/stop
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Session ID

**Body:**
```json
{
  "reason": "user_requested"
}
```

**Response:**
```json
{
  "id": "session-abc123",
  "status": "stopped",
  "stoppedAt": "2026-02-21T10:40:00Z"
}
```

---

### Machines

#### List Machines

```http
GET /api/machines
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status (`online`, `offline`)

**Response:**
```json
{
  "machines": [
    {
      "id": "machine-def456",
      "name": "MacBook Pro",
      "hostname": "johns-mbp.local",
      "platform": "darwin",
      "arch": "arm64",
      "osVersion": "14.2.1",
      "status": "online",
      "lastSeenAt": "2026-02-21T10:35:00Z",
      "createdAt": "2026-02-15T08:00:00Z"
    }
  ]
}
```

---

#### Get Machine

```http
GET /api/machines/:id
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Machine ID

**Response:**
```json
{
  "id": "machine-def456",
  "name": "MacBook Pro",
  "hostname": "johns-mbp.local",
  "platform": "darwin",
  "arch": "arm64",
  "osVersion": "14.2.1",
  "status": "online",
  "lastSeenAt": "2026-02-21T10:35:00Z",
  "createdAt": "2026-02-15T08:00:00Z",
  "sessions": [
    {
      "id": "session-abc123",
      "status": "active",
      "startedAt": "2026-02-21T10:30:00Z"
    }
  ]
}
```

---

#### Update Machine

```http
PATCH /api/machines/:id
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Machine ID

**Body:**
```json
{
  "name": "MacBook Pro (Work)"
}
```

**Response:**
```json
{
  "id": "machine-def456",
  "name": "MacBook Pro (Work)",
  "updatedAt": "2026-02-21T10:40:00Z"
}
```

---

### Devices

#### List Devices

```http
GET /api/devices
Authorization: Bearer <token>
```

**Response:**
```json
{
  "devices": [
    {
      "id": "device-ghi789",
      "name": "iPhone 15 Pro",
      "type": "mobile",
      "platform": "ios",
      "pushToken": "ExponentPushToken[xxx]",
      "lastSeenAt": "2026-02-21T10:35:00Z",
      "createdAt": "2026-02-15T08:00:00Z"
    }
  ]
}
```

---

#### Register Device

```http
POST /api/devices
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "iPhone 15 Pro",
  "type": "mobile",
  "platform": "ios",
  "pushToken": "ExponentPushToken[xxx]"
}
```

**Response:**
```json
{
  "id": "device-ghi789",
  "name": "iPhone 15 Pro",
  "type": "mobile",
  "platform": "ios",
  "pushToken": "ExponentPushToken[xxx]",
  "createdAt": "2026-02-21T10:40:00Z"
}
```

---

#### Update Device

```http
PATCH /api/devices/:id
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Device ID

**Body:**
```json
{
  "name": "iPhone 15 Pro (Personal)",
  "pushToken": "ExponentPushToken[yyy]"
}
```

**Response:**
```json
{
  "id": "device-ghi789",
  "name": "iPhone 15 Pro (Personal)",
  "pushToken": "ExponentPushToken[yyy]",
  "updatedAt": "2026-02-21T10:40:00Z"
}
```

---

#### Delete Device

```http
DELETE /api/devices/:id
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Device ID

**Response:**
```json
{
  "success": true
}
```

---

### Approval Requests

#### List Approval Requests

```http
GET /api/approvals
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (string, optional): Filter by status (`pending`, `approved`, `denied`, `expired`)
- `sessionId` (string, optional): Filter by session ID

**Response:**
```json
{
  "approvals": [
    {
      "id": "approval-jkl012",
      "requestId": "req-1234567890-abc123",
      "sessionId": "session-abc123",
      "tool": "Write",
      "pattern": "/src/**/*.ts",
      "status": "pending",
      "createdAt": "2026-02-21T10:35:00Z",
      "expiresAt": "2026-02-21T10:36:00Z"
    }
  ]
}
```

---

#### Respond to Approval

```http
POST /api/approvals/:id/respond
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Approval request ID

**Body:**
```json
{
  "approved": true
}
```

**Response:**
```json
{
  "id": "approval-jkl012",
  "status": "approved",
  "respondedAt": "2026-02-21T10:35:30Z"
}
```

---

### Notifications

#### List Notifications

```http
GET /api/notifications
Authorization: Bearer <token>
```

**Query Parameters:**
- `read` (boolean, optional): Filter by read status
- `type` (string, optional): Filter by type

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-mno345",
      "type": "permission-request",
      "title": "Permission Required",
      "body": "Allow Write for /src/**/*.ts?",
      "data": {
        "sessionId": "session-abc123",
        "requestId": "req-1234567890-abc123"
      },
      "read": false,
      "createdAt": "2026-02-21T10:35:00Z"
    }
  ]
}
```

---

#### Mark as Read

```http
POST /api/notifications/:id/read
Authorization: Bearer <token>
```

**Path Parameters:**
- `id` (string, required): Notification ID

**Response:**
```json
{
  "id": "notif-mno345",
  "read": true,
  "readAt": "2026-02-21T10:36:00Z"
}
```

---

## Socket.IO Events

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('https://your-domain.com', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

### Client → Server Events

#### `session:subscribe`

Subscribe to session events.

**Payload:**
```typescript
{
  sessionId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example:**
```typescript
socket.emit('session:subscribe', { sessionId: 'session-abc123' }, (response) => {
  if (response.success) {
    console.log('Subscribed to session');
  }
});
```

---

#### `session:unsubscribe`

Unsubscribe from session events.

**Payload:**
```typescript
{
  sessionId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

#### `remote:command`

Send command to Claude Code.

**Payload:**
```typescript
{
  sessionId: string;
  command: {
    type: 'input' | 'interrupt' | 'approve' | 'deny';
    text?: string;        // Required for 'input'
    requestId?: string;   // Required for 'approve' / 'deny'
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example:**
```typescript
socket.emit('remote:command', {
  sessionId: 'session-abc123',
  command: {
    type: 'input',
    text: 'Write a function to calculate fibonacci'
  }
}, (response) => {
  if (response.success) {
    console.log('Command sent');
  }
});
```

---

#### `approval:response`

Respond to permission request.

**Payload:**
```typescript
{
  requestId: string;
  approved: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

**Example:**
```typescript
socket.emit('approval:response', {
  requestId: 'req-1234567890-abc123',
  approved: true
}, (response) => {
  if (response.success) {
    console.log('Approval sent');
  }
});
```

---

### Server → Client Events

#### `session:event`

Session event (encrypted).

**Payload:**
```typescript
{
  sessionId: string;
  envelope: {
    nonce: string;      // Base64-encoded 24-byte nonce
    ciphertext: string; // Base64-encoded encrypted data
  };
}
```

**Decrypted Event Types:**

| Type | Fields |
|------|--------|
| `session-start` | `sessionId`, `metadata` |
| `session-stop` | `sessionId`, `reason` |
| `text` | `text`, `thinking` |
| `tool-call-start` | `callId`, `name`, `args` |
| `tool-call-end` | `callId`, `result` |
| `permission-request` | `requestId`, `tool`, `pattern` |
| `permission-response` | `requestId`, `approved` |
| `status` | `state`, `message` |
| `health-score` | `score`, `checks` |
| `brain-agent` | `agentId`, `action` |
| `mcp-service` | `serviceId`, `status` |

**Example:**
```typescript
socket.on('session:event', (data) => {
  const { sessionId, envelope } = data;

  // Decrypt envelope
  const event = decryptEnvelope(envelope, sessionKey);

  console.log('Event:', event);
});
```

---

#### `session:status`

Session status change.

**Payload:**
```typescript
{
  sessionId: string;
  status: 'active' | 'idle' | 'stopped';
  timestamp: string; // ISO 8601
}
```

---

#### `notification`

Push notification.

**Payload:**
```typescript
{
  id: string;
  type: 'permission-request' | 'session-start' | 'session-stop' | 'error';
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: string; // ISO 8601
}
```

**Example:**
```typescript
socket.on('notification', (notification) => {
  console.log('Notification:', notification.title);

  if (notification.type === 'permission-request') {
    // Show approval dialog
  }
});
```

---

#### `error`

Server error.

**Payload:**
```typescript
{
  code: string;
  message: string;
  details?: any;
}
```

---

## Data Models

### User

```typescript
interface User {
  id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Machine

```typescript
interface Machine {
  id: string;
  userId: string;
  name: string;
  hostname: string;
  platform: 'darwin' | 'linux' | 'win32';
  arch: 'x64' | 'arm64';
  osVersion: string;
  status: 'online' | 'offline';
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Device

```typescript
interface Device {
  id: string;
  userId: string;
  name: string;
  type: 'mobile' | 'web' | 'desktop';
  platform: 'ios' | 'android' | 'web';
  pushToken?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Session

```typescript
interface Session {
  id: string;
  machineId: string;
  projectPath: string;
  codeToolType: 'claude-code' | 'codex' | 'aider' | 'continue' | 'cline' | 'cursor';
  status: 'active' | 'idle' | 'stopped';
  startedAt: string;
  lastActivityAt: string;
  stoppedAt?: string;
  metadata?: Record<string, any>;
}
```

---

### Message

```typescript
interface Message {
  id: string;
  sessionId: string;
  envelope: {
    nonce: string;      // Base64
    ciphertext: string; // Base64
  };
  createdAt: string;
}
```

---

### ApprovalRequest

```typescript
interface ApprovalRequest {
  id: string;
  requestId: string;
  sessionId: string;
  tool: string;
  pattern: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
}
```

---

### Notification

```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'permission-request' | 'session-start' | 'session-stop' | 'error';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | No access to resource |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Server temporarily unavailable |

---

### Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

---

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `invalid_token` | 401 | JWT token is invalid or expired |
| `missing_token` | 401 | Authorization header missing |
| `invalid_request` | 400 | Request body validation failed |
| `not_found` | 404 | Resource not found |
| `forbidden` | 403 | User doesn't own resource |
| `rate_limit_exceeded` | 429 | Too many requests |
| `session_not_active` | 400 | Session is not active |
| `approval_expired` | 400 | Approval request expired |
| `invalid_command` | 400 | Invalid remote command |
| `encryption_failed` | 500 | Failed to encrypt/decrypt |
| `database_error` | 500 | Database operation failed |

---

## Rate Limits

### REST API

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/*` | 10 requests | 1 minute |
| `GET /api/sessions` | 100 requests | 1 minute |
| `GET /api/sessions/:id` | 100 requests | 1 minute |
| `GET /api/sessions/:id/messages` | 50 requests | 1 minute |
| `POST /api/sessions/:id/stop` | 10 requests | 1 minute |
| `GET /api/machines` | 100 requests | 1 minute |
| `POST /api/devices` | 10 requests | 1 hour |
| `POST /api/approvals/:id/respond` | 100 requests | 1 minute |

---

### Socket.IO

| Event | Limit | Window |
|-------|-------|--------|
| `session:subscribe` | 100 events | 1 minute |
| `remote:command` | 100 events | 1 minute |
| `approval:response` | 100 events | 1 minute |

---

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645459200
Retry-After: 60
```

---

### Rate Limit Error

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetAt": "2026-02-21T10:41:00Z"
  }
}
```

---

## Webhooks

### Overview

Webhooks allow you to receive real-time notifications via HTTP POST requests.

**Use cases:**
- Log session events to external systems
- Trigger CI/CD pipelines
- Send custom notifications
- Integrate with third-party tools

---

### Register Webhook

```http
POST /api/webhooks
Authorization: Bearer <token>
```

**Body:**
```json
{
  "url": "https://your-app.com/webhooks/ccjk",
  "events": ["session:start", "session:stop", "permission:request"],
  "secret": "your-webhook-secret"
}
```

**Response:**
```json
{
  "id": "webhook-pqr678",
  "url": "https://your-app.com/webhooks/ccjk",
  "events": ["session:start", "session:stop", "permission:request"],
  "createdAt": "2026-02-21T10:40:00Z"
}
```

---

### Webhook Payload

```json
{
  "id": "event-stu901",
  "type": "session:start",
  "timestamp": "2026-02-21T10:30:00Z",
  "data": {
    "sessionId": "session-abc123",
    "machineId": "machine-def456",
    "projectPath": "/Users/john/my-project"
  }
}
```

---

### Webhook Signature

Verify webhook authenticity using HMAC-SHA256:

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Express middleware
app.post('/webhooks/ccjk', (req, res) => {
  const signature = req.headers['x-ccjk-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  res.json({ success: true });
});
```

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { CCJKClient } from '@ccjk/client';

const client = new CCJKClient({
  baseUrl: 'https://your-domain.com',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});

// List sessions
const sessions = await client.sessions.list();

// Subscribe to session
client.socket.on('session:event', (data) => {
  const event = client.decrypt(data.envelope);
  console.log('Event:', event);
});

client.socket.emit('session:subscribe', { sessionId: 'session-abc123' });

// Approve permission
await client.approvals.respond('approval-jkl012', true);
```

---

### Python

```python
from ccjk import CCJKClient

client = CCJKClient(
    base_url='https://your-domain.com',
    token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
)

# List sessions
sessions = client.sessions.list()

# Subscribe to session
@client.socket.on('session:event')
def handle_event(data):
    event = client.decrypt(data['envelope'])
    print('Event:', event)

client.socket.emit('session:subscribe', {'sessionId': 'session-abc123'})

# Approve permission
client.approvals.respond('approval-jkl012', approved=True)
```

---

### Go

```go
package main

import (
    "github.com/your-org/ccjk-go"
)

func main() {
    client := ccjk.NewClient(&ccjk.Config{
        BaseURL: "https://your-domain.com",
        Token:   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })

    // List sessions
    sessions, err := client.Sessions.List()
    if err != nil {
        panic(err)
    }

    // Subscribe to session
    client.Socket.On("session:event", func(data map[string]interface{}) {
        event := client.Decrypt(data["envelope"])
        fmt.Println("Event:", event)
    })

    client.Socket.Emit("session:subscribe", map[string]string{
        "sessionId": "session-abc123",
    })

    // Approve permission
    err = client.Approvals.Respond("approval-jkl012", true)
}
```

---

## Support

- **Documentation**: https://github.com/your-org/ccjk-public/docs
- **API Status**: https://status.your-domain.com
- **Issues**: https://github.com/your-org/ccjk-public/issues
- **Discord**: https://discord.gg/your-server

---

**Next Steps:**
1. Read [Client Integration Guide](./client-integration-guide.md)
2. Read [Production Deployment Guide](./production-deployment-guide.md)
3. Check [Example Clients](../examples/clients/)

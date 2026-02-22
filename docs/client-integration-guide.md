# CCJK Remote Control - Client Integration Guide

**Version**: v11.0.0
**Last Updated**: 2026-02-21

---

## Overview

This guide shows how to build custom clients (mobile, web, desktop, CLI) that can remotely control Claude Code sessions through the CCJK Remote Control backend.

**What you can build:**
- Mobile apps (iOS, Android)
- Web dashboards
- Desktop applications
- CLI tools
- Browser extensions
- VS Code extensions

**What clients can do:**
- Monitor Claude Code sessions in real-time
- View tool calls, text output, status changes
- Approve/deny permission requests remotely
- Send commands to Claude Code
- View health scores and brain agent activity
- Manage MCP services

---

## Architecture

```
┌─────────────────┐
│  Your Client    │ ← You build this
│  (Mobile/Web)   │
└────────┬────────┘
         │ HTTPS + Socket.IO
         ↓
┌─────────────────┐
│  CCJK Server    │ ← We provide this
│  (Railway/VPS)  │
└────────┬────────┘
         │ Socket.IO
         ↓
┌─────────────────┐
│  CCJK Daemon    │ ← Runs on dev machine
│  (Local)        │
└────────┬────────┘
         │ Process spawn
         ↓
┌─────────────────┐
│  Claude Code    │
└─────────────────┘
```

**Key Concepts:**
- **End-to-end encryption**: Server cannot decrypt session content
- **Zero-knowledge**: Server only routes encrypted messages
- **Real-time**: Socket.IO for bidirectional communication
- **Stateless**: JWT authentication, no server-side sessions

---

## Quick Start

### 1. Authentication

**Step 1: GitHub OAuth**

```http
GET https://your-server.com/auth/github
```

User is redirected to GitHub OAuth consent page.

**Step 2: Callback**

```http
GET https://your-server.com/auth/github/callback?code=xxx
```

Server exchanges code for GitHub token and returns JWT:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "githubId": "12345678",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

**Step 3: Store Token**

Store JWT in secure storage:
- **Mobile**: Keychain (iOS), Keystore (Android)
- **Web**: HttpOnly cookie or localStorage (less secure)
- **Desktop**: OS credential manager

**Step 4: Use Token**

Include in all API requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2. Connect to Socket.IO

```typescript
import { io } from 'socket.io-client';

const socket = io('https://your-server.com', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

---

### 3. Subscribe to Sessions

**Get Active Sessions:**

```http
GET /api/sessions
Authorization: Bearer <token>
```

Response:

```json
{
  "sessions": [
    {
      "id": "session-123",
      "machineId": "machine-456",
      "projectPath": "/Users/john/my-project",
      "codeToolType": "claude-code",
      "status": "active",
      "startedAt": "2026-02-21T10:30:00Z",
      "lastActivityAt": "2026-02-21T10:35:00Z"
    }
  ]
}
```

**Subscribe to Session Events:**

```typescript
socket.emit('session:subscribe', { sessionId: 'session-123' });

socket.on('session:event', (data) => {
  const { sessionId, envelope } = data;

  // Decrypt envelope
  const event = decryptEnvelope(envelope, sessionKey);

  console.log('Event:', event);
});
```

---

### 4. Handle Events

**Event Types:**

| Type | Description | Data |
|------|-------------|------|
| `session-start` | Session started | `{ sessionId, metadata }` |
| `session-stop` | Session ended | `{ sessionId, reason }` |
| `text` | Text output | `{ text, thinking }` |
| `tool-call-start` | Tool execution begins | `{ callId, name, args }` |
| `tool-call-end` | Tool execution ends | `{ callId, result }` |
| `permission-request` | Permission needed | `{ requestId, tool, pattern }` |
| `permission-response` | Permission decided | `{ requestId, approved }` |
| `status` | Status change | `{ state, message }` |
| `health-score` | Health score update | `{ score, checks }` |
| `brain-agent` | Brain agent activity | `{ agentId, action }` |
| `mcp-service` | MCP service event | `{ serviceId, status }` |

**Example: Handle Permission Request**

```typescript
socket.on('session:event', (data) => {
  const event = decryptEnvelope(data.envelope, sessionKey);

  if (event.t === 'permission-request') {
    // Show notification to user
    showNotification({
      title: 'Permission Required',
      body: `Allow ${event.tool} for ${event.pattern}?`,
      actions: [
        { id: 'approve', title: 'Approve' },
        { id: 'deny', title: 'Deny' }
      ]
    });
  }
});
```

---

### 5. Send Approval Response

```typescript
function handleApproval(requestId: string, approved: boolean) {
  socket.emit('approval:response', {
    requestId,
    approved
  });
}
```

Server forwards to daemon → daemon sends to Claude Code.

---

### 6. Send Remote Commands

```typescript
socket.emit('remote:command', {
  sessionId: 'session-123',
  command: {
    type: 'input',
    text: 'Write a function to calculate fibonacci'
  }
});
```

**Command Types:**

| Type | Description | Data |
|------|-------------|------|
| `input` | Send text input | `{ text }` |
| `interrupt` | Send Ctrl+C | `{}` |
| `approve` | Approve permission | `{ requestId }` |
| `deny` | Deny permission | `{ requestId }` |

---

## Encryption

### Overview

CCJK uses **end-to-end encryption** with TweetNaCl:
- **Session keys**: Random 32-byte keys per session
- **Key exchange**: Encrypted with user's public key
- **Message encryption**: NaCl secretbox (XSalsa20 + Poly1305)

### Decrypt Envelope

```typescript
import nacl from 'tweetnacl';
import { decodeBase64, encodeUTF8 } from 'tweetnacl-util';

interface Envelope {
  nonce: string;      // Base64-encoded 24-byte nonce
  ciphertext: string; // Base64-encoded encrypted data
}

function decryptEnvelope(envelope: Envelope, sessionKey: Uint8Array) {
  const nonce = decodeBase64(envelope.nonce);
  const ciphertext = decodeBase64(envelope.ciphertext);

  const plaintext = nacl.secretbox.open(ciphertext, nonce, sessionKey);
  if (!plaintext) throw new Error('Decryption failed');

  const json = encodeUTF8(plaintext);
  return JSON.parse(json);
}
```

### Get Session Key

**Option 1: From Daemon Config**

If you have access to the dev machine:

```bash
cat ~/.ccjk/daemon.json
```

```json
{
  "sessions": {
    "session-123": {
      "sessionKey": "base64-encoded-key"
    }
  }
}
```

**Option 2: Key Exchange (Future)**

Server will support encrypted key exchange using user's public key.

---

## REST API Reference

### Authentication

#### `GET /auth/github`

Initiate GitHub OAuth flow.

**Response**: Redirect to GitHub OAuth consent page.

---

#### `GET /auth/github/callback`

OAuth callback endpoint.

**Query Parameters:**
- `code` (string): GitHub OAuth code

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "githubId": "12345678",
    "username": "johndoe",
    "email": "john@example.com",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

---

### Sessions

#### `GET /api/sessions`

Get all active sessions for authenticated user.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-123",
      "machineId": "machine-456",
      "projectPath": "/Users/john/my-project",
      "codeToolType": "claude-code",
      "status": "active",
      "startedAt": "2026-02-21T10:30:00Z",
      "lastActivityAt": "2026-02-21T10:35:00Z"
    }
  ]
}
```

---

#### `GET /api/sessions/:id`

Get session details.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "session-123",
  "machineId": "machine-456",
  "projectPath": "/Users/john/my-project",
  "codeToolType": "claude-code",
  "status": "active",
  "startedAt": "2026-02-21T10:30:00Z",
  "lastActivityAt": "2026-02-21T10:35:00Z",
  "messages": [
    {
      "id": "msg-1",
      "envelope": {
        "nonce": "...",
        "ciphertext": "..."
      },
      "createdAt": "2026-02-21T10:31:00Z"
    }
  ]
}
```

---

#### `GET /api/sessions/:id/messages`

Get session messages (paginated).

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (number, default: 50): Messages per page
- `offset` (number, default: 0): Pagination offset

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "envelope": {
        "nonce": "...",
        "ciphertext": "..."
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

### Machines

#### `GET /api/machines`

Get all machines for authenticated user.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "machines": [
    {
      "id": "machine-456",
      "name": "MacBook Pro",
      "hostname": "johns-mbp.local",
      "platform": "darwin",
      "arch": "arm64",
      "lastSeenAt": "2026-02-21T10:35:00Z"
    }
  ]
}
```

---

### Devices

#### `GET /api/devices`

Get all registered devices (mobile, web) for authenticated user.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "devices": [
    {
      "id": "device-789",
      "name": "iPhone 15 Pro",
      "type": "mobile",
      "pushToken": "ExponentPushToken[xxx]",
      "lastSeenAt": "2026-02-21T10:35:00Z"
    }
  ]
}
```

---

#### `POST /api/devices`

Register a new device.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "iPhone 15 Pro",
  "type": "mobile",
  "pushToken": "ExponentPushToken[xxx]"
}
```

**Response:**
```json
{
  "id": "device-789",
  "name": "iPhone 15 Pro",
  "type": "mobile",
  "pushToken": "ExponentPushToken[xxx]",
  "createdAt": "2026-02-21T10:35:00Z"
}
```

---

## Socket.IO Events

### Client → Server

#### `session:subscribe`

Subscribe to session events.

**Payload:**
```typescript
{
  sessionId: string;
}
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

---

#### `remote:command`

Send command to Claude Code.

**Payload:**
```typescript
{
  sessionId: string;
  command: {
    type: 'input' | 'interrupt' | 'approve' | 'deny';
    text?: string;        // For 'input'
    requestId?: string;   // For 'approve' / 'deny'
  };
}
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

---

### Server → Client

#### `session:event`

Session event (encrypted).

**Payload:**
```typescript
{
  sessionId: string;
  envelope: {
    nonce: string;      // Base64
    ciphertext: string; // Base64
  };
}
```

**Decrypted Event:**
```typescript
{
  t: 'text' | 'tool-call-start' | 'permission-request' | ...;
  // ... event-specific fields
}
```

---

#### `session:status`

Session status change.

**Payload:**
```typescript
{
  sessionId: string;
  status: 'active' | 'idle' | 'stopped';
}
```

---

#### `notification`

Push notification.

**Payload:**
```typescript
{
  id: string;
  type: 'permission-request' | 'session-start' | 'error';
  title: string;
  body: string;
  data?: Record<string, any>;
}
```

---

## Client Examples

### React Native (Expo)

```typescript
import { io } from 'socket.io-client';
import nacl from 'tweetnacl';
import { decodeBase64, encodeUTF8 } from 'tweetnacl-util';

// 1. Authenticate
async function login() {
  const response = await fetch('https://your-server.com/auth/github');
  // Handle OAuth flow...
  const { token } = await response.json();
  return token;
}

// 2. Connect Socket.IO
const socket = io('https://your-server.com', {
  auth: { token }
});

// 3. Subscribe to session
socket.emit('session:subscribe', { sessionId: 'session-123' });

// 4. Handle events
socket.on('session:event', (data) => {
  const event = decryptEnvelope(data.envelope, sessionKey);

  if (event.t === 'permission-request') {
    Alert.alert(
      'Permission Required',
      `Allow ${event.tool} for ${event.pattern}?`,
      [
        {
          text: 'Deny',
          onPress: () => socket.emit('approval:response', {
            requestId: event.requestId,
            approved: false
          })
        },
        {
          text: 'Approve',
          onPress: () => socket.emit('approval:response', {
            requestId: event.requestId,
            approved: true
          })
        }
      ]
    );
  }
});
```

---

### Web (React)

```typescript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function SessionMonitor({ sessionId, token, sessionKey }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const socket = io('https://your-server.com', {
      auth: { token }
    });

    socket.emit('session:subscribe', { sessionId });

    socket.on('session:event', (data) => {
      const event = decryptEnvelope(data.envelope, sessionKey);
      setEvents(prev => [...prev, event]);
    });

    return () => {
      socket.emit('session:unsubscribe', { sessionId });
      socket.disconnect();
    };
  }, [sessionId, token, sessionKey]);

  return (
    <div>
      {events.map((event, i) => (
        <div key={i}>
          {event.t === 'text' && <p>{event.text}</p>}
          {event.t === 'permission-request' && (
            <button onClick={() => handleApproval(event.requestId, true)}>
              Approve {event.tool}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### CLI (Node.js)

```typescript
import { io } from 'socket.io-client';
import inquirer from 'inquirer';

const socket = io('https://your-server.com', {
  auth: { token: process.env.CCJK_TOKEN }
});

socket.emit('session:subscribe', { sessionId: process.argv[2] });

socket.on('session:event', async (data) => {
  const event = decryptEnvelope(data.envelope, sessionKey);

  if (event.t === 'permission-request') {
    const { approved } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'approved',
        message: `Allow ${event.tool} for ${event.pattern}?`
      }
    ]);

    socket.emit('approval:response', {
      requestId: event.requestId,
      approved
    });
  }
});
```

---

## Push Notifications

### Expo Push Notifications

**1. Register Device**

```typescript
import * as Notifications from 'expo-notifications';

async function registerDevice() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await fetch('https://your-server.com/api/devices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'iPhone 15 Pro',
      type: 'mobile',
      pushToken: token
    })
  });
}
```

**2. Handle Notifications**

```typescript
Notifications.addNotificationReceivedListener((notification) => {
  const { type, sessionId, requestId } = notification.request.content.data;

  if (type === 'permission-request') {
    // Show in-app alert
  }
});

Notifications.addNotificationResponseReceivedListener((response) => {
  const { actionId, data } = response;

  if (actionId === 'approve') {
    socket.emit('approval:response', {
      requestId: data.requestId,
      approved: true
    });
  }
});
```

---

## Security Best Practices

### 1. Token Storage

**✅ Good:**
- iOS: Keychain
- Android: Keystore
- Web: HttpOnly cookie

**❌ Bad:**
- localStorage (XSS vulnerable)
- Plain text files
- URL parameters

---

### 2. Session Key Management

**✅ Good:**
- Store in secure storage
- Rotate keys periodically
- Delete on logout

**❌ Bad:**
- Hardcode in source
- Store in localStorage
- Share between users

---

### 3. Network Security

**✅ Good:**
- Use HTTPS only
- Validate SSL certificates
- Use WebSocket Secure (wss://)

**❌ Bad:**
- HTTP in production
- Ignore SSL errors
- Unencrypted WebSocket (ws://)

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid/expired token | Re-authenticate |
| `403 Forbidden` | No access to session | Check ownership |
| `404 Not Found` | Session doesn't exist | Verify session ID |
| `429 Too Many Requests` | Rate limit exceeded | Implement backoff |
| `500 Internal Server Error` | Server error | Retry with exponential backoff |

### Retry Strategy

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await sleep(parseInt(retryAfter || '1000'));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/*` | 10 requests | 1 minute |
| `GET /api/sessions` | 100 requests | 1 minute |
| `GET /api/sessions/:id` | 100 requests | 1 minute |
| `POST /api/devices` | 10 requests | 1 hour |
| Socket.IO events | 1000 events | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645459200
```

---

## Testing

### Test Server

Use the test server for development:

```bash
cd packages/ccjk-server
pnpm dev
```

Server runs at `http://localhost:3005`.

### Mock Data

```typescript
// Mock session event
const mockEvent = {
  t: 'text',
  text: 'Hello from Claude Code!',
  thinking: false
};

// Encrypt
const envelope = encryptEvent(mockEvent, sessionKey);

// Send via Socket.IO
socket.emit('session:event', {
  sessionId: 'test-session',
  envelope
});
```

---

## Support

- **Documentation**: https://github.com/your-org/ccjk-public/docs
- **Issues**: https://github.com/your-org/ccjk-public/issues
- **Discord**: https://discord.gg/your-server

---

**Next Steps:**
1. Read [Backend API Reference](./backend-api-reference.md)
2. Read [Production Deployment Guide](./production-deployment-guide.md)
3. Check [Example Clients](../examples/clients/)

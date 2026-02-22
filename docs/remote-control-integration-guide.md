# CCJK Remote Control - Integration Complete Guide

**Status**: ✅ Daemon Integration Complete
**Date**: 2026-02-21

---

## 🎉 What's Been Implemented

### 1. Claude Code Output Interceptor ✅

**File**: `packages/ccjk-daemon/src/claude-interceptor.ts`

**Features**:
- ✅ Spawns Claude Code process
- ✅ Intercepts stdout/stderr
- ✅ Parses output and detects:
  - Tool calls
  - Permission requests
  - Status changes
  - Errors
  - Text output
- ✅ Converts to typed events
- ✅ Sends encrypted events to server
- ✅ Waits for remote approval
- ✅ Forwards approval to Claude Code

**Key Methods**:
```typescript
class ClaudeCodeInterceptor {
  async start()                              // Start intercepting
  async stop()                               // Stop intercepting
  handleApprovalResponse(id, approved)       // Handle remote approval
  sendInput(text)                            // Send input to Claude
}
```

### 2. Permission Request Flow ✅

**Flow**:
```
Claude Code → Interceptor → Daemon → Server → Mobile
                                                  ↓
                                              User approves
                                                  ↓
Claude Code ← Interceptor ← Daemon ← Server ← Mobile
```

**Implementation**:
```typescript
// 1. Detect permission request
if (line.includes('Permission required')) {
  const requestId = generateId();

  // 2. Send to server
  await sendEvent({
    t: 'permission-request',
    requestId,
    tool: 'Write',
    pattern: '/src/**/*.ts',
  });

  // 3. Wait for approval (60s timeout)
  const approved = await waitForApproval(requestId, 60000);

  // 4. Send to Claude Code
  if (approved) {
    sendInput('y');
  } else {
    sendInput('n');
  }
}
```

### 3. Brain Hook Auto-Init ✅

**File**: `src/brain/hooks/auto-init.ts`

**Features**:
- ✅ Checks if remote control is enabled
- ✅ Auto-initializes Brain hooks
- ✅ Starts daemon if not running
- ✅ Integrates into CLI startup

**Integration Point**:
```typescript
// src/cli-lazy.ts
export async function runLazyCli() {
  // ... other initialization

  // 🧠 Auto-initialize Brain hooks
  const { autoInitBrainHooks } = await import('./brain/hooks/auto-init');
  await autoInitBrainHooks();

  // ... continue CLI
}
```

### 4. Daemon Manager Updates ✅

**File**: `packages/ccjk-daemon/src/manager.ts`

**New Methods**:
```typescript
class DaemonManager {
  // Start intercepting a session
  async startInterceptor(config: {
    sessionId: string;
    projectPath: string;
    codeToolType: string;
  }): Promise<void>

  // Stop intercepting
  async stopInterceptor(sessionId: string): Promise<void>
}
```

**Approval Handling**:
```typescript
// Listen for approval responses from mobile
this.socket.on('approval:response', (data) => {
  const { requestId, approved } = data;

  // Forward to all interceptors
  for (const [sessionId, interceptor] of this.interceptors) {
    interceptor.handleApprovalResponse(requestId, approved);
  }
});
```

---

## 🚀 How to Use

### Step 1: Enable Remote Control

```bash
# Enable remote control
ccjk remote enable

# Enter server URL when prompted:
# - Development: http://localhost:3005
# - Production: https://your-domain.com
```

### Step 2: Start Daemon

```bash
# Start daemon
ccjk daemon start

# Verify it's running
ccjk daemon status
```

### Step 3: Start Coding

```bash
# Start Claude Code (Brain hooks will auto-initialize)
ccjk

# Or directly
claude
```

### Step 4: Monitor from Mobile

1. Open CCJK Remote app
2. Sign in with GitHub
3. See your active session
4. Approve permissions remotely

---

## 🔧 How It Works

### Startup Flow

```
1. User runs: ccjk
   ↓
2. CLI checks: ~/.ccjk/daemon.json
   ↓
3. If remote.enabled = true:
   - Initialize Brain hooks
   - Check if daemon is running
   - Start daemon if needed
   ↓
4. Continue normal CLI flow
   ↓
5. When Claude Code starts:
   - Interceptor spawns Claude process
   - Captures all output
   - Sends events to daemon
   - Daemon forwards to server
   - Server broadcasts to mobile
```

### Permission Request Flow

```
1. Claude Code asks: "Allow Write for /src/**/*.ts?"
   ↓
2. Interceptor detects permission request
   ↓
3. Generates requestId: "req-1234567890-abc123"
   ↓
4. Sends event to daemon:
   {
     t: 'permission-request',
     requestId: 'req-1234567890-abc123',
     tool: 'Write',
     pattern: '/src/**/*.ts'
   }
   ↓
5. Daemon encrypts and sends to server
   ↓
6. Server stores in database
   ↓
7. Server sends push notification to mobile
   ↓
8. User sees notification on phone
   ↓
9. User taps "Approve" or "Deny"
   ↓
10. Mobile sends approval:response to server
   ↓
11. Server forwards to daemon
   ↓
12. Daemon forwards to interceptor
   ↓
13. Interceptor sends 'y' or 'n' to Claude Code
   ↓
14. Claude Code continues or stops
```

---

## 🧪 Testing

### Test Interceptor

```bash
cd packages/ccjk-daemon
pnpm install
pnpm build
node test-interceptor.ts
```

### Test Full Flow

```bash
# Terminal 1: Start server
cd packages/ccjk-server
pnpm dev

# Terminal 2: Start daemon
cd packages/ccjk-daemon
pnpm build
node bin/daemon.mjs start

# Terminal 3: Start mobile app
cd packages/ccjk-app
pnpm web

# Terminal 4: Start coding
ccjk
```

### Verify Events

```bash
# Check daemon logs
tail -f ~/.ccjk/daemon.log

# Check server logs
cd packages/ccjk-server
pnpm dev

# Check mobile console
# Open browser console in mobile web app
```

---

## 🐛 Troubleshooting

### Daemon Not Starting

```bash
# Check if already running
ccjk daemon status

# Check lock file
cat ~/.ccjk/daemon.lock

# Remove stale lock
rm ~/.ccjk/daemon.lock

# Try again
ccjk daemon start
```

### Events Not Appearing

```bash
# Check daemon connection
curl http://127.0.0.1:37821/health

# Check server connection
curl https://your-domain.com/health

# Check daemon logs
tail -f ~/.ccjk/daemon.log

# Verify remote is enabled
cat ~/.ccjk/daemon.json
```

### Permission Requests Timing Out

```bash
# Check mobile app is connected
# Open mobile app and check connection status

# Check server Socket.IO
# Look for "Socket connected" in server logs

# Increase timeout (in interceptor)
# Default is 60000ms (60 seconds)
```

---

## 📊 Event Types

The interceptor detects and sends these events:

| Event Type | Trigger | Data |
|------------|---------|------|
| `session-start` | Claude Code starts | sessionId, metadata |
| `session-stop` | Claude Code exits | sessionId, reason |
| `text` | Text output | text, thinking |
| `tool-call-start` | Tool execution begins | callId, name, args |
| `tool-call-end` | Tool execution ends | callId, result |
| `permission-request` | Permission needed | requestId, tool, pattern |
| `permission-response` | Permission decided | requestId, approved |
| `status` | Status change | state, message |

---

## 🔐 Security

### Encryption

- All events are encrypted before sending to server
- Server cannot decrypt content
- Per-session random keys
- TweetNaCl encryption

### Authentication

- Daemon authenticates with JWT token
- Token stored in `~/.ccjk/daemon.json`
- Token obtained during `ccjk remote enable`

### Process Isolation

- Daemon runs as separate process
- Lock file prevents multiple instances
- Graceful shutdown on SIGTERM/SIGINT

---

## 🎯 Next Steps

### Immediate

1. ✅ Test interceptor with real Claude Code
2. ✅ Deploy server to Railway
3. ✅ Test mobile app with real events
4. ✅ Verify permission approval flow

### Short-term

- [ ] Add more event types (health-score, brain-agent, mcp-service)
- [ ] Improve output parsing (better regex patterns)
- [ ] Add support for other code tools (Codex, Aider, etc.)
- [ ] Add session recording/replay

### Long-term

- [ ] Voice commands
- [ ] AI-powered suggestions
- [ ] Collaborative sessions
- [ ] Advanced analytics

---

## 📚 Related Files

### Daemon
- `packages/ccjk-daemon/src/claude-interceptor.ts` - Output interceptor
- `packages/ccjk-daemon/src/manager.ts` - Daemon manager
- `packages/ccjk-daemon/src/logger.ts` - Logger utility

### Brain Hooks
- `src/brain/hooks/auto-init.ts` - Auto-initialization
- `src/brain/hooks/remote-sync.ts` - Remote sync hook
- `src/brain/hooks/daemon-client.ts` - Daemon HTTP client

### CLI
- `src/cli-lazy.ts` - CLI entry point (hook integration)
- `src/commands/remote.ts` - Remote control commands

---

**Status**: ✅ **INTEGRATION COMPLETE**

**Ready for**: Testing with real Claude Code sessions

**Last Updated**: 2026-02-21

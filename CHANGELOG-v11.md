# CCJK v11.0.0 - Remote Control Release

**Release Date**: 2026-02-21
**Codename**: "Remote First"

---

## 🎉 Major Features

### 🌐 Remote Control System

Monitor and control your AI coding sessions from anywhere!

**New Packages**:
- `@ccjk/wire` - Protocol layer with end-to-end encryption
- `@ccjk/daemon` - Background daemon for session management
- `@ccjk/server` - Cloud backend (self-hostable)
- `@ccjk/app` - Mobile app (iOS/Android/Web)

**New Commands**:
```bash
ccjk remote enable      # Enable remote control
ccjk remote disable     # Disable remote control
ccjk remote status      # Show status
ccjk remote qr          # Show pairing QR code

ccjk daemon start       # Start background daemon
ccjk daemon stop        # Stop daemon
ccjk daemon status      # Check daemon status
```

**Key Features**:
- ✅ Real-time session monitoring
- ✅ Remote permission approval
- ✅ Push notifications
- ✅ End-to-end encryption (TweetNaCl)
- ✅ Self-hosting support
- ✅ Multi-device sync

### 🧠 Brain Hook System

Extensible hook system for Brain operations:

- Event interception (tool-call, permission-request, status-change)
- Remote sync hook for daemon integration
- Priority-based hook execution
- Hook registry management

**Example**:
```typescript
import { hookRegistry, remoteSyncHook } from '@/brain/hooks';

hookRegistry.register('permission-request', {
  name: 'remote-sync',
  fn: remoteSyncHook,
  priority: 100,
});
```

---

## 📦 Package Structure

```
ccjk-public/
├── packages/
│   ├── ccjk-wire/       # Protocol layer
│   ├── ccjk-daemon/     # Background daemon
│   ├── ccjk-server/     # Cloud backend
│   └── ccjk-app/        # Mobile app
└── src/
    ├── commands/remote.ts       # Remote commands
    └── brain/hooks/             # Hook system
        ├── types.ts
        ├── registry.ts
        ├── remote-sync.ts
        ├── daemon-client.ts
        └── setup.ts
```

---

## 🔧 Technical Details

### Architecture

```
Desktop (Daemon) ←→ Server (Socket.IO) ←→ Mobile (App)
                         ↓
                   PostgreSQL + Redis
```

### Encryption

- **Algorithm**: TweetNaCl (NaCl box + secretbox)
- **Key Management**: Per-session random keys
- **Storage**: Server stores encrypted data only
- **Zero-knowledge**: Server cannot decrypt content

### Protocol

**Event Types**:
- `text` - Text output
- `tool-call-start` / `tool-call-end` - Tool execution
- `permission-request` / `permission-response` - Permission flow
- `status` - Agent status updates
- `health-score` - CCJK health scoring
- `brain-agent` - Brain agent activities
- `mcp-service` - MCP service events

---

## 📚 Documentation

- [RFC 0011: Remote Control](./docs/rfcs/0011-remote-control.md)
- [@ccjk/wire README](./packages/ccjk-wire/README.md)
- [@ccjk/daemon README](./packages/ccjk-daemon/README.md)
- [@ccjk/server README](./packages/ccjk-server/README.md)
- [@ccjk/app README](./packages/ccjk-app/README.md)

---

## 🚀 Getting Started

### Quick Start

```bash
# 1. Update CCJK
pnpm install -g ccjk@latest

# 2. Enable remote control
ccjk remote enable

# 3. Get pairing QR code
ccjk remote qr

# 4. Download mobile app
# iOS: App Store
# Android: Google Play
# Web: https://app.ccjk.dev

# 5. Scan QR code with app

# 6. Start daemon
ccjk daemon start

# 7. Start coding!
ccjk
```

### Self-Hosting

```bash
# Clone repository
git clone https://github.com/miounet11/ccjk.git
cd ccjk/packages/ccjk-server

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Start with Docker
docker-compose up -d

# Configure client
ccjk remote enable
# Enter your server URL when prompted
```

---

## 🔄 Migration Guide

### From v10.x

No breaking changes! Remote control is opt-in.

**To enable**:
```bash
ccjk remote enable
```

**To disable**:
```bash
ccjk remote disable
```

---

## 🐛 Bug Fixes

- Fixed workspace configuration for monorepo packages
- Improved error handling in Brain hooks
- Better TypeScript type safety in daemon

---

## 🎯 Performance

- **Daemon startup**: < 500ms
- **Event latency**: < 200ms (p95)
- **Encryption overhead**: < 10ms per message
- **Memory footprint**: ~50MB (daemon)

---

## 🔐 Security

- End-to-end encryption (TweetNaCl)
- Zero-knowledge server architecture
- GitHub OAuth authentication
- JWT token-based API access
- Process isolation (daemon)
- Localhost-only control server

---

## 🌍 Internationalization

**New Translations**:
- `remote.json` (en, zh-CN)
- Remote control UI strings
- Daemon status messages

---

## 📊 Comparison with Happy Coder

| Feature | Happy | CCJK v11 |
|---------|-------|----------|
| Code Tools | 2 | 6 |
| Brain System | ❌ | ✅ |
| Health Score | ❌ | ✅ |
| MCP Integration | ❌ | ✅ |
| Self-Hosting | ✅ | ✅ |
| Encryption | ✅ | ✅ |
| Mobile App | ✅ | ✅ |

---

## 🙏 Credits

- Inspired by [Happy Coder](https://github.com/slopus/happy) by @slopus
- Built with [Socket.IO](https://socket.io/)
- Encrypted with [TweetNaCl](https://tweetnacl.js.org/)
- Mobile with [Expo](https://expo.dev/)

---

## 🔮 What's Next?

### v11.1 (Planned)
- Voice commands
- Session recording/replay
- Collaborative sessions
- Advanced analytics

### v11.2 (Planned)
- WebRTC for lower latency
- Offline mode with sync
- Custom notification rules
- Slack/Discord integration

---

## 📝 Full Changelog

### Added
- Remote control system (daemon, server, mobile app)
- Brain hook system for extensibility
- End-to-end encryption with TweetNaCl
- Socket.IO real-time communication
- Push notifications (Expo)
- Self-hosting support
- `ccjk remote` commands
- `ccjk daemon` commands
- Monorepo workspace structure
- Protocol layer (@ccjk/wire)

### Changed
- Updated workspace configuration
- Improved CLI command structure
- Enhanced Brain system extensibility

### Fixed
- TypeScript type errors in daemon
- Workspace dependency resolution
- Build configuration for packages

---

**Download**: `pnpm install -g ccjk@11.0.0`

**Feedback**: https://github.com/miounet11/ccjk/issues

**Docs**: https://ccjk.dev/docs/remote-control

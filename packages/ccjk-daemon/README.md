# @ccjk/daemon

Background daemon for CCJK remote control.

## Features

- **Process management**: Single-instance daemon with lock file
- **Socket.IO client**: Real-time connection to ccjk-server
- **Session management**: Handle multiple code tool sessions
- **Local control server**: HTTP API for daemon control
- **Encryption**: End-to-end encrypted communication

## Installation

```bash
pnpm add @ccjk/daemon
```

## Usage

### Start Daemon

```bash
ccjk-daemon start
```

### Stop Daemon

```bash
ccjk-daemon stop
```

### Check Status

```bash
ccjk-daemon status
```

## Programmatic API

```typescript
import { startDaemon } from '@ccjk/daemon';

const config = {
  serverUrl: 'https://ccjk-server.example.com',
  authToken: 'your-auth-token',
  machineId: 'machine-123',
  encryptionKey: new Uint8Array(32), // 32-byte key
  logLevel: 'info',
};

await startDaemon(config);
```

## Architecture

- **Lock file**: `~/.ccjk/daemon.lock` prevents multiple instances
- **Control server**: Listens on `http://127.0.0.1:37821`
- **Socket.IO**: Connects to ccjk-server for real-time events
- **Session handlers**: Manage individual code tool sessions

## License

MIT

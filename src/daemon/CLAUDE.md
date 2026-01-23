# Daemon Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../CLAUDE.md) › daemon

**Last Updated**: 2026年 1月22日 星期四 19时10分33秒 CST

---

## 🔄 Module Overview

The Daemon module provides background service capabilities including cloud client, mobile control, email checking, and WebSocket log streaming.

## 🎯 Core Responsibilities

- **Background Service**: Run CCJK as a daemon
- **Cloud Client**: Connect to cloud services
- **Mobile Control**: Control CCJK from mobile devices
- **Email Checker**: Monitor email for commands
- **Task Execution**: Execute background tasks
- **Result Sending**: Send results to clients
- **Log Streaming**: Real-time log streaming via WebSocket

## 📁 Module Structure

```
src/daemon/
├── types/                  # Type definitions
├── utils/                  # Utilities
├── cli.ts                  # Daemon CLI
├── cloud-client.ts         # Cloud client
├── email-checker.ts        # Email monitoring
├── mobile-control.ts       # Mobile control
├── task-executor.ts        # Task execution
├── result-sender.ts        # Result delivery
├── ws-log-streamer.ts      # WebSocket log streaming
└── index.ts                # Module exports
```

## 🔗 Dependencies

### Internal Dependencies
- `src/cloud-sync` - Cloud synchronization
- `src/brain` - Task execution

### External Dependencies
- WebSocket libraries
- Email clients
- Process management

## 🚀 Key Interfaces

```typescript
interface DaemonService {
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): DaemonStatus
  executeTask(task: Task): Promise<Result>
}

interface CloudClient {
  connect(): Promise<void>
  disconnect(): void
  send(message: Message): Promise<void>
  receive(): AsyncIterator<Message>
}

interface MobileControl {
  listen(port: number): void
  handleCommand(cmd: Command): Promise<Response>
}
```

## 📝 Usage Example

```typescript
import { DaemonService } from '@/daemon'

const daemon = new DaemonService()
await daemon.start()
```

---

**📊 Coverage**: Medium
**🎯 Priority**: Medium
**🔄 Status**: Production Ready

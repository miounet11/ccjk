# @ccjk/wire

Shared message wire types and Zod schemas for CCJK remote control.

## Features

- **Type-safe protocols**: Zod schemas for all message types
- **End-to-end encryption**: TweetNaCl-based encryption
- **Event-driven architecture**: Comprehensive event types for remote control
- **CCJK-specific extensions**: Brain System, Health Score, MCP integration

## Installation

```bash
pnpm add @ccjk/wire
```

## Usage

### Creating Events

```typescript
import { createEnvelope } from '@ccjk/wire';

const envelope = createEnvelope('user', 'session-123', {
  t: 'text',
  text: 'Hello from mobile!',
});
```

### Encryption

```typescript
import { generateKeyPair, encryptJson, decryptJson } from '@ccjk/wire';

// Generate key pair
const keyPair = generateKeyPair();

// Encrypt data
const data = { message: 'secret' };
const encrypted = encryptJson(data, keyPair.secretKey);

// Decrypt data
const decrypted = decryptJson(encrypted, keyPair.secretKey);
```

### Event Types

- `text`: Text output from agent
- `tool-call-start`: Tool execution started
- `tool-call-end`: Tool execution completed
- `permission-request`: Permission approval needed
- `permission-response`: Permission decision
- `status`: Agent status update
- `turn-start`: Conversation turn started
- `turn-end`: Conversation turn ended
- `session-start`: Session initialized
- `session-stop`: Session terminated
- `health-score`: Health score update (CCJK)
- `brain-agent`: Brain agent activity (CCJK)
- `mcp-service`: MCP service event (CCJK)

## License

MIT

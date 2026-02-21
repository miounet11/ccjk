# @ccjk/server

Cloud backend for CCJK remote control.

## Features

- **Real-time communication**: Socket.IO for bidirectional events
- **End-to-end encryption**: All data encrypted client-side
- **PostgreSQL**: Persistent storage for sessions and messages
- **Redis**: Optional for horizontal scaling
- **GitHub OAuth**: User authentication
- **Push notifications**: Expo Push Notifications

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:migrate

# Start dev server
pnpm dev
```

### Production

```bash
# Build
pnpm build

# Start
pnpm start
```

### Docker

```bash
docker build -t ccjk-server .
docker run -p 3005:3005 ccjk-server
```

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ccjk
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
EXPO_ACCESS_TOKEN=your-expo-token
```

## API Endpoints

### REST API

- `POST /v1/auth/github` - GitHub OAuth
- `GET /v1/sessions` - List sessions
- `POST /v1/sessions` - Create session
- `GET /v1/sessions/:id` - Get session
- `DELETE /v1/sessions/:id` - Delete session

### Socket.IO Events

- `session:event` - Session event from daemon
- `remote:command` - Remote command from mobile
- `session:join` - Join session room
- `session:leave` - Leave session room

## Architecture

```
Client (Daemon) <--Socket.IO--> Server <--Socket.IO--> Client (Mobile)
                                  |
                                  v
                            PostgreSQL + Redis
```

## License

MIT

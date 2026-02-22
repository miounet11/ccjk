# CCJK Telegram Bot

Control your Claude Code sessions from Telegram - similar to OpenClaw.

## Features

- 📋 List active Claude Code sessions
- 🎯 Select and monitor sessions in real-time
- ⚠️ Approve/deny permissions from Telegram
- 💬 Send commands to Claude Code
- 🔧 View tool calls and output
- ⏹ Send interrupt signals (Ctrl+C)
- 📊 Check session status

## Quick Start

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow instructions
3. Copy your bot token

### 2. Install

```bash
cd packages/ccjk-telegram-bot
pnpm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
CCJK_SERVER_URL=https://your-server.com
CCJK_AUTH_TOKEN=your_auth_token_here
```

Get your auth token:

```bash
ccjk remote setup
```

### 4. Start Bot

```bash
pnpm dev
```

Or build and run:

```bash
pnpm build
pnpm start
```

## Usage

### Commands

- `/start` - Welcome message
- `/help` - Show help
- `/sessions` - List active sessions
- `/status` - Show current session status
- `/send <text>` - Send command to Claude Code
- `/interrupt` - Send Ctrl+C

### Examples

**1. Select a session:**

```
/sessions
```

Click on a session to start monitoring.

**2. Send a command:**

```
/send Write a hello world function in Python
```

Or just type without `/send`:

```
Write a hello world function in Python
```

**3. Approve permissions:**

When Claude Code requests permission, you'll receive a message:

```
⚠️ Permission Required

Tool: Write
Pattern: /src/**/*.py

Auto-deny in 60 seconds

[❌ Deny] [✅ Approve]
```

Click the button to approve or deny.

**4. View real-time output:**

You'll receive messages as Claude Code works:

```
🤔 Thinking...
I'll create a simple hello world function

🔧 Tool Call: Write
{
  "file_path": "/src/hello.py",
  "content": "def hello():\n    print('Hello, World!')"
}

✅ Tool Completed
File written successfully

📝 I've created a hello world function in /src/hello.py
```

## Architecture

```
Telegram User
     ↓
Telegram Bot API
     ↓
CCJK Telegram Bot
     ↓ Socket.IO
CCJK Server
     ↓ Socket.IO
CCJK Daemon
     ↓ stdin/stdout
Claude Code
```

## Event Types

The bot handles these event types:

| Event | Icon | Description |
|-------|------|-------------|
| `text` | 💬 | Text output from Claude |
| `tool-call-start` | 🔧 | Tool execution begins |
| `tool-call-end` | ✅ | Tool execution completes |
| `permission-request` | ⚠️ | Permission needed |
| `status` | ℹ️ | Status change |
| `session-start` | 🚀 | Session started |
| `session-stop` | 🛑 | Session stopped |

## Deployment

### Option 1: PM2

```bash
pnpm build
pm2 start dist/index.mjs --name ccjk-telegram-bot
pm2 save
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

CMD ["node", "dist/index.mjs"]
```

```bash
docker build -t ccjk-telegram-bot .
docker run -d --env-file .env ccjk-telegram-bot
```

### Option 3: Systemd

```ini
[Unit]
Description=CCJK Telegram Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ccjk-telegram-bot
EnvironmentFile=/path/to/.env
ExecStart=/usr/local/bin/node dist/index.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ccjk-telegram-bot
sudo systemctl start ccjk-telegram-bot
```

## Security

- ✅ End-to-end encryption (messages encrypted between daemon and server)
- ✅ JWT authentication
- ✅ Telegram Bot API uses HTTPS
- ✅ No message storage (all messages are ephemeral)
- ✅ Session keys never leave your devices

## Troubleshooting

### Bot not responding

```bash
# Check if bot is running
ps aux | grep ccjk-telegram-bot

# Check logs
pm2 logs ccjk-telegram-bot
```

### Not receiving events

```bash
# Check server connection
curl https://your-server.com/health

# Verify auth token
ccjk remote status
```

### Permission requests timing out

- Default timeout is 60 seconds
- Make sure bot is running and connected
- Check Telegram notifications are enabled

## Comparison with OpenClaw

| Feature | OpenClaw | CCJK Telegram Bot |
|---------|----------|-------------------|
| Platform | Telegram | Telegram |
| Real-time updates | ✅ | ✅ |
| Permission approval | ✅ | ✅ |
| Send commands | ✅ | ✅ |
| Code tool support | Claude Code | Claude Code + 5 others |
| Encryption | ❌ | ✅ End-to-end |
| Self-hosted | ❌ | ✅ |
| Open source | ❌ | ✅ |

## License

MIT

# CCJK Telegram Bot - Complete Guide

**Version**: 1.0.0
**Date**: 2026-02-21

---

## 概述

类似 OpenClaw，CCJK Telegram Bot 让你可以在 Telegram 里直接控制 Claude Code，无需打开移动端 App。

**核心功能：**
- 📋 查看所有活跃会话
- 🎯 选择并监控会话
- ⚠️ 在 Telegram 里审批权限
- 💬 发送命令到 Claude Code
- 🔧 实时查看工具调用
- 📊 查看会话状态
- ⏹ 发送中断信号

---

## 快速开始

### 1. 创建 Telegram Bot

**步骤：**

1. 打开 Telegram，搜索 `@BotFather`
2. 发送 `/newbot`
3. 输入 bot 名称（例如：`CCJK Remote Control`）
4. 输入 bot 用户名（例如：`ccjk_remote_bot`）
5. 复制 bot token

**示例：**
```
Done! Congratulations on your new bot.
You will find it at t.me/ccjk_remote_bot

Use this token to access the HTTP API:
123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

Keep your token secure and store it safely,
it can be used by anyone to control your bot.
```

---

### 2. 安装和配置

**安装依赖：**

```bash
cd packages/ccjk-telegram-bot
pnpm install
```

**配置环境变量：**

```bash
cp .env.example .env
nano .env
```

```env
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# CCJK Server URL
CCJK_SERVER_URL=https://your-server.com

# CCJK Auth Token (from: ccjk remote login)
CCJK_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**获取 Auth Token：**

```bash
ccjk remote login
# 浏览器打开 GitHub OAuth
# 登录后，token 会保存到 ~/.ccjk/daemon.json

cat ~/.ccjk/daemon.json | grep authToken
```

---

### 3. 启动 Bot

**开发模式：**

```bash
pnpm dev
```

**生产模式：**

```bash
pnpm build
pnpm start
```

**输出：**
```
🤖 Starting CCJK Telegram Bot...
   Connecting to https://your-server.com...
✅ Connected to server
   Fetching sessions...
✅ Bot started successfully
```

---

### 4. 使用 Bot

**在 Telegram 里：**

1. 搜索你的 bot（例如：`@ccjk_remote_bot`）
2. 点击 "Start" 或发送 `/start`
3. 发送 `/sessions` 查看活跃会话
4. 点击会话开始监控
5. 发送命令或审批权限

---

## 命令列表

### 基础命令

#### `/start`
显示欢迎消息和命令列表。

**示例：**
```
/start
```

**响应：**
```
🤖 CCJK Remote Control Bot

Control your Claude Code sessions from Telegram!

Commands:
/sessions - List active sessions
/select - Select a session to monitor
/status - Show current session status
/send - Send command to Claude Code
/interrupt - Send Ctrl+C
/help - Show this message
```

---

#### `/help`
显示详细帮助信息。

**示例：**
```
/help
```

---

#### `/sessions`
列出所有活跃的 Claude Code 会话。

**示例：**
```
/sessions
```

**响应：**
```
📋 Active Sessions:

Select a session to monitor:

[🟢 main-branch (MacBook-Pro)]
[⚪ feature-auth (iMac)]
```

点击按钮选择会话。

---

#### `/status`
显示当前监控会话的状态。

**示例：**
```
/status
```

**响应：**
```
📊 Session Status

Tag: main-branch
Status: 🟢 Active
Machine: MacBook-Pro
Platform: darwin
Project: `/Users/john/my-project`
```

---

#### `/send <command>`
发送命令到 Claude Code。

**示例：**
```
/send Write a hello world function in Python
```

**响应：**
```
✅ Command sent to Claude Code:

`Write a hello world function in Python`
```

然后你会收到 Claude Code 的实时输出。

---

#### `/interrupt`
发送 Ctrl+C 中断信号。

**示例：**
```
/interrupt
```

**响应：**
```
⏹ Interrupt signal (Ctrl+C) sent to Claude Code
```

---

### 快捷输入

你也可以直接发送文本（不用 `/send`）：

**示例：**
```
Write a fibonacci function
```

**响应：**
```
✅ Sent to Claude Code
```

---

## 实时事件

### 文本输出

Claude Code 的文本输出会直接发送到 Telegram：

```
💬 I'll create a fibonacci function for you.
```

### 思考模式

```
🤔 Thinking...

Let me think about the best approach for this...
```

### 工具调用

**开始：**
```
🔧 Tool Call: Write

```json
{
  "file_path": "/src/fibonacci.py",
  "content": "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)"
}
```
```

**完成：**
```
✅ Tool Completed

File written successfully
```

### 权限请求

```
⚠️ Permission Required

Tool: Write
Pattern: `/src/**/*.py`

Auto-deny in 60 seconds

[❌ Deny] [✅ Approve]
```

点击按钮审批。

### 状态变化

```
❌ Status: error

Failed to write file: Permission denied
```

```
✅ Status: success

Task completed successfully
```

### 会话事件

**启动：**
```
🚀 Session Started
```

**停止：**
```
🛑 Session Stopped

Process exited with code 0
```

---

## 使用场景

### 场景 1：远程审批权限

```
1. 你在电脑上运行 ccjk
   ↓
2. Claude Code 请求权限
   ↓
3. Telegram 收到通知：
   "⚠️ Permission Required
    Tool: Write
    Pattern: /src/**/*.ts"
   ↓
4. 你点击 "✅ Approve"
   ↓
5. Claude Code 继续执行
   ↓
6. Telegram 显示实时输出
```

### 场景 2：远程发送命令

```
1. 你在外面，想让 Claude Code 做点事
   ↓
2. 打开 Telegram，找到你的 bot
   ↓
3. 发送："Add error handling to the login function"
   ↓
4. Claude Code 开始工作
   ↓
5. Telegram 实时显示：
   - 🤔 Thinking...
   - 🔧 Tool Call: Read
   - 🔧 Tool Call: Edit
   - ✅ Tool Completed
   - 💬 "I've added error handling..."
```

### 场景 3：监控长时间任务

```
1. 你启动一个大型重构任务
   ↓
2. 离开电脑去开会
   ↓
3. Telegram 持续推送进度：
   - 🔧 Refactoring file 1/50
   - 🔧 Refactoring file 2/50
   - ...
   - ⚠️ Permission needed for file 25
   ↓
4. 你在会议中用手机审批
   ↓
5. 任务继续执行
   ↓
6. 完成后收到通知：
   "✅ All files refactored successfully"
```

---

## 部署

### Option 1: PM2（推荐）

**安装 PM2：**

```bash
npm install -g pm2
```

**启动：**

```bash
cd packages/ccjk-telegram-bot
pnpm build
pm2 start dist/index.mjs --name ccjk-telegram-bot
pm2 save
```

**管理：**

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs ccjk-telegram-bot

# 重启
pm2 restart ccjk-telegram-bot

# 停止
pm2 stop ccjk-telegram-bot
```

**开机自启：**

```bash
pm2 startup
pm2 save
```

---

### Option 2: Docker

**Dockerfile：**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .
RUN pnpm build

# Start bot
CMD ["node", "dist/index.mjs"]
```

**构建和运行：**

```bash
# 构建镜像
docker build -t ccjk-telegram-bot .

# 运行容器
docker run -d \
  --name ccjk-telegram-bot \
  --env-file .env \
  --restart unless-stopped \
  ccjk-telegram-bot

# 查看日志
docker logs -f ccjk-telegram-bot
```

**Docker Compose：**

```yaml
version: '3.8'

services:
  telegram-bot:
    build: .
    container_name: ccjk-telegram-bot
    env_file: .env
    restart: unless-stopped
    networks:
      - ccjk-network

networks:
  ccjk-network:
    external: true
```

```bash
docker-compose up -d
```

---

### Option 3: Systemd

**创建服务文件：**

```bash
sudo nano /etc/systemd/system/ccjk-telegram-bot.service
```

```ini
[Unit]
Description=CCJK Telegram Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/ccjk-public/packages/ccjk-telegram-bot
EnvironmentFile=/path/to/ccjk-telegram-bot/.env
ExecStart=/usr/local/bin/node dist/index.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启动服务：**

```bash
sudo systemctl daemon-reload
sudo systemctl enable ccjk-telegram-bot
sudo systemctl start ccjk-telegram-bot
```

**管理服务：**

```bash
# 查看状态
sudo systemctl status ccjk-telegram-bot

# 查看日志
sudo journalctl -u ccjk-telegram-bot -f

# 重启
sudo systemctl restart ccjk-telegram-bot
```

---

## 安全性

### 1. Token 安全

**✅ 好的做法：**
- 使用环境变量存储 token
- 不要提交 `.env` 到 git
- 定期轮换 token
- 使用 `.env.example` 作为模板

**❌ 坏的做法：**
- 硬编码 token
- 提交 token 到代码库
- 在公开场合分享 token

---

### 2. 访问控制

**限制用户：**

```typescript
// 在 bot.ts 中添加白名单
const ALLOWED_USERS = [
  123456789,  // Your Telegram user ID
  987654321,  // Team member's ID
];

bot.use((ctx, next) => {
  if (!ALLOWED_USERS.includes(ctx.from?.id)) {
    ctx.reply('❌ Unauthorized');
    return;
  }
  return next();
});
```

**获取你的 Telegram ID：**

1. 搜索 `@userinfobot`
2. 发送 `/start`
3. 复制你的 ID

---

### 3. 加密通信

- ✅ Telegram Bot API 使用 HTTPS
- ✅ CCJK Server 使用 Socket.IO over WSS
- ✅ 消息端到端加密（TweetNaCl）
- ✅ Session keys 不离开你的设备

---

## 故障排查

### Bot 不响应

**检查 bot 是否运行：**

```bash
ps aux | grep ccjk-telegram-bot
```

**检查日志：**

```bash
pm2 logs ccjk-telegram-bot
# 或
sudo journalctl -u ccjk-telegram-bot -f
```

**常见问题：**
- Token 错误：检查 `TELEGRAM_BOT_TOKEN`
- 网络问题：检查服务器连接
- 权限问题：检查文件权限

---

### 收不到事件

**检查服务器连接：**

```bash
curl https://your-server.com/health
```

**检查 auth token：**

```bash
ccjk remote status
```

**检查会话订阅：**

```bash
# 在 bot 日志中查找
grep "Subscribed to session" /path/to/logs
```

---

### 权限请求超时

**原因：**
- Bot 未运行
- 服务器连接断开
- Telegram 通知被禁用

**解决：**

```bash
# 重启 bot
pm2 restart ccjk-telegram-bot

# 检查 Telegram 通知设置
# Settings → Notifications → Enable
```

---

## 对比 OpenClaw

| 功能 | OpenClaw | CCJK Telegram Bot |
|------|----------|-------------------|
| **平台** | Telegram | Telegram |
| **实时更新** | ✅ | ✅ |
| **权限审批** | ✅ | ✅ |
| **发送命令** | ✅ | ✅ |
| **工具调用显示** | ✅ | ✅ + 详细参数 |
| **代码工具支持** | Claude Code | Claude Code + 5 others |
| **加密** | ❌ | ✅ 端到端 |
| **自托管** | ❌ | ✅ |
| **开源** | ❌ | ✅ |
| **多会话** | ❌ | ✅ |
| **会话切换** | ❌ | ✅ |
| **状态查询** | ❌ | ✅ |

**优势：**
- ✅ 完全开源和自托管
- ✅ 端到端加密
- ✅ 支持多个代码工具
- ✅ 更详细的事件信息
- ✅ 可自定义和扩展

---

## 高级功能

### 1. 多用户支持

```typescript
// 为每个用户维护独立的会话
const userSessions = new Map<number, string>();

// 用户 A 监控会话 1
userSessions.set(123456, 'session-1');

// 用户 B 监控会话 2
userSessions.set(789012, 'session-2');
```

### 2. 自定义通知

```typescript
// 只通知重要事件
if (event.t === 'permission-request' || event.t === 'error') {
  await bot.telegram.sendMessage(chatId, message);
}
```

### 3. 命令别名

```typescript
bot.command(['s', 'status'], handleStatus);
bot.command(['i', 'interrupt'], handleInterrupt);
```

### 4. 富文本格式

```typescript
await ctx.reply(
  '*Bold* _Italic_ `Code` [Link](https://example.com)',
  { parse_mode: 'Markdown' }
);
```

---

## 最佳实践

### 1. 命名规范

- Bot 名称：`CCJK Remote Control`
- Bot 用户名：`ccjk_remote_bot`
- 清晰描述功能

### 2. 响应速度

- 立即确认命令（"✅ Command sent"）
- 异步处理长时间操作
- 使用 typing indicator

### 3. 错误处理

```typescript
try {
  await sendCommand(sessionId, text);
  ctx.reply('✅ Command sent');
} catch (error) {
  ctx.reply('❌ Failed to send command');
  console.error(error);
}
```

### 4. 日志记录

```typescript
console.log(`[${new Date().toISOString()}] User ${ctx.from.id} sent: ${text}`);
```

---

## 未来增强

- [ ] 语音命令支持
- [ ] 图片/文件上传
- [ ] 会话录制/回放
- [ ] 统计和分析
- [ ] 多语言支持
- [ ] 自定义快捷命令
- [ ] 团队协作功能

---

## 支持

- **文档**: https://github.com/your-org/ccjk-public/docs
- **Issues**: https://github.com/your-org/ccjk-public/issues
- **Discord**: https://discord.gg/your-server

---

**状态**: ✅ Production Ready

Telegram Bot 已完全实现，可以立即部署使用。

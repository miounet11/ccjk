# CCJK Server Deployment Guide

## 🚀 Quick Start

### Development

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your settings

# 3. Start PostgreSQL (Docker)
docker run -d \
  --name ccjk-postgres \
  -e POSTGRES_USER=ccjk \
  -e POSTGRES_PASSWORD=ccjk_password \
  -e POSTGRES_DB=ccjk \
  -p 5432:5432 \
  postgres:16-alpine

# 4. Run migrations
pnpm db:generate
pnpm db:migrate

# 5. Start dev server
pnpm dev
```

Server will be running at `http://localhost:3005`

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# 1. Create .env file
cp .env.example .env
# Edit .env with production values

# 2. Start all services
docker-compose up -d

# 3. Run migrations
docker-compose exec server pnpm db:migrate

# 4. Check logs
docker-compose logs -f server
```

### Using Docker only

```bash
# 1. Build image
docker build -t ccjk-server .

# 2. Run container
docker run -d \
  --name ccjk-server \
  -p 3005:3005 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  -e GITHUB_CLIENT_ID="..." \
  -e GITHUB_CLIENT_SECRET="..." \
  ccjk-server
```

---

## ☁️ Cloud Deployment

### Railway

1. **Create new project** on [Railway](https://railway.app)

2. **Add PostgreSQL** service

3. **Deploy from GitHub**:
   - Connect your repository
   - Set root directory: `packages/ccjk-server`
   - Railway will auto-detect and deploy

4. **Set environment variables**:
   ```
   DATABASE_URL (auto-set by Railway)
   JWT_SECRET
   GITHUB_CLIENT_ID
   GITHUB_CLIENT_SECRET
   GITHUB_CALLBACK_URL
   EXPO_ACCESS_TOKEN
   ```

5. **Run migrations**:
   ```bash
   railway run pnpm db:migrate
   ```

### Render

1. **Create new Web Service** on [Render](https://render.com)

2. **Configure**:
   - Build Command: `cd packages/ccjk-server && pnpm install && pnpm db:generate`
   - Start Command: `cd packages/ccjk-server && pnpm start`

3. **Add PostgreSQL** database

4. **Set environment variables** (same as Railway)

5. **Run migrations** via Render Shell

### Fly.io

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**:
   ```bash
   fly auth login
   ```

3. **Launch app**:
   ```bash
   cd packages/ccjk-server
   fly launch
   ```

4. **Add PostgreSQL**:
   ```bash
   fly postgres create
   fly postgres attach <postgres-app-name>
   ```

5. **Set secrets**:
   ```bash
   fly secrets set JWT_SECRET="..."
   fly secrets set GITHUB_CLIENT_ID="..."
   fly secrets set GITHUB_CLIENT_SECRET="..."
   ```

6. **Deploy**:
   ```bash
   fly deploy
   ```

### Vercel (Serverless)

⚠️ **Note**: Socket.IO requires persistent connections, so Vercel is not recommended for production. Use for REST API only.

---

## 🔐 GitHub OAuth Setup

1. **Create GitHub OAuth App**:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - Application name: `CCJK Remote`
     - Homepage URL: `https://your-domain.com`
     - Authorization callback URL: `https://your-domain.com/auth/github/callback`

2. **Get credentials**:
   - Copy Client ID
   - Generate Client Secret

3. **Update environment**:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_CALLBACK_URL=https://your-domain.com/auth/github/callback
   ```

---

## 📱 Expo Push Notifications Setup

1. **Create Expo account**: https://expo.dev/signup

2. **Get access token**:
   ```bash
   npx expo login
   npx expo whoami
   # Go to https://expo.dev/accounts/[username]/settings/access-tokens
   # Create new token
   ```

3. **Update environment**:
   ```env
   EXPO_ACCESS_TOKEN=your_expo_token
   ```

---

## 🗄️ Database Migrations

### Create migration

```bash
pnpm db:migrate
```

### Reset database (⚠️ Destructive)

```bash
prisma migrate reset
```

### Generate Prisma client

```bash
pnpm db:generate
```

### View database

```bash
px prisma studio
```

---

## 📊 Monitoring

### Health Check

```bash
curl https://your-domain.com/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

### Logs

**Docker Compose**:
```bash
docker-compose logs -f server
```

**Railway**: View in dashboard

**Render**: View in dashboard

**Fly.io**:
```bash
fly logs
```

---

## 🔧 Troubleshooting

### Database connection failed

```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
pg_isready -h localhost -p 5432

# Check Prisma client
pnpm db:generate
```

### Socket.IO not connecting

```bash
# Check CORS settings
# Ensure CORS_ORIGIN includes your client domain

# Test WebSocket
wscat -c ws://your-domain.com/socket.io/?EIO=4&transport=websocket
```

### Push notifications not working

```bash
# Verify Expo token
curl -H "Authorization: Bearer $EXPO_ACCESS_TOKEN" \
  https://exp.host/--/api/v2/push/getReceipts

# Check device token format
# Must be: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

---

## 🔒 Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Change default SESSION_SECRET
- [ ] Use strong database password
- [ ] Enable HTTPS (use reverse proxy like Nginx/Caddy)
- [ ] Configure CORS properly (not `*` in production)
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Monitor error logs
- [ ] Keep dependencies updated

---

## 📈 Scaling

### Horizontal Scaling with Redis

1. **Add Redis adapter**:
   ```typescript
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';

   const pubClient = createClient({ url: CONFIG.redisUrl });
   const subClient = pubClient.duplicate();

   await Promise.all([pubClient.connect(), subClient.connect()]);

   io.adapter(createAdapter(pubClient, subClient));
   ```

2. **Deploy multiple instances**:
   ```bash
   # Railway: Increase replicas
   # Render: Enable autoscaling
   # Fly.io: fly scale count 3
   ```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_sessions_user_active ON "Session"("userId", "active");
CREATE INDEX idx_messages_session_seq ON "Message"("sessionId", "seq");
CREATE INDEX idx_machines_user_active ON "Machine"("userId", "active");
```

---

## 🆘 Support

- **Issues**: https://github.com/miounet11/ccjk/issues
- **Docs**: https://ccjk.dev/docs
- **Discord**: https://discord.gg/ccjk

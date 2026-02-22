# CCJK Remote Control - Production Deployment Guide

**Version**: v11.0.0
**Last Updated**: 2026-02-21

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Server Deployment](#server-deployment)
5. [Daemon Setup](#daemon-setup)
6. [Mobile App Deployment](#mobile-app-deployment)
7. [Database Setup](#database-setup)
8. [Security](#security)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying CCJK Remote Control to production:

- **Server**: Node.js backend (Railway, Heroku, VPS)
- **Database**: PostgreSQL (Railway, Supabase, AWS RDS)
- **Mobile App**: Expo (App Store, Google Play, Web)
- **Daemon**: Local process on dev machines

**Deployment Options:**

| Component | Option 1 | Option 2 | Option 3 |
|-----------|----------|----------|----------|
| Server | Railway | Heroku | VPS (DigitalOcean) |
| Database | Railway PostgreSQL | Supabase | AWS RDS |
| Mobile | Expo EAS | Self-hosted | Web only |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Production                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  Mobile App  │◄────────┤   CDN/EAS    │            │
│  │  (iOS/Android)│         │              │            │
│  └──────┬───────┘         └──────────────┘            │
│         │ HTTPS + WSS                                  │
│         ↓                                              │
│  ┌──────────────────────────────────────┐             │
│  │         Load Balancer                │             │
│  │         (Railway/Nginx)              │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                      │
│         ┌───────┴────────┐                            │
│         ↓                ↓                            │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │  Server 1   │  │  Server 2   │                    │
│  │  (Node.js)  │  │  (Node.js)  │                    │
│  └──────┬──────┘  └──────┬──────┘                    │
│         │                │                            │
│         └────────┬───────┘                            │
│                  ↓                                     │
│         ┌────────────────┐                            │
│         │   PostgreSQL   │                            │
│         │   (Primary)    │                            │
│         └────────┬───────┘                            │
│                  │                                     │
│         ┌────────┴───────┐                            │
│         ↓                ↓                            │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │  Redis      │  │  S3/Storage │                    │
│  │  (Cache)    │  │  (Logs)     │                    │
│  └─────────────┘  └─────────────┘                    │
│                                                        │
└────────────────────────────────────────────────────────┘
                         │
                         │ Socket.IO
                         ↓
┌────────────────────────────────────────────────────────┐
│                  Developer Machines                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐         ┌──────────────┐           │
│  │   Daemon     │◄────────┤ Claude Code  │           │
│  │   (Local)    │         │              │           │
│  └──────────────┘         └──────────────┘           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Accounts

- **GitHub**: OAuth authentication
- **Railway** (or Heroku/VPS): Server hosting
- **Expo**: Mobile app distribution (optional)

### Required Tools

```bash
# Node.js 18+
node --version

# pnpm
npm install -g pnpm

# Docker (optional, for local testing)
docker --version

# Railway CLI (if using Railway)
npm install -g @railway/cli

# Expo CLI (if deploying mobile)
npm install -g eas-cli
```

---

## Server Deployment

### Option 1: Railway (Recommended)

**Step 1: Install Railway CLI**

```bash
npm install -g @railway/cli
railway login
```

**Step 2: Create Project**

```bash
cd packages/ccjk-server
railway init
```

**Step 3: Add PostgreSQL**

```bash
railway add postgresql
```

Railway automatically sets `DATABASE_URL` environment variable.

**Step 4: Set Environment Variables**

```bash
railway variables set \
  NODE_ENV=production \
  PORT=3005 \
  JWT_SECRET=$(openssl rand -hex 32) \
  GITHUB_CLIENT_ID=your_github_client_id \
  GITHUB_CLIENT_SECRET=your_github_client_secret \
  GITHUB_CALLBACK_URL=https://your-app.railway.app/auth/github/callback \
  FRONTEND_URL=https://your-app.com
```

**Step 5: Deploy**

```bash
railway up
```

**Step 6: Run Migrations**

```bash
railway run npx prisma migrate deploy
```

**Step 7: Get URL**

```bash
railway domain
# Output: your-app.railway.app
```

---

### Option 2: Heroku

**Step 1: Install Heroku CLI**

```bash
npm install -g heroku
heroku login
```

**Step 2: Create App**

```bash
cd packages/ccjk-server
heroku create ccjk-server
```

**Step 3: Add PostgreSQL**

```bash
heroku addons:create heroku-postgresql:mini
```

**Step 4: Set Environment Variables**

```bash
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET=$(openssl rand -hex 32) \
  GITHUB_CLIENT_ID=your_github_client_id \
  GITHUB_CLIENT_SECRET=your_github_client_secret \
  GITHUB_CALLBACK_URL=https://ccjk-server.herokuapp.com/auth/github/callback \
  FRONTEND_URL=https://your-app.com
```

**Step 5: Deploy**

```bash
git push heroku main
```

**Step 6: Run Migrations**

```bash
heroku run npx prisma migrate deploy
```

---

### Option 3: VPS (DigitalOcean, AWS EC2, etc.)

**Step 1: Provision Server**

- Ubuntu 22.04 LTS
- 2GB RAM minimum
- 20GB SSD

**Step 2: Install Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2
npm install -g pm2
```

**Step 3: Setup PostgreSQL**

```bash
sudo -u postgres psql

CREATE DATABASE ccjk;
CREATE USER ccjk WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ccjk TO ccjk;
\q
```

**Step 4: Clone and Build**

```bash
cd /var/www
git clone https://github.com/your-org/ccjk-public.git
cd ccjk-public
pnpm install
pnpm build
```

**Step 5: Configure Environment**

```bash
cd packages/ccjk-server
cp .env.example .env
nano .env
```

```env
NODE_ENV=production
PORT=3005
DATABASE_URL=postgresql://ccjk:your_secure_password@localhost:5432/ccjk
JWT_SECRET=your_jwt_secret_here
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://your-domain.com/auth/github/callback
FRONTEND_URL=https://your-domain.com
```

**Step 6: Run Migrations**

```bash
npx prisma migrate deploy
```

**Step 7: Setup PM2**

```bash
pm2 start dist/index.js --name ccjk-server
pm2 save
pm2 startup
```

**Step 8: Configure Nginx**

```bash
sudo nano /etc/nginx/sites-available/ccjk
```

```nginx
upstream ccjk_backend {
    server 127.0.0.1:3005;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://ccjk_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://ccjk_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ccjk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Step 9: Setup SSL (Let's Encrypt)**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Daemon Setup

### Installation on Dev Machines

**Step 1: Install CCJK CLI**

```bash
npm install -g ccjk
```

**Step 2: Run Remote Setup**

```bash
ccjk remote setup
```

Enter server URL and complete setup when prompted:
- Production: `https://your-domain.com`
- Development: `http://localhost:3005`

Includes auth token configuration and device binding.

**Step 4: Start Daemon**

```bash
ccjk daemon start
```

**Step 5: Verify**

```bash
ccjk daemon status
```

Output:
```
✅ Daemon is running
   PID: 12345
   Uptime: 2 hours
   Server: https://your-domain.com
   Status: Connected
```

---

### Auto-Start on Boot

**macOS (launchd):**

```bash
cat > ~/Library/LaunchAgents/com.ccjk.daemon.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ccjk.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ccjk-daemon</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/$(whoami)/.ccjk/daemon.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/$(whoami)/.ccjk/daemon.error.log</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.ccjk.daemon.plist
```

**Linux (systemd):**

```bash
sudo nano /etc/systemd/system/ccjk-daemon.service
```

```ini
[Unit]
Description=CCJK Daemon
After=network.target

[Service]
Type=simple
User=your_username
ExecStart=/usr/local/bin/ccjk-daemon start
Restart=always
RestartSec=10
StandardOutput=append:/home/your_username/.ccjk/daemon.log
StandardError=append:/home/your_username/.ccjk/daemon.error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ccjk-daemon
sudo systemctl start ccjk-daemon
sudo systemctl status ccjk-daemon
```

---

## Mobile App Deployment

### Option 1: Expo EAS (Recommended)

**Step 1: Install EAS CLI**

```bash
npm install -g eas-cli
eas login
```

**Step 2: Configure Project**

```bash
cd packages/ccjk-app
eas build:configure
```

**Step 3: Update Environment**

```bash
nano .env.production
```

```env
EXPO_PUBLIC_API_URL=https://your-domain.com
EXPO_PUBLIC_WS_URL=wss://your-domain.com
```

**Step 4: Build for iOS**

```bash
eas build --platform ios --profile production
```

**Step 5: Build for Android**

```bash
eas build --platform android --profile production
```

**Step 6: Submit to App Store**

```bash
eas submit --platform ios
```

**Step 7: Submit to Google Play**

```bash
eas submit --platform android
```

---

### Option 2: Web Deployment

**Step 1: Build Web App**

```bash
cd packages/ccjk-app
npx expo export:web
```

**Step 2: Deploy to Vercel**

```bash
npm install -g vercel
vercel --prod
```

**Step 3: Deploy to Netlify**

```bash
npm install -g netlify-cli
netlify deploy --prod --dir web-build
```

---

## Database Setup

### PostgreSQL Configuration

**Recommended Settings:**

```sql
-- Connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '2621kB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

SELECT pg_reload_conf();
```

---

### Backup Strategy

**Daily Backups:**

```bash
#!/bin/bash
# /usr/local/bin/backup-ccjk-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ccjk"
DATABASE_URL="postgresql://ccjk:password@localhost:5432/ccjk"

mkdir -p $BACKUP_DIR

pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/ccjk_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "ccjk_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/ccjk_$DATE.sql.gz s3://your-bucket/backups/
```

**Cron Job:**

```bash
crontab -e
```

```
0 2 * * * /usr/local/bin/backup-ccjk-db.sh
```

---

### Database Migrations

**Production Migration Checklist:**

1. **Backup database** before migration
2. **Test migration** on staging environment
3. **Schedule downtime** if needed
4. **Run migration** with monitoring
5. **Verify data integrity** after migration
6. **Rollback plan** ready

**Run Migration:**

```bash
cd packages/ccjk-server
npx prisma migrate deploy
```

**Rollback (if needed):**

```bash
# Restore from backup
gunzip -c /var/backups/ccjk/ccjk_20260221_020000.sql.gz | psql $DATABASE_URL
```

---

## Security

### Environment Variables

**Never commit:**
- `JWT_SECRET`
- `GITHUB_CLIENT_SECRET`
- `DATABASE_URL`
- API keys

**Use secrets management:**
- Railway: Built-in secrets
- Heroku: Config vars
- VPS: `.env` file with restricted permissions

```bash
chmod 600 .env
```

---

### SSL/TLS

**Always use HTTPS in production:**

```bash
# Let's Encrypt (free)
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

### Rate Limiting

**Nginx rate limiting:**

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://ccjk_backend;
    }
}
```

---

### Firewall

**UFW (Ubuntu):**

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

### Database Security

**Restrict access:**

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

```
# Only allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

```bash
sudo systemctl restart postgresql
```

---

## Monitoring

### Health Checks

**Server health endpoint:**

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

---

### Logging

**PM2 logs:**

```bash
pm2 logs ccjk-server
pm2 logs ccjk-server --lines 100
pm2 logs ccjk-server --err
```

**Nginx logs:**

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**Application logs:**

```bash
tail -f ~/.ccjk/daemon.log
```

---

### Monitoring Tools

**Option 1: PM2 Plus**

```bash
pm2 link your_secret_key your_public_key
```

**Option 2: Datadog**

```bash
npm install --save dd-trace
```

```typescript
// src/index.ts
import tracer from 'dd-trace';
tracer.init();
```

**Option 3: Sentry**

```bash
npm install --save @sentry/node
```

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: 'your_sentry_dsn',
  environment: 'production'
});
```

---

### Alerts

**Uptime monitoring:**
- UptimeRobot (free)
- Pingdom
- StatusCake

**Error tracking:**
- Sentry
- Rollbar
- Bugsnag

---

## Troubleshooting

### Server Not Starting

**Check logs:**

```bash
pm2 logs ccjk-server --err
```

**Common issues:**
- Port already in use: Change `PORT` in `.env`
- Database connection failed: Check `DATABASE_URL`
- Missing environment variables: Verify `.env` file

---

### Database Connection Issues

**Test connection:**

```bash
psql $DATABASE_URL
```

**Check PostgreSQL status:**

```bash
sudo systemctl status postgresql
```

**Check connection limit:**

```sql
SELECT count(*) FROM pg_stat_activity;
SELECT max_connections FROM pg_settings WHERE name = 'max_connections';
```

---

### Socket.IO Not Connecting

**Check WebSocket support:**

```bash
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://your-domain.com/socket.io/
```

**Nginx WebSocket config:**

```nginx
location /socket.io/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

### High Memory Usage

**Check PM2 memory:**

```bash
pm2 monit
```

**Restart if needed:**

```bash
pm2 restart ccjk-server
```

**Auto-restart on high memory:**

```bash
pm2 start dist/index.js --name ccjk-server --max-memory-restart 500M
```

---

### Daemon Not Connecting

**Check daemon status:**

```bash
ccjk daemon status
```

**Check logs:**

```bash
tail -f ~/.ccjk/daemon.log
```

**Restart daemon:**

```bash
ccjk daemon restart
```

**Common issues:**
- Server URL incorrect: Run `ccjk remote setup` again
- Auth token invalid/expired: Run `ccjk remote setup` again
- Firewall blocking: Check firewall rules

---

## Performance Optimization

### Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_sessions_machine_id ON sessions(machine_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_approvals_status ON approval_requests(status);
CREATE INDEX idx_approvals_session_id ON approval_requests(session_id);
```

---

### Redis Caching

**Install Redis:**

```bash
sudo apt install -y redis-server
```

**Configure caching:**

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache session data
async function getSession(id: string) {
  const cached = await redis.get(`session:${id}`);
  if (cached) return JSON.parse(cached);

  const session = await prisma.session.findUnique({ where: { id } });
  await redis.setex(`session:${id}`, 300, JSON.stringify(session));
  return session;
}
```

---

### CDN for Static Assets

**Cloudflare:**
- Free SSL
- DDoS protection
- Global CDN

**Setup:**
1. Add domain to Cloudflare
2. Update nameservers
3. Enable "Proxied" for DNS records

---

## Scaling

### Horizontal Scaling

**Load balancer (Nginx):**

```nginx
upstream ccjk_backend {
    least_conn;
    server 10.0.1.10:3005;
    server 10.0.1.11:3005;
    server 10.0.1.12:3005;
}
```

**Socket.IO sticky sessions:**

```nginx
upstream ccjk_backend {
    ip_hash;
    server 10.0.1.10:3005;
    server 10.0.1.11:3005;
}
```

---

### Database Scaling

**Read replicas:**

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_URL
    }
  }
});

// Use read replica for queries
const sessions = await prismaRead.session.findMany();

// Use primary for writes
await prisma.session.create({ data: { ... } });
```

---

## Cost Estimation

### Railway (Recommended for Small Teams)

| Resource | Cost |
|----------|------|
| Server (512MB RAM) | $5/month |
| PostgreSQL (1GB) | $5/month |
| **Total** | **$10/month** |

---

### VPS (DigitalOcean)

| Resource | Cost |
|----------|------|
| Droplet (2GB RAM) | $12/month |
| Managed PostgreSQL | $15/month |
| **Total** | **$27/month** |

---

### AWS (Enterprise)

| Resource | Cost |
|----------|------|
| EC2 t3.small | $15/month |
| RDS PostgreSQL | $30/month |
| Load Balancer | $20/month |
| **Total** | **$65/month** |

---

## Checklist

### Pre-Deployment

- [ ] GitHub OAuth app created
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificate obtained
- [ ] Backup strategy implemented
- [ ] Monitoring tools configured
- [ ] Error tracking setup

### Post-Deployment

- [ ] Health check passing
- [ ] Socket.IO connecting
- [ ] Mobile app connecting
- [ ] Daemon connecting
- [ ] Logs being collected
- [ ] Backups running
- [ ] Alerts configured

---

## Support

- **Documentation**: https://github.com/your-org/ccjk-public/docs
- **Issues**: https://github.com/your-org/ccjk-public/issues
- **Discord**: https://discord.gg/your-server

---

**Next Steps:**
1. Read [Client Integration Guide](./client-integration-guide.md)
2. Read [Backend API Reference](./backend-api-reference.md)
3. Check [Monitoring Best Practices](./monitoring-guide.md)

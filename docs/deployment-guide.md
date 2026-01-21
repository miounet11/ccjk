# Cloud Service Deployment Guide

**Version**: v3.8.0
**Last Updated**: 2026-01-21
**Target Audience**: DevOps Engineers, System Administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Architecture](#deployment-architecture)
4. [Local Development Setup](#local-development-setup)
5. [Docker Deployment](#docker-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Configuration Management](#configuration-management)
8. [Scaling Strategy](#scaling-strategy)
9. [Monitoring](#monitoring)
10. [Disaster Recovery](#disaster-recovery)

---

## Overview

This guide covers deploying the CCJK Cloud Service, which provides:

- **Plugin Registry**: Community plugin marketplace
- **Skill Registry**: Shared skill templates
- **Agent Orchestration**: Multi-agent coordination
- **Cloud Sync**: Cross-device configuration synchronization
- **API Gateway**: Unified API endpoints

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
│                    (NGINX / AWS ALB)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼────────┐ ┌────▼─────┐ ┌─────▼────────┐
│   API Gateway   │ │  Web App │ │  WebSocket   │
│   (Express)     │ │ (Next.js)│ │   Server     │
└────────┬────────┘ └────┬─────┘ └─────┬────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Service Layer                               │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│   Plugin     │    Skill     │    Agent     │   Cloud Sync     │
│   Service    │   Service    │   Service    │    Service       │
└──────────────┴──────────────┴──────────────┴──────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Data Layer                                  │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│  PostgreSQL  │    Redis     │  S3/MinIO    │   RabbitMQ/      │
│  (Primary)   │   (Cache)    │  (Files)     │   NATS (Queue)   │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

---

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended |
|:----------|:--------|:------------|
| **CPU** | 4 cores | 8+ cores |
| **Memory** | 8 GB | 16+ GB |
| **Storage** | 50 GB SSD | 100+ GB SSD |
| **Network** | 100 Mbps | 1 Gbps |

### Software Requirements

| Software | Version |
|:---------|:-------|
| **Node.js** | 20.x LTS |
| **Docker** | 24.x |
| **Kubernetes** | 1.28+ (optional) |
| **PostgreSQL** | 15+ |
| **Redis** | 7.x |
| **Nginx** | 1.25+ |

### External Services

| Service | Purpose |
|:--------|:-------|
| **GitHub OAuth** | User authentication |
| **AWS S3 / MinIO** | File storage |
| **Cloudflare** | DNS & CDN (optional) |
| **Datadog / New Relic** | Monitoring (optional) |

---

## Deployment Architecture

### Production Topology

```
                        ┌─────────────────┐
                        │     CDN         │
                        │  (Cloudflare)   │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Load Balancer │
                        │   (AWS ALB)     │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│  API Pod 1      │    │  API Pod 2      │    │  API Pod N      │
│  (Node:API)     │    │  (Node:API)     │    │  (Node:API)     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                      Service Mesh (Istio)                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│  PostgreSQL     │    │     Redis       │    │    RabbitMQ     │
│  (Primary)      │    │    (Cluster)    │    │   (Cluster)     │
│                │    │                 │    │                 │
└────────┬────────┘    └─────────────────┘    └─────────────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │
│  (Replica)      │
│                 │
└─────────────────┘
```

### Environment Tiers

| Tier | Purpose | Replicas | Resources |
|:-----|:--------|:--------:|:---------|
| **Development** | Local testing | 1 | 1 CPU, 2GB RAM |
| **Staging** | Pre-production | 2 | 2 CPU, 4GB RAM |
| **Production** | Live service | 3+ | 4 CPU, 8GB RAM |

---

## Local Development Setup

### Clone and Configure

```bash
# Clone repository
git clone https://github.com/ccjk/ccjk-cloud.git
cd ccjk-cloud

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Environment Variables

```bash
# .env configuration

# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ccjk_dev
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=ccjk:

# Queue (RabbitMQ/NATS)
QUEUE_URL=nats://localhost:4222
QUEUE_STREAM_NAME=ccjk_tasks

# Storage (S3/MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=ccjk-plugins
S3_REGION=us-east-1

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
OAUTH_GITHUB_CLIENT_ID=your-github-client-id
OAUTH_GITHUB_CLIENT_SECRET=your-github-client-secret

# External APIs
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Rate Limiting
RATE_LIMIT_TIER=free
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=debug
```

### Start Development Services

```bash
# Start infrastructure services
docker-compose up -d postgres redis minio rabbitmq

# Run database migrations
pnpm migrate

# Seed database
pnpm seed

# Start development server
pnpm dev

# Run workers
pnpm worker
```

### Docker Compose Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ccjk_dev
      POSTGRES_USER: ccjk
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  nats:
    image: nats:2-alpine
    command: "-js"
    ports:
      - "4222:4222"
    volumes:
      - nats_data:/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://ccjk:password@postgres:5432/ccjk_dev
      - REDIS_URL=redis://redis:6379
      - QUEUE_URL=nats://nats:4222
      - S3_ENDPOINT=http://minio:9000
    depends_on:
      - postgres
      - redis
      - minio
      - nats
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
  minio_data:
  nats_data:
```

---

## Docker Deployment

### Build Production Image

```bash
# Build Docker image
docker build -t ccjk-cloud:latest .

# Tag for registry
docker tag ccjk-cloud:latest registry.claudehome.cn/ccjk/cloud:latest

# Push to registry
docker push registry.claudehome.cn/ccjk/cloud:latest
```

### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build application
RUN pnpm build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -g 1001 -S ccjk && \
    adduser -S ccjk -u 1001 -G ccjk

USER ccjk

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: registry.claudehome.cn/ccjk/cloud:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped

  worker:
    image: registry.claudehome.cn/ccjk/cloud:latest
    command: ["node", "dist/worker.js"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - QUEUE_URL=${QUEUE_URL}
    restart: unless-stopped
    deploy:
      replicas: 2
```

---

## Kubernetes Deployment

### Namespace Configuration

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ccjk-cloud
  labels:
    name: ccjk-cloud
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ccjk-config
  namespace: ccjk-cloud
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  RATE_LIMIT_WINDOW_MS: "60000"
  RATE_LIMIT_MAX_REQUESTS: "100"
```

### Secret

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ccjk-secrets
  namespace: ccjk-cloud
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/ccjk"
  REDIS_URL: "redis://redis:6379"
  JWT_SECRET: "your-secret-key"
  ANTHROPIC_API_KEY: "your-api-key"
```

### API Deployment

```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ccjk-api
  namespace: ccjk-cloud
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ccjk-api
  template:
    metadata:
      labels:
        app: ccjk-api
    spec:
      containers:
      - name: api
        image: registry.claudehome.cn/ccjk/cloud:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: ccjk-config
        - secretRef:
            name: ccjk-secrets
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ccjk-api
  namespace: ccjk-cloud
spec:
  selector:
    app: ccjk-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### HorizontalPodAutoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ccjk-api-hpa
  namespace: ccjk-cloud
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ccjk-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ccjk-ingress
  namespace: ccjk-cloud
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.claudehome.cn
    secretName: ccjk-tls
  rules:
  - host: api.claudehome.cn
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: ccjk-api
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n ccjk-cloud
kubectl get services -n ccjk-cloud
kubectl get ingress -n ccjk-cloud

# View logs
kubectl logs -f deployment/ccjk-api -n ccjk-cloud
```

---

## Configuration Management

### Using Environment Variables

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ccjk-config
  namespace: ccjk-cloud
data:
  # Application
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"

  # Rate Limiting
  RATE_LIMIT_TIER: "pro"
  RATE_LIMIT_MAX_REQUESTS: "300"

  # Feature Flags
  FEATURE_CLOUD_SYNC: "true"
  FEATURE_AGENT_ORCHESTRATION: "true"
  FEATURE_PLUGIN_MARKETPLACE: "true"
```

### Using a Configuration Service

For dynamic configuration, integrate with a configuration service:

```typescript
// config-service.ts
import { Consul } from 'consul'

const consul = new Consul({
  host: process.env.CONSUL_HOST || 'localhost',
  port: parseInt(process.env.CONSUL_PORT || '8500'),
})

export async function getConfig(key: string): Promise<string | undefined> {
  const result = await consul.kv.get(key)
  return result.Value?.toString()
}

export async function watchConfig(
  key: string,
  callback: (value: string) => void,
): Promise<void> {
  return consul.watch({
    method: consul.kv.get,
    params: { key },
    callback: (err, result) => {
      if (!err && result) {
        callback(result.Value?.toString() || '')
      }
    },
  })
}
```

---

## Scaling Strategy

### Vertical Scaling

Increase pod resources based on metrics:

```yaml
# k8s/api-deployment.yaml
resources:
  requests:
    cpu: 1000m      # Increased from 500m
    memory: 1Gi     # Increased from 512Mi
  limits:
    cpu: 4000m      # Increased from 2000m
    memory: 4Gi     # Increased from 2Gi
```

### Horizontal Scaling

Configure HPA based on custom metrics:

```yaml
# k8s/hpa-custom.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ccjk-api-hpa
  namespace: ccjk-cloud
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ccjk-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  # Request-based scaling (requires metrics-server)
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

### Database Scaling

#### Read Replicas

```yaml
# k8s/postgres-replica.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-replica
  namespace: ccjk-cloud
spec:
  replicas: 2
  serviceName: postgres-replica
  selector:
    matchLabels:
      app: postgres-replica
  template:
    metadata:
      labels:
        app: postgres-replica
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_REPLICATION_USER
          value: replicator
        - name: POSTGRES_REPLICATION_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ccjk-secrets
              key: POSTGRES_REPLICATION_PASSWORD
        - name: POSTGRES_MASTER_HOST
          value: postgres-primary
```

#### Connection Pooling (PgBouncer)

```yaml
# k8s/pgbouncer.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: ccjk-cloud
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
      - name: pgbouncer
        image: edoburu/pgbouncer:latest
        env:
        - name: DATABASES_HOST
          value: postgres-primary
        - name: DATABASES_PORT
          value: "5432"
        - name: DATABASES_USER
          value: ccjk
        - name: DATABASES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ccjk-secrets
              key: DATABASE_PASSWORD
        - name: DATABASES_DBNAME
          value: ccjk
        - name: POOL_MODE
          value: transaction
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "50"
```

---

## Monitoring

### Health Checks

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version,
    }
  }

  @Get('ready')
  ready() {
    // Check dependencies
    const dbHealthy = await this.checkDatabase()
    const redisHealthy = await this.checkRedis()
    const queueHealthy = await this.checkQueue()

    return {
      status: dbHealthy && redisHealthy && queueHealthy ? 'ready' : 'not_ready',
      checks: {
        database: dbHealthy,
        redis: redisHealthy,
        queue: queueHealthy,
      },
    }
  }
}
```

### Prometheus Metrics

```typescript
// metrics.service.ts
import { Counter, Histogram, Gauge, Registry } from 'prom-client'

export class MetricsService {
  private registry: Registry

  // HTTP request counter
  httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  })

  // HTTP request duration histogram
  httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [this.registry],
  })

  // Active connections gauge
  activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Number of active database connections',
    registers: [this.registry],
  })

  // Sync operations counter
  syncOperationsTotal = new Counter({
    name: 'sync_operations_total',
    help: 'Total number of sync operations',
    labelNames: ['operation', 'status'],
    registers: [this.registry],
  })
}
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ccjk-api'
    kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
        - ccjk-cloud
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app]
      regex: ccjk-api
      action: keep
    - source_labels: [__meta_kubernetes_pod_ip]
      target_label: __address__
      replacement: $1:3000

  - job_name: 'postgres'
    static_configs:
    - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
    - targets: ['redis-exporter:9121']
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "CCJK Cloud Service",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Request Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Sync Operations",
        "targets": [
          {
            "expr": "rate(sync_operations_total[5m])",
            "legendFormat": "{{operation}} {{status}}"
          }
        ]
      }
    ]
  }
}
```

### Log Aggregation (ELK Stack)

```yaml
# filebeat.yml
filebeat.inputs:
- type: container
  paths:
    - /var/log/containers/ccjk-api-*.log
  processors:
  - add_kubernetes_metadata:
      host: ${NODE_NAME}
      matchers:
      - logs_path:
          logs_path: "/var/log/containers/"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  indices:
    - index: "ccjk-cloud-%{+yyyy.MM.dd}"

setup.kibana:
  host: "kibana:5601"
```

---

## Disaster Recovery

### Backup Strategy

#### Database Backups

```bash
# Automated backup script
#!/bin/bash
# /usr/local/bin/backup-db.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ccjk_$TIMESTAMP.sql.gz"

# Create backup
kubectl exec -n ccjk-cloud postgres-0 -- pg_dump -U ccjk ccjk | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://ccjk-backups/database/

# Keep last 30 days of backups
find $BACKUP_DIR -name "ccjk_*.sql.gz" -mtime +30 -delete
```

#### Configuration Backups

```bash
# Backup configurations
#!/bin/bash
# /usr/local/bin/backup-configs.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/ccjk-configs-$TIMESTAMP.tar.gz"

# Export all Kubernetes resources
kubectl get all,configmaps,secrets -n ccjk-cloud -o yaml > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://ccjk-backups/configs/
```

### Restore Procedure

#### Database Restore

```bash
# Restore from backup
aws s3 cp s3://ccjk-backups/database/ccjk_20260121_100000.sql.gz - | \
  gunzip | \
  kubectl exec -i -n ccjk-cloud postgres-0 -- psql -U ccjk ccjk
```

#### Application Restore

```bash
# Restore from backup
kubectl apply -f /backups/configs/ccjk-configs-20260121.yaml

# Rollback to previous image
kubectl set image deployment/ccjk-api \
  ccjk-api=registry.claudehome.cn/ccjk/cloud:v3.7.4 \
  -n ccjk-cloud
```

### High Availability Setup

```yaml
# k8s/postgres-ha.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres
  namespace: ccjk-cloud
spec:
  instances: 3
  primaryUpdateStrategy: unsupervised
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
  bootstrap:
    initdb:
      database: ccjk
      owner: ccjk
      secret:
        name: postgres-credentials
  storage:
    size: 100Gi
    storageClass: fast-ssd
  monitoring:
    enabled: true
  backup:
    barmanObjectStore:
      destinationPath: s3://ccjk-backups/postgres/
      s3Credentials:
        accessKeyId:
          name: minio-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: minio-credentials
          key: SECRET_ACCESS_KEY
      endpointURL: http://minio:9000
      wal:
        retention: 7d
```

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-21

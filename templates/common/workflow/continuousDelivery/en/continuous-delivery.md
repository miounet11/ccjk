---
description: Continuous Delivery Pipeline - Automated build, test, and deploy for software ready to release anytime
allowed-tools: Read(**), Write(**), Exec(npm run build, npm test, docker build, docker push, kubectl apply)
argument-hint: [--env <staging|production>] [--skip-tests] [--rollback] [--canary]
# examples:
#   - /continuous-delivery                      # Deploy to staging
#   - /continuous-delivery --env production     # Deploy to production
#   - /continuous-delivery --canary             # Canary release
#   - /continuous-delivery --rollback           # Rollback to previous version
---

# Continuous Delivery Pipeline

Based on Jez Humble and David Farley's *Continuous Delivery* and modern DevOps practices for automated delivery pipeline.

---

## Core Philosophy

**Continuous Delivery (CD)**:
- Code is always in a releasable state
- Automated build, test, and deployment process
- Fast, reliable, repeatable releases
- Reduce release risk, increase delivery frequency

**Key Principles**:
1. **Automate Everything**: From code commit to production deployment
2. **Fast Feedback**: Every commit triggers complete validation
3. **Small Batch Releases**: Frequent small changes reduce risk
4. **Environment Consistency**: Dev, test, prod configs are identical
5. **Observability**: Full-stack monitoring and log tracing

---

## Pipeline Stages

### Stage 1: Source Control

**Triggers**:
- Git push to main branch
- Pull Request merge
- Scheduled builds (nightly)

```yaml
# .github/workflows/cd-pipeline.yml
name: Continuous Delivery Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
```

**Checks**:
- ✅ Code committed to version control
- ✅ Commit message follows convention
- ✅ Branch protection rules configured

---

### Stage 2: Build

**Goal**: Compile source code into deployable artifacts

```bash
# 1. Install dependencies
npm ci  # Use ci instead of install for consistent versions

# 2. Code checks
npm run lint
npm run type-check

# 3. Build
npm run build

# 4. Generate version
VERSION=$(git describe --tags --always)
echo "Building version: $VERSION"
```

**Build Optimization**:
```dockerfile
# Dockerfile - Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Checks**:
- ✅ Build succeeds without errors
- ✅ Artifact size reasonable (< 500MB)
- ✅ Version tagged
- ✅ Build time < 10 minutes

---

### Stage 3: Test

**Goal**: Automated validation of code quality and functionality

#### 3.1 Unit Tests

```bash
npm run test:unit -- --coverage --ci

# Coverage requirements
# Statements   : 80%
# Branches     : 75%
# Functions    : 80%
# Lines        : 80%
```

#### 3.2 Integration Tests

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down
```

#### 3.3 E2E Tests

```bash
# Start application
npm run start:test &
APP_PID=$!

# Wait for app ready
wait-on http://localhost:3000/health

# Run E2E tests
npm run test:e2e

# Cleanup
kill $APP_PID
```

#### 3.4 Performance Tests

```bash
# Load testing with k6
k6 run --vus 100 --duration 30s tests/load/api-test.js

# Performance benchmarks
# - P95 latency < 200ms
# - Throughput > 1000 req/s
# - Error rate < 0.1%
```

#### 3.5 Security Scan

```bash
# Dependency vulnerability scan
npm audit --audit-level=moderate

# Container image scan
trivy image myapp:$VERSION

# SAST static analysis
sonar-scanner
```

**Checks**:
- ✅ All tests pass
- ✅ Coverage meets threshold
- ✅ No high-severity vulnerabilities
- ✅ Performance metrics meet requirements

---

### Stage 4: Package

**Goal**: Create immutable deployment artifacts

```bash
# 1. Build Docker image
docker build -t myapp:$VERSION .

# 2. Tag image
docker tag myapp:$VERSION registry.example.com/myapp:$VERSION
docker tag myapp:$VERSION registry.example.com/myapp:latest

# 3. Push to registry
docker push registry.example.com/myapp:$VERSION
docker push registry.example.com/myapp:latest

# 4. Generate SBOM (Software Bill of Materials)
syft registry.example.com/myapp:$VERSION -o spdx-json > sbom.json

# 5. Sign image
cosign sign registry.example.com/myapp:$VERSION
```

**Artifact Metadata**:
```json
{
  "artifact": {
    "name": "myapp",
    "version": "v1.2.3",
    "commit": "abc123",
    "buildTime": "2025-02-04T10:30:00Z",
    "registry": "registry.example.com",
    "digest": "sha256:...",
    "size": "245MB"
  }
}
```

**Checks**:
- ✅ Image built successfully
- ✅ Image pushed to registry
- ✅ Image signed and verified
- ✅ SBOM generated

---

### Stage 5: Deploy

**Goal**: Deploy artifacts to target environment

#### 5.1 Staging Deployment

```bash
# 1. Update Kubernetes config
kubectl set image deployment/myapp \
  myapp=registry.example.com/myapp:$VERSION \
  -n staging

# 2. Wait for rollout
kubectl rollout status deployment/myapp -n staging

# 3. Health check
kubectl get pods -n staging -l app=myapp
curl https://staging.example.com/health

# 4. Smoke tests
npm run test:smoke -- --env staging
```

#### 5.2 Production Deployment

**Blue-Green Deployment**:

```bash
# 1. Deploy new version to Green environment
kubectl apply -f k8s/deployment-green.yml

# 2. Wait for Green ready
kubectl wait --for=condition=available deployment/myapp-green

# 3. Run validation tests
npm run test:smoke -- --env green

# 4. Switch traffic to Green
kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor for 5 minutes
sleep 300

# 6. If healthy, delete Blue
kubectl delete deployment myapp-blue
```

**Canary Deployment**:

```bash
# 1. Deploy canary version (5% traffic)
kubectl apply -f k8s/canary.yml

# 2. Monitor key metrics
while true; do
  ERROR_RATE=$(prometheus-query 'rate(http_errors[5m])')
  if [ $ERROR_RATE -gt 0.01 ]; then
    echo "Error rate too high, rolling back"
    kubectl delete -f k8s/canary.yml
    exit 1
  fi
  sleep 60
done

# 3. Gradually increase traffic: 5% -> 25% -> 50% -> 100%
kubectl patch deployment myapp-canary -p '{"spec":{"replicas":5}}'
```

**Checks**:
- ✅ Deployment successful
- ✅ Health checks pass
- ✅ Smoke tests pass
- ✅ Key metrics normal

---

### Stage 6: Monitor

**Goal**: Real-time monitoring of application health and business metrics

#### 6.1 Infrastructure Monitoring

```yaml
# Prometheus metrics
metrics:
  - name: http_requests_total
    type: counter
    help: Total HTTP requests

  - name: http_request_duration_seconds
    type: histogram
    help: HTTP request latency

  - name: app_errors_total
    type: counter
    help: Total application errors

  - name: db_connections_active
    type: gauge
    help: Active database connections
```

#### 6.2 Log Aggregation

```json
// Structured logging
{
  "timestamp": "2025-02-04T10:30:00Z",
  "level": "info",
  "service": "myapp",
  "version": "v1.2.3",
  "traceId": "abc123",
  "message": "User login successful",
  "userId": "user-456",
  "duration": 120
}
```

#### 6.3 Alert Rules

```yaml
# Alertmanager configuration
alerts:
  - name: HighErrorRate
    expr: rate(http_errors[5m]) > 0.05
    severity: critical
    message: "Error rate > 5% for 5 minutes"

  - name: HighLatency
    expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
    severity: warning
    message: "P95 latency > 1s"

  - name: LowAvailability
    expr: up{job="myapp"} < 0.99
    severity: critical
    message: "Service availability < 99%"
```

#### 6.4 Business Metrics

```typescript
// Key business metrics
const businessMetrics = {
  dailyActiveUsers: 12500,
  conversionRate: 0.032,
  averageOrderValue: 89.50,
  customerSatisfaction: 4.7
}
```

---

### Stage 7: Rollback

**Goal**: Quickly rollback to previous stable version

```bash
# 1. View deployment history
kubectl rollout history deployment/myapp

# 2. Rollback to previous version
kubectl rollout undo deployment/myapp

# 3. Rollback to specific version
kubectl rollout undo deployment/myapp --to-revision=3

# 4. Verify rollback
kubectl rollout status deployment/myapp
curl https://api.example.com/health

# 5. Notify team
slack-notify "🔄 Rolled back myapp to v1.2.2 due to high error rate"
```

**Auto-rollback Conditions**:
- Error rate > 5%
- P95 latency > 2 seconds
- Health check failures
- Critical business metric anomalies

---

## Deployment Strategies

### 1. Rolling Update

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Max 2 extra pods
      maxUnavailable: 1  # Max 1 pod unavailable
```

**Pros**:
- Zero downtime
- High resource efficiency
- Simple implementation

**Cons**:
- Mixed versions coexist
- Slower rollback

---

### 2. Blue-Green Deployment

```
[Blue v1.0]  ← 100% traffic
[Green v1.1] ← 0% traffic

After switch:
[Blue v1.0]  ← 0% traffic (kept for rollback)
[Green v1.1] ← 100% traffic
```

**Pros**:
- Instant switch
- Fast rollback
- Thorough testing

**Cons**:
- Requires double resources
- Complex database migrations

---

### 3. Canary Release

```
Phase 1: [v1.0: 95%] [v1.1: 5%]
Phase 2: [v1.0: 75%] [v1.1: 25%]
Phase 3: [v1.0: 50%] [v1.1: 50%]
Phase 4: [v1.0: 0%]  [v1.1: 100%]
```

**Pros**:
- Progressive rollout
- Controlled risk
- Real traffic validation

**Cons**:
- Complex implementation
- Longer release time

---

## Pipeline Configuration

### Environment Configuration

```yaml
# config/environments.yml
environments:
  development:
    url: http://localhost:3000
    database: dev-db
    replicas: 1

  staging:
    url: https://staging.example.com
    database: staging-db
    replicas: 3

  production:
    url: https://api.example.com
    database: prod-db
    replicas: 10
    autoScale:
      min: 10
      max: 50
      targetCPU: 70
```

### Quality Gates

```yaml
# Pre-deployment requirements
quality-gates:
  - name: test-coverage
    threshold: 80
    blocking: true

  - name: code-quality
    sonarqube:
      bugs: 0
      vulnerabilities: 0
      code-smells: < 10
    blocking: true

  - name: performance
    p95-latency: < 200ms
    throughput: > 1000 rps
    blocking: false
```

---

## Best Practices

### 1. Version Management

```bash
# Semantic versioning
MAJOR.MINOR.PATCH

# Example
v1.2.3
  │ │ └─ Patch (bug fixes)
  │ └─── Minor (new features, backward compatible)
  └───── Major (breaking changes)
```

### 2. Configuration Management

```typescript
// ✅ Good: Externalized config
const config = {
  database: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info'
}

// ❌ Bad: Hardcoded config
const config = {
  database: 'postgres://localhost:5432/mydb',
  apiKey: 'sk-1234567890'
}
```

### 3. Database Migrations

```bash
# Backward-compatible migration strategy
# Phase 1: Add new column (nullable)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

# Phase 2: Deploy new code (supports both old and new columns)
# Phase 3: Data migration
UPDATE users SET email_verified = true WHERE email IS NOT NULL;

# Phase 4: Add constraint
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

# Phase 5: Drop old column (next release)
ALTER TABLE users DROP COLUMN old_email_field;
```

### 4. Feature Flags

```typescript
// Use feature flags to control new feature rollout
if (featureFlags.isEnabled('new-checkout-flow', user)) {
  return newCheckoutFlow()
} else {
  return legacyCheckoutFlow()
}
```

---

## Command Options

- `--env <staging|production>`: Specify deployment environment
- `--skip-tests`: Skip test phase (emergency fixes only)
- `--rollback`: Rollback to previous version
- `--canary`: Use canary release strategy
- `--dry-run`: Simulate deployment without executing

---

## Success Metrics

- ✅ Deployment frequency: Multiple times per day
- ✅ Lead time for changes: < 1 hour
- ✅ Change failure rate: < 15%
- ✅ Mean time to recovery (MTTR): < 1 hour
- ✅ Service availability: > 99.9%

---

## References

- Jez Humble & David Farley - *Continuous Delivery*
- Gene Kim - *The DevOps Handbook*
- Nicole Forsgren - *Accelerate*
- Martin Fowler - *Continuous Integration*

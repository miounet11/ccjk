---
description: 持续交付流水线 - 自动化构建、测试、部署，实现随时可发布的软件交付
allowed-tools: Read(**), Write(**), Exec(npm run build, npm test, docker build, docker push, kubectl apply)
argument-hint: [--env <staging|production>] [--skip-tests] [--rollback] [--canary]
# examples:
#   - /continuous-delivery                      # 部署到 staging 环境
#   - /continuous-delivery --env production     # 部署到生产环境
#   - /continuous-delivery --canary             # 金丝雀发布
#   - /continuous-delivery --rollback           # 回滚到上一版本
---

# Continuous Delivery Pipeline

基于 Jez Humble 和 David Farley 的《持续交付》，以及现代 DevOps 实践构建的自动化交付流水线。

---

## 核心理念

**持续交付（Continuous Delivery）**：
- 代码随时处于可发布状态
- 自动化构建、测试、部署流程
- 快速、可靠、可重复的发布
- 降低发布风险，提高交付频率

**关键原则**：
1. **自动化一切**：从代码提交到生产部署全自动化
2. **快速反馈**：每次提交都触发完整的验证流程
3. **小批量发布**：频繁发布小改动，降低风险
4. **环境一致性**：开发、测试、生产环境配置一致
5. **可观测性**：全链路监控和日志追踪

---

## Pipeline Stages

### Stage 1: Source Control（源码管理）

**触发条件**：
- Git push 到主分支
- Pull Request 合并
- 定时构建（夜间构建）

```yaml
# .github/workflows/cd-pipeline.yml
name: Continuous Delivery Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨 2 点
```

**检查项**：
- ✅ 代码已提交到版本控制
- ✅ 提交信息符合规范
- ✅ 分支保护规则已配置

---

### Stage 2: Build（构建）

**目标**：将源代码编译为可部署的制品

```bash
# 1. 安装依赖
npm ci  # 使用 ci 而非 install，确保依赖版本一致

# 2. 代码检查
npm run lint
npm run type-check

# 3. 编译构建
npm run build

# 4. 生成版本号
VERSION=$(git describe --tags --always)
echo "Building version: $VERSION"
```

**构建优化**：
```dockerfile
# Dockerfile - 多阶段构建
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

**检查项**：
- ✅ 构建成功无错误
- ✅ 制品大小合理（< 500MB）
- ✅ 版本号已标记
- ✅ 构建时间 < 10 分钟

---

### Stage 3: Test（测试）

**目标**：自动化验证代码质量和功能正确性

#### 3.1 单元测试（Unit Tests）

```bash
npm run test:unit -- --coverage --ci

# 覆盖率要求
# Statements   : 80%
# Branches     : 75%
# Functions    : 80%
# Lines        : 80%
```

#### 3.2 集成测试（Integration Tests）

```bash
# 启动测试数据库
docker-compose -f docker-compose.test.yml up -d

# 运行集成测试
npm run test:integration

# 清理测试环境
docker-compose -f docker-compose.test.yml down
```

#### 3.3 端到端测试（E2E Tests）

```bash
# 启动应用
npm run start:test &
APP_PID=$!

# 等待应用就绪
wait-on http://localhost:3000/health

# 运行 E2E 测试
npm run test:e2e

# 清理
kill $APP_PID
```

#### 3.4 性能测试（Performance Tests）

```bash
# 使用 k6 进行负载测试
k6 run --vus 100 --duration 30s tests/load/api-test.js

# 性能基准
# - 响应时间 P95 < 200ms
# - 吞吐量 > 1000 req/s
# - 错误率 < 0.1%
```

#### 3.5 安全扫描（Security Scan）

```bash
# 依赖漏洞扫描
npm audit --audit-level=moderate

# 容器镜像扫描
trivy image myapp:$VERSION

# SAST 静态代码分析
sonar-scanner
```

**检查项**：
- ✅ 所有测试通过
- ✅ 覆盖率达标
- ✅ 无高危安全漏洞
- ✅ 性能指标符合要求

---

### Stage 4: Package（打包）

**目标**：创建不可变的部署制品

```bash
# 1. 构建 Docker 镜像
docker build -t myapp:$VERSION .

# 2. 标记镜像
docker tag myapp:$VERSION registry.example.com/myapp:$VERSION
docker tag myapp:$VERSION registry.example.com/myapp:latest

# 3. 推送到镜像仓库
docker push registry.example.com/myapp:$VERSION
docker push registry.example.com/myapp:latest

# 4. 生成 SBOM（软件物料清单）
syft registry.example.com/myapp:$VERSION -o spdx-json > sbom.json

# 5. 签名镜像
cosign sign registry.example.com/myapp:$VERSION
```

**制品管理**：
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

**检查项**：
- ✅ 镜像构建成功
- ✅ 镜像已推送到仓库
- ✅ 镜像已签名验证
- ✅ SBOM 已生成

---

### Stage 5: Deploy（部署）

**目标**：将制品部署到目标环境

#### 5.1 Staging 环境部署

```bash
# 1. 更新 Kubernetes 配置
kubectl set image deployment/myapp \
  myapp=registry.example.com/myapp:$VERSION \
  -n staging

# 2. 等待部署完成
kubectl rollout status deployment/myapp -n staging

# 3. 健康检查
kubectl get pods -n staging -l app=myapp
curl https://staging.example.com/health

# 4. 烟雾测试
npm run test:smoke -- --env staging
```

#### 5.2 Production 环境部署

**蓝绿部署（Blue-Green Deployment）**：

```bash
# 1. 部署新版本到 Green 环境
kubectl apply -f k8s/deployment-green.yml

# 2. 等待 Green 环境就绪
kubectl wait --for=condition=available deployment/myapp-green

# 3. 运行验证测试
npm run test:smoke -- --env green

# 4. 切换流量到 Green
kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

# 5. 监控 5 分钟
sleep 300

# 6. 如果正常，删除 Blue 环境
kubectl delete deployment myapp-blue
```

**金丝雀发布（Canary Deployment）**：

```bash
# 1. 部署金丝雀版本（5% 流量）
kubectl apply -f k8s/canary.yml

# 2. 监控关键指标
while true; do
  ERROR_RATE=$(prometheus-query 'rate(http_errors[5m])')
  if [ $ERROR_RATE -gt 0.01 ]; then
    echo "Error rate too high, rolling back"
    kubectl delete -f k8s/canary.yml
    exit 1
  fi
  sleep 60
done

# 3. 逐步增加流量：5% -> 25% -> 50% -> 100%
kubectl patch deployment myapp-canary -p '{"spec":{"replicas":5}}'
```

**检查项**：
- ✅ 部署成功
- ✅ 健康检查通过
- ✅ 烟雾测试通过
- ✅ 关键指标正常

---

### Stage 6: Monitor（监控）

**目标**：实时监控应用健康状态和业务指标

#### 6.1 基础设施监控

```yaml
# Prometheus 监控指标
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

#### 6.2 日志聚合

```json
// 结构化日志
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

#### 6.3 告警规则

```yaml
# Alertmanager 告警配置
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

#### 6.4 业务指标

```typescript
// 关键业务指标
const businessMetrics = {
  dailyActiveUsers: 12500,
  conversionRate: 0.032,
  averageOrderValue: 89.50,
  customerSatisfaction: 4.7
}
```

---

### Stage 7: Rollback（回滚）

**目标**：快速回滚到上一个稳定版本

```bash
# 1. 查看部署历史
kubectl rollout history deployment/myapp

# 2. 回滚到上一版本
kubectl rollout undo deployment/myapp

# 3. 回滚到指定版本
kubectl rollout undo deployment/myapp --to-revision=3

# 4. 验证回滚
kubectl rollout status deployment/myapp
curl https://api.example.com/health

# 5. 通知团队
slack-notify "🔄 Rolled back myapp to v1.2.2 due to high error rate"
```

**自动回滚条件**：
- 错误率 > 5%
- P95 延迟 > 2 秒
- 健康检查失败
- 关键业务指标异常

---

## Deployment Strategies

### 1. 滚动更新（Rolling Update）

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
      maxSurge: 2        # 最多额外创建 2 个 Pod
      maxUnavailable: 1  # 最多 1 个 Pod 不可用
```

**优点**：
- 零停机部署
- 资源利用率高
- 实现简单

**缺点**：
- 新旧版本共存
- 回滚较慢

---

### 2. 蓝绿部署（Blue-Green）

```
[Blue v1.0]  ← 100% 流量
[Green v1.1] ← 0% 流量

切换后：
[Blue v1.0]  ← 0% 流量（保留用于回滚）
[Green v1.1] ← 100% 流量
```

**优点**：
- 瞬间切换
- 快速回滚
- 充分测试

**缺点**：
- 需要双倍资源
- 数据库迁移复杂

---

### 3. 金丝雀发布（Canary）

```
阶段 1: [v1.0: 95%] [v1.1: 5%]
阶段 2: [v1.0: 75%] [v1.1: 25%]
阶段 3: [v1.0: 50%] [v1.1: 50%]
阶段 4: [v1.0: 0%]  [v1.1: 100%]
```

**优点**：
- 渐进式发布
- 风险可控
- 真实流量验证

**缺点**：
- 实现复杂
- 发布时间长

---

## Pipeline Configuration

### 环境配置

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

### 质量门禁

```yaml
# 部署前必须满足的条件
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

### 1. 版本管理

```bash
# 语义化版本
MAJOR.MINOR.PATCH

# 示例
v1.2.3
  │ │ └─ 补丁版本（bug 修复）
  │ └─── 次版本（新功能，向后兼容）
  └───── 主版本（破坏性变更）
```

### 2. 配置管理

```typescript
// ✅ Good: 配置外部化
const config = {
  database: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info'
}

// ❌ Bad: 硬编码配置
const config = {
  database: 'postgres://localhost:5432/mydb',
  apiKey: 'sk-1234567890'
}
```

### 3. 数据库迁移

```bash
# 向后兼容的迁移策略
# 阶段 1: 添加新列（可为空）
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

# 阶段 2: 部署新代码（同时支持新旧列）
# 阶段 3: 数据迁移
UPDATE users SET email_verified = true WHERE email IS NOT NULL;

# 阶段 4: 添加约束
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

# 阶段 5: 删除旧列（下个版本）
ALTER TABLE users DROP COLUMN old_email_field;
```

### 4. 特性开关

```typescript
// 使用特性开关控制新功能发布
if (featureFlags.isEnabled('new-checkout-flow', user)) {
  return newCheckoutFlow()
} else {
  return legacyCheckoutFlow()
}
```

---

## Command Options

- `--env <staging|production>`：指定部署环境
- `--skip-tests`：跳过测试阶段（仅用于紧急修复）
- `--rollback`：回滚到上一版本
- `--canary`：使用金丝雀发布策略
- `--dry-run`：模拟部署，不实际执行

---

## Success Metrics

- ✅ 部署频率：每天多次
- ✅ 变更前置时间：< 1 小时
- ✅ 变更失败率：< 15%
- ✅ 平均恢复时间（MTTR）：< 1 小时
- ✅ 服务可用性：> 99.9%

---

## References

- Jez Humble & David Farley - *Continuous Delivery*
- Gene Kim - *The DevOps Handbook*
- Nicole Forsgren - *Accelerate*
- Martin Fowler - *Continuous Integration*

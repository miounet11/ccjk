# CCJK 2.0 Cloud Skills System - Backend API Requirements

**版本**: v1.0.0
**创建日期**: 2026-01-23
**目标后端**: api.claudehome.cn
**预计工期**: 6-8 周（后端开发）

---

## 📋 执行摘要

本文档为 CCJK 2.0 Cloud Skills 系统提供了完整的后端 API 需求规范，包括：

### 核心功能模块

1. **Skills Management API** - 技能的上传、下载、更新、删除
2. **Marketplace API** - 技能搜索、发现、推荐、趋势
3. **Analytics API** - 使用统计、性能分析、用户洞察
4. **Community API** - 评分、评论、Fork、社区协作
5. **Sync API** - Delta 同步、冲突解决、版本管理

### 技术栈

- **语言**: Node.js 20+ / TypeScript 5.9+
- **框架**: Express.js / Fastify
- **数据库**: PostgreSQL 16 (主库) + Redis (缓存)
- **搜索引擎**: Elasticsearch 8.x
- **对象存储**: S3 / MinIO
- **认证**: OAuth2 + JWT
- **监控**: Prometheus + Grafana + Sentry

---

## 🚀 快速开始

### API 基础信息

```
Production:  https://api.claudehome.cn/v1
Staging:     https://api-staging.claudehome.cn/v1
Development: https://api-dev.claudehome.cn/v1
```

### 认证方式

```bash
# JWT Token
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API Key
Authorization: ApiKey cjk_sk_xxxxxxxxxxxxx
```

---

## 📡 核心 API 端点

### 1. Skills Management

#### 上传技能
```http
POST /skills
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

#### 获取技能详情
```http
GET /skills/{skillId}
Authorization: Bearer <token> (optional for public)
```

#### 下载技能
```http
GET /skills/{skillId}/download
→ 302 Redirect to presigned S3 URL
```

#### 更新技能
```http
PUT /skills/{skillId}
Authorization: Bearer <token>
```

#### 删除技能
```http
DELETE /skills/{skillId}
Authorization: Bearer <token>
→ 204 No Content
```

---

### 2. Marketplace API

#### 搜索技能
```http
GET /marketplace/skills/search?q=testing&category=testing&min_rating=4
→ 200 OK + search results + facets
```

#### 获取趋势
```http
GET /marketplace/skills/trending?period=7d
→ 200 OK + trending skills
```

#### 获取推荐
```http
GET /marketplace/skills/recommended?algorithm=hybrid
Authorization: Bearer <token>
→ 200 OK + personalized recommendations
```

#### 获取精选
```http
GET /marketplace/skills/featured
→ 200 OK + hero + curated + new
```

---

### 3. Analytics API

#### 记录下载事件
```http
POST /analytics/skills/{skillId}/download
{
  "version": "1.0.0",
  "source": "cli",
  "platform": "macos"
}
```

#### 获取技能分析
```http
GET /analytics/skills/{skillId}?period=30d&granularity=daily
Authorization: Bearer <token>
→ 200 OK + timeseries + breakdown
```

---

### 4. Community API

#### 评分
```http
POST /community/skills/{skillId}/ratings
{
  "rating": 5,
  "comment": "Great skill!"
}
```

#### 发表评论
```http
POST /community/skills/{skillId}/reviews
{
  "title": "Excellent",
  "content": "...",
  "rating": 5
}
```

#### Fork 技能
```http
POST /community/skills/{skillId}/forks
{
  "name": "My Fork",
  "isPublic": false
}
```

---

### 5. Sync API (Delta Updates)

#### 获取同步状态
```http
GET /sync/status
Authorization: Bearer <token>
→ 200 OK + lastSyncAt + pendingUpdates
```

#### 获取增量更新
```http
POST /sync/delta
Authorization: Bearer <token>
{
  "lastSyncAt": "2024-01-23T00:00:00Z",
  "clientState": [...]
}
→ 200 OK + changes + conflicts + deleted
```

#### 解决冲突
```http
POST /sync/resolve-conflict
Authorization: Bearer <token>
{
  "skillId": "abc-123",
  "resolution": "keep_server"
}
```

---

## 🗄️ 数据模型

### 核心表结构

```sql
-- Skills 表
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  version VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  author_id UUID REFERENCES users(id),
  download_count BIGINT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, version, author_id)
);

-- Users 表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ratings 表
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  skill_id UUID REFERENCES skills(id),
  user_id UUID REFERENCES users),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(skill_id, user_id)
);

-- Analytics Events 表（分区表）
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  skill_id UUID REFERENCES skills(id),
  event_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

---

## 🔐 认证授权

### OAuth2 流程

```
用户 → CCJK CLI → GitHub OAuth
                  ↓
             授权回调
                  ↓
         获取 JWT Token
                  ↓
              API 调用
```

### JWT Token 结构

```json
{
  "sub": "user-uuid",
  "iss": "https://api.claudehome.cn",
  "aud": "ccjk-cli",
  "exp": 1704067200,
  "scope": ["read:skills", "write:skills"],
  "role": "user"
}
```

### 权限作用域

| Scope | 描述 |
|-------|------|
| `read:skills` | 读取技能 |
| `write:skills` | 上传/更新技能 |
| `delete:skills` | 删除技能 |
| `read:analytics` | 查看分析 |
| `write:ratings` | 评分/评论 |

---

## 📊 性能目标

### 响应时间（P95）

| 操作 | 目标 |
|------|------|
| GET /skills/{id} | <100ms |
| GET /marketplace/search | <200ms |
| POST /skills | <200ms |
| GET /skills/{id}/download | <300ms |
| GET /analytics/skills/{id} | <300ms |
| POST /sync/delta | <500ms |

### 吞吐量目标

- **峰值 RPS**: 1,000+ 请求/秒
- **日请求量**: 10M+ 请求/天
- **并发连接**: 10,000+ 并发连接

---

## 🔍 搜索与推荐

### 全文搜索语法

| 查询类型 | 语法 | 示例 |
|----------|------|------|
| 简单搜索 | `q=keyword` | `q=testing` |
| 短语搜索 | `q="exact phrase"` | `q="unit testing"` |
| 字段搜索 | `field:value` | `category:code_generation` |
| 布尔 AND | `q=a AND b` | `q=testing AND javascript` |
| 布尔 NOT | `q=a -b` | `q=testing -manual` |

### 推荐算法

1. **协同过滤** - 基于相似用户的下载
2. **基于内容** - 基于技能特征相似度
3. **混合推荐** - 加权组合多种算法

```typescript
// 混合推荐权重
const weights = {
  collaborative: 0.5,  // 50% 协同过滤
  contentBased: 0.3,   // 30% 内容推荐
  trending: 0.2        // 20% 热门趋势
};
```

---

## 💾 缓存策略

### Redis 缓存模式

```
# 技能详情 (TTL: 5 分钟)
skill:details:{skillId} → JSON

# 搜索结果 (TTL: 15 分钟)
search:results:{query_hash} → JSON

# 趋势技能 (TTL: 1 小时)
trending:skills:{category}:{period} → JSON

# 速率限制 (动态 TTL)
rate_limit:{identifier}:{endpoint} → Integer
```

### CDN 缓存

| 内容类型 | TTL | Cache-Control |
|----------|-----|---------------|
| 技能文件 | 30天 | `public, max-age=2592000, immutable` |
| 技能图标 | 7天 | `public, max-age=604800` |
| 技能元数据 | 5分钟 | `public, max-age=300` |
| 搜索结果 | 15分钟 | `public, max-age=900` |
| 趋势技能 | 1小时 | `public, max-age=3600` |

---

## 🚨 速率限制

### 速率层级

| 层级 | 用户 | 请求/分钟 | 请求/小时 | 请求/天 |
|------|------|-----------|-----------|---------|
| Free | 未认证 | 30 | 500 | 5,000 |
| Basic | 已认证 | 60 | 1,000 | 10,000 |
| Pro | 付费用户 | 120 | 2,000 | 25,000 |
| Enterprise | 自定义 | 无限制 | 无限制 | 无限制 |

### 速率限制响应头

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200
```

---

## 📈 监控与日志

### 关键指标

| 指标 | 类型 | 告警阈值 |
|------|------|----------|
| 错误率 | Gauge | >1% |
| 响应时间 P95 | Histogram | >500ms |
| 活跃连接数 | Gauge | >8,000 |
| 缓存命中率 | Gauge | <70% |
| 队列深度 | Gauge | >1,000 |

### 日志格式（JSON）

```json
{
  "timestamp": "2024-01-23T10:30:45.123Z",
  "level": "INFO",
  "message": "Skill uploaded successfully",
  "context": {
    "userId": "user-123",
    "skillId": "skill-abc",
    "fileSize": 1048576
  },
  "request": {
    "id": "req-xyz",
    "method": "POST",
    "path": "/skills"
  }
}
```

---

## 🎯 部署建议

### 环境变量（示例）

```bash
# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/ccjk
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Redis
REDIS_URL=redis://host:6379
REDIS_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=1h

# OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# S3
S3_BUCKET=ccjk-skills
S3_REGION=us-east-1
S3_CDN_DOMAIN=https://cdn.claudehome.cn
```

### Docker 部署

```dockerfile
# 多阶段构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产镜像
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## 📝 错误码参考

### 标准状态码

| 状态码 | 名称 | 用途 |
|--------|------|------|
| 200 | OK | 成功 GET/PATCH |
| 201 | Created | 成功 POST |
| 204 | No Content | 成功 DELETE |
| 400 | Bad Request | 请求参数无效 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 429 | Too Many Requests | 超出速率限制 |
| 500 | Internal Server Error | 服务器错误 |

### 应用错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|-----------|------|
| `SKILL_NOT_FOUND` | 404 | 技能不存在 |
| `SKILL_EXISTS` | 409 | 技能已存在 |
| `INVALID_TOKEN` | 401 | Token 无效 |
| `RATE_LIMIT_EXCEEDED` | 429 | 速率限制 |
| `SYNC_CONFLICT` | 409 | 同步冲突 |

---

## ✅ 实施检查清单

### 第一阶段：核心 API（2周）
- [ ] Skills CRUD API
- [ ] 用户认证（OAuth2 + JWT）
- [ ] 基础速率限制
- [ ] PostgreSQL 数据库设置
- [ ] Redis 缓存设置

### 第二阶段：Marketplace（2周）
- [ ] Elasticsearch 集成
- [ ] 搜索 API
- [ ] 趋势和推荐算法
- [ ] 分类和标签系统

### 第三阶段：Community（1周）
- [ ] 评分和评论系统
- [ ] Fork 功能
- [ ] 用户资料管理

### 第四阶段：Analytics（1周）
- [ ] 事件收集
- [ ] 时间序列聚合
- [ ] 分析仪表板 API

### 第五阶段：Sync（1周）
- [ ] Delta 同步引擎
- [ ] 冲突检测和解决
- [ ] 版本管理

### 第六阶段：生产就绪（1周）
- [ ] 性能优化
- [ ] 负载测试
- [ ] 安全审计
- [ ] 监控设置
- [ ] 文档完善

---

## 📞 支持

如有问题或需要澄清，请联系：
- **项目**: CCJK 2.0
- **文档版本**: v1.0.0
- **最后更新**: 2026-01-23

---

**完整的 API 规范请参考**: `CCJK_2.0_API_REQUIREMENTS_FULL.md`

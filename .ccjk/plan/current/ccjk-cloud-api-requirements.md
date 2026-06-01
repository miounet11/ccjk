# CCJK Cloud API 需求规格说明书

**版本**: v1.0.0
**日期**: 2026-01-24
**目标**: api.claudehome.cn 后端团队
**优先级**: 🔴 高

---

## 项目概述

为 CCJK v8.0.0 的 `/ccjk:all` 命令提供云智能推荐服务，实现基于 AI 的项目分析和资源推荐功能。

---

## 核心功能

### 1. 项目智能分析推荐

**端点**: `POST /api/v1/analyze`

**功能描述**: 接收项目信息，返回智能推荐的 skills、MCP 服务、Agents 和 Hooks。

#### 请求参数

```typescript
interface ProjectAnalysisRequest {
  projectFingerprint: {
    hash: string              // 项目 SHA-256 哈希（唯一标识）
    path?: string            // 项目路径（本地调试用，可选）
    timestamp: number        // 客户端时间戳（毫秒）
  }

  projectInfo: {
    type: 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'mixed'
    frameworks: string[]     // ['react', 'nextjs', 'nuxt', 'express', 'django', 'fastapi']
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'cargo' | 'maven'
    hasTesting: boolean
    testingFramework?: 'jest' | 'vitest' | 'pytest' | 'unittest' | 'go-test'
    hasCI: boolean
    cicdPlatform?: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci'
    buildTools: string[]      // ['webpack', 'vite', 'rollup', 'esbuild', 'turbopack']
    dependencies: Array<{     // 生产依赖（Top 100）
      name: string
      version: string
    }>
    devDependencies?: Array<{
      name: string
      version: string
    }>
  }

  teamMetrics?: {
    contributorCount: number      // 团队规模（从 git log 统计）
    commitFrequency: number      // 提交频率（次/天）
    branchCount: number          // 活跃分支数
  }

  ccjkVersion: string            // CCJK CLI 版本（如 "8.0.0"）
  os: string                     // 操作系统（如 "Darwin 24.0.0"）
  nodeVersion?: string           // Node.js 版本（如 "20.11.0"）
}
```

**请求示例**:
```json
{
  "projectFingerprint": {
    "hash": "a3f2e1b4c9d84e5f8a7b6c5d4e3f2a1b",
    "timestamp": 1737717465000
  },
  "projectInfo": {
    "type": "typescript",
    "frameworks": ["react", "nextjs"],
    "packageManager": "pnpm",
    "hasTesting": true,
    "testingFramework": "vitest",
    "hasCI": true,
    "cicdPlatform": "github-actions",
    "buildTools": ["vite", "turbopack"],
    "dependencies": [
      {"name": "react", "version": "18.3.0"},
      {"name": "next", "version": "14.2.0"}
    ],
    "devDependencies": [
      {"name": "typescript", "version": "5.4.5"},
      {"name": "vitest", "version": "1.6.0"}
    ]
  },
  "teamMetrics": {
    "contributorCount": 5,
    "commitFrequency": 8.5,
    "branchCount": 12
  },
  "ccjkVersion": "8.0.0",
  "os": "Darwin 24.0.0",
  "nodeVersion": "20.11.0"
}
```

#### 响应格式

```typescript
interface ProjectAnalysisResponse {
  status: 'success' | 'error'
  error?: string              // 错误信息（当 status === 'error'）
  requestId: string          // 请求唯一标识（用于追踪）

  analysis: {
    projectComplexity: 'simple' | 'medium' | 'complex'
    recommendations: {
      skills: Recommendation[]
      mcpServices: Recommendation[]
      agents: Recommendation[]
      hooks: Recommendation[]
    }
    confidence: number       // 推荐置信度 (0-100)
    insights: string[]       // AI 生成的洞察建议
  }

  metadata: {
    processedAt: string      // ISO 8601 格式
    processingTime: number   // 处理耗时（毫秒）
    modelVersion: string     // 推荐引擎版本（如 "v1.2.3"）
  }
}

interface Recommendation {
  id: string                 // 唯一资源 ID
  type: 'skill' | 'mcp' | 'agent' | 'hook'
  name: {
    en: string
    'zh-CN': string
  }
  description: {
    en: string
    'zh-CN': string
  }
  priority: 'essential' | 'high' | 'recommended' | 'optional'
  confidence: number         // 单项置信度 (0-100)

  // 推荐理由（多语言）
  reason: {
    en: string
    'zh-CN': string
  }

  // 模板信息
  template: {
    source: 'builtin' | 'cloud' | 'github'
    content?: string         // 内联内容（小模板 < 10KB）
    url?: string            // 外部引用 URL（大模板）
    version: string         // 模板版本
    checksum: string        // SHA-256 校验和
  }

  // 依赖和冲突
  dependencies: string[]    // 依赖的其他资源 ID
  conflicts: string[]       // 冲突的资源 ID

  // 预计提升
  estimatedImprovement?: {
    productivity?: number   // 生产力提升百分比
    performance?: number    // 性能改进百分比
    quality?: number        // 代码质量改进百分比
  }
}
```

**响应示例**:
```json
{
  "status": "success",
  "requestId": "req_2a3b4c5d6e7f8g9h",
  "analysis": {
    "projectComplexity": "medium",
    "recommendations": {
      "skills": [
        {
          "id": "ts-best-practices",
          "type": "skill",
          "name": {
            "en": "TypeScript Best Practices",
            "zh-CN": "TypeScript 最佳实践"
          },
          "description": {
            "en": "TypeScript patterns and type safety guidelines",
            "zh-CN": "TypeScript 模式与类型安全指南"
          },
          "priority": "essential",
          "confidence": 98,
          "reason": {
            "en": "Your project uses TypeScript 5.3+ with strict mode. This skill includes advanced patterns for type inference and generic constraints.",
            "zh-CN": "您的项目使用 TypeScript 5.3+ 严格模式。此技能包含类型推断和泛型约束的高级模式。"
          },
          "template": {
            "source": "builtin",
            "url": "https://api.claudehome.cn/v1/templates/ts-best-practices/1.0.0",
            "version": "1.0.0",
            "checksum": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
          },
          "dependencies": [],
          "conflicts": [],
          "estimatedImprovement": {
            "productivity": 15,
            "quality": 20
          }
        },
        {
          "id": "trpc-best-practices",
          "type": "skill",
          "name": {
            "en": "tRPC Best Practices",
            "zh-CN": "tRPC 最佳实践"
          },
          "description": {
            "en": "tRPC integration patterns and procedure organization",
            "zh-CN": "tRPC 集成模式和流程组织"
          },
          "priority": "high",
          "confidence": 92,
          "reason": {
            "en": "Detected @trpc/client in your dependencies. Adding tRPC-specific patterns can boost productivity by 23%.",
            "zh-CN": "检测到 @trpc/client 依赖。添加 tRPC 特定模式可提升生产力 23%。"
          },
          "template": {
            "source": "cloud",
            "content": "---\nname: trpc-patterns...",
            "version": "2.1.0",
            "checksum": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7"
          },
          "dependencies": ["ts-best-practices"],
          "conflicts": [],
          "estimatedImprovement": {
            "productivity": 23
          }
        }
      ],
      "mcpServices": [...],
      "agents": [...],
      "hooks": [...]
    },
    "confidence": 94,
    "insights": [
      "Your project uses tRPC - adding tRPC-specific skill can boost productivity by 23%",
      "Team size (5-10) suggests using advanced git workflow for better collaboration",
      "Testing coverage appears low based on test file ratio - consider testing-automation-expert"
    ]
  },
  "metadata": {
    "processedAt": "2026-01-24T15:30:45.123Z",
    "processingTime": 234,
    "modelVersion": "v1.2.3"
  }
}
```

**性能要求**:
- 响应时间: < 500ms (p95)
- 可用性: 99.9%
- 支持并发: 1000 QPS

**注意事项**:
- 所有字符串字段需统一使用 UTF-8 编码
- 支持 Gzip/Brotli 压缩（客户端默认启用）
- 需要 CORS 允许所有来源（或至少 `https://claudecode.ai`）
- 需要缓存头: `Cache-Control: public, max-age=3600`（推荐结果可缓存）

---

### 2. 获取单个模板

**端点**: `GET /api/v1/templates/:templateId`

**路径参数**: `templateId: string` - 模板唯一 ID

**查询参数**:
```typescript
interface TemplateRequest {
  version?: string         // 可选版本号（如 "1.0.0", "latest"）
  includeDependencies?: boolean  // 是否包含依赖模板（默认: false）
}
```

**响应格式**:
```typescript
interface TemplateResponse {
  template: {
    id: string
    type: 'skill' | 'mcp' | 'agent' | 'hook'
    version: string
    content: string        // 完整模板内容
    metadata: {
      author: string
      createdAt: string    // ISO 8601
      updatedAt: string    // ISO 8601
      downloads: number    // 累计下载次数
      rating: number       // 评分 (0-5.0)
      tags: string[]
      category?: string    // 可选分类
    }
  }
  dependencies?: TemplateResponse[]  // 递归包含依赖模板
}
```

**响应示例**:
```json
{
  "template": {
    "id": "ts-best-practices",
    "type": "skill",
    "version": "1.0.0",
    "content": "---\nname: ts-best-practices\ndescription: TypeScript patterns and type safety guidelines\nversion: 1.0.0\n...\n",
    "metadata": {
      "author": "ccjk-team",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-22T14:20:00.000Z",
      "downloads": 15234,
      "rating": 4.8,
      "tags": ["typescript", "patterns", "best-practices"],
      "category": "language-patterns"
    }
  }
}
```

**性能要求**:
- 响应时间: < 200ms (p95)
- 使用 CDN 缓存（建议 Cloudflare 或腾讯云 CDN）
- 模板更新频率较低（每周 1-2 次），适合长时间缓存

**注意事项**:
- 大模板（>10KB）建议分开存储在对象存储（如腾讯云 COS）
- content 字段有长度限制（建议 < 1MB），超大模板返回 url 字段代替
- 需要版本控制，支持历史版本查询

---

### 3. 批量获取模板

**端点**: `POST /api/v1/templates/batch`

**功能描述**: 一次性获取多个模板，减少网络请求

#### 请求参数

```typescript
interface BatchTemplateRequest {
  templateIds: string[]     // 模板 ID 列表（最多 50 个）
  includeDependencies?: boolean  // 是否包含依赖（默认: false）
}
```

**请求示例**:
```json
{
  "templateIds": [
    "ts-best-practices",
    "react-patterns",
    "eslint-mcp",
    "ts-architect-agent"
  ],
  "includeDependencies": true
}
```

#### 响应格式

```typescript
interface BatchTemplateResponse {
  templates: Record<string, TemplateResponse>
  missing: string[]         // 不存在的模板 ID
  errors: Record<string, string>  // 错误详情 {templateId: errorMessage}
}
```

**响应示例**:
```json
{
  "templates": {
    "ts-best-practices": {
      "template": { ... }
    },
    "react-patterns": {
      "template": { ... },
      "dependencies": [ ... ]
    },
    "eslint-mcp": {
      "template": { ... }
    }
  },
  "missing": ["ts-architect-agent"],
  "errors": {
    "ts-architect-agent": "Template not found or deprecated"
  }
}
```

**性能要求**:
- 响应时间: < 500ms (p95)
- 批量优化：减少数据库查询次数（使用 `WHERE IN` 或批量查询）

**注意事项**:
- 限制最多 50 个模板（防止请求过大）
- 需要保证事务一致性（全部成功或返回明确错误）

---

### 4. 安装统计上报

**端点**: `POST /api/v1/telemetry/installation`

**功能描述**: 采集安装统计用于优化推荐算法。数据匿名化，符合 GDPR/Privacy Policy。

#### 请求参数

```typescript
interface InstallationTelemetryRequest {
  requestId: string        // 对应 /analyze 的 requestId

  installation: {
    timestamp: number       // 安装开始时间
    duration: number        // 安装耗时（毫秒）
    selectedResources: Array<{
      id: string
      type: string
      version: string
    }>
    skippedResources: string[]  // 用户跳过的资源 ID
    failedResources: Array<{
      id: string
      error: string       // 失败原因
    }>
  }

  clientInfo: {
    ccjkVersion: string
    os: string
    nodeVersion?: string
    cpu?: string
    memory?: number        // 可用内存（MB）
  }

  // 可选的用户反馈
  userFeedback?: {
    satisfaction: number  // 满意度 1-5
    comments?: string
  }

  // 可选的性能指标
  performance?: {
    networkLatency?: number      // 客户端到云服务的延迟
    cacheHit?: boolean          // 是否命中本地缓存
    retryCount?: number         // 重试次数
  }
}
```

**请求示例**:
```json
{
  "requestId": "req_2a3b4c5d6e7f8g9h",
  "installation": {
    "timestamp": 1737717465123,
    "duration": 4123,
    "selectedResources": [
      {"id": "ts-best-practices", "type": "skill", "version": "1.0.0"},
      {"id": "react-patterns", "type": "skill", "version": "2.1.0"},
      {"id": "typescript-language-server", "type": "mcp", "version": "3.0.1"}
    ],
    "skippedResources": ["git-mcp"],
    "failedResources": []
  },
  "clientInfo": {
    "ccjkVersion": "8.0.0",
    "os": "Darwin 24.0.0",
    "nodeVersion": "20.11.0",
    "cpu": "arm64",
    "memory": 16384
  },
  "userFeedback": {
    "satisfaction": 5,
    "comments": "Great recommendations, loved the tRPC pattern!"
  },
  "performance": {
    "networkLatency": 120,
    "cacheHit": false,
    "retryCount": 0
  }
}
```

#### 响应格式

```typescript
interface InstallationTelemetryResponse {
  status: 'success' | 'error'
  messageId: string        // 用于追踪

  insights?: {
    // 基于 AI 分析的后续建议
    nextRecommendations?: string[]
    optimizationTips?: string[]
    comparison?: {          // 与社区对比
      yourSetup: string    // 用户当前配置等级
      topPerformers: string[]  // 顶级 10% 使用的配置
      improvementSuggestions: string[]
    }
  }
}
```

**响应示例**:
```json
{
  "status": "success",
  "messageId": "msg_3b4c5d6e7f8g9h0i",
  "insights": {
    "nextRecommendations": [
      "Consider adding 'security-audit-skill' for production deployment",
      "Team size suggests using 'git-workflow-advanced' in 7 days"
    ],
    "optimizationTips": [
      "You're in the top 10% of optimized CCJK setups for TypeScript + React projects",
      "Adding 'pre-commit-type-check' can reduce bugs by 15%"
    ],
    "comparison": {
      "yourSetup": "Advanced TypeScript + Next.js + tRPC configuration",
      "topPerformers": [
        "typescript-language-server (99% usage)",
        "trpc-best-practices (94% usage in tRPC projects)",
        "testing-library-react (87% usage in teams >=5)"
      ],
      "improvementSuggestions": [
        "Add end-to-end testing with Playwright (75% of top performers use it)"
      ]
    }
  }
}
```

**性能要求**:
- 响应时间: < 100ms (异步处理，快速确认)
- 写入队列：建议先写入消息队列（如 Kafka/RabbitMQ）再异步处理

**注意事项**:
- 所有数据需匿名化，不能包含敏感信息（路径、API keys、源代码）
- 提供 opt-out 选项：用户可以选择不上报（客户端需要判断）
- 数据保留策略：建议 1 年（需符合隐私政策）
- 需要批量插入优化（减少数据库压力）

---

### 5. 健康检查

**端点**: `GET /api/v1/health`

**功能描述**: 服务健康检查，用于客户端判断是否可用

#### 响应格式

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down'
  version: string            // 后端版本
  commit?: string           // Git 提交哈希（可选）
  services: {
    api: 'up' | 'down'
    database: 'up' | 'down'
    recommendationEngine: 'up' | 'down'
    cache: 'up' | 'down'
  }
  latency?: number          // 当前延迟（毫秒）
  uptime?: number          // 运行时间（秒）
}
```

**响应示例**:
```json
{
  "status": "healthy",
  "version": "1.2.3",
  "commit": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q",
  "services": {
    "api": "up",
    "database": "up",
    "recommendationEngine": "up",
    "cache": "up"
  },
  "latency": 45,
  "uptime": 86400
}
```

**注意事项**:
- 必须快速响应（能快速检查所有依赖服务状态）
- 设置 cache-control: `no-cache` 或短时间缓存（30秒）
- 建议部署在云平台负载均衡器直接检查（如腾讯云健康检查）

---

## 数据库设计

### 表结构

请参考规划文档中的 SQL DDL 定义：
- `templates` 表 - 模板存储
- `recommendation_rules` 表 - 规则引擎
- `installation_stats` 表 - 统计数据

详见 `.ccjk/plan/current/ccjk-shortcuts.md` 第 2093-2142 行

**推荐技术栈**:
- 数据库: PostgreSQL 15+ 或 MySQL 8.0+
- 缓存: Redis 6+ (用于模板和推荐结果缓存)
- 全文搜索: Elasticsearch (可选，用于模板搜索)

---

## 安全要求

### 1. 数据隐私
- ✅ 所有数据匿名化
- ✅ 不收集敏感信息（代码、API keys、路径）
- ✅ GDPR 合规
- ✅ 提供用户 opt-out 机制

### 2. API 安全
- ✅ HTTPS + TLS 1.3
- ✅ 速率限制: 100 请求/小时/IP（可调整）
- ✅ 可选: API Key 机制（高配额用户）
- ✅ CORS 配置: 允许 `https://claudecode.ai`

### 3. 内容校验
- ✅ SHA-256 校验和验证
- ✅ 模板内容签名（可选，使用 RSA/ECC）

### 4. 监控和告警
- ✅ 错误率监控（>1% 触发告警）
- ✅ 响应时间监控（p95 > 500ms 告警）
- ✅ 可用性监控（< 99.5% 触发告警）

---

## 性能优化建议

### 1. 缓存策略

```typescript
// 推荐结果缓存（7天）
Cache-Control: public, max-age=604800

// 模板内容缓存（30天）
Cache-Control: public, max-age=2592000
Last-Modified: <template-last-updated>
ETag: "<content-hash>"
```

### 2. CDN 加速
- 使用腾讯云 CDN 或 Cloudflare
- 模板内容预热至全球节点

### 3. 数据库优化
- `templates` 表按 `type` 分区
- `recommendation_rules` 表添加复合索引: `(project_type, framework, priority)`
- `installation_stats` 表按月分区

### 4. 推荐引擎
- 规则引擎（快速）+ ML 模型（精确）混合推荐
- 使用 Redis Bloom Filter 快速判断模板适用性
- 使用 ClickHouse 分析安装趋势

---

## 部署和运维

### 部署要求

- 地域: 中国（首选北京/上海）+ 海外节点（可选）
- 可用性: 99.9%
- 监控: Prometheus + Grafana
- 日志: ELK Stack 或腾讯云 CLS

### 版本管理

- API 版本: `v1`
- 模板版本: 语义化版本 `x.y.z`
- 数据库迁移: 使用 Flyway 或 Liquibase

### 测试要求

- 单元测试覆盖率: ≥ 80%
- 集成测试: 覆盖所有 API 端点
- 压力测试: 1000 QPS 场景
- 混沌测试: 模拟网络分区、服务失败

---

## 交付清单

| 编号 | 任务 | 负责人 | 交付物 | 预计工时 |
|------|------|--------|--------|----------|
| 1 | API 实现 | 后端团队 | 5 个 API 端点 | 40 小时 |
| 2 | 数据库设计 | DBA | 3 张表 + 索引 | 16 小时 |
| 3 | 模板系统 | 后端团队 | 20+ 模板 | 24 小时 |
| 4 | 推荐引擎 | ML 工程师 | 规则引擎 + ML 模型 | 80 小时 |
| 5 | 部署配置 | DevOps | Docker + K8s 配置 | 24 小时 |
| 6 | 测试 | QA | 单元 + 集成 + 压力测试 | 40 小时 |
| 7 | 文档 | 技术写作 | API 文档 + 运维手册 | 24 小时 |

**总计**: 248 小时（约 6 周/1 人）

---

## 技术支持

- CCJK 前端团队联系人: lu@claudehome.cn
- 技术讨论: GitHub Issues (https://github.com/antfu/ccjk/issues)
- 紧急问题: 企业微信/Slack 群（待创建）

---

## 附录

### A. 推荐引擎规则示例

```sql
-- TypeScript 项目基础推荐
INSERT INTO recommendation_rules (
  project_type, framework, template_id, priority, confidence,
  reason_en, reason_zh_cn, conditions
) VALUES (
  'typescript',
  NULL,  -- 任何框架
  'ts-best-practices',
  'essential',
  98,
  'TypeScript projects benefit from best practices and strict typing guidelines',
  'TypeScript 项目能从最佳实践和严格类型指南中受益',
  '{"hasTypescript": true}'
);

-- React + TypeScript 推荐
INSERT INTO recommendation_rules (
  project_type, framework, template_id, priority, confidence,
  reason_en, reason_zh_cn, conditions
) VALUES (
  'typescript',
  'react',
  'react-patterns',
  'high',
  92,
  'React components benefit from standardized patterns and hooks best practices',
  'React 组件能从标准化模式和 hooks 最佳实践中受益',
  '{"hasReact": true, "hasTesting": true}'
);
```

### B. API 错误码定义

```typescript
const ERROR_CODES = {
  200: 'Success',
  201: 'Created',

  400: 'Bad Request (Parameter error)',
  401: 'Unauthorized (API key invalid)',
  403: 'Forbidden (Rate limit exceeded)',
  404: 'Not Found (Template not found)',
  422: 'Validation Error',

  500: 'Internal Server Error',
  502: 'Bad Gateway (Downstream service error)',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',

  429: 'Too Many Requests (Rate limit)'
}
```

---

**文档版本管理**:
- 当前版本: v1.0.0
- 最后更新: 2026-01-24
- 维护者: CCJK 团队

**变更记录**:
```
2026-01-24  v1.0.0  初始版本，提交给后端团队
```

---

**审核确认**:

- [ ] 后端团队已确认需求
- [ ] API 设计已评审通过
- [ ] 数据库设计已确认
- [ ] 部署方案已确定
- [ ] 时间表已排期

后端负责人签字: _______________  日期: ___________

---

**END OF DOCUMENT**

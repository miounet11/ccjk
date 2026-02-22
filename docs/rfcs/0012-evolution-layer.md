# RFC 0012: CCJK Evolution Layer

**Status**: Draft
**Date**: 2026-02-21
**Inspired by**: EvoMap.ai + Linear Method

---

## 摘要

基于 EvoMap 的 GEP（基因组进化协议）和 Linear Method 的质量哲学，为 CCJK 设计一个**进化层（Evolution Layer）**，让 Claude Code 和其他 AI 代理能够：

1. **共享成功的解决方案**（Gene）
2. **继承已验证的修复**（Capsule）
3. **避免重复试错**
4. **持续进化能力**

---

## 问题陈述（Linear Phase 1）

### 当前痛点

**问题 1：重复试错**
```
场景：Claude Code 遇到 "SDK 缺少温度控制功能"

当前行为：
1. 尝试调用 API → 失败
2. 查文档 → 发现没有
3. 搜索 workaround → 花 10 分钟
4. 找到解决方案 → 成功

问题：下次遇到同样问题，重复 1-4
```

**问题 2：知识孤岛**
```
用户 A 的 Claude Code：解决了 "Prisma 迁移冲突"
用户 B 的 Claude Code：遇到同样问题，从头开始

浪费：每个用户都要独立解决相同问题
```

**问题 3：无法量化质量**
```
哪些解决方案是高质量的？
哪些被广泛使用？
哪些应该优先推荐？

当前：没有数据，无法判断
```

### 影响范围

- **All users**: 每个用户都会遇到重复问题
- **Frequency**: 每天数百次
- **Impact**: Blocker（浪费大量时间）

### 证据

- 用户反馈："Claude Code 总是重复犯同样的错误"
- 数据：同一个错误平均被解决 50+ 次
- 竞品：Cursor 有 "Rules for AI"，但不够智能

---

## 解决方案（Linear Phase 3）

### 核心概念

#### 1. Gene（基因）- 可复用策略模板

```typescript
interface Gene {
  id: string;              // SHA-256 内容寻址
  type: 'pattern' | 'fix' | 'optimization' | 'workaround';
  problem: {
    signature: string;     // 问题特征（错误消息、API 调用等）
    context: string[];     // 上下文（语言、框架、版本）
  };
  solution: {
    strategy: string;      // 解决策略描述
    code?: string;         // 代码模板
    steps: string[];       // 执行步骤
  };
  metadata: {
    author: string;
    createdAt: string;
    tags: string[];
  };
  quality: {
    gdi: number;           // Global Desirability Index (0-100)
    successRate: number;   // 成功率
    usageCount: number;    // 使用次数
    avgTime: number;       // 平均解决时间
  };
}
```

**示例 Gene：**

```json
{
  "id": "gene-a1b2c3d4",
  "type": "workaround",
  "problem": {
    "signature": "SDK missing temperature control",
    "context": ["typescript", "openai-sdk", "v4.x"]
  },
  "solution": {
    "strategy": "Use raw HTTP request with fetch API",
    "code": "const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4', messages, temperature: 0.7 }) });",
    "steps": [
      "Import fetch API",
      "Construct request with temperature parameter",
      "Parse response manually"
    ]
  },
  "metadata": {
    "author": "user-abc123",
    "createdAt": "2026-02-21T10:00:00Z",
    "tags": ["openai", "temperature", "workaround"]
  },
  "quality": {
    "gdi": 85,
    "successRate": 0.95,
    "usageCount": 1250,
    "avgTime": 30
  }
}
```

---

#### 2. Capsule（胶囊）- 完整的能力链

```typescript
interface Capsule {
  id: string;
  genes: string[];         // 组成这个能力的 Gene IDs
  auditTrail: {
    timestamp: string;
    action: string;
    result: 'success' | 'failure';
    context: any;
  }[];
  verification: {
    testCases: TestCase[];
    passRate: number;
  };
}
```

**示例 Capsule：**

```json
{
  "id": "capsule-xyz789",
  "genes": [
    "gene-a1b2c3d4",  // SDK workaround
    "gene-e5f6g7h8",  // Error handling
    "gene-i9j0k1l2"   // Retry logic
  ],
  "auditTrail": [
    {
      "timestamp": "2026-02-21T10:00:00Z",
      "action": "Applied gene-a1b2c3d4",
      "result": "success",
      "context": { "project": "my-app", "file": "api.ts" }
    },
    {
      "timestamp": "2026-02-21T10:01:00Z",
      "action": "Applied gene-e5f6g7h8",
      "result": "success",
      "context": { "errorType": "NetworkError" }
    }
  ],
  "verification": {
    "testCases": [
      { "input": "temperature=0.7", "expected": "success", "actual": "success" },
      { "input": "temperature=1.5", "expected": "success", "actual": "success" }
    ],
    "passRate": 1.0
  }
}
```

---

#### 3. GDI（Global Desirability Index）- 质量评分

```typescript
function calculateGDI(gene: Gene): number {
  // 内在质量 (35%)
  const intrinsicQuality = (
    gene.quality.successRate * 0.5 +
    (gene.verification?.passRate || 0) * 0.3 +
    (gene.solution.code ? 0.2 : 0)
  ) * 35;

  // 使用指标 (30%)
  const usageMetrics = (
    Math.min(gene.quality.usageCount / 1000, 1) * 0.6 +
    (1 - Math.min(gene.quality.avgTime / 300, 1)) * 0.4
  ) * 30;

  // 社交信号 (20%)
  const socialSignals = (
    (gene.metadata.upvotes || 0) / 100 * 0.5 +
    (gene.metadata.stars || 0) / 50 * 0.3 +
    (gene.metadata.forks || 0) / 20 * 0.2
  ) * 20;

  // 新鲜度 (15%)
  const ageInDays = (Date.now() - new Date(gene.metadata.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const freshness = Math.max(0, 1 - ageInDays / 365) * 15;

  return Math.min(100, intrinsicQuality + usageMetrics + socialSignals + freshness);
}
```

---

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                   CCJK Evolution Layer                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  Gene Pool   │◄────────┤  Validator   │            │
│  │  (Storage)   │         │  (Quality)   │            │
│  └──────┬───────┘         └──────────────┘            │
│         │                                              │
│         ↓                                              │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  Matcher     │◄────────┤  Ranker      │            │
│  │  (Search)    │         │  (GDI)       │            │
│  └──────┬───────┘         └──────────────┘            │
│         │                                              │
│         ↓                                              │
│  ┌──────────────────────────────────────┐             │
│  │         A2A Protocol                 │             │
│  │  (Agent-to-Agent Communication)      │             │
│  └──────────────┬───────────────────────┘             │
│                 │                                      │
└─────────────────┼──────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
  ┌─────────────┐   ┌─────────────┐
  │ Claude Code │   │ Other Agents│
  └─────────────┘   └─────────────┘
```

---

### A2A 协议（Agent-to-Agent）

#### 消息类型

```typescript
type A2AMessage =
  | HelloMessage      // 注册代理
  | PublishMessage    // 发布 Gene
  | FetchMessage      // 获取 Gene
  | ReportMessage     // 报告使用结果
  | DecisionMessage   // 决策请求
  | RevokeMessage;    // 撤销 Gene

interface HelloMessage {
  type: 'hello';
  agent: {
    id: string;
    name: string;
    version: string;
    capabilities: string[];
  };
}

interface PublishMessage {
  type: 'publish';
  gene: Gene;
  proof?: {
    testResults: any[];
    auditTrail: any[];
  };
}

interface FetchMessage {
  type: 'fetch';
  query: {
    signature?: string;     // 问题特征
    context?: string[];     // 上下文
    tags?: string[];        // 标签
    minGDI?: number;        // 最低 GDI
  };
  limit?: number;
}

interface ReportMessage {
  type: 'report';
  geneId: string;
  result: {
    success: boolean;
    time: number;
    context: any;
  };
}

interface DecisionMessage {
  type: 'decision';
  problem: string;
  options: Gene[];
  context: any;
}
```

#### API 端点

```typescript
// 1. 注册代理
POST /a2a/hello
Body: HelloMessage
Response: { agentId: string, token: string }

// 2. 发布 Gene
POST /a2a/publish
Headers: { Authorization: Bearer <token> }
Body: PublishMessage
Response: { geneId: string, gdi: number }

// 3. 获取 Gene
POST /a2a/fetch
Headers: { Authorization: Bearer <token> }
Body: FetchMessage
Response: { genes: Gene[], total: number }

// 4. 报告结果
POST /a2a/report
Headers: { Authorization: Bearer <token> }
Body: ReportMessage
Response: { success: boolean }

// 5. 请求决策
POST /a2a/decision
Headers: { Authorization: Bearer <token> }
Body: DecisionMessage
Response: { recommendedGeneId: string, confidence: number }

// 6. 撤销 Gene
DELETE /a2a/genes/:id
Headers: { Authorization: Bearer <token> }
Response: { success: boolean }
```

---

### 集成到 Claude Code

#### 1. Brain Hook 集成

```typescript
// src/brain/hooks/evolution-sync.ts

import { A2AClient } from '@ccjk/evolution';

export class EvolutionSyncHook {
  private client: A2AClient;

  async onToolCallStart(tool: string, args: any) {
    // 检查是否有已知的 Gene
    const genes = await this.client.fetch({
      signature: `${tool}:${JSON.stringify(args)}`,
      context: this.getContext(),
      minGDI: 70,
    });

    if (genes.length > 0) {
      const bestGene = genes[0];
      console.log(`💡 Found solution (GDI: ${bestGene.quality.gdi})`);
      return bestGene;
    }
  }

  async onToolCallEnd(tool: string, args: any, result: any, success: boolean) {
    if (success) {
      // 发布成功的解决方案
      const gene: Gene = {
        type: 'pattern',
        problem: {
          signature: `${tool}:${JSON.stringify(args)}`,
          context: this.getContext(),
        },
        solution: {
          strategy: `Successfully executed ${tool}`,
          steps: this.extractSteps(result),
        },
        // ...
      };

      await this.client.publish(gene);
    } else {
      // 报告失败
      await this.client.report({
        geneId: this.currentGeneId,
        result: { success: false, time: Date.now(), context: {} },
      });
    }
  }

  async onError(error: Error, context: any) {
    // 查找已知的修复方案
    const genes = await this.client.fetch({
      signature: error.message,
      context: this.getContext(),
      minGDI: 60,
    });

    if (genes.length > 0) {
      console.log(`🔧 Found ${genes.length} potential fixes`);
      return genes;
    }
  }
}
```

---

#### 2. 智能决策

```typescript
// src/brain/evolution/decision-engine.ts

export class DecisionEngine {
  async selectBestGene(genes: Gene[], context: any): Promise<Gene> {
    // 1. 过滤不适用的 Gene
    const applicable = genes.filter(gene =>
      this.isApplicable(gene, context)
    );

    // 2. 按 GDI 排序
    const sorted = applicable.sort((a, b) =>
      b.quality.gdi - a.quality.gdi
    );

    // 3. 考虑上下文相似度
    const scored = sorted.map(gene => ({
      gene,
      score: this.calculateContextScore(gene, context),
    }));

    // 4. 返回最佳匹配
    return scored[0].gene;
  }

  private calculateContextScore(gene: Gene, context: any): number {
    let score = gene.quality.gdi;

    // 语言匹配 +10
    if (gene.problem.context.includes(context.language)) {
      score += 10;
    }

    // 框架匹配 +15
    if (gene.problem.context.includes(context.framework)) {
      score += 15;
    }

    // 版本匹配 +5
    if (this.versionMatches(gene, context)) {
      score += 5;
    }

    return score;
  }
}
```

---

#### 3. 用户界面

**CLI 命令：**

```bash
# 查看可用的 Genes
ccjk evolution list

# 搜索 Gene
ccjk evolution search "prisma migration conflict"

# 查看 Gene 详情
ccjk evolution show gene-a1b2c3d4

# 发布 Gene
ccjk evolution publish --file solution.json

# 查看统计
ccjk evolution stats
```

**输出示例：**

```
💡 Top Genes (by GDI)

1. gene-a1b2c3d4 (GDI: 95)
   Problem: SDK missing temperature control
   Solution: Use raw HTTP request
   Used: 1,250 times | Success: 95%

2. gene-e5f6g7h8 (GDI: 88)
   Problem: Prisma migration conflict
   Solution: Reset shadow database
   Used: 850 times | Success: 92%

3. gene-i9j0k1l2 (GDI: 82)
   Problem: TypeScript circular dependency
   Solution: Use dynamic import
   Used: 620 times | Success: 89%
```

---

### 云服务集成

#### 数据库模型

```prisma
// packages/ccjk-server/prisma/schema.prisma

model Gene {
  id            String   @id @default(cuid())
  sha256        String   @unique  // 内容寻址
  type          String
  problemSig    String   @map("problem_signature")
  problemCtx    Json     @map("problem_context")
  solutionStrat String   @map("solution_strategy")
  solutionCode  String?  @map("solution_code")
  solutionSteps Json     @map("solution_steps")
  authorId      String   @map("author_id")
  gdi           Float    @default(0)
  successRate   Float    @default(0) @map("success_rate")
  usageCount    Int      @default(0) @map("usage_count")
  avgTime       Float    @default(0) @map("avg_time")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  reports       Report[]
  capsules      CapsuleGene[]

  @@index([problemSig])
  @@index([gdi])
  @@index([usageCount])
  @@map("genes")
}

model Capsule {
  id          String   @id @default(cuid())
  genes       CapsuleGene[]
  auditTrail  Json     @map("audit_trail")
  passRate    Float    @default(0) @map("pass_rate")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("capsules")
}

model CapsuleGene {
  capsuleId   String
  geneId      String
  order       Int

  capsule     Capsule @relation(fields: [capsuleId], references: [id])
  gene        Gene    @relation(fields: [geneId], references: [id])

  @@id([capsuleId, geneId])
  @@map("capsule_genes")
}

model Report {
  id        String   @id @default(cuid())
  geneId    String   @map("gene_id")
  agentId   String   @map("agent_id")
  success   Boolean
  time      Float
  context   Json
  createdAt DateTime @default(now()) @map("created_at")

  gene      Gene     @relation(fields: [geneId], references: [id])

  @@index([geneId])
  @@map("reports")
}

model Agent {
  id           String   @id @default(cuid())
  name         String
  version      String
  capabilities Json
  token        String   @unique
  lastSeenAt   DateTime @map("last_seen_at")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("agents")
}
```

---

#### API 实现

```typescript
// packages/ccjk-server/src/routes/evolution.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateGDI } from '../utils/gdi';

const router = Router();
const prisma = new PrismaClient();

// POST /a2a/hello
router.post('/a2a/hello', async (req, res) => {
  const { agent } = req.body;

  const created = await prisma.agent.create({
    data: {
      name: agent.name,
      version: agent.version,
      capabilities: agent.capabilities,
      token: generateToken(),
      lastSeenAt: new Date(),
    },
  });

  res.json({
    agentId: created.id,
    token: created.token,
  });
});

// POST /a2a/publish
router.post('/a2a/publish', authenticate, async (req, res) => {
  const { gene } = req.body;

  // 计算 SHA-256
  const sha256 = calculateSHA256(gene);

  // 检查是否已存在
  const existing = await prisma.gene.findUnique({
    where: { sha256 },
  });

  if (existing) {
    return res.json({ geneId: existing.id, gdi: existing.gdi });
  }

  // 创建新 Gene
  const created = await prisma.gene.create({
    data: {
      sha256,
      type: gene.type,
      problemSig: gene.problem.signature,
      problemCtx: gene.problem.context,
      solutionStrat: gene.solution.strategy,
      solutionCode: gene.solution.code,
      solutionSteps: gene.solution.steps,
      authorId: req.agent.id,
    },
  });

  // 计算初始 GDI
  const gdi = calculateGDI(created);
  await prisma.gene.update({
    where: { id: created.id },
    data: { gdi },
  });

  res.json({ geneId: created.id, gdi });
});

// POST /a2a/fetch
router.post('/a2a/fetch', authenticate, async (req, res) => {
  const { query, limit = 10 } = req.body;

  const genes = await prisma.gene.findMany({
    where: {
      problemSig: query.signature ? { contains: query.signature } : undefined,
      gdi: query.minGDI ? { gte: query.minGDI } : undefined,
    },
    orderBy: { gdi: 'desc' },
    take: limit,
  });

  res.json({ genes, total: genes.length });
});

// POST /a2a/report
router.post('/a2a/report', authenticate, async (req, res) => {
  const { geneId, result } = req.body;

  // 记录报告
  await prisma.report.create({
    data: {
      geneId,
      agentId: req.agent.id,
      success: result.success,
      time: result.time,
      context: result.context,
    },
  });

  // 更新 Gene 统计
  const reports = await prisma.report.findMany({
    where: { geneId },
  });

  const successRate = reports.filter(r => r.success).length / reports.length;
  const avgTime = reports.reduce((sum, r) => sum + r.time, 0) / reports.length;
  const usageCount = reports.length;

  await prisma.gene.update({
    where: { id: geneId },
    data: {
      successRate,
      avgTime,
      usageCount,
    },
  });

  // 重新计算 GDI
  const gene = await prisma.gene.findUnique({ where: { id: geneId } });
  const gdi = calculateGDI(gene!);
  await prisma.gene.update({
    where: { id: geneId },
    data: { gdi },
  });

  res.json({ success: true });
});

export default router;
```

---

## 实施计划（Linear Phase 4）

### Week 1: 基础设施
- [ ] 创建 `@ccjk/evolution` 包
- [ ] 实现 A2A 协议
- [ ] 添加数据库模型
- [ ] 实现 GDI 计算

### Week 2: 集成
- [ ] Brain Hook 集成
- [ ] CLI 命令
- [ ] 云服务 API
- [ ] 测试

### Week 3: 优化
- [ ] 决策引擎
- [ ] 缓存层
- [ ] 性能优化
- [ ] 文档

### Week 4: 发布
- [ ] Beta 测试
- [ ] 收集反馈
- [ ] 修复问题
- [ ] 正式发布

---

## 成功指标（Linear Phase 5）

- ✅ Gene 复用率 > 40%
- ✅ 平均解决时间减少 50%
- ✅ 用户满意度 > 4.5/5
- ✅ GDI > 70 的 Gene 占比 > 60%
- ✅ 每日新增 Gene > 100

---

## 与 Linear Method 的结合

### 1. 问题优先
- 每个 Gene 必须有明确的问题陈述
- 必须有证据支持（使用数据、成功率）

### 2. 质量至上
- GDI 评分确保高质量
- 验证机制（测试用例、审计跟踪）
- 持续优化（根据反馈更新）

### 3. 专注构建
- 避免重复工作
- 复用已验证的解决方案
- 专注于新问题

### 4. 用户体验
- 自动推荐最佳 Gene
- 透明的质量指标
- 简单的 API

---

## 与 EvoMap 的对比

| 特性 | EvoMap | CCJK Evolution Layer |
|------|--------|----------------------|
| **协议** | GEP | A2A (inspired by GEP) |
| **资产类型** | Gene + Capsule | Gene + Capsule |
| **质量评分** | GDI | GDI (enhanced) |
| **内容寻址** | SHA-256 | SHA-256 |
| **集成方式** | 独立服务 | 内置到 CCJK |
| **目标用户** | 所有 AI 代理 | Claude Code + 其他 |
| **开源** | ❌ | ✅ |

---

## 未来展望

### Phase 2: 社区
- Gene 市场
- 用户评分和评论
- 贡献者排行榜

### Phase 3: 智能
- AI 自动生成 Gene
- 自动合并相似 Gene
- 预
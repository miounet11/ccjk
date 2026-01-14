# Feature Plan: Skills 云端优化 & 动态推荐插件系统

## 📋 Overview

### Feature Objective
1. **Skills 云端优化服务** - 允许用户上传 skills 到云端进行优化，或使用本地 Claude Code 进行优化
2. **动态推荐插件系统** - 将菜单中的推荐插件从硬编码改为云端动态配置

### Expected Value
- 提升用户 skills 质量，通过 AI 优化 prompt 和最佳实践
- 实现推荐插件的灵活运营，支持 A/B 测试和版本差异化推荐
- 建立用户 skills 生态系统，促进社区分享

### Impact Scope
- 前端：`src/commands/menu.ts`, `src/skills/`, `src/utils/skill-md/`
- 后端：需要新增 API 服务
- 云服务：`api.claudehome.cn` 或 `api.api.claudehome.cn`

---

## 🎯 Feature Breakdown

### Part 1: 动态推荐插件系统

- [ ] **1.1 后端 API 设计与实现**
  - [ ] 设计 `/plugins/recommendations` API 端点
  - [ ] 实现版本兼容性过滤
  - [ ] 实现平台过滤 (darwin/win32/linux)
  - [ ] 实现多语言支持

- [ ] **1.2 前端集成**
  - [ ] 创建 `PluginRecommendationsManager` 类
  - [ ] 实现本地缓存机制 (TTL 24h)
  - [ ] 实现离线降级方案
  - [ ] 修改 `printRecommendedPluginsSection()` 函数

- [ ] **1.3 类型定义**
  - [ ] 创建 `src/types/plugin-recommendations.ts`
  - [ ] 创建默认配置 `src/config/default-plugin-recommendations.ts`

### Part 2: Skills 云端优化服务

- [ ] **2.1 Skills 上传功能**
  - [ ] 实现 `npx ccjk skill upload` 命令
  - [ ] 支持隐私级别 (public/team/private)
  - [ ] 实现端到端加密 (私有 skills)

- [ ] **2.2 用户绑定系统**
  - [ ] 设计用户身份识别机制
  - [ ] 实现 skill-user 绑定关系
  - [ ] 支持团队共享

- [ ] **2.3 云端优化 API**
  - [ ] 设计优化请求/响应格式
  - [ ] 实现 AI 优化流程
  - [ ] 返回优化建议和改进版本

- [ ] **2.4 本地优化方案 (备选)**
  - [ ] 设计本地优化 prompt
  - [ ] 集成 Claude Code 进行本地优化
  - [ ] 实现自动化优化流程

### Part 3: 借鉴 makepad-skills 的改进

- [ ] **3.1 自我进化 Skill**
  - [ ] 创建 `ccjk-evolution` skill
  - [ ] 实现模式捕获和建议

- [ ] **3.2 学习路径系统**
  - [ ] 添加 `difficulty` 和 `learningPath` 字段
  - [ ] 实现技能推荐引擎

---

## 📐 Technical Approach

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                    CCJK Cloud Services                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Plugin Registry  │  │ Skills Service   │                │
│  │ /plugins/*       │  │ /skills/*        │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │ HTTPS
                       │
┌──────────────────────┼──────────────────────────────────────┐
│                 CCJK CLI Client                              │
├──────────────────────┼──────────────────────────────────────┤
│  ┌───────────────────┴───────────────────┐                  │
│  │         Cache Layer (~/.ccjk/cache)   │                  │
│  │  • plugin-recommendations.json        │                  │
│  │  • skills-registry.json               │                  │
│  └───────────────────────────────────────┘                  │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Plugin Manager  │  │ Skills Manager  │                   │
│  │ (Dynamic Menu)  │  │ (Upload/Sync)   │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Models

#### 1. Plugin Recommendation

```typescript
interface PluginRecommendation {
  id: string                    // 'ccr', 'ccusage', etc.
  name: string                  // Display name
  displayName: LocalizedString  // { 'zh-CN': '...', 'en': '...' }
  description: LocalizedString
  shortcut: string              // Menu shortcut key
  priority: number              // 0-100, higher = first
  command: string               // CCJK command
  category: string              // 'proxy', 'analytics', etc.
  minVersion: string | null     // Minimum CCJK version
  maxVersion: string | null     // Maximum CCJK version
  platforms: Platform[]         // ['darwin', 'win32', 'linux']
  featured: boolean             // Featured plugin
  metadata: {
    homepage: string
    repository: string
    version: string
    downloads: number
  }
}
```

#### 2. Skill Cloud Sync

```typescript
interface SkillBinding {
  id: string
  userId: string
  skillId: string
  cloudSkillId?: string
  bindingType: 'user' | 'team' | 'organization'
  permissions: {
    read: boolean
    write: boolean
    share: boolean
    delete: boolean
  }
  syncSettings: {
    autoSync: boolean
    syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual'
    conflictResolution: 'local-wins' | 'cloud-wins' | 'manual'
  }
}
```

### API Design

#### Plugin Recommendations API

```http
GET /api/v1/plugins/recommendations
  ?version=3.4.3
  &locale=zh-CN
  &platform=darwin

Response:
{
  "version": "1.0.0",
  "timestamp": "2026-01-10T08:30:00Z",
  "ttl": 86400,
  "plugins": [...],
  "categories": [...]
}
```

#### Skills Cloud API

```http
# Upload skill
POST /api/v1/skills
Authorization: Bearer <token>
Content-Type: application/json
{
  "skill": { ... },
  "privacy": "private",
  "tags": ["typescript", "testing"]
}

# Optimize skill
POST /api/v1/skills/:id/optimize
Authorization: Bearer <token>
{
  "optimizationType": "prompt" | "structure" | "full",
  "targetAudience": "beginner" | "intermediate" | "advanced"
}

Response:
{
  "original": { ... },
  "optimized": { ... },
  "suggestions": [
    { "type": "prompt", "description": "...", "before": "...", "after": "..." }
  ],
  "score": {
    "before": 72,
    "after": 91
  }
}
```

### Caching Strategy

```typescript
// Cache configuration
const CACHE_CONFIG = {
  pluginRecommendations: {
    ttl: 86400,           // 24 hours
    location: '~/.ccjk/cache/plugin-recommendations.json',
    fallback: 'builtin'   // Use built-in defaults if cache miss
  },
  skillsRegistry: {
    ttl: 3600,            // 1 hour
    location: '~/.ccjk/cache/skills-registry.json',
    fallback: 'local'     // Use local skills only
  }
}

// Fallback chain
// 1. Valid cache → Use cached data
// 2. Expired cache → Use expired data + show warning
// 3. No cache → Use built-in defaults
```

---

## ✅ Acceptance Criteria

### Functional Acceptance

1. **动态推荐插件**
   - [ ] 菜单显示从云端获取的推荐插件列表
   - [ ] 支持按 CCJK 版本过滤插件
   - [ ] 支持按平台过滤插件
   - [ ] 离线时使用本地缓存或默认配置
   - [ ] 缓存 24 小时自动过期

2. **Skills 上传**
   - [ ] `npx ccjk skill upload` 命令可用
   - [ ] 支持 public/team/private 隐私级别
   - [ ] 私有 skills 端到端加密

3. **Skills 优化**
   - [ ] 云端优化 API 返回优化建议
   - [ ] 本地优化使用 Claude Code 执行
   - [ ] 显示优化前后对比

4. **用户绑定**
   - [ ] 用户可以绑定/解绑 skills
   - [ ] 支持跨设备同步
   - [ ] 支持团队共享

### Performance Metrics

- API 响应时间 < 500ms
- 缓存命中率 > 90%
- 离线降级时间 < 100ms

### Test Coverage

- 单元测试覆盖率 > 80%
- 集成测试覆盖主要流程
- E2E 测试覆盖用户场景

---

## ⏱️ Implementation Plan

### Phase 1: 动态推荐插件 (Week 1-2)

| Task | Priority | Estimate |
|------|----------|----------|
| 后端 API 设计文档 | P0 | 1d |
| 后端 API 实现 | P0 | 3d |
| 前端 PluginRecommendationsManager | P0 | 2d |
| 缓存和降级逻辑 | P0 | 1d |
| 菜单集成 | P0 | 1d |
| 测试和文档 | P1 | 2d |

### Phase 2: Skills 云端基础 (Week 3-4)

| Task | Priority | Estimate |
|------|----------|----------|
| 用户认证系统 | P0 | 2d |
| Skills 上传 API | P0 | 2d |
| 前端上传命令 | P0 | 2d |
| 用户绑定系统 | P1 | 2d |
| 加密实现 | P1 | 2d |

### Phase 3: Skills 优化服务 (Week 5-6)

| Task | Priority | Estimate |
|------|----------|----------|
| 云端优化 API | P0 | 3d |
| 本地优化集成 | P1 | 2d |
| 优化结果展示 | P1 | 2d |
| 团队共享功能 | P2 | 3d |

### Phase 4: 高级功能 (Week 7-8)

| Task | Priority | Estimate |
|------|----------|----------|
| 自我进化 Skill | P2 | 3d |
| 学习路径系统 | P2 | 2d |
| 分析和统计 | P2 | 2d |
| 性能优化 | P1 | 3d |

---

## 📎 Appendix

### A. Makepad-Skills 参考价值分析

| 设计模式 | 参考价值 | CCJK 应用 |
|---------|---------|----------|
| Directory-per-skill | HIGH | CCJK SKILL.md 已采用 |
| Self-evolution skill | VERY HIGH | 建议实现 ccjk-evolution |
| Progressive disclosure | MEDIUM | 添加 difficulty/learningPath |
| Domain-specific collections | HIGH | 扩展批量模板 |

### B. 后端 API 文档 (发送给后端团队)

详见 Agent 生成的完整 API 设计文档，包含：
- 端点定义
- 请求/响应格式
- 数据模型
- 错误处理
- 认证方式

### C. 本地优化 Prompt 模板

```markdown
# Skill Optimization Request

## Original Skill
{skill_content}

## Optimization Goals
1. Improve prompt clarity and specificity
2. Add best practices and examples
3. Enhance trigger conditions
4. Optimize for target audience: {audience}

## Output Format
Provide:
1. Optimized skill content
2. List of changes with explanations
3. Quality score (before/after)
```

---

## 🔗 Related Resources

- [Makepad-Skills Project](https://github.com/ZhangHanDong/makepad-skills)
- [CCJK Skills System](./src/skills/)
- [CCJK SKILL.md System](./src/utils/skill-md/)
- [CCJK Marketplace](./src/utils/marketplace/)

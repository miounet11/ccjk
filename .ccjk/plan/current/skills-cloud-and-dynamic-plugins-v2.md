# Feature Plan: 多维度配置云端同步系统 (Multi-Dimensional Cloud Sync)

> **Version**: v2.0 - 扩展版
> **Updated**: 2026-01-10
> **Status**: Planning

## 📋 Overview

### Feature Objective

构建一个**多位一体**的云端配置同步系统，实现 CCJK 所有核心配置的云端管理：

| 配置类型 | 文件/目录 | 同步价值 | 优先级 |
|---------|----------|---------|-------|
| **Skills** | `~/.ccjk/skills/` | 技能复用、社区共享 | P0 |
| **CLAUDE.md** | 项目级 `CLAUDE.md` | 最佳实践共享、团队协作 | P0 |
| **Agents** | `.claude/agents/*.md` | Agent 定义共享、版本管理 | P1 |
| **Hooks** | `.claude/hooks/*` | 自动化规则同步 | P1 |
| **动态推荐插件** | 云端配置 | 灵活运营、A/B 测试 | P0 |

### Expected Value

1. **跨设备同步** - 在任何设备上获得一致的 CCJK 体验
2. **团队协作** - 团队成员共享最佳实践配置
3. **社区生态** - 公开分享优质配置，促进社区发展
4. **版本管理** - 配置历史追踪，支持回滚
5. **AI 优化** - 云端 AI 优化配置质量

### Impact Scope

```
┌─────────────────────────────────────────────────────────────────┐
│                    CCJK Cloud Sync Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Skills   │ │CLAUDE.md │ │ Agents   │ │ Hooks    │           │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                   │
│       └────────────┴────────────┴────────────┘                   │
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              │  Unified Sync API   │                            │
│              │  /api/v1/sync/*     │                            │
│              └──────────┬──────────┘                            │
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              │  Plugin Registry    │                            │
│              │  /api/v1/plugins/*  │                            │
│              └─────────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                      CCJK CLI Client                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              CloudSyncManager (统一入口)                  │    │
│  │  • SkillsSyncAdapter                                     │    │
│  │  • ClaudeMdSyncAdapter                                   │    │
│  │  • AgentsSyncAdapter                                     │    │
│  │  • HooksSyncAdapter                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Local Cache Layer (~/.ccjk/cache/)          │    │
│  │  • skills-registry.json                                  │    │
│  │  • claude-md-registry.json                               │    │
│  │  • agents-registry.json                                  │    │
│  │  • hooks-registry.json                                   │    │
│  │  • plugin-recommendations.json                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Feature Breakdown

### Part 1: 动态推荐插件系统 (Week 1-2)

- [ ] **1.1 后端 API 设计与实现**
  - [ ] 设计 `GET /api/v1/plugins/recommendations` 端点
  - [ ] 实现版本兼容性过滤 (minVersion/maxVersion)
  - [ ] 实现平台过滤 (darwin/win32/linux)
  - [ ] 实现多语言支持 (zh-CN/en)

- [ ] **1.2 前端集成**
  - [ ] 创建 `PluginRecommendationsManager` 类
  - [ ] 实现本地缓存机制 (TTL 24h)
  - [ ] 实现三级降级方案 (有效缓存 → 过期缓存 → 内置默认)
  - [ ] 修改 `printRecommendedPluginsSection()` 函数

### Part 2: Skills 云端同步 (Week 3-4)

- [ ] **2.1 Skills 上传功能**
  - [ ] 实现 `npx ccjk skill upload [skill-name]` 命令
  - [ ] 支持隐私级别 (public/team/private)
  - [ ] 实现端到端加密 (私有 skills, AES-256-GCM)
  - [ ] 支持批量上传 `npx ccjk skill upload --all`

- [ ] **2.2 Skills 下载与同步**
  - [ ] 实现 `npx ccjk skill pull [skill-id]` 命令
  - [ ] 实现 `npx ccjk skill sync` 双向同步
  - [ ] 冲突解决策略 (local-wins/cloud-wins/manual)

- [ ] **2.3 Skills 优化服务**
  - [ ] 云端 AI 优化 API
  - [ ] 本地 Claude Code 优化集成
  - [ ] 优化前后对比展示

### Part 3: CLAUDE.md 云端同步 (Week 5-6) 🆕

- [ ] **3.1 CLAUDE.md 上传**
  - [ ] 实现 `npx ccjk claude-md upload` 命令
  - [ ] 支持项目级和全局级 CLAUDE.md
  - [ ] 自动提取元数据 (项目名、版本、技术栈)
  - [ ] 支持标签分类 (typescript, react, backend, etc.)

- [ ] **3.2 CLAUDE.md 模板市场**
  - [ ] 实现 `npx ccjk claude-md browse` 浏览公开模板
  - [ ] 实现 `npx ccjk claude-md pull [template-id]` 下载模板
  - [ ] 支持模板评分和评论
  - [ ] 热门模板推荐

- [ ] **3.3 CLAUDE.md 智能合并**
  - [ ] 设计智能合并算法
  - [ ] 保留用户自定义部分
  - [ ] 更新通用最佳实践部分
  - [ ] 冲突标记和手动解决

### Part 4: Agents 云端同步 (Week 7-8) 🆕

- [ ] **4.1 Agents 上传与版本管理**
  - [ ] 实现 `npx ccjk agent upload [agent-name]` 命令
  - [ ] 支持 Agent 版本控制 (v1, v2, ...)
  - [ ] 自动解析 Agent frontmatter 元数据
  - [ ] 支持依赖声明 (依赖其他 Agents)

- [ ] **4.2 Agents 市场**
  - [ ] 实现 `npx ccjk agent browse` 浏览公开 Agents
  - [ ] 按领域分类 (frontend, backend, devops, security, etc.)
  - [ ] 实现 `npx ccjk agent install [agent-id]` 安装
  - [ ] 支持 Agent 组合包 (Agent Bundles)

- [ ] **4.3 Agents 团队共享**
  - [ ] 团队 Agent 库
  - [ ] 权限管理 (read/write/admin)
  - [ ] 变更通知

### Part 5: Hooks 云端同步 (Week 9-10) 🆕

- [ ] **5.1 Hooks 上传**
  - [ ] 实现 `npx ccjk hook upload [hook-name]` 命令
  - [ ] 自动检测 Hook 类型和触发条件
  - [ ] 安全审核 (防止恶意代码)
  - [ ] 支持 TypeScript 和 Shell 脚本

- [ ] **5.2 Hooks 市场**
  - [ ] 实现 `npx ccjk hook browse` 浏览公开 Hooks
  - [ ] 按功能分类 (linting, formatting, testing, notification)
  - [ ] 实现 `npx ccjk hook install [hook-id]` 安装
  - [ ] 依赖自动安装

- [ ] **5.3 Hooks 配置同步**
  - [ ] 同步 `.claude/settings.json` 中的 hooks 配置
  - [ ] 支持 Hook 启用/禁用状态同步
  - [ ] 支持 Hook 优先级配置同步

### Part 6: 统一同步服务 (Week 11-12) 🆕

- [ ] **6.1 统一同步命令**
  - [ ] 实现 `npx ccjk sync` 一键同步所有配置
  - [ ] 实现 `npx ccjk sync --type=skills,agents` 选择性同步
  - [ ] 实现 `npx ccjk sync status` 查看同步状态

- [ ] **6.2 自动同步**
  - [ ] 配置自动同步频率 (realtime/hourly/daily/manual)
  - [ ] 后台同步服务
  - [ ] 同步冲突通知

- [ ] **6.3 备份与恢复**
  - [ ] 实现 `npx ccjk backup` 完整备份
  - [ ] 实现 `npx ccjk restore [backup-id]` 恢复
  - [ ] 云端备份历史管理

---

## 📐 Technical Approach

### Unified Data Models

#### 1. 通用同步项接口

```typescript
/**
 * Base interface for all syncable items
 */
interface SyncableItem {
  id: string                      // Unique identifier
  type: SyncItemType              // 'skill' | 'claude-md' | 'agent' | 'hook'
  name: string                    // Display name
  version: string                 // Semantic version
  checksum: string                // Content hash for change detection

  // Metadata
  metadata: {
    author: string
    description?: string
    tags: string[]
    createdAt: Date
    updatedAt: Date
  }

  // Privacy & Sharing
  privacy: 'public' | 'team' | 'private'
  teamId?: string

  // Sync state
  syncState: {
    localVersion: string
    cloudVersion: string
    lastSyncedAt: Date
    status: 'synced' | 'local-ahead' | 'cloud-ahead' | 'conflict'
  }
}

type SyncItemType = 'skill' | 'claude-md' | 'agent' | 'hook'
```

#### 2. CLAUDE.md 特定模型

```typescript
interface ClaudeMdItem extends SyncableItem {
  type: 'claude-md'

  // CLAUDE.md specific
  scope: 'project' | 'global'
  projectInfo?: {
    name: string
    techStack: string[]
    framework?: string
  }

  // Content sections (for smart merge)
  sections: {
    overview: string
    architecture: string
    modules: string
    guidelines: string
    custom: string[]  // User-defined sections
  }

  // Template info
  templateId?: string
  templateVersion?: string
}
```

#### 3. Agent 特定模型

```typescript
interface AgentItem extends SyncableItem {
  type: 'agent'

  // Agent frontmatter
  frontmatter: {
    name: string
    description: string
    model: 'opus' | 'sonnet' | 'haiku'
    allowedTools?: string[]
    forbiddenActions?: string[]
  }

  // Agent content
  content: string

  // Dependencies
  dependencies?: string[]  // Other agent IDs

  // Category
  category: 'frontend' | 'backend' | 'devops' | 'security' | 'testing' | 'other'
}
```

#### 4. Hook 特定模型

```typescript
interface HookItem extends SyncableItem {
  type: 'hook'

  // Hook configuration
  hookType: HookType  // From existing types.ts
  trigger: string     // e.g., 'post-tool-use', 'pre-commit'

  // Script info
  scriptType: 'typescript' | 'shell' | 'python'
  scriptPath: string
  scriptContent: string

  // Security
  securityReview: {
    status: 'pending' | 'approved' | 'rejected'
    reviewedAt?: Date
    reviewedBy?: string
  }

  // Runtime requirements
  requirements?: {
    tools: string[]      // e.g., ['eslint', 'prettier']
    nodeVersion?: string
  }
}
```

### Unified Sync API

```http
# ============================================
# Authentication
# ============================================

POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

# ============================================
# Unified Sync Endpoints
# ============================================

# Get sync status for all items
GET /api/v1/sync/status
  ?types=skill,claude-md,agent,hook

# Sync all items (bidirectional)
POST /api/v1/sync
  {
    "types": ["skill", "claude-md", "agent", "hook"],
    "strategy": "auto" | "local-wins" | "cloud-wins",
    "items": [...]
  }

# Get sync conflicts
GET /api/v1/sync/conflicts

# Resolve conflict
POST /api/v1/sync/conflicts/:id/resolve
  {
    "resolution": "local" | "cloud" | "merge",
    "mergedContent": "..."  // If resolution is "merge"
  }

# ============================================
# Skills Endpoints
# ============================================

GET    /api/v1/skills                    # List user's skills
POST   /api/v1/skills                    # Upload skill
GET    /api/v1/skills/:id                # Get skill details
PUT    /api/v1/skills/:id                # Update skill
DELETE /api/v1/skills/:id                # Delete skill
POST   /api/v1/skills/:id/optimize       # AI optimize skill
GET    /api/v1/skills/public             # Browse public skills
GET    /api/v1/skills/team/:teamId       # Team skills

# ============================================
# CLAUDE.md Endpoints
# ============================================

GET    /api/v1/claude-md                 # List user's CLAUDE.md files
POST   /api/v1/claude-md                 # Upload CLAUDE.md
GET    /api/v1/claude-md/:id             # Get CLAUDE.md details
PUT    /api/v1/claude-md/:id             # Update CLAUDE.md
DELETE /api/v1/claude-md/:id             # Delete CLAUDE.md
GET    /api/v1/claude-md/templates       # Browse templates
POST   /api/v1/claude-md/:id/merge       # Smart merge with template

# ============================================
# Agents Endpoints
# ============================================

GET    /api/v1/agents                    # List user's agents
POST   /api/v1/agents                    # Upload agent
GET    /api/v1/agents/:id                # Get agent details
PUT    /api/v1/agents/:id                # Update agent
DELETE /api/v1/agents/:id                # Delete agent
GET    /api/v1/agents/:id/versions       # Get version history
GET    /api/v1/agents/public             # Browse public agents
GET    /api/v1/agents/bundles            # Agent bundles

# ============================================
# Hooks Endpoints
# ============================================

GET    /api/v1/hooks                     # List user's hooks
POST   /api/v1/hooks                     # Upload hook
GET    /api/v1/hooks/:id                 # Get hook details
PUT    /api/v1/hooks/:id                 # Update hook
DELETE /api/v1/hooks/:id                 # Delete hook
GET    /api/v1/hooks/public              # Browse public hooks
POST   /api/v1/hooks/:id/review          # Submit for security review

# ============================================
# Plugin Recommendations (existing)
# ============================================

GET /api/v1/plugins/recommendations
  ?version=3.4.3
  &locale=zh-CN
  &platform=darwin

# ============================================
# Backup & Restore
# ============================================

POST   /api/v1/backup                    # Create full backup
GET    /api/v1/backup                    # List backups
GET    /api/v1/backup/:id                # Get backup details
POST   /api/v1/backup/:id/restore        # Restore from backup
DELETE /api/v1/backup/:id                # Delete backup
```

### CLI Commands Structure

```bash
# ============================================
# Unified Sync Commands
# ============================================

npx ccjk sync                           # Sync all
npx ccjk sync --type=skills,agents      # Sync specific types
npx ccjk sync status                    # View sync status
npx ccjk sync conflicts                 # View conflicts
npx ccjk sync resolve <conflict-id>     # Resolve conflict

# ============================================
# Skills Commands (existing + enhanced)
# ============================================

npx ccjk skill list                     # List local skills
npx ccjk skill upload <name>            # Upload skill
npx ccjk skill upload --all             # Upload all skills
npx ccjk skill pull <id>                # Download skill
npx ccjk skill optimize <name>          # Optimize skill
npx ccjk skill browse                   # Browse public skills

# ============================================
# CLAUDE.md Commands (new)
# ============================================

npx ccjk claude-md upload               # Upload current project's CLAUDE.md
npx ccjk claude-md upload --global      # Upload global CLAUDE.md
npx ccjk claude-md pull <id>            # Download CLAUDE.md template
npx ccjk claude-md browse               # Browse templates
npx ccjk claude-md merge <template-id>  # Smart merge with template

# ============================================
# Agents Commands (new)
# ============================================

npx ccjk agent list                     # List local agents
npx ccjk agent upload <name>            # Upload agent
npx ccjk agent upload --all             # Upload all agents
npx ccjk agent pull <id>                # Download agent
npx ccjk agent install <id>             # Install from market
npx ccjk agent browse                   # Browse public agents
npx ccjk agent bundle install <id>      # Install agent bundle

# ============================================
# Hooks Commands (new)
# ============================================

npx ccjk hook list                      # List local hooks
npx ccjk hook upload <name>             # Upload hook
npx ccjk hook pull <id>                 # Download hook
npx ccjk hook install <id>              # Install from market
npx ccjk hook browse                    # Browse public hooks
npx ccjk hook enable <name>             # Enable hook
npx ccjk hook disable <name>            # Disable hook

# ============================================
# Backup Commands (new)
# ============================================

npx ccjk backup                         # Create full backup
npx ccjk backup list                    # List backups
npx ccjk backup restore <id>            # Restore from backup
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Authentication Layer                                     │
│     ├── JWT Token (access + refresh)                        │
│     ├── Device fingerprint                                  │
│     └── Rate limiting                                       │
│                                                              │
│  2. Authorization Layer                                      │
│     ├── Role-based access (owner/team-admin/team-member)    │
│     ├── Resource-level permissions                          │
│     └── Team membership validation                          │
│                                                              │
│  3. Encryption Layer                                         │
│     ├── TLS 1.3 for transport                               │
│     ├── AES-256-GCM for private items                       │
│     └── Client-side key derivation (PBKDF2)                 │
│                                                              │
│  4. Hook Security Layer (Special)                            │
│     ├── Static code analysis                                │
│     ├── Sandbox execution for testing                       │
│     ├── Manual review for public hooks                      │
│     └── Signature verification                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Acceptance Criteria

### Functional Acceptance

#### Phase 1: 动态推荐插件
- [ ] 菜单显示从云端获取的推荐插件列表
- [ ] 支持按 CCJK 版本、平台、语言过滤
- [ ] 离线时使用本地缓存或默认配置
- [ ] 缓存 24 小时自动过期

#### Phase 2: Skills 云端同步
- [ ] `npx ccjk skill upload/pull/sync` 命令可用
- [ ] 支持 public/team/private 隐私级别
- [ ] 私有 skills 端到端加密
- [ ] 云端 AI 优化功能可用

#### Phase 3: CLAUDE.md 云端同步
- [ ] `npx ccjk claude-md upload/pull/browse` 命令可用
- [ ] 智能合并保留用户自定义部分
- [ ] 模板市场可浏览和下载

#### Phase 4: Agents 云端同步
- [ ] `npx ccjk agent upload/pull/install` 命令可用
- [ ] 版本管理功能可用
- [ ] Agent 市场可浏览和安装

#### Phase 5: Hooks 云端同步
- [ ] `npx ccjk hook upload/pull/install` 命令可用
- [ ] 安全审核流程完整
- [ ] Hook 启用/禁用状态同步

#### Phase 6: 统一同步
- [ ] `npx ccjk sync` 一键同步所有配置
- [ ] 冲突检测和解决机制完整
- [ ] 备份和恢复功能可用

### Performance Metrics

| 指标 | 目标值 |
|------|-------|
| API 响应时间 | < 500ms |
| 缓存命中率 | > 90% |
| 离线降级时间 | < 100ms |
| 同步延迟 | < 2s |
| 加密/解密时间 | < 100ms |

### Test Coverage

- 单元测试覆盖率 > 80%
- 集成测试覆盖主要流程
- E2E 测试覆盖用户场景
- 安全测试覆盖加密和权限

---

## ⏱️ Implementation Plan

### Timeline Overview

```
Week 1-2:   Phase 1 - 动态推荐插件
Week 3-4:   Phase 2 - Skills 云端同步
Week 5-6:   Phase 3 - CLAUDE.md 云端同步
Week 7-8:   Phase 4 - Agents 云端同步
Week 9-10:  Phase 5 - Hooks 云端同步
Week 11-12: Phase 6 - 统一同步服务
```

### Detailed Task Breakdown

#### Phase 1: 动态推荐插件 (Week 1-2)

| Task | Priority | Estimate | Owner |
|------|----------|----------|-------|
| 后端 API 设计文档 | P0 | 1d | Backend |
| 后端 API 实现 | P0 | 3d | Backend |
| 前端 PluginRecommendationsManager | P0 | 2d | Frontend |
| 缓存和降级逻辑 | P0 | 1d | Frontend |
| 菜单集成 | P0 | 1d | Frontend |
| 测试和文档 | P1 | 2d | QA |

#### Phase 2: Skills 云端同步 (Week 3-4)

| Task | Priority | Estimate | Owner |
|------|----------|----------|-------|
| 用户认证系统 | P0 | 2d | Backend |
| Skills CRUD API | P0 | 2d | Backend |
| 前端上传/下载命令 | P0 | 2d | Frontend |
| 端到端加密实现 | P1 | 2d | Security |
| AI 优化 API | P1 | 2d | Backend |

#### Phase 3: CLAUDE.md 云端同步 (Week 5-6)

| Task | Priority | Estimate | Owner |
|------|----------|----------|-------|
| CLAUDE.md 解析器 | P0 | 2d | Frontend |
| CRUD API | P0 | 2d | Backend |
| 智能合并算法 | P1 | 3d | Frontend |
| 模板市场 UI | P1 | 2d | Frontend |
| 测试 | P1 | 1d | QA |

#### Phase 4: Agents 云端同步 (Week 7-8)

| Task | Priority | Estimate | Owner |
|------|----------|----------|-------|
| Agent frontmatter 解析 | P0 | 1d | Frontend |
| CRUD API | P0 | 2d | Backend |
| 版本管理系统 | P1 | 2d | Backend |
| Agent 市场 | P1 | 3d | Full Stack |
| Agent Bundles | P2 | 2d | Full Stack |

#### Phase 5: Hooks 云端同步 (Week 9-10)

| Task | Priority | Estimate | Owner |
|------|----------|----------|-------|
| Hook 解析和打包 | P0 | 2d | Frontend |
| CRUD API | P0 | 2d | Backend |
| 安全审核系统 | P0 | 3d | Security |
| Hook 市场 | P1 | 2d | Full Stack |
| 依赖自动安装 | P2 | 1d | Frontend |

#### Phase 6: 统一同步服务 (Week 11-12)

| Task | Priority | Estimate | Owner |
|------|----------|----------|-------|
| CloudSyncManager 实现 | P0 | 3d | Frontend |
| 冲突检测和解决 | P0 | 2d | Frontend |
| 备份/恢复系统 | P1 | 2d | Full Stack |
| 自动同步服务 | P2 | 2d | Frontend |
| 性能优化 | P1 | 1d | Full Stack |

---

## 📝 Iteration History

### v2 - 2026-01-10
- 扩展为多维度配置同步系统
- 新增 CLAUDE.md 云端同步
- 新增 Agents 云端同步
- 新增 Hooks 云端同步
- 新增统一同步服务
- 新增备份/恢复功能
- 更新时间线为 12 周

### v1 - 2026-01-10
- 初始版本
- Skills 云端优化
- 动态推荐插件系统

---

## 🔗 Related Resources

- [CCJK Skills System](../../src/skills/)
- [CCJK Hooks System](../../src/utils/hooks/)
- [CCJK Agents](../../.claude/agents/)
- [CCJK CLAUDE.md](../../CLAUDE.md)
- [Makepad-Skills Reference](https://github.com/ZhangHanDong/makepad-skills)

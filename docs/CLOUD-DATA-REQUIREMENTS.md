# CCJK Cloud API Data Requirements

**Version**: 1.0
**Date**: 2026-01-24
**Status**: Critical
**Priority**: P0 (Blocking)

---

## 🎯 问题概述

当前 CCJK Cloud API (`https://api.claudehome.cn/api/v8/`) **仅返回 workflow 类型的推荐**，导致以下功能无法正常工作：

| 命令 | 需求的 Category | 当前状态 |
|------|---------------|----------|
| `ccjk:skills` | `workflow` | ✅ **正常** |
| `ccjk:mcp` | `mcp` | ❌ **无数据** |
| `ccjk:agents` | `agent` | ❌ **无数据** |
| `ccjk:hooks` | `tool` | ❌ **无数据** |

---

## 📊 当前 API 响应

### **现有响应** (仅包含 workflow)

```json
{
  "requestId": "req_1769254215967_ydlnjq7",
  "recommendations": [
    {
      "id": "generic-git-workflow",
      "category": "workflow",
      "name": {
        "en": "Git Workflow",
        "zh-CN": "Git 工作流"
      },
      "relevanceScore": 0.6
    }
  ],
  "projectType": "unknown",
  "frameworks": [],
  "meta": {
    "language": "en",
    "apiVersion": "8.0.0",
    "processingTime": 3
  }
}
```

### **问题**:
- ❌ 缺少 `category: 'mcp'` 推荐
- ❌ 缺少 `category: 'agent'` 推荐
- ❌ 缺少 `category: 'tool'` 推荐（hooks）

---

## 🎯 需求规格

### 1. MCP 服务推荐数据

**Category**: `mcp`

**推荐格式**:
```json
{
  "recommendations": [
    {
      "id": "git-mcp",
      "category": "mcp",
      "name": {
        "en": "Git MCP",
        "zh-CN": "Git MCP 服务"
      },
      "description": {
        "en": "Git repository operations through MCP protocol",
        "zh-CN": "通过 MCP 协议操作 Git 仓库"
      },
      "relevanceScore": 0.7,
      "config": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-git"],
        "env": {}
      }
    }
  ]
}
```

**必需的 MCP 推荐项**:

| ID | Name (en) | Name (zh-CN) | 适用条件 |
|----|------------|--------------|----------|
| `git-mcp` | Git MCP | Git MCP 服务 | 所有项目 |
| `filesystem-mcp` | Filesystem MCP | 文件系统 MCP | 所有项目 |
| `database-mcp` | Database MCP | 数据库 MCP | 有数据库的项目 |
| `docker-mcp` | Docker MCP | Docker MCP | 有 Dockerfile |
| `kubernetes-mcp` | Kubernetes MCP | K8s MCP | K8s 项目 |

---

### 2. AI Agent 推荐数据

**Category**: `agent`

**推荐格式**:
```json
{
  "recommendations": [
    {
      "id": "fullstack-developer",
      "category": "agent",
      "name": {
        "en": "Fullstack Developer",
        "zh-CN": "全栈开发助手"
      },
      "description": {
        "en": "Expert in both frontend and backend development",
        "zh-CN": "前端和后端开发专家"
      },
      "relevanceScore": 0.8,
      "config": {
        "model": "claude-sonnet-4",
        "systemPrompt": "You are...",
        "temperature": 0.7
      }
    }
  ]
}
```

**必需的 Agent 推荐项**:

| ID | Name (en) | Name (zh-CN) | 适用条件 |
|----|------------|--------------|----------|
| `fullstack-developer` | Fullstack Developer | 全栈开发助手 | TypeScript/JavaScript 项目 |
| `python-expert` | Python Expert | Python 专家 | Python 项目 |
| `go-expert` | Go Expert | Go 专家 | Go 项目 |
| `rust-specialist` | Rust Specialist | Rust 专家 | Rust 项目 |
| `react-specialist` | React Specialist | React 专家 | React 项目 |
| `testing-automation` | Testing Automation | 测试自动化专家 | 所有项目 |
| `typescript-architect` | TypeScript Architect | TypeScript 架构师 | TypeScript 项目 |

---

### 3. Hooks 推荐数据

**Category**: `tool`

**推荐格式**:
```json
{
  "recommendations": [
    {
      "id": "pre-commit-eslint",
      "category": "tool",
      "name": {
        "en": "ESLint Pre-commit Hook",
        "zh-CN": "ESLint 预提交 Hook"
      },
      "description": {
        "en": "Run ESLint before committing",
        "zh-CN": "提交前运行 ESLint"
      },
      "relevanceScore": 0.65,
      "config": {
        "hookType": "pre-commit",
        "script": "npm run lint",
        "pattern": "**/*.{js,ts}"
      }
    }
  ]
}
```

**必需的 Hook 推荐项**:

| ID | Name (en) | Name (zh-CN) | 适用条件 |
|----|------------|--------------|----------|
| `pre-commit-eslint` | ESLint Pre-commit Hook | ESLint 预提交 Hook | 有 ESLint 配置 |
| `pre-commit-prettier` | Prettier Pre-commit Hook | Prettier 预提交 Hook | 有 Prettier 配置 |
| `pre-commit-type-check` | Type Check Pre-commit Hook | 类型检查预提交 Hook | TypeScript 项目 |
| `pre-commit-gofmt` | Go Format Pre-commit Hook | Go 格式化预提交 Hook | Go 项目 |
| `git-workflow-hooks` | Git Workflow Hooks | Git 工作流 Hooks | 所有 Git 项目 |
| `post-test-coverage` | Test Coverage Hook | 测试覆盖率 Hook | 有测试的项目 |

---

## 📋 推荐策略

### **按项目类型推荐**

| 项目类型 | Skills (workflow) | MCP (mcp) | Agents (agent) | Hooks (tool) |
|---------|-----------------|------------|---------------|---------------|
| **TypeScript** | TS Best Practices, React Patterns | filesystem, git | typescript-architect, react-specialist | eslint, prettier, type-check |
| **JavaScript** | JS Patterns, React Patterns | filesystem, git | fullstack-developer, react-specialist | eslint, prettier |
| **Python** | Python PEP8, Django Patterns | filesystem, database-mcp | python-expert | python-format, lint |
| **Go** | Go Idioms | filesystem, git-mcp | go-expert | gofmt, go-test |
| **Rust** | Rust Patterns | filesystem | rust-specialist | clippy, cargo-test |
| **Java** | Java Patterns | filesystem, database-mcp | testing-automation | checkstyle |
| **Unknown** | Git Workflow | git-mcp, filesystem | fullstack-developer | git-workflow-hooks |

### **通用推荐** (适用于所有项目)

**Always Recommend**:
```json
{
  "skills": ["git-workflow"],
  "mcp": ["git-mcp", "filesystem-mcp"],
  "agents": ["fullstack-developer"],
  "hooks": ["git-workflow-hooks"]
}
```

---

## 🔧 API 实现要求

### **1. 增强项目分析端点**

**端点**: `POST /api/v8/analysis/projects`

**当前响应**:
```json
{
  "recommendations": [
    {
      "id": "generic-git-workflow",
      "category": "workflow",
      "name": { "en": "Git Workflow", "zh-CN": "Git 工作流" },
      "relevanceScore": 0.6
    }
  ]
}
```

**期望响应** (完整版本):
```json
{
  "requestId": "req_xxx",
  "recommendations": [
    // Skills (workflow)
    {
      "id": "git-workflow",
      "category": "workflow",
      "name": { "en": "Git Workflow", "zh-CN": "Git 工作流" },
      "relevanceScore": 0.6
    },
    // MCP services
    {
      "id": "git-mcp",
      "category": "mcp",
      "name": { "en": "Git MCP", "zh-CN": "Git MCP 服务" },
      "description": { "en": "Git operations through MCP", "zh-CN": "通过 MCP 操作 Git" },
      "relevanceScore": 0.7,
      "config": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-git"] }
    },
    {
      "id": "filesystem-mcp",
      "category": "mcp",
      "name": { "en": "Filesystem MCP", "zh-CN": "文件系统 MCP" },
      "description": { "en": "Local file operations", "zh-CN": "本地文件操作" },
      "relevanceScore": 0.8,
      "config": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"] }
    },
    // Agents
    {
      "id": "fullstack-developer",
      "category": "agent",
      "name": { "en": "Fullstack Developer", "zh-CN": "全栈开发助手" },
      "description": { "en": "Expert in frontend and backend", "zh-CN": "前端和后端专家" },
      "relevanceScore": 0.75,
      "config": { "model": "claude-sonnet-4", "temperature": 0.7 }
    },
    // Hooks
    {
      "id": "git-workflow-hooks",
      "category": "tool",
      "name": { "en": "Git Workflow Hooks", "zh-CN": "Git 工作流 Hooks" },
      "description": { "en": "Automated git workflow hooks", "zh-CN": "自动化 Git 工作流钩子" },
      "relevanceScore": 0.5,
      "config": { "hookType": "pre-commit", "script": "npx ccjk:hooks install git-workflow-hooks" }
    }
  ],
  "projectType": "unknown",
  "frameworks": [],
  "meta": {
    "language": "en",
    "apiVersion": "8.0.0",
    "processingTime": 5
  }
}
```

### **2. 数据库表结构建议**

**表**: `recommendations`

```sql
CREATE TABLE recommendations (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(20) NOT NULL, -- 'workflow', 'mcp', 'agent', 'tool'
  name_en VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_zh TEXT,
  relevance_score DECIMAL(3,2),
  config JSON,
  tags JSON,
  project_types JSON,  -- ['typescript', 'python', 'unknown']
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recommendations_category ON recommendations(category);
CREATE INDEX idx_recommendations_project_types ON recommendations(project_types);
```

---

## 🎯 优先级

### **P0 - 立即实施** (1-2天)

**必须包含的推荐**:

#### **通用推荐** (适用于所有项目):
- Skills: `git-workflow`
- MCP: `git-mcp`, `filesystem-mcp`
- Agents: `fullstack-developer`
- Hooks: `git-workflow-hooks`

#### **TypeScript 项目**:
- Skills: `ts-best-practices`, `react-patterns`
- MCP: `typescript-mcp`, `eslint-mcp`
- Agents: `typescript-architect`, `react-specialist`
- Hooks: `pre-commit-eslint`, `pre-commit-prettier`

#### **Python 项目**:
- Skills: `python-pep8`, `django-patterns`
- MCP: `python-mcp`, `database-mcp`
- Agents: `python-expert`
- Hooks: `python-format`, `lint`

---

### **P1 - 高优先级** (3-5天)

**扩展推荐**:

#### **更多 MCP 服务**:
- `docker-mcp`
- `kubernetes-mcp`
- `github-mcp`
- `jira-mcp`
- `slack-mcp`

#### **更多 Agents**:
- `testing-automation`
- `security-auditor`
- `code-reviewer`
- `performance-optimizer`

#### **更多 Hooks**:
- `post-test-coverage`
- `pre-push-validate`
- `commit-message-lint`

---

### **P2 - 中优先级** (1周)

**项目特定推荐**:
- Go: Go-specific agents, gofmt hooks
- Rust: Clippy hooks, cargo-test hooks
- Java: Checkstyle hooks
- .NET: dotnet-format hooks

---

## 📝 实现检查清单

### **数据完整性**

- [ ] 所有 4 个 category 都有数据
- [ ] 通用推荐（适用于 unknown 项目）完整
- [ ] 每种项目类型都有对应推荐
- [ ] 推荐包含完整的 name (en + zh-CN)
- [ ] 推荐包含 description
- [ ] 推荐包含 relevanceScore

### **API 兼容性**

- [ ] `/api/v8/analysis/projects` 返回所有 4 个 category
- [ ] 响应格式符合现有客户端期望
- [ ] 处理 unknown 项目类型
- [ ] 返回 requestId 用于调试

### **测试验证**

- [ ] 测试 TypeScript 项目推荐
- [ ] 测试 Python 项目推荐
- [ ] 测试 Go 项目推荐
- [ ] 测试 unknown 项目推荐
- [ ] 验证所有 4 个 category 都能正常工作

---

## 🔍 测试用例

### **测试 1: Unknown 项目请求**

**请求**:
```json
{
  "projectRoot": "/test/unknown",
  "language": "en",
  "ccjkVersion": "8.1.1"
}
```

**预期响应** (包含所有 4 个 category):
```json
{
  "recommendations": [
    { "category": "workflow", "id": "git-workflow" },
    { "category": "mcp", "id": "git-mcp" },
    { "category": "mcp", "id": "filesystem-mcp" },
    { "category": "agent", "id": "fullstack-developer" },
    { "category": "tool", "id": "git-workflow-hooks" }
  ]
}
```

### **测试 2: TypeScript 项目请求**

**请求**:
```json
{
  "projectRoot": "/test/ts-app",
  "language": "en",
  "ccjkVersion": "8.1.1",
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

**预期响应**: 返回 TypeScript 特定的推荐（含 TS、React 相关）

---

## 🚀 实施建议

### **阶段 1: 核心数据** (1天)

**添加通用推荐** (适用于所有项目):
```sql
INSERT INTO recommendations (id, category, name_en, name_zh, relevance_score, tags)
VALUES
  -- Skills
  ('git-workflow', 'workflow', 'Git Workflow', 'Git 工作流', 0.6, '["git", "workflow"]'),

  -- MCP
  ('git-mcp', 'mcp', 'Git MCP', 'Git MCP 服务', 0.7, '["git", "version-control"]'),
  ('filesystem-mcp', 'mcp', 'Filesystem MCP', '文件系统 MCP', 0.8, '["filesystem", "local"]'),

  -- Agents
  ('fullstack-developer', 'agent', 'Fullstack Developer', '全栈开发助手', 0.75, '["fullstack", "development"]'),

  -- Hooks
  ('git-workflow-hooks', 'tool', 'Git Workflow Hooks', 'Git 工作流 Hooks', 0.5, '["git", "automation"]');
```

### **阶段 2: 分类推荐** (2-3天)

**按项目类型添加特定推荐**:
- TypeScript 项目: TS 最佳实践、React 模式
- Python 项目: PEP8、Django 模式
- Go 项目: Go 惯用法、标准库
- Rust 项目: Rust 模式、Clippy
- Java/.NET 项目: 相应工具和模式

### **阶段 3: 高级推荐** (5-7天)

- 项目特定推荐（Docker、K8s）
- 高级 Agent（安全审计、性能优化）
- CI/CD 集成 hooks
- IDE 配置推荐

---

## 📊 成功指标

| 指标 | 目标 | 当前 |
|------|------|------|
| Skills 推荐数 | ≥ 5 (unknown 项目) | 1 ✅ |
| MCP 推荐数 | ≥ 2 (unknown 项目) | 0 ❌ |
| Agents 推荐数 | ≥ 1 (unknown 项目) | 0 ❌ |
| Hooks 推荐数 | ≥ 1 (unknown 项目) | 0 ❌ |
| 项目类型覆盖 | ≥ 6 种 | 1 (unknown) ⚠️ |

---

## 🔗 相关文件

**客户端代码**:
- `src/commands/ccjk-skills.ts` - 使用 `category: 'workflow'`
- `src/commands/ccjk-mcp.ts` - 需要 `category: 'mcp'`
- `src/commands/ccjk-agents.ts` - 需要 `category: 'agent'`
- `src/commands/ccjk-hooks.ts` - 需要 `category: 'tool'`

**API 文档**:
- `docs/API-REQUIREMENTS.md` - 完整 API 需求文档

---

## ✅ 验证标准

发布后，客户端应该能正常运行：

```bash
npx ccjk@latest
# 1. ☁️ 云驱动智能设置 - 应该成功安装所有类型
# 3. 📚 安装技能 - 应该显示推荐的技能
# 4. 🔌 配置 MCP - 应该显示推荐的 MCP 服务
# 5. 🤖 创建代理 - 应该显示推荐的代理
# 6. 🪝 配置 Hooks - 应该显示推荐的 Hooks
```

**不再出现的错误**:
- ❌ `noSkillsFound` (当 API 返回数据时)
- ❌ `Failed to get cloud recommendations: client.getRecommendations is not a function`
- ❌ `Found 0 recommended agents`
- ❌ `Agent templates directory not found`

---

**优先级**: 🔴 **P0 - Critical (Blocking)**

这个数据缺失导致 **3 个核心功能完全无法工作**（MCP、Agents、Hooks）。

**建议**: 立即实施 P0 通用推荐，确保基本功能可用。

---

**文档维护**: 本文档应在数据补充后更新为 "已完成" 状态。

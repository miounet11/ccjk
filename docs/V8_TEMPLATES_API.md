# CCJK Cloud v8 Templates API 客户端对接文档

> **Base URL**: `https://api.claudehome.cn`
> **API Version**: v8
> **Last Updated**: 2026-01-25

---

## 📋 目录

1. [概述](#概述)
2. [模板类型](#模板类型)
3. [API 端点](#api-端点)
4. [数据结构](#数据结构)
5. [分类说明](#分类说明)
6. [客户端集成示例](#客户端集成示例)
7. [错误处理](#错误处理)

---

## 概述

v8 Templates API 提供统一的模板管理接口，包含以下四种类型：

| 类型 | 数量 | 说明 |
|------|------|------|
| **Agent** | 56 | AI 专业代理（含 19 个专业技能代理） |
| **MCP** | 50 | MCP 服务器（含 16 个官方 MCP） |
| **Skill** | 36 | 技能命令（含 22 个增强技能） |
| **Hook** | 41 | 开发钩子（含 23 个增强钩子） |
| **总计** | **183** | |

### 认证方式

Templates API 为公开接口，无需认证即可访问。

---

## 模板类型

### 1. Agent（AI 代理）

专业技能代理，提供特定领域的 AI 辅助能力。

**专业代理分类：**

| 分类 | 代理 |
|------|------|
| `frontend` | React Specialist, Vue Specialist, TypeScript Architect, Tailwind CSS Specialist |
| `backend` | Node.js Architect, Python Expert, Go Specialist, Rust Expert |
| `ai-ml` | LLM Integration Specialist, ML Pipeline Engineer |
| `devops` | Kubernetes Expert, Terraform Architect, CI/CD Engineer |
| `database` | PostgreSQL Expert, MongoDB Specialist, Redis Expert |
| `security` | Security Auditor, Auth Specialist |
| `testing` | Testing Specialist |
| `code-quality` | Code Review Agent |
| `documentation` | Documentation Agent |
| `debugging` | Bug Hunter Agent |
| `refactoring` | Refactoring Agent |
| `performance` | Performance Optimizer Agent |
| `api-design` | API Design Agent |

### 2. MCP（Model Context Protocol 服务）

MCP 服务器，提供 Claude 与外部工具的集成能力。

**官方 MCP 服务：**

| 服务 | 分类 | 说明 |
|------|------|------|
| Filesystem MCP Server | `core` | 文件系统操作 |
| GitHub MCP Server | `development` | GitHub API 集成 |
| PostgreSQL MCP Server | `database` | PostgreSQL 数据库操作 |
| SQLite MCP Server | `database` | SQLite 数据库操作 |
| Puppeteer MCP Server | `automation` | 浏览器自动化 |
| Fetch MCP Server | `networking` | HTTP 请求 |
| Memory MCP Server | `core` | 持久化记忆 |
| Sequential Thinking MCP | `reasoning` | 结构化推理 |
| Context7 MCP Server | `documentation` | 文档查询 |
| DeepWiki MCP Server | `documentation` | 仓库分析 |
| Brave Search MCP Server | `search` | 网页搜索 |
| Slack MCP Server | `communication` | Slack 集成 |
| Google Drive MCP Server | `cloud-storage` | Google Drive 集成 |
| Sentry MCP Server | `monitoring` | 错误追踪 |
| Cloudflare MCP Server | `cloud` | Cloudflare 集成 |
| Linear MCP Server | `project-management` | Linear 项目管理 |

### 3. Skill（技能命令）

可执行的技能命令，自动化开发任务。

**技能分类：**

| 分类 | 技能 |
|------|------|
| `code-generation` | Component Generator, API Route Generator, Schema Generator, Prisma Schema Generator |
| `version-control` | Smart Commit, PR Generator, Git Worktree Manager, Branch Cleanup |
| `testing` | Test Generator, Mock Generator |
| `documentation` | README Generator, Changelog Generator, JSDoc Generator |
| `refactoring` | Code Refactor, Import Organizer |
| `devops` | Dockerfile Generator, GitHub Actions Generator, K8s Manifest Generator |
| `security` | Security Scanner, Dependency Audit |
| `performance` | Bundle Analyzer, Lighthouse Runner |
| `database` | Prisma Schema Generator, Database Migration Assistant |

### 4. Hook（开发钩子）

Git 钩子和工作流自动化。

**钩子分类：**

| 分类 | 钩子 |
|------|------|
| `pre-commit` | Lint Staged, Type Check, Test Runner, Secret Scanner, File Size Guard |
| `commit-msg` | Commitlint, Issue Linker, Emoji Commit |
| `pre-push` | Branch Protection, Full Test Suite, Build Verification |
| `post-merge` | Dependency Sync, Migration Runner, Cache Clear |
| `post-checkout` | Environment Switcher, Node Version Switcher |
| `workflow` | Auto Format, Todo Tracker, Changelog Auto-Update, PR Template |
| `notification` | Slack Notifier, Discord Notifier, Feishu Notifier |

---

## API 端点

### 1. 获取单个模板

```
GET /api/v8/templates/:templateId
```

**响应示例：**

```json
{
  "code": 200,
  "message": "Template retrieved successfully",
  "data": {
    "id": "tpl_abc123",
    "type": "agent",
    "name_en": "React Specialist",
    "name_zh_cn": "React 专家",
    "description_en": "Expert in React 18+, Next.js, React Server Components",
    "description_zh_cn": "精通 React 18+、Next.js、React Server Components",
    "category": "frontend",
    "tags": ["react", "nextjs", "rsc", "frontend", "typescript"],
    "author": "CCJK Team",
    "version": "1.0.0",
    "repository_url": "https://github.com/modelcontextprotocol/typescript-sdk",
    "install_command": "ccjk agent install react-specialist",
    "requirements": ["claude-api-key"],
    "compatibility": {
      "platforms": ["linux", "macos", "windows"],
      "frameworks": ["react", "nextjs", "remix", "astro"]
    },
    "usage_examples": [
      {
        "title": "Build React Server Component",
        "description": "Create a React Server Component with proper data fetching",
        "code": "ccjk agent react-specialist --task rsc-component --component UserProfile"
      }
    ],
    "documentation_url": "https://docs.ccjk.dev/agents/react-specialist",
    "is_official": true,
    "is_featured": true,
    "is_verified": true,
    "download_count": 1500,
    "rating_average": 4.8,
    "rating_count": 120,
    "created_at": "2026-01-25T00:00:00.000Z",
    "updated_at": "2026-01-25T00:00:00.000Z"
  }
}
```

---

### 2. 批量获取模板

```
POST /api/v8/templates/batch
```

**请求体：**

```json
{
  "ids": ["tpl_abc123", "tpl_def456"],
  "language": "zh-CN",
  "includeStats": true
}
```

**兼容字段：** `ids`, `templates`, `templateIds` 均可使用

**响应示例：**

```json
{
  "requestId": "req_xxx",
  "templates": {
    "tpl_abc123": {
      "id": "tpl_abc123",
      "type": "agent",
      "name": { "en": "React Specialist", "zh-CN": "React 专家" },
      "description": { "en": "...", "zh-CN": "..." },
      "content": "...",
      "version": "1.0.0",
      "author": "CCJK Team",
      "tags": ["react", "frontend"],
      "createdAt": "2026-01-25T00:00:00.000Z",
      "updatedAt": "2026-01-25T00:00:00.000Z"
    }
  },
  "notFound": ["tpl_not_exist"],
  "stats": {
    "totalTemplates": 183,
    "cacheHits": 100,
    "cacheMisses": 5
  }
}
```

---

### 3. 搜索模板

```
GET /api/v8/templates/search?query=react&type=agent&limit=20
```

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | ✅ | 搜索关键词 |
| `type` | string | ❌ | 模板类型：`skill`, `mcp`, `agent`, `hook` |
| `category` | string | ❌ | 分类筛选 |
| `tags` | string | ❌ | 标签筛选（逗号分隔） |
| `is_official` | boolean | ❌ | 仅官方模板 |
| `is_featured` | boolean | ❌ | 仅精选模板 |
| `is_verified` | boolean | ❌ | 仅认证模板 |
| `sortBy` | string | ❌ | 排序字段：`name_en`, `download_count`, `rating_average`, `updated_at` |
| `order` | string | ❌ | 排序方向：`asc`, `desc` |
| `limit` | number | ❌ | 返回数量（默认 20，最大 100） |
| `offset` | number | ❌ | 偏移量 |

**响应示例：**

```json
{
  "code": 200,
  "message": "Found 15 templates matching \"react\"",
  "data": {
    "items": [...],
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 4. 列表模板

```
GET /api/v8/templates?type=agent&category=frontend&limit=20
```

**Query 参数：** 同搜索接口

**响应示例：**

```json
{
  "code": 200,
  "message": "Retrieved 20 templates",
  "data": {
    "items": [...],
    "total": 56,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 5. 获取精选模板

```
GET /api/v8/templates/featured?limit=10
```

**响应示例：**

```json
{
  "code": 200,
  "message": "Retrieved 10 featured templates",
  "data": [...]
}
```

---

### 6. 获取热门模板

```
GET /api/v8/templates/popular?limit=20
```

**响应示例：**

```json
{
  "code": 200,
  "message": "Retrieved 20 popular templates",
  "data": [...]
}
```

---

### 7. 获取分类列表

```
GET /api/v8/templates/categories
```

**响应示例：**

```json
{
  "code": 200,
  "message": "Retrieved 25 template categories",
  "data": [
    "frontend", "backend", "devops", "database", "security",
    "testing", "documentation", "code-generation", "version-control",
    "pre-commit", "commit-msg", "pre-push", "post-merge", "workflow",
    "notification", "core", "automation", "networking", "search",
    "communication", "cloud-storage", "monitoring", "cloud", "reasoning",
    "project-management"
  ]
}
```

---

### 8. 记录下载

```
POST /api/v8/templates/:templateId/download
```

**响应示例：**

```json
{
  "code": 200,
  "message": "Download tracked successfully"
}
```

---

## 数据结构

### Template 完整结构

```typescript
interface Template {
  // 基础信息
  id: string;                    // 模板 ID，格式：tpl_xxx
  type: 'skill' | 'mcp' | 'agent' | 'hook';
  name_en: string;               // 英文名称
  name_zh_cn?: string;           // 中文名称
  description_en?: string;       // 英文描述
  description_zh_cn?: string;    // 中文描述
  category: string;              // 分类
  tags: string[];                // 标签数组

  // 版本信息
  author?: string;               // 作者
  version: string;               // 版本号（语义化版本）
  repository_url?: string;       // 仓库地址
  npm_package?: string;          // NPM 包名
  install_command?: string;      // 安装命令
  documentation_url?: string;    // 文档地址

  // 配置信息
  config_schema?: object;        // 配置 Schema（JSON Schema 格式）
  requirements?: string[];       // 依赖要求
  compatibility?: {              // 兼容性信息
    platforms?: string[];        // 支持平台
    frameworks?: string[];       // 支持框架
    languages?: string[];        // 支持语言
    [key: string]: any;
  };

  // 使用示例
  usage_examples?: Array<{
    title: string;
    description: string;
    code: string;
  }>;

  // 状态标记
  is_official: boolean;          // 是否官方
  is_featured: boolean;          // 是否精选
  is_verified: boolean;          // 是否认证

  // 统计信息
  download_count: number;        // 下载次数
  rating_average: number;        // 平均评分（0-5）
  rating_count: number;          // 评分次数

  // 时间戳
  last_updated?: string;         // 最后更新时间
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

### 批量请求结构

```typescript
interface BatchTemplateRequest {
  ids?: string[];           // 模板 ID 列表
  templates?: string[];     // 兼容字段
  templateIds?: string[];   // 兼容字段
  language?: 'en' | 'zh-CN';
  includeStats?: boolean;
}

interface BatchTemplateResponse {
  requestId: string;
  templates: Record<string, TemplateResponse>;
  notFound: string[];
  stats?: {
    totalTemplates: number;
    cacheHits: number;
    cacheMisses: number;
    cacheSize: number;
  };
}
```

---

## 分类说明

### Agent 分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `frontend` | 前端开发 | React, Vue, TypeScript |
| `backend` | 后端开发 | Node.js, Python, Go, Rust |
| `ai-ml` | AI/机器学习 | LLM Integration, ML Pipeline |
| `devops` | DevOps | Kubernetes, Terraform, CI/CD |
| `database` | 数据库 | PostgreSQL, MongoDB, Redis |
| `security` | 安全 | Security Auditor, Auth |
| `testing` | 测试 | Testing Specialist |
| `code-quality` | 代码质量 | Code Review |
| `documentation` | 文档 | Documentation Agent |
| `debugging` | 调试 | Bug Hunter |
| `refactoring` | 重构 | Refactoring Agent |
| `performance` | 性能 | Performance Optimizer |
| `api-design` | API 设计 | API Design Agent |

### MCP 分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `core` | 核心服务 | Filesystem, Memory |
| `development` | 开发工具 | GitHub |
| `database` | 数据库 | PostgreSQL, SQLite |
| `automation` | 自动化 | Puppeteer |
| `networking` | 网络 | Fetch |
| `reasoning` | 推理 | Sequential Thinking |
| `documentation` | 文档 | Context7, DeepWiki |
| `search` | 搜索 | Brave Search |
| `communication` | 通信 | Slack |
| `cloud-storage` | 云存储 | Google Drive |
| `monitoring` | 监控 | Sentry |
| `cloud` | 云服务 | Cloudflare |
| `project-management` | 项目管理 | Linear |

### Skill 分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `code-generation` | 代码生成 | Component Generator, Schema Generator |
| `version-control` | 版本控制 | Smart Commit, PR Generator |
| `testing` | 测试 | Test Generator, Mock Generator |
| `documentation` | 文档 | README Generator, Changelog Generator |
| `refactoring` | 重构 | Code Refactor, Import Organizer |
| `devops` | DevOps | Dockerfile Generator, GitHub Actions Generator |
| `security` | 安全 | Security Scanner, Dependency Audit |
| `performance` | 性能 | Bundle Analyzer, Lighthouse Runner |
| `database` | 数据库 | Prisma Schema Generator |

### Hook 分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `pre-commit` | 提交前 | Lint Staged, Type Check, Secret Scanner |
| `commit-msg` | 提交信息 | Commitlint, Issue Linker |
| `pre-push` | 推送前 | Branch Protection, Full Test Suite |
| `post-merge` | 合并后 | Dependency Sync, Migration Runner |
| `post-checkout` | 检出后 | Environment Switcher, Node Version Switcher |
| `workflow` | 工作流 | Auto Format, Todo Tracker |
| `notification` | 通知 | Slack Notifier, Discord Notifier, Feishu Notifier |

---

## 客户端集成示例

### TypeScript 客户端

```typescript
// templates-client.ts

interface TemplateSearchParams {
  query?: string;
  type?: 'skill' | 'mcp' | 'agent' | 'hook';
  category?: string;
  tags?: string[];
  is_official?: boolean;
  is_featured?: boolean;
  sortBy?: 'name_en' | 'download_count' | 'rating_average' | 'updated_at';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class TemplatesClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://api.claudehome.cn') {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取单个模板
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    const response = await fetch(`${this.baseUrl}/api/v8/templates/${templateId}`);
    const data = await response.json();

    if (data.code === 200) {
      return data.data;
    }
    return null;
  }

  /**
   * 批量获取模板
   */
  async getTemplates(ids: string[], language: 'en' | 'zh-CN' = 'en'): Promise<{
    templates: Record<string, Template>;
    notFound: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/v8/templates/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, language }),
    });

    const data = await response.json();
    return {
      templates: data.templates || {},
      notFound: data.notFound || [],
    };
  }

  /**
   * 搜索模板
   */
  async searchTemplates(query: string, params: TemplateSearchParams = {}): Promise<{
    items: Template[];
    total: number;
  }> {
    const searchParams = new URLSearchParams({
      query,
      ...Object.fromEntries(
        Object.entries(params)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ),
    });

    const response = await fetch(
      `${this.baseUrl}/api/v8/templates/search?${searchParams}`
    );
    const data = await response.json();

    return {
      items: data.data?.items || [],
      total: data.data?.total || 0,
    };
  }

  /**
   * 按类型获取模板
   */
  async getTemplatesByType(
    type: 'skill' | 'mcp' | 'agent' | 'hook',
    limit = 20
  ): Promise<Template[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v8/templates?type=${type}&limit=${limit}`
    );
    const data = await response.json();
    return data.data?.items || [];
  }

  /**
   * 获取专业代理列表
   */
  async getSpecialistAgents(category?: string): Promise<Template[]> {
    const params = new URLSearchParams({ type: 'agent', limit: '50' });
    if (category) {
      params.set('category', category);
    }

    const response = await fetch(`${this.baseUrl}/api/v8/templates?${params}`);
    const data = await response.json();
    return data.data?.items || [];
  }

  /**
   * 获取官方 MCP 服务
   */
  async getOfficialMcpServers(): Promise<Template[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v8/templates?type=mcp&is_official=true&limit=50`
    );
    const data = await response.json();
    return data.data?.items || [];
  }

  /**
   * 获取精选模板
   */
  async getFeaturedTemplates(limit = 10): Promise<Template[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v8/templates/featured?limit=${limit}`
    );
    const data = await response.json();
    return data.data || [];
  }

  /**
   * 获取热门模板
   */
  async getPopularTemplates(limit = 20): Promise<Template[]> {
    const response = await fetch(
      `${this.baseUrl}/api/v8/templates/popular?limit=${limit}`
    );
    const data = await response.json();
    return data.data || [];
  }

  /**
   * 记录下载
   */
  async trackDownload(templateId: string): Promise<boolean> {
    const response = await fetch(
      `${this.baseUrl}/api/v8/templates/${templateId}/download`,
      { method: 'POST' }
    );
    const data = await response.json();
    return data.code === 200;
  }
}

// 导出单例
export const templatesClient = new TemplatesClient();
```

### 使用示例

```typescript
import { templatesClient } from './templates-client';

// 获取所有前端专业代理
async function getFrontendAgents() {
  const agents = await templatesClient.getSpecialistAgents('frontend');
  console.log('Frontend Agents:', agents.map(a => a.name_en));
  // Output: ['React Specialist', 'Vue Specialist', 'TypeScript Architect', 'Tailwind CSS Specialist']
}

// 搜索 React 相关模板
async function searchReactTemplates() {
  const { items, total } = await templatesClient.searchTemplates('react', {
    type: 'agent',
    sortBy: 'rating_average',
    order: 'desc',
  });
  console.log(`Found ${total} React templates`);
}

// 获取官方 MCP 服务
async function getOfficialMcp() {
  const mcpServers = await templatesClient.getOfficialMcpServers();
  console.log('Official MCP Servers:', mcpServers.map(m => m.name_en));
}

// 批量获取模板
async function batchGetTemplates() {
  const { templates, notFound } = await templatesClient.getTemplates([
    'tpl_react_specialist',
    'tpl_filesystem_mcp',
    'tpl_smart_commit',
  ], 'zh-CN');

  console.log('Found templates:', Object.keys(templates).length);
  console.log('Not found:', notFound);
}

// 获取所有 Git 相关钩子
async function getGitHooks() {
  const { items } = await templatesClient.searchTemplates('git', {
    type: 'hook',
    limit: 50,
  });
  console.log('Git Hooks:', items.map(h => h.name_en));
}
```

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 模板不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "code": 400,
  "message": "Invalid search parameters",
  "error": "Search query is required"
}
```

### 批量请求错误格式

```json
{
  "code": "INVALID_REQUEST",
  "message": "At least one template ID is required",
  "requestId": "req_xxx"
}
```

---

## 更新日志

### 2026-01-25

- ✅ 新增 19 个专业技能代理（Frontend, Backend, AI/ML, DevOps, Database, Security, Testing）
- ✅ 新增 16 个官方 MCP 服务（Anthropic 官方 + 社区热门）
- ✅ 新增 22 个增强技能（Code Generation, Version Control, Testing, Documentation, DevOps, Security, Performance）
- ✅ 新增 23 个增强钩子（Pre-commit, Commit-msg, Pre-push, Post-merge, Post-checkout, Workflow, Notification）
- ✅ 总模板数从 68 增加到 183

---

## 联系支持

- 📧 Email: support@claudehome.cn
- 🌐 Website: https://www.claudehome.cn
- 📖 Documentation: https://www.claudehome.cn/docs

---

*© 2026 CCJK Cloud. All rights reserved.*

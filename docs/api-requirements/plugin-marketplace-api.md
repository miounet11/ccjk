# Plugin Marketplace API 需求文档

## 背景

CCJK 需要接管 Claude Code 的 `/plugin` 命令，提供自己的插件市场服务。当用户在 Claude Code 中输入 `/plugin install xxx` 时，应该从 `api.claudehome.cn` 获取插件列表和安装包。

## API 端点设计

### Base URL
```
https://api.claudehome.cn/v1/plugins
```

---

## 1. 获取插件列表

### `GET /plugins`

获取所有可用插件列表。

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `category` | string | 否 | 按分类筛选 (e.g., `productivity`, `development`, `ai-agents`) |
| `search` | string | 否 | 搜索关键词 |
| `page` | number | 否 | 页码，默认 1 |
| `limit` | number | 否 | 每页数量，默认 20，最大 100 |
| `sort` | string | 否 | 排序方式: `popular`, `newest`, `updated` |

**Response:**
```json
{
  "success": true,
  "data": {
    "plugins": [
      {
        "id": "code-simplifier",
        "name": "Code Simplifier",
        "description": "Automatically simplify and refactor complex code",
        "version": "1.2.0",
        "author": {
          "name": "CCJK Team",
          "email": "team@claudehome.cn"
        },
        "category": "development",
        "tags": ["refactoring", "code-quality", "simplification"],
        "downloads": 15420,
        "rating": 4.8,
        "ratingCount": 234,
        "icon": "https://cdn.claudehome.cn/plugins/code-simplifier/icon.png",
        "homepage": "https://github.com/ccjk/code-simplifier",
        "repository": "https://github.com/ccjk/code-simplifier",
        "license": "MIT",
        "createdAt": "2024-06-15T10:30:00Z",
        "updatedAt": "2025-01-10T08:20:00Z",
        "compatibility": {
          "claudeCode": ">=1.0.0",
          "ccjk": ">=2.5.0"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

---

## 2. 获取插件详情

### `GET /plugins/:id`

获取单个插件的详细信息。

**Path Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 插件 ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "code-simplifier",
    "name": "Code Simplifier",
    "description": "Automatically simplify and refactor complex code",
    "longDescription": "Code Simplifier is a powerful plugin that helps you...",
    "version": "1.2.0",
    "versions": [
      { "version": "1.2.0", "releaseDate": "2025-01-10", "changelog": "Added support for..." },
      { "version": "1.1.0", "releaseDate": "2024-12-01", "changelog": "Bug fixes..." }
    ],
    "author": {
      "name": "CCJK Team",
      "email": "team@claudehome.cn",
      "url": "https://claudehome.cn"
    },
    "category": "development",
    "tags": ["refactoring", "code-quality", "simplification"],
    "downloads": 15420,
    "rating": 4.8,
    "ratingCount": 234,
    "icon": "https://cdn.claudehome.cn/plugins/code-simplifier/icon.png",
    "screenshots": [
      "https://cdn.claudehome.cn/plugins/code-simplifier/screenshot1.png",
      "https://cdn.claudehome.cn/plugins/code-simplifier/screenshot2.png"
    ],
    "homepage": "https://github.com/ccjk/code-simplifier",
    "repository": "https://github.com/ccjk/code-simplifier",
    "bugs": "https://github.com/ccjk/code-simplifier/issues",
    "license": "MIT",
    "keywords": ["code", "simplify", "refactor", "clean"],
    "dependencies": {
      "ccjk": ">=2.5.0"
    },
    "peerDependencies": {},
    "engines": {
      "node": ">=18.0.0"
    },
    "compatibility": {
      "claudeCode": ">=1.0.0",
      "ccjk": ">=2.5.0"
    },
    "permissions": [
      "file:read",
      "file:write"
    ],
    "skills": [
      {
        "id": "simplify-code",
        "name": "Simplify Code",
        "description": "Simplify selected code block",
        "triggers": ["/simplify", "/clean"]
      }
    ],
    "mcpServices": [],
    "workflows": [],
    "createdAt": "2024-06-15T10:30:00Z",
    "updatedAt": "2025-01-10T08:20:00Z"
  }
}
```

---

## 3. 下载/安装插件

### `GET /plugins/:id/download`

获取插件下载信息和安装包。

**Path Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 插件 ID |

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | 否 | 指定版本，默认最新版 |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "code-simplifier",
    "version": "1.2.0",
    "downloadUrl": "https://cdn.claudehome.cn/plugins/code-simplifier/code-simplifier-1.2.0.tgz",
    "sha256": "abc123def456...",
    "size": 125430,
    "installInstructions": {
      "type": "npm",
      "command": "npm install code-simplifier"
    },
    "files": [
      {
        "path": "skills/simplify-code.md",
        "type": "skill"
      },
      {
        "path": "workflows/refactor.yml",
        "type": "workflow"
      }
    ]
  }
}
```

---

## 4. 搜索插件

### `GET /plugins/search`

搜索插件。

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | string | 是 | 搜索关键词 |
| `category` | string | 否 | 按分类筛选 |
| `limit` | number | 否 | 返回数量，默认 10 |

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "code simplifier",
    "results": [
      {
        "id": "code-simplifier",
        "name": "Code Simplifier",
        "description": "Automatically simplify and refactor complex code",
        "version": "1.2.0",
        "downloads": 15420,
        "rating": 4.8,
        "relevance": 0.95
      }
    ],
    "total": 3
  }
}
```

---

## 5. 获取分类列表

### `GET /plugins/categories`

获取所有插件分类。

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "development",
        "name": "Development",
        "nameZh": "开发工具",
        "description": "Tools for software development",
        "icon": "🛠️",
        "count": 45
      },
      {
        "id": "productivity",
        "name": "Productivity",
        "nameZh": "效率工具",
        "description": "Boost your productivity",
        "icon": "⚡",
        "count": 32
      },
      {
        "id": "ai-agents",
        "name": "AI Agents",
        "nameZh": "AI 代理",
        "description": "Specialized AI agents",
        "icon": "🤖",
        "count": 28
      },
      {
        "id": "code-quality",
        "name": "Code Quality",
        "nameZh": "代码质量",
        "description": "Code review and quality tools",
        "icon": "✅",
        "count": 21
      },
      {
        "id": "documentation",
        "name": "Documentation",
        "nameZh": "文档工具",
        "description": "Documentation generation",
        "icon": "📝",
        "count": 18
      },
      {
        "id": "testing",
        "name": "Testing",
        "nameZh": "测试工具",
        "description": "Testing and QA tools",
        "icon": "🧪",
        "count": 15
      }
    ]
  }
}
```

---

## 6. 获取热门/推荐插件

### `GET /plugins/featured`

获取精选/推荐插件。

**Response:**
```json
{
  "success": true,
  "data": {
    "featured": [
      {
        "id": "code-simplifier",
        "name": "Code Simplifier",
        "description": "Automatically simplify and refactor complex code",
        "version": "1.2.0",
        "downloads": 15420,
        "rating": 4.8,
        "badge": "Editor's Choice"
      }
    ],
    "trending": [
      // 本周热门
    ],
    "newReleases": [
      // 最新发布
    ]
  }
}
```

---

## 7. 上传插件（开发者）

### `POST /plugins/upload`

上传新插件或更新现有插件。

**Headers:**
```
Authorization: Bearer <developer_token>
Content-Type: multipart/form-data
```

**Body:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `package` | file | 是 | 插件包 (.tgz) |
| `manifest` | json | 是 | 插件清单 (package.json) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "code-simplifier",
    "version": "1.2.0",
    "status": "pending_review",
    "message": "Plugin uploaded successfully. It will be reviewed within 24 hours."
  }
}
```

---

## 8. 插件统计

### `POST /plugins/:id/stats`

记录插件安装/使用统计。

**Body:**
```json
{
  "event": "install",  // install, uninstall, activate, error
  "version": "1.2.0",
  "ccjkVersion": "2.6.1",
  "claudeCodeVersion": "1.0.0",
  "platform": "darwin",
  "arch": "arm64"
}
```

---

## 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "PLUGIN_NOT_FOUND",
    "message": "Plugin 'xxx' not found in marketplace",
    "messageZh": "插件 'xxx' 在市场中未找到"
  }
}
```

### 错误码

| Code | HTTP Status | 说明 |
|------|-------------|------|
| `PLUGIN_NOT_FOUND` | 404 | 插件不存在 |
| `VERSION_NOT_FOUND` | 404 | 指定版本不存在 |
| `INVALID_PACKAGE` | 400 | 插件包格式无效 |
| `UNAUTHORIZED` | 401 | 未授权 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `SERVER_ERROR` | 500 | 服务器错误 |

---

## 初始插件列表建议

建议首批上架以下插件：

### 开发工具类
1. **code-simplifier** - 代码简化和重构
2. **code-reviewer** - 代码审查助手
3. **test-generator** - 测试用例生成器
4. **doc-generator** - 文档生成器
5. **api-designer** - API 设计助手

### 效率工具类
6. **git-helper** - Git 操作助手
7. **project-init** - 项目初始化模板
8. **dependency-updater** - 依赖更新检查
9. **changelog-generator** - 变更日志生成

### AI 代理类
10. **security-auditor** - 安全审计代理
11. **performance-analyzer** - 性能分析代理
12. **architecture-advisor** - 架构建议代理

---

## 实现优先级

### P0 - 必须实现
- `GET /plugins` - 插件列表
- `GET /plugins/:id` - 插件详情
- `GET /plugins/:id/download` - 下载插件
- `GET /plugins/search` - 搜索插件

### P1 - 重要
- `GET /plugins/categories` - 分类列表
- `GET /plugins/featured` - 推荐插件
- `POST /plugins/:id/stats` - 统计上报

### P2 - 后续
- `POST /plugins/upload` - 开发者上传
- 评分评论系统
- 开发者后台

---

## 客户端集成

CCJK 需要：

1. **接管 `/plugin` 命令** - 在 shell hook 中拦截，调用 CCJK 的插件管理
2. **实现插件安装器** - 从 `api.claudehome.cn` 下载并安装插件
3. **插件本地管理** - 安装到 `~/.ccjk/plugins/` 目录
4. **与 Claude Code 集成** - 将插件的 skills/workflows 注入到 Claude Code

---

## 时间线建议

| 阶段 | 内容 | 时间 |
|------|------|------|
| Phase 1 | API 基础框架 + 插件列表/详情/下载 | 1 周 |
| Phase 2 | 搜索 + 分类 + 推荐 | 1 周 |
| Phase 3 | 首批 10 个插件上架 | 2 周 |
| Phase 4 | 开发者上传 + 审核系统 | 2 周 |

---

## 联系方式

如有问题请联系 CCJK 团队。

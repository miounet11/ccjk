# CCJK Cloud API 需求规范文档

> **版本**: v9.0.2
> **日期**: 2026-01-25
> **状态**: 待云端实现
> **更新**: 新增 MCP/Hooks/Skills 数据格式问题

---

## 1. 问题背景

### 1.1 当前问题

在 CCJK v9.0.2 云驱动智能设置功能中，发现以下 API 兼容性问题：

| 问题 | 错误信息 | 影响范围 | 优先级 |
|------|----------|----------|--------|
| **MCP 配置失败** | `Cannot read properties of undefined (reading 'name')` | MCP 服务安装 | **P0** |
| **Hooks 安装失败** | `Cannot read properties of undefined (reading 'push')` | Hooks 配置 | **P0** |
| **Skills 模板缺失** | `Template not found: tpl_xxx` | Skills 安装 | **P1** |
| Agents 创建失败 | `recommendation.name.toLowerCase is not a function` | 所有代理创建 | P1 |
| Skills 安装失败 | `Cannot read properties of undefined (reading 'en')` | 技能安装 | P1 |
| 模板批量获取失败 | `400 Bad Request` on `/api/v8/templates/batch` | 模板下载 | P2 |
| 遥测上报失败 | `400 Bad Request` on `/api/v8/telemetry/installation` | 使用统计 | P3 |

### 1.2 v9.0.2 新增问题详情

#### 问题 1: MCP 服务配置失败

**错误堆栈**:
```
ERROR  MCP 服务配置失败 Cannot read properties of undefined (reading 'name')
    at dist/chunks/ccjk-mcp.mjs:517:39
    at Array.forEach (<anonymous>)
    at ccjkMcp (dist/chunks/ccjk-mcp.mjs:515:26)
```

**根因**: 云端返回的 MCP 服务创建了临时模板对象，但后续通过 `serviceId` 查找时，本地 `mcpServiceTemplates` 字典中不存在该服务，返回 `undefined`。

**客户端已修复**: 增加 fallback 查找逻辑
**云端需配合**: 确保返回的 MCP 服务包含完整的 `id`、`name`、`type`、`command`、`args` 字段

---

#### 问题 2: Hooks 安装失败

**错误堆栈**:
```
ERROR  Hooks installation failed: Cannot read properties of undefined (reading 'push')
    at groupHooksByCategory (dist/chunks/ccjk-hooks.mjs:1012:27)
    at ccjkHooks (dist/chunks/ccjk-hooks.mjs:879:29)
```

**根因**: 客户端只预定义了 3 个分类 (`pre-commit`, `post-test`, `lifecycle`)，但云端返回的 hooks 包含其他分类（如 `git-hooks`, `workflow`, `commit-msg`），导致数组未初始化。

**客户端已修复**: 动态创建未知分类的数组
**云端需配合**: 使用标准 Git Hook 分类名称（见下方规范）

---

#### 问题 3: Skills 模板缺失

**错误信息**:
```
Template not found: tpl_VVvfHw7NA_qw
Template not found: tpl_uKPyj6viVGfg
Template not found: tpl_Ox4f9FJhul-A
... (共 11 个模板缺失)
```

**根因**: Skills API 返回的 `template_id` 在云端模板存储中不存在

**云端需配合**:
1. 确保所有返回的 `template_id` 在云端存在
2. 或直接在响应中包含 `template_content` 字段

### 1.3 历史问题根因分析

云端 API 返回的数据结构与客户端预期不一致：

```javascript
// 客户端预期格式
{
  name: "Agent Name",           // 字符串
  description: "Description"    // 字符串
}

// 或多语言对象格式
{
  name: { en: "Agent Name", "zh-CN": "代理名称" },
  description: { en: "Description", "zh-CN": "描述" }
}

// 实际返回（导致错误）
{
  name: { name: { en: "...", "zh-CN": "..." } },  // 嵌套对象
  description: { description: { en: "...", "zh-CN": "..." } }
}
```

---

## 2. MCP 服务 API 规范 (新增)

### 2.1 接口信息

- **端点**: `GET /api/v8/templates/mcp-servers`
- **当前版本**: v8.2.0

### 2.2 响应格式要求

```typescript
interface CloudMcpService {
  // ========== 必填字段 ==========
  id: string              // 唯一标识符
  name_en: string         // 英文名称

  // ========== 推荐字段 ==========
  name_zh_cn?: string     // 中文名称
  description_en?: string // 英文描述
  description_zh_cn?: string
  type?: 'stdio' | 'http' | 'websocket'  // 默认 'stdio'
  command?: string        // 启动命令
  args?: string[]         // 命令参数
  npm_package?: string    // npm 包名
  install_command?: string
  env?: Record<string, string>
  category?: 'core' | 'ondemand' | 'scenario'
  tags?: string[]
  compatibility?: {
    languages?: string[]
    frameworks?: string[]
  }
}
```

### 2.3 示例响应

```json
{
  "success": true,
  "data": [
    {
      "id": "filesystem-mcp",
      "name_en": "Filesystem MCP",
      "name_zh_cn": "文件系统 MCP",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem"],
      "category": "core"
    }
  ]
}
```

---

## 3. Hooks API 规范 (新增)

### 3.1 接口信息

- **端点**: `GET /api/v8/templates/hooks`

### 3.2 响应格式要求

```typescript
interface CloudHook {
  id: string        // 必填：唯一标识符
  name_en: string   // 必填：英文名称
  category: HookCategory  // 必填：必须是有效的 Git Hook 类型

  name_zh_cn?: string
  description_en?: string
  description_zh_cn?: string
  install_command?: string
  tags?: string[]
}

// ✅ 有效的 category 值
type HookCategory =
  | 'pre-commit'      // 提交前
  | 'commit-msg'      // 提交消息
  | 'post-commit'     // 提交后
  | 'pre-push'        // 推送前
  | 'post-merge'      // 合并后
  | 'pre-rebase'      // 变基前
  | 'post-checkout'   // 检出后
  | 'post-test'       // 测试后（扩展）
  | 'lifecycle'       // 生命周期（扩展）

// ❌ 无效的 category 值（当前云端返回）
// 'git-hooks', 'workflow' - 不是具体的 hook 类型
```

### 3.3 示例响应

```json
{
  "data": [
    {
      "id": "lint-staged",
      "name_en": "Lint Staged",
      "category": "pre-commit",
      "install_command": "npx lint-staged"
    },
    {
      "id": "commitlint",
      "name_en": "Commitlint",
      "category": "commit-msg",
      "install_command": "npx commitlint --edit $1"
    }
  ]
}
```

---

## 4. Skills/Templates API 规范 (新增)

### 4.1 接口信息

- **端点**: `GET /api/v8/templates/skills`

### 4.2 响应格式要求

```typescript
interface CloudSkill {
  id: string        // 必填
  name_en: string   // 必填

  // 模板内容（二选一，推荐方案 B）
  template_id?: string      // 方案 A: 模板 ID（必须存在）
  template_content?: string // 方案 B: 直接包含内容（推荐）

  name_zh_cn?: string
  description_en?: string
  description_zh_cn?: string
  tags?: string[]
}
```

### 4.3 缺失的模板 ID 列表

以下模板需要在云端创建或修复：

| 模板 ID | Skill 名称 |
|---------|------------|
| `tpl_VVvfHw7NA_qw` | TypeScript Best Practices |
| `tpl_uKPyj6viVGfg` | React Best Practices |
| `tpl_Ox4f9FJhul-A` | Component Generator |
| `tpl_l9SkEvoBkncY` | Schema Generator |
| `tpl_m2FEpjnJIXp8` | Test Generator |
| `tpl_GW52d3V_8CRm` | JSDoc Generator |
| `tpl_DhHFG_rbdOHk` | Code Refactor |
| `tpl_zfX8agBWn3Ig` | Import Organizer |
| `tpl_N6pApssmXhQg` | Security Scanner |
| `tpl_S8krkPai0MkC` | Security Audit |

---

## 5. 多语言字段规范

所有支持多语言的字段必须遵循以下格式之一：

#### 格式 A：纯字符串（简单模式）
```json
{
  "name": "TypeScript Best Practices",
  "description": "Essential for TypeScript 5.3+ strict mode"
}
```

#### 格式 B：多语言对象（推荐）
```json
{
  "name": {
    "en": "TypeScript Best Practices",
    "zh-CN": "TypeScript 最佳实践"
  },
  "description": {
    "en": "Essential for TypeScript 5.3+ strict mode",
    "zh-CN": "TypeScript 5.3+ 严格模式必备"
  }
}
```

#### ❌ 禁止的格式
```json
// 嵌套对象 - 禁止
{
  "name": {
    "name": { "en": "...", "zh-CN": "..." }
  }
}

// 空对象 - 禁止
{
  "name": {}
}

// 非字符串值 - 禁止
{
  "name": {
    "en": { "text": "...", "format": "plain" }
  }
}
```

### 2.2 支持的语言代码

| 代码 | 语言 | 备注 |
|------|------|------|
| `en` | English | 必须提供，作为 fallback |
| `zh-CN` | 简体中文 | 可选 |
| `zh-Hans` | 简体中文（别名） | 可选，等同于 zh-CN |
| `zh` | 中文（通用） | 可选，fallback 到 zh-CN |

---

## 3. API 端点规范

### 3.1 项目分析 API

**端点**: `POST /api/v8/analysis/projects`

#### 请求格式
```typescript
interface ProjectAnalysisRequest {
  /** 项目根目录路径 */
  projectRoot: string
  /** 项目依赖 */
  dependencies?: Record<string, string>
  /** 开发依赖 */
  devDependencies?: Record<string, string>
  /** Git 远程仓库 URL */
  gitRemote?: string
  /** 客户端语言偏好 */
  language?: 'en' | 'zh-CN'
  /** CCJK 版本 */
  ccjkVersion?: string
}
```

#### 响应格式
```typescript
interface ProjectAnalysisResponse {
  /** 请求追踪 ID */
  requestId: string
  /** 推荐列表 */
  recommendations: Recommendation[]
  /** 检测到的项目类型 */
  projectType?: string
  /** 检测到的框架 */
  frameworks?: string[]
}

interface Recommendation {
  /** 唯一标识符 */
  id: string
  /** 显示名称 - 字符串或多语言对象 */
  name: string | Record<string, string>
  /** 描述 - 字符串或多语言对象 */
  description: string | Record<string, string>
  /** 分类 */
  category: 'workflow' | 'mcp' | 'agent' | 'tool'
  /** 相关性评分 (0-1) */
  relevanceScore: number
  /** 安装命令 */
  installCommand?: string
  /** 配置 JSON */
  config?: Record<string, any>
  /** 标签 */
  tags?: string[]
  /** 依赖项 */
  dependencies?: string[]
}
```

#### 响应示例
```json
{
  "requestId": "req_abc123",
  "recommendations": [
    {
      "id": "ts-best-practices",
      "name": {
        "en": "TypeScript Best Practices",
        "zh-CN": "TypeScript 最佳实践"
      },
      "description": {
        "en": "Essential for TypeScript 5.3+ strict mode",
        "zh-CN": "TypeScript 5.3+ 严格模式必备"
      },
      "category": "workflow",
      "relevanceScore": 0.98,
      "tags": ["typescript", "type-checking"]
    },
    {
      "id": "fullstack-assistant",
      "name": {
        "en": "Full-Stack Development Assistant",
        "zh-CN": "全栈开发助手"
      },
      "description": {
        "en": "AI assistant for full-stack development",
        "zh-CN": "全栈开发 AI 助手"
      },
      "category": "agent",
      "relevanceScore": 0.95,
      "tags": ["fullstack", "assistant"]
    }
  ],
  "projectType": "typescript-node",
  "frameworks": ["express", "react"]
}
```

### 3.2 批量模板获取 API

**端点**: `POST /api/v8/templates/batch`

#### 请求格式
```typescript
interface BatchTemplateRequest {
  /** 模板 ID 列表 */
  ids: string[]
  /** 语言偏好 */
  language?: 'en' | 'zh-CN'
}
```

#### 响应格式
```typescript
interface BatchTemplateResponse {
  /** 请求追踪 ID */
  requestId: string
  /** 模板映射 */
  templates: Record<string, TemplateResponse>
  /** 未找到的 ID 列表 */
  notFound: string[]
}

interface TemplateResponse {
  /** 模板 ID */
  id: string
  /** 模板类型 */
  type: 'workflow' | 'output-style' | 'prompt' | 'agent'
  /** 名称 - 字符串或多语言对象 */
  name: string | Record<string, string>
  /** 描述 - 字符串或多语言对象 */
  description: string | Record<string, string>
  /** 模板内容 */
  content: string
  /** 版本 */
  version: string
  /** 作者 */
  author?: string
  /** 标签 */
  tags?: string[]
  /** 创建时间 (ISO 8601) */
  createdAt: string
  /** 更新时间 (ISO 8601) */
  updatedAt: string
}
```

#### 响应示例
```json
{
  "requestId": "req_def456",
  "templates": {
    "ts-best-practices": {
      "id": "ts-best-practices",
      "type": "workflow",
      "name": {
        "en": "TypeScript Best Practices",
        "zh-CN": "TypeScript 最佳实践"
      },
      "description": {
        "en": "TypeScript 5.3+ best practices",
        "zh-CN": "TypeScript 5.3+ 最佳实践"
      },
      "content": "# TypeScript Best Practices\n\n...",
      "version": "1.0.0",
      "author": "CCJK Team",
      "tags": ["typescript"],
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-25T00:00:00Z"
    }
  },
  "notFound": []
}
```

### 3.3 遥测上报 API

**端点**: `POST /api/v8/telemetry/installation`

#### 请求格式
```typescript
interface UsageReport {
  /** 报告 ID */
  reportId: string
  /** 指标类型 */
  metricType: 'template_download' | 'recommendation_shown' | 'recommendation_accepted' | 'analysis_completed' | 'error_occurred'
  /** 时间戳 (ISO 8601) */
  timestamp: string
  /** CCJK 版本 */
  ccjkVersion: string
  /** Node.js 版本 */
  nodeVersion: string
  /** 操作系统 */
  platform: string
  /** 语言 */
  language?: string
  /** 附加数据 */
  data?: Record<string, any>
}
```

#### 响应格式
```typescript
interface UsageReportResponse {
  /** 成功标志 */
  success: boolean
  /** 请求 ID */
  requestId: string
  /** 消息 */
  message?: string
}
```

### 3.4 健康检查 API

**端点**: `GET /api/v8/health`

#### 响应格式
```typescript
interface HealthCheckResponse {
  /** 服务状态 */
  status: 'healthy' | 'degraded' | 'unhealthy'
  /** API 版本 */
  version: string
  /** 时间戳 */
  timestamp: string
  /** 消息 */
  message?: string
}
```

---

## 4. 错误处理规范

### 4.1 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | 成功 | 请求成功处理 |
| 400 | 请求错误 | 参数格式错误、缺少必填字段 |
| 401 | 未授权 | API Key 无效或过期 |
| 404 | 未找到 | 资源不存在 |
| 429 | 请求过多 | 触发限流 |
| 500 | 服务器错误 | 内部错误 |

### 4.2 错误响应格式

```typescript
interface ErrorResponse {
  /** 错误代码 */
  code: string
  /** 错误消息 */
  message: string
  /** 详细信息 */
  details?: Record<string, any>
  /** 请求 ID（用于追踪） */
  requestId?: string
}
```

#### 示例
```json
{
  "code": "INVALID_REQUEST",
  "message": "Missing required field: projectRoot",
  "details": {
    "field": "projectRoot",
    "reason": "required"
  },
  "requestId": "req_xyz789"
}
```

---

## 5. 客户端兼容性处理

### 5.1 客户端已实现的兼容逻辑

CCJK 客户端已实现 `extractString` 函数处理多语言字段：

```typescript
function extractString(
  val: string | Record<string, string> | undefined,
  fallback: string,
  preferredLang: 'en' | 'zh-CN' = 'en'
): string {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'string') return val || fallback

  if (typeof val === 'object') {
    // 优先使用指定语言
    const preferred = val[preferredLang]
    if (typeof preferred === 'string' && preferred) return preferred

    // 回退到英文
    const en = val.en || val['en-US']
    if (typeof en === 'string' && en) return en

    // 回退到中文
    const zhCN = val['zh-CN'] || val.zh || val['zh-Hans']
    if (typeof zhCN === 'string' && zhCN) return zhCN

    // 使用第一个可用值
    for (const v of Object.values(val)) {
      if (typeof v === 'string' && v) return v
    }
  }

  return fallback
}
```

### 5.2 云端需要确保的数据格式

1. **`name` 字段**: 必须是字符串或 `{ en: string, "zh-CN"?: string }` 格式
2. **`description` 字段**: 必须是字符串或 `{ en: string, "zh-CN"?: string }` 格式
3. **多语言对象的值**: 必须是字符串，不能是嵌套对象
4. **`en` 字段**: 必须存在，作为 fallback

---

## 6. 测试用例

### 6.1 推荐 API 测试

```bash
# 测试项目分析
curl -X POST https://api.claudehome.cn/api/v8/analysis/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectRoot": "/test/project",
    "dependencies": { "react": "^18.0.0" },
    "language": "zh-CN",
    "ccjkVersion": "8.2.0"
  }'

# 预期响应：recommendations 数组中每个对象的 name/description 必须是字符串或多语言对象
```

### 6.2 模板批量获取测试

```bash
# 测试批量模板获取
curl -X POST https://api.claudehome.cn/api/v8/templates/batch \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["ts-best-practices", "react-patterns"],
    "language": "zh-CN"
  }'

# 预期响应：templates 对象中每个模板的 name/description 必须是字符串或多语言对象
```

---

## 7. 版本兼容性

| CCJK 版本 | API 版本 | 兼容性 |
|-----------|----------|--------|
| 8.0.0 - 8.1.x | v8 | 需要云端修复数据格式 |
| 8.2.0+ | v8 | 客户端已增强兼容性处理 |

---

## 8. 实施建议

### 8.1 云端修复优先级

1. **P0 - 立即修复**: `/api/v8/analysis/projects` 返回的 `recommendations` 数据格式
2. **P1 - 高优先级**: `/api/v8/templates/batch` 请求参数验证和响应格式
3. **P2 - 中优先级**: `/api/v8/telemetry/installation` 请求参数验证

### 8.2 数据验证建议

云端在返回数据前应进行格式验证：

```typescript
function validateMultilingualField(field: any): boolean {
  if (typeof field === 'string') return true
  if (typeof field === 'object' && field !== null) {
    // 确保至少有 en 字段
    if (!field.en || typeof field.en !== 'string') return false
    // 确保所有值都是字符串
    for (const value of Object.values(field)) {
      if (typeof value !== 'string') return false
    }
    return true
  }
  return false
}
```

---

## 9. 联系方式

如有问题，请联系：
- **CCJK 客户端团队**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- **云服务团队**: 内部沟通渠道

---

**文档结束**

# CCJK 云服务需求文档

> 版本: v1.0 | 日期: 2026-02-25 | 状态: 草稿

---

## 一、云服务架构概览

### 1.1 API 端点体系

| 域名 | 用途 | 版本 |
|------|------|------|
| `https://api.claudehome.cn` | 主 API（模板、技能市场、评分、通知、插件、同步） | v1 / v8 |
| `https://remote-api.claudehome.cn` | 远程控制 / WebSocket | — |

### 1.2 客户端模块结构

```
src/cloud-client/
├── client.ts                  # CloudClient 主客户端（ofetch）
├── gateway.ts                 # CloudApiGateway 统一路由（v1/v8 自动协商）
├── templates-client.ts        # TemplatesClient（v8 Templates API）
├── skills/
│   ├── client.ts              # SkillsApiClient（技能 CRUD）
│   └── types.ts               # 技能 DTO 类型
├── skills-marketplace-api.ts  # 技能市场（公开，无需认证）
├── skills-marketplace-types.ts
├── user-skills-api.ts         # 用户技能管理（需 Bearer Token）
├── ratings-api.ts             # 评分 API
├── recommendations.ts         # 云端推荐引擎
├── notifications/
│   └── types.ts               # 通知 DTO（bind/notify/poll）
├── telemetry.ts               # 遥测上报（批量、fire-and-forget）
├── cache.ts                   # 内存缓存层（会话级）
├── retry.ts                   # 重试层（指数退避，最多 3 次）
├── errors.ts                  # 统一错误类型
└── dto.ts                     # 通用 DTO

src/services/cloud/
├── api-client.ts              # CloudApiClient 底层 HTTP
├── skills-sync.ts             # 技能文件云同步
├── agents-sync.ts             # Agent 云同步 + 市场
├── claude-md-sync.ts          # CLAUDE.md 云同步
├── hooks-sync.ts              # Hooks 云同步
├── plugin-recommendation.ts   # 插件推荐
└── auto-bootstrap.ts          # 自动引导
```

---

## 二、现有云功能清单

### 2.1 模板服务（Templates API）

**端点**: `https://api.claudehome.cn/api/v8/templates`

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取单个模板 | GET | `/api/v8/templates/{id}` | 按 ID 获取，支持语言参数 |
| 批量获取模板 | POST | `/api/v8/templates/batch` | 批量拉取，返回缓存命中统计 |
| 搜索模板 | GET | `/api/v8/templates` | 支持 query/type/category/tags/排序/分页 |

**模板类型**: `skill` / `mcp` / `agent` / `hook`

**模板字段**:
- 基础: `id`, `type`, `name_en`, `name_zh_cn`, `description_en/zh`, `category`, `tags`
- 内容: `template_content`, `content`
- 版本: `author`, `version`, `repository_url`, `npm_package`, `install_command`
- 统计: `download_count`, `rating_average`, `rating_count`
- 标志: `is_official`, `is_featured`, `is_verified`

**当前状态**: 客户端已实现，本地 fallback 已补充（`templates/agents/` 目录）

---

### 2.2 技能市场（Skills Marketplace）

**端点**: `https://api.claudehome.cn/api/v1`（公开，无需认证）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 浏览市场 | GET | `/skills/marketplace` | 分页列表，支持 category/tags/排序 |
| 搜索技能 | GET | `/skills/search` | 全文搜索 |
| 获取推荐 | GET | `/skills/suggestions` | 基于参数的推荐 |
| 获取热门 | GET | `/skills/trending` | 热门技能列表 |

**当前状态**: 客户端已实现（`skills-marketplace-api.ts`），有 5 分钟内存缓存，**无本地 fallback**

---

### 2.3 用户技能管理（User Skills API）

**端点**: `https://api.claudehome.cn/api/v1`（需 Bearer Token）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取已安装技能 | GET | `/users/skills` | 用户技能列表 |
| 安装技能 | POST | `/users/skills/install` | 从市场安装 |
| 卸载技能 | DELETE | `/users/skills/{id}` | 卸载 |
| 更新技能 | PUT | `/users/skills/{id}` | 更新到新版本 |
| 获取配额 | GET | `/users/skills/quota` | 技能数量配额 |
| 获取推荐 | GET | `/users/skills/recommendations` | 个性化推荐 |

**当前状态**: 客户端已实现（`user-skills-api.ts`），**无本地 fallback**

---

### 2.4 技能云同步（Skills Sync）

**端点**: `https://api.claudehome.cn/api/v1`（需认证）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 上传技能 | POST | `/skills` | 上传 SKILL.md 文件 |
| 下载技能 | GET | `/skills/{id}` | 下载技能内容 |
| 列出技能 | GET | `/skills` | 列出云端技能 |
| 删除技能 | DELETE | `/skills/{id}` | 删除云端技能 |

**同步机制**:
- 基于文件 hash（SHA-256）的冲突检测
- 同步状态持久化到 `~/.ccjk/skills-sync-state.json`
- 支持 `upload` / `download` / `bidirectional` 三种模式

**当前状态**: 服务已实现（`skills-sync.ts`），**需要云端 API 支持**

---

### 2.5 Agent 云同步与市场（Agents Sync）

**端点**: `https://api.claudehome.cn`（需认证）

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 上传 Agent | POST | `/agents` | 上传本地 Agent 定义 |
| 下载 Agent | GET | `/agents/{id}` | 下载 Agent |
| 搜索 Agent | GET | `/agents/search` | 搜索市场 Agent |
| 安装 Agent | POST | `/agents/install` | 从市场安装 |
| 获取统计 | GET | `/agents/{id}/stats` | 下载量/评分 |
| 版本管理 | GET | `/agents/{id}/versions` | 历史版本列表 |
| 团队共享 | POST | `/agents/{id}/share` | 共享给团队 |

**当前状态**: 服务已实现（`agents-sync.ts`），本地 fallback 使用 `src/data/agent-templates.json`，**需要云端 API 支持**

---

### 2.6 云端推荐引擎（Recommendations）

**端点**: `https://api.claudehome.cn/api/v1/analysis/projects`

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 项目分析 | POST | `/analysis/projects` | 上传项目依赖，返回 Agent/Skill 推荐 |
| 技能推荐 | — | — | 同上，从 recommendations 字段提取 |

**请求体**:
```json
{
  "projectRoot": "/path/to/project",
  "dependencies": { "react": "^18.0.0", "typescript": "^5.0.0" }
}
```

**当前状态**: 客户端已实现（`recommendations.ts`），失败时返回空数组触发本地 fallback

---

### 2.7 评分系统（Ratings API）

**端点**: `https://api.claudehome.cn/api/v1`

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取技能评分 | GET | `/skills/{id}/ratings` | 分页评分列表，支持排序 |
| 提交评分 | POST | `/skills/{id}/ratings` | 提交 1-5 星评分 + 评论 |

**当前状态**: 客户端已实现（`ratings-api.ts`），**无本地 fallback**

---

### 2.8 移动端通知系统（Notifications）

**端点**: 通过 `CloudApiGateway` 路由

| 接口 | 方法 | 路由 | 说明 |
|------|------|------|------|
| 绑定设备 | POST | `notifications.bind` → `/bind/use` | 绑定移动端设备，返回 deviceToken |
| 发送通知 | POST | `notifications.send` → `/notify` | 推送通知到移动端 |
| 轮询回复 | GET | `notifications.poll` → `/reply/poll` | 长轮询等待用户回复 |

**通知类型**: `info` / `success` / `warning` / `error`

**支持功能**: 通知标题/内容、任务 ID 追踪、Action 按钮（用户可点击回复）

**当前状态**: DTO 已定义（`notifications/types.ts`），服务已实现（`cloud-notification.ts`），**需要云端推送服务支持**

---

### 2.9 遥测系统（Telemetry）

**端点**: `https://api.claudehome.cn/api/v1/telemetry/installation`

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 上报使用数据 | POST | `/telemetry/installation` | 批量上报，fire-and-forget |

**策略**:
- 批量大小: 10 条/批
- 刷新间隔: 30 秒
- 超时: 5 秒（不阻塞主流程）
- 最多重试 3 次（指数退避）
- 静默失败（错误仅 debug 级别）
- 支持 `CCJK_TELEMETRY=false` 环境变量关闭

**当前状态**: 已实现（`telemetry.ts`），**需要云端接收端点**

---

### 2.10 健康检查（Health Check）

**端点**: `https://api.claudehome.cn/api/v1/health`

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| API 健康检查 | GET | `/health` | 检查云服务可用性 |

**当前状态**: 客户端已实现，`doctor` 命令中调用

---

### 2.11 其他同步服务

| 服务 | 文件 | 说明 | 状态 |
|------|------|------|------|
| CLAUDE.md 同步 | `claude-md-sync.ts` | 跨设备同步 CLAUDE.md | 已实现，需云端 |
| Hooks 同步 | `hooks-sync.ts` | 同步 Claude Code hooks 配置 | 已实现，需云端 |
| 插件推荐 | `plugin-recommendation.ts` | 基于项目类型推荐插件 | 已实现，需云端 |
| 自动引导 | `auto-bootstrap.ts` | 新用户自动配置引导 | 已实现，需云端 |

---

## 三、云服务功能缺口分析

### 3.1 已有客户端但云端未实现（或不确定）

| 功能 | 客户端文件 | 缺失的云端能力 | 优先级 |
|------|-----------|--------------|--------|
| 技能云同步 | `skills-sync.ts` | 技能文件存储、版本管理、冲突解决 | 高 |
| Agent 云同步 | `agents-sync.ts` | Agent 存储、版本管理、团队共享 | 高 |
| 移动端通知 | `cloud-notification.ts` | 推送服务（APNs/FCM）、设备绑定、长轮询 | 高 |
| 项目分析推荐 | `recommendations.ts` | 项目依赖分析引擎、推荐算法 | 中 |
| 个性化技能推荐 | `user-skills-api.ts` | 用户行为分析、推荐模型 | 中 |
| CLAUDE.md 同步 | `claude-md-sync.ts` | 文档存储、版本历史 | 中 |
| Hooks 同步 | `hooks-sync.ts` | Hooks 配置存储 | 低 |
| 遥测接收 | `telemetry.ts` | 事件接收、数据管道、分析看板 | 低 |

### 3.2 功能完整性矩阵

| 功能 | 客户端 | 云端 API | 本地 Fallback | 整体状态 |
|------|--------|---------|--------------|---------|
| 模板获取 | ✅ | ✅ | ✅ | 完整 |
| 技能市场浏览 | ✅ | ✅ | ❌ | 需 fallback |
| 用户技能管理 | ✅ | ✅ | ❌ | 需 fallback |
| 技能云同步 | ✅ | ❓ | ❌ | 需云端确认 |
| Agent 云同步 | ✅ | ❓ | ✅（本地模板） | 需云端确认 |
| 云端推荐 | ✅ | ❓ | ✅（本地过滤） | 需云端确认 |
| 评分系统 | ✅ | ✅ | ❌ | 需 fallback |
| 移动端通知 | ✅ | ❓ | ❌ | 需云端确认 |
| 遥测上报 | ✅ | ❓ | N/A | 需云端确认 |
| 健康检查 | ✅ | ✅ | N/A | 完整 |

---

## 四、需要补充的云服务能力

### 4.1 核心存储服务

**技能存储服务**
- 存储用户 SKILL.md 文件（按用户 ID 隔离）
- 版本历史（至少保留 10 个版本）
- 基于 SHA-256 的冲突检测
- 支持 public/private 权限控制
- 文件大小限制（建议 ≤ 500KB/文件）

**Agent 存储服务**
- 存储 Agent JSON 定义文件
- 版本管理与回滚
- 团队共享（基于 team_id）
- 发布到公开市场的审核流程

**配置同步服务**
- CLAUDE.md 文档存储（带版本历史）
- Hooks 配置存储
- 跨设备同步状态管理

### 4.2 推荐引擎

**项目分析 API**
- 接收项目依赖树（package.json / requirements.txt / go.mod 等）
- 识别技术栈（框架、语言、工具链）
- 返回相关 Agent 推荐列表（含 relevanceScore）
- 返回相关 Skill 推荐列表

**个性化推荐**
- 基于用户已安装技能的协同过滤
- 基于项目类型的内容推荐
- 热门/新增技能推送

### 4.3 移动端通知服务

**设备绑定**
- 接收绑定码（来自移动 App）
- 返回 deviceToken + deviceId
- 支持多设备绑定

**消息推送**
- 支持 APNs（iOS）和 FCM（Android）
- 通知类型: info/success/warning/error
- 支持 Action 按钮（用户可回复）
- 任务 ID 追踪

**长轮询回复**
- `GET /reply/poll?timeout=60000`
- 用户在移动端点击 Action 后，CLI 端收到回复
- 超时返回 `{ reply: null }`

### 4.4 认证与授权

**当前状态**: 部分接口使用 Bearer Token，但认证体系不完整

**需要补充**:
- 用户注册/登录流程（或 OAuth 接入）
- Token 颁发与刷新机制
- API Key 管理（用于 CLI 场景）
- 团队/组织权限模型

### 4.5 遥测数据管道

**接收端**
- `POST /api/v1/telemetry/installation` 接收批量事件
- 事件类型: `MetricType`（安装、使用、错误等）
- 幂等处理（防重复上报）

**数据处理**
- 事件存储（时序数据库）
- 匿名化处理
- 分析看板（安装量、活跃用户、功能使用率）

---

## 五、API 设计规范

### 5.1 统一响应格式

```typescript
interface CloudApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string        // 错误码，如 'NOT_FOUND', 'AUTH_FAILED'
  requestId?: string   // 用于追踪
}
```

### 5.2 错误码规范

| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| `AUTH_FAILED` | 401 | 认证失败 |
| `PERMISSION_DENIED` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `QUOTA_EXCEEDED` | 429 | 配额超限 |
| `SCHEMA_MISMATCH` | 422 | 请求格式错误 |
| `UNKNOWN_ERROR` | 500 | 服务器内部错误 |

### 5.3 版本策略

- `v1`: 核心 API（技能、用户、遥测、通知）
- `v8`: 模板 API（统一模板管理）
- Gateway 层自动协商版本，客户端无需感知

### 5.4 认证方式

```
Authorization: Bearer <token>
User-Agent: CCJK/8.2.0
```

---

## 六、离线能力与降级策略

### 6.1 当前降级状态

| 功能 | 离线可用 | 降级质量 | 说明 |
|------|---------|---------|------|
| 初始化配置 | ✅ | 好 | 所有模板本地内置 |
| 菜单导航 | ✅ | 好 | 无云依赖 |
| 健康检查 | ✅ | 好 | 基于文件系统 |
| 项目分析 | ✅ | 好 | 本地文件分析 |
| Agent 生成 | ✅ | 好 | 本地模板 |
| 技能推荐 | ⚠️ | 中 | 本地过滤（已修复） |
| Agent 推荐 | ⚠️ | 中 | 本地模板 fallback（已修复） |
| 技能市场 | ❌ | 无 | 需云端 |
| 云同步 | ❌ | 无 | 需云端 |
| 移动通知 | ❌ | 无 | 需云端 |

### 6.2 缓存策略现状与改进建议

**现状**: 仅有会话级内存缓存（`cache.ts`），进程退出即失效

**建议改进**:
- 添加磁盘缓存层（`~/.ccjk/cache/`）
- 模板数据缓存 TTL: 24 小时
- 市场数据缓存 TTL: 1 小时
- 推荐数据缓存 TTL: 6 小时
- 启动时预热缓存（后台异步）

---

## 七、待确认事项

1. **云端 API 实现状态**: `skills-sync`、`agents-sync`、`notifications`、`recommendations` 这四个服务的云端是否已实现？
2. **认证体系**: 用户如何获取 Bearer Token？是否有登录命令？
3. **技能市场审核**: 用户上传的技能是否需要人工审核？
4. **数据隐私**: 遥测数据收集范围和用户告知方式？
5. **配额策略**: 免费用户 vs 付费用户的技能数量/同步频率限制？
6. **团队功能**: Agent/Skill 团队共享的权限模型设计？
7. **API 域名统一**: 已统一为 `api.claudehome.cn`（主 API）+ `remote-api.claudehome.cn`（WebSocket/远程控制）
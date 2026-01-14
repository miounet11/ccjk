# CCJK v3 云服务升级方案

## 概述

本文档描述 CCJK v3 版本的云服务升级计划，包括：
1. 菜单按钮功能审计与修复
2. 插件市场云服务集成
3. MCP 市场云服务升级
4. Superpowers 云服务集成

---

## 1. 菜单按钮功能审计

### 1.1 当前菜单结构

#### 主菜单 (showCategorizedMenu)
| 选项 | 功能 | 状态 | 说明 |
|------|------|------|------|
| 1. 一键配置 | `init()` | ✅ 正常 | 完整初始化流程 |
| 2. 一键检查 | `oneClickCheckup()` | ✅ 正常 | 诊断 + 自动修复 |
| 3. 一键更新 | `oneClickUpdate()` | ✅ 正常 | 更新所有组件 |
| 4. 任务通知 | `notificationCommand()` | ✅ 正常 | 云通知服务 |
| 5. API 配置 | `configureApiFeature()` | ✅ 正常 | API 密钥配置 |
| 6. MCP 配置 | `configureMcpFeature()` | ✅ 正常 | MCP 服务配置 |
| 7. 默认模型 | `configureDefaultModelFeature()` | ✅ 正常 | 模型选择 |
| 8. 更多功能 | `showMoreFeaturesMenu()` | ✅ 正常 | 子菜单 |

#### 更多功能菜单 (showMoreFeaturesMenu)
| 选项 | 功能 | 状态 | 问题 |
|------|------|------|------|
| 1. CCR | `runCcrMenuFeature()` | ⚠️ 待验证 | 需要检查外部依赖 |
| 2. CCUsage | `runCcusageFeature()` | ⚠️ 待验证 | 需要检查外部依赖 |
| 3. Cometix | `runCometixMenuFeature()` | ⚠️ 待验证 | 需要检查外部依赖 |
| 4. Superpowers | `showSuperpowersMenu()` | ⚠️ 需升级 | 需要云服务集成 |
| 5. MCP 市场 | `showMcpMarketMenu()` | ⚠️ 需升级 | 需要云服务集成 |
| 6. 插件市场 | `showMarketplaceMenu()` | ⚠️ 需升级 | 需要云服务集成 |
| 7. AI 记忆 | `configureAiMemoryFeature()` | ✅ 正常 | |
| 8. 权限配置 | `configureEnvPermissionFeature()` | ✅ 正常 | |
| 9. 配置切换 | `showConfigSwitchMenu()` | ✅ 正常 | |
| 10. 上下文 | `showContextMenu()` | ✅ 正常 | |
| 11. 语言切换 | `changeScriptLanguageFeature()` | ✅ 正常 | |
| 12. 工具切换 | `handleCodeToolSwitch()` | ✅ 正常 | |
| 13. 诊断 | `doctor()` | ✅ 正常 | |
| 14. 工作区 | `workspaceDiagnostics()` | ✅ 正常 | |
| 15. 卸载 | `uninstall()` | ✅ 正常 | |

### 1.2 需要修复/升级的功能

#### 优先级 P0 - 核心功能
- [ ] **插件市场** - 需要对接 `claude-plugins-official` 仓库
- [ ] **MCP 市场** - 需要对接云端 MCP 服务列表
- [ ] **Superpowers** - 需要云端技能同步

#### 优先级 P1 - 外部工具集成
- [ ] **CCR** - 验证 ccr 工具安装和调用
- [ ] **CCUsage** - 验证 ccusage 工具安装和调用
- [ ] **Cometix** - 验证 cometix 工具安装和调用

---

## 2. 插件市场云服务集成

### 2.1 数据源

**官方插件仓库**: `https://github.com/anthropics/claude-plugins-official`

```
claude-plugins-official/
├── plugins/              # Anthropic 官方插件
├── external_plugins/     # 第三方社区插件
└── .claude-plugin/       # 插件元数据配置
```

### 2.2 插件结构

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json       # 插件元数据 (必需)
├── .mcp.json             # MCP 服务配置 (可选)
├── commands/             # 斜杠命令 (可选)
├── agents/               # Agent 定义 (可选)
├── skills/               # 技能定义 (可选)
└── README.md             # 文档
```

### 2.3 API 设计

#### 2.3.1 插件列表 API

```typescript
// GET /api/v1/plugins
interface PluginListResponse {
  success: boolean
  data: {
    plugins: CloudPlugin[]
    total: number
    page: number
    pageSize: number
  }
}

interface CloudPlugin {
  id: string
  name: Record<'zh-CN' | 'en', string>
  description: Record<'zh-CN' | 'en', string>
  category: PluginCategory
  version: string
  author: string
  downloads: number
  rating: number
  tags: string[]
  source: 'official' | 'community'
  repository: string
  size: number
  createdAt: string
  updatedAt: string
}
```

#### 2.3.2 插件搜索 API

```typescript
// GET /api/v1/plugins/search
interface PluginSearchParams {
  query?: string
  category?: PluginCategory
  tags?: string[]
  source?: 'official' | 'community' | 'all'
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}
```

#### 2.3.3 插件安装 API

```typescript
// POST /api/v1/plugins/{id}/install
interface PluginInstallRequest {
  pluginId: string
  version?: string
  scope: 'global' | 'project'
}

interface PluginInstallResponse {
  success: boolean
  data?: {
    installedPath: string
    version: string
    dependencies: string[]
  }
  error?: string
}
```

### 2.4 本地缓存策略

```typescript
interface PluginCache {
  version: string
  plugins: CloudPlugin[]
  lastUpdated: string
  expiresAt: string  // TTL: 1 hour
}

// 缓存位置: ~/.ccjk/cache/plugins.json
```

### 2.5 实现计划

```typescript
// src/cloud-plugins/official-registry.ts
export class OfficialPluginRegistry {
  private readonly REPO_URL = 'https://api.github.com/repos/anthropics/claude-plugins-official'

  async fetchPluginList(): Promise<CloudPlugin[]>
  async fetchPluginDetails(id: string): Promise<CloudPlugin>
  async downloadPlugin(id: string): Promise<PluginDownloadResult>
  async searchPlugins(params: PluginSearchParams): Promise<CloudPlugin[]>
}
```

---

## 3. MCP 市场云服务升级

### 3.1 当前状态

当前 MCP 市场使用硬编码的服务列表：

```typescript
// src/commands/mcp-market.ts
const MCP_SERVERS: McpServer[] = [
  // CCJK managed services
  ...MCP_SERVICE_CONFIGS.map(svc => ({...})),
  // External MCP servers (hardcoded)
  { name: 'Filesystem', ... },
  { name: 'GitHub', ... },
  // ...
]
```

### 3.2 升级方案

#### 3.2.1 云端 MCP 服务注册表

```typescript
// GET /api/v1/mcp/servers
interface McpServerListResponse {
  success: boolean
  data: {
    servers: McpServerInfo[]
    categories: McpCategory[]
    total: number
  }
}

interface McpServerInfo {
  id: string
  name: Record<'zh-CN' | 'en', string>
  description: Record<'zh-CN' | 'en', string>
  package: string
  category: McpCategory
  author: string
  version: string
  downloads: number
  rating: number
  verified: boolean
  requiresApiKey: boolean
  configSchema?: Record<string, unknown>
  repository?: string
  documentation?: string
}

type McpCategory =
  | 'core'        // 核心服务
  | 'dev'         // 开发工具
  | 'database'    // 数据库
  | 'automation'  // 自动化
  | 'search'      // 搜索
  | 'api'         // API 集成
  | 'communication' // 通信
  | 'ai'          // AI 工具
  | 'ccjk'        // CCJK 管理
```

#### 3.2.2 MCP 服务安装流程

```
用户选择安装 MCP 服务
        ↓
检查是否为 CCJK 管理服务
        ↓
    ┌───┴───┐
    ↓       ↓
  是       否
    ↓       ↓
使用内置   显示手动
安装器     安装指南
    ↓       ↓
配置 API   提供配置
密钥(如需) 模板
    ↓       ↓
写入 MCP   用户手动
配置文件   配置
    ↓       ↓
    └───┬───┘
        ↓
   重启提示
```

#### 3.2.3 实现计划

```typescript
// src/mcp-marketplace/cloud-registry.ts
export class McpCloudRegistry {
  private readonly API_URL = 'https://api.api.claudehome.cn/v1/mcp'

  async fetchServerList(): Promise<McpServerInfo[]>
  async fetchCategories(): Promise<McpCategory[]>
  async searchServers(query: string): Promise<McpServerInfo[]>
  async getTrending(limit: number): Promise<McpServerInfo[]>
  async getServerDetails(id: string): Promise<McpServerInfo>
}
```

---

## 4. Superpowers 云服务集成

### 4.1 当前状态

Superpowers 目前支持两种安装方式：
- NPM 安装: `installSuperpowers()`
- Git 安装: `installSuperpowersViaGit()`

### 4.2 升级方案

#### 4.2.1 云端技能同步

```typescript
// GET /api/v1/superpowers/skills
interface SuperpowersSkillsResponse {
  success: boolean
  data: {
    skills: SuperpowerSkill[]
    version: string
    lastUpdated: string
  }
}

interface SuperpowerSkill {
  id: string
  name: Record<'zh-CN' | 'en', string>
  description: Record<'zh-CN' | 'en', string>
  category: string
  command: string
  icon: string
  enabled: boolean
  premium: boolean
}
```

#### 4.2.2 技能市场

```typescript
// GET /api/v1/superpowers/marketplace
interface SkillMarketplaceResponse {
  success: boolean
  data: {
    featured: SuperpowerSkill[]
    categories: SkillCategory[]
    trending: SuperpowerSkill[]
    new: SuperpowerSkill[]
  }
}
```

#### 4.2.3 实现计划

```typescript
// src/utils/superpowers/cloud-sync.ts
export class SuperpowersCloudSync {
  async syncSkills(): Promise<SyncResult>
  async fetchAvailableSkills(): Promise<SuperpowerSkill[]>
  async installSkill(skillId: string): Promise<InstallResult>
  async updateSkills(): Promise<UpdateResult>
}
```

---

## 5. 云服务架构

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      CCJK CLI Client                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Plugin      │  │ MCP         │  │ Superpowers         │  │
│  │ Manager     │  │ Marketplace │  │ Manager             │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │            │
│  ┌──────┴────────────────┴─────────────────────┴──────────┐ │
│  │              Cloud Service Client Layer                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │ API Client  │  │ Cache       │  │ Offline Mode    │ │ │
│  │  │ (HTTP/WS)   │  │ Manager     │  │ Support         │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CCJK Cloud Services                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Plugin      │  │ MCP         │  │ Superpowers         │  │
│  │ Registry    │  │ Registry    │  │ Registry            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ GitHub      │  │ Analytics   │  │ User                │  │
│  │ Integration │  │ Service     │  │ Preferences         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 API 端点汇总

| 服务 | 端点 | 方法 | 描述 |
|------|------|------|------|
| 插件 | `/api/v1/plugins` | GET | 获取插件列表 |
| 插件 | `/api/v1/plugins/search` | GET | 搜索插件 |
| 插件 | `/api/v1/plugins/{id}` | GET | 获取插件详情 |
| 插件 | `/api/v1/plugins/{id}/download` | GET | 下载插件 |
| MCP | `/api/v1/mcp/servers` | GET | 获取 MCP 服务列表 |
| MCP | `/api/v1/mcp/servers/search` | GET | 搜索 MCP 服务 |
| MCP | `/api/v1/mcp/servers/trending` | GET | 热门 MCP 服务 |
| MCP | `/api/v1/mcp/categories` | GET | 获取分类 |
| Superpowers | `/api/v1/superpowers/skills` | GET | 获取技能列表 |
| Superpowers | `/api/v1/superpowers/marketplace` | GET | 技能市场 |
| Superpowers | `/api/v1/superpowers/sync` | POST | 同步技能 |

### 5.3 缓存策略

| 数据类型 | TTL | 存储位置 |
|----------|-----|----------|
| 插件列表 | 1 小时 | `~/.ccjk/cache/plugins.json` |
| MCP 服务列表 | 1 小时 | `~/.ccjk/cache/mcp-servers.json` |
| Superpowers 技能 | 30 分钟 | `~/.ccjk/cache/superpowers.json` |
| 用户偏好 | 永久 | `~/.ccjk/config/preferences.json` |

### 5.4 离线模式

当网络不可用时：
1. 使用本地缓存数据
2. 显示缓存时间戳
3. 禁用需要网络的操作（安装、更新）
4. 提供手动刷新选项

---

## 6. 实现路线图

### Phase 1: 基础设施 (Week 1)
- [ ] 统一云服务客户端基类
- [ ] 缓存管理器升级
- [ ] 离线模式支持

### Phase 2: 插件市场 (Week 2)
- [ ] 对接 claude-plugins-official
- [ ] 插件搜索和浏览
- [ ] 插件安装流程

### Phase 3: MCP 市场 (Week 3)
- [ ] 云端 MCP 注册表
- [ ] 动态服务列表
- [ ] 一键安装优化

### Phase 4: Superpowers (Week 4)
- [ ] 云端技能同步
- [ ] 技能市场
- [ ] 自动更新

### Phase 5: 集成测试 (Week 5)
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 文档更新

---

## 7. 技术债务清理

### 7.1 需要移除的硬编码

```typescript
// src/commands/mcp-market.ts - 移除硬编码服务列表
const MCP_SERVERS: McpServer[] = [...]  // → 改为云端获取

// src/cloud-plugins/cloud-client.ts - 移除 mock 数据
export const MOCK_PLUGINS: CloudPlugin[] = [...]  // → 改为真实 API
```

### 7.2 需要统一的接口

```typescript
// 统一的云服务响应格式
interface CloudResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    total?: number
    page?: number
    pageSize?: number
    cached?: boolean
    cachedAt?: string
  }
}
```

---

## 8. 安全考虑

### 8.1 插件验证
- 官方插件: 自动信任
- 社区插件: 显示警告，需用户确认
- 未验证插件: 强制确认 + 沙箱运行

### 8.2 API 安全
- HTTPS 强制
- API Key 认证（可选）
- 请求签名（高级功能）

### 8.3 本地存储
- 敏感数据加密
- 配置文件权限检查
- 定期清理过期缓存

---

## 附录 A: 现有云服务代码位置

| 模块 | 文件路径 |
|------|----------|
| 云插件客户端 | `src/cloud-plugins/cloud-client.ts` |
| 云插件缓存 | `src/cloud-plugins/cache.ts` |
| 云插件管理器 | `src/cloud-plugins/manager.ts` |
| 推荐引擎 | `src/cloud-plugins/recommendation-engine.ts` |
| MCP 市场 | `src/commands/mcp-market.ts` |
| MCP 安装器 | `src/utils/mcp-installer.ts` |
| Superpowers | `src/utils/superpowers/index.ts` |
| 插件市场类型 | `src/mcp-marketplace/types.ts` |

## 附录 B: 相关常量

```typescript
// src/constants.ts
export const CCJK_CLOUD_PLUGINS_API = 'https://api.api.claudehome.cn/v1/plugins'
export const CCJK_CLOUD_PLUGINS_DIR = join(CCJK_DIR, 'cloud-plugins')
export const CCJK_CLOUD_PLUGINS_CACHE_DIR = join(CCJK_DIR, 'cache')
export const CLOUD_PLUGINS_CACHE_TTL = 3600000 // 1 hour
```

# C-008: 统一技能同步客户端

## 任务概述

统一 skill sync/marketplace 请求样式和认证头，确保 Skill list/get/upload/download 使用相同的认证和错误处理约定。

## 完成状态

✅ **已完成** - 2024-02-24

## 实现内容

### 1. 新建技能 DTO 类型

**文件**: `src/cloud-client/skills/types.ts`

定义了统一的技能 API 类型：

- `SkillPrivacy`: 技能隐私级别 (public, private, team, unlisted)
- `SkillCategory`: 技能分类（字符串类型，灵活扩展）
- `SkillMetadata`: 技能元数据（作者、描述、标签等）
- `SkillListRequest/Response`: 列表请求/响应
- `SkillGetRequest/Response`: 获取请求/响应
- `SkillUploadRequest/Response`: 上传请求/响应
- `SkillDownloadRequest/Response`: 下载请求/响应
- `SkillUpdateRequest/Response`: 更新请求/响应
- `SkillDeleteRequest/Response`: 删除请求/响应

**特性**:
- 完整的类型定义
- 响应验证函数
- 与现有 CloudSkill 类型兼容

### 2. 统一技能客户端

**文件**: `src/cloud-client/skills/client.ts`

创建了 `SkillsApiClient` 类，提供统一的技能操作接口：

```typescript
class SkillsApiClient {
  async list(request: SkillListRequest): Promise<CloudApiResponse<SkillListResponse>>
  async get(request: SkillGetRequest): Promise<CloudApiResponse<SkillGetResponse>>
  async upload(request: SkillUploadRequest): Promise<CloudApiResponse<SkillUploadResponse>>
  async download(request: SkillDownloadRequest): Promise<CloudApiResponse<SkillDownloadResponse>>
  async update(request: SkillUpdateRequest): Promise<CloudApiResponse<SkillUpdateResponse>>
  async delete(request: SkillDeleteRequest): Promise<CloudApiResponse<SkillDeleteResponse>>
}
```

**特性**:
- 使用 CloudApiGateway 进行统一认证
- 使用 CloudError 进行统一错误处理
- 请求参数验证
- 响应格式验证
- 完整的 TypeScript 类型支持

### 3. Gateway 路由配置

**文件**: `src/cloud-client/gateway.ts`

已有的技能路由：
- `skills.list` → `/v1/skills/list`
- `skills.upload` → `/v1/skills/upload`
- `skills.download` → `/v1/skills/download`

### 4. 重构现有技能同步服务

**文件**: `src/services/cloud/skills-sync.ts`

更新了以下函数以使用新的统一客户端：

- `listCloudSkills()`: 使用 SkillsApiClient.list()
- `getCloudSkill()`: 使用 SkillsApiClient.get()
- `uploadSkill()`: 使用 SkillsApiClient.upload()
- `updateCloudSkill()`: 使用 SkillsApiClient.update()
- `deleteCloudSkill()`: 使用 SkillsApiClient.delete()

**改进**:
- 统一的认证令牌管理
- 统一的错误处理
- 类型安全的请求/响应转换
- 与现有 CloudSkill 类型兼容

### 5. 导出模块

**文件**: `src/cloud-client/skills/index.ts`

导出所有技能相关的类型和客户端：

```typescript
export * from './types'
export { SkillsApiClient, createSkillsClient } from './client'
```

**文件**: `src/cloud-client/index.ts`

在主模块中导出技能 API：

```typescript
export * from './skills/index.js'
```

### 6. 综合测试

**文件**: `tests/cloud-client/skills.test.ts`

创建了 20 个测试用例，覆盖：

#### List Skills (4 tests)
- ✅ 成功列出技能
- ✅ 使用过滤器列出技能
- ✅ 无效响应格式错误处理
- ✅ 网络错误处理

#### Get Skill (4 tests)
- ✅ 成功获取技能
- ✅ 获取指定版本的技能
- ✅ 验证技能 ID
- ✅ 处理未找到错误

#### Upload Skill (3 tests)
- ✅ 成功上传技能
- ✅ 验证必填字段
- ✅ 处理认证错误

#### Download Skill (2 tests)
- ✅ 成功下载技能
- ✅ 验证技能 ID

#### Update Skill (2 tests)
- ✅ 成功更新技能
- ✅ 验证技能 ID

#### Delete Skill (2 tests)
- ✅ 成功删除技能
- ✅ 验证技能 ID

#### Error Handling (3 tests)
- ✅ 处理速率限制错误
- ✅ 处理服务器错误
- ✅ 包装未知错误为 CloudError

**测试结果**: ✅ 20/20 通过

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (src/services/cloud/skills-sync.ts)                       │
│  - listCloudSkills()                                        │
│  - getCloudSkill()                                          │
│  - uploadSkill()                                            │
│  - updateCloudSkill()                                       │
│  - deleteCloudSkill()                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Unified Skills API Client                      │
│  (src/cloud-client/skills/client.ts)                       │
│  - SkillsApiClient                                          │
│    - list()                                                 │
│    - get()                                                  │
│    - upload()                                               │
│    - download()                                             │
│    - update()                                               │
│    - delete()                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  CloudApiGateway                            │
│  (src/cloud-client/gateway.ts)                             │
│  - Unified authentication (Bearer token)                    │
│  - Route mapping (skills.list, skills.upload, etc.)        │
│  - Version negotiation (v1/v8 fallback)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  CloudApiClient                             │
│  (src/services/cloud/api-client.ts)                        │
│  - HTTP request/response handling                           │
│  - Timeout management                                       │
│  - Retry logic                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Cloud API Server                           │
│  - https://api.claudehome.cn/v1/skills/*                   │
└─────────────────────────────────────────────────────────────┘
```

## 统一认证策略

### 认证流程

1. **令牌存储**: `~/.ccjk/cloud-token.json`
   ```json
   {
     "deviceToken": "your-bearer-token"
   }
   ```

2. **令牌获取**: `getAuthToken()` 函数从存储中读取

3. **Gateway 配置**: 创建 Gateway 时设置 authToken
   ```typescript
   const gateway = createGateway({
     authToken: token,
     timeout: 30000,
   })
   ```

4. **自动注入**: Gateway 自动在所有请求中添加 `Authorization: Bearer <token>` 头

### 统一错误处理

所有技能 API 使用 CloudError 进行错误处理：

```typescript
try {
  const response = await client.list()
  if (!response.success) {
    // Handle API error
  }
} catch (error) {
  if (error instanceof CloudError) {
    // Structured error with code, message, context
    console.error(error.code, error.message)
  }
}
```

**错误代码**:
- `AUTH_ERROR`: 认证失败 (401/403)
- `RATE_LIMIT`: 速率限制 (429)
- `NOT_FOUND`: 资源未找到 (404)
- `VALIDATION_ERROR`: 请求验证失败
- `SCHEMA_MISMATCH`: 响应格式不匹配
- `NETWORK_ERROR`: 网络连接错误
- `TIMEOUT`: 请求超时
- `SERVER_ERROR`: 服务器错误 (5xx)
- `UNKNOWN_ERROR`: 未知错误

## 验收标准检查

### ✅ Skill list/get/upload/download 使用相同的认证和错误处理约定

- ✅ 所有操作通过 CloudApiGateway 统一认证
- ✅ 所有操作使用 CloudError 统一错误处理
- ✅ 所有操作使用相同的 Bearer token 认证头

### ✅ 统一的请求/响应格式

- ✅ 定义了完整的 DTO 类型
- ✅ 请求参数验证
- ✅ 响应格式验证
- ✅ 类型安全的转换

### ✅ 集成到 CloudApiGateway

- ✅ 技能路由已在 Gateway 中配置
- ✅ SkillsApiClient 使用 Gateway 进行所有请求
- ✅ 支持版本协商和回退

## 依赖关系

### 已完成的依赖

- ✅ C-001: 端点配置 (CLOUD_ENDPOINTS)
- ✅ C-002: Gateway (CloudApiGateway)
- ✅ C-005: 错误处理 (CloudError, CloudErrorFactory)

### 影响的模块

- `src/services/cloud/skills-sync.ts`: 使用新的统一客户端
- `src/cloud-client/user-skills-api.ts`: 可以迁移到使用统一客户端
- `src/cloud-client/skills-marketplace-api.ts`: 可以迁移到使用统一客户端

## 文件清单

### 新建文件

1. `src/cloud-client/skills/types.ts` (370 行)
   - 技能 API 类型定义
   - 响应验证函数

2. `src/cloud-client/skills/client.ts` (450 行)
   - SkillsApiClient 类
   - 统一的技能操作接口

3. `src/cloud-client/skills/index.ts` (30 行)
   - 模块导出

4. `tests/cloud-client/skills.test.ts` (650 行)
   - 20 个测试用例
   - 完整的功能覆盖

### 修改文件

1. `src/services/cloud/skills-sync.ts`
   - 重构为使用 SkillsApiClient
   - 统一认证和错误处理

2. `src/cloud-client/index.ts`
   - 导出技能 API 模块

## 测试结果

```bash
✓ tests/cloud-client/skills.test.ts (20 tests) 4ms

Test Files  1 passed (1)
     Tests  20 passed (20)
  Start at  07:34:26
  Duration  134ms
```

### 类型检查

```bash
✓ pnpm typecheck
# 所有技能相关的类型错误已修复
```

### 构建测试

```bash
✓ pnpm build
# 构建成功，无错误
```

## 使用示例

### 基本使用

```typescript
import { createGateway } from './cloud-client/gateway'
import { createSkillsClient } from './cloud-client/skills'

// 创建 Gateway
const gateway = createGateway({
  authToken: 'your-bearer-token',
  timeout: 30000,
})

// 创建技能客户端
const client = createSkillsClient(gateway)

// 列出技能
const listResponse = await client.list({
  privacy: 'public',
  page: 1,
  pageSize: 20,
})

if (listResponse.success) {
  console.log('Skills:', listResponse.data.skills)
}

// 上传技能
const uploadResponse = await client.upload({
  name: 'my-skill',
  version: '1.0.0',
  content: '# My Skill\n\nDescription...',
  metadata: {
    author: 'me',
    description: 'A useful skill',
    tags: ['productivity'],
    category: 'development',
  },
  privacy: 'private',
  checksum: 'abc123',
})

// 下载技能
const downloadResponse = await client.download({
  skillId: 'my-skill',
  version: '1.0.0',
})
```

### 错误处理

```typescript
import { CloudError, CloudErrorCode } from './cloud-client/errors'

try {
  const response = await client.upload(request)

  if (!response.success) {
    console.error('Upload failed:', response.error)
    return
  }

  console.log('Uploaded:', response.data.skill)
} catch (error) {
  if (error instanceof CloudError) {
    switch (error.code) {
      case CloudErrorCode.AUTH_ERROR:
        console.error('Authentication failed')
        break
      case CloudErrorCode.RATE_LIMIT:
        console.error('Rate limit exceeded')
        break
      case CloudErrorCode.VALIDATION_ERROR:
        console.error('Invalid request:', error.message)
        break
      default:
        console.error('Error:', error.message)
    }
  }
}
```

## 后续改进建议

### 1. 迁移其他技能 API

可以将以下模块迁移到使用统一客户端：

- `src/cloud-client/user-skills-api.ts`
- `src/cloud-client/skills-marketplace-api.ts`

### 2. 添加缓存支持

```typescript
import { CachedCloudClient } from './cloud-client/cache'

const cachedClient = new CachedCloudClient(client, cache)
```

### 3. 添加重试逻辑

```typescript
import { RetryableCloudClient } from './cloud-client/retry'

const retryableClient = new RetryableCloudClient(client)
```

### 4. 批量操作支持

添加批量上传/下载功能：

```typescript
interface BatchUploadRequest {
  skills: SkillUploadRequest[]
}

interface BatchUploadResponse {
  results: SkillUploadResponse[]
  succeeded: number
  failed: number
}
```

## 总结

C-008 任务已成功完成，实现了统一的技能同步客户端，具有以下特点：

1. **统一认证**: 所有技能 API 使用相同的 Bearer token 认证
2. **统一错误处理**: 使用 CloudError 进行结构化错误处理
3. **类型安全**: 完整的 TypeScript 类型定义和验证
4. **测试覆盖**: 20 个测试用例，100% 通过
5. **向后兼容**: 与现有 CloudSkill 类型完全兼容
6. **可扩展**: 易于添加新的技能操作

该实现为后续的技能市场和用户技能管理功能提供了坚实的基础。

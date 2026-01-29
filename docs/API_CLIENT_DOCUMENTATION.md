# Skills Marketplace API 客户端接口文档

**版本**: v1.0.0  
**基础URL**: `https://api.claudehome.cn/api/v1`  
**文档更新**: 2026-01-29

---

## 📋 快速导航

| 模块 | 接口数 | 说明 |
|------|--------|------|
| [认证](#认证) | - | Token 认证说明 |
| [技能市场](#1-技能市场列表) | 1 | 浏览技能 |
| [搜索](#2-搜索技能) | 3 | 搜索、建议、热门 |
| [推荐](#5-个性化推荐) | 1 | 智能推荐 |
| [用户技能](#6-用户技能列表) | 4 | 安装管理 |
| [评价](#10-技能评价列表) | 2 | 评分评论 |

---

## 🔐 认证

### 认证方式

```http
Authorization: Bearer {token}
```

### 需要认证的接口

- ✅ 用户技能管理（安装/卸载/配置）
- ✅ 发表评价
- ✅ 个性化推荐

### 无需认证的接口

- ❌ 技能市场列表
- ❌ 搜索功能
- ❌ 查看评价

---

## 📦 通用格式

### 成功响应

```json
{
  "success": true,
  "data": {}
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

### 错误码

| 错误码 | 状态码 | 说明 |
|--------|--------|------|
| `UNAUTHORIZED` | 401 | 未登录 |
| `QUOTA_EXCEEDED` | 400 | 配额已满 |
| `ALREADY_INSTALLED` | 400 | 已安装 |
| `NOT_FOUND` | 404 | 不存在 |

---

## 📚 接口列表

### 1. 技能市场列表

**GET** `/skills/marketplace`

获取技能列表，支持分页、筛选、排序。

#### 请求参数

```typescript
interface MarketplaceParams {
  page?: number;        // 页码，默认 1
  limit?: number;       // 每页数量，默认 20，最大 100
  category?: string;    // 分类筛选
  provider?: string;    // 提供商筛选
  sort?: 'installs' | 'stars' | 'rating' | 'recent' | 'name';
  isOfficial?: boolean; // 仅官方技能
  isTrending?: boolean; // 仅热门技能
}
```

#### 分类列表

- `frontend` - 前端开发
- `backend` - 后端开发
- `ai-tools` - AI 工具
- `documentation` - 文档处理
- `testing` - 测试工具
- `devops` - DevOps
- `marketing` - 营销工具
- `design` - 设计工具
- `productivity` - 效率工具
- `other` - 其他

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": "skill_vercel_labs_vercel_react_best_practices",
        "name": "vercel-react-best-practices",
        "descriptionEn": "Best practices for React",
        "category": "frontend",
        "tags": ["react", "vercel"],
        "provider": "vercel-labs",
        "stars": 17553,
        "installCount": 63800,
        "ratingAvg": 4.8,
        "ratingCount": 156,
        "isOfficial": true,
        "isTrending": true,
        "trigger": "/vercel-react-best-practices"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 73,
      "totalPages": 4,
      "hasNext": true
    },
    "filters": {
      "categories": [{"name": "frontend", "count": 16}],
      "providers": [{"name": "vercel-labs", "count": 8}]
    }
  }
}
```

---

### 2. 搜索技能

**GET** `/skills/search`

全文搜索技能。

#### 请求参数

```typescript
interface SearchParams {
  q: string;           // 搜索关键词（必填，≥2字符）
  category?: string;   // 分类筛选
  provider?: string;   // 提供商筛选
  limit?: number;      // 返回数量，默认 20，最大 50
  offset?: number;     // 偏移量，默认 0
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "skillId": "skill_vercel_labs_vercel_react_best_practices",
        "name": "vercel-react-best-practices",
        "descriptionEn": "Best practices for React",
        "category": "frontend",
        "stars": 17553,
        "installCount": 63800,
        "ratingAvg": 4.8,
        "relevanceScore": 0.95
      }
    ],
    "total": 5,
    "query": "react"
  }
}
```

---

### 3. 搜索建议

**GET** `/skills/search/suggestions`

获取搜索自动补全建议。

#### 请求参数

```typescript
interface SuggestionsParams {
  q: string;      // 搜索前缀（必填，≥1字符）
  limit?: number; // 返回数量，默认 10，最大 20
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "react",
        "type": "keyword",
        "count": 12
      },
      {
        "text": "react-best-practices",
        "type": "skill",
        "skillId": "skill_vercel_labs_vercel_react_best_practices"
      }
    ]
  }
}
```

---

### 4. 热门搜索

**GET** `/skills/search/trending`

获取热门搜索关键词。

#### 请求参数

```typescript
interface TrendingParams {
  limit?: number; // 返回数量，默认 10，最大 50
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "trending": [
      {
        "keyword": "react",
        "searchCount": 2340,
        "trend": "up",
        "changePercent": 15.5
      }
    ]
  }
}
```

---

### 5. 个性化推荐

**GET** `/skills/recommendations` 🔐

基于用户已安装技能推荐相关技能。

#### 请求参数

```typescript
interface RecommendationsParams {
  userId: string;              // 用户ID（必填）
  limit?: number;              // 返回数量，默认 10，最大 50
  excludeInstalled?: boolean;  // 排除已安装，默认 true
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "skillId": "skill_vercel_labs_next_best_practices",
        "name": "next-best-practices",
        "descriptionEn": "Best practices for Next.js",
        "category": "frontend",
        "stars": 21308,
        "ratingAvg": 4.9,
        "reason": "基于您使用的 react 技能推荐",
        "score": 0.92
      }
    ],
    "total": 10,
    "basedOn": ["vercel-react-best-practices"]
  }
}
```

---

### 6. 用户技能列表

**GET** `/users/{userId}/skills` 🔐

获取用户已安装的技能列表。

#### 路径参数

- `userId`: 用户ID

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": "skill_vercel_labs_vercel_react_best_practices",
        "name": "vercel-react-best-practices",
        "installedAt": "2026-01-20T10:30:00Z",
        "lastUsedAt": "2026-01-29T08:15:00Z",
        "usageCount": 45,
        "isEnabled": true,
        "config": {}
      }
    ],
    "total": 8,
    "quota": {
      "used": 8,
      "limit": 10,
      "tier": "free"
    }
  }
}
```

---

### 7. 安装技能

**POST** `/users/{userId}/skills` 🔐

为用户安装指定技能。

#### 路径参数

- `userId`: 用户ID

#### 请求体

```typescript
interface InstallSkillRequest {
  skillId: string;   // 技能ID（必填）
  userTier: 'free' | 'pro' | 'enterprise';
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skillId": "skill_vercel_labs_find_skills",
    "installedAt": "2026-01-29T10:30:00Z",
    "quota": {
      "used": 9,
      "limit": 10,
      "remaining": 1
    }
  }
}
```

#### 错误示例

```json
{
  "success": false,
  "error": "已达到免费版配额上限（10个技能）",
  "code": "QUOTA_EXCEEDED",
  "quota": {
    "used": 10,
    "limit": 10,
    "tier": "free"
  }
}
```

---

### 8. 卸载技能

**DELETE** `/users/{userId}/skills/{skillId}` 🔐

卸载指定技能。

#### 路径参数

- `userId`: 用户ID
- `skillId`: 技能ID

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skillId": "skill_vercel_labs_find_skills",
    "uninstalledAt": "2026-01-29T10:35:00Z",
    "quota": {
      "used": 8,
      "limit": 10
    }
  }
}
```

---

### 9. 更新技能配置

**PATCH** `/users/{userId}/skills/{skillId}` 🔐

更新技能的启用状态或配置。

#### 路径参数

- `userId`: 用户ID
- `skillId`: 技能ID

#### 请求体

```typescript
interface UpdateSkillRequest {
  isEnabled?: boolean;  // 是否启用
  config?: object;      // 配置对象
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skillId": "skill_vercel_labs_vercel_react_best_practices",
    "isEnabled": false,
    "config": {},
    "updatedAt": "2026-01-29T10:40:00Z"
  }
}
```

---

### 10. 技能评价列表

**GET** `/skills/{skillId}/ratings`

获取技能的评价列表。

#### 路径参数

- `skillId`: 技能ID

#### 请求参数

```typescript
interface RatingsParams {
  page?: number;   // 页码，默认 1
  limit?: number;  // 每页数量，默认 20，最大 50
  sort?: 'recent' | 'helpful' | 'rating';
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 1,
        "userId": "user_123",
        "userName": "张三",
        "rating": 5,
        "review": "非常好用，推荐！",
        "helpful": 23,
        "createdAt": "2026-01-25T14:20:00Z"
      }
    ],
    "summary": {
      "avgRating": 4.8,
      "totalCount": 156,
      "distribution": {
        "5": 120,
        "4": 25,
        "3": 8,
        "2": 2,
        "1": 1
      }
    },
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

### 11. 发表评价

**POST** `/skills/{skillId}/ratings` 🔐

为技能发表评价。

#### 路径参数

- `skillId`: 技能ID

#### 请求体

```typescript
interface CreateRatingRequest {
  userId: string;    // 用户ID（必填）
  rating: number;    // 评分 1-5（必填）
  review?: string;   // 评论内容（可选）
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 157,
    "skillId": "skill_vercel_labs_vercel_react_best_practices",
    "userId": "user_123",
    "rating": 5,
    "review": "非常好用！",
    "createdAt": "2026-01-29T10:45:00Z"
  }
}
```

---

## 📊 数据模型

### Skill（技能）

```typescript
interface Skill {
  skillId: string;              // 技能唯一ID
  name: string;                 // 技能名称
  slug: string;                 // URL友好名称
  nameZh: string | null;        // 中文名称
  descriptionEn: string;        // 英文描述
  descriptionZh: string | null; // 中文描述
  repo: string;                 // GitHub仓库
  repoUrl: string;              // 仓库URL
  stars: number;                // GitHub星标数
  installCount: number;         // 全局安装数
  localInstallCount: number;    // 本地安装数
  category: string;             // 分类
  tags: string[];               // 标签数组
  provider: string;             // 提供商
  isOfficial: boolean;          // 是否官方
  isVerified: boolean;          // 是否认证
  isTrending: boolean;          // 是否热门
  trendingRank: number | null;  // 热门排名
  trigger: string;              // 触发命令
  aliases: string[];            // 别名数组
  installCommand: string;       // 安装命令
  supportedAgents: string[];    // 支持的Agent
  ratingAvg: number;            // 平均评分
  ratingCount: number;          // 评价数量
  searchCount: number;          // 搜索次数
  status: string;               // 状态
  metadata: {
    language: string;           // 编程语言
    license: string;            // 许可证
    topics: string[];           // GitHub主题
    forks: number;              // Fork数
    lastUpdated: string;        // 最后更新时间
  };
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
}
```

### UserSkill（用户技能）

```typescript
interface UserSkill {
  skillId: string;       // 技能ID
  name: string;          // 技能名称
  installedAt: string;   // 安装时间
  lastUsedAt: string;    // 最后使用时间
  usageCount: number;    // 使用次数
  isEnabled: boolean;    // 是否启用
  config: object;        // 配置对象
}
```

### Rating（评价）

```typescript
interface Rating {
  id: number;            // 评价ID
  userId: string;        // 用户ID
  userName: string;      // 用户名
  skillId: string;       // 技能ID
  rating: number;        // 评分 1-5
  review: string | null; // 评论内容
  helpful: number;       // 有用数
  createdAt: string;     // 创建时间
  updatedAt: string;     // 更新时间
}
```

### Quota（配额）

```typescript
interface Quota {
  used: number;          // 已使用
  limit: number;         // 总限制
  remaining: number;     // 剩余
  tier: 'free' | 'pro' | 'enterprise';
}
```

---

## 💻 客户端集成示例

### TypeScript/JavaScript

```typescript
class SkillsMarketplaceClient {
  private baseURL = 'https://api.claudehome.cn/api/v1';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  // 获取技能列表
  async getSkills(params: MarketplaceParams) {
    const query = new URLSearchParams(params as any);
    const response = await fetch(
      `${this.baseURL}/skills/marketplace?${query}`
    );
    return response.json();
  }

  // 搜索技能
  async searchSkills(query: string, params?: SearchParams) {
    const searchParams = new URLSearchParams({ q: query, ...params } as any);
    const response = await fetch(
      `${this.baseURL}/skills/search?${searchParams}`
    );
    return response.json();
  }

  // 安装技能
  async installSkill(userId: string, skillId: string, userTier: string) {
    const response = await fetch(
      `${this.baseURL}/users/${userId}/skills`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ skillId, userTier }),
      }
    );
    return response.json();
  }

  // 获取用户技能
  async getUserSkills(userId: string) {
    const response = await fetch(
      `${this.baseURL}/users/${userId}/skills`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );
    return response.json();
  }

  // 发表评价
  async rateSkill(skillId: string, userId: string, rating: number, review?: string) {
    const response = await fetch(
      `${this.baseURL}/skills/${skillId}/ratings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ userId, rating, review }),
      }
    );
    return response.json();
  }
}

// 使用示例
const client = new SkillsMarketplaceClient('your_token_here');

// 获取前端技能
const skills = await client.getSkills({
  category: 'frontend',
  sort: 'installs',
  limit: 20,
});

// 搜索React相关技能
const results = await client.searchSkills('react', {
  category: 'frontend',
});

// 安装技能
const install = await client.installSkill(
  'user_123',
  'skill_vercel_labs_find_skills',
  'free'
);
```

### Python

```python
import requests
from typing import Optional, Dict, Any

class SkillsMarketplaceClient:
    def __init__(self, token: str):
        self.base_url = 'https://api.claudehome.cn/api/v1'
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_skills(self, **params) -> Dict[str, Any]:
        """获取技能列表"""
        response = requests.get(
            f'{self.base_url}/skills/marketplace',
            params=params
        )
        return response.json()
    
    def search_skills(self, query: str, **params) -> Dict[str, Any]:
        """搜索技能"""
        params['q'] = query
        response = requests.get(
            f'{self.base_url}/skills/search',
            params=params
        )
        return response.json()
    
    def install_skill(self, user_id: str, skill_id: str, user_tier: str) -> Dict[str, Any]:
        """安装技能"""
        response = requests.post(
            f'{self.base_url}/users/{user_id}/skills',
            headers=self.headers,
            json={'skillId': skill_id, 'userTier': user_tier}
        )
        return response.json()
    
    def get_user_skills(self, user_id: str) -> Dict[str, Any]:
        """获取用户技能"""
        response = requests.get(
            f'{self.base_url}/users/{user_id}/skills',
            headers=self.headers
        )
        return response.json()

# 使用示例
client = SkillsMarketplaceClient('your_token_here')

# 获取技能
skills = client.get_skills(category='frontend', sort='installs')

# 搜索
results = client.search_skills('react', category='frontend')

# 安装
install = client.install_skill('user_123', 'skill_vercel_labs_find_skills', 'free')
```

---

## 🔄 配额说明

| 套餐 | 技能数量 | 推荐次数/天 | 搜索次数/天 |
|------|---------|------------|------------|
| Free | 10 | 50 | 100 |
| Pro | 100 | 500 | 1000 |
| Enterprise | 无限 | 无限 | 无限 |

---

## 📞 技术支持

- **文档**: https://docs.claudehome.cn
- **问题反馈**: https://github.com/your-repo/issues
- **邮箱**: support@claudehome.cn

---

*最后更新: 2026-01-29*
        "name": "next-best-practices",
        "descriptionEn": "Best practices for Next.js",
        "category": "frontend",
        "stars": 21308,
        "installCount": 45600,
        "ratingAvg": 4.9,
        "reason": "基于您使用的 react 技能推荐",
        "score": 0.92
      }
    ],
    "total": 10,
    "basedOn": ["vercel-react-best-practices"]
  }
}
```

---

### 6. 用户技能列表

**GET** `/users/{userId}/skills` 🔐

获取用户已安装的技能列表。

#### 路径参数

- `userId`: 用户ID（必填）

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": "skill_vercel_labs_vercel_react_best_practices",
        "name": "vercel-react-best-practices",
        "installedAt": "2026-01-20T10:30:00Z",
        "lastUsedAt": "2026-01-29T08:15:00Z",
        "usageCount": 45,
        "isEnabled": true,
        "config": {}
      }
    ],
    "total": 8,
    "quota": {
      "used": 8,
      "limit": 10,
      "tier": "free"
    }
  }
}
```

---

### 7. 安装技能

**POST** `/users/{userId}/skills` 🔐

为用户安装指定技能。

#### 路径参数

- `userId`: 用户ID（必填）

#### 请求体

```typescript
interface InstallSkillRequest {
  skillId: string;    // 技能ID（必填）
  userTier: 'free' | 'pro' | 'enterprise'; // 用户套餐
}
```

#### 请求示例

```json
{
  "skillId": "skill_vercel_labs_find_skills",
  "userTier": "free"
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skillId": "skill_vercel_labs_find_skills",
    "installedAt": "2026-01-29T10:30:00Z",
    "quota": {
      "used": 9,
      "limit": 10,
      "remaining": 1
    }
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "已达到免费版配额上限（10个技能）",
  "code": "QUOTA_EXCEEDED",
  "data": {
    "current": 10,
    "limit": 10,
    "upgradeUrl": "/pricing"
  }
}
```

---

### 8. 卸载技能

**DELETE** `/users/{userId}/skills/{skillId}` 🔐

卸载指定技能。

#### 路径参数

- `userId`: 用户ID（必填）
- `skillId`: 技能ID（必填）

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skillId": "skill_vercel_labs_find_skills",
    "uninstalledAt": "2026-01-29T10:35:00Z",
    "quota": {
      "used": 8,
      "limit": 10,
      "remaining": 2
    }
  }
}
```

---

### 9. 更新技能配置

**PATCH** `/users/{userId}/skills/{skillId}` 🔐

更新技能的启用状态或配置。

#### 路径参数

- `userId`: 用户ID（必填）
- `skillId`: 技能ID（必填）

#### 请求体

```typescript
interface UpdateSkillRequest {
  isEnabled?: boolean;  // 是否启用
  config?: object;      // 配置对象
}
```

#### 请求示例

```json
{
  "isEnabled": false,
  "config": {
    "autoUpdate": true,
    "notifications": false
  }
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "skillId": "skill_vercel_labs_find_skills",
    "isEnabled": false,
    "config": {
      "autoUpdate": true,
      "notifications": false
    },
    "updatedAt": "2026-01-29T10:40:00Z"
  }
}
```

---

### 10. 技能评价列表

**GET** `/skills/{skillId}/ratings`

获取技能的评价列表。

#### 路径参数

- `skillId`: 技能ID（必填）

#### 请求参数

```typescript
interface RatingsParams {
  page?: number;   // 页码，默认 1
  limit?: number;  // 每页数量，默认 20，最大 50
  sort?: 'recent' | 'helpful' | 'rating'; // 排序方式
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": 123,
        "userId": "user_456",
        "userName": "张三",
        "rating": 5,
        "review": "非常好用，推荐！",
        "helpful": 12,
        "createdAt": "2026-01-25T14:20:00Z"
      }
    ],
    "summary": {
      "avgRating": 4.8,
      "totalRatings": 156,
      "distribution": {
        "5": 120,
        "4": 25,
        "3": 8,
        "2": 2,
        "1": 1
      }
    },
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

### 11. 发表评价

**POST** `/skills/{skillId}/ratings` 🔐

为技能发表评价。

#### 路径参数

- `skillId`: 技能ID（必填）

#### 请求体

```typescript
interface CreateRatingRequest {
  userId: string;    // 用户ID（必填）
  rating: number;    // 评分 1-5（必填）
  review?: string;   // 评论内容（可选）
}
```

#### 请求示例

```json
{
  "userId": "user_123",
  "rating": 5,
  "review": "非常好用，强烈推荐！"
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": 157,
    "skillId": "skill_vercel_labs_find_skills",
    "userId": "user_123",
    "rating": 5,
    "review": "非常好用，强烈推荐！",
    "helpful": 0,
    "createdAt": "2026-01-29T10:45:00Z"
  }
}
```

---

## 📊 数据模型

### Skill 对象

```typescript
interface Skill {
  skillId: string;              // 技能唯一ID
  name: string;                 // 技能名称
  slug: string;                 // URL友好名称
  nameZh: string | null;        // 中文名称
  descriptionEn: string;        // 英文描述
  descriptionZh: string | null; // 中文描述
  repo: string;                 // GitHub仓库
  repoUrl: string;              // 仓库URL
  stars: number;                // GitHub星标数
  installCount: number;         // 总安装量
  localInstallCount: number;    // 本地安装量
  category: string;             // 分类
  tags: string[];               // 标签数组
  provider: string;             // 提供商
  isOfficial: boolean;          // 是否官方
  isVerified: boolean;          // 是否认证
  isTrending: boolean;          // 是否热门
  trendingRank: number | null;  // 热门排名
  trigger: string;              // 触发命令
  aliases: string[];            // 别名数组
  installCommand: string;       // 安装命令
  supportedAgents: string[];    // 支持的AI代理
  ratingAvg: number;            // 平均评分
  ratingCount: number;          // 评价数量
  searchCount: number;          // 搜索次数
  status: string;               // 状态
  metadata: object;             // 元数据
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
}
```

### UserSkill 对象

```typescript
interface UserSkill {
  skillId: string;       // 技能ID
  name: string;          // 技能名称
  installedAt: string;   // 安装时间
  lastUsedAt: string;    // 最后使用时间
  usageCount: number;    // 使用次数
  isEnabled: boolean;    // 是否启用
  config: object;        // 配置对象
}
```

### Rating 对象

```typescript
interface Rating {
  id: number;            // 评价ID
  userId: string;        // 用户ID
  userName?: string;     // 用户名
  rating: number;        // 评分 1-5
  review: string | null; // 评论内容
  helpful: number;       // 有用数
  createdAt: string;     // 创建时间
  updatedAt: string;     // 更新时间
}
```

---

## 💻 客户端集成示例

### TypeScript/JavaScript

```typescript
class SkillsMarketplaceAPI {
  private baseURL = 'https://api.claudehome.cn/api/v1';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data.data;
  }

  // 获取技能市场列表
  async getMarketplace(params: MarketplaceParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/skills/marketplace?${query}`);
  }

  // 搜索技能
  async searchSkills(params: SearchParams) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/skills/search?${query}`);
  }

  // 获取推荐
  async getRecommendations(userId: string, limit = 10) {
    return this.request(`/skills/recommendations?userId=${userId}&limit=${limit}`);
  }

  // 获取用户技能
  async getUserSkills(userId: string) {
    return this.request(`/users/${userId}/skills`);
  }

  // 安装技能
  async installSkill(userId: string, skillId: string, userTier: string) {
    return this.request(`/users/${userId}/skills`, {
      method: 'POST',
      body: JSON.stringify({ skillId, userTier }),
    });
  }

  // 卸载技能
  async uninstallSkill(userId: string, skillId: string) {
    return this.request(`/users/${userId}/skills/${skillId}`, {
      method: 'DELETE',
    });
  }

  // 发表评价
  async rateSkill(skillId: string, userId: string, rating: number, review?: string) {
    return this.request(`/skills/${skillId}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ userId, rating, review }),
    });
  }
}

// 使用示例
const api = new SkillsMarketplaceAPI();
api.setToken('your_token_here');

// 获取前端分类的技能
const skills = await api.getMarketplace({
  category: 'frontend',
  sort: 'installs',
  limit: 20,
});

// 搜索 React 相关技能
const results = await api.searchSkills({
  q: 'react',
  category: 'frontend',
});

// 安装技能
await api.installSkill('user_123', 'skill_vercel_labs_find_skills', 'free');
```

### Swift (iOS)

```swift
class SkillsMarketplaceAPI {
    private let baseURL = "https://api.claudehome.cn/api/v1"
    private var token: String?
    
    func setToken(_ token: String) {
        self.token = token
    }
    
    func getMarketplace(page: Int = 1, limit: Int = 20, category: String? = nil) async throws -> MarketplaceResponse {
        var components = URLComponents(string: "\(baseURL)/skills/marketplace")!
        components.queryItems = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        if let category = category {
            components.queryItems?.append(URLQueryItem(name: "category", value: category))
        }
        
        var request = URLRequest(url: components.url!)
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(APIResponse<MarketplaceResponse>.self, from: data)
        
        guard response.success else {
            throw APIError.requestFailed(response.error ?? "Unknown error")
        }
        
        return response.data
    }
    
    func installSkill(userId: String, skillId: String, userTier: String) async throws {
        let url = URL(string: "\(baseURL)/users/\(userId)/skills")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let body = ["skillId": skillId, "userTier": userTier]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(APIResponse<InstallResponse>.self, from: data)
        
        guard response.success else {
            throw APIError.requestFailed(response.error ?? "Unknown error")
        }
    }
}

// 使用示例
let api = SkillsMarketplaceAPI()
api.setToken("your_token_here")

Task {
    let marketplace = try await api.getMarketplace(category: "frontend")
    print("Found \(marketplace.skills.count) skills")
}
```

### Kotlin (Android)

```kotlin
class SkillsMarketplaceAPI {
    private val baseURL = "https://api.claudehome.cn/api/v1"
    private var token: String? = null
    private val client = OkHttpClient()
    private val gson = Gson()
    
    fun setToken(token: String) {
        this.token = token
    }
    
    suspend fun getMarketplace(
        page: Int = 1,
        limit: Int = 20,
        category: String? = null
    ): MarketplaceResponse = withContext(Dispatchers.IO) {
        val url = HttpUrl.Builder()
            .scheme("https")
            .host("api.claudehome.cn")
            .addPathSegments("api/v1/skills/marketplace")
            .addQueryParameter("page", page.toString())
            .addQueryParameter("limit", limit.toString())
            .apply { category?.let { addQueryParameter("category", it) } }
            .build()
        
        val request = Request.Builder()
            .url(url)
            .apply { token?.let { header("Authorization", "Bearer $it") } }
            .build()
        
        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw IOException("Empty response")
        
        val apiResponse = gson.fromJson(body, APIResponse::class.java)
        if (!apiResponse.success) {
            throw IOException(apiResponse.error ?: "Unknown error")
        }
        
        gson.fromJson(apiResponse.data.toString(), MarketplaceResponse::class.java)
    }
    
    suspend fun installSkill(
        userId: String,
        skillId: String,
        userTier: String
    ) = withContext(Dispatchers.IO) {
        val json = JSONObject().apply {
            put("skillId", skillId)
            put("userTier", userTier)
        }
        
        val request = Request.Builder()
            .url("$baseURL/users/$userId/skills")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .apply { token?.let { header("Authorization", "Bearer $it") } }
            .build()
        
        val response = client.newCall(request).execute()
        val body = response.body?.string() ?: throw IOException("Empty response")
        
        val apiResponse = gson.fromJson(body, APIResponse::class.java)
        if (!apiResponse.success) {
            throw IOException(apiResponse.error ?: "Unknown error")
        }
    }
}

// 使用示例
val api = SkillsMarketplaceAPI()
api.setToken("your_token_here")

viewModelScope.launch {
    try {
        val marketplace = api.getMarketplace(category = "frontend")
        _skills.value = marketplace.skills
    } catch (e: Exception) {
        _error.value = e.message
    }
}
```

---

## 📝 注意事项

### 1. 配额限制

| 套餐 | 技能数量 | API限流 |
|------|----------|----------|
| Free | 10 | 100/小时 |
| Pro | 100 | 1000/小时 |
| Enterprise | 无限 | 无限 |

### 2. 最佳实践

- ✅ 使用分页避免一次加载过多数据
- ✅ 缓存市场列表和搜索结果
- ✅ 处理所有错误码
- ✅ 实现重试机制
- ✅ 使用防抖处理搜索输入

### 3. 性能优化

- 市场列表：建议每页 20-50 条
- 搜索结果：建议限制 20 条
- 推荐列表：建议 10-20 条
- 缓存时间：市场数据 5 分钟，搜索结果 1 分钟

---

## 🔄 更新日志

### v1.0.0 (2026-01-29)

- ✅ 初始版本发布
- ✅ 8 个核心 API 接口
- ✅ 完整的 CRUD 操作
- ✅ 搜索和推荐功能
- ✅ 评价系统

---

## 📞 技术支持

- 📧 Email: api@claudehome.cn
- 📖 文档: https://docs.claudehome.cn
- 🐛 问题反馈: https://github.com/claudehome/issues

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-29
  slug: string;                 // URL友好名称
  nameZh?: string;              // 中文名称
  descriptionEn: string;        // 英文描述
  descriptionZh?: string;       // 中文描述
  repo: string;                 // GitHub仓库
  repoUrl: string;              // 仓库URL
  stars: number;                // GitHub星标数
  installCount: number;         // 全局安装量
  localInstallCount: number;    // 本地安装量
  category: string;             // 分类
  tags: string[];               // 标签数组
  provider: string;             // 提供商
  isOfficial: boolean;          // 是否官方
  isVerified: boolean;          // 是否认证
  isTrending: boolean;          // 是否热门
  trendingRank?: number;        // 热门排名
  trigger: string;              // 触发命令
  aliases: string[];            // 别名数组
  installCommand: string;       // 安装命令
  supportedAgents: string[];    // 支持的AI助手
  ratingAvg: number;            // 平均评分
  ratingCount: number;          // 评价数量
  searchCount: number;          // 搜索次数
  status: string;               // 状态
  metadata: object;             // 元数据
  createdAt: string;            // 创建时间
  updatedAt: string;            // 更新时间
}
```

### UserSkill 对象

```typescript
interface UserSkill {
  skillId: string;       // 技能ID
  name: string;          // 技能名称
  installedAt: string;   // 安装时间
  lastUsedAt?: string;   // 最后使用时间
  usageCount: number;    // 使用次数
  isEnabled: boolean;    // 是否启用
  config: object;        // 配置对象
}
```

### Rating 对象

```typescript
interface Rating {
  id: number;            // 评价ID
  userId: string;        // 用户ID
  userName: string;      // 用户名
  rating: number;        // 评分 1-5
  review?: string;       // 评论内容
  helpful: number;       // 有用数
  createdAt: string;     // 创建时间
}
```

---

## 💻 客户端集成示例

### TypeScript SDK

```typescript
class SkillsMarketplaceClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  // 获取技能列表
  async getSkills(params: MarketplaceParams) {
    const query = new URLSearchParams(params as any);
    const response = await fetch(
      `${this.baseUrl}/skills/marketplace?${query}`
    );
    return response.json();
  }

  // 搜索技能
  async searchSkills(query: string, params?: SearchParams) {
    const searchParams = new URLSearchParams({ q: query, ...params } as any);
    const response = await fetch(
      `${this.baseUrl}/skills/search?${searchParams}`
    );
    return response.json();
  }

  // 安装技能
  async installSkill(userId: string, skillId: string, userTier: string) {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/skills`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ skillId, userTier })
      }
    );
    return response.json();
  }

  // 获取用户技能
  async getUserSkills(userId: string) {
    const response = await fetch(
      `${this.baseUrl}/users/${userId}/skills`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    return response.json();
  }

  // 发表评价
  async rateSkill(skillId: string, userId: string, rating: number, review?: string) {
    const response = await fetch(
      `${this.baseUrl}/skills/${skillId}/ratings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ userId, rating, review })
      }
    );
    return response.json();
  }
}

// 使用示例
const client = new SkillsMarketplaceClient(
  'https://api.claudehome.cn/api/v1',
  'your-token-here'
);

// 获取前端技能
const skills = await client.getSkills({
  category: 'frontend',
  sort: 'installs',
  limit: 20
});

// 搜索React相关技能
const results = await client.searchSkills('react', {
  category: 'frontend'
});

// 安装技能
const installed = await client.installSkill(
  'user_123',
  'skill_vercel_labs_find_skills',
  'free'
);
```

### React Hooks 示例

```typescript
import { useState, useEffect } from 'react';

// 获取技能列表 Hook
function useSkills(params: MarketplaceParams) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams(params as any);
        const response = await fetch(
          `https://api.claudehome.cn/api/v1/skills/marketplace?${query}`
        );
        const data = await response.json();
        if (data.success) {
          setSkills(data.data.skills);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [JSON.stringify(params)]);

  return { skills, loading, error };
}

// 使用示例
function SkillsList() {
  const { skills, loading, error } = useSkills({
    category: 'frontend',
    sort: 'installs',
    limit: 20
  });

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      {skills.map(skill => (
        <div key={skill.skillId}>
          <h3>{skill.name}</h3>
          <p>{skill.descriptionEn}</p>
          <span>⭐ {skill.stars}</span>
          <span>📦 {skill.installCount}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 配额说明

### 免费版 (Free)
- 最多安装 **10 个**技能
- 所有功能可用

### 专业版 (Pro)
- 最多安装 **100 个**技能
- 优先推荐
- 高级统计

### 企业版 (Enterprise)
- **无限制**安装
- 私有技能
- 专属支持

---

## 📝 最佳实践

### 1. 错误处理

```typescript
try {
  const result = await client.installSkill(userId, skillId, 'free');
  if (!result.success) {
    if (result.code === 'QUOTA_EXCEEDED') {
      // 提示用户升级
      showUpgradeDialog(result.data.upgradeUrl);
    } else if (result.code === 'ALREADY_INSTALLED') {
      // 提示已安装
      showMessage('该技能已安装');
    }
  }
} catch (error) {
  // 网络错误处理
  showError('网络请求失败，请稍后重试');
}
```

### 2. 分页加载

```typescript
let page = 1;
const limit = 20;
let hasMore = true;

while (hasMore) {
  const result = await client.getSkills({ page, limit });
  skills.push(...result.data.skills);
  hasMore = result.data.pagination.hasNext;
  page++;
}
```

### 3. 搜索防抖

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedQuery.length >= 2) {
    searchSkills(debouncedQuery);
  }
}, [debouncedQuery]);
```

### 4. 缓存策略

```typescript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

async function getSkillsWithCache(params) {
  const cacheKey = JSON.stringify(params);
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await client.getSkills(params);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

---

## 🐛 常见问题

### Q1: 401 Unauthorized 错误
**A**: 检查 Token 是否有效，是否正确设置 Authorization 头。

### Q2: 配额已满无法安装
**A**: 引导用户升级套餐或卸载不常用的技能。

### Q3: 搜索结果为空
**A**: 检查关键词是否至少 2 个字符，尝试更通用的关键词。

### Q4: 评价提交失败
**A**: 确保用户已登录且已安装该技能。

---

## 📞 技术支持

- **API 文档**: https://docs.claudehome.cn/api
- **问题反馈**: https://github.com/your-repo/issues
- **技术支持**: support@claudehome.cn

---

## 📋 更新日志

### v1.0.0 (2026-01-29)
- ✅ 初始版本发布
- ✅ 11 个核心 API 接口
- ✅ 完整的 TypeScript 类型定义
- ✅ React Hooks 示例
- ✅ 错误处理最佳实践

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-29  
**维护者**: CCJK Cloud Team

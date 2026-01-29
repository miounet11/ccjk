# Skills Marketplace API 速查表

**基础URL**: `https://api.claudehome.cn/api/v1`

---

## 🔐 认证

```http
Authorization: Bearer {token}
```

---

## 📋 接口总览

| 接口 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| 技能列表 | GET | `/skills/marketplace` | ❌ | 浏览技能市场 |
| 搜索技能 | GET | `/skills/search` | ❌ | 全文搜索 |
| 搜索建议 | GET | `/skills/search/suggestions` | ❌ | 自动补全 |
| 热门搜索 | GET | `/skills/search/trending` | ❌ | 热门关键词 |
| 个性化推荐 | GET | `/skills/recommendations` | ✅ | 智能推荐 |
| 用户技能列表 | GET | `/users/{userId}/skills` | ✅ | 已安装技能 |
| 安装技能 | POST | `/users/{userId}/skills` | ✅ | 安装新技能 |
| 卸载技能 | DELETE | `/users/{userId}/skills/{skillId}` | ✅ | 卸载技能 |
| 更新配置 | PATCH | `/users/{userId}/skills/{skillId}` | ✅ | 更新设置 |
| 评价列表 | GET | `/skills/{skillId}/ratings` | ❌ | 查看评价 |
| 发表评价 | POST | `/skills/{skillId}/ratings` | ✅ | 发表评价 |

---

## 📦 快速示例

### 1. 获取技能列表

```bash
curl "https://api.claudehome.cn/api/v1/skills/marketplace?category=frontend&sort=installs&limit=20"
```

### 2. 搜索技能

```bash
curl "https://api.claudehome.cn/api/v1/skills/search?q=react&limit=10"
```

### 3. 安装技能

```bash
curl -X POST "https://api.claudehome.cn/api/v1/users/user_123/skills" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"skillId":"skill_vercel_labs_find_skills","userTier":"free"}'
```

### 4. 获取用户技能

```bash
curl "https://api.claudehome.cn/api/v1/users/user_123/skills" \
  -H "Authorization: Bearer {token}"
```

### 5. 发表评价

```bash
curl -X POST "https://api.claudehome.cn/api/v1/skills/skill_id/ratings" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","rating":5,"review":"很好用！"}'
```

---

## 🎯 常用参数

### 技能列表参数

```typescript
{
  page: 1,              // 页码
  limit: 20,            // 每页数量
  category: 'frontend', // 分类
  sort: 'installs',     // 排序: installs|stars|rating|recent|name
  isOfficial: true,     // 仅官方
  isTrending: true      // 仅热门
}
```

### 搜索参数

```typescript
{
  q: 'react',           // 关键词（必填）
  category: 'frontend', // 分类筛选
  limit: 20,            // 返回数量
  offset: 0             // 偏移量
}
```

### 推荐参数

```typescript
{
  userId: 'user_123',        // 用户ID（必填）
  limit: 10,                 // 返回数量
  excludeInstalled: true     // 排除已安装
}
```

---

## 📊 分类列表

| 分类 | 代码 | 说明 |
|------|------|------|
| 前端开发 | `frontend` | React、Vue、Next.js等 |
| 后端开发 | `backend` | Node.js、数据库等 |
| AI工具 | `ai-tools` | AI助手、自动化等 |
| 文档处理 | `documentation` | PDF、Word、Excel等 |
| 测试工具 | `testing` | 单元测试、E2E测试 |
| DevOps | `devops` | CI/CD、部署等 |
| 营销工具 | `marketing` | SEO、内容营销等 |
| 设计工具 | `design` | UI/UX、原型设计 |
| 效率工具 | `productivity` | 自动化、工作流 |
| 其他 | `other` | 其他类型 |

---

## ⚠️ 错误码

| 错误码 | 状态码 | 说明 | 处理方式 |
|--------|--------|------|----------|
| `UNAUTHORIZED` | 401 | 未授权 | 重新登录 |
| `QUOTA_EXCEEDED` | 400 | 配额已满 | 升级套餐 |
| `ALREADY_INSTALLED` | 400 | 已安装 | 提示用户 |
| `NOT_INSTALLED` | 400 | 未安装 | 先安装 |
| `NOT_FOUND` | 404 | 不存在 | 检查ID |
| `VALIDATION_ERROR` | 400 | 参数错误 | 检查参数 |
| `INTERNAL_ERROR` | 500 | 服务器错误 | 稍后重试 |

---

## 🎨 响应格式

### 成功

```json
{
  "success": true,
  "data": { /* 数据 */ }
}
```

### 失败

```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

---

## 💡 最佳实践

### 1. 分页加载

```typescript
// 首次加载
const page1 = await fetch('/skills/marketplace?page=1&limit=20');

// 加载更多
const page2 = await fetch('/skills/marketplace?page=2&limit=20');
```

### 2. 搜索防抖

```typescript
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const search = debounce(async (query) => {
  const results = await fetch(`/skills/search?q=${query}`);
  // 处理结果
}, 300);
```

### 3. 错误处理

```typescript
try {
  const response = await fetch('/skills/marketplace');
  const data = await response.json();

  if (!data.success) {
    switch (data.code) {
      case 'UNAUTHORIZED':
        // 跳转登录
        break;
      case 'QUOTA_EXCEEDED':
        // 提示升级
        break;
      default:
        // 通用错误提示
    }
  }
} catch (error) {
  // 网络错误处理
}
```

### 4. 缓存策略

```typescript
// 缓存技能列表（5分钟）
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getSkillsWithCache(params) {
  const key = JSON.stringify(params);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchSkills(params);
  cache.set(key, { data, time: Date.now() });
  return data;
}
```

---

## 📱 配额限制

| 套餐 | 技能数量 | API限流 |
|------|----------|----------|
| Free | 10 | 100/小时 |
| Pro | 100 | 1000/小时 |
| Enterprise | 无限 | 无限 |

---

## 🔗 相关链接

- 📖 [完整API文档](./API_CLIENT_DOCUMENTATION.md)
- 🚀 [部署报告](./DEPLOYMENT_REPORT.md)
- 📚 [功能文档](./SKILLS_MARKETPLACE.md)
- 🧪 [测试脚本](./test-skills-marketplace.ts)

---

**更新时间**: 2026-01-29
**版本**: v1.0.0

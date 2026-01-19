---
name: performance-profiling
description: 性能分析和优化建议
version: 1.0.0
author: CCJK
category: dev
triggers:
  - /perf
  - /performance
  - /profile
use_when:
  - "用户需要性能分析"
  - "代码运行缓慢"
  - "需要优化性能"
  - "用户提到性能分析"
auto_activate: false
priority: 6
difficulty: advanced
tags:
  - performance
  - optimization
  - profiling
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(node --prof *)
  - Bash(npm run *)
  - Bash(pnpm run *)
context: fork
user-invocable: true
---

# 性能分析技能

## 概述

此技能为您的代码库提供全面的性能分析和优化建议。它帮助识别瓶颈、内存问题，并提供可操作的优化策略。

## 性能分析检查清单

### 1. 算法复杂度分析

**大O符号审查：**
- 识别循环和嵌套循环（O(n)、O(n²)、O(n³)）
- 检查递归函数的指数复杂度
- 审查排序和搜索算法
- 分析数据结构操作（数组、对象、Map、Set）

**危险信号：**
- 大数据集上的嵌套循环
- 没有记忆化的递归函数
- 热路径中的线性搜索
- 重复的数组操作（filter、map、reduce 链）

### 2. 内存使用模式

**内存分析：**
- 检查内存泄漏（事件监听器、定时器、闭包）
- 分析对象保留和垃圾回收
- 审查大型数据结构分配
- 监控堆大小随时间的增长

**常见问题：**
- 未关闭的数据库连接
- 未移除的事件监听器
- 循环引用
- 没有限制的大型内存缓存

### 3. I/O 操作

**文件系统：**
- 识别同步文件操作（fs.readFileSync）
- 检查不必要的文件读写
- 审查文件流式处理 vs. 加载整个文件
- 分析临时文件清理

**数据库：**
- 检测 N+1 查询问题
- 审查缺失的索引
- 检查全表扫描
- 分析连接池使用情况

### 4. 网络请求

**HTTP/API 调用：**
- 识别可以并行的顺序请求
- 检查缺失的请求缓存
- 审查超时配置
- 分析负载大小

**优化机会：**
- 实现请求批处理
- 添加响应缓存（Redis、内存）
- 使用 HTTP/2 多路复用
- 压缩请求/响应负载

### 5. 打包体积分析

**前端性能：**
- 分析打包体积和组成
- 检查重复依赖
- 审查代码拆分策略
- 识别未使用的代码（tree-shaking 机会）

**工具：**
- webpack-bundle-analyzer
- source-map-explorer
- Lighthouse CI

## 常见性能问题

### 1. N+1 查询问题

**症状：**
```javascript
// 不好：N+1 查询
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}
```

**解决方案：**
```javascript
// 好：使用 join 的单次查询
const users = await User.findAll({
  include: [{ model: Post }]
});
```

### 2. 内存泄漏

**常见原因：**
```javascript
// 不好：事件监听器未移除
element.addEventListener('click', handler);
// 组件卸载但监听器仍然存在

// 不好：定时器未清除
setInterval(() => { /* ... */ }, 1000);
// 组件卸载但定时器继续运行

// 不好：闭包保留大对象
function createHandler() {
  const largeData = new Array(1000000);
  return () => console.log(largeData.length);
}
```

**解决方案：**
```javascript
// 好：清理事件监听器
useEffect(() => {
  element.addEventListener('click', handler);
  return () => element.removeEventListener('click', handler);
}, []);

// 好：清除定时器
useEffect(() => {
  const timer = setInterval(() => { /* ... */ }, 1000);
  return () => clearInterval(timer);
}, []);

// 好：避免不必要的闭包
function createHandler() {
  return () => console.log('不保留大数据');
}
```

### 3. 不必要的重新渲染（React）

**问题：**
```javascript
// 不好：每次渲染都创建新对象
function Component() {
  const config = { theme: 'dark' }; // 每次都是新对象
  return <Child config={config} />;
}
```

**解决方案：**
```javascript
// 好：记忆化对象
function Component() {
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return <Child config={config} />;
}

// 好：对昂贵组件使用 React.memo
const Child = React.memo(({ config }) => {
  // 昂贵的渲染逻辑
});
```

### 4. 大型打包体积

**问题：**
- 为单个函数导入整个库
- 路由没有代码拆分
- 未优化的图片和资源
- 缺少压缩

**解决方案：**
```javascript
// 不好：导入整个库
import _ from 'lodash';

// 好：导入特定函数
import debounce from 'lodash/debounce';

// 好：动态导入进行代码拆分
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## 性能分析工具集成

### 1. Node.js 分析器

**CPU 分析：**
```bash
# 生成 CPU 分析文件
node --prof app.js

# 处理分析文件
node --prof-process isolate-0x*.log > processed.txt

# 分析输出中的热点函数
```

**堆快照：**
```bash
# 获取堆快照
node --inspect app.js
# 在 Chrome 中打开 chrome://inspect
# 在 DevTools 中获取堆快照
```

### 2. Chrome DevTools

**性能标签：**
1. 打开 DevTools (F12)
2. 转到性能标签
3. 点击录制
4. 执行要分析的操作
5. 停止录制
6. 分析火焰图查找瓶颈

**内存标签：**
1. 在操作前后获取堆快照
2. 比较快照以查找泄漏
3. 使用分配时间线进行实时监控

### 3. Lighthouse

**运行 Lighthouse：**
```bash
# CLI
npm install -g lighthouse
lighthouse https://example.com --view

# 编程方式
npm install lighthouse
```

**关键指标：**
- 首次内容绘制 (FCP)
- 最大内容绘制 (LCP)
- 可交互时间 (TTI)
- 总阻塞时间 (TBT)
- 累积布局偏移 (CLS)

### 4. 其他工具

**后端：**
- `clinic.js` - Node.js 性能分析
- `autocannon` - HTTP 负载测试
- `0x` - 火焰图分析器

**前端：**
- `react-devtools-profiler` - React 组件分析
- `why-did-you-render` - 检测不必要的重新渲染
- `bundle-analyzer` - Webpack 打包分析

## 优化策略

### 1. 算法优化

**策略：**
- 将 O(n²) 替换为 O(n log n) 或 O(n)
- 使用适当的数据结构（Map vs Object、Set vs Array）
- 为昂贵的计算实现缓存/记忆化
- 考虑惰性求值

**示例：**
```javascript
// 不好：O(n²) - 嵌套循环
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) duplicates.push(arr[i]);
    }
  }
  return duplicates;
}

// 好：O(n) - 使用 Set
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return Array.from(duplicates);
}
```

### 2. 缓存策略

**层级：**
1. **内存缓存** - 快速，受 RAM 限制
2. **Redis 缓存** - 跨实例共享
3. **CDN 缓存** - 静态资源的边缘缓存
4. **浏览器缓存** - HTTP 缓存头

**实现：**
```javascript
// 带 TTL 的简单内存缓存
class Cache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}
```

### 3. 数据库优化

**策略：**
- 在频繁查询的列上添加索引
- 使用连接池
- 实现查询结果缓存
- 优化 JOIN 操作
- 使用 EXPLAIN 分析查询计划

**示例：**
```sql
-- 添加索引
CREATE INDEX idx_user_email ON users(email);

-- 分析查询
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

### 4. 懒加载

**代码拆分：**
```javascript
// React 懒加载
const Dashboard = lazy(() => import('./Dashboard'));

// 基于路由的拆分
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./Dashboard'))
  }
];
```

**图片懒加载：**
```html
<!-- 原生懒加载 -->
<img src="image.jpg" loading="lazy" alt="描述">
```

### 5. 防抖和节流

**使用场景：**
- 搜索输入（防抖）
- 滚动事件（节流）
- 窗口调整大小（节流）
- API 调用（防抖）

**实现：**
```javascript
// 防抖：等待事件暂停
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 节流：限制执行频率
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

## 性能报告格式

### 执行摘要

```markdown
## 性能分析报告

**日期：** [YYYY-MM-DD]
**分析文件数：** [数量]
**严重问题：** [数量]
**优化机会：** [数量]

### 总体性能评分：[X/10]

**关键发现：**
1. [最严重的问题]
2. [第二严重的问题]
3. [第三严重的问题]
```

### 详细分析

```markdown
## 1. 算法复杂度问题

### 问题：[描述]
- **位置：** `path/to/file.js:123`
- **当前复杂度：** O(n²)
- **影响：** 高 - 在热路径中执行
- **建议：** 使用 Map 实现 O(n) 查找

**修改前：**
\`\`\`javascript
[有问题的代码]
\`\`\`

**修改后：**
\`\`\`javascript
[优化后的代码]
\`\`\`

**预期改进：** n=1000 时快 10 倍

---

## 2. 内存问题

### 问题：[描述]
- **位置：** `path/to/file.js:456`
- **类型：** 内存泄漏 - 事件监听器未移除
- **影响：** 中等 - 随时间增长
- **建议：** 在 useEffect 中添加清理

[每个问题使用类似格式]

---

## 3. 打包体积分析

**当前大小：** 2.5 MB（未压缩）
**Gzip 后：** 850 KB

**最大依赖项：**
1. lodash - 500 KB（使用 lodash-es 或特定导入）
2. moment - 300 KB（替换为 date-fns 或 dayjs）
3. [其他大型依赖]

**建议：**
- 实现代码拆分：初始包减少 40%
- 用 dayjs 替换 moment：减少 280 KB
- 使用 lodash-es 配合 tree-shaking：减少 400 KB

**预计最终大小：** 1.2 MB（减少 52%）

---

## 4. 网络性能

**发现的问题：**
- 15 个顺序 API 调用（应该并行）
- 没有请求缓存
- 大负载大小（平均 200 KB）

**建议：**
1. 使用 Promise.all() 进行并行请求
2. 为频繁查询实现 Redis 缓存
3. 添加响应压缩（gzip）

**预期改进：**
- API 响应时间：减少 60%
- 服务器负载：减少 40%

---

## 优先行动项

### 高优先级（首先执行）
1. [ ] 修复用户仪表板中的 N+1 查询（10 倍加速）
2. [ ] 在 users.email 列上添加索引（5 倍加速）
3. [ ] 移除 WebSocket 处理器中的内存泄漏

### 中优先级（接下来执行）
1. [ ] 为路由实现代码拆分
2. [ ] 用 dayjs 替换 moment
3. [ ] 为 API 响应添加 Redis 缓存

### 低优先级（锦上添花）
1. [ ] 使用懒加载优化图片加载
2. [ ] 实现 service worker 以支持离线
3. [ ] 在 CI 中添加打包体积监控

---

## 监控建议

**要跟踪的指标：**
- 响应时间（p50、p95、p99）
- 内存使用（堆大小、GC 频率）
- 打包体积（随时间跟踪）
- Lighthouse 评分（每周）

**要实现的工具：**
- 应用性能监控（APM）
- 真实用户监控（RUM）
- 关键路径的合成监控

---

## 结论

**预计总体改进：**
- 响应时间：减少 50%
- 内存使用：减少 30%
- 打包体积：减少 52%
- 用户体验：显著改善

**后续步骤：**
1. 审查并优先处理行动项
2. 实施高优先级修复
3. 设置性能监控
4. 安排 2 周后的后续分析
```

## 使用示例

### 示例 1：分析特定文件

```
用户：/perf 分析 src/api/users.ts

助手：我将对 src/api/users.ts 进行全面的性能分析...

[读取文件并分析]

## 性能分析报告 - src/api/users.ts

### 发现的问题：

1. **N+1 查询问题**（严重）
   - 位置：第 45-50 行
   - 在循环中为每个用户执行单独的查询
   - 建议：使用 include 进行单次查询

2. **缺少索引**（高）
   - email 字段上没有索引
   - 影响登录性能
   - 建议：添加 `CREATE INDEX idx_user_email ON users(email)`

[完整报告...]
```

### 示例 2：分析整个项目

```
用户：/perf 分析整个项目的性能

助手：我将对整个项目进行性能分析...

[扫描所有文件]

## 项目性能分析报告

### 总体评分：6.5/10

**关键发现：**
1. 5 个 N+1 查询问题
2. 3 个潜在的内存泄漏
3. 打包体积过大（2.5 MB）
4. 15 个可以并行的顺序 API 调用

[按模块详细分析...]
```

### 示例 3：特定性能问题

```
用户：/perf 为什么我的 API 这么慢？

助手：让我分析您的 API 性能...

[分析 API 路由和处理器]

## API 性能分析

### 发现的瓶颈：

1. **数据库查询慢**
   - 缺少索引导致全表扫描
   - N+1 查询模式
   - 预计改进：5-10 倍加速

2. **没有缓存**
   - 每次请求都查询数据库
   - 建议：添加 Redis 缓存
   - 预计改进：响应时间减少 80%

3. **顺序处理**
   - 可以并行的操作按顺序执行
   - 建议：使用 Promise.all()
   - 预计改进：响应时间减少 60%

[详细建议和代码示例...]
```

### 示例 4：内存泄漏检测

```
用户：/perf 检查内存泄漏

助手：我将扫描常见的内存泄漏模式...

[分析事件监听器、定时器、闭包]

## 内存泄漏分析

### 发现的问题：

1. **未清理的事件监听器**（3 处）
   - src/components/Chat.tsx:67
   - src/services/websocket.ts:123
   - src/utils/observer.ts:45

2. **未清除的定时器**（2 处）
   - src/components/Timer.tsx:34
   - src/services/polling.ts:89

3. **闭包保留大对象**（1 处）
   - src/utils/cache.ts:156

[每个问题的详细修复方案...]
```

## 最佳实践

### 性能分析流程

1. **建立基线**
   - 在优化前测量当前性能
   - 记录关键指标（响应时间、内存使用、打包体积）

2. **识别瓶颈**
   - 使用分析工具找到热点
   - 专注于影响最大的问题

3. **实施优化**
   - 一次优化一个问题
   - 每次优化后测量改进

4. **验证改进**
   - 确认性能提升
   - 确保没有引入新问题

5. **持续监控**
   - 设置性能监控
   - 定期审查性能指标

### 优化优先级

1. **高影响、低努力** - 首先执行
   - 添加数据库索引
   - 修复 N+1 查询
   - 实现简单缓存

2. **高影响、高努力** - 接下来执行
   - 重构算法
   - 实现代码拆分
   - 优化数据库架构

3. **低影响、低努力** - 有时间时执行
   - 小的代码优化
   - 图片优化
   - 压缩配置

4. **低影响、高努力** - 最后考虑
   - 过度优化
   - 边缘情况优化

## 注意事项

1. **过早优化是万恶之源**
   - 先让代码工作，再让它快速
   - 基于实际数据进行优化，而非假设

2. **测量，不要猜测**
   - 始终使用分析工具
   - 验证优化效果

3. **权衡取舍**
   - 性能 vs. 可读性
   - 性能 vs. 可维护性
   - 优化成本 vs. 收益

4. **用户体验优先**
   - 专注于用户感知的性能
   - 优化关键用户路径

5. **持续改进**
   - 性能优化是持续的过程
   - 定期审查和更新

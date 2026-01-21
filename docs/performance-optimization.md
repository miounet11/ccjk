# CCJK 性能优化计划

## 🎯 目标
- 启动时间 < 1 秒
- 内存占用 < 100MB
- 配置合并 < 100ms

## 优化项

### 1. 延迟加载 (Lazy Loading)
```typescript
// 当前: 全部导入
import * as commands from './commands'

// 优化: 按需导入
const commands = {
  init: () => import('./commands/init').then(m => m.init()),
  menu: () => import('./commands/menu').then(m => m.menu()),
  // ...
}
```

### 2. 配置缓存
```typescript
// 缓存已解析的配置
class ConfigCache {
  private cache = new Map<string, any>()
  private timestamps = new Map<string, number>()

  get(key: string, maxAge: number = 60000): any {
    const ts = this.timestamps.get(key)
    if (ts && Date.now() - ts < maxAge) {
      return this.cache.get(key)
    }
    return null
  }

  set(key: string, value: any): void {
    this.cache.set(key, value)
    this.timestamps.set(key, Date.now())
  }
}
```

### 3. 流式处理大文件
```typescript
// 当前: 一次性读取大文件
const content = fs.readFileSync(file)

// 优化: 流式处理
const stream = fs.createReadStream(file)
const chunks: Buffer[] = []

for await (const chunk of stream) {
  chunks.push(chunk)
  if (chunks.length * 1024 > 1024 * 1024) { // 1MB limit
    // 处理累积数据
    processChunk(Buffer.concat(chunks))
    chunks.length = 0
  }
}
```

### 4. 并发优化
```typescript
// 使用 Promise.all 代替 await 串行
// 当前
const skills = await loadSkills()
const mcp = await loadMcp()
const config = await loadConfig()

// 优化
const [skills, mcp, config] = await Promise.all([
  loadSkills(),
  loadMcp(),
  loadConfig()
])
```

## 监控指标
- 启动时间测量
- 内存使用监控
- CPU 使用分析

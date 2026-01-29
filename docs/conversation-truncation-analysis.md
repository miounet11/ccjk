# 对话截断问题分析与解决方案

> 创建时间：2026-01-29
> 问题类型：对话中断、工具调用失败
> 影响范围：长对话、复杂任务执行

## 问题现象

从用户提供的日志来看，出现了以下问题：

```
✻ Cogitated for 1m 3s
```

对话在这里停止，没有产生：
- 工具调用（Task tool 调用 UI-UX-Designer Agent）
- 完整的响应输出
- 错误提示

## 根因分析

### 1. Extended Thinking 超时

**现象**：
- 模型进行了 1 分钟的 "思考"（extended thinking）
- 但最终没有产生输出

**可能原因**：
```typescript
// 当前代码中的超时设置
defaultTimeout: 300000,  // 5 minutes (src/brain/agent-dispatcher.ts)
```

**问题**：
- Extended thinking 本身可能消耗大量时间
- 如果加上工具调用准备时间，可能接近或超过超时限制
- 超时后没有优雅降级，直接截断

### 2. 上下文窗口压力

**现象**：
- 对话已经包含大量内容（规划文档、代码分析等）
- 模型需要生成详细的 UI 设计需求

**可能原因**：
```typescript
// 上下文窗口分析 (src/core/mcp-search.ts)
export interface ContextWindowAnalysis {
  contextWindow: number
  toolDescriptionSize: number
  percentageUsed: number
  threshold: number
  shouldDefer: boolean
}
```

**问题**：
- 当上下文接近限制时，模型可能难以生成完整输出
- 工具描述本身占用大量 tokens
- 没有主动的上下文压缩机制

### 3. 工具调用准备失败

**现象**：
- 模型描述了要调用 UI-UX-Designer Agent
- 但没有实际生成工具调用

**可能原因**：
- 工具调用格式生成失败
- 参数准备过程中超时
- 流式输出被中断

### 4. 后端 API 限制

**可能的后端问题**：
- API 响应超时（如 Cloudflare 100s 限制）
- 流式响应被中间件截断
- Rate limiting 触发

## 解决方案

### 方案 1：智能超时管理（推荐）

**目标**：在超时前主动保存状态并提示用户

```typescript
// src/brain/timeout-manager.ts (新文件)
export interface TimeoutConfig {
  softTimeout: number    // 软超时：开始警告
  hardTimeout: number    // 硬超时：强制中断
  gracePeriod: number    // 优雅期：保存状态的时间
}

export class TimeoutManager {
  private config: TimeoutConfig = {
    softTimeout: 240000,   // 4 分钟
    hardTimeout: 300000,   // 5 分钟
    gracePeriod: 10000     // 10 秒
  }

  async executeWithTimeout<T>(
    fn: () => Promise<T>,
    onSoftTimeout?: () => void,
    onGracePeriod?: () => Promise<void>
  ): Promise<T> {
    let softTimeoutReached = false
    let gracePeriodStarted = false

    // 软超时定时器
    const softTimer = setTimeout(() => {
      softTimeoutReached = true
      onSoftTimeout?.()
      console.warn('⚠️ 任务执行时间较长，可能需要分解任务')
    }, this.config.softTimeout)

    // 优雅期定时器
    const graceTimer = setTimeout(async () => {
      if (!gracePeriodStarted) {
        gracePeriodStarted = true
        console.warn('⏰ 即将超时，正在保存状态...')
        await onGracePeriod?.()
      }
    }, this.config.hardTimeout - this.config.gracePeriod)

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Hard timeout reached')),
            this.config.hardTimeout
          )
        )
      ])

      clearTimeout(softTimer)
      clearTimeout(graceTimer)
      return result
    } catch (error) {
      clearTimeout(softTimer)
      clearTimeout(graceTimer)

      if (error.message === 'Hard timeout reached') {
        throw new TimeoutError(
          '任务执行超时，状态已保存，请使用 --resume 继续',
          { softTimeoutReached, gracePeriodStarted }
        )
      }
      throw error
    }
  }
}
```

**使用示例**：
```typescript
// src/brain/agent-dispatcher.ts
const timeoutManager = new TimeoutManager()

return timeoutManager.executeWithTimeout(
  () => executeFn(filteredConfig),
  // 软超时回调
  () => {
    this.logger.warn('Agent execution taking longer than expected')
    // 可以发送进度更新给用户
  },
  // 优雅期回调
  async () => {
    // 保存当前状态
    await this.saveAgentState(agentId, currentState)
    this.logger.info('Agent state saved, can resume later')
  }
)
```

### 方案 2：主动上下文管理

**目标**：在上下文接近限制时主动压缩或分段

```typescript
// src/context/proactive-compactor.ts (新文件)
export class ProactiveCompactor {
  private readonly DANGER_THRESHOLD = 0.85  // 85% 使用率
  private readonly WARNING_THRESHOLD = 0.70  // 70% 使用率

  async checkAndCompact(
    contextAnalysis: ContextWindowAnalysis
  ): Promise<CompactionResult> {
    const usage = contextAnalysis.percentageUsed

    if (usage >= this.DANGER_THRESHOLD) {
      // 危险区：强制压缩
      return await this.forceCompact()
    } else if (usage >= this.WARNING_THRESHOLD) {
      // 警告区：建议压缩
      return await this.suggestCompact()
    }

    return { action: 'none', message: 'Context usage is healthy' }
  }

  private async forceCompact(): Promise<CompactionResult> {
    // 1. 保存当前规划到文件
    await this.savePlanToFile()

    // 2. 生成摘要
    const summary = await this.generateSummary()

    // 3. 清理历史消息
    await this.clearHistory()

    return {
      action: 'compacted',
      message: '上下文已压缩，规划已保存到 .ccjk/plan/current/',
      summary
    }
  }

  private async suggestCompact(): Promise<CompactionResult> {
    return {
      action: 'suggest',
      message: '💡 建议：上下文使用率较高，建议执行 /compact 清理',
      usage: this.currentUsage
    }
  }
}
```

**集成到 feat 命令**：
```typescript
// src/commands/ccjk-feat.ts
export async function executeFeat(input: string) {
  const compactor = new ProactiveCompactor()

  // 每次执行前检查上下文
  const contextAnalysis = await analyzeContext()
  const compactionResult = await compactor.checkAndCompact(contextAnalysis)

  if (compactionResult.action === 'compacted') {
    // 上下文已压缩，通知用户
    console.log('✅', compactionResult.message)
  } else if (compactionResult.action === 'suggest') {
    // 建议压缩
    console.log('💡', compactionResult.message)
  }

  // 继续执行任务
  // ...
}
```

### 方案 3：分段执行机制

**目标**：将大任务自动分解为小任务，避免单次执行超时

```typescript
// src/brain/task-segmenter.ts (新文件)
export interface TaskSegment {
  id: string
  description: string
  estimatedTime: number  // 毫秒
  dependencies: string[] // 依赖的其他 segment
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export class TaskSegmenter {
  private readonly MAX_SEGMENT_TIME = 180000  // 3 分钟

  async segmentTask(task: Task): Promise<TaskSegment[]> {
    // 分析任务复杂度
    const complexity = await this.analyzeComplexity(task)

    if (complexity.estimatedTime <= this.MAX_SEGMENT_TIME) {
      // 简单任务，不需要分段
      return [{
        id: nanoid(),
        description: task.description,
        estimatedTime: complexity.estimatedTime,
        dependencies: [],
        status: 'pending'
      }]
    }

    // 复杂任务，需要分段
    return await this.breakdownTask(task, complexity)
  }

  private async breakdownTask(
    task: Task,
    complexity: ComplexityAnalysis
  ): Promise<TaskSegment[]> {
    const segments: TaskSegment[] = []

    // 示例：UI 任务分解
    if (task.type === 'ui-development') {
      segments.push(
        {
          id: 'ui-design',
          description: '生成 UI 设计稿',
          estimatedTime: 60000,
          dependencies: [],
          status: 'pending'
        },
        {
          id: 'layout-implementation',
          description: '实现布局结构',
          estimatedTime: 90000,
          dependencies: ['ui-design'],
          status: 'pending'
        },
        {
          id: 'interaction-logic',
          description: '实现交互逻辑',
          estimatedTime: 90000,
          dependencies: ['layout-implementation'],
          status: 'pending'
        }
      )
    }

    return segments
  }

  async executeSegments(
    segments: TaskSegment[]
  ): Promise<SegmentExecutionResult> {
    const results: Map<string, any> = new Map()

    for (const segment of segments) {
      // 检查依赖是否完成
      const dependenciesMet = segment.dependencies.every(
        dep => results.has(dep)
      )

      if (!dependenciesMet) {
        throw new Error(`Dependencies not met for segment ${segment.id}`)
      }

      // 执行 segment
      segment.status = 'running'
      try {
        const result = await this.executeSegment(segment)
        segment.status = 'completed'
        results.set(segment.id, result)

        // 保存进度
        await this.saveProgress(segment.id, result)

        // 通知用户
        console.log(`✅ 完成：${segment.description}`)
      } catch (error) {
        segment.status = 'failed'
        throw error
      }
    }

    return { segments, results }
  }
}
```

### 方案 4：流式输出优化

**目标**：改进流式输出处理，避免中断

```typescript
// src/api-providers/streaming-optimizer.ts (新文件)
export class StreamingOptimizer {
  private buffer: string = ''
  private lastFlushTime: number = Date.now()
  private readonly FLUSH_INTERVAL = 100  // 100ms

  async optimizeStream(
    stream: ReadableStream<string>
  ): Promise<ReadableStream<string>> {
    const reader = stream.getReader()
    const optimizer = this

    return new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // 刷新剩余缓冲
              if (optimizer.buffer) {
                controller.enqueue(optimizer.buffer)
              }
              controller.close()
              break
            }

            // 添加到缓冲
            optimizer.buffer += value

            // 定期刷新缓冲
            const now = Date.now()
            if (now - optimizer.lastFlushTime >= optimizer.FLUSH_INTERVAL) {
              controller.enqueue(optimizer.buffer)
              optimizer.buffer = ''
              optimizer.lastFlushTime = now
            }
          }
        } catch (error) {
          // 错误处理：保存已接收的内容
          if (optimizer.buffer) {
            await optimizer.savePartialResponse(optimizer.buffer)
          }
          controller.error(error)
        }
      }
    })
  }

  private async savePartialResponse(content: string): Promise<void> {
    const timestamp = new Date().toISOString()
    const filename = `.ccjk/recovery/partial-${timestamp}.md`
    await fs.writeFile(filename, content)
    console.log(`💾 部分响应已保存到：${filename}`)
  }
}
```

### 方案 5：后端协同优化

**目标**：与后端配合，处理长时间请求

```typescript
// src/api-providers/long-request-handler.ts (新文件)
export class LongRequestHandler {
  private readonly BACKEND_TIMEOUT = 90000  // 90 秒（Cloudflare 限制前）
  private readonly POLLING_INTERVAL = 5000   // 5 秒

  async handleLongRequest(
    request: ApiRequest
  ): Promise<ApiResponse> {
    // 1. 发起异步请求
    const { taskId } = await this.startAsyncTask(request)

    // 2. 轮询结果
    return await this.pollTaskResult(taskId)
  }

  private async startAsyncTask(
    request: ApiRequest
  ): Promise<{ taskId: string }> {
    const response = await fetch('/api/tasks/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        async: true,  // 标记为异步任务
        timeout: 600000  // 10 分钟
      })
    })

    return await response.json()
  }

  private async pollTaskResult(
    taskId: string
  ): Promise<ApiResponse> {
    while (true) {
      const response = await fetch(`/api/tasks/${taskId}/status`)
      const status = await response.json()

      if (status.state === 'completed') {
        return status.result
      } else if (status.state === 'failed') {
        throw new Error(status.error)
      }

      // 显示进度
      if (status.progress) {
        console.log(`⏳ 进度：${status.progress}%`)
      }

      // 等待后继续轮询
      await new Promise(resolve =>
        setTimeout(resolve, this.POLLING_INTERVAL)
      )
    }
  }
}
```

## 实施建议

### 短期方案（1-2 周）

1. **实施方案 1**：智能超时管理
   - 优先级：⭐⭐⭐⭐⭐
   - 影响：立即改善用户体验
   - 工作量：中等

2. **实施方案 2**：主动上下文管理
   - 优先级：⭐⭐⭐⭐
   - 影响：减少上下文相关问题
   - 工作量：中等

### 中期方案（2-4 周）

3. **实施方案 3**：分段执行机制
   - 优先级：⭐⭐⭐⭐
   - 影响：支持更复杂的任务
   - 工作量：较大

4. **实施方案 4**：流式输出优化
   - 优先级：⭐⭐⭐
   - 影响：提高稳定性
   - 工作量：中等

### 长期方案（1-2 月）

5. **实施方案 5**：后端协同优化
   - 优先级：⭐⭐⭐
   - 影响：彻底解决超时问题
   - 工作量：较大（需要后端配合）

## 监控指标

实施后需要监控以下指标：

```typescript
export interface TruncationMetrics {
  // 超时相关
  softTimeoutCount: number      // 软超时次数
  hardTimeoutCount: number      // 硬超时次数
  averageExecutionTime: number  // 平均执行时间

  // 上下文相关
  contextUsageDistribution: number[]  // 使用率分布
  compactionCount: number             // 压缩次数
  compactionSuccessRate: number       // 压缩成功率

  // 任务分段相关
  segmentedTaskCount: number          // 分段任务数
  averageSegmentsPerTask: number      // 平均分段数
  segmentFailureRate: number          // 分段失败率

  // 流式输出相关
  streamInterruptionCount: number     // 流中断次数
  partialResponseSaveCount: number    // 部分响应保存次数
}
```

## 用户体验改进

### 改进前
```
✻ Cogitated for 1m 3s
[对话突然停止，没有任何提示]
```

### 改进后
```
✻ Cogitated for 1m 3s
⚠️ 任务执行时间较长，正在分解任务...

📋 任务已分解为 3 个子任务：
  1. ✅ 生成 UI 设计稿（已完成）
  2. 🔄 实现布局结构（进行中）
  3. ⏳ 实现交互逻辑（待开始）

💾 进度已保存，可随时使用 /feat --resume 继续
```

## 总结

通过以上方案的组合实施，可以显著改善对话截断问题：

1. **智能超时管理**：在超时前保存状态
2. **主动上下文管理**：避免上下文溢出
3. **分段执行**：支持复杂任务
4. **流式优化**：提高稳定性
5. **后端协同**：彻底解决超时

建议优先实施方案 1 和 2，它们可以快速改善用户体验，且不需要大规模重构。

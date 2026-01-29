# 对话截断问题 - 快速修复方案

> 目标：在不大规模重构的情况下，快速改善对话截断问题
> 实施时间：1-2 天

## 🎯 核心问题

从你的日志来看，问题发生在：
```
✻ Cogitated for 1m 3s
```

**根本原因**：
1. Extended thinking (深度思考) 消耗了大量时间
2. 准备调用 UI-UX-Designer Agent 时超时
3. 没有优雅降级机制

## 🚀 快速修复方案

### 修复 1：添加软超时警告（最高优先级）

**位置**：`src/brain/agent-dispatcher.ts`

**当前代码**：
```typescript
const timeout = filteredConfig.timeout ?? this.options.defaultTimeout

return Promise.race([
  executeFn(filteredConfig),
  new Promise<OrchestrationResult>((_, reject) =>
    setTimeout(() => reject(new Error('Agent execution timeout')), timeout)
  )
])
```

**修改为**：
```typescript
const timeout = filteredConfig.timeout ?? this.options.defaultTimeout
const softTimeout = timeout * 0.8  // 80% 时发出警告

let softTimeoutReached = false

// 软超时警告
const softTimer = setTimeout(() => {
  softTimeoutReached = true
  this.logger.warn(`⚠️ Agent ${agentId} 执行时间较长，可能需要分解任务`)
  // 可以通过事件通知用户
  this.emit('soft-timeout', { agentId, elapsed: softTimeout })
}, softTimeout)

try {
  const result = await Promise.race([
    executeFn(filteredConfig),
    new Promise<OrchestrationResult>((_, reject) =>
      setTimeout(() => {
        clearTimeout(softTimer)
        reject(new Error('Agent execution timeout'))
      }, timeout)
    )
  ])
  clearTimeout(softTimer)
  return result
} catch (error) {
  clearTimeout(softTimer)

  // 如果是超时错误，提供更友好的提示
  if (error.message === 'Agent execution timeout') {
    throw new Error(
      `任务执行超时。建议：\n` +
      `1. 使用 /compact 清理上下文\n` +
      `2. 将任务分解为更小的步骤\n` +
      `3. 检查网络连接`
    )
  }
  throw error
}
```

**效果**：
- 用户在 4 分钟时看到警告，而不是 5 分钟后突然失败
- 提供明确的改进建议

---

### 修复 2：自动上下文检查（高优先级）

**位置**：`src/commands/ccjk-feat.ts` 或创建新的中间件

**添加代码**：
```typescript
// src/middleware/context-checker.ts (新文件)
import { analyzeContext } from '../core/mcp-search'

export async function checkContextBeforeExecution(): Promise<void> {
  const analysis = await analyzeContext()

  if (analysis.percentageUsed > 0.85) {
    // 危险区：强制建议压缩
    console.log('\n⚠️ 上下文使用率过高 (>85%)，强烈建议执行以下操作：')
    console.log('   1. 输入 /compact 清理上下文')
    console.log('   2. 或者开始新对话')
    console.log('\n当前状态已自动保存到 .ccjk/plan/current/\n')

    // 自动保存当前状态
    await saveCurrentState()

    throw new Error('Context usage too high, please compact first')
  } else if (analysis.percentageUsed > 0.70) {
    // 警告区：提示但继续
    console.log('\n💡 提示：上下文使用率较高 (>70%)，建议稍后执行 /compact\n')
  }
}

// 在 feat 命令中使用
export async function executeFeat(input: string) {
  // 执行前检查
  await checkContextBeforeExecution()

  // 继续执行...
}
```

**效果**：
- 在问题发生前主动提醒用户
- 自动保存状态，避免数据丢失

---

### 修复 3：Agent 调用前的预检查（中优先级）

**位置**：`src/brain/orchestrator.ts`

**添加代码**：
```typescript
// 在调用 Agent 前进行预检查
private async preflightCheck(agentType: string): Promise<PreflightResult> {
  const checks = {
    contextUsage: await this.checkContextUsage(),
    estimatedTime: this.estimateAgentTime(agentType),
    availableTimeout: this.getRemainingTimeout()
  }

  // 如果预计时间超过可用时间，建议分段
  if (checks.estimatedTime > checks.availableTimeout * 0.8) {
    return {
      canProceed: false,
      reason: 'estimated-timeout',
      suggestion: '建议将任务分解为更小的步骤'
    }
  }

  // 如果上下文使用率过高，建议压缩
  if (checks.contextUsage > 0.80) {
    return {
      canProceed: false,
      reason: 'high-context-usage',
      suggestion: '建议先执行 /compact 清理上下文'
    }
  }

  return { canProceed: true }
}

// 在 dispatchAgent 中使用
async dispatchAgent(config: AgentConfig): Promise<OrchestrationResult> {
  // 预检查
  const preflight = await this.preflightCheck(config.type)

  if (!preflight.canProceed) {
    this.logger.warn(`Preflight check failed: ${preflight.reason}`)
    console.log(`\n⚠️ ${preflight.suggestion}\n`)

    // 返回建议而不是直接失败
    return {
      success: false,
      message: preflight.suggestion,
      data: { reason: preflight.reason }
    }
  }

  // 继续执行...
}
```

**效果**：
- 在调用 Agent 前就能发现潜在问题
- 避免浪费时间在注定会超时的操作上

---

### 修复 4：流式输出缓冲（中优先级）

**位置**：API 调用层

**添加代码**：
```typescript
// src/api-providers/stream-buffer.ts (新文件)
export class StreamBuffer {
  private buffer: string[] = []
  private saveInterval: NodeJS.Timeout | null = null
  private readonly AUTO_SAVE_INTERVAL = 10000  // 每 10 秒自动保存

  constructor(private savePath: string) {
    // 启动自动保存
    this.saveInterval = setInterval(() => {
      this.saveBuffer()
    }, this.AUTO_SAVE_INTERVAL)
  }

  append(chunk: string): void {
    this.buffer.push(chunk)
  }

  private async saveBuffer(): Promise<void> {
    if (this.buffer.length === 0) return

    const content = this.buffer.join('')
    await fs.writeFile(
      this.savePath,
      content,
      { encoding: 'utf-8' }
    )
  }

  async finalize(): Promise<string> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }
    await this.saveBuffer()
    return this.buffer.join('')
  }

  getContent(): string {
    return this.buffer.join('')
  }
}

// 使用示例
async function streamWithBuffer(stream: AsyncIterable<string>) {
  const buffer = new StreamBuffer('.ccjk/temp/stream-buffer.txt')

  try {
    for await (const chunk of stream) {
      buffer.append(chunk)
      yield chunk
    }
    await buffer.finalize()
  } catch (error) {
    // 即使流中断，也能保存已接收的内容
    console.log('\n⚠️ 流式输出中断，已保存部分内容到：')
    console.log('   .ccjk/temp/stream-buffer.txt\n')
    await buffer.finalize()
    throw error
  }
}
```

**效果**：
- 即使流中断，也不会丢失已生成的内容
- 用户可以查看部分结果

---

## 📋 实施优先级

### 第一阶段（立即实施）
1. ✅ **修复 1**：软超时警告 - 30 分钟
2. ✅ **修复 2**：上下文检查 - 1 小时

### 第二阶段（本周内）
3. ✅ **修复 3**：预检查机制 - 2 小时
4. ✅ **修复 4**：流式缓冲 - 2 小时

### 第三阶段（下周）
5. 🔄 完整的任务分段系统
6. 🔄 状态恢复机制

---

## 🧪 测试方案

### 测试用例 1：长时间执行
```bash
# 模拟长时间执行的任务
/feat 实现一个复杂的用户认证系统，包括：
- JWT 认证
- OAuth 集成
- 权限管理
- 审计日志
```

**预期结果**：
- 4 分钟时看到软超时警告
- 提示用户可以分解任务
- 如果超时，状态已保存

### 测试用例 2：高上下文使用
```bash
# 在长对话后执行
/feat 添加新功能
```

**预期结果**：
- 执行前看到上下文使用率警告
- 建议执行 /compact
- 如果使用率 >85%，拒绝执行并保存状态

### 测试用例 3：流式中断
```bash
# 在网络不稳定时执行
/feat 生成详细的 API 文档
```

**预期结果**：
- 如果流中断，部分内容已保存
- 提示用户查看 .ccjk/temp/stream-buffer.txt

---

## 💡 用户使用建议

在实施这些修复后，建议用户：

### 1. 定期清理上下文
```bash
# 每完成一个大任务后
/compact
```

### 2. 分解复杂任务
```bash
# 不好的做法
/feat 实现整个用户系统

# 好的做法
/feat 实现用户注册功能
# 完成后
/feat 实现用户登录功能
# 完成后
/feat 实现权限管理
```

### 3. 使用 --plan 选项
```bash
# 先生成规划，不立即执行
/feat --plan 实现复杂功能

# 审查规划后再执行
/feat --execute
```

### 4. 监控上下文使用
```bash
# 随时检查上下文状态
/status
```

---

## 🔧 后端配合改进

如果你们已经在后端做了改进，建议同时实施：

### 1. 增加超时限制
```typescript
// 后端配置
const config = {
  timeout: 600000,  // 从 5 分钟增加到 10 分钟
  streamTimeout: 120000,  // 流式超时 2 分钟
}
```

### 2. 添加心跳机制
```typescript
// 每 30 秒发送心跳，保持连接
setInterval(() => {
  res.write(':heartbeat\n\n')
}, 30000)
```

### 3. 分块传输
```typescript
// 将大响应分块传输
for (const chunk of largeResponse) {
  res.write(chunk)
  await sleep(100)  // 避免过快导致缓冲区溢出
}
```

---

## 📊 监控指标

实施后需要监控：

```typescript
interface TruncationMetrics {
  // 超时相关
  softTimeoutTriggered: number    // 软超时触发次数
  hardTimeoutTriggered: number    // 硬超时触发次数
  averageExecutionTime: number    // 平均执行时间

  // 上下文相关
  contextWarningCount: number     // 上下文警告次数
  contextBlockCount: number       // 上下文阻止执行次数
  compactCommandUsage: number     // /compact 使用次数

  // 流式相关
  streamInterruptions: number     // 流中断次数
  partialSaveCount: number        // 部分保存次数
}
```

---

## ✅ 验收标准

修复成功的标准：

1. **软超时警告**：80% 的长时间任务在超时前收到警告
2. **上下文管理**：90% 的高上下文使用被提前发现
3. **流式保护**：100% 的流中断都能保存部分内容
4. **用户满意度**：对话截断投诉减少 80%

---

## 🚀 开始实施

建议从修复 1 和 2 开始，它们：
- 实施简单（< 2 小时）
- 效果明显
- 风险低
- 不需要大规模重构

准备好了吗？我可以帮你实施这些修复！

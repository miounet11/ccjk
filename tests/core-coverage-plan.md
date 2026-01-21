# CCJK 测试覆盖率提升计划

## 目标
- 从 5 个测试文件 → 50+ 个测试文件
- 从 0% 覆盖率 → 80% 覆盖率
- 覆盖所有核心模块

## 优先级列表

### P0 - 核心功能测试 (必须覆盖)
- [ ] `src/brain/orchestrator.test.ts` - Agent 编排核心
- [ ] `src/brain/agent-fork.test.ts` - Fork 上下文
- [ ] `src/brain/agent-dispatcher.test.ts` - Agent 调度
- [ ] `src/brain/skill-hot-reload.test.ts` - 技能热加载
- [ ] `src/brain/thinking-mode.test.ts` - 思考模式
- [ ] `src/core/permissions/wildcard-rules.test.ts` - 权限通配符
- [ ] `src/config/mcp-services.test.ts` - MCP 服务
- [ ] `src/utils/config.test.ts` - 配置管理

### P1 - 集成测试
- [ ] `tests/integration/init-workflow.test.ts` - 完整初始化流程
- [ ] `tests/integration/config-switch.test.ts` - 配置切换
- [ ] `tests/integration/cloud-sync.test.ts` - 云同步
- [ ] `tests/integration/skill-install.test.ts` - 技能安装

### P2 - 边界测试
- [ ] `tests/edge/error-handling.test.ts` - 错误处理
- [ ] `tests/edge/platform-compat.test.ts` - 跨平台兼容
- [ ] `tests/edge/network-failure.test.ts` - 网络故障
- [ ] `tests/edge/concurrent-operations.test.ts` - 并发操作

## 测试模板

```typescript
// src/brain/orchestrator.test.ts 模板
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { BrainOrchestrator } from '@/brain/orchestrator'

describe('BrainOrchestrator', () => {
  let orchestrator: BrainOrchestrator

  beforeEach(() => {
    orchestrator = new BrainOrchestrator()
  })

  afterEach(async () => {
    await orchestrator.cleanup()
  })

  describe('Fork Context', () => {
    it('should execute in isolated fork context', async () => {
      const result = await orchestrator.executeInForkContext({
        agentType: 'planner',
        mode: 'readonly',
      })
      expect(result.success).toBe(true)
    })

    it('should handle fork errors gracefully', async () => {
      // 测试错误处理
    })
  })

  describe('Parallel Execution', () => {
    it('should execute multiple agents in parallel', async () => {
      // 测试并行执行
    })
  })
})
```

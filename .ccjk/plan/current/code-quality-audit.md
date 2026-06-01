# 功能规划：CCJK 代码质量全面审查与修复

## 📋 概述

- **功能目标**: 发现并修复所有影响用户使用的逻辑和功能问题
- **预期价值**: 确保软件功能可用，让用户能够体验到 CCJK 的强大能力
- **影响范围**: 核心模块（orchestrators, cloud-client, cloud-sync, analyzers）

## 🎯 功能分解

### 已完成 ✅
- [x] 修复 local fallback recommendations 字段访问问题
- [x] 添加 ProjectAnalysis.fingerprint 类型声明
- [x] 统一 Cloud API 版本路径
- [x] 修复 cloud sync 冲突解决持久化
- [x] 文档化 transitive deps 限制

### 待修复 🔧

#### 关键问题 (Critical)
- [ ] Issue 3: resolveConflict 返回类型不匹配
- [ ] Issue 2: 验证 cloud-client 模块导出
- [ ] Issue 4: 验证 analyzers 模块导出

#### 高优先级 (High)
- [ ] Issue 6: 移除 sync-engine 中的 `as any` 类型转换
- [ ] Issue 10: 添加 SyncEngine destroy() 方法防止内存泄漏
- [ ] Issue 8: 验证所有 i18n 键存在
- [ ] Issue 9: 改进 package.json 路径获取方式

#### 中优先级 (Medium)
- [ ] Issue 11: 移除未使用的 enableCache 配置
- [ ] Issue 13: 统一 null 检查处理
- [ ] Issue 15: 清理重复导出

## 📐 技术方案

### Issue 3: resolveConflict 返回类型修复

**问题**: `index.ts` 中 `resolveConflict` 声明返回 `Promise<SyncResult>`，但调用的 `resolveConflictManually` 返回 `Promise<void>`

**方案**: 构造 SyncResult 返回值

```typescript
export async function resolveConflict(
  conflictId: string,
  resolution: 'local' | 'remote',
): Promise<SyncResult> {
  if (!syncEngineInstance) {
    throw new Error('Sync engine not configured')
  }

  const startTime = Date.now()
  const startedAt = new Date().toISOString()

  try {
    await syncEngineInstance.resolveConflictManually(conflictId, resolution)

    return {
      success: true,
      direction: 'bidirectional',
      pushed: [],
      pulled: [],
      conflicts: [],
      errors: [],
      durationMs: Date.now() - startTime,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      direction: 'bidirectional',
      pushed: [],
      pulled: [],
      conflicts: [],
      errors: [{
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }],
      durationMs: Date.now() - startTime,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }
}
```

### Issue 10: SyncEngine 内存泄漏修复

**方案**: 添加 destroy() 方法

```typescript
destroy(): void {
  // Stop auto-sync timer
  if (this.autoSyncTimer) {
    clearInterval(this.autoSyncTimer)
    this.autoSyncTimer = null
  }

  // Remove all event listeners
  this.emitter.removeAllListeners()

  // Clear caches
  this.localItemsCache.clear()

  // Reset state
  this.state = { ...INITIAL_SYNC_STATE }
}
```

### Issue 11: 移除未使用的 enableCache

**方案**: 从 createCloudClient 默认配置中移除，或实现缓存功能

## ✅ 验收标准

### 功能验收点
1. 所有 TypeScript 编译无错误
2. 所有导出模块可正常导入
3. 冲突解决功能返回正确的 SyncResult
4. 无内存泄漏（SyncEngine 可正确销毁）
5. 所有 i18n 键有对应翻译

### 测试覆盖
- [ ] cloud-sync/index.ts 单元测试
- [ ] sync-engine.ts destroy() 测试
- [ ] cloud-client 导出验证测试

## ⏱️ 实施计划

### 阶段 1: 关键问题修复
1. 修复 resolveConflict 返回类型
2. 验证模块导出完整性

### 阶段 2: 高优先级修复
1. 添加 SyncEngine.destroy()
2. 移除 `as any` 类型转换
3. 验证 i18n 键

### 阶段 3: 清理优化
1. 移除未使用配置
2. 统一代码风格
3. 清理重复导出

## 📊 执行状态

| 子任务 | 状态 | 进度 |
|--------|------|------|
| Issue 3: 返回类型修复 | ⏳ 待开始 | 0% |
| Issue 10: 内存泄漏修复 | ⏳ 待开始 | 0% |
| Issue 11: 移除未用配置 | ⏳ 待开始 | 0% |
| 模块导出验证 | ⏳ 待开始 | 0% |
| i18n 键验证 | ⏳ 待开始 | 0% |

整体进度: [░░░░░░░░░░░░░░░░] 0%

---

## 📝 迭代历史

### v1 - 2026-01-31
- 初始版本
- 基于代码审查发现 15 个问题
- 已修复 5 个问题（之前的修复）
- 待修复 10 个问题

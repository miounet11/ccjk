# MCP 性能优化方案

## 📋 概述

本方案旨在解决 Claude Code 中 MCP 服务过多导致的性能问题，包括：
- CPU 占用过高 (115%)
- `/compact` 命令失效
- 上下文 token 消耗过大

## 🎯 核心功能

### 1. MCP 分级系统 (Tier System)

将 MCP 服务分为三个层级：

```typescript
// src/config/mcp-tiers.ts
export type McpTier = 'core' | 'ondemand' | 'scenario'

export interface McpTierConfig {
  tier: McpTier
  autoStart: boolean        // 是否自动启动
  idleTimeout?: number      // 空闲超时（秒），超时后自动释放
  maxConcurrent?: number    // 最大并发数
}

export const MCP_TIER_DEFAULTS: Record<McpTier, McpTierConfig> = {
  core: {
    tier: 'core',
    autoStart: true,
    idleTimeout: undefined,  // 永不超时
  },
  ondemand: {
    tier: 'ondemand',
    autoStart: false,
    idleTimeout: 300,        // 5分钟空闲后释放
  },
  scenario: {
    tier: 'scenario',
    autoStart: false,
    idleTimeout: 600,        // 10分钟空闲后释放
  },
}
```

**服务分级映射：**

| 服务 | 层级 | 说明 |
|------|------|------|
| context7 | core | 文档查询，高频使用 |
| open-websearch | core | 网络搜索，高频使用 |
| mcp-deepwiki | ondemand | 深度文档，按需启动 |
| Playwright | ondemand | 浏览器自动化，按需启动 |
| puppeteer | ondemand | 浏览器自动化，按需启动 |
| filesystem | ondemand | 文件操作，按需启动 |
| memory | ondemand | 知识图谱，按需启动 |
| sequential-thinking | ondemand | AI 增强，按需启动 |
| fetch | ondemand | HTTP 请求，按需启动 |
| sqlite | scenario | 数据库，场景启动 |
| spec-workflow | scenario | 工作流，场景启动 |
| serena | scenario | IDE 助手，场景启动 |

---

### 2. MCP Profile 配置预设

```typescript
// src/config/mcp-profiles.ts
export interface McpProfile {
  id: string
  name: string
  description: string
  services: string[]        // 启用的服务 ID 列表
  maxServices?: number      // 最大服务数限制
}

export const MCP_PROFILES: McpProfile[] = [
  {
    id: 'minimal',
    name: '极简模式',
    description: '仅核心服务，最佳性能',
    services: ['context7', 'open-websearch'],
    maxServices: 3,
  },
  {
    id: 'development',
    name: '开发模式',
    description: '适合日常开发',
    services: ['context7', 'open-websearch', 'mcp-deepwiki', 'filesystem'],
    maxServices: 5,
  },
  {
    id: 'testing',
    name: '测试模式',
    description: '包含浏览器自动化',
    services: ['context7', 'open-websearch', 'Playwright'],
    maxServices: 4,
  },
  {
    id: 'full',
    name: '全功能模式',
    description: '所有服务（高资源消耗）',
    services: [], // 空数组表示全部
    maxServices: undefined,
  },
]
```

**命令行接口：**

```bash
# 列出所有预设
ccjk mcp profile list

# 切换预设
ccjk mcp profile use minimal

# 查看当前预设
ccjk mcp profile current

# 创建自定义预设
ccjk mcp profile create my-profile --services context7,Playwright
```

---

### 3. 安装时性能警告

在 `init` 和 `mcp install` 时添加警告：

```typescript
// src/utils/mcp-performance.ts
export interface PerformanceWarning {
  level: 'info' | 'warning' | 'critical'
  message: string
  suggestion: string
}

export function checkMcpPerformance(serviceCount: number): PerformanceWarning | null {
  if (serviceCount >= 8) {
    return {
      level: 'critical',
      message: `⚠️ 已配置 ${serviceCount} 个 MCP 服务，可能导致严重性能问题`,
      suggestion: '建议使用 `ccjk mcp profile use minimal` 切换到极简模式',
    }
  }
  if (serviceCount >= 5) {
    return {
      level: 'warning',
      message: `⚡ 已配置 ${serviceCount} 个 MCP 服务，可能影响响应速度`,
      suggestion: '建议禁用不常用的服务，或使用 `ccjk mcp profile` 管理',
    }
  }
  return null
}
```

---

### 4. MCP 健康检查 (mcp-doctor)

扩展现有 `doctor` 命令：

```typescript
// src/commands/mcp-doctor.ts
export interface McpHealthResult {
  serviceId: string
  status: 'healthy' | 'slow' | 'unresponsive' | 'error'
  responseTime?: number     // 毫秒
  memoryUsage?: number      // MB
  lastActivity?: Date
  error?: string
}

export async function mcpDoctor(): Promise<void> {
  console.log('🔍 MCP 健康检查\n')

  // 1. 检查服务数量
  const services = await listInstalledMcpServices()
  const warning = checkMcpPerformance(services.length)
  if (warning) {
    console.log(warning.message)
    console.log(warning.suggestion)
  }

  // 2. 检查每个服务的响应时间
  for (const service of services) {
    const health = await checkServiceHealth(service)
    displayHealthResult(health)
  }

  // 3. 给出优化建议
  displayOptimizationSuggestions(services)
}
```

**命令行接口：**

```bash
# 运行健康检查
ccjk mcp doctor

# 检查特定服务
ccjk mcp doctor --service Playwright

# 显示详细信息
ccjk mcp doctor --verbose
```

---

### 5. MCP 自动释放机制 ⭐ 关键功能

这是解决 MCP "卡住" 问题的核心功能：

```typescript
// src/utils/mcp-lifecycle.ts
export interface McpLifecycleConfig {
  idleTimeout: number       // 空闲超时（秒）
  maxIdleServices: number   // 最大空闲服务数
  healthCheckInterval: number // 健康检查间隔（秒）
}

export const DEFAULT_LIFECYCLE_CONFIG: McpLifecycleConfig = {
  idleTimeout: 300,         // 5分钟
  maxIdleServices: 3,
  healthCheckInterval: 60,  // 1分钟
}

/**
 * MCP 生命周期管理器
 * 负责监控和自动释放空闲的 MCP 服务
 */
export class McpLifecycleManager {
  private lastActivity: Map<string, Date> = new Map()
  private checkInterval: NodeJS.Timeout | null = null

  /**
   * 记录服务活动
   */
  recordActivity(serviceId: string): void {
    this.lastActivity.set(serviceId, new Date())
  }

  /**
   * 检查并释放空闲服务
   */
  async checkAndReleaseIdle(): Promise<string[]> {
    const released: string[] = []
    const now = Date.now()
    const config = this.getConfig()

    for (const [serviceId, lastTime] of this.lastActivity) {
      const idleMs = now - lastTime.getTime()
      const tierConfig = getMcpTierConfig(serviceId)

      // 核心服务不释放
      if (tierConfig.tier === 'core') continue

      // 超过空闲时间则释放
      const timeout = tierConfig.idleTimeout || config.idleTimeout
      if (idleMs > timeout * 1000) {
        await this.releaseService(serviceId)
        released.push(serviceId)
      }
    }

    return released
  }

  /**
   * 强制释放指定服务
   */
  async releaseService(serviceId: string): Promise<boolean> {
    // 实现服务释放逻辑
    // 这需要与 Claude Code 的 MCP 管理机制集成
    console.log(`🔄 释放空闲服务: ${serviceId}`)
    this.lastActivity.delete(serviceId)
    return true
  }

  /**
   * 快速释放所有非核心服务
   */
  async releaseAllNonCore(): Promise<string[]> {
    const released: string[] = []

    for (const [serviceId] of this.lastActivity) {
      const tierConfig = getMcpTierConfig(serviceId)
      if (tierConfig.tier !== 'core') {
        await this.releaseService(serviceId)
        released.push(serviceId)
      }
    }

    return released
  }
}
```

**命令行接口：**

```bash
# 释放所有空闲服务
ccjk mcp release

# 释放指定服务
ccjk mcp release Playwright

# 释放所有非核心服务
ccjk mcp release --all

# 设置自动释放超时
ccjk mcp config --idle-timeout 300
```

---

## 📁 文件结构

```
src/
├── config/
│   ├── mcp-services.ts      # 现有：MCP 服务配置
│   ├── mcp-tiers.ts         # 新增：MCP 分级配置
│   └── mcp-profiles.ts      # 新增：MCP 预设配置
├── utils/
│   ├── mcp-installer.ts     # 现有：MCP 安装器
│   ├── mcp-performance.ts   # 新增：性能检查工具
│   └── mcp-lifecycle.ts     # 新增：生命周期管理
├── commands/
│   ├── mcp-market.ts        # 现有：MCP 市场
│   ├── mcp-profile.ts       # 新增：Profile 管理命令
│   ├── mcp-doctor.ts        # 新增：MCP 健康检查
│   └── mcp-release.ts       # 新增：MCP 释放命令
└── types.ts                 # 更新：添加新类型定义
```

---

## 🔧 实现优先级

| 优先级 | 功能 | 工作量 | 影响 |
|--------|------|--------|------|
| P0 | MCP 自动释放机制 | 中 | 🔴 高 |
| P0 | 安装时性能警告 | 小 | 🔴 高 |
| P1 | MCP Profile 预设 | 中 | 🟡 中 |
| P1 | MCP 健康检查 | 中 | 🟡 中 |
| P2 | MCP 分级系统 | 大 | 🟢 低 |

---

## 🚀 快速开始实现

### 第一步：添加性能警告（最快见效）

修改 `src/commands/init.ts`，在 MCP 选择后添加警告。

### 第二步：实现 MCP 释放命令

创建 `src/commands/mcp-release.ts`，提供手动释放功能。

### 第三步：实现 Profile 系统

创建配置文件和命令，支持快速切换。

### 第四步：集成健康检查

扩展 `doctor` 命令，添加 MCP 专项检查。

---

## ⚠️ 注意事项

1. **Claude Code 限制**：MCP 服务的启动/停止由 Claude Code 控制，CCJK 只能管理配置
2. **配置生效**：修改 MCP 配置后需要重启 Claude Code
3. **兼容性**：确保与现有 `mcp-market` 命令兼容

---

## 📊 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| MCP 服务数 | 10 | 2-4 (按需) |
| CPU 占用 | 115% | < 50% |
| 内存占用 | 高 | 降低 60% |
| `/compact` 响应 | 超时 | 正常 |
| 上下文 token | 大量 MCP 工具 | 精简 |

---

*方案版本: 1.0*
*创建日期: 2025-01-XX*

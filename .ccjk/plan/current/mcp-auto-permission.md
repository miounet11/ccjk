# 功能规划：MCP 工具自动授权

## 📋 概述

### 功能目标
用户安装 MCP 服务后，自动将该 MCP 服务的所有工具添加到 `settings.json` 的 `permissions.allow` 列表中，避免每次使用 MCP 工具时都需要手动确认权限。

### 预期价值
- 提升用户体验：消除重复的权限确认弹窗
- 保持安全性：仅授权用户明确安装的 MCP 服务
- 与 Claude Code 原生权限系统无缝集成

### 影响范围
- `src/utils/mcp-installer.ts` - MCP 安装逻辑
- `src/permissions/permission-manager.ts` - 权限管理
- `~/.claude/settings.json` - Claude Code 配置文件

---

## 🎯 功能分解

- [x] 分析现有权限系统架构
- [ ] 在 MCP 安装流程中添加自动授权逻辑
- [ ] 支持 MCP 卸载时自动移除权限
- [ ] 添加用户可选的授权确认（可选）

---

## 📐 技术方案

### 核心原理

Claude Code 使用 `~/.claude/settings.json` 中的 `permissions.allow` 数组来管理工具权限。MCP 工具的权限格式为：

```
mcp__<server-name>__*     # 授权某个 MCP 服务的所有工具
mcp__<server-name>__<tool>  # 授权某个 MCP 服务的特定工具
```

### 实现方案

#### 方案 A：安装时自动授权（推荐）

在 `installMcpServiceForClaudeCode()` 函数中，安装 MCP 服务后自动添加权限规则：

```typescript
// 在 mcp-installer.ts 中
async function installMcpServiceForClaudeCode(
  serviceId: string,
  baseConfig: McpServerConfig,
  apiKey?: string,
  apiKeyEnvVar?: string,
): Promise<void> {
  // ... 现有安装逻辑 ...

  // 新增：自动添加 MCP 权限
  await addMcpPermission(serviceId)
}

// 新增函数
async function addMcpPermission(serviceId: string): Promise<void> {
  const settingsPath = join(homedir(), '.claude', 'settings.json')
  let settings: any = {}

  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  }

  // 确保 permissions.allow 数组存在
  if (!settings.permissions) {
    settings.permissions = {}
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = []
  }

  // 添加 MCP 服务的通配符权限
  const mcpPattern = `mcp__${serviceId}__*`
  if (!settings.permissions.allow.includes(mcpPattern)) {
    settings.permissions.allow.push(mcpPattern)
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}
```

#### 方案 B：使用 PermissionManager（更规范）

利用现有的 `PermissionManager` 类：

```typescript
import { PermissionManager } from '../permissions/permission-manager'

async function addMcpPermission(serviceId: string): Promise<void> {
  const pm = new PermissionManager()
  pm.addPermission({
    type: 'allow',
    pattern: `mcp__${serviceId}__*`,
    scope: 'global',
    description: `Auto-granted for MCP service: ${serviceId}`,
  })
}
```

### 卸载时移除权限

在 `uninstallMcpService()` 中添加权限移除逻辑：

```typescript
async function removeMcpPermission(serviceId: string): Promise<void> {
  const pm = new PermissionManager()
  pm.removePermission(`mcp__${serviceId}__*`, 'allow')
}
```

---

## ✅ 验收标准

### 功能验收点
1. 安装 MCP 服务后，`~/.claude/settings.json` 中自动添加 `mcp__<serviceId>__*` 权限
2. 使用该 MCP 服务的工具时不再弹出权限确认
3. 卸载 MCP 服务后，相应权限被移除
4. 不影响用户手动添加的其他权限规则

### 测试场景
1. 安装 `filesystem-mcp` → 检查 `mcp__filesystem-mcp__*` 是否在 allow 列表中
2. 使用 `list_directory` 工具 → 不应弹出权限确认
3. 卸载 `filesystem-mcp` → 检查权限是否被移除

---

## ⏱️ 实施计划

### 阶段 1：核心功能
1. 修改 `src/utils/mcp-installer.ts`
   - 在 `installMcpServiceForClaudeCode()` 中添加权限授权
   - 创建 `addMcpPermission()` 辅助函数

### 阶段 2：卸载支持
2. 修改卸载逻辑
   - 在 `uninstallMcpService()` 中添加权限移除
   - 创建 `removeMcpPermission()` 辅助函数

### 阶段 3：测试与发布
3. 测试验证
4. 版本发布

---

## 📝 注意事项

### 安全考虑
- 仅授权用户明确安装的 MCP 服务
- 不使用 `mcp__*__*` 这种过于宽泛的通配符
- 保留用户手动配置的权限规则

### 兼容性
- 兼容 Claude Code 2.0.70+ 的权限格式
- 不影响现有的 CCJK 权限管理功能

# MCP Marketplace Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../) › **mcp-marketplace**

**Last Updated**: 2025-01-20

---

## 📦 Module Overview

MCP Marketplace 提供 MCP 包的发现、搜索、安装和管理功能。支持离线缓存、请求去重、版本管理和依赖解析。

## 🎯 Core Responsibilities

- **Package Discovery**: 从 marketplace API 获取可用包列表
- **Search & Filter**: 按关键词、分类、标签搜索包
- **Version Management**: 检查更新、安装特定版本
- **Dependency Resolution**: 自动解析和安装依赖
- **Offline Cache**: 支持离线模式和缓存管理
- **Security Scanning**: 包安全性检查和验证
- **Plugin Management**: 插件安装、更新、卸载

## 📁 Module Structure

```
src/mcp-marketplace/
├── index.ts                  # 模块导出
├── marketplace-client.ts     # HTTP 客户端，API 通信
├── plugin-manager.ts         # 插件安装和管理
├── security-scanner.ts       # 安全扫描和验证
├── skill.ts                  # Skill 相关功能
└── types.ts                  # 类型定义
```

## 🔗 Dependencies

### Internal Dependencies
- `src/utils/fs-operations` - 原子文件写入
- `src/constants` - 常量定义

### External Dependencies
- `node:fs` - 文件系统操作
- `node:os` - 系统信息
- `pathe` - 跨平台路径处理
- `nanoid` - ID 生成

## 🚀 Key Interfaces

```typescript
// Marketplace Client
class MarketplaceClient {
  searchPackages(query: string, options?: SearchOptions): Promise<SearchResult>
  getPackageDetails(packageId: string): Promise<MCPPackage>
  listCategories(): Promise<CategoryInfo[]>
  checkUpdates(installedPackages: InstalledPackage[]): Promise<UpdateInfo[]>
  getVersionHistory(packageId: string): Promise<VersionInfo[]>
}

// Plugin Manager
class PluginManager {
  install(packageId: string, options?: InstallOptions): Promise<InstallResult>
  update(packageId: string): Promise<UpdateResult>
  uninstall(packageId: string): Promise<void>
  checkDependencies(packageId: string): Promise<DependencyCheck>
  listInstalled(): Promise<InstalledPackage[]>
}

// Security Scanner
class SecurityScanner {
  scanPackage(pkg: MCPPackage): Promise<SecurityScanResult>
  verifyChecksum(packageId: string, version: string): Promise<boolean>
  checkPermissions(pkg: MCPPackage): Promise<PermissionCheck>
}
```

## 📊 Performance Metrics

- **API Request Timeout**: 30s
- **Cache TTL**: 1 hour (可配置)
- **Request Deduplication**: 自动合并重复请求
- **Throttling**: 100ms 间隔
- **Max Retries**: 3 次
- **Offline Mode**: 支持完全离线操作

## 🧪 Testing

Test files: None yet (needs coverage)

### Test Strategy
- Unit tests for MarketplaceClient (API 调用、缓存、去重)
- Unit tests for PluginManager (安装、更新、依赖解析)
- Unit tests for SecurityScanner (漏洞检测、权限检查)
- Integration tests with mock API
- Offline mode tests
- Cache invalidation tests
- Dependency conflict resolution tests

## 📝 Usage Example

```typescript
import { MarketplaceClient, PluginManager } from '@/mcp-marketplace'

// Search packages
const client = new MarketplaceClient()
const results = await client.searchPackages('database', {
  category: 'data',
  tags: ['sql', 'postgres']
})

// Install plugin
const manager = new PluginManager()
const result = await manager.install('mcp-postgres', {
  version: '1.2.0',
  resolveDependencies: true
})

// Check for updates
const installed = await manager.listInstalled()
const updates = await client.checkUpdates(installed)
```

## 🔄 Integration Points

### With Commands Module
- `ccjk mcp search` - 搜索 MCP 包
- `ccjk mcp install` - 安装 MCP 包
- `ccjk mcp update` - 更新已安装包

### With Config Module
- 读取 `~/.ccjk/marketplace-cache.json` 缓存
- 更新 `~/.ccjk/installed-plugins.json` 安装记录

### With Utils Module
- 使用 `fs-operations` 进行原子文件写入
- 使用 `http-client` 进行 API 请求

## 🚧 Future Enhancements

- [ ] Package ratings and reviews
- [ ] Advanced dependency conflict resolution
- [ ] Plugin health monitoring and diagnostics
- [ ] Marketplace contribution workflow
- [ ] Plugin sandboxing and isolation
- [ ] Automatic security vulnerability scanning
- [ ] Plugin usage analytics

---

**📊 Coverage**: Low (needs tests)
**🎯 Priority**: High
**🔄 Status**: Active Development

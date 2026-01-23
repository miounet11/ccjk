# Plugins V2 Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../CLAUDE.md) › plugins-v2

**Last Updated**: 2026年 1月22日 星期四 19时10分33秒 CST

---

## 🔌 Module Overview

The Plugins V2 module is the next-generation plugin system with hot-reload, cloud sync, and advanced lifecycle management.

## 🎯 Core Responsibilities

- **Plugin Loading**: Dynamic plugin loading
- **Hot Reload**: Reload plugins without restart
- **Lifecycle Management**: Plugin lifecycle hooks
- **Cloud Integration**: Cloud-based plugin distribution
- **Dependency Resolution**: Plugin dependency management
- **Sandboxing**: Secure plugin execution

## 📁 Module Structure

```
src/plugins-v2/
├── agents/                 # Agent plugins
├── cloud/                  # Cloud integration
├── core/                   # Core plugin system
├── hooks/                  # Lifecycle hooks
├── intent/                 # Intent recognition
├── mcp/                    # MCP plugins
├── scripts/                # Plugin scripts
├── skills/                 # Skill plugins
├── types/                  # Type definitions
└── index.ts                # Module exports
```

## 🔗 Dependencies

### Internal Dependencies
- `src/cloud-sync` - Cloud synchronization
- `src/brain` - Brain system
- `src/config` - Configuration

## 🚀 Key Interfaces

```typescript
interface PluginLoader {
  load(pluginId: string): Promise<Plugin>
  unload(pluginId: string): void
  reload(pluginId: string): Promise<void>
  list(): Plugin[]
}

interface Plugin {
  id: string
  version: string
  activate(): Promise<void>
  deactivate(): Promise<void>
  execute(input: any): Promise<any>
}

interface PluginHooks {
  onLoad?: () => void
  onUnload?: () => void
  onActivate?: () => void
  onDeactivate?: () => void
}
```

## 📊 Plugin Categories

- **Agents**: AI agent plugins
- **Skills**: Skill extensions
- **MCP**: MCP service plugins
- **Scripts**: Automation scripts
- **Intent**: Intent recognition plugins

## 🧪 Testing

Test files: Not yet created

## 📝 Usage Example

```typescript
import { PluginLoader } from '@/plugins-v2'

const loader = new PluginLoader()
await loader.load('my-plugin')
await loader.reload('my-plugin') // Hot reload
```

## 🚧 Future Enhancements

- [ ] Plugin marketplace integration
- [ ] Plugin versioning system
- [ ] Plugin security scanning
- [ ] Plugin performance profiling

---

**📊 Coverage**: Medium
**🎯 Priority**: High
**🔄 Status**: Production Ready

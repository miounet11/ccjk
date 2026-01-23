# API Providers Module

**📍 Navigation**: [Root](../../CLAUDE.md) › [src](../CLAUDE.md) › api-providers

**Last Updated**: 2026年 1月22日 星期四 19时10分33秒 CST

---

## 🔌 Module Overview

The API Providers module manages multiple AI API providers with unified interface, configuration wizard, and provider-specific implementations.

## 🎯 Core Responsibilities

- **Provider Management**: Manage multiple API providers
- **Unified Interface**: Common interface for all providers
- **Configuration Wizard**: Interactive provider setup
- **Provider Presets**: Pre-configured popular providers (302.AI, GLM, MiniMax, Kimi)

## 📁 Module Structure

```
src/api-providers/
├── __tests__/              # Test files
├── core/                   # Core functionality
├── providers/              # Provider implementations
├── wizard/                 # Configuration wizard
├── index.ts                # Module exports
├── API_DOCUMENTATION.md    # API documentation
├── README.md               # Module documentation
└── USER_GUIDE.md           # User guide
```

## 🔗 Dependencies

### Internal Dependencies
- `src/config` - Configuration management
- `src/i18n` - Internationalization

## 🚀 Key Interfaces

```typescript
interface APIProvider {
  id: string
  name: string
  configure(config: ProviderConfig): void
  call(request: APIRequest): Promise<APIResponse>
}

interface ProviderWizard {
  start(): Promise<ProviderConfig>
  selectProvider(): Promise<string>
  configureProvider(providerId: string): Promise<ProviderConfig>
}
```

## 📊 Supported Providers

- **302.AI** - Chinese AI service
- **GLM** - Zhipu AI
- **MiniMax** - MiniMax AI
- **Kimi** - Moonshot AI
- **OpenAI** - OpenAI API
- **Anthropic** - Claude API
- **Custom** - Custom providers

---

**📊 Coverage**: High
**🎯 Priority**: High
**🔄 Status**: Production Ready

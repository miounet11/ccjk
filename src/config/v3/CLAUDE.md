# Configuration Manager V3

**Last Updated**: 2026-01-25

## Overview

Configuration Manager V3 is a complete rewrite of the CCJK configuration system with full type safety, JSON Schema validation, and modern architecture patterns.

## Features

- **Singleton Pattern**: Single source of truth for configuration
- **JSON Schema Validation**: All configuration validated against schemas
- **Automatic Migration**: Seamless migration from older versions
- **Hot Reload**: File change detection with debounced updates
- **Multi-Environment**: Dev/Prod/Test environment support
- **Configuration Diff**: Compare configuration states

## Structure

```
src/config/v3/
├── index.ts              # Main entry point & unified exports
├── types.ts              # TypeScript type definitions
├── config-manager.ts     # Core singleton manager
├── schema-validator.ts   # JSON Schema validation
├── migration.ts         # Version migration system
└── hot-reload.ts        # File system watching
```

## API Reference

### Basic Usage

```typescript
import { configV3 } from '@/config/v3'

// Get value
const lang = configV3.get<string>('general.preferredLang')

// Set value
configV3.set('general.theme', 'dark')

// Validate
const result = configV3.validate()

// Watch for changes
const unsubscribe = configV3.watch((event) => {
  console.log('Config changed:', event.path)
})
```

### Configuration Manager Methods

#### `get<T>(path: string): T`
Get configuration value by dot-notation path.

#### `set(path: string, value: unknown): void`
Set configuration value by path.

#### `validate(): ValidationResult`
Validate current configuration against schema.

#### `migrate(): MigrationResult`
Migrate from older configuration versions.

#### `watch(callback: ConfigChangeHandler): () => void`
Watch for configuration changes.

#### `export(): string`
Export configuration as JSON string.

#### `import(data: string): void`
Import configuration from JSON string.

#### `diff(other: Partial<ConfigV3>): ConfigDiff`
Generate diff from current config.

#### `reset(): void`
Reset configuration to defaults.

#### `getEnvironment(): Environment`
Get current environment.

#### `setEnvironment(env: Environment): void`
Set current environment.

## Configuration Schema

### Root Structure

```typescript
interface ConfigV3 {
  $version: string
  $environment: 'dev' | 'prod' | 'test'
  $lastUpdated: string

  general: {
    preferredLang: 'zh-CN' | 'en'
    templateLang?: 'zh-CN' | 'en'
    aiOutputLang?: string
    currentTool: CodeToolType
    theme?: 'light' | 'dark' | 'auto'
  }

  tools: {
    claudeCode: ClaudeCodeConfig
    codex: CodexConfig
    [key: string]: ToolConfig
  }

  api: {
    anthropic?: ApiEndpointConfig
    openai?: ApiEndpointConfig
    custom?: ApiEndpointConfig[]
  }

  features: {
    hotReload: boolean
    autoMigration: boolean
    telemetry: boolean
    experimentalFeatures: string[]
  }
}
```

## Validation

Configuration is validated against JSON Schema with support for:

- Required field validation
- Type checking
- Enum values
- Pattern matching (API keys, URLs)
- Range validation
- Custom validators

```typescript
const validator = new SchemaValidator()
const result = validator.validate(config)

if (!result.valid) {
  console.error('Validation errors:', result.errors)
  console.warn('Validation warnings:', result.warnings)
}
```

## Migration

Automatic migration from:
- V1 JSON config (`.zcf-config.json`)
- V2 TOML config (`config.toml`)
- V4 Unified config

```typescript
if (needsMigration()) {
  const result = runMigration()
  if (result.success) {
    console.log('Migration completed:', result.migratedPaths)
  }
}
```

## Hot Reload

```typescript
// Start watching
startHotReload()

// Subscribe to changes
const unsubscribe = onConfigChange((event) => {
  console.log(`${event.path} changed:`, event.newValue)
})

// Stop watching
stopHotReload()
```

## Default Export

The default export `configV3` provides a singleton instance with convenience methods:

```typescript
import configV3 from './config/v3'

// Direct access
const theme = configV3.get('general.theme')

// Watch changes
configV3.watch((event) => {
  console.log('Config changed:', event.path)
})

// Validate
const { valid, errors } = configV3.validate()
```

## Development Notes

### Adding New Fields

1. Update `types.ts` with new type definitions
2. Update `CONFIG_SCHEMA` in `schema-validator.ts`
3. Ensure backward compatibility in migrations

### Custom Validation

```typescript
const customSchema = {
  type: 'object',
  properties: {
    myField: {
      type: 'string',
      required: true,
      format: 'email',
    },
  },
}

const validator = new SchemaValidator(customSchema)
const result = validator.validate(myConfig)
```

## Testing

```typescript
import { ConfigManagerV3 } from './config-manager'

const manager = new (ConfigManagerV3 as any)('/tmp/test-config.json')

// Test operations
manager.set('test.field', 'value')
const result = manager.validate()
expect(result.valid).toBe(true)
```

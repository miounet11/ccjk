# Architecture Documentation

## Overview

The Code Tools Abstraction Layer provides a unified interface for managing multiple AI code tools. This document describes the architecture, design patterns, and implementation details.

## Design Goals

1. **Unified Interface**: Single API for all code tools
2. **Extensibility**: Easy to add new tools (< 5 minutes)
3. **Maintainability**: Reduce code duplication (~500 lines eliminated)
4. **Type Safety**: Full TypeScript support
5. **Flexibility**: Support different tool capabilities
6. **Testability**: Easy to test and mock

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│              (User code using the library)               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Factory Layer                        │
│         (ToolFactory, createTool convenience)            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Registry Layer                        │
│        (ToolRegistry - manages tool instances)           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Abstraction Layer                      │
│    (ICodeTool, IChatTool, IFileEditTool interfaces)     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Base Implementation                     │
│         (BaseCodeTool - common functionality)            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Adapter Layer                        │
│  (ClaudeCodeTool, AiderTool, CursorTool, etc.)          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   External Tools                         │
│        (claude, aider, cursor CLI commands)              │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Type System

#### ToolConfig
Represents tool configuration:
```typescript
interface ToolConfig {
  name: string;           // Tool identifier
  version?: string;       // Tool version
  installPath?: string;   // Installation path
  apiKey?: string;        // API key/token
  model?: string;         // Model to use
  settings?: Record<string, any>;  // Tool-specific settings
  env?: Record<string, string>;    // Environment variables
}
```

#### ToolMetadata
Describes tool capabilities:
```typescript
interface ToolMetadata {
  name: string;           // Tool identifier
  displayName: string;    // Human-readable name
  description: string;    // Tool description
  version: string;        // Current version
  homepage?: string;      // Tool website
  documentation?: string; // Documentation URL
  capabilities: ToolCapabilities;
}
```

#### ToolCapabilities
Defines what a tool can do:
```typescript
interface ToolCapabilities {
  supportsChat: boolean;      // Chat/conversation
  supportsFileEdit: boolean;  // File editing
  supportsCodeGen: boolean;   // Code generation
  supportsReview: boolean;    // Code review
  supportsTesting: boolean;   // Test generation
  supportsDebugging: boolean; // Debugging
  custom?: Record<string, boolean>; // Custom capabilities
}
```

### 2. Interface Hierarchy

```
ICodeTool (base interface)
    │
    ├── IChatTool (adds chat methods)
    │
    ├── IFileEditTool (adds file editing methods)
    │
    └── ICodeGenTool (adds code generation methods)
```

#### ICodeTool
Base interface all tools must implement:
```typescript
interface ICodeTool {
  getMetadata(): ToolMetadata;
  isInstalled(): Promise<InstallStatus>;
  install(): Promise<ExecutionResult>;
  uninstall(): Promise<ExecutionResult>;
  getConfig(): Promise<ToolConfig>;
  updateConfig(updates: Partial<ToolConfig>): Promise<void>;
  configure(config: ToolConfig): Promise<void>;
  validateConfig(config: Partial<ToolConfig>): Promise<boolean>;
  execute(command: string, args?: string[]): Promise<ExecutionResult>;
  getVersion(): Promise<string | undefined>;
  reset(): Promise<void>;
}
```

#### IChatTool
Extends ICodeTool with chat capabilities:
```typescript
interface IChatTool extends ICodeTool {
  chat(prompt: string): Promise<ExecutionResult>;
  continueChat(message: string): Promise<ExecutionResult>;
  endChat(): Promise<void>;
}
```

### 3. BaseCodeTool Abstract Class

Provides common functionality to reduce duplication:

**Responsibilities:**
- Configuration management (load/save/update)
- Command execution
- Version parsing
- Installation checking
- Path resolution

**Extension Points:**
```typescript
abstract class BaseCodeTool {
  // Must be implemented by subclasses
  abstract getMetadata(): ToolMetadata;
  protected abstract getInstallCheckCommand(): string;
  protected abstract getInstallCommand(): string;
  protected abstract getUninstallCommand(): string;

  // Can be overridden if needed
  protected parseVersion(output: string): string | undefined;
  protected buildCommand(command: string, args: string[]): string;
  protected async validateConfig(config: Partial<ToolConfig>): Promise<boolean>;
}
```

**Common Functionality:**
- `isInstalled()`: Executes install check command
- `install()`: Executes install command
- `uninstall()`: Executes uninstall command
- `getConfig()`: Loads config from file
- `updateConfig()`: Updates and saves config
- `configure()`: Validates and saves full config
- `execute()`: Executes arbitrary commands
- `getVersion()`: Gets tool version
- `reset()`: Resets to default config

### 4. Tool Registry

Manages tool registration and instantiation:

**Pattern**: Singleton
**Responsibilities:**
- Register tool classes
- Create tool instances (lazy)
- Cache instances
- Provide tool discovery

**Key Methods:**
```typescript
class ToolRegistry {
  static getInstance(): ToolRegistry;
  registerToolClass(name: string, toolClass: new () => ICodeTool): void;
  registerTool(tool: ICodeTool): void;
  getTool(name: string): ICodeTool | undefined;
  getToolNames(): string[];
  getAllTools(): ICodeTool[];
  hasTool(name: string): boolean;
  unregisterTool(name: string): void;
  clear(): void;
}
```

**Instance Caching:**
- First call to `getTool()` creates instance
- Subsequent calls return cached instance
- Ensures single instance per tool

### 5. Tool Factory

Creates tool instances using the registry:

**Pattern**: Factory
**Responsibilities:**
- Create tool instances
- Apply initial configuration
- Provide convenience methods

**Key Methods:**
```typescript
class ToolFactory {
  createTool(name: string, config?: Partial<ToolConfig>): ICodeTool;
  createTools(names: string[]): ICodeTool[];
  createAllTools(): ICodeTool[];
  canCreateTool(name: string): boolean;
  getAvailableTools(): string[];
}
```

### 6. Adapter Layer

Each tool has an adapter that extends BaseCodeTool:

**Structure:**
```typescript
export class ClaudeCodeTool extends BaseCodeTool
  implements IChatTool, IFileEditTool, ICodeGenTool {

  // Required: Tool metadata
  getMetadata(): ToolMetadata { ... }

  // Required: Installation commands
  protected getInstallCheckCommand(): string { ... }
  protected getInstallCommand(): string { ... }
  protected getUninstallCommand(): string { ... }

  // Optional: Interface implementations
  async chat(prompt: string): Promise<ExecutionResult> { ... }
  async editFile(path: string, instructions: string): Promise<ExecutionResult> { ... }
  async generateCode(prompt: string, output?: string): Promise<ExecutionResult> { ... }
}
```

## Design Patterns

### 1. Abstract Factory Pattern

**Purpose**: Create tool instances without specifying exact classes

**Implementation:**
```typescript
// Factory
const tool = createTool('claude-code');

// Instead of
const tool = new ClaudeCodeTool();
```

**Benefits:**
- Decouples client code from concrete classes
- Easy to add new tools
- Centralized tool creation

### 2. Singleton Pattern

**Purpose**: Ensure single registry instance

**Implementation:**
```typescript
class ToolRegistry {
  private static instance: ToolRegistry;

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }
}
```

**Benefits:**
- Single source of truth for registered tools
- Shared state across application
- Lazy initialization

### 3. Template Method Pattern

**Purpose**: Define algorithm skeleton in base class

**Implementation:**
```typescript
abstract class BaseCodeTool {
  // Template method
  async isInstalled(): Promise<InstallStatus> {
    const command = this.getInstallCheckCommand(); // Hook
    const { stdout } = await execAsync(command);
    const version = this.parseVersion(stdout); // Hook
    return { installed: true, version };
  }

  // Hooks to be implemented by subclasses
  protected abstract getInstallCheckCommand(): string;
  protected parseVersion(output: string): string | undefined { ... }
}
```

**Benefits:**
- Reuse common logic
- Customize specific steps
- Enforce consistent behavior

### 4. Adapter Pattern

**Purpose**: Adapt external tools to common interface

**Implementation:**
```typescript
// External tool has different interface
// Adapter makes it compatible
class ClaudeCodeTool extends BaseCodeTool {
  async chat(prompt: string): Promise<ExecutionResult> {
    // Adapt to claude CLI
    return this.execute('claude', ['chat', prompt]);
  }
}
```

**Benefits:**
- Uniform interface for different tools
- Isolate tool-specific code
- Easy to swap implementations

### 5. Strategy Pattern

**Purpose**: Select tool based on capabilities

**Implementation:**
```typescript
async function selectTool(requiredCapability: keyof ToolCapabilities) {
  const registry = getRegistry();
  const metadata = await registry.getAllMetadata();

  const suitable = metadata.filter(m =>
    m.capabilities[requiredCapability]
  );

  return createTool(suitable[0].name);
}
```

**Benefits:**
- Runtime tool selection
- Capability-based decisions
- Flexible tool usage

## Data Flow

### Tool Creation Flow

```
User Code
    │
    ├─> createTool('claude-code')
    │
    └─> ToolFactory
            │
            ├─> getRegistry()
            │
            └─> ToolRegistry
                    │
                    ├─> getTool('claude-code')
                    │
                    ├─> Check cache
                    │   ├─> Found: return cached
                    │   └─> Not found: create new
                    │
                    └─> new ClaudeCodeTool()
                            │
                            └─> extends BaseCodeTool
                                    │
                                    └─> implements ICodeTool
```

### Configuration Flow

```
User Code
    │
    ├─> tool.configure(config)
    │
    └─> BaseCodeTool
            │
            ├─> validateConfig(config)
            │   └─> Check required fields
            │
            ├─> this.config = config
            │
            └─> saveConfig()
                    │
                    ├─> Create config directory
                    │   (~/.ccjk/tools/)
                    │
                    └─> Write JSON file
                        (~/.ccjk/tools/claude-code.json)
```

### Execution Flow

```
User Code
    │
    ├─> tool.execute('chat', ['prompt'])
    │
    └─> BaseCodeTool
            │
            ├─> buildCommand('chat', ['prompt'])
            │   └─> 'chat prompt'
            │
            ├─> execAsync(command, { env })
            │   └─> Execute in shell
            │
            └─> Return ExecutionResult
                    │
                    ├─> success: true/false
                    ├─> output: string
                    ├─> error: string
                    └─> exitCode: number
```

## File Structure

```
src/
├── code-tools/
│   ├── core/
│   │   ├── types.ts              # Type definitions
│   │   ├── interfaces.ts         # Core interfaces
│   │   ├── base-tool.ts          # Abstract base class
│   │   ├── tool-registry.ts      # Registry implementation
│   │   ├── tool-factory.ts       # Factory implementation
│   │   ├── index.ts              # Core exports
│   │   └── __tests__/
│   │       ├── base-tool.test.ts
│   │       ├── tool-registry.test.ts
│   │       └── tool-factory.test.ts
│   │
│   ├── adapters/
│   │   ├── claude-code.ts        # Claude Code adapter
│   │   ├── codex.ts              # Codex adapter
│   │   ├── aider.ts              # Aider adapter
│   │   ├── continue.ts           # Continue adapter
│   │   ├── cline.ts              # Cline adapter
│   │   ├── cursor.ts             # Cursor adapter
│   │   ├── index.ts              # Adapter exports
│   │   └── __tests__/
│   │       └── integration.test.ts
│   │
│   └── index.ts                  # Main entry point
│
├── index.ts                      # Package entry point
│
examples/
└── usage.ts                      # Usage examples

docs/
├── README.md                     # User documentation
├── MIGRATION.md                  # Migration guide
└── ARCHITECTURE.md               # This file
```

## Configuration Storage

### Location
```
~/.ccjk/
└── tools/
    ├── claude-code.json
    ├── aider.json
    ├── cursor.json
    └── ...
```

### Format
```json
{
  "name": "claude-code",
  "version": "1.0.0",
  "apiKey": "sk-ant-...",
  "model": "claude-opus-4",
  "settings": {
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "env": {
    "CLAUDE_API_KEY": "sk-ant-..."
  }
}
```

## Extension Points

### Adding a New Tool

1. **Create Adapter Class**
```typescript
export class MyTool extends BaseCodeTool {
  getMetadata(): ToolMetadata { ... }
  protected getInstallCheckCommand(): string { ... }
  protected getInstallCommand(): string { ... }
  protected getUninstallCommand(): string { ... }
}
```

2. **Register Tool**
```typescript
// In src/code-tools/index.ts
import { MyTool } from './adapters/my-tool';
registry.registerToolClass('my-tool', MyTool);
```

3. **Export Adapter**
```typescript
// In src/code-tools/adapters/index.ts
export * from './my-tool';
```

### Adding a New Interface

1. **Define Interface**
```typescript
export interface IMyCapability extends ICodeTool {
  myMethod(param: string): Promise<ExecutionResult>;
}
```

2. **Implement in Adapters**
```typescript
export class MyTool extends BaseCodeTool implements IMyCapability {
  async myMethod(param: string): Promise<ExecutionResult> {
    return this.execute('my-command', [param]);
  }
}
```

### Customizing Base Behavior

Override methods in adapter:
```typescript
export class MyTool extends BaseCodeTool {
  // Override version parsing
  protected parseVersion(output: string): string | undefined {
    const match = output.match(/custom-pattern (\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  // Override config validation
  async validateConfig(config: Partial<ToolConfig>): Promise<boolean> {
    if (!config.apiKey || config.apiKey.length < 10) {
      return false;
    }
    return super.validateConfig(config);
  }
}
```

## Performance Considerations

### Instance Caching
- Registry caches tool instances
- Avoids repeated instantiation
- Reduces memory usage

### Lazy Loading
- Tools created on first access
- Not all tools loaded at startup
- Faster initialization

### Configuration Caching
- Config loaded once per instance
- Cached in memory
- Only written on updates

## Security Considerations

### API Key Storage
- Stored in user's home directory
- File permissions: 0600 (user read/write only)
- Not committed to version control

### Command Execution
- Uses Node.js `child_process.exec`
- Environment variables isolated
- No shell injection (args escaped)

### Configuration Validation
- Required fields checked
- Type validation
- Custom validation per tool

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock external dependencies
- Test edge cases and errors

### Integration Tests
- Test tool adapters together
- Test registry and factory
- Test configuration persistence

### Test Coverage
- Target: 80% coverage
- Core components: 90%+
- Adapters: 70%+

## Future Enhancements

### Planned Features
1. **Plugin System**: Load tools dynamically
2. **Tool Versioning**: Support multiple versions
3. **Async Events**: Tool lifecycle events
4. **Tool Chaining**: Pipe output between tools
5. **Remote Tools**: Support remote/cloud tools
6. **Tool Metrics**: Track usage and performance

### Extensibility
- Interface-based design allows new capabilities
- Registry pattern supports dynamic registration
- Factory pattern enables custom creation logic

## Conclusion

This architecture provides:
- **Unified Interface**: Consistent API across tools
- **Extensibility**: Easy to add new tools
- **Maintainability**: Reduced duplication
- **Flexibility**: Support different capabilities
- **Type Safety**: Full TypeScript support

The design patterns and abstractions make it easy to work with multiple AI code tools while maintaining clean, testable code.

# Code Tools Abstraction - Visual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Application                         │
│                    (Your code using CCJK)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ import { createTool }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Public API Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  createTool()    │  │  getRegistry()   │  │  Interfaces   │ │
│  │  Factory Helper  │  │  Registry Access │  │  ICodeTool    │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Tool Factory Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ToolFactory.createTool()                     │  │
│  │  • Validates tool name                                    │  │
│  │  • Applies initial configuration                          │  │
│  │  • Returns tool instance                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Tool Registry Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ToolRegistry (Singleton)                     │  │
│  │  • Stores tool class constructors                         │  │
│  │  • Caches tool instances (lazy creation)                  │  │
│  │  • Provides tool discovery                                │  │
│  │                                                            │  │
│  │  Registered Tools:                                         │  │
│  │  ├─ claude-code → ClaudeCodeTool                          │  │
│  │  ├─ codex       → CodexTool                               │  │
│  │  ├─ aider       → AiderTool                               │  │
│  │  ├─ continue    → ContinueTool                            │  │
│  │  ├─ cline       → ClineTool                               │  │
│  │  └─ cursor      → CursorTool                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Interface Layer (Contracts)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  ICodeTool   │  │  IChatTool   │  │ IFileEditTool│          │
│  │  (Base)      │  │  (extends)   │  │  (extends)   │          │
│  │              │  │              │  │              │          │
│  │ • metadata   │  │ • chat()     │  │ • editFile() │          │
│  │ • install()  │  │ • continue() │  │ • editFiles()│          │
│  │ • config()   │  │ • endChat()  │  │              │          │
│  │ • execute()  │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ICodeGenTool  │                                               │
│  │  (extends)   │                                               │
│  │              │                                               │
│  │• generateCode│                                               │
│  └──────────────┘                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Base Implementation Layer                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              BaseCodeTool (Abstract Class)                │  │
│  │                                                            │  │
│  │  Common Functionality (~280 lines):                       │  │
│  │  ├─ Configuration Management                              │  │
│  │  │  ├─ loadConfig()                                       │  │
│  │  │  ├─ saveConfig()                                       │  │
│  │  │  └─ updateConfig()                                     │  │
│  │  ├─ Installation Management                               │  │
│  │  │  ├─ isInstalled()                                      │  │
│  │  │  ├─ install()                                          │  │
│  │  │  └─ uninstall()                                        │  │
│  │  ├─ Command Execution                                     │  │
│  │  │  ├─ execute()                                          │  │
│  │  │  └─ buildCommand()                                     │  │
│  │  └─ Utilities                                             │  │
│  │     ├─ parseVersion()                                     │  │
│  │     └─ findToolPath()                                     │  │
│  │                                                            │  │
│  │  Extension Points (must implement):                       │  │
│  │  ├─ getMetadata()                                         │  │
│  │  ├─ getInstallCheckCommand()                              │  │
│  │  ├─ getInstallCommand()                                   │  │
│  │  └─ getUninstallCommand()                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Adapter Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ClaudeCodeTool│  │  CodexTool   │  │  AiderTool   │          │
│  │  (~70 lines) │  │  (~50 lines) │  │  (~70 lines) │          │
│  │              │  │              │  │              │          │
│  │ extends      │  │ extends      │  │ extends      │          │
│  │ BaseCodeTool │  │ BaseCodeTool │  │ BaseCodeTool │          │
│  │              │  │              │  │              │          │
│  │ implements   │  │ implements   │  │ implements   │          │
│  │ IChatTool    │  │ ICodeGenTool │  │ IChatTool    │          │
│  │ IFileEditTool│  │              │  │ IFileEditTool│          │
│  │ ICodeGenTool │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ContinueTool │  │  ClineTool   │  │  CursorTool  │          │
│  │  (~70 lines) │  │  (~80 lines) │  │  (~75 lines) │          │
│  │              │  │              │  │              │          │
│  │ extends      │  │ extends      │  │ extends      │          │
│  │ BaseCodeTool │  │ BaseCodeTool │  │ BaseCodeTool │          │
│  │              │  │              │  │              │          │
│  │ implements   │  │ implements   │  │ implements   │          │
│  │ IChatTool    │  │ IChatTool    │  │ IChatTool    │          │
│  │ ICodeGenTool │  │ IFileEditTool│  │ IFileEditTool│          │
│  │              │  │ ICodeGenTool │  │ ICodeGenTool │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Tools Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    claude    │  │    codex     │  │    aider     │          │
│  │  CLI binary  │  │  CLI binary  │  │  CLI binary  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   continue   │  │    cline     │  │    cursor    │          │
│  │  CLI binary  │  │  CLI binary  │  │  CLI binary  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Tool Creation Flow

```
User Code
    │
    │ createTool('claude-code')
    ▼
ToolFactory
    │
    │ getTool('claude-code')
    ▼
ToolRegistry
    │
    ├─ Check cache
    │  ├─ Found? → Return cached instance
    │  └─ Not found? → Continue
    │
    ├─ Get tool class (ClaudeCodeTool)
    │
    ├─ new ClaudeCodeTool()
    │  │
    │  └─ extends BaseCodeTool
    │     │
    │     └─ implements ICodeTool, IChatTool, etc.
    │
    ├─ Cache instance
    │
    └─ Return tool instance
```

### Configuration Flow

```
User Code
    │
    │ tool.configure(config)
    ▼
BaseCodeTool
    │
    ├─ validateConfig(config)
    │  └─ Check required fields
    │
    ├─ this.config = config
    │
    └─ saveConfig()
       │
       ├─ Create directory: ~/.ccjk/tools/
       │
       └─ Write file: ~/.ccjk/tools/claude-code.json
          {
            "name": "claude-code",
            "apiKey": "***",
            "model": "claude-opus-4",
            "settings": { ... }
          }
```

### Command Execution Flow

```
User Code
    │
    │ tool.execute('chat', ['Hello'])
    ▼
BaseCodeTool.execute()
    │
    ├─ buildCommand('chat', ['Hello'])
    │  └─ Returns: 'chat Hello'
    │
    ├─ execAsync(command, { env })
    │  │
    │  └─ Shell execution
    │     │
    │     └─ claude chat Hello
    │
    └─ Return ExecutionResult
       {
         success: true,
         output: "...",
         exitCode: 0
       }
```

### Tool Installation Check Flow

```
User Code
    │
    │ tool.isInstalled()
    ▼
BaseCodeTool.isInstalled()
    │
    ├─ getInstallCheckCommand()
    │  │ (implemented by adapter)
    │  └─ Returns: 'claude --version'
    │
    ├─ execAsync('claude --version')
    │  │
    │  └─ Shell execution
    │     └─ Output: 'claude version 1.0.0'
    │
    ├─ parseVersion(output)
    │  └─ Returns: '1.0.0'
    │
    ├─ findToolPath()
    │  └─ Returns: '/usr/local/bin/claude'
    │
    └─ Return InstallStatus
       {
         installed: true,
         version: '1.0.0',
         path: '/usr/local/bin/claude'
       }
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Component Graph                          │
│                                                              │
│  ToolFactory ──uses──> ToolRegistry                         │
│       │                     │                                │
│       │                     │                                │
│       │                     │ manages                        │
│       │                     ▼                                │
│       │              Tool Instances                          │
│       │                     │                                │
│       │                     │                                │
│       └──creates──> ClaudeCodeTool ──extends──> BaseCodeTool│
│                           │                          │       │
│                           │                          │       │
│                           │                          │       │
│                     implements                  implements   │
│                           │                          │       │
│                           ▼                          ▼       │
│                      IChatTool                  ICodeTool    │
│                      IFileEditTool                           │
│                      ICodeGenTool                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Design Pattern Visualization

### 1. Singleton Pattern (Registry)

```
┌─────────────────────────────────────┐
│        ToolRegistry                 │
│  ┌───────────────────────────────┐  │
│  │  private static instance      │  │
│  └───────────────────────────────┘  │
│                                     │
│  getInstance() {                    │
│    if (!instance) {                 │
│      instance = new ToolRegistry() │
│    }                                │
│    return instance                  │
│  }                                  │
└─────────────────────────────────────┘
         │              │
         │              │
    Call 1          Call 2
         │              │
         └──────┬───────┘
                │
         Same Instance
```

### 2. Factory Pattern

```
┌─────────────────────────────────────┐
│         ToolFactory                 │
│                                     │
│  createTool(name) {                 │
│    switch(name) {                   │
│      case 'claude-code':            │
│        return new ClaudeCodeTool()  │
│      case 'aider':                  │
│        return new AiderTool()       │
│      ...                            │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
         │
         │ creates
         ▼
┌─────────────────────────────────────┐
│      Concrete Tool Instance         │
└─────────────────────────────────────┘
```

### 3. Template Method Pattern

```
┌─────────────────────────────────────┐
│        BaseCodeTool                 │
│                                     │
│  isInstalled() {                    │
│    cmd = getInstallCheckCommand()  │◄─── Hook (abstract)
│    output = exec(cmd)               │
│    version = parseVersion(output)  │◄─── Hook (can override)
│    return { installed, version }    │
│  }                                  │
└─────────────────────────────────────┘
         ▲
         │ extends
         │
┌─────────────────────────────────────┐
│      ClaudeCodeTool                 │
│                                     │
│  getInstallCheckCommand() {         │
│    return 'claude --version'        │
│  }                                  │
└─────────────────────────────────────┘
```

### 4. Adapter Pattern

```
External Tool          Adapter              Common Interface
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  claude  │      │ClaudeCodeTool│      │  ICodeTool   │
│   CLI    │◄─────│              │─────►│              │
│          │      │ adapts to    │      │ • install()  │
│ Different│      │ common API   │      │ • config()   │
│   API    │      │              │      │ • execute()  │
└──────────┘      └──────────────┘      └──────────────┘
```

## File Organization

```
src/code-tools/
│
├── core/                          # Core abstractions
│   ├── types.ts                   # Type definitions
│   ├── interfaces.ts              # Interface contracts
│   ├── base-tool.ts              # Common implementation
│   ├── tool-registry.ts          # Singleton registry
│   ├── tool-factory.ts           # Factory pattern
│   └── __tests__/                # Core tests
│
├── adapters/                      # Tool adapters
│   ├── claude-code.ts            # Claude adapter
│   ├── codex.ts                  # Codex adapter
│   ├── aider.ts                  # Aider adapter
│   ├── continue.ts               # Continue adapter
│   ├── cline.ts                  # Cline adapter
│   ├── cursor.ts                 # Cursor adapter
│   └── __tests__/                # Adapter tests
│
└── index.ts                       # Main entry point
```

## Configuration Storage

```
~/.ccjk/
└── tools/
    ├── claude-code.json
    │   {
    │     "name": "claude-code",
    │     "apiKey": "sk-ant-...",
    │     "model": "claude-opus-4",
    │     "settings": { ... }
    │   }
    │
    ├── aider.json
    ├── cursor.json
    └── ...
```

## Extension Point

### Adding a New Tool (< 5 minutes)

```
Step 1: Create Adapter
┌─────────────────────────────────────┐
│  src/code-tools/adapters/my-tool.ts│
│                                     │
│  export class MyTool extends        │
│    BaseCodeTool {                   │
│    getMetadata() { ... }            │
│    getInstallCheckCommand() { ... } │
│    getInstallCommand() { ... }      │
│    getUninstallCommand() { ... }    │
│  }                                  │
└─────────────────────────────────────┘

Step 2: Register Tool
┌─────────────────────────────────────┐
│  src/code-tools/index.ts            │
│                                     │
│  import { MyTool } from './adapters'│
│  registry.registerToolClass(        │
│    'my-tool', MyTool                │
│  )                                  │
└─────────────────────────────────────┘

Step 3: Use Tool
┌─────────────────────────────────────┐
│  User Code                          │
│                                     │
│  const tool = createTool('my-tool') │
│  await tool.isInstalled()           │
└─────────────────────────────────────┘
```

## Summary

This architecture provides:
- **Separation of Concerns**: Each layer has a specific responsibility
- **Extensibility**: Easy to add new tools and capabilities
- **Maintainability**: Common code in one place
- **Type Safety**: Full TypeScript support
- **Testability**: Mockable interfaces and dependency injection
- **Flexibility**: Support for different tool capabilities
